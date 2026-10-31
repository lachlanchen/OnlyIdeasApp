import {readPreferences,savePreferences} from './reading-preferences.mjs';
import {localPreferenceCommand,dynamicPreferenceCommand,preferenceIntent,validatedPreferencePatch,preferenceSummary} from './preference-commands.mjs';
import {createPreferenceGate} from './research-preference-gate.mjs';
import {resolveChatReferences} from './chat-references.mjs';
import {createResearchPreferences} from './research-preferences.mjs';
import {sharingConsent} from './sharing-consent.mjs';
import {compactChatHistory} from './chat-context.mjs';
import {libraryCards} from './library-search.mjs';
import {unlimitedAllowance} from './allowances.mjs';
import { paperMetadata } from './paper-metadata.mjs';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { requestSharing } from './sharing.mjs';
import { attachment } from './attachments.mjs';
import { requireValue, hash, languages } from './domain.mjs';
import { activePlan } from './billing-ledger.mjs';
import { canReusePaper } from './import-reuse.mjs';

export function createChats(store, config, agentActions,preferences=createPreferenceGate(store)) {
  const db = store.db;
  const interests=createResearchPreferences(store);
  db.exec(`CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY, chat TEXT NOT NULL, role TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_tasks(id TEXT PRIMARY KEY, chat TEXT NOT NULL, owner TEXT NOT NULL, state TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS chat_owner ON chats(owner);
    CREATE INDEX IF NOT EXISTS chat_message_order ON chat_messages(chat,created);`);
  let lastSeen = 0;
  const owned = (id, user) => { const c = db.prepare('SELECT * FROM chats WHERE id=? AND owner=?').get(id, user.id); requireValue(c, 'Conversation not found.', 404); return c; };
  const messages = id => {const owner=db.prepare('SELECT owner FROM chats WHERE id=?').get(id)?.owner;return db.prepare('SELECT * FROM chat_messages WHERE chat=? ORDER BY created,rowid').all(id).map(x => ({ id: x.id, role: x.role, created: x.created, ...JSON.parse(x.body) })).map(m=>({...m,actions:agentActions.view(m.id,owner),attachments:(m.attachmentIds||[]).map(a=>{try{return attachment(store,a,owner);}catch{return {id:a,name:'Attachment unavailable',state:'failed'};}})}));};
  const add = (chat, role, body, id = randomUUID()) => { db.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?)').run(id, chat, role, JSON.stringify(body), Date.now()); return id; };
  const queue = (chat, user, data) => {
    requireValue(!db.prepare("SELECT id FROM chat_tasks WHERE chat=? AND state IN ('queued','running')").get(chat), 'Wait for the current response before sending another message.', 409);
    const count = db.prepare('SELECT count(*) AS n FROM chat_tasks WHERE owner=? AND created>?').get(user.id, Date.now() - 86400_000).n;
    const allowance=config.billing?.enabled===true ? activePlan(store,user.id)?.agentTurns : null;
    requireValue(unlimitedAllowance(config,user.id) || count < (allowance || config.maxAgentTurnsPerDay || 30), 'Your daily agent allowance is full. Try tomorrow.', 429);
    requireValue(unlimitedAllowance(config,user.id) || db.prepare('SELECT owner FROM chat_tasks WHERE created>?').all(Date.now()-86400_000).filter(r=>!unlimitedAllowance(config,r.owner)).length < (config.maxAgentTurnsGlobalPerDay || 200), 'The shared agent allowance is full. Try tomorrow.', 429);
    const id = randomUUID(); db.prepare('INSERT INTO chat_tasks VALUES(?,?,?,?,?,?)').run(id, chat, user.id, 'queued', JSON.stringify(data), Date.now()); return id;
  };
  return {
    status: () => ({ enabled: !!config.agentWorkerToken, online: Date.now() - lastSeen < 45_000 }),
    authorized(req) { const value = String(req.headers.authorization || '').replace(/^Bearer /, ''); const expected = config.agentWorkerToken; return !!expected && timingSafeEqual(Buffer.from(hash(value)), Buffer.from(hash(expected))); },
    async client(path, method, user, body, enqueue) {
      if(path==='/api/chats/interests') {
        requireValue(user,'Sign in to keep your conversations private.',401);
        requireValue(method==='POST','Method not allowed.',405);
        if(body.skip===true)return {recommendations:interests.update(user,{skip:true})};
        requireValue(typeof body.requestId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(body.requestId),'Invalid request.');
        const prior=db.prepare('SELECT * FROM chat_messages WHERE id=?').get(body.requestId);
        if(prior) {
          const chat=owned(prior.chat,user),saved=JSON.parse(prior.body);
          requireValue(saved.kind==='preferences'&&saved.text===body.text,'This request has already been used.',409);
          return {chat,messages:messages(chat.id),recommendations:interests.status(user)};
        }
        const chat=body.chatId?owned(body.chatId,user):{id:randomUUID(),owner:user.id,title:'Reading interests',created:Date.now()};
        db.exec('BEGIN IMMEDIATE');
        try {
          const recommendations=interests.update(user,{text:body.text});
          if(!body.chatId){requireValue(db.prepare('SELECT count(*) AS n FROM chats WHERE owner=?').get(user.id).n<100,'Choose an existing conversation.');db.prepare('INSERT INTO chats VALUES(?,?,?,?)').run(chat.id,user.id,chat.title,chat.created)}
          add(chat.id,'user',{text:body.text,kind:'preferences'},body.requestId);
          add(chat.id,'assistant',{text:'Your interests are saved. Your daily papers will follow these topics. You can change them anytime.',kind:'preferences'});
          db.exec('COMMIT');return {chat,messages:messages(chat.id),recommendations};
        } catch(error){db.exec('ROLLBACK');throw error}
      }
      const m = path.match(/^\/api\/chats(?:\/([a-f0-9-]{36})(?:\/(messages|import))?)?$/); if (!m) return null;
      requireValue(user, 'Sign in to keep your conversations private.', 401);
      const [, id, action] = m;
      if (!id && method === 'GET') return { chats: db.prepare('SELECT id,title,created FROM chats WHERE owner=? ORDER BY created DESC LIMIT 100').all(user.id), agent: this.status(), recommendations:interests.status(user) };
      if (!id && method === 'POST') {
        requireValue(db.prepare('SELECT count(*) AS n FROM chats WHERE owner=?').get(user.id).n < 100, 'Delete an old conversation before starting another.');
        const id = randomUUID(), title = 'New conversation'; db.prepare('INSERT INTO chats VALUES(?,?,?,?)').run(id,user.id,title,Date.now()); return { chat: {id,title}, messages: [] };
      }
      const chat = owned(id, user);
      if (!action && method === 'GET') {agentActions.tick();return { chat, messages: messages(id), preferencesRevision:readPreferences(store,user).revision, pending: db.prepare("SELECT id,state,body FROM chat_tasks WHERE chat=? AND state IN ('queued','running')").all(id).map(t=>({id:t.id,state:t.state,status:JSON.parse(t.body).status || 'Waiting for the paper agent'})), agent: this.status() };}
      if (!action && method === 'DELETE') { db.exec('BEGIN'); try { agentActions.remove(id);for (const table of ['chat_messages','chat_tasks']) db.prepare(`DELETE FROM ${table} WHERE chat=?`).run(id); db.prepare('DELETE FROM chats WHERE id=?').run(id); db.exec('COMMIT'); } catch(e) {db.exec('ROLLBACK');throw e;} return { ok:true }; }
      if (action === 'messages' && method === 'POST') {
        requireValue(typeof body.text === 'string' && body.text.length <= 4000, 'Write a message of up to 4,000 characters.');
        const ids=body.attachments||[];requireValue(Array.isArray(ids)&&ids.length<=3&&ids.every(a=>typeof a==='string'),'Attach up to three files.');
        for(const id of ids)attachment(store,id,user.id);requireValue(body.text.trim()||ids.length,'Write a message or attach a file.');
        const context=resolveChatReferences(store,user.id,id,body);
        const text=body.text.trim()||'Help me understand these files.';
        let command=!ids.length&&!context.references.length&&!context.quote?localPreferenceCommand(text,readPreferences(store,user),preferences.options(user)):null;
        if(command?.plan)command=dynamicPreferenceCommand(text,readPreferences(store,user))||command;
        if(command&&!command.plan){
          const prepared=command.show?null:await preferences.prepare(user,validatedPreferencePatch(command.patch));
          owned(id,user);
          db.exec('BEGIN IMMEDIATE');
          try {
            const prefs=command.show?readPreferences(store,user):savePreferences(store,user,prepared.patch,{resolvedJournals:prepared.resolvedJournals});
            const messageId=add(id,'user',{text,kind:'preferences'});
            add(id,'assistant',{text:preferenceSummary(prefs,command.show?'Your reading preferences':'Reading preferences updated',command.show?null:Object.keys(prepared.patch)),kind:'preferences'});
            if(chat.title==='New conversation')db.prepare('UPDATE chats SET title=? WHERE id=?').run(text.slice(0,70),id);
            db.exec('COMMIT');return {messageId,queued:false,preferencesRevision:prefs.revision};
          }catch(error){db.exec('ROLLBACK');throw error}
        }
        requireValue(config.agentWorkerToken, 'The paper agent is not connected yet.', 503);
        const taskId = queue(id,user,{ kind:'chat', text, ...(command?{preferenceRequest:true,preferenceRevision:readPreferences(store,user).revision}:{}), paperIds:context.references.map(p=>p.id),quoteId:context.quote?.id,attachments:ids, language:Object.hasOwn(languages,body.language)?body.language:'en',agentActions:body.agentActions===true,sharing:body.sharing==='private'?'private':'shared' }); const messageId=add(id,'user',{text,attachmentIds:ids,references:context.references.map(({id,title})=>({id,title})),...(context.quote?{quote:context.quote}:{})});
        if (chat.title === 'New conversation') db.prepare('UPDATE chats SET title=? WHERE id=?').run(text.slice(0,70),id);
        return { taskId, messageId, queued:true };
      }
      if (action === 'import' && method === 'POST') {
        const card = messages(id).flatMap(m=>m.papers || []).find(p=>p.id === body.paperId);
        requireValue(card, 'Choose a paper from this conversation.');
        if(card.paperId){const paper=store.paper(card.paperId);requireValue(canReusePaper(store,paper,user.id),'Paper not found.',404);const dedupe=`reuse:import:${paper.id}:${paper.revision}`;const job=store.existing(user.id,dedupe)||store.saveJob({id:randomUUID(),owner:user.id,kind:'import',dedupe,created:Date.now(),finishedAt:Date.now(),state:'completed',message:'Ready · existing paper reused',paperId:paper.id,reused:true});return {job,paperId:paper.id,reused:true};}
        const sourceURL=card.pdfUrl||card.source;requireValue(sourceURL,'Open the source or upload your copy.');
        // Existing queue enforces deduplication, account quotas and Mathpix page caps.
        const sharing=body.sharing==='private'?'private':'shared';
        const job = enqueue(user,{ kind:'import', sharing, sharingConsent:sharingConsent(body.sharingConsent,sharing), creditLimit:body.creditLimit, url:sourceURL, sourcePage:card.source,downloadSources:card.downloadSources||[],discoveryId:card.id,metadata:{...paperMetadata(card),title:card.title,authors:card.authors,language:'en',license:'private',category:'Research'}, dedupe:`import:${hash(sourceURL)}` });
        if (job.paperId && sharing === 'shared') { const p=store.paper(job.paperId); if(p?.owner===user.id)requestSharing(store,p,'shared'); }
        add(id,'assistant',{text:job.reused ? 'This paper is already available. Open the existing paper; its text, figures and available translations are reused. Your chat and notes stay private.' : sharing === 'private' ? 'The paper is saved to your private library after conversion.' : 'The paper will be added to the shared reading room after source and community review. Your chat and notes stay private.',jobId:job.id});
        return { job };
      }
      requireValue(false,'Method not allowed.',405);
    },
    claim() {
      lastSeen=Date.now();
      db.exec('BEGIN IMMEDIATE');
      try {
      // A lease permits recovery after worker shutdown without concurrent delivery.
      const rows=db.prepare("SELECT * FROM chat_tasks WHERE (state='queued' OR (state='running' AND json_extract(body,'$.leaseUntil')<?)) AND owner NOT IN (SELECT id FROM suspensions) AND owner NOT IN (SELECT id FROM deleted_accounts) ORDER BY created LIMIT 100").all(Date.now());
      for(const row of rows) {
        const data=JSON.parse(row.body), files=(data.attachments||[]).map(id=>attachment(store,id,row.owner));
        let context;try{context=resolveChatReferences(store,row.owner,row.chat,data)}catch{add(row.chat,'assistant',{text:'A selected paper or quoted message is no longer available. Remove it and send again.'},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);continue;}
        if(files.some(a=>a.state==='failed')) {add(row.chat,'assistant',{text:'An attachment could not be prepared. Open Your requests to retry, then send your message again.'},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);continue;}
        if(files.some(a=>a.state!=='ready')) {data.status='Preparing your attachments';db.prepare('UPDATE chat_tasks SET body=? WHERE id=?').run(JSON.stringify(data),row.id);continue;}
        const body={...data,lease:randomUUID(),leaseUntil:Date.now()+180_000,status:files.length?'Reading your attachments':'Looking for papers'};
        db.prepare("UPDATE chat_tasks SET state='running',body=? WHERE id=?").run(JSON.stringify(body),row.id);
        const history=messages(row.chat).filter(m=>m.kind!=='preferences').slice(-16), ids=[...new Set(history.flatMap(m=>(m.attachments||[]).filter(a=>a.state==='ready').map(a=>a.id)))].slice(-6);
        let budget=60_000;
        const documents=ids.map(id=>{const a=attachment(store,id,row.owner),p=store.paper(a.paperId);if(!canReusePaper(store,p,row.owner))return null;const text=p.mmd.slice(0,Math.min(20_000,budget));budget-=text.length;return {name:a.name,text,truncated:text.length<p.mmd.length};}).filter(Boolean);
        db.exec('COMMIT');return {task:{id:row.id,lease:body.lease,text:body.text,...context,...(body.preferenceRequest?{preferenceRequest:true,preferences:readPreferences(store,{id:row.owner}),preferenceOptions:preferences.options({id:row.owner})}:{}),language:body.language,sharing:body.sharing,agentActions:body.agentActions===true,hasNewAttachments:files.length>0,documents,library:libraryCards(store,{id:row.owner}),messages:compactChatHistory(history)}};
      }
      db.exec('COMMIT');return {task:null};
      } catch(e){db.exec('ROLLBACK');throw e;}
    },
    readPaper(body){const row=db.prepare("SELECT * FROM chat_tasks WHERE id=? AND state='running'").get(body.id);requireValue(row&&JSON.parse(row.body).lease===body.lease,'This request is no longer active.',409);store.requireActive(row.owner);const p=store.paper(body.paperId);requireValue(canReusePaper(store,p,row.owner),'Paper not found.',404);return {paper:{id:p.id,title:p.title,source:p.source,text:p.mmd.slice(0,26000),truncated:p.mmd.length>26000}};},
    async finish(body) {
      lastSeen=Date.now(); const row=db.prepare("SELECT * FROM chat_tasks WHERE id=? AND state='running'").get(body.id);
      requireValue(row && JSON.parse(row.body).lease===body.lease,'This request is no longer active.',409);
      const data=JSON.parse(row.body);
      if(body.status && !body.result) { data.status=String(body.status).slice(0,160);data.leaseUntil=Date.now()+180_000;db.prepare('UPDATE chat_tasks SET body=? WHERE id=?').run(JSON.stringify(data),row.id);return {ok:true}; }
      const result=body.result;requireValue(result && typeof result.text==='string' && result.text.length<=16000,'Invalid response.');
      store.requireActive(row.owner);
      if(data.preferenceRequest){
        let text='No preferences were changed. Open Reading interests to edit your choices.';
        let transaction=false;
        try {
          if(result.preferencePatch){
            requireValue(preferenceIntent(data.text)==='edit','No preferences were changed.');
            const prepared=await preferences.prepare({id:row.owner},{...validatedPreferencePatch(result.preferencePatch),revision:data.preferenceRevision});
            const active=db.prepare("SELECT body FROM chat_tasks WHERE id=? AND state='running'").get(row.id);
            requireValue(active&&JSON.parse(active.body).lease===body.lease,'This request is no longer active.',409);
            db.exec('BEGIN IMMEDIATE');
            transaction=true;
            const prefs=savePreferences(store,{id:row.owner},prepared.patch,{resolvedJournals:prepared.resolvedJournals});
            text=preferenceSummary(prefs,'Reading preferences updated',Object.keys(result.preferencePatch));
          }else {if(result.preferenceQuestion)text=String(result.preferenceQuestion).slice(0,600);db.exec('BEGIN IMMEDIATE');transaction=true}
          add(row.chat,'assistant',{text,kind:'preferences'},row.id);
          db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);db.exec('COMMIT');
        }catch(error){if(transaction)db.exec('ROLLBACK');store.requireActive(row.owner);const active=db.prepare("SELECT body FROM chat_tasks WHERE id=? AND state='running'").get(row.id);if(active&&JSON.parse(active.body).lease===body.lease){add(row.chat,'assistant',{text:error.message,kind:'preferences'},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id)}}
        return {ok:true};
      }
      const papers=(result.papers || []).slice(0,8).map(p=>{
        if(p.paperId){const paper=store.paper(p.paperId);requireValue(canReusePaper(store,paper,row.owner),'Paper not found.',404);return {...paperMetadata(paper),id:hash('paper:'+paper.id).slice(0,24),paperId:paper.id,title:paper.title,authors:paper.authors||'',summary:'',source:paper.source||'',pdfUrl:''};}
        const source=new URL(p.source||p.pdfUrl),pdf=p.pdfUrl?new URL(p.pdfUrl):null;
        for(const u of [source,pdf].filter(Boolean))requireValue(u.protocol==='https:'&&!u.username&&!u.password&&!u.port,'Invalid paper URL.');
        const id=hash((pdf||source).href).slice(0,24),card={...paperMetadata(p),id,title:String(p.title).slice(0,400),authors:String(p.authors||'').slice(0,600),summary:String(p.summary||'').slice(0,1800),pdfUrl:pdf?.href||'',source:source.href,year:String(p.year||'').slice(0,4),downloadSources:(p.downloadSources||[]).slice(0,4).filter(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port}catch{return false}})};
        // Server-stored agent cards can use the same contextual upload as search.
        db.prepare('INSERT OR REPLACE INTO discovery_items VALUES(?,?,?)').run(id,JSON.stringify(card),Date.now());return card;
      });
      let text=result.text;
      if(result.actions?.length){try{agentActions.start(row,data,result.actions,[...papers.map((p,i)=>({...p,workerRef:result.papers[i]?.id})),...messages(row.chat).flatMap(m=>m.papers||[]),...libraryCards(store,{id:row.owner})]);text='I’m working on your reading request. Progress and saved results appear below.';}catch(error){text=error.message;}}
      db.exec('BEGIN');try { add(row.chat,'assistant',{text,papers},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);db.exec('COMMIT'); }catch(e){db.exec('ROLLBACK');throw e;}
      agentActions.tick();
      return {ok:true};
    }
  };
}

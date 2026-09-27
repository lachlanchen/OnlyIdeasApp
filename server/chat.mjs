import { paperMetadata } from './paper-metadata.mjs';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { requestSharing } from './sharing.mjs';
import { attachment } from './attachments.mjs';
import { requireValue, hash, languages } from './domain.mjs';
import { activePlan } from './billing-ledger.mjs';
import { canReusePaper } from './import-reuse.mjs';

export function createChats(store, config) {
  const db = store.db;
  db.exec(`CREATE TABLE IF NOT EXISTS chats(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY, chat TEXT NOT NULL, role TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_tasks(id TEXT PRIMARY KEY, chat TEXT NOT NULL, owner TEXT NOT NULL, state TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS chat_owner ON chats(owner);
    CREATE INDEX IF NOT EXISTS chat_message_order ON chat_messages(chat,created);`);
  let lastSeen = 0;
  const owned = (id, user) => { const c = db.prepare('SELECT * FROM chats WHERE id=? AND owner=?').get(id, user.id); requireValue(c, 'Conversation not found.', 404); return c; };
  const messages = id => db.prepare('SELECT * FROM chat_messages WHERE chat=? ORDER BY created,rowid').all(id).map(x => ({ id: x.id, role: x.role, created: x.created, ...JSON.parse(x.body) })).map(m=>({...m,attachments:(m.attachmentIds||[]).map(a=>{try{return attachment(store,a,db.prepare('SELECT owner FROM chats WHERE id=?').get(id).owner);}catch{return {id:a,name:'Attachment unavailable',state:'failed'};}})}));
  const add = (chat, role, body, id = randomUUID()) => { db.prepare('INSERT INTO chat_messages VALUES(?,?,?,?,?)').run(id, chat, role, JSON.stringify(body), Date.now()); return id; };
  const queue = (chat, user, data) => {
    requireValue(!db.prepare("SELECT id FROM chat_tasks WHERE chat=? AND state IN ('queued','running')").get(chat), 'Wait for the current response before sending another message.', 409);
    const count = db.prepare('SELECT count(*) AS n FROM chat_tasks WHERE owner=? AND created>?').get(user.id, Date.now() - 86400_000).n;
    const allowance=config.billing?.enabled===true ? activePlan(store,user.id)?.agentTurns : null;
    requireValue(count < (allowance || config.maxAgentTurnsPerDay || 30), 'Your daily agent allowance is full. Try tomorrow.', 429);
    requireValue(db.prepare('SELECT count(*) AS n FROM chat_tasks WHERE created>?').get(Date.now()-86400_000).n < (config.maxAgentTurnsGlobalPerDay || 200), 'The shared agent allowance is full. Try tomorrow.', 429);
    const id = randomUUID(); db.prepare('INSERT INTO chat_tasks VALUES(?,?,?,?,?,?)').run(id, chat, user.id, 'queued', JSON.stringify(data), Date.now()); return id;
  };
  return {
    status: () => ({ enabled: !!config.agentWorkerToken, online: Date.now() - lastSeen < 45_000 }),
    authorized(req) { const value = String(req.headers.authorization || '').replace(/^Bearer /, ''); const expected = config.agentWorkerToken; return !!expected && timingSafeEqual(Buffer.from(hash(value)), Buffer.from(hash(expected))); },
    async client(path, method, user, body, enqueue) {
      const m = path.match(/^\/api\/chats(?:\/([a-f0-9-]{36})(?:\/(messages|import))?)?$/); if (!m) return null;
      requireValue(user, 'Sign in to keep your conversations private.', 401);
      const [, id, action] = m;
      if (!id && method === 'GET') return { chats: db.prepare('SELECT id,title,created FROM chats WHERE owner=? ORDER BY created DESC LIMIT 100').all(user.id), agent: this.status() };
      if (!id && method === 'POST') {
        requireValue(db.prepare('SELECT count(*) AS n FROM chats WHERE owner=?').get(user.id).n < 100, 'Delete an old conversation before starting another.');
        const id = randomUUID(), title = 'New conversation'; db.prepare('INSERT INTO chats VALUES(?,?,?,?)').run(id,user.id,title,Date.now()); return { chat: {id,title}, messages: [] };
      }
      const chat = owned(id, user);
      if (!action && method === 'GET') return { chat, messages: messages(id), pending: db.prepare("SELECT id,state,body FROM chat_tasks WHERE chat=? AND state IN ('queued','running')").all(id).map(t=>({id:t.id,state:t.state,status:JSON.parse(t.body).status || 'Waiting for the paper agent'})), agent: this.status() };
      if (!action && method === 'DELETE') { db.exec('BEGIN'); try { for (const table of ['chat_messages','chat_tasks']) db.prepare(`DELETE FROM ${table} WHERE chat=?`).run(id); db.prepare('DELETE FROM chats WHERE id=?').run(id); db.exec('COMMIT'); } catch(e) {db.exec('ROLLBACK');throw e;} return { ok:true }; }
      if (action === 'messages' && method === 'POST') {
        requireValue(config.agentWorkerToken, 'The paper agent is not connected yet.', 503);
        requireValue(typeof body.text === 'string' && body.text.length <= 4000, 'Write a message of up to 4,000 characters.');
        const ids=body.attachments||[];requireValue(Array.isArray(ids)&&ids.length<=3&&ids.every(a=>typeof a==='string'),'Attach up to three files.');
        for(const id of ids)attachment(store,id,user.id);requireValue(body.text.trim()||ids.length,'Write a message or attach a file.');
        const text=body.text.trim()||'Help me understand these files.';
        requireValue(messages(id).length < 200, 'Start a new conversation to continue.');
        const taskId = queue(id,user,{ kind:'chat', text, attachments:ids, language:Object.hasOwn(languages,body.language)?body.language:'en' }); add(id,'user',{text,attachmentIds:ids});
        if (chat.title === 'New conversation') db.prepare('UPDATE chats SET title=? WHERE id=?').run(text.slice(0,70),id);
        return { taskId, queued:true };
      }
      if (action === 'import' && method === 'POST') {
        const card = messages(id).flatMap(m=>m.papers || []).find(p=>p.id === body.paperId);
        requireValue(card?.pdfUrl, 'Choose an available PDF from this conversation.');
        // Existing queue enforces deduplication, account quotas and Mathpix page caps.
        const job = enqueue(user,{ kind:'import', sharing:body.sharing === 'shared' ? 'shared' : 'private', creditLimit:body.creditLimit, url:card.pdfUrl, metadata:{...paperMetadata(card),title:card.title,authors:card.authors,language:'en',license:'private',category:'Research'}, dedupe:`import:${hash(card.pdfUrl)}` });
        if (job.paperId && body.sharing === 'shared') { const p=store.paper(job.paperId); if(p)requestSharing(store,p,'shared'); }
        add(id,'assistant',{text:job.reused ? 'This paper is already available. Open the existing paper; its text, figures and available translations are reused. Your chat and notes stay private.' : body.sharing !== 'shared' ? 'The paper is saved to your private library after conversion.' : 'The paper will be added to the shared reading room after source and community review. Your chat and notes stay private.',jobId:job.id});
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
        if(files.some(a=>a.state==='failed')) {add(row.chat,'assistant',{text:'An attachment could not be prepared. Open Your requests to retry, then send your message again.'},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);continue;}
        if(files.some(a=>a.state!=='ready')) {data.status='Preparing your attachments';db.prepare('UPDATE chat_tasks SET body=? WHERE id=?').run(JSON.stringify(data),row.id);continue;}
        const body={...data,lease:randomUUID(),leaseUntil:Date.now()+180_000,status:files.length?'Reading your attachments':'Looking for papers'};
        db.prepare("UPDATE chat_tasks SET state='running',body=? WHERE id=?").run(JSON.stringify(body),row.id);
        const history=messages(row.chat).slice(-16), ids=[...new Set(history.flatMap(m=>(m.attachments||[]).filter(a=>a.state==='ready').map(a=>a.id)))].slice(-6);
        let budget=60_000;
        const documents=ids.map(id=>{const a=attachment(store,id,row.owner),p=store.paper(a.paperId);if(!canReusePaper(store,p,row.owner))return null;const text=p.mmd.slice(0,Math.min(20_000,budget));budget-=text.length;return {name:a.name,text,truncated:text.length<p.mmd.length};}).filter(Boolean);
        db.exec('COMMIT');return {task:{id:row.id,lease:body.lease,text:body.text,language:body.language,documents,messages:history.map(m=>({role:m.role,text:m.text,papers:m.papers}))}};
      }
      db.exec('COMMIT');return {task:null};
      } catch(e){db.exec('ROLLBACK');throw e;}
    },
    finish(body) {
      lastSeen=Date.now(); const row=db.prepare("SELECT * FROM chat_tasks WHERE id=? AND state='running'").get(body.id);
      requireValue(row && JSON.parse(row.body).lease===body.lease,'This request is no longer active.',409);
      const data=JSON.parse(row.body);
      if(body.status && !body.result) { data.status=String(body.status).slice(0,160);data.leaseUntil=Date.now()+180_000;db.prepare('UPDATE chat_tasks SET body=? WHERE id=?').run(JSON.stringify(data),row.id);return {ok:true}; }
      const result=body.result;requireValue(result && typeof result.text==='string' && result.text.length<=16000,'Invalid response.');
      const papers=(result.papers || []).slice(0,8).map(p=>{const u=new URL(p.pdfUrl);requireValue(u.protocol==='https:'&&!u.username&&!u.password&&!u.port,'Invalid paper URL.');return {...paperMetadata(p),id:hash(u.href).slice(0,24),title:String(p.title).slice(0,400),authors:String(p.authors||'').slice(0,600),summary:String(p.summary||'').slice(0,1800),pdfUrl:u.href,source:String(p.source||u.href),year:String(p.year||'').slice(0,4)};});
      db.exec('BEGIN');try { add(row.chat,'assistant',{text:result.text,papers},row.id);db.prepare("UPDATE chat_tasks SET state='completed' WHERE id=?").run(row.id);db.exec('COMMIT'); }catch(e){db.exec('ROLLBACK');throw e;}
      return {ok:true};
    }
  };
}

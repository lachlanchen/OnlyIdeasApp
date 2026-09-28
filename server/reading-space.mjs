import {randomUUID} from 'node:crypto';
import {requireValue,hash,languages} from './domain.mjs';
import {taxonomy} from './research-indexes.mjs';
export function initReadingSpace(store){store.db.exec(`
 CREATE TABLE IF NOT EXISTS reading_preferences(owner TEXT PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reading_activity(id TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,ref TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS reading_activity_owner ON reading_activity(owner,created);
 CREATE TABLE IF NOT EXISTS inbox_reads(owner TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(owner,id));
 CREATE TABLE IF NOT EXISTS reading_digests(owner TEXT NOT NULL,day TEXT NOT NULL,revision TEXT NOT NULL,body TEXT NOT NULL,PRIMARY KEY(owner,day,revision));`)}
export function recordActivity(store,owner,kind,ref,body={},id=randomUUID()){
 if(!store.active(owner))return;
 store.db.prepare('INSERT OR IGNORE INTO reading_activity VALUES(?,?,?,?,?,?)').run(id,owner,kind,ref,JSON.stringify(body),Date.now());
 store.db.prepare('DELETE FROM reading_activity WHERE owner=? AND id NOT IN (SELECT id FROM reading_activity WHERE owner=? ORDER BY created DESC LIMIT 500)').run(owner,owner);
}
export function createReadingSpace(store,social,discovery){
 initReadingSpace(store);const db=store.db,pending=new Map();
 const defaults={interests:'',discipline:'',language:'en',dailyEnabled:false,dailyTime:'09:00',timezone:'UTC',commentAlerts:true,likeAlerts:true};
 function preferences(user){return {...defaults,...JSON.parse(db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id)?.body||'{}')}}
 function savePreferences(user,b){const old=preferences(user),p={...old};
  for(const k of ['dailyEnabled','commentAlerts','likeAlerts']){if(k in b){requireValue(typeof b[k]==='boolean','Choose a valid notification setting.');p[k]=b[k]}}
  if('interests'in b){requireValue(typeof b.interests==='string'&&b.interests.length<=120,'Use up to 120 characters for your interests.');p.interests=b.interests.replace(/[\x00-\x1f]/g,' ').trim()}
  if('discipline'in b){requireValue(b.discipline===''||taxonomy.openalex.some(d=>d.id===b.discipline),'Choose a discipline.');p.discipline=b.discipline}
  if('language'in b){requireValue(languages[b.language],'Choose a supported reading language.');p.language=b.language}
  if('dailyTime'in b){requireValue(/^([01]\d|2[0-3]):[0-5]\d$/.test(b.dailyTime),'Choose a valid daily time.');p.dailyTime=b.dailyTime}
  if('timezone'in b){try{requireValue(typeof b.timezone==='string'&&b.timezone.length<80,'Choose a valid time zone.');new Intl.DateTimeFormat('en',{timeZone:b.timezone}).format()}catch{requireValue(false,'Choose a valid time zone.')}p.timezone=b.timezone}
  db.prepare('INSERT OR REPLACE INTO reading_preferences VALUES(?,?)').run(user.id,JSON.stringify(p));return p;
 }
 function paper(ref,user){try{return social.resolve(ref,user).card}catch{return null}}
 function history(user){const events=db.prepare('SELECT * FROM reading_activity WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 200').all(user.id).flatMap(e=>{const b=JSON.parse(e.body);if(e.kind==='fetch'){const j=store.job(e.ref);return j?[{id:e.id,kind:e.kind,created:e.created,title:j.metadata?.title||'Paper',state:j.state,message:j.message,paperId:j.paperId,ref:j.paperId||'',source:j.sourcePage||j.url||''}]:[]}const p=paper(e.ref,user);return p?[{id:e.id,kind:e.kind,created:e.created,title:p.title,ref:e.ref,active:b.active}]:[]});return {events}}
 function inbox(user){const found=[];const now=Date.now(),since=now-90*86400_000,prefs=preferences(user);
  if(prefs.commentAlerts){const rows=db.prepare("SELECT * FROM comments WHERE created>? AND owner!=? AND json_extract(body,'$.visibility')='public' AND json_extract(body,'$.moderation')='approved' ORDER BY created DESC LIMIT 1000").all(since,user.id);
   for(const row of rows){if(!store.active(row.owner)||store.blocked(user.id,row.owner))continue;let ref=row.paper,p;
    if(ref.startsWith('item-')){try{const item=social.check(ref,user);ref=item.ref;p=paper(ref,user)}catch{continue}}else{p=paper(ref,user)}
    if(!p)continue;
    const item=row.paper.startsWith('item-')?row.paper:social.resolve(ref,user).key;
    let paperOwner=p.owner;try{const linked=social.check(item,user);if(linked.paperId)paperOwner=store.paper(linked.paperId)?.owner}catch{}
    const watching=paperOwner===user.id||db.prepare('SELECT 1 FROM paper_reactions WHERE item=? AND owner=? AND (saved=1 OR liked=1)').get(item,user.id)||db.prepare('SELECT 1 FROM comments WHERE paper=? AND owner=?').get(row.paper,user.id);
    if(!watching)continue;
    const c=JSON.parse(row.body);found.push({id:'comment:'+row.id,kind:'comment',created:row.created,ref,title:p.title,actor:c.author,commentId:row.id});
   }
  }
  if(prefs.likeAlerts){for(const row of db.prepare('SELECT * FROM paper_reactions WHERE liked=1 AND owner!=? AND updated>? ORDER BY updated DESC LIMIT 1000').all(user.id,since)){
   if(!store.active(row.owner)||store.blocked(user.id,row.owner))continue;const p=paper(row.ref,user);if(!p)continue;let owner=p.owner;
   if(!owner){try{const item=social.check(row.item,user);owner=item.paperId?store.paper(item.paperId)?.owner:null}catch{}}
   if(owner!==user.id)continue;found.push({id:'like:'+hash(row.item+':'+row.owner).slice(0,32),kind:'like',created:row.updated,ref:row.ref,title:p.title,actor:'A reader'});
  }}
  const read=new Set(db.prepare('SELECT id FROM inbox_reads WHERE owner=?').all(user.id).map(r=>r.id));
  const notifications=found.sort((a,b)=>b.created-a.created).slice(0,200).map(n=>({...n,read:read.has(n.id)}));
  return {notifications,unread:notifications.filter(n=>!n.read).length};
 }
 async function digest(user){const p=preferences(user),day=new Intl.DateTimeFormat('en-CA',{timeZone:p.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),revision=hash(JSON.stringify([p.interests,p.discipline,p.language])).slice(0,16),key=user.id+day+revision;
  const row=db.prepare('SELECT body FROM reading_digests WHERE owner=? AND day=? AND revision=?').get(user.id,day,revision);
  const current=body=>({...body,papers:body.papers.map(p=>discovery.identify(p,user))});
  if(row)return {day,...current(JSON.parse(row.body)),language:p.language};
  if(!pending.has(key))pending.set(key,(async()=>{const result=await discovery.find({q:p.interests,discipline:p.discipline,source:'openalex',sort:'latest'},user);const body={papers:result.papers.slice(0,8).map(({paperId,...v})=>v),unavailable:result.unavailable||[],stale:!!result.stale};store.requireActive(user.id);db.prepare('INSERT OR REPLACE INTO reading_digests VALUES(?,?,?,?)').run(user.id,day,revision,JSON.stringify(body));db.prepare('DELETE FROM reading_digests WHERE owner=? AND day<?').run(user.id,new Date(Date.now()-30*86400_000).toISOString().slice(0,10));return body})().finally(()=>pending.delete(key)));
  return {day,...current(await pending.get(key)),language:p.language};
 }
 return {preferences,savePreferences,history,inbox,digest,markRead(user,body){requireValue(Array.isArray(body.ids)&&body.ids.length<=200,'Select notifications to mark read.');const visible=new Set(inbox(user).notifications.map(n=>n.id));for(const id of body.ids)if(visible.has(id))db.prepare('INSERT OR IGNORE INTO inbox_reads VALUES(?,?)').run(user.id,id);return inbox(user)}};
}

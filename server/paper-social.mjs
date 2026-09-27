import { randomUUID } from 'node:crypto';
import { hash,requireValue,publicPaper } from './domain.mjs';
import { sourceKey,canReusePaper } from './import-reuse.mjs';
import { visibleComments,acceptTerms } from './community.mjs';
export function createPaperSocial(store,discovery) {
 const db=store.db;
 db.exec(`CREATE TABLE IF NOT EXISTS paper_items(id TEXT PRIMARY KEY,body TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS paper_reactions(item TEXT NOT NULL,owner TEXT NOT NULL,ref TEXT NOT NULL,saved INTEGER NOT NULL,liked INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(item,owner));`);
 function resolve(ref,user){
  let p,card;
  if(ref.startsWith('r-'))card=discovery.item(ref.slice(2),user);
  else {p=store.paper(ref);requireValue(canReusePaper(store,p,user?.id),'Paper not found.',404);card=publicPaper(p)}
  const privatePaper=p?.visibility==='private';
  const key='item-'+hash(privatePaper?'private:'+p.id:sourceKey(card.pdfUrl||card.source)||'paper:'+card.id).slice(0,32);
  const previous=db.prepare('SELECT body FROM paper_items WHERE id=?').get(key);
  const data={ref,...(previous?JSON.parse(previous.body):{}),...(p?{paperId:p.id}:{}),private:privatePaper===true};
  // Bind an existing public paper so withdrawal/moderation remains authoritative.
  if(!p&&card.paperId&&store.paper(card.paperId)?.visibility==='public')data.paperId=card.paperId;
  db.prepare('INSERT OR REPLACE INTO paper_items VALUES(?,?)').run(key,JSON.stringify(data));
  check(key,user);return {key,card,private:privatePaper};
 }
 function check(key,user){const row=db.prepare('SELECT body FROM paper_items WHERE id=?').get(key);requireValue(row,'Paper not found.',404);const data=JSON.parse(row.body);if(data.paperId){const p=store.paper(data.paperId);requireValue(canReusePaper(store,p,user?.id)&&(data.private||p.visibility==='public'),'Paper not found.',404)}return data}
 function state(ref,user){const {key,card,...rest}=resolve(ref,user);const own=user?db.prepare('SELECT saved,liked FROM paper_reactions WHERE item=? AND owner=?').get(key,user.id):null;
 const likes=db.prepare('SELECT owner FROM paper_reactions WHERE item=? AND liked=1').all(key).filter(r=>store.active(r.owner)&&!store.blocked(user?.id,r.owner)).length;
 const comments=visibleComments(store,key,user);
 return {ref,...rest,saved:!!own?.saved,liked:!!own?.liked,likes,commentCount:comments.length,shareUrl:card.visibility==='private'?null:`https://agent.onlyideas.art/?${ref.startsWith('r-')?'research':'paper'}=${encodeURIComponent(ref.startsWith('r-')?ref.slice(2):ref)}`};
 }
 return {check,state,
  saved(user){return db.prepare('SELECT ref FROM paper_reactions WHERE owner=? AND saved=1 ORDER BY updated DESC LIMIT 500').all(user.id).flatMap(({ref})=>{try{return [{ref,...resolve(ref,user).card}]}catch{return []}})},
  update(ref,user,body){const {key}=resolve(ref,user);const old=db.prepare('SELECT saved,liked FROM paper_reactions WHERE item=? AND owner=?').get(key,user.id)||{saved:0,liked:0};requireValue(['saved','liked'].some(k=>typeof body[k]==='boolean'),'Choose Save or Like.');requireValue(db.prepare('SELECT count(*) AS n FROM paper_reactions WHERE owner=?').get(user.id).n<1000||db.prepare('SELECT 1 FROM paper_reactions WHERE item=? AND owner=?').get(key,user.id),'Your saved reading list is full.');db.prepare('INSERT OR REPLACE INTO paper_reactions VALUES(?,?,?,?,?,?)').run(key,user.id,ref,typeof body.saved==='boolean'?+body.saved:old.saved,typeof body.liked==='boolean'?+body.liked:old.liked,Date.now());return state(ref,user)},
  comments(ref,user){return {comments:visibleComments(store,resolve(ref,user).key,user)}},
  post(ref,user,body){const item=resolve(ref,user);if(!item.private)acceptTerms(store,user,body.acceptTerms);requireValue(typeof body.text==='string'&&body.text.trim()&&body.text.length<=5000,'Write a comment of up to 5,000 characters.');requireValue(/^[a-f0-9-]{36}$/.test(body.id||''),'A comment ID is required.');const old=db.prepare('SELECT * FROM comments WHERE id=?').get(body.id);if(old){requireValue(old.owner===user.id&&old.paper===item.key,'Comment ID unavailable.',409);return {ok:true}}
   const c={id:body.id||randomUUID(),paperId:item.key,owner:user.id,author:user.name,visibility:item.private?'private':'pending',moderation:item.private?'private':'pending',text:body.text.trim(),quote:'',sectionId:null,paragraphId:null,createdAt:new Date().toISOString()};db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(c.id,item.key,user.id,JSON.stringify(c),Date.now());return {ok:true};
  }
 };
}

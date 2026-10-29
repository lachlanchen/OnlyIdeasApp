import {requireValue} from './domain.mjs';
import {creditTransaction} from './credits.mjs';

export function initAnnotations(store) {
 store.db.exec(`CREATE TABLE IF NOT EXISTS reader_annotations(owner TEXT NOT NULL,paper TEXT NOT NULL,id TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,PRIMARY KEY(owner,paper,id));`);
}
export function annotations(store,owner,paper) {
 return store.db.prepare('SELECT body FROM reader_annotations WHERE owner=? AND paper=? ORDER BY rowid').all(owner,paper).map(r=>JSON.parse(r.body)).filter(a=>!a.deleted);
}
export function saveAnnotation(store,owner,paper,input) {
 return creditTransaction(store,()=>{
  requireValue(/^[a-f0-9-]{36}$/.test(input.id||'')&&Number.isSafeInteger(input.version)&&input.version>=0,'Invalid highlight.');
  const old=store.db.prepare('SELECT body FROM reader_annotations WHERE owner=? AND paper=? AND id=?').get(owner,paper.id,input.id);
  const previous=old?JSON.parse(old.body):null;
  // Retry of the same mutation is safe even after an uncertain network result.
  requireValue(/^[a-f0-9-]{36}$/.test(input.operation||''),'Invalid highlight operation.');
  if(previous?.operation===input.operation)return previous;
  requireValue((previous?.version||0)===input.version&&!previous?.deleted,'This highlight changed on another device. Reopen Highlights to load the latest version.',409);
  if(!previous)requireValue(input.revision===paper.revision,'The paper changed. Reopen it before highlighting.',409);
  requireValue(previous||annotations(store,owner,paper.id).length<500,'This paper already has 500 highlights.');
  const anchor=previous||input;
  requireValue(typeof anchor.quote==='string'&&anchor.quote.length>0&&anchor.quote.length<=4000,'Select up to 4,000 characters.');
  requireValue(typeof anchor.language==='string'&&/^[\w-]{2,20}$/.test(anchor.language),'Invalid reading language.');
  requireValue(['prefix','suffix'].every(k=>typeof anchor[k]==='string'&&anchor[k].length<=64)&&Number.isSafeInteger(anchor.start)&&anchor.start>=0&&anchor.start<=4000000,'Invalid passage anchor.');
  requireValue(['yellow','green','pink','blue'].includes(input.color)&&typeof input.note==='string'&&input.note.length<=5000,'Choose a highlight color and a note under 5,000 characters.');
  const value={id:input.id,version:input.version+1,operation:input.operation,revision:anchor.revision,language:anchor.language,quote:anchor.quote,prefix:anchor.prefix,suffix:anchor.suffix,start:anchor.start,color:input.color,note:input.note,deleted:input.deleted===true,updatedAt:new Date().toISOString()};
  store.db.prepare('INSERT OR REPLACE INTO reader_annotations VALUES(?,?,?,?,?)').run(owner,paper.id,value.id,value.version,JSON.stringify(value));
  return value;
 });
}

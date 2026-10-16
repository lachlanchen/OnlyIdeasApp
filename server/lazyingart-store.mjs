/** App-owned encrypted profile persistence. The issuer remains EchoMind-owned. */
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomUUID} from 'node:crypto';
import {PROFILE_BINDING as B,createProfileAdapter,ProfileLinkError} from './lazyingart-profile.mjs';
import {creditTransaction as transaction} from './credits.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const check=(v,code)=>{if(!v)throw new ProfileLinkError(code)};
const credentialData=(tokens,identity)=>({accessToken:tokens.accessToken,refreshToken:tokens.refreshToken,identity});
export function createProfileStore(store,config,{transport,now=()=>Date.now()}={}) {
  if(!config || (config.enabled!==true&&!config.encryptionKey))return {enabled:false};
  check(typeof config.encryptionKey==='string'&&/^[a-f0-9]{64}$/.test(config.encryptionKey),'invalid_encryption_key');
  const key=Buffer.from(config.encryptionKey,'hex'),db=store.db;
  const bound=JSON.stringify(B),fingerprint=hash(bound+config.encryptionKey);
  const encrypt=(type,id,value)=>{const nonce=randomBytes(12),c=createCipheriv('aes-256-gcm',key,nonce);c.setAAD(Buffer.from(bound+'|'+type+'|'+id));const body=Buffer.concat([c.update(JSON.stringify(value),'utf8'),c.final()]);return JSON.stringify([nonce.toString('base64'),c.getAuthTag().toString('base64'),body.toString('base64')])};
  const decrypt=(type,id,body)=>{try{const[n,t,c]=JSON.parse(body),d=createDecipheriv('aes-256-gcm',key,Buffer.from(n,'base64'));d.setAAD(Buffer.from(bound+'|'+type+'|'+id));d.setAuthTag(Buffer.from(t,'base64'));return JSON.parse(Buffer.concat([d.update(Buffer.from(c,'base64')),d.final()]).toString('utf8'))}catch{throw new ProfileLinkError('profile_store_unavailable')}};
  // Reject credential/binding drift before writing anything to an existing store.
  transaction(store,()=>{
    db.exec(`CREATE TABLE IF NOT EXISTS profile_meta(id INTEGER PRIMARY KEY CHECK(id=1),fingerprint TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profile_attempts(id TEXT PRIMARY KEY,state TEXT UNIQUE,binding TEXT,expires INTEGER NOT NULL,body TEXT NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS profile_links(owner TEXT PRIMARY KEY,issuer TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,state TEXT NOT NULL,generation TEXT NOT NULL,lease INTEGER NOT NULL DEFAULT 0,UNIQUE(issuer,subject));
      CREATE TABLE IF NOT EXISTS profile_revocations(id TEXT PRIMARY KEY,body TEXT NOT NULL,created INTEGER NOT NULL);`);
    const old=db.prepare('SELECT fingerprint FROM profile_meta WHERE id=1').get();
    check(!old||old.fingerprint===fingerprint,'profile_store_binding_changed');
    db.prepare('INSERT OR IGNORE INTO profile_meta VALUES(1,?)').run(fingerprint);
  });
  const attempts={
    create(record){return transaction(store,()=>{
      const row=db.prepare('SELECT * FROM profile_attempts WHERE id=? AND expires>? AND consumed=0').get(record.attemptId,now());check(row,'attempt_expired');
      const data=decrypt('attempt',row.id,row.body);check(!data.record,'attempt_reused');
      db.prepare('UPDATE profile_attempts SET state=?,binding=?,body=? WHERE id=?').run(record.stateHash,record.bindingHash,encrypt('attempt',row.id,{...data,record}),row.id);
    })},
    consume(query){return transaction(store,()=>{
      const row=db.prepare('SELECT * FROM profile_attempts WHERE state=? AND binding=? AND expires>? AND consumed=0').get(query.stateHash,query.bindingHash,now());if(!row)return null;
      const data=decrypt('attempt',row.id,row.body);db.prepare('UPDATE profile_attempts SET consumed=1 WHERE id=?').run(row.id);return data.record;
    })},
  };
  const credentials={
    stage(tokens){return transaction(store,()=>deferRevoke(tokens,120_000))},
    failed(id){db.prepare('UPDATE profile_revocations SET created=? WHERE id=?').run(now(),id)},
  };
  const adapter=createProfileAdapter(config,{attempts,credentials,transport,now});
  const current=owner=>db.prepare('SELECT * FROM profile_links WHERE owner=?').get(owner);
  function deferRevoke(tokens,delay=0){const id=randomUUID();db.prepare('INSERT INTO profile_revocations VALUES(?,?,?)').run(id,encrypt('revoke',id,{token:tokens.refreshToken}),now()+delay);return id}
  function contextValid(context) {
    if(!context.owner)return;
    store.requireActive(context.owner);
    const row=db.prepare('SELECT user FROM sessions WHERE id=? AND expires>?').get(context.sessionHash,now());
    check(row&&JSON.parse(row.user).id===context.owner,'local_session_changed');
    check(JSON.parse(row.user).authenticatedAt===context.authenticatedAt,'local_reauthentication_required');
    check(Number.isSafeInteger(context.authenticatedAt)&&context.authenticatedAt<=now()&&context.authenticatedAt>=now()-600_000,'local_reauthentication_required');
  }
  async function begin({binding,owner=null,sessionHash=null,authenticatedAt=null,flow=null}) {
    const context={owner,sessionHash,authenticatedAt,flow,started:now()};contextValid(context);
    const id=randomBytes(32).toString('base64url');
    transaction(store,()=>{db.prepare('DELETE FROM profile_attempts WHERE expires<=?').run(now());db.prepare('INSERT INTO profile_attempts(id,expires,body) VALUES(?,?,?)').run(id,now()+600_000,encrypt('attempt',id,{context}))});
    try{return await adapter.begin({binding,attemptId:id,fresh:!!owner})}catch(e){db.prepare('DELETE FROM profile_attempts WHERE id=?').run(id);throw e}
  }
  async function complete({callbackUrl,binding}) {
    const result=await adapter.complete({callbackUrl,binding});
    try{return transaction(store,()=>{
      const row=db.prepare('SELECT * FROM profile_attempts WHERE id=? AND consumed=1 AND expires>?').get(result.attemptId,now());check(row,'attempt_expired');
      const {context}=decrypt('attempt',row.id,row.body);contextValid(context);
      const {identity,tokens}=result;
      check(db.prepare('SELECT 1 FROM profile_revocations WHERE id=? AND created>?').get(result.credentialId,now()),'profile_session_changed');
      if(context.owner)check(identity.authenticatedAt*1000>=context.started-30_000,'central_reauthentication_required');
      const existing=db.prepare('SELECT * FROM profile_links WHERE issuer=? AND subject=?').get(identity.issuer,identity.subject);
      const owner=context.owner||existing?.owner||store.identity('lazyingart-'+identity.subject);
      store.requireActive(owner);
      check(!existing||existing.owner===owner,'account_already_linked');
      const previous=current(owner);check(!previous||(previous.issuer===identity.issuer&&previous.subject===identity.subject),'different_account_already_linked');
      if(previous)deferRevoke(decrypt('link',owner,previous.body));
      db.prepare('INSERT INTO profile_links VALUES(?,?,?,?,?,?,0) ON CONFLICT(owner) DO UPDATE SET body=excluded.body,state=excluded.state,generation=excluded.generation,lease=0').run(owner,identity.issuer,identity.subject,encrypt('link',owner,credentialData(tokens,identity)),'active',randomUUID());
      db.prepare('DELETE FROM profile_attempts WHERE id=?').run(row.id);
      db.prepare('DELETE FROM profile_revocations WHERE id=?').run(result.credentialId);
      // Retain the original app profile when explicitly linking. No data/credit move.
      const local=context.owner?JSON.parse(db.prepare('SELECT user FROM sessions WHERE id=?').get(context.sessionHash).user):{id:owner,name:identity.displayName||'LazyingArt reader',login:'LazyingArt',provider:'lazyingart',authenticatedAt:identity.authenticatedAt*1000};
      return {user:local,flow:context.flow,linked:!!context.owner};
    })}catch(e){credentials.failed(result.credentialId);throw e}
  }
  const proofs=new Map();
  function proof(owner){
    if(proofs.has(owner))return proofs.get(owner);
    const pending=proofOnce(owner).finally(()=>{if(proofs.get(owner)===pending)proofs.delete(owner)});proofs.set(owner,pending);return pending;
  }
  async function proofOnce(owner) {
    store.requireActive(owner);let row=current(owner);
    if(row?.state==='refreshing'&&row.lease<=now()){
      db.prepare("UPDATE profile_links SET state='reauthorize',lease=0 WHERE owner=? AND generation=? AND state='refreshing'").run(owner,row.generation);
      throw new ProfileLinkError('reconnect_required');
    }
    check(row?.state!=='refreshing','profile_refresh_busy');check(row&&row.state==='active','reconnect_required');
    let data=decrypt('link',owner,row.body);
    if(data.identity.expiresAt*1000<=now()+30_000){
      const lease=randomUUID();
      transaction(store,()=>{const present=current(owner);check(present?.state==='active'&&present.generation===row.generation,'profile_refresh_busy');db.prepare("UPDATE profile_links SET state='refreshing',generation=?,lease=? WHERE owner=?").run(lease,now()+90_000,owner)});
      let fresh;
      try{
        fresh=await adapter.refreshOnce(data.refreshToken,row.subject);
        transaction(store,()=>{const present=current(owner);check(present?.state==='refreshing'&&present.generation===lease&&present.lease>now()&&store.active(owner)&&db.prepare('SELECT 1 FROM profile_revocations WHERE id=? AND created>?').get(fresh.credentialId,now()),'profile_session_changed');db.prepare("UPDATE profile_links SET state='active',body=?,lease=0 WHERE owner=?").run(encrypt('link',owner,credentialData(fresh.tokens,fresh.identity)),owner);db.prepare('DELETE FROM profile_revocations WHERE id=?').run(fresh.credentialId)});
        data=credentialData(fresh.tokens,fresh.identity);row=current(owner);
      }catch(e){transaction(store,()=>{if(fresh)credentials.failed(fresh.credentialId);db.prepare("UPDATE profile_links SET state='reauthorize',lease=0 WHERE owner=? AND generation=? AND state='refreshing'").run(owner,lease)});throw e}
    }
    const identity=await adapter.introspect(data.accessToken,row.subject);
    const latest=current(owner);check(latest?.generation===row.generation&&latest.state==='active'&&store.active(owner),'profile_session_changed');
    if(!identity){db.prepare("UPDATE profile_links SET state='reauthorize' WHERE owner=? AND generation=?").run(owner,row.generation);throw new ProfileLinkError('reconnect_required')}
    return {identity,accessToken:data.accessToken};
  }
  function disconnect(owner) {
    transaction(store,()=>{const row=current(owner);if(!row)return;const data=decrypt('link',owner,row.body);deferRevoke(data);db.prepare("UPDATE profile_links SET state='disconnected',generation=?,lease=0 WHERE owner=?").run(randomUUID(),owner)});
  }
  let flushing=false;
  async function flushRevocations(){
    if(flushing)return;flushing=true;
    try{
    for(const row of db.prepare('SELECT * FROM profile_revocations WHERE created<=? ORDER BY created LIMIT 10').all(now())){
      try{await adapter.revoke(decrypt('revoke',row.id,row.body).token);db.prepare('DELETE FROM profile_revocations WHERE id=?').run(row.id)}catch{break}
    }
    }finally{flushing=false}
  }
  const verifiedReads=new Map();
  async function authorizeSession(owner,{fresh=false}={}) {
    const row=current(owner),cached=verifiedReads.get(owner);
    store.requireActive(owner);check(['active','refreshing'].includes(row?.state),'reconnect_required');
    if(!fresh&&cached?.generation===row.generation&&cached.until>now())return;
    const result=await proof(owner);verifiedReads.set(owner,{generation:current(owner).generation,until:Math.min(now()+30_000,result.identity.expiresAt*1000)});
    if(verifiedReads.size>1000){for(const[id,v]of verifiedReads)if(v.until<=now())verifiedReads.delete(id);while(verifiedReads.size>1000)verifiedReads.delete(verifiedReads.keys().next().value)}
  }
  function remove(owner) {transaction(store,()=>{disconnect(owner);db.prepare('DELETE FROM profile_links WHERE owner=?').run(owner)})}
  const status=owner=>{const row=current(owner);return {enabled:adapter.enabled,linked:row?.state==='active',state:row?.state||'unlinked'}};
  return {enabled:adapter.enabled,begin,complete,proof,authorizeSession,disconnect,remove,flushRevocations,status,connection:owner=>{const row=current(owner);return row?{issuer:row.issuer,subject:row.subject,generation:row.generation,state:row.state}:null}};
}

import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {Store} from '../server/store.mjs';import {hash} from '../server/domain.mjs';import {createProfileStore} from '../server/lazyingart-store.mjs';import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';
import {createHash} from 'node:crypto';
import {LAC_READ,LAC_ASSET} from '../server/lac-balance.mjs';
const config={...B,enabled:true,clientSecret:'s'.repeat(64),encryptionKey:'a'.repeat(64)},binding='b'.repeat(43),subject='la_'+'1'.repeat(32);
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'onlyideas-profile-')),store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true})});
 const s={store,dir,time:Date.now(),subject,active:true,requests:[],hook:null};
 const discovery={issuer:B.issuer,contract_version:1,...Object.fromEntries(Object.entries({authorization_endpoint:'/account/authorize',token_endpoint:'/account/token',profile_endpoint:'/account/profile',introspection_endpoint:'/account/introspect',revocation_endpoint:'/account/revoke',account_endpoint:'/account'}).map(([k,v])=>[k,B.issuer+v])),response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['client_secret_post'],scopes_supported:['profile'],providers:{password:true,google:false,apple:false,github:false},adapter_contracts:['provider-select-v1'],authorization_extensions:{'provider-select-v1':{parameter:'authorization_contract',provider_parameter:'provider',prompt_parameter:'prompt',reuse_consent_parameter:'reuse_consent',scope:'profile',consent_ttl_seconds:2592000,providers:['lazyingart','google','apple','github'],prompt_values:['login','select_account','consent']}}};
 s.transport=async(method,url,body)=>{
  s.requests.push({url,body});const overridden=await s.hook?.(url,body);if(overridden!==undefined)return overridden;
  if(url.endsWith('lazyingart-account'))return discovery;
  if(url.endsWith('/token'))return {access_token:'t'.repeat(43),refresh_token:'r'.repeat(64),expires_in:600,scope:'profile',token_type:'Bearer'};
  if(url.endsWith('/introspect'))return s.active?{active:true,iss:B.issuer,sub:s.subject,client_id:B.clientId,aud:B.audience,scope:'profile',token_type:'Bearer',iat:Math.floor(s.time/1000),exp:Math.floor(s.time/1000)+600,auth_time:Math.floor(s.time/1000),account:{subject:s.subject,display_name:'Fixture reader',account_status:'active',email_verified:true},verified_legacy_identities:[]}:{active:false};
  if(url.endsWith('/revoke'))return{success:true};throw Error('unexpected route');
 };
 s.options={transport:s.transport,now:()=>s.time};s.link=createProfileStore(store,config,s.options);
 s.start=async(context={})=>{const result=await s.link.begin({binding,...context}),u=new URL(result.authorizationUrl);return{url:u,callbackUrl:B.redirectUri+'?'+new URLSearchParams({state:u.searchParams.get('state'),iss:B.issuer,code:'c'.repeat(43)})}};
 s.finish=async(context={})=>{const a=await s.start(context);return s.link.complete({callbackUrl:a.callbackUrl,binding})};
 return s;
}
test('disabled shared login creates no tables, writes or issuer calls',t=>{const dir=mkdtempSync(join(tmpdir(),'onlyideas-off-')),s=new Store(dir);t.after(()=>{s.close();rmSync(dir,{recursive:true,force:true})});assert.deepEqual(createProfileStore(s,{}),{enabled:false});assert.equal(s.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'profile_%'").get().n,0)});
test('durable one-use callback encrypts verifier and credentials; reopening reuses the same central identity',async t=>{
 const s=fixture(t),a=await s.start();const row=s.store.db.prepare('SELECT body FROM profile_attempts').get();assert.ok(!row.body.includes('verifier'));
 await assert.rejects(s.link.complete({callbackUrl:a.callbackUrl,binding:'z'.repeat(43)}));
 const result=await s.link.complete({callbackUrl:a.callbackUrl,binding});assert.equal(result.user.login,'LazyingArt');
 await assert.rejects(s.link.complete({callbackUrl:a.callbackUrl,binding}));
 const body=s.store.db.prepare('SELECT body FROM profile_links').get().body;assert.ok(!body.includes('t'.repeat(43)));assert.ok(!body.includes('r'.repeat(64)));
 s.link=createProfileStore(s.store,config,s.options);assert.equal((await s.finish()).user.id,result.user.id);
 assert.equal((await s.link.proof(result.user.id)).identity.subject,subject);
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_links').get().n,1);
});
test('existing app account links only with fresh local session and fresh central proof; local balances stay untouched',async t=>{
 const s=fixture(t),user={id:'github-42',name:'Local name',authenticatedAt:s.time},token=s.store.createSession(user);
 s.store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run('purchase',user.id,45,'subscription',null,s.time);
 const context={owner:user.id,sessionHash:hash(token),authenticatedAt:s.time};
 await assert.rejects(s.start({...context,authenticatedAt:s.time-601_000}),{code:'local_reauthentication_required'});
 const a=await s.start(context);assert.equal(a.url.searchParams.get('prompt'),'login');assert.equal(a.url.searchParams.get('reuse_consent'),'false');
 const linked=await s.link.complete({callbackUrl:a.callbackUrl,binding});assert.equal(linked.user.id,user.id);assert.equal(linked.user.name,'Local name');
 assert.equal(s.store.db.prepare('SELECT sum(delta) AS n FROM credit_ledger').get().n,45);
 assert.equal((await s.finish()).user.id,user.id);
 const other={id:'github-99',authenticatedAt:s.time},otherToken=s.store.createSession(other);
 await assert.rejects(s.finish({owner:other.id,sessionHash:hash(otherToken),authenticatedAt:s.time}),{code:'account_already_linked'});
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_links').get().n,1);
});
test('signout before a callback prevents a late link, and new credentials enter revocation queue',async t=>{
 const s=fixture(t),token=s.store.createSession({id:'reader',authenticatedAt:s.time}),a=await s.start({owner:'reader',sessionHash:hash(token),authenticatedAt:s.time});
 s.store.db.prepare('DELETE FROM sessions WHERE id=?').run(hash(token));
 await assert.rejects(s.link.complete({callbackUrl:a.callbackUrl,binding}),{code:'local_session_changed'});
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_links').get().n,0);
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,1);
 await s.link.flushRevocations();assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('refresh has one durable claim across service instances and an uncertain result is never replayed',async t=>{
 const s=fixture(t),user=(await s.finish()).user;s.time+=580_000;
 const second=createProfileStore(s.store,config,s.options);let release,entered;const started=new Promise(r=>entered=r);
 s.hook=async(url,body)=>{if(url.endsWith('/token')&&body.grant_type==='refresh_token'){entered();await new Promise(r=>release=r);throw Error('lost response')}};
 const pending=s.link.proof(user.id);await started;
 await assert.rejects(second.proof(user.id),{code:'profile_refresh_busy'});release();await assert.rejects(pending);
 s.link=createProfileStore(s.store,config,s.options);await assert.rejects(s.link.proof(user.id),{code:'reconnect_required'});
 assert.equal(s.requests.filter(r=>r.body?.grant_type==='refresh_token').length,1);
});
test('disconnect fences in-flight proof and remote revoke retries survive a restart',async t=>{
 const s=fixture(t),user=(await s.finish()).user;let release,entered;const started=new Promise(r=>entered=r);
 s.hook=async(url)=>{if(url.endsWith('/introspect')){entered();await new Promise(r=>release=r)}};
 const pending=s.link.proof(user.id);await started;s.link.disconnect(user.id);release();await assert.rejects(pending,{code:'profile_session_changed'});
 assert.equal(s.link.status(user.id).linked,false);
 s.hook=async(url)=>{if(url.endsWith('/revoke'))throw Error('offline')};await s.link.flushRevocations();
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,1);
 s.link=createProfileStore(s.store,config,s.options);s.hook=null;await s.link.flushRevocations();
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('wrong encryption key cannot open or silently replace existing profile state',async t=>{
 const s=fixture(t);await s.finish();const before=s.store.db.prepare('SELECT * FROM profile_links').all();
 assert.throws(()=>createProfileStore(s.store,{...config,encryptionKey:'b'.repeat(64)},s.options),{code:'profile_store_binding_changed'});
 assert.deepEqual(s.store.db.prepare('SELECT * FROM profile_links').all(),before);
});

test('web routes enforce Origin, browser binding and one-use callback before issuing an app session',async t=>{
 const s=fixture(t),{createApp}=await import('../server/app.mjs'),origin=new URL(B.redirectUri).origin;
 const app=createApp(s.store,{origin,lazyingart:config},{worker:false,profileOptions:s.options});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
 const base=`http://127.0.0.1:${app.address().port}`;
 const start=async(headers={Origin:origin})=>fetch(base+'/api/auth/lazyingart/start',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({mode:'login'})});
 assert.equal((await start({Origin:'https://other.test'})).status,403);
 const begin=await (await start()).json();const browser=await fetch(base+new URL(begin.url).pathname+new URL(begin.url).search,{redirect:'manual'});assert.equal(browser.status,303);
 const cookie=browser.headers.get('set-cookie').split(';')[0],auth=new URL(browser.headers.get('location'));
 const callback='/api/auth/lazyingart/callback?'+new URLSearchParams({iss:B.issuer,code:'c'.repeat(43),state:auth.searchParams.get('state')});
 assert.equal((await fetch(base+callback,{redirect:'manual'})).status,400);
 assert.equal(s.requests.filter(r=>r.url.endsWith('/token')).length,0);
 const result=await fetch(base+callback,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(result.status,303);assert.match(result.headers.get('set-cookie'),/__Host-onlyideas=[a-f0-9-]{72}/);
 assert.equal((await fetch(base+callback,{headers:{Cookie:cookie},redirect:'manual'})).status,400);
 const session=result.headers.getSetCookie().find(x=>x.startsWith('__Host-onlyideas=')).split(';')[0];
 const user=await (await fetch(base+'/api/session',{headers:{Cookie:session}})).json();assert.equal(user.user.login,'LazyingArt');
 assert.equal(user.capabilities.lazyingart,true);
 const disconnected=await fetch(base+'/api/auth/lazyingart/disconnect',{method:'POST',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.deepEqual(await disconnected.json(),{ok:true,signedOut:true});
 assert.equal((await (await fetch(base+'/api/session',{headers:{Cookie:session}})).json()).user,null);
});
test('concurrent app reads share one refresh without sending the user back to login',async t=>{
 const s=fixture(t),user=(await s.finish()).user;s.time+=580_000;let release,entered;const started=new Promise(r=>entered=r);
 s.hook=async(url,body)=>{if(url.endsWith('/token')&&body.grant_type==='refresh_token'){entered();await new Promise(r=>release=r)}};
 const first=s.link.authorizeSession(user.id);await started;const second=s.link.authorizeSession(user.id,{fresh:true});release();await Promise.all([first,second]);
 assert.equal(s.requests.filter(r=>r.body?.grant_type==='refresh_token').length,1);assert.equal(s.link.status(user.id).linked,true);
});
test('a crashed refresh lease expires into reconnect instead of permanent busy or token replay',async t=>{
 const s=fixture(t),user=(await s.finish()).user;s.store.db.prepare("UPDATE profile_links SET state='refreshing',lease=? WHERE owner=?").run(s.time+90_000,user.id);
 await assert.rejects(s.link.proof(user.id),{code:'profile_refresh_busy'});s.time+=91_000;s.link=createProfileStore(s.store,config,s.options);
 await assert.rejects(s.link.proof(user.id),{code:'reconnect_required'});assert.equal(s.link.status(user.id).state,'reauthorize');
 assert.equal(s.requests.filter(r=>r.body?.grant_type==='refresh_token').length,0);
});
test('native shared login returns an independent PKCE flow and callback never exposes credentials',async t=>{
 const s=fixture(t),{createApp}=await import('../server/app.mjs'),origin=new URL(B.redirectUri).origin;
 const app=createApp(s.store,{origin,lazyingart:config},{worker:false,profileOptions:s.options});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
 const base=`http://127.0.0.1:${app.address().port}`,headers={Origin:'capacitor://localhost','X-OnlyIdeas-Client':'native','Content-Type':'application/json'},verifier='v'.repeat(43),challenge=Buffer.from(hash(verifier),'hex').toString('base64url');
 const begin=await (await fetch(base+'/api/auth/lazyingart/start',{method:'POST',headers,body:JSON.stringify({mode:'login',challenge})})).json();
 const u=new URL(begin.url),browser=await fetch(base+u.pathname+u.search,{redirect:'manual'}),cookie=browser.headers.get('set-cookie').split(';')[0],auth=new URL(browser.headers.get('location'));
 const callback='/api/auth/lazyingart/callback?'+new URLSearchParams({iss:B.issuer,code:'c'.repeat(43),state:auth.searchParams.get('state')});
 const completed=await fetch(base+callback,{headers:{Cookie:cookie}}),html=await completed.text();assert.equal(completed.status,200);assert.ok(html.includes(begin.flow));assert.ok(!html.includes('t'.repeat(43)));assert.ok(!html.includes('r'.repeat(64)));
 const redeem=proof=>fetch(base+'/api/auth/native/complete',{method:'POST',headers,body:JSON.stringify({flow:begin.flow,verifier:proof})});
 assert.equal((await redeem('z'.repeat(43))).status,403);
 const signed=await (await redeem(verifier)).json();assert.ok(signed.token);assert.equal(signed.user.login,'LazyingArt');assert.equal((await redeem(verifier)).status,400);
});
test('disabling new login preserves durable revocation and account deletion removes the local mapping',async t=>{
 const s=fixture(t),user=(await s.finish()).user;s.link=createProfileStore(s.store,{...config,enabled:false},s.options);
 assert.equal(s.link.enabled,false);s.link.remove(user.id);assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_links').get().n,0);
 await s.link.flushRevocations();assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('central app sessions revalidate writes and stop cached reads after revocation or the 30-second window',async t=>{
 const s=fixture(t),user=(await s.finish()).user;await s.link.authorizeSession(user.id);
 const reads=s.requests.filter(r=>r.url.endsWith('/introspect')).length;
 await s.link.authorizeSession(user.id);assert.equal(s.requests.filter(r=>r.url.endsWith('/introspect')).length,reads);
 s.active=false;await assert.rejects(s.link.authorizeSession(user.id,{fresh:true}),{code:'reconnect_required'});
 await assert.rejects(s.link.authorizeSession(user.id),{code:'reconnect_required'});
 s.active=true;await s.finish();await s.link.authorizeSession(user.id);s.active=false;s.time+=31_000;
 await assert.rejects(s.link.authorizeSession(user.id),{code:'reconnect_required'});
});
test('an exchange followed by failed introspection leaves encrypted durable revocation work',async t=>{
 const s=fixture(t);s.hook=async url=>{if(url.endsWith('/introspect'))throw Error('offline')};
 await assert.rejects(s.finish());assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_links').get().n,0);
 const row=s.store.db.prepare('SELECT * FROM profile_revocations').get();assert.ok(row);assert.ok(!row.body.includes('r'.repeat(64)));
 s.link=createProfileStore(s.store,config,s.options);s.hook=null;await s.link.flushRevocations();
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('the cleanup worker cannot revoke credentials while their bounded callback is completing',async t=>{
 const s=fixture(t);let release,entered;const started=new Promise(r=>entered=r);
 s.hook=async url=>{if(url.endsWith('/introspect')){entered();await new Promise(r=>release=r)}};
 const pending=s.finish();await started;assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,1);
 await s.link.flushRevocations();assert.equal(s.requests.filter(r=>r.url.endsWith('/revoke')).length,0);
 release();await pending;assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('rotated credentials survive failed refresh introspection for later revoke',async t=>{
 const s=fixture(t),user=(await s.finish()).user;s.time+=580_000;
 s.hook=async url=>{if(url.endsWith('/introspect'))throw Error('offline')};
 await assert.rejects(s.link.proof(user.id));assert.equal(s.link.status(user.id).state,'reauthorize');
 assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,1);
 s.hook=null;await s.link.flushRevocations();assert.equal(s.store.db.prepare('SELECT count(*) AS n FROM profile_revocations').get().n,0);
});
test('actual points endpoint requires local login, separate consent and the unchanged linked subject',async t=>{
 const s=fixture(t),{createApp}=await import('../server/app.mjs');
 const user={id:'github-fixture',provider:'github',authenticatedAt:s.time},token=s.store.createSession(user);
 await s.finish({owner:user.id,sessionHash:hash(token),authenticatedAt:s.time});
 s.store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run('preserved',user.id,45,'subscription',null,s.time);
 let consent=false,calls=0,release,entered;
 const provider={qualified:true,binding:B,contract:LAC_READ.contract,scope:LAC_READ.scope,origin:LAC_READ.origin,audience:LAC_READ.audience,
  authorize:async()=>({issuer:B.issuer,subject,actor:B.clientId,sourceAudience:B.audience,scope:consent?LAC_READ.scope:'profile'}),
  balance:async()=>{calls++;if(entered){entered();await new Promise(r=>release=r)}return{schema_version:1,contract:LAC_READ.contract,as_of:Math.floor(Date.now()/1000),account:{issuer:B.issuer,subject},balance_id:'lac_fun_points_'+createHash('sha256').update(JSON.stringify([B.issuer,subject,LAC_READ.asset])).digest('hex'),revision:'1',asset:LAC_ASSET,ledger:'fun_points',pending_points:'0',awarded_points:'0',reversed_points:'0',counts:{pending:0,awarded:0,reversed:0},spendable:false,aggregation:'canonical_account_snapshot_do_not_sum_across_apps'}}};
 const app=createApp(s.store,{origin:new URL(B.redirectUri).origin,lazyingart:config,lacPoints:{enabled:true}},{worker:false,profileOptions:s.options,pointsProvider:provider});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.close(r);app.closeAllConnections()}));
 const base=`http://127.0.0.1:${app.address().port}`,headers={Cookie:'__Host-onlyideas='+token};
 assert.equal((await fetch(base+'/api/lac/balance')).status,401);
 const denied=await fetch(base+'/api/lac/balance',{headers});assert.equal(denied.status,403);assert.equal((await denied.json()).state,'consent-required');assert.equal(calls,0);
 consent=true;const ok=await fetch(base+'/api/lac/balance',{headers});assert.equal(ok.status,200);assert.equal((await ok.json()).balance,'0');assert.equal(s.store.db.prepare('SELECT sum(delta) n FROM credit_ledger').get().n,45);
 const started=new Promise(r=>entered=r),pending=fetch(base+'/api/lac/balance',{headers});await started;s.link.disconnect(user.id);release();const late=await pending;assert.equal(late.status,403);assert.equal((await late.json()).state,'link-required');
});
test('points configuration alone cannot advertise or expose an unqualified SDK consumer',async t=>{
 const s=fixture(t),{createApp}=await import('../server/app.mjs'),token=s.store.createSession({id:'github-fixture'});
 const app=createApp(s.store,{origin:new URL(B.redirectUri).origin,lazyingart:config,lacPoints:{enabled:true}},{worker:false,profileOptions:s.options});await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{app.close(r);app.closeAllConnections()}));const base=`http://127.0.0.1:${app.address().port}`,headers={Cookie:'__Host-onlyideas='+token};
 assert.equal((await(await fetch(base+'/api/session',{headers})).json()).capabilities.lacPoints,false);assert.equal((await fetch(base+'/api/lac/balance',{headers})).status,503);
});

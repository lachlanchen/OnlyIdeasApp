import test from 'node:test';import assert from 'node:assert/strict';
import {createRewardSource} from '../server/reward-source.mjs';import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';import {AppError} from '../server/domain.mjs';
const secret='s'.repeat(64),subject='la_'+'1'.repeat(32),nonce='a'.repeat(48),headers={'x-lac-source-key':secret,'content-type':'application/json'};
const common={schema_version:1,issuer:B.issuer,subject,actor:B.clientId,nonce};
const event={policy_id:'lac-daily-activity',policy_version:1,event_id:'daily-1',occurred_at:1900000000,evidence_ref:'source-1',evidence_sha256:'a'.repeat(64)};
const request=(operation,data,more={})=>({operation,method:'POST',headers,body:Buffer.from(JSON.stringify(data)),...more});
test('source transport authenticates its distinct key, exact request and original subject before reading',async()=>{
 const calls=[],source=createRewardSource({secret,now:()=>1900000000000,evidence:{read:async q=>{calls.push(q);return{record:{event_id:'daily-1'}}}}});
 const q={...common,evidence_ref:'source-1'},r=await source.handle(request('evidence',q));
 assert.deepEqual(r,{schema_version:1,actor:B.clientId,nonce,as_of:1900000000,evidence:{event_id:'daily-1'}});assert.equal(calls[0].subject,subject);
 for(const h of [{...headers,'x-lac-source-key':'x'.repeat(64)},{...headers,origin:'https://agent.onlyideas.art'},{...headers,cookie:'session=x'},{...headers,authorization:'Bearer owner'}])await assert.rejects(source.handle(request('evidence',q,{headers:h})),{status:401});
 for(const body of [{...q,actor:'bunko-server'},{...q,extra:true},{...q,schema_version:true},{...q,nonce:'short'}])await assert.rejects(source.handle(request('evidence',body)),{status:400});
 await assert.rejects(source.handle(request('evidence',q,{method:'GET'})),{status:405});
 await assert.rejects(source.handle(request('evidence',q,{body:Buffer.from(JSON.stringify(q).replace('"schema_version":1','"schema_version":1,"schema_version":1'))})),{status:400});
 assert.equal(calls.length,1);
});
test('eligibility forwards exact immutable event and rejects client amounts or altered policy lineage',async()=>{
 let calls=0;const source=createRewardSource({secret,evidence:{eligible:async q=>{calls++;assert.deepEqual(q.event,event);return true}}}),q={...common,policy_id:event.policy_id,policy_version:1,phase:'award',event};
 assert.equal((await source.handle(request('eligibility',q))).eligible,true);
 for(const invalid of [{...q,event:{...event,amount:5}},{...q,event:{...event,policy_version:2}},{...q,event:{...event,occurred_at:true}},{...q,phase:'reverse'},{...q,policy_version:1.5}])await assert.rejects(source.handle(request('eligibility',invalid)),{status:400});
 assert.equal(calls,1);
});
test('missing or withdrawn evidence is null; an unknown authorization outage is unavailable, never eligible',async()=>{
 let fail=new AppError('gone',404);const source=createRewardSource({secret,evidence:{read:async()=>{throw fail},eligible:async()=>{throw fail}}});
 const q={...common,evidence_ref:'source-1'};assert.equal((await source.handle(request('evidence',q))).evidence,null);
 fail=Error('private upstream response');await assert.rejects(source.handle(request('evidence',q)),e=>e.status===503&&!e.message.includes('private'));
 await assert.rejects(source.handle(request('eligibility',{...common,policy_id:event.policy_id,policy_version:1,phase:'intake',event})),{status:503});
});

/** Opt-in interoperability check: actual Coin client, disposable local API only. */
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Store} from '../server/store.mjs';
import {createRewardEvidence,canonicalEvidence} from '../server/reward-evidence.mjs';
import {PROFILE_BINDING as B} from '../server/lazyingart-profile.mjs';
import {hash} from '../server/domain.mjs';

const {createApp}=await import(process.env.ONLYIDEAS_SOURCE_CANDIDATE_APP||'../server/app.mjs');
const coin=resolve(process.argv[2]||'../LazyingArtCoin');
const python=process.env.COIN_TEST_PYTHON||join(coin,'.venv/bin/python');
const dir=mkdtempSync(join(tmpdir(),'oi-coin-final-')),store=new Store(dir);
const subject='la_'+'1'.repeat(32),secret=randomBytes(32).toString('hex'),secretFile=join(dir,'source.secret');
writeFileSync(secretFile,secret,{mode:0o600});
let clock=Date.now()-86400_000;
const evidence=createRewardEvidence(store,{now:()=>clock,authorize:async()=>({...B,subject})});
const event=await evidence.checkIn({id:'synthetic-reader'});
const decision={contract:'app-lac-source-final-v1',decision_id:'final_'+'a'.repeat(32),receipt_id:'synthetic-coin-receipt',issuer:B.issuer,subject,actor:B.clientId,event,outcome:'expired_pending',awarded_points:'0',finalized_at:Math.floor(Date.now()/1000)};
evidence.bindIntake({issuer:B.issuer,subject,actor:B.clientId,event,receipt_id:decision.receipt_id});
evidence.remove('synthetic-reader');
const app=createApp(store,{origin:'https://agent.onlyideas.art',rewardSource:{enabled:true,secretFile}},{worker:false});
try{
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const code=String.raw`
import sys,json,http.client
sys.path.insert(0,sys.argv[1])
from app.points_source import AuthenticatedSource,SourceConfiguration,SourceUnavailable
from app.points_store import EvidenceContext,digest
x=json.load(sys.stdin)
payloads=[]
def transport(path,payload):
    assert path == '/api/lac/source/v1/final'
    payloads.append(json.loads(payload))
    connection=http.client.HTTPConnection('127.0.0.1',x['port'],timeout=5)
    try:
        connection.request('POST',path,body=payload,headers={'Host':'agent.onlyideas.art','Content-Type':'application/json','X-Lac-Source-Key':x['secret']})
        response=connection.getresponse(); body=response.read()
        assert response.status==200 and response.getheader('Cache-Control')=='no-store'
        assert response.getheader('Access-Control-Allow-Origin') is None
        if len(payloads)==1: raise ValueError('synthetic lost ACK')
        return body
    finally: connection.close()
context=EvidenceContext(x['decision']['issuer'],x['decision']['subject'],x['decision']['actor'])
source=AuthenticatedSource(SourceConfiguration(context.actor,context.issuer,'https://agent.onlyideas.art',x['secret']),transport=transport)
try:
    source.deliver_final(context,x['decision'])
    raise AssertionError('expected first ACK loss')
except SourceUnavailable: pass
assert source.deliver_final(context,x['decision']) == digest(x['decision'])
assert payloads[0]['decision']==payloads[1]['decision']
assert payloads[0]['nonce']!=payloads[1]['nonce']
print(json.dumps({'actualCoinClient':True,'lostAckRetried':True,'freshNonce':True,'digestMatched':True,'coinDatabaseOpened':False,'productionNetworkUsed':False}))
`;
 const child=spawn(python,['-c',code,coin],{stdio:['pipe','pipe','pipe']});
 const stdout=[],stderr=[];child.stdout.on('data',x=>stdout.push(x));child.stderr.on('data',x=>stderr.push(x));
 child.stdin.end(JSON.stringify({port:app.address().port,secret,decision}));
 const exit=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve)});
 if(exit!==0)throw Error('Coin fixture failed: '+Buffer.concat(stderr).toString().slice(-1500));
 const report=JSON.parse(Buffer.concat(stdout).toString());
 const final=store.db.prepare('SELECT * FROM lac_source_finals').all();
 assert.equal(final.length,1);assert.equal(final[0].digest,hash(canonicalEvidence(decision)));
 assert.equal(store.db.prepare('SELECT count(*) n FROM credit_ledger').get().n,0);
 report.oneDurableAdoption=true;report.appCreditsUnchanged=true;
 report.coinCommit=execFileSync('git',['-C',coin,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 report.coinSourceSha256=hash(readFileSync(join(coin,'app/points_source.py')));
 console.log(JSON.stringify(report,null,2));
}finally{
 await new Promise(r=>{app.close(r);app.closeAllConnections()});store.close();rmSync(dir,{recursive:true,force:true});
}

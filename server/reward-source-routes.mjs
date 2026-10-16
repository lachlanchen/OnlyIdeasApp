/** OnlyIdeas-owned Coin evidence reads. No check-in, award or maintenance route. */
import {openSync,closeSync,fstatSync,readFileSync,constants} from 'node:fs';
import {resolve,isAbsolute} from 'node:path';
import {AppError,requireValue} from './domain.mjs';
import {PROFILE_BINDING as B} from './lazyingart-profile.mjs';
import {createRewardEvidence} from './reward-evidence.mjs';
import {createRewardSource} from './reward-source.mjs';

export function readSourceSecret(file){
 requireValue(typeof file==='string'&&isAbsolute(file),'Source credential unavailable.',503);
 let fd;
 try{
  fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);const stat=fstatSync(fd);
  const dir=process.env.CREDENTIALS_DIRECTORY;
  const managed=dir?.startsWith('/run/credentials/')&&resolve(file)===resolve(dir,'reward-source.secret');
  requireValue(stat.isFile()&&stat.size<=256&&(stat.uid===process.getuid()||stat.uid===0)&&!(stat.mode&(managed?0o027:0o077)),'Source credential unavailable.',503);
  const secret=readFileSync(fd,'utf8').trim();requireValue(/^[A-Za-z0-9_-]{32,128}$/.test(secret),'Source credential unavailable.',503);return secret;
 }catch{throw new AppError('Source credential unavailable.',503)}finally{if(fd!==undefined)closeSync(fd)}
}
export function createRewardSourceRoutes(store,config,{authorization,now=Date.now,deadlineMs=4000}={}){
 const enabled=config.rewardSource?.enabled===true;
 const pathPrefix='/api/lac/source/',paths=new Map(['evidence','eligibility'].map(x=>[pathPrefix+'v1/'+x,x]));
 let source,proofReady=false,active=0,windowStart=0,requests=0;
 if(enabled){
  requireValue(config.origin===new URL(B.redirectUri).origin,'Reward source requires its registered origin.',503);
  const secret=readSourceSecret(config.rewardSource.secretFile);
  proofReady=authorization?.qualified===true;
  if(proofReady)requireValue(authorization.binding&&Object.keys(authorization.binding).sort().join('|')===Object.keys(B).sort().join('|')&&Object.entries(B).every(([k,v])=>authorization.binding[k]===v)&&typeof authorization.prove==='function','Reward authorization binding mismatch.',503);
  const evidence=createRewardEvidence(store,{now,authorize:async(owner,scope,options)=>{
   requireValue(proofReady,'Reward consent is not qualified.',503);
   const proof=await authorization.prove(owner,scope,options);
   requireValue(proof?.scope===scope,'Reward consent is required.',403);
   return proof;
  }});
  source=createRewardSource({secret,evidence,now});
 }
 async function route(req,res){
  const parsed=new URL(req.url,config.origin||'http://127.0.0.1:4182');
  if(!parsed.pathname.startsWith(pathPrefix))return false;
  requireValue(enabled,'Reward source is not available.',503);
  requireValue(req.url===parsed.pathname&&paths.has(req.url),'Not found.',404);
  requireValue(req.headers.host===new URL(config.origin).host,'Not found.',404);
  requireValue(source.authorized(req.headers),'Source authorization required.',401);
  requireValue(req.method==='POST','Method not allowed.',405);
  requireValue(req.headers['content-type']==='application/json','Invalid source request.');
  if(now()-windowStart>=60000){windowStart=now();requests=0}
  requireValue(++requests<=120,'Source request limit reached.',429);
  requireValue(active<4,'Source temporarily unavailable.',503);
  if(req.headers['content-length'])requireValue(/^\d+$/.test(req.headers['content-length'])&&Number(req.headers['content-length'])<=8192,'Source request too large.',413);
  active++;let timer;const controller=new AbortController();
  const work=(async()=>{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;requireValue(size<=8192,'Source request too large.',413);chunks.push(chunk)}return source.handle({operation:paths.get(req.url),method:req.method,headers:req.headers,body:Buffer.concat(chunks),signal:controller.signal})})();
  void work.finally(()=>{active--}).catch(()=>{});
  try{
   const value=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new AppError('Source temporarily unavailable.',503))},deadlineMs);timer.unref()})]);
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));return true;
  }finally{clearTimeout(timer);if(controller.signal.aborted){if(!res.headersSent)res.setHeader('Connection','close');res.once('finish',()=>req.destroy())}req.resume()}
 }
 return {enabled,proofReady,route};
}

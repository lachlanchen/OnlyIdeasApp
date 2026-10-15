import {agintiResearch} from './aginti-research.mjs';
import {codexResearch} from './codex-research.mjs';
import {readFile,stat} from 'node:fs/promises';
import {join,isAbsolute} from 'node:path';
import {hash} from '../server/domain.mjs';
import {doiIn} from '../server/research-ranking.mjs';
export const researchEnabled=config=>!!(config.aginti?.enabled||config.codex?.enabled);
const sourceURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}};
export async function cachedResearchPapers(query,config){
 // Verified public metadata only; reading a previous success must not launch a
 // model, consume its research allowance, or reuse private conversation data.
 const doi=doiIn(query);if(!doi)return [];
 const day=new Date().toISOString().slice(0,10),papers=[];
 for(const name of ['codex','aginti']){
  const c=config[name];if(!c?.enabled||!c.stateDir||!isAbsolute(c.stateDir))continue;
  try{
   const path=join(c.stateDir,'search-'+hash(doi)+'.json');if((await stat(path)).size>128000)continue;
   const saved=JSON.parse(await readFile(path,'utf8'));
   if(saved.day===day&&Array.isArray(saved.papers))papers.push(...saved.papers.slice(0,4).filter(p=>p&&doiIn(p.doi)===doi).map(p=>({...p,pdfUrl:sourceURL(p.pdfUrl),downloadSources:Array.isArray(p.downloadSources)?p.downloadSources.map(sourceURL).filter(Boolean).slice(0,4):[]})));
  }catch{/* A missing/expired cache preserves the ordinary retrieval path. */}
 }
 return papers;
}
export async function researchPapers(query,config,deps={}){
 // Public bibliographic metadata only. Prefer the quota-gated Codex helper;
 // AgInTi independently recovers unavailable/empty research results. Planning,
 // conversion and translation retain their existing model/durable pipelines.
 for(const [name,run] of [['codex',deps.codex||codexResearch],['aginti',deps.aginti||agintiResearch]]){
  if(!config[name]?.enabled)continue;
  const remaining=(config.researchDeadline||Date.now()+210000)-Date.now();if(remaining<15000)break;
  try{const papers=await run(query,{...config,[name]:{...config[name],timeoutMs:Math.min(config[name].timeoutMs||150000,remaining)}});if(papers.length)return papers;}catch{/* Continue to the independent backend. */}
 }
 return [];
}

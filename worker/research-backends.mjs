import {agintiResearch} from './aginti-research.mjs';
import {codexResearch} from './codex-research.mjs';
export const researchEnabled=config=>!!(config.aginti?.enabled||config.codex?.enabled);
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

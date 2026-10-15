import {agintiResearch} from './aginti-research.mjs';
import {codexResearch} from './codex-research.mjs';
export const researchEnabled=config=>!!(config.aginti?.enabled||config.codex?.enabled);
export async function researchPapers(query,config,deps={}){
 // Public bibliographic metadata only. Cheap AgInTi precedes the quota-gated
 // Codex helper; conversion/translation remain in the existing durable queue.
 for(const [name,run] of [['aginti',deps.aginti||agintiResearch],['codex',deps.codex||codexResearch]]){
  if(!config[name]?.enabled)continue;
  const remaining=(config.researchDeadline||Date.now()+210000)-Date.now();if(remaining<15000)break;
  try{const papers=await run(query,{...config,[name]:{...config[name],timeoutMs:Math.min(config[name].timeoutMs||150000,remaining)}});if(papers.length)return papers;}catch{/* Continue to the independent backend. */}
 }
 return [];
}

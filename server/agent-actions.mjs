import {hash,languages,requireValue} from './domain.mjs';
import {canReusePaper} from './import-reuse.mjs';
import {paperMetadata} from './paper-metadata.mjs';
import {requestArtifact,visibleArtifacts} from './artifacts.mjs';
import {paperSegments} from './translation-pieces.mjs';

// Plans contain references to observed cards, never model-supplied URLs or text.
// Persist each step before running it. Existing import/artifact/reaction stores
// provide idempotency if the process stops between the operation and its receipt.
export function createAgentActions(store,config,{enqueue,social}) {
 const db=store.db;
 db.exec('CREATE TABLE IF NOT EXISTS agent_runs(id TEXT PRIMARY KEY,chat TEXT NOT NULL,owner TEXT NOT NULL,body TEXT NOT NULL)');
 const put=run=>db.prepare('INSERT OR REPLACE INTO agent_runs VALUES(?,?,?,?)').run(run.id,run.chat,run.owner,JSON.stringify(run));
 function start(task,data,plans,cards){
  if(db.prepare('SELECT 1 FROM agent_runs WHERE id=?').get(task.id))return;
  requireValue(data.agentActions===true,'Choose an action on the paper card, or update the app to run actions from chat.');
  requireValue(Array.isArray(plans)&&plans.length>0&&plans.length<=3,'Ask for up to three reading actions at a time.');
  const steps=plans.map((a,i)=>{
   requireValue(['import','digest','translation','save','like'].includes(a.kind),'Choose a supported reading action.');
   const card=cards.find(p=>[p.id,p.paperId,p.source,p.pdfUrl,p.workerRef].filter(Boolean).includes(a.target));
   requireValue(card,'Choose a paper from the conversation or your library.');
   requireValue(!['digest','translation'].includes(a.kind)||Object.hasOwn(languages,a.language||data.language),'Choose a supported reading language.');
   const paragraph=a.paragraph==null?null:Number(a.paragraph),sentence=a.sentence==null?null:Number(a.sentence);
   requireValue(paragraph===null||Number.isInteger(paragraph)&&paragraph>=1&&paragraph<=10000,'Choose a paragraph number in this paper.');
   requireValue(sentence===null||paragraph!==null&&Number.isInteger(sentence)&&sentence>=1&&sentence<=1000,'Choose a sentence within a paragraph.');
   requireValue(a.kind==='translation'||paragraph===null&&sentence===null,'Passage numbers apply to translation.');
   return {id:task.id+'-'+i,kind:a.kind,card,language:a.language||data.language,paragraph,sentence,state:'queued',message:'Waiting to start'};
  });
  put({id:task.id,chat:task.chat,owner:task.owner,sharing:data.sharing==='shared'?'shared':'private',steps});
 }
 function advance(run){
  if(!store.active(run.owner))return;
  for(const step of run.steps){
   if(['completed','needs_input'].includes(step.state))continue;
   if(step.state==='failed'&&(!step.jobId||store.job(step.jobId)?.state==='failed'))continue;
   try{
    store.requireActive(run.owner);const user={id:run.owner};
    let paper=step.paperId?store.paper(step.paperId):step.card.paperId?store.paper(step.card.paperId):null;
    if(step.card.paperId||step.paperId)requireValue(canReusePaper(store,paper,run.owner),'Paper not found.',404);
    if(step.kind==='save'||step.kind==='like'){
     social.update(paper?.id||'r-'+step.card.id,user,{[step.kind==='save'?'saved':'liked']:true});
     step.paperId=paper?.id;step.state='completed';step.message=step.kind==='save'?'Saved to your reading list.':'Added to your liked papers.';continue;
    }
    if(!paper){
     if(!step.importJobId){
      // Private costs still need the existing explicit credit confirmation.
      if(run.sharing!=='shared'){step.state='needs_input';step.message='Choose Fetch & read on the paper card to confirm the private import cost.';continue;}
      const source=step.card.pdfUrl||step.card.source;requireValue(source,'Upload your copy to continue.');
      const job=enqueue(user,{kind:'import',sharing:'shared',creditLimit:0,url:source,sourcePage:step.card.source,downloadSources:step.card.downloadSources||[],discoveryId:step.card.id,metadata:{...paperMetadata(step.card),title:step.card.title,authors:step.card.authors||'',language:'en',license:'private',category:'Research'},dedupe:'import:'+hash(source)});
      step.importJobId=job.id;step.state='running';put(run);
     }
     const job=store.job(step.importJobId);requireValue(job,'The paper request is no longer available.');
     step.jobId=job.id;step.message=job.message;
     if(job.state==='failed'){step.state='failed';continue;}
     if(job.state!=='completed'){step.state='running';continue;}
     paper=store.paper(job.paperId);requireValue(canReusePaper(store,paper,run.owner),'Paper not found.',404);step.paperId=paper.id;
    }
    step.paperId=paper.id;
    if(step.kind==='import'){step.state='completed';step.message='Paper ready in your library.';continue;}
    if(!step.artifactJobId){
     requireValue(config.model?.url,'The reading assistant is not connected yet.',503);
     let segmentId=null;
     if(step.paragraph){const paragraphs=paperSegments(paper.mmd,paper.language).filter(p=>p.display.length>=30&&p.translatable),p=paragraphs[step.paragraph-1];requireValue(p,'Choose a paragraph number in this paper.');segmentId=p.id;if(step.sentence){const s=p.sentences.filter(s=>s.display)[step.sentence-1];requireValue(s,'Choose a sentence within a paragraph.');segmentId=s.id;}}
     const job=requestArtifact(store,config,user,paper,{kind:step.kind,language:step.language,sectionId:null,segmentId});
     step.artifactJobId=job.id;step.state='running';put(run);
    }
    const job=store.job(step.artifactJobId);requireValue(job,'The reading request is no longer available.');
    step.jobId=job.id;step.state=job.state;step.message=job.message;
    if(job.state==='completed'){const artifact=visibleArtifacts(store,paper,user).find(a=>a.id===job.artifactId);requireValue(artifact,'This saved result is no longer available.');step.artifactId=artifact.id;step.message='Saved result ready.';}
   }catch(error){step.state='failed';step.message=String(error.message).slice(0,500);}
   finally{put(run);}
  }
 }
 function tick(){for(const row of db.prepare('SELECT body FROM agent_runs').all()){const run=JSON.parse(row.body);if(run.steps.some(s=>!['completed','failed','needs_input'].includes(s.state)||s.state==='failed'&&s.jobId&&store.job(s.jobId)?.state!=='failed'))advance(run);}}
 return {start,tick,
  remove:chat=>db.prepare('DELETE FROM agent_runs WHERE chat=?').run(chat),
  view(id,owner){const row=db.prepare('SELECT body FROM agent_runs WHERE id=? AND owner=?').get(id,owner);if(!row)return [];
   const run=JSON.parse(row.body);return run.steps.map(s=>{
    const paper=s.paperId?store.paper(s.paperId):null,allowed=paper&&canReusePaper(store,paper,owner);
    if(s.paperId&&!allowed)return {id:s.id,kind:s.kind,state:'failed',message:'Paper not found.'};
    const job=s.jobId?store.job(s.jobId):null;
    return {id:s.id,kind:s.kind,state:s.state,message:s.message,title:paper?.title||s.card.title,jobId:s.jobId,paperId:allowed?paper.id:undefined,artifactId:allowed?s.artifactId:undefined,source:s.card.source,sharing:run.sharing,canUpload:s.state==='failed'&&job?.kind==='import'&&!job.submittedAt&&!job.pdfId};
   });
  }
 };
}

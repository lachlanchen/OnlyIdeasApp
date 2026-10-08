import {canReusePaper,reusablePaper,sourceKey} from './import-reuse.mjs';
import {paperMetadata} from './paper-metadata.mjs';
const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLocaleLowerCase();
const filler=new Set('a an the find search show me please papers paper research articles article about on for of in and or download fetch read open access can you i want to library online this that my own by written titled called it'.split(' '));
export function researchTerms(query){return normalize(query).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>1&&!filler.has(w));}
export function matchesFilters(p,o={}){return (!o.discipline||p.disciplineId===o.discipline)&&(!o.subdiscipline||p.subdisciplineId===o.subdiscipline)&&(!o.from||p.year&&p.year>=o.from)&&(!o.to||p.year&&p.year<=o.to)&&(!o.journal||normalize(p.journal).includes(normalize(o.journal)))&&(o.source!=='arxiv'||/^https:\/\/(?:export\.)?arxiv.org\//.test(p.source||''));}
export function matchLibrary(papers,query){const terms=researchTerms(query);if(!terms.length)return [];return papers.map(p=>{const text=normalize([p.title,p.authors,p.doi,p.source,p.discipline,p.subdiscipline,p.year].join(' ')),score=terms.filter(w=>text.includes(w)).length;return{p,score}}).filter(x=>x.score>=Math.max(1,Math.ceil(terms.length*.6))).sort((a,b)=>b.score-a.score).slice(0,8).map(x=>x.p);}
export function libraryPapers(store,user){
 const seen=new Set(),owner=user?.id||'';
 return store.papers(owner).filter(p=>canReusePaper(store,p,owner)).map(p=>{
  const key=p.doi&&sourceKey('https://doi.org/'+p.doi);
  // Collapse only verified public aliases. Keep private records and explicit
  // preprint versions addressable; existing bookmarks, notes and IDs are intact.
  if(p.visibility==='public'&&key&&!/v\d+(?:\.pdf)?$/.test(p.source)&&store.db.prepare('SELECT 1 FROM paper_import_keys WHERE paper=? AND key=?').get(p.id,key)){
   const canonical=reusablePaper(store,owner,{url:'https://doi.org/'+p.doi});
   if(canonical?.visibility==='public')return canonical;
  }
  return p;
 }).filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true});
}
export function libraryCards(store,user){return libraryPapers(store,user).slice(0,200).map(p=>({...paperMetadata(p),id:p.id,ref:p.id,paperId:p.id,title:p.title,authors:p.authors||'',source:p.source||'',pdfUrl:'',summary:'',index:'library'}));}

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {researchTerms} from './library-search.mjs';
import {doiIn} from './research-ranking.mjs';
const exec=promisify(execFile);
const words=s=>researchTerms(s).filter(w=>w.length>=3);
export function checkPaperIdentity(text,expected){
 const header=String(text||'').replace(/([\p{L}])-\s*\n\s*([\p{L}])/gu,'$1$2').split(/\b(?:references|bibliography)\b/i)[0].slice(0,6500);
 const wanted=words(expected.title),lines=header.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,70);
 const generic=!wanted.length||/^(?:arxiv\s|my paper$|research paper$)/i.test(expected.title||'');
 let best={score:0,title:''};
 for(let i=0;i<lines.length;i++)for(let count=1;count<=4;count++){
  const title=lines.slice(i,i+count).join(' '),candidate=words(title),set=new Set(candidate),hits=wanted.filter(w=>set.has(w)).length;
  const recall=hits/Math.max(1,wanted.length),precision=hits/Math.max(1,candidate.length),score=recall*(.65+.35*Math.min(1,precision));
  if(score>best.score)best={score,title:title.slice(0,400)};
 }
 const doi=doiIn(expected.doi||expected.source),found=[...header.slice(0,2800).matchAll(/\b10\.\d{4,9}\/[^\s<>"?#]+/gi)].map(m=>doiIn(m[0]));
 const authors=words(expected.authors),authorMatch=authors.some(w=>w.length>3&&words(header).includes(w));
 if(!generic&&wanted.length>=3&&best.score>=.78)return {state:'matched',method:'title',title:best.title,authorMatch,doiMatch:!!doi&&found.includes(doi)};
 if(doi&&found.includes(doi)&&(generic||best.score>=.45))return {state:'matched',method:'doi',title:best.title,authorMatch,doiMatch:true};
 if(header.trim().length<120||generic||best.score>=.35)return {state:'uncertain',method:'text-check',title:best.title,authorMatch};
 return {state:'mismatch',method:'text-check',title:best.title,authorMatch};
}
export async function inspectPaperIdentity(file,expected){
 try{const {stdout}=await exec('pdftotext',['-f','1','-l','2','-layout','-enc','UTF-8',file,'-'],{timeout:10000,maxBuffer:250000});return checkPaperIdentity(stdout,expected);}
 catch{return {state:'uncertain',method:'text-unavailable',title:''};}
}

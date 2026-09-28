import {researchTerms} from './library-search.mjs';
const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase();
export const doiIn=text=>String(text||'').match(/\b10\.\d{4,9}\/[^\s<>"?#]+/i)?.[0]?.replace(/[.,;]+$/,'').toLowerCase()||'';
function similar(a,b){
 if(a===b||a.length>=5&&b.length>=5&&(a.startsWith(b)||b.startsWith(a)))return true;
 if(Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;
 let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++edits>1)return false;if(a.length<=b.length)j++;if(a.length>=b.length)i++;}return edits+(a.length-i)+(b.length-j)<=1;
}
export function researchScore(p,q){
 const doi=doiIn(q);if(doi&&doiIn(p.doi||p.source)===doi)return 100;
 const terms=researchTerms(q);if(!terms.length)return 0;
 const title=researchTerms(p.title),authors=researchTerms(p.authors),extra=researchTerms([p.summary,p.journal,p.discipline,p.subdiscipline].join(' '));
 const points=terms.map(t=>title.some(w=>similar(t,w))?4:authors.some(w=>similar(t,w))?3:extra.some(w=>similar(t,w))?1:0);
 const coverage=points.filter(Boolean).length/terms.length;
 return points.reduce((a,b)=>a+b,0)/terms.length+coverage*3+(normalize(p.title).includes(normalize(q).trim())?2:0);
}
export function rankResearch(papers,q){return papers.map((p,i)=>({p,i,score:researchScore(p,q)})).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.p);}

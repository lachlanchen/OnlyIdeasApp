import {hash} from '../server/domain.mjs';
import {doiIn} from '../server/research-ranking.mjs';
import {downloadPublic} from '../server/network.mjs';
import {queryCrossref} from '../server/crossref.mjs';
import {searchOptions} from '../server/research-indexes.mjs';
function publicURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}catch{return ''}}
export async function verifyResearchCandidates(data,backend){
 const papers=[];
  for(const p of (data.papers||[]).slice(0,4)){
   const doi=doiIn(p.doi);if(!doi)continue;
   try{let verified;
    try{verified=(await queryCrossref(searchOptions({q:doi}))).papers.find(p=>p.doi.toLowerCase()===doi.toLowerCase());}catch{}
    if(!verified){try{const data=JSON.parse((await downloadPublic('https://api.datacite.org/dois/'+encodeURIComponent(doi),{maxBytes:2_000_000,timeout:12000})).toString()).data?.attributes;
      if(String(data?.doi).toLowerCase()===doi.toLowerCase()&&data.titles?.[0]?.title)verified={id:hash('https://doi.org/'+doi).slice(0,24),doi,title:data.titles[0].title,source:'https://doi.org/'+doi,sourcePage:publicURL(data.url),index:'datacite'};
    }catch{}}
    if(!verified)continue;
    const pdf=publicURL(p.pdfUrl);papers.push({...verified,...(pdf?{pdfUrl:pdf,downloadSources:[pdf],pdfNeedsVerification:true}:{}),discoveredBy:backend});
   }catch{/* An unverified model citation never becomes a paper card. */}
  }
 const unique=new Map();
 for(const paper of papers){const old=unique.get(paper.doi);if(!old){unique.set(paper.doi,paper);continue;}const urls=[...new Set([old.pdfUrl,paper.pdfUrl,...(old.downloadSources||[]),...(paper.downloadSources||[])].filter(Boolean))];unique.set(paper.doi,{...old,...(!old.pdfUrl&&paper.pdfUrl?{pdfUrl:paper.pdfUrl,pdfNeedsVerification:true}:{}),downloadSources:urls});}
 return [...unique.values()];
}

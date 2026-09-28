import {hash} from './domain.mjs';
import {downloadPublic} from './network.mjs';
import {doiIn} from './research-ranking.mjs';
import {researchTerms} from './library-search.mjs';
const plain=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export function parseCrossref(data){
 const items=data.message?.items||(data.message?.DOI?[data.message]:[]);
 return items.flatMap(p=>{const doi=doiIn(p.DOI);if(!doi||!p.title?.[0])return [];
  const source='https://doi.org/'+doi,parts=p.published?.['date-parts']?.[0]||p['published-online']?.['date-parts']?.[0]||[];
  // Crossref links describe file formats, not access rights. Resolve the source
  // through the regular open-download path before claiming a readable PDF.
  return [{id:hash(source).slice(0,24),title:plain(p.title[0]).slice(0,300),authors:(p.author||[]).slice(0,12).map(a=>plain([a.given,a.family].filter(Boolean).join(' ')||a.name)).join(', ').slice(0,500),summary:plain(p.abstract).slice(0,1800),source,pdfUrl:'',doi,year:String(parts[0]||''),publicationDate:parts.map((v,i)=>String(v).padStart(i?2:4,'0')).join('-'),journal:plain(p['container-title']?.[0]),index:'crossref',type:p.type||'',metadataSource:source}];
 });
}
export async function queryCrossref(o,download=downloadPublic){
 const doi=doiIn(o.q),url=new URL('https://api.crossref.org/works'+(doi?'/'+encodeURIComponent(doi):''));
 if(!doi){const filters=[];if(o.from)filters.push('from-pub-date:'+o.from+'-01-01');if(o.to)filters.push('until-pub-date:'+o.to+'-12-31');
  url.search=new URLSearchParams({'query.bibliographic':researchTerms(o.q).join(' ')||o.q,rows:'12',offset:String((o.page-1)*12),...(filters.length?{filter:filters.join(',')}:{}),...(o.journal?{'query.container-title':o.journal}:{}),...(o.sort==='latest'?{sort:'published',order:'desc'}:{})});
 }
 const data=JSON.parse((await download(url.href,{timeout:12000,maxBytes:3_500_000})).toString());
 return {papers:parseCrossref(data),hasMore:!doi&&o.page*12<(data.message?.['total-results']||0)};
}

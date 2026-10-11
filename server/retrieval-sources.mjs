import {downloadPublic} from './network.mjs';
import {retrievalURL} from './browser-retrieval.mjs';
export async function repositoryCandidates(task,{download=downloadPublic}={}){
 const doi=String(task.metadata?.doi||'').toLowerCase(),urls=[];
 async function json(url){return JSON.parse((await download(url,{maxBytes:2_000_000,timeout:10_000})).toString());}
 try{
  const zenodo=doi.match(/^10\.5281\/zenodo\.(\d+)$/);
  if(zenodo){const record=await json('https://zenodo.org/api/records/'+zenodo[1]);if(String(record.doi||record.metadata?.doi).toLowerCase()===doi&&record.metadata?.access_right==='open')for(const f of record.files||[])if(/\.pdf$/i.test(f.key))urls.push(f.links?.self);}
  const figshare=doi.match(/^10\.36227\/techrxiv\.(\d+)(?:\.v\d+)?$/);
  if(figshare){const record=await json('https://api.figshare.com/v2/articles/'+figshare[1]);if(String(record.doi).toLowerCase().replace(/\.v\d+$/,'')===doi.replace(/\.v\d+$/,''))for(const f of record.files||[])if(/\.pdf$/i.test(f.name))urls.push(f.download_url);}
 }catch{/* Repository API can be unavailable; browser still has the original source. */}
 if(doi){try{const result=await json('https://www.ebi.ac.uk/europepmc/webservices/rest/search?'+new URLSearchParams({query:'DOI:"'+doi+'"',format:'json',pageSize:'3'}));
  for(const p of result.resultList?.result||[])if(String(p.doi).toLowerCase()===doi&&p.isOpenAccess==='Y'&&/^PMC\d+$/.test(p.pmcid||''))urls.push('https://pmc.ncbi.nlm.nih.gov/articles/'+p.pmcid+'/');
 }catch{}}
 if(doi){try{const result=await json('https://api.crossref.org/works/' +encodeURIComponent(doi));if(String(result.message?.DOI).toLowerCase()===doi)for(const link of result.message.link||[])if(link['content-type']==='application/pdf')urls.push(link.URL);}catch{}}
 for(const url of task.urls){const arxiv=url.match(/^https:\/\/arxiv.org\/(?:pdf|abs|html)\/([^?#]+)/);if(arxiv)urls.push('https://arxiv.org/html/'+arxiv[1].replace(/\.pdf$/,''));const pmc=url.match(/ncbi.nlm.nih.gov\/(?:pmc\/)?articles\/(?:PMC)?(\d+)/);if(pmc)urls.push('https://pmc.ncbi.nlm.nih.gov/articles/PMC'+pmc[1]+'/');}
 return [...new Set(urls.map(retrievalURL).filter(Boolean))].slice(0,8);
}

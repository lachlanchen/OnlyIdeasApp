import {downloadPublic} from './network.mjs';
import {citationPDFs} from './paper-download.mjs';
import {sourceKey} from './import-reuse.mjs';
const licenses=new Map([
 ['https://creativecommons.org/licenses/by/4.0/','CC-BY-4.0'],
 ['https://creativecommons.org/licenses/by-sa/4.0/','CC-BY-SA-4.0'],
 ['https://creativecommons.org/publicdomain/zero/1.0/','CC0-1.0']
]);
export function sourceLicense(html,page,pdf) {
 if(!citationPDFs(html,page).some(url=>sourceKey(url)===sourceKey(pdf)))return null;
 for(const [tag] of html.matchAll(/<(?:a|link)\b[^>]*>/gi)) {
  if(!/\brel\s*=\s*["'][^"']*\blicense\b/i.test(tag)&&!/title=["']Rights to this article["']/i.test(tag))continue;
  const href=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];if(!href)continue;
  let url;try{url=new URL(href,page);url.protocol='https:'}catch{continue}
  const license=licenses.get(url.href);if(license)return {license,licenseUrl:url.href,source:page,checked:new Date().toISOString(),verification:'indexed-source-license',changes:'PDF converted to reflowable Markdown; original figures and equations retained. AI translations are labeled separately.'};
 }
 return null;
}
export async function verifySourceLicense(job,{download=downloadPublic}={}) {
 if(job.sharing!=='shared'||!job.url||job.uploadSource)return null;
 const metadata=job.metadata?.metadataSource||'';
 const arxiv=metadata.match(/^https:\/\/arxiv\.org\/abs\/([\w./-]+)$/);
 const indexed=/^https:\/\/openalex\.org\/W\d+$/.test(metadata);
 const crossref=job.metadata?.index==='crossref'&&sourceKey(metadata)===sourceKey('https://doi.org/'+job.metadata?.doi);
 if(!arxiv&&!indexed&&!crossref)return null;
 const page=job.sourcePage||(arxiv?metadata:null);if(!page)return null;
 try{const result=await download(page,{maxBytes:2_000_000,timeout:12000,withMetadata:true});const html=Buffer.isBuffer(result)?result:result.bytes;return sourceLicense(html.toString(),Buffer.isBuffer(result)?page:result.url,job.downloadedFrom||job.url)}catch{return null}
}

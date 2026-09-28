// Bibliographic claims are display metadata, never publication permission.
const text = (v,n=200) => typeof v==='string' ? v.replace(/[\x00-\x1f]/g,' ').trim().slice(0,n) : '';
export function paperMetadata(value={}) {
  const p={};
  for(const k of ['discipline','subdiscipline','disciplineId','subdisciplineId','journal','journalId','doi','index','metadataSource','publicationDate','type']) {
    const v=text(value[k],k==='metadataSource'?2000:300); if(v)p[k]=v;
  }
  if(/^\d{4}$/.test(String(value.year||'')))p.year=String(value.year);
  return p;
}

// A direct arXiv link initially has only an identifier. Once its real transcript
// arrives, use its declared title so library searches can find the paper by name.
export function transcriptTitle(title,mmd='') {
  if(!/^arXiv\s+[\w./-]+$/i.test(String(title)))return title;
  const head=mmd.slice(0,6000),start=head.match(/\\title\s*\{/);let candidate='';
  if(start){let depth=1,i=start.index+start[0].length,begin=i;for(;i<head.length&&depth;i++){if(head[i-1]==='\\')continue;if(head[i]==='{')depth++;else if(head[i]==='}')depth--;}if(!depth)candidate=head.slice(begin,i-1);}
  if(!candidate)candidate=head.match(/^#\s+(.+)$/m)?.[1]||'';
  candidate=candidate.replace(/\\[a-zA-Z]+\*?/g,'').replace(/[{}]/g,'').replace(/\s+/g,' ').trim();
  return candidate.length>=8&&candidate.length<=300?candidate:title;
}

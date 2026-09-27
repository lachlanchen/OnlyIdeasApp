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

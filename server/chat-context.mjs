// Keep recent references intact without sending entire old answers/abstracts back
// to the model. The caller supplies only the owned conversation's messages.
export function compactChatHistory(messages,{maxCharacters=18000}={}) {
 const out=[];let budget=maxCharacters;
 for(let i=messages.length-1;i>=0&&out.length<16;i--){
  const m=messages[i],recent=i>=messages.length-4;
  const papers=(m.papers||[]).slice(0,8).map(p=>({...p,summary:recent?String(p.summary||'').slice(0,400):''}));
  const actions=(m.actions||[]).slice(0,8).map(({id,kind,state,paperId,artifactId,title})=>({id,kind,state,paperId,artifactId,title}));
  const fixed=JSON.stringify({role:m.role,papers,actions}).length;
  if(fixed+100>budget)break;
  const original=String(m.text||''),limit=Math.min(recent?4000:600,budget-fixed-80);
  const text=original.length>limit?original.slice(0,limit)+'\n[Earlier message abbreviated]':original;
  const next={role:m.role,text,papers,actions};budget-=JSON.stringify(next).length;out.unshift(next);
 }
 return out;
}

import {researchScore,doiIn} from '../server/research-ranking.mjs';
import {languages} from '../server/domain.mjs';
export function observedCards(task){
 const latest=[...(task.messages||[])].reverse().find(m=>m.papers?.length)?.papers||[];
 const actions=[...(task.messages||[])].reverse().find(m=>m.actions?.some(a=>a.paperId))?.actions||[];
 const recent=actions.flatMap(a=>(task.library||[]).filter(p=>p.paperId===a.paperId));
 const seen=new Set();return [...latest,...recent,...task.library||[]].filter(p=>{const key=p.paperId||p.source||p.id;if(seen.has(key))return false;seen.add(key);return true;});
}
export function readingIntent(text){
 const kinds=[];
 if(/\b(?:save|bookmark|favorite)\b|收藏|保存到收藏|お気に入り/i.test(text))kinds.push('save');
 if(/\b(?:like this|like it|like the (?:first|second|third|paper))\b|点赞|按讚/i.test(text))kinds.push('like');
 if(/\b(?:summari[sz]e|summary|digest|reading guide)\b|总结|總結|摘要|要約/i.test(text))kinds.push('digest');
 if(/\btranslat(?:e|ion)\b|翻译|翻譯|翻訳/i.test(text))kinds.push('translation');
 if(!kinds.some(k=>['digest','translation'].includes(k))&&/\b(?:fetch|download|convert|add (?:it|this|the|a|that|paper))\b|下载|下載|转换|轉換/i.test(text))kinds.unshift('import');
 return kinds.slice(0,3);
}
export function readingLanguage(text,fallback='en'){
 const names=[['zh-Hant',/traditional chinese|繁體|繁体/i],['zh-Hans',/chinese|中文|简体|簡體|汉语|漢語/i],['ja',/japanese|日本語|日语|日文/i],['en',/english|英语|英文/i],['ko',/korean|한국어|韩语/i],['fr',/french|français|法语/i],['es',/spanish|español|西班牙语/i],['de',/german|deutsch|德语/i],['ru',/russian|русский|俄语/i],['ar',/arabic|العربية|阿拉伯语/i],['vi',/vietnamese|tiếng việt|越南语/i]];
 return names.find(([,re])=>re.test(text))?.[0]||(Object.hasOwn(languages,fallback)?fallback:'en');
}
export function targetCard(task,cards=observedCards(task)){
 const text=task.text;
 const n=text.match(/\b(?:paper|result|item)\s*#?([1-8])\b/i)?.[1]||text.match(/第\s*([1-8])\s*(?:篇|个|個)/)?.[1];
 const ordinal=[/\bfirst\b(?!\s+(?:paragraph|sentence))|第一篇|第一个/i,/\bsecond\b(?!\s+(?:paragraph|sentence))|第二篇/i,/\bthird\b(?!\s+(?:paragraph|sentence))|第三篇/i,/\bfourth\b(?!\s+(?:paragraph|sentence))|第四篇/i].findIndex(re=>re.test(text));
 if(n||ordinal>=0){const recent=[...(task.messages||[])].reverse().find(m=>m.papers?.length)?.papers||cards;return recent[(n?Number(n):ordinal+1)-1];}
 const doi=doiIn(text);
 const exact=cards.find(p=>doi&&doiIn(p.doi||p.source)===doi||[p.id,p.paperId,p.source,p.pdfUrl].filter(Boolean).some(v=>text.includes(v)));if(exact)return exact;
 if(doi||/https:\/\/|\b\d{4}\.\d{4,5}\b/.test(text))return null;
 const ranked=cards.map(p=>({p,score:researchScore(p,text)})).sort((a,b)=>b.score-a.score);
 if(ranked[0]?.score>=3.5&&(!ranked[1]||ranked[0].score-ranked[1].score>=.5))return ranked[0].p;
 const previous=[...(task.messages||[])].reverse().find(m=>m.role==='assistant'&&(m.actions?.length||m.papers?.length));
 const ids=[...new Set(previous?.actions?.map(a=>a.paperId).filter(Boolean)||[])];
 const reference=/\b(?:it|this|that|current|above|paragraph|sentence)\b|这篇|這篇|这个|這個|それ/i.test(text)||/^(?:please\s+)?(?:summarize|save|download|fetch)[.!]?$/i.test(text.trim());
 if(!reference)return null;
 if(ids.length===1)return cards.find(p=>p.paperId===ids[0]);
 if(previous?.papers?.length===1)return previous.papers[0];
 return cards.length===1?cards[0]:null;
}
export function actionPlans(task,card,kinds=readingIntent(task.text)){
 const number=unit=>Number(task.text.match(new RegExp('\\b'+unit+'\\s+(\\d+)\\b','i'))?.[1]||0)||(['first','second','third','fourth'].findIndex(w=>new RegExp('\\b'+w+' '+unit+'\\b','i').test(task.text))+1)||null;
 const language=readingLanguage(task.text,task.language),paragraph=number('paragraph'),sentence=number('sentence');
 return kinds.map(kind=>({kind,target:card.paperId||card.id||card.source||card.pdfUrl,language,...(kind==='translation'?{paragraph,sentence}:{})}));
}

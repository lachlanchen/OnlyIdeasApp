import {researchScore,doiIn} from '../server/research-ranking.mjs';
import {languages} from '../server/domain.mjs';
import {researchTerms} from '../server/library-search.mjs';
export function observedCards(task){
 const latest=[...(task.messages||[])].reverse().find(m=>m.papers?.length)?.papers||[];
 const actions=[...(task.messages||[])].reverse().find(m=>m.actions?.some(a=>a.paperId))?.actions||[];
 const recent=actions.flatMap(a=>(task.library||[]).filter(p=>p.paperId===a.paperId));
 const seen=new Set();return [...(task.references||[]),...latest,...recent,...task.library||[]].filter(p=>{const key=p.paperId||p.source||p.id;if(seen.has(key))return false;seen.add(key);return true;});
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
export function surveyRequest(text) {
 return /\b(?:papers|studies|works|literature|research opportunities)\b|相关.{0,8}(?:论文|工作)|相關.{0,8}(?:論文|工作)|哪些工作|研究进展|研究進展/i.test(text)
  && /\b(?:summari[sz]e|summary|compare|review|opportunities)\b|总结|總結|综述|綜述|比较|比較|机会|機會/i.test(text);
}
export function hasNonLatinLetters(text) {
 // Publisher typography (hyphens, quotes, spaces and scientific symbols) is
 // not a foreign-language request. Check letters, not arbitrary Unicode bytes.
 return (String(text).match(/\p{L}/gu)||[]).some(letter=>!/\p{Script=Latin}/u.test(letter));
}
export function literalResearchQuery(text) {
 const normalized=String(text).normalize('NFKC').replace(/\p{Pd}/gu,'-').replace(/[“”]/g,'"').trim();
 const quoted=normalized.match(/"([^"\n]{8,300})"/u)?.[1];
 const request='(?:(?:can|could|would|will) you\\s+)?(?:please\\s+)?(?:help me\\s+)?(?:find|search for|download|fetch|open|read|locate|convert)\\s+';
 const prefix=new RegExp('^'+request+'(?:(?:the|this|a)\\s+)?(?:(?:paper|article)\\s+(?:(?:titled|called)\\s+)?)?','i');
 const suffix=new RegExp('(?:\\s*[,;:]\\s*|\\s+)'+request+'(?:(?:the|this|that)\\s+)?(?:paper|article|it)(?:\\s+for me)?[.!?]*$','i');
 const candidate=(quoted||normalized.replace(prefix,'').replace(suffix,'')).replace(/^[\s"']+|[\s"'.!?]+$/g,'');
 const wrapped=candidate!==normalized;
 const terms=researchTerms(candidate);
 if(terms.length<4||candidate.length>300||hasNonLatinLetters(candidate)||(!quoted&&/\b(?:why|how|compare|explain|recommend|opportunities)\b/i.test(candidate)))return '';
 // A stripped explicit request or a short standalone title is safe to look up
 // literally. Long unstructured dictation still needs interpretation.
 if(!quoted&&!wrapped&&normalized.split(/\s+/).length>12)return '';
 return terms.join(' ');
}
export function literalTitleScore(paper,query) {
 // A related title with many extra words is not the same work merely because
 // it contains every requested word. Compare coverage in both directions.
 return Math.min(researchScore(paper,query),researchScore({title:query},paper.title));
}
export function needsQueryPlanning(text) {
 // Search indexes expect concepts, not dictation filler or untranslated questions.
 return hasNonLatinLetters(text) || text.split(/\s+/).length > 12 || /\b(?:explain|why|how|compare|opportunities)\b/i.test(text);
}
export function normalizePlan(value) {
 if(!value||!['search','reply','explain','act'].includes(value.action))return null;
 const queries=[...new Set([...(Array.isArray(value.query)?value.query:[value.query]),...(Array.isArray(value.queries)?value.queries:[])].filter(q=>typeof q==='string'&&q.trim()).map(q=>q.trim().slice(0,250)))].slice(0,3);
 return {...value,query:queries[0]||'',queries,actions:Array.isArray(value.actions)?value.actions:[]};
}
export function readingLanguage(text,fallback='en'){
 const names=[['zh-Hant',/traditional chinese|繁體|繁体/i],['zh-Hans',/chinese|中文|简体|簡體|汉语|漢語/i],['ja',/japanese|日本語|日语|日文/i],['en',/english|英语|英文/i],['ko',/korean|한국어|韩语/i],['fr',/french|français|法语/i],['es',/spanish|español|西班牙语/i],['de',/german|deutsch|德语/i],['ru',/russian|русский|俄语/i],['ar',/arabic|العربية|阿拉伯语/i],['vi',/vietnamese|tiếng việt|越南语/i]];
 return names.find(([,re])=>re.test(text))?.[0]||(Object.hasOwn(languages,fallback)?fallback:'en');
}
export function targetCard(task,cards=observedCards(task)){
 const text=task.text;
 const n=text.match(/\b(?:paper|result|item)\s*#?([1-8])\b/i)?.[1]||text.match(/第\s*([1-8])\s*(?:篇|个|個)/)?.[1];
 const ordinal=[/\bfirst\b(?!\s+(?:paragraph|sentence))|第一篇|第一个/i,/\bsecond\b(?!\s+(?:paragraph|sentence))|第二篇/i,/\bthird\b(?!\s+(?:paragraph|sentence))|第三篇/i,/\bfourth\b(?!\s+(?:paragraph|sentence))|第四篇/i].findIndex(re=>re.test(text));
 if(n||ordinal>=0){const recent=[...(task.messages||[])].reverse().find(m=>m.papers?.length)?.papers||[];return recent[(n?Number(n):ordinal+1)-1]||null;}
 const doi=doiIn(text);
 const exact=cards.find(p=>doi&&doiIn(p.doi||p.source)===doi||[p.id,p.paperId,p.source,p.pdfUrl].filter(Boolean).some(v=>text.includes(v)));if(exact)return exact;
 if(doi||/https:\/\/|\b\d{4}\.\d{4,5}\b/.test(text))return null;
 if(task.references?.length===1)return cards.find(p=>p.paperId===task.references[0].paperId)||null;
 const title=literalResearchQuery(text),exactTitle=title?cards.filter(p=>researchTerms(p.title).join(' ')===title):[];
 if(exactTitle.length===1)return exactTitle[0];
 const ranked=cards.map(p=>({p,score:title?literalTitleScore(p,title):researchScore(p,text)})).sort((a,b)=>b.score-a.score);
 if(ranked[0]?.score>=(title?6:3.5)&&(!ranked[1]||ranked[0].score-ranked[1].score>=(title?1:.5)))return ranked[0].p;
 const followupWords=new Set('explain summarize summarise summary digest translate translation save bookmark favorite like first second third fourth paragraph sentence into english chinese japanese korean french spanish german arabic russian vietnamese traditional simplified how why what does work works mean means is are was were do did its their these those current above'.split(' '));
 const topic=researchTerms(text).filter(w=>!followupWords.has(w)&&!/^\d+$/.test(w));
 if(topic.length>=2||/[这這]个.+(?:论文|論文|研究)/.test(text))return null;
 const previous=[...(task.messages||[])].reverse().find(m=>m.role==='assistant'&&(m.actions?.length||m.papers?.length));
 const ids=[...new Set(previous?.actions?.map(a=>a.paperId).filter(Boolean)||[])];
 const reference=/\b(?:it|this|that|current|above|paragraph|sentence)\b|这篇|這篇|这个|這個|それ/i.test(text)||/^(?:please\s+)?(?:summarize|save|download|fetch)[.!]?$/i.test(text.trim());
 if(!reference)return null;
 if(ids.length===1)return cards.find(p=>p.paperId===ids[0]);
 if(previous?.papers?.length===1)return previous.papers[0];
 return null;
}
export function actionPlans(task,card,kinds=readingIntent(task.text)){
 const number=unit=>Number(task.text.match(new RegExp('\\b'+unit+'\\s+(\\d+)\\b','i'))?.[1]||0)||(['first','second','third','fourth'].findIndex(w=>new RegExp('\\b'+w+' '+unit+'\\b','i').test(task.text))+1)||null;
 const language=readingLanguage(task.text,task.language),paragraph=number('paragraph'),sentence=number('sentence');
 return kinds.map(kind=>({kind,target:card.paperId||card.id||card.source||card.pdfUrl,language,...(kind==='translation'?{paragraph,sentence}:{})}));
}

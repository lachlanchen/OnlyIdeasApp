import {recommendationOptions,recommendationTopics,recommendationJournals} from './recommendation-options.mjs';
import {requireValue,languages} from './domain.mjs';

const fields=['topics','journals','journalScope','interests','discipline','language','dailyEnabled','dailyTime','timezone','commentAlerts','likeAlerts'];
export function preferenceIntent(text='') {
 const s=text.trim();
 // Only a current, direct instruction may change preferences. Titles, quoted
 // messages, retrieved papers and earlier assistant text never authorize edits.
 if(/^(?:please\s+)?(?:show|list|what are|view)\s+(?:me\s+)?(?:my\s+)?(?:reading |research |recommendation )?(?:preferences|interests|topics|journals|settings|recommendations)\b/i.test(s))return 'show';
 if(/^(?:please\s+)?(?:reset|restore)\s+(?:my\s+)?(?:reading |research |recommendation )?(?:preferences|interests|topics|journals|defaults|recommendations)\b/i.test(s))return 'reset';
 if(/^(?:please\s+)?remind me\b/i.test(s))return 'edit';
 if(/^(?:please\s+)?(?:follow|unfollow)\s+/i.test(s))return 'edit';
 if(/^(?:please\s+)?(?:set|change|update|edit|add|remove|stop|only|use|turn|enable|disable)\b/i.test(s)&&/\b(?:my interests|my topics|my journals|reading preferences|recommendations?|journals?|topics?|reading language|daily reminder|comment alerts|like alerts)\b/i.test(s))return 'edit';
 if(/^(?:i(?:'m| am) interested in|my (?:research )?interests are)\s+/i.test(s))return 'edit';
 if(/^(?:请|幫我|帮我)?(?:设置|設定|修改|更新|更改|添加|新增|移除|取消|关注|關注|重置|恢复).*(?:推荐|推薦|兴趣|興趣|主题|主題|期刊|提醒)/u.test(s))return 'edit';
 return null;
}
function named(s,options,aliases={}) {
 let rest=s.toLowerCase();const found=[];
 for(const item of [...options].sort((a,b)=>b.name.length-a.name.length)) {
  for(const label of [item.name,...(aliases[item.id]||[])]) {
   const re=new RegExp('(?<![a-z])'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z])','gi');
   if(re.test(rest)){found.push(item.id);rest=rest.replace(re,' ');break}
  }
 }
 return [...new Set(found)];
}
export function localPreferenceCommand(text,p) {
 const intent=preferenceIntent(text);if(!intent)return null;
 if(intent==='show')return {show:true};
 if(intent==='reset')return {patch:{...recommendationOptions.defaults,discipline:''}};
 const s=text.trim().replace(/[.!]+$/,'');
 const topics=named(s,recommendationTopics,{'microscopy':['microscope'],organoids:['organoid']}),journals=named(s,recommendationOptions.journals,{'S125754415':['PNAS'],'S2498964232':['Light: Science & Applications']});
 const removing=/^(?:please\s+)?(?:unfollow|remove|stop following)\b/i.test(s),adding=/^(?:please\s+)?add\b/i.test(s);
 const patch={};
 if(topics.length)patch.topics=removing?p.topics.filter(x=>!topics.includes(x)):adding?[...new Set([...p.topics,...topics])]:topics;
 if(journals.length){patch.journals=removing?p.journals.filter(x=>!journals.includes(x)):adding?[...new Set([...p.journals,...journals])]:journals;patch.journalScope='selected'}
 if(/\b(?:all|any) journals\b/i.test(s))patch.journalScope='all';
 const custom=s.match(/^(?:please\s+)?(?:set|change|update)\s+(?:my\s+)?(?:research\s+)?interests?\s+(?:to\s+)?(.+)$/i)||s.match(/^(?:i(?:'m| am) interested in|my (?:research )?interests are)\s+(.+)$/i);
 if(custom&&!/\b(?:journals?|reminders?|alerts?)\b/i.test(custom[1]))return {patch:{interests:custom[1],topics:[],discipline:'',journalScope:p.journalScope,journals:p.journals}};
 // Handle exact named selections locally. Mixed/unknown instructions go through
 // the bounded model planner so no part of the request is silently discarded.
 let residual=s.toLowerCase();
 for(const item of [...recommendationOptions.topics,...recommendationOptions.journals].sort((a,b)=>b.name.length-a.name.length))residual=residual.replaceAll(item.name.toLowerCase(),' ');
 residual=residual.replace(/\bpnas\b|\borganoid\b/g,' ').replace(/\b(please|set|change|update|edit|add|remove|follow|unfollow|stop|following|only|use|all|any|my|research|reading|recommendation|recommendations|interests?|topics?|journals?|to|from|and|or|in|mainly|for|the)\b/g,' ').replace(/[\s,;:.&-]/g,'');
 if(Object.keys(patch).length&&!residual)return {patch:{...patch,...(topics.length&&!removing&&!adding?{interests:''}:{}),discipline:''}};
 return {plan:true};
}
export function validatedPreferencePatch(patch) {
 requireValue(patch&&typeof patch==='object'&&!Array.isArray(patch),'No preferences were changed. Open Reading interests to edit your choices.');
 requireValue(Object.keys(patch).length>0&&Object.keys(patch).every(k=>fields.includes(k)),'No preferences were changed. Choose reading settings only.');
 return patch;
}
export function preferenceSummary(p,prefix='Your reading preferences',changed=null) {
 const topics=p.topics.map(id=>recommendationTopics.find(x=>x.id===id)?.name).filter(Boolean);
 if(p.interests)topics.push(p.interests);
 const journals=p.journalScope==='all'?'All journals':p.journals.map(id=>recommendationJournals.find(x=>x[0]===id)?.[1]).filter(Boolean).join(', ');
 const lines=[prefix],has=(...keys)=>!changed||keys.some(key=>changed.includes(key));
 if(has('topics','interests'))lines.push('Topics: '+(topics.join(', ')||'Editorial selection'));
 if(has('journals','journalScope'))lines.push('Journals: '+journals);
 if(has('language'))lines.push('Reading language: '+(languages[p.language]||p.language));
 if(has('dailyEnabled','dailyTime','timezone'))lines.push('Daily reminder: '+(p.dailyEnabled?p.dailyTime+' · '+p.timezone:'Off'));
 if(has('commentAlerts'))lines.push('Comment alerts: '+(p.commentAlerts?'On':'Off'));
 if(has('likeAlerts'))lines.push('Like alerts: '+(p.likeAlerts?'On':'Off'));
 return lines.join('\n');
}

import {requireValue,hash,languages} from './domain.mjs';
import {taxonomy} from './research-indexes.mjs';
import {recommendationSelection,recommendationOptions} from './recommendation-options.mjs';

export const readingDefaults={interests:'',discipline:'',language:'en',dailyEnabled:false,dailyTime:'09:00',timezone:'UTC',commentAlerts:true,likeAlerts:true};
export function readPreferences(store,user) {
 const raw=JSON.parse(store.db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id)?.body||'{}');
 const p={...readingDefaults,...raw};
 return {...p,...recommendationSelection(p),interestSetup:raw.interestSetup|| (p.interests||raw.topics?'chosen':'pending'),revision:hash(JSON.stringify(raw)).slice(0,24)};
}
export function savePreferences(store,user,b) {
 store.requireActive(user.id);
 requireValue(b&&typeof b==='object'&&!Array.isArray(b),'Choose valid reading preferences.');
 const old=readPreferences(store,user),p={...old};delete p.revision;
 if(b.revision!==undefined)requireValue(b.revision===old.revision,'Your preferences changed elsewhere. Reopen settings and try again.',409);
 for(const k of ['dailyEnabled','commentAlerts','likeAlerts'])if(k in b){requireValue(typeof b[k]==='boolean','Choose a valid notification setting.');p[k]=b[k]}
 if('interests'in b){requireValue(typeof b.interests==='string'&&b.interests.length<=120,'Use up to 120 characters for your interests.');p.interests=b.interests.replace(/[\x00-\x1f]/g,' ').trim();p.interestSetup=p.interests?'chosen':'skipped'}
 for(const k of ['topics','journals'])if(k in b){const allowed=new Set(recommendationOptions[k].map(x=>x.id));requireValue(Array.isArray(b[k])&&b[k].length<=allowed.size&&b[k].every(x=>typeof x==='string'&&allowed.has(x)),'Choose valid '+k+'.');p[k]=[...new Set(b[k])].sort()}
 if('journalScope'in b){requireValue(['all','selected'].includes(b.journalScope),'Choose a journal selection.');p.journalScope=b.journalScope}
 const edited=['topics','journals','journalScope'].some(k=>k in b);
 if(edited){requireValue(p.topics.length||p.interests,'Choose a topic or add your interests.');requireValue(p.journalScope==='all'||p.journals.length,'Choose at least one journal or All journals.');p.interestSetup='chosen';p.recommendationsVersion=1}
 if('discipline'in b){requireValue(b.discipline===''||taxonomy.openalex.some(d=>d.id===b.discipline),'Choose a discipline.');p.discipline=b.discipline}
 if('language'in b){requireValue(languages[b.language],'Choose a supported reading language.');p.language=b.language}
 if('dailyTime'in b){requireValue(typeof b.dailyTime==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(b.dailyTime),'Choose a valid daily time.');p.dailyTime=b.dailyTime}
 if('timezone'in b){try{requireValue(typeof b.timezone==='string'&&b.timezone.length<80,'Choose a valid time zone.');new Intl.DateTimeFormat('en',{timeZone:b.timezone}).format()}catch{requireValue(false,'Choose a valid time zone.')}p.timezone=b.timezone}
 // Older clients may change interests without knowing the new selection fields.
 // Do not enroll their preferences into the new policy implicitly.
 if(!old.recommendationsVersion&&!edited){delete p.topics;delete p.journals;delete p.journalScope}
 store.db.prepare('INSERT OR REPLACE INTO reading_preferences VALUES(?,?)').run(user.id,JSON.stringify(p));
 return readPreferences(store,user);
}

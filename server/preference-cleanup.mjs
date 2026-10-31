import {requireValue} from './domain.mjs';

export const preferenceLimits={journals:24,interests:8,interestCharacters:120,journalQueryCharacters:160};
export function cleanPreferenceText(value,max,label) {
 requireValue(typeof value==='string'&&value.length<=max*4,'Use a shorter '+label+'.');
 const text=value.normalize('NFKC').replace(/[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,' ').replace(/\s+/g,' ').trim();
 requireValue(!/[<>]/u.test(text)&&!/(?:https?:|javascript:|data:|www\.)/i.test(text),'Use a '+label+' name, not markup or a link.');
 requireValue(text.length<=max,'Use a shorter '+label+'.');
 return text;
}
export function cleanInterests(value) {
 requireValue(typeof value==='string'&&value.length<=480,'Use up to 120 characters for your interests.');
 const seen=new Set(),items=[];
 for(const part of value.split(/[,;，；\n]+/u)) {
  const name=cleanPreferenceText(part,120,'topic');
  if(name&&!seen.has(name.toLocaleLowerCase('en'))){seen.add(name.toLocaleLowerCase('en'));items.push(name)}
 }
 requireValue(items.length<=preferenceLimits.interests,'Keep up to 8 interests. Remove one before adding another.');
 const text=items.join(', ');
 requireValue(text.length<=120,'Use up to 120 characters for your interests.');
 return text;
}

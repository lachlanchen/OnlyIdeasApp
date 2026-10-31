import {requireValue} from './domain.mjs';
import {savePreferences} from './reading-preferences.mjs';

export function interestState(preferences={}) {
  const interests=typeof preferences.interests==='string'?preferences.interests:'';
  const state=['chosen','skipped'].includes(preferences.interestSetup)
    ? preferences.interestSetup : interests.trim() ? 'chosen' : 'pending';
  return {state,interests};
}

export function createResearchPreferences(store) {
  const db=store.db;
  db.exec('CREATE TABLE IF NOT EXISTS reading_preferences(owner TEXT PRIMARY KEY,body TEXT NOT NULL)');
  const read=user=>JSON.parse(db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id)?.body||'{}');
  return {
    status(user){return interestState(read(user))},
    update(user,{text,skip=false}) {
      store.requireActive(user.id);
      const old=read(user);
      if(skip) {
        // Dismissing a delayed first-use prompt must not erase chosen interests.
        if(interestState(old).state==='pending')old.interestSetup='skipped';
      } else {
        requireValue(typeof text==='string'&&text.trim(),'Tell me a few topics you enjoy.');
        return interestState(savePreferences(store,user,{interests:text,discipline:''}));
      }
      db.prepare('INSERT OR REPLACE INTO reading_preferences VALUES(?,?)').run(user.id,JSON.stringify(old));
      return interestState(old);
    }
  };
}

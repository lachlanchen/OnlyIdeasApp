import {requireValue} from './domain.mjs';

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
        requireValue(typeof text==='string'&&text.length<=120,'Use up to 120 characters for your interests.');
        const clean=text.replace(/[\x00-\x1f]/g,' ').trim();
        requireValue(clean,'Tell me a few topics you enjoy.');
        old.interests=clean;old.interestSetup='chosen';
        // The topics now drive discovery without a stale discipline filter.
        old.discipline='';
      }
      db.prepare('INSERT OR REPLACE INTO reading_preferences VALUES(?,?)').run(user.id,JSON.stringify(old));
      return interestState(old);
    }
  };
}

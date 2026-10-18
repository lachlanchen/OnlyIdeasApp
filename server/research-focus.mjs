// Keep historical values readable without rewriting a reader's saved choices.
export const previousDefaultInterests='neuromorphic imaging, event cameras, hyperspectral imaging, biomedical imaging, organoids, computational optics';
// New readers start across disciplines and choose their own interests in Agent.
export const defaultInterests='';
export const currentInterests=value=>value;
export function interestTopics(store,user){
 const exists=store.db.prepare("SELECT 1 FROM sqlite_master WHERE name='reading_preferences'").get();
 const row=user&&exists?store.db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id):null;
 const preferences=row?JSON.parse(row.body):{};
 const interests=typeof preferences.interests==='string'?currentInterests(preferences.interests):defaultInterests;
 return interests.split(/[,;，；]/).map(s=>s.trim()).filter(Boolean).slice(0,6);
}

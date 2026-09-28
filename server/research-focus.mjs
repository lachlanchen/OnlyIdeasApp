// Owner-selected starting interests, supported by the public publication profile
// and OpenHI project. Readers can replace these in their own preferences.
export const defaultInterests='neuromorphic imaging, event cameras, hyperspectral imaging, biomedical imaging, organoids, computational optics';
export function interestTopics(store,user){
 const exists=store.db.prepare("SELECT 1 FROM sqlite_master WHERE name='reading_preferences'").get();
 const row=user&&exists?store.db.prepare('SELECT body FROM reading_preferences WHERE owner=?').get(user.id):null;
 const preferences=row?JSON.parse(row.body):{};
 const interests=typeof preferences.interests==='string'?preferences.interests:defaultInterests;
 return interests.split(/[,;，；]/).map(s=>s.trim()).filter(Boolean).slice(0,6);
}

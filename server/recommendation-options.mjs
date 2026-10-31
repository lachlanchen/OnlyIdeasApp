// Stable IDs shared by settings, discovery and the account-scoped agent tool.
export const recommendationJournals = [
 ['S137773608','Nature'], ['S3880285','Science'], ['S110447773','Cell'],
 ['S125754415','Proceedings of the National Academy of Sciences'],
 ['S4210197940','Optica'], ['S120392215','Nature Photonics'],
 ['S127827428','Nature Methods'], ['S2764624792','Nature Biomedical Engineering'],
 ['S64187185','Nature Communications'], ['S2737427234','Science Advances'],
 ['S2498964232','Light Science & Applications'], ['S106963461','Nature Biotechnology'],
 ['S203256638','Nature Medicine'],
];

export const recommendationTopics=[
 {id:'imaging',name:'Imaging',terms:['imaging','microscopy','tomography','holography','hyperspectral']},
 {id:'optics',name:'Optics',terms:['optical','optics','photonic','photonics','metasurface','laser']},
 {id:'biomedicine',name:'Biomedicine',terms:['biomedical','organoid','cellular','cancer','neural','therapeutic','tissue','clinical','diagnostic','proteomics']},
 {id:'microscopy',name:'Microscopy',terms:['microscopy','microscope','super-resolution']},
 {id:'organoids',name:'Organoids',terms:['organoid','organoids','organ-on-chip']},
 {id:'neuroscience',name:'Neuroscience',terms:['neural','neuron','neuroscience','brain']},
 {id:'computational-imaging',name:'Computational imaging',terms:['computational imaging','inverse imaging','holography']},
 {id:'event-cameras',name:'Event cameras',terms:['event camera','event-based vision','neuromorphic']},
 {id:'hyperspectral',name:'Hyperspectral imaging',terms:['hyperspectral','spectral imaging','multispectral']},
 {id:'cell-biology',name:'Cell biology',terms:['cellular','cell biology','proteomics','genomics']},
];
export const defaultTopicIDs=['imaging','optics','biomedicine'];
export const defaultJournalIDs=recommendationJournals.slice(0,3).map(([id])=>id);
export const recommendationOptions={topics:recommendationTopics.map(({id,name})=>({id,name})),journals:recommendationJournals.map(([id,name])=>({id,name})),defaults:{topics:defaultTopicIDs,journals:defaultJournalIDs,journalScope:'selected',interests:''}};
export function recommendationSelection(p={}) {
 return {topics:Array.isArray(p.topics)?p.topics:p.interests?.trim()?[]:defaultTopicIDs,journals:Array.isArray(p.journals)?p.journals:defaultJournalIDs,journalScope:p.journalScope==='all'?'all':'selected',interests:p.interests||''};
}
export function recommendationLanes(p={}) {
 const selection=recommendationSelection(p),groups=selection.topics.map(id=>recommendationTopics.find(t=>t.id===id)).filter(Boolean);
 const custom=selection.interests.split(/[,;，；]/).map(s=>s.trim()).filter(Boolean).slice(0,8);
 groups.push(...custom.map(name=>({name,terms:[name]})));
 const buckets=Array.from({length:Math.min(3,groups.length)},()=>({name:[],terms:[]}));
 groups.forEach((group,i)=>{buckets[i%buckets.length].name.push(group.name);buckets[i%buckets.length].terms.push(...group.terms)});
 return buckets.map(b=>({name:b.name.join(', '),terms:[...new Set(b.terms)],match:{test:title=>b.terms.some(term=>String(title).toLowerCase().includes(term.toLowerCase()))}}));
}

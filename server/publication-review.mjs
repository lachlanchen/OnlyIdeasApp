import { randomUUID } from 'node:crypto';
import { hash, requireValue, mayPublish, publicPaper } from './domain.mjs';
import { creditTransaction } from './credits.mjs';

export function initPublicationReview(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS publication_reviews(
    id TEXT PRIMARY KEY, job TEXT NOT NULL, paper TEXT NOT NULL, reviewer TEXT NOT NULL,
    created INTEGER NOT NULL, body TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS publication_review_job ON publication_reviews(job,created);`);
}
export const isReviewer = (store, config, user) => !!user && store.active(user.id)
  && Array.isArray(config.publicationReviewers) && config.publicationReviewers.includes(user.id);

// Bind approval to all publishable content, not just the caller-provided revision.
export function publicationFingerprint(p) {
  const { owner, sections, sharing, visibility, publication, ...content } = p;
  return hash(JSON.stringify(content));
}
export function publicationState(p, job) {
  if (p.visibility === 'public') return 'shared';
  if (!job) return p.sharing === 'awaiting_review' ? 'awaiting_review' : 'private';
  if (['queued','running'].includes(job.state)) return 'publishing';
  if (job.state === 'failed') return job.reviewDecision === 'reject' ? 'declined' : 'publication_failed';
  return job.reviewDecision === 'changes' ? 'changes_requested' : 'awaiting_review';
}
export function paperReviewStatus(store, p) {
  const j = store.existing(p.owner, `publish:${p.id}:${p.revision}`);
  const state = publicationState(p, j);
  return { state, ...(j && ['changes_requested','declined','publication_failed'].includes(state) ? { message: j.message } : {}) };
}
const reviewToken = (p,j) => hash(JSON.stringify([publicationFingerprint(p),j.id,j.state,j.reviewDecision,j.reviewEvent]));
const safeURL = value => {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.hash; } catch { return false; }
};
export function createPublicationReview(store, config) {
  const authorized = user => requireValue(isReviewer(store,config,user), 'Administrator access required.', user ? 403 : 401);
  const record = id => {
    const job = store.job(id), paper = job?.kind === 'publish' && store.paper(job.paperId);
    // A publication request is the consent boundary. Never enumerate personal uploads.
    requireValue(paper && paper.owner === job.owner && store.active(paper.owner), 'Review request not found.', 404);
    return {job,paper};
  };
  const item = (paper,job) => ({id:job.id, token:reviewToken(paper,job), state:publicationState(paper,job),
    created:job.created, message:job.message, paper:publicPaper(paper)});
  return {
    authorized,
    list(user,{state='awaiting_review',q='',offset=0}={}) {
      authorized(user);
      requireValue(['all','awaiting_review','changes_requested','publishing','shared','declined','publication_failed'].includes(state),'Choose a review state.');
      const query=String(q).toLowerCase().slice(0,200), start=Math.max(0,Math.min(100000,Number(offset)||0));
      const rows=store.db.prepare("SELECT body FROM jobs WHERE json_extract(body,'$.kind')='publish' ORDER BY created DESC").all();
      const counts={}, entries=[];
      for(const row of rows) {
        const job=JSON.parse(row.body),p=store.paper(job.paperId);
        if(!p || !store.active(p.owner) || p.owner!==job.owner)continue;
        // Older revisions remain in the audit log, not the actionable queue.
        if(job.dedupe!==`publish:${p.id}:${p.revision}`)continue;
        const entry=item(p,job);counts[entry.state]=(counts[entry.state]||0)+1;
        if((state==='all'||entry.state===state)&&(!query||`${p.title} ${p.authors} ${p.doi||''}`.toLowerCase().includes(query)))entries.push(entry);
      }
      return {items:entries.slice(start,start+50),total:entries.length,counts,offset:start};
    },
    detail(user,id) {
      authorized(user);const {paper,job}=record(id);
      const {owner,...preview}=paper;
      const history=store.db.prepare('SELECT body FROM publication_reviews WHERE paper=? ORDER BY created DESC,rowid DESC LIMIT 50').all(paper.id).map(r=>JSON.parse(r.body));
      return {...item(paper,job),paper:preview,history};
    },
    asset(user,id,path) {
      authorized(user);const {paper}=record(id);
      requireValue(paper.assets.some(a=>a.path===path),'Figure not found.',404);return paper;
    },
    decide(user,body) {
      authorized(user);
      requireValue(['approve','changes','reject','retry'].includes(body?.action),'Choose a review action.');
      requireValue(Array.isArray(body.items)&&body.items.length>0&&body.items.length<=20,'Select between 1 and 20 papers.');
      requireValue(body.items.every(x=>x&&typeof x.id==='string'&&typeof x.token==='string'),'Include the current review token for every paper.');
      requireValue(new Set(body.items.map(x=>x.id)).size===body.items.length,'Select each paper only once.');
      const reason=String(body.reason||'').trim();
      requireValue(reason.length<=1000,'Keep the review message within 1,000 characters.');
      if(['changes','reject'].includes(body.action))requireValue(reason.length>=10,'Explain the decision for the contributor (at least 10 characters).');
      return creditTransaction(store,()=> {
        // Entire batch commits or none does. A stale row cannot partially approve a selection.
        const results=[];
        for(const selection of body.items) {
          const {paper:p,job:j}=record(selection.id);
          requireValue(p.visibility!=='public','This paper is already shared. Refresh the queue.',409);
          requireValue(selection.token===reviewToken(p,j),'This paper or review changed. Refresh and review it again.',409);
          requireValue(j.dedupe===`publish:${p.id}:${p.revision}`,'The paper revision changed. Request a fresh review.',409);
          const action=body.action;
          requireValue(action==='retry' ? j.state==='failed'&&j.reviewed===true&&j.reviewDecision!=='reject' : ['awaiting_review','failed'].includes(j.state), 'Publication is already in progress. Refresh the queue.',409);
          let evidence;
          if(action==='approve') {
            requireValue(selection.contentChecked===true&&selection.rightsChecked===true,'Check the text, figures and redistribution permission for each selected paper.');
            requireValue(typeof selection.license==='string','Choose the verified license.');
            requireValue(safeURL(selection.evidenceUrl),'Add an HTTPS permission evidence URL without credentials.');
            const note=String(selection.note||'').trim();
            requireValue(note.length>=10&&note.length<=2000,'Record what you verified (10–2,000 characters).');
            p.license=selection.license;mayPublish(p,true);
            // Internal notes/reviewer identities live only in the audit table.
            p.provenance={...p.provenance,licenseUrl:selection.evidenceUrl,verification:'operator-reviewed-permission',checked:new Date().toISOString().slice(0,10)};
            evidence={license:p.license,url:selection.evidenceUrl,note,contentChecked:true,rightsChecked:true};
            j.reviewed=true;j.reviewFingerprint=publicationFingerprint(p);
          }
          if(action==='retry')requireValue(j.reviewFingerprint===publicationFingerprint(p),'The approved content changed. Review it again before publishing.',409);
          const event={id:randomUUID(),job:j.id,paper:p.id,reviewer:user.id,created:Date.now(),action,revision:p.revision,fingerprint:publicationFingerprint(p),...(evidence?{evidence}:{}),...(reason?{reason}:{})};
          store.db.prepare('INSERT INTO publication_reviews VALUES(?,?,?,?,?,?)').run(event.id,j.id,p.id,user.id,event.created,JSON.stringify(event));
          j.reviewEvent=event.id;j.reviewDecision=action;
          j.state=['approve','retry'].includes(action)?'queued':action==='reject'?'failed':'awaiting_review';
          j.message=['approve','retry'].includes(action)?'Approved · publishing to the shared library':reason;
          if(['changes','reject'].includes(action)){j.reviewed=false;delete j.reviewFingerprint;}
          delete j.lease;delete j.leaseUntil;
          p.sharing=publicationState(p,j);store.savePaper(p);store.saveJob(j);
          results.push(item(p,j));
        }
        return {items:results};
      });
    }
  };
}

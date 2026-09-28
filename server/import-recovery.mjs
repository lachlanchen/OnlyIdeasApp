import { requireValue } from './domain.mjs';
import { canReusePaper } from './import-reuse.mjs';

export const canUploadForJob = j => j?.kind === 'import' && j.state === 'failed' && !!j.url && !j.submittedAt && !j.pdfId;
export function recoveryJob(store, owner, ref) {
  const row = store.db.prepare('SELECT job FROM import_recoveries WHERE owner=? AND reference=?').get(owner, ref);
  const job = row && store.job(row.job);
  if (!job || job.owner !== owner) return null;
  if (job.state === 'completed' && !canReusePaper(store, store.paper(job.paperId), owner)) return null;
  return job;
}
// The client supplies only a reference. Bibliographic context comes from an
// indexed record or this account's failed request, never arbitrary header JSON.
export function uploadContext(store, discovery, user, headers) {
  const research = headers['x-research-id'], failed = headers['x-recovery-job-id'];
  requireValue(!(research && failed), 'Select one paper to recover.');
  if (!research && !failed) return null;
  if (failed) {
    const job = store.job(failed);
    requireValue(job?.owner === user.id, 'Request not found.', 404);
    const prior = recoveryJob(store, user.id, 'job:' + job.id);
    requireValue(canUploadForJob(job) || prior, 'Resume the existing conversion from Your requests.', 409);
    return { refs: ['job:' + job.id, ...(job.discoveryId ? ['r:' + job.discoveryId] : [])],
      metadata: job.metadata, source: job.sourcePage || job.url, originalJob: job.id,
      sharing: job.sharing === 'shared' ? 'shared' : 'private' };
  }
  const card = discovery.item(research, user);
  const row=store.db.prepare("SELECT body FROM jobs WHERE owner=? AND json_extract(body,'$.kind')='import' AND (json_extract(body,'$.discoveryId')=? OR json_extract(body,'$.url')=?) ORDER BY created DESC LIMIT 1").get(user.id,card.id,card.pdfUrl||'');
  const original=row?JSON.parse(row.body):null;
  return { originalJob:original?.id, refs: ['r:' + card.id,...(original?['job:'+original.id]:[])], metadata: { ...card, language: 'en', category: card.discipline || 'Research' },
    source: card.source, sharing: null };
}
export function activeRecovery(store, owner, context) {
  if(context?.originalJob){const original=store.job(context.originalJob);if(original?.owner===owner&&(['queued','running'].includes(original.state)||original.submittedAt||original.state==='completed'&&canReusePaper(store,store.paper(original.paperId),owner)))return original;}
  for (const ref of context?.refs || []) {
    const job = recoveryJob(store, owner, ref);
    if (job && (job.state !== 'failed'||job.submittedAt)) return job;
  }
  return null;
}
export function bindRecovery(store, owner, context, job) {
  if (!context) return;
  for (const ref of context.refs) store.db.prepare('INSERT OR REPLACE INTO import_recoveries VALUES(?,?,?)').run(owner, ref, job.id);
  completeRecovery(store, job);
}
export function completeRecovery(store, job) {
  if (job.state !== 'completed' || !canReusePaper(store, store.paper(job.paperId), job.owner)) return;
  for (const row of store.db.prepare('SELECT reference FROM import_recoveries WHERE owner=? AND job=?').all(job.owner, job.id)) {
    if (!row.reference.startsWith('job:')) continue;
    const original = store.job(row.reference.slice(4));
    if (original?.owner !== job.owner || !canUploadForJob(original)) continue;
    store.saveJob({ ...original, state: 'completed', paperId: job.paperId, reused: true,
      message: 'Ready · recovered from your PDF', recoveredBy: job.id, finishedAt: Date.now() });
  }
}

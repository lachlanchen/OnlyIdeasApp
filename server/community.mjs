import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { hash, requireValue, mayPublish } from './domain.mjs';
import { deleteCredits } from './credits.mjs';
import { deleteBillingAccount } from './billing-ledger.mjs';

export const termsVersion = '2026-09-27';

export async function deleteAccount(store, user) {
  const db = store.db;
  const papers = db.prepare('SELECT id FROM papers WHERE owner=?').all(user.id);
  const jobs = db.prepare('SELECT id FROM jobs WHERE owner=?').all(user.id);
  // A durable tombstone prevents a provider response already in flight from
  // recreating the old account. A later provider sign-in gets a new account ID.
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT OR IGNORE INTO deleted_accounts VALUES(?)').run(user.id);
    db.prepare("DELETE FROM sessions WHERE json_extract(user,'$.id')=?").run(user.id);
    db.prepare("DELETE FROM oauth WHERE json_extract(body,'$.user.id')=?").run(user.id);
    db.prepare('DELETE FROM chat_messages WHERE chat IN (SELECT id FROM chats WHERE owner=?)').run(user.id);
    for (const table of ['chat_tasks', 'chats', 'comments', 'notes', 'artifacts', 'reports', 'terms', 'jobs', 'attachments', 'job_subscriptions', 'paper_reactions','reading_preferences','reading_activity','inbox_reads','reading_digests','import_recoveries','translation_pieces']) {
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(user.id);
    }
    for (const paper of papers) {
      db.prepare('DELETE FROM paper_import_keys WHERE paper=?').run(paper.id);
      if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='translation_pieces'").get())db.prepare('DELETE FROM translation_pieces WHERE paper=?').run(paper.id);
      db.prepare('DELETE FROM artifact_requests WHERE paper=?').run(paper.id);
      db.prepare('DELETE FROM comments WHERE paper=?').run(paper.id);
      db.prepare('DELETE FROM notes WHERE paper=?').run(paper.id);
      db.prepare("DELETE FROM artifacts WHERE json_extract(body,'$.paperId')=?").run(paper.id);
    }
    db.prepare('DELETE FROM papers WHERE owner=?').run(user.id);
    deleteCredits(store,user.id);
    deleteBillingAccount(store,user.id);
    db.prepare('DELETE FROM blocks WHERE owner=? OR blocked=?').run(user.id, user.id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  for (const { id } of papers) await rm(join(store.directory, 'papers', id), { recursive: true, force: true });
  for (const { id } of jobs) await rm(join(store.directory, 'jobs', id), { recursive: true, force: true });
}

export function visibleComments(store, paper, user) {
  return store.db.prepare(`SELECT body FROM comments c WHERE paper=?
    AND (owner=? OR (json_extract(body,'$.visibility')='public' AND json_extract(body,'$.moderation')='approved'))
    AND owner NOT IN (SELECT id FROM suspensions) AND owner NOT IN (SELECT id FROM deleted_accounts)
    AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.owner=? AND b.blocked=c.owner) OR (b.owner=c.owner AND b.blocked=?))
    ORDER BY created DESC,rowid DESC LIMIT 200`).all(paper,user?.id||'',user?.id||'',user?.id||'').reverse()
    .map(r => JSON.parse(r.body))
    .filter(c => store.active(c.owner) && !store.blocked(user?.id, c.owner)
      && (c.owner === user?.id || (c.visibility === 'public' && c.moderation === 'approved')))
    .map(c => ({ ...c, owner: undefined, login: undefined, canDelete: c.owner === user?.id,
      pending: c.visibility === 'pending' || (c.visibility === 'public' && c.moderation !== 'approved') }));
}

export function acceptTerms(store, user, accepted) {
  if (accepted === true) store.db.prepare('INSERT OR REPLACE INTO terms VALUES(?,?)').run(user.id, termsVersion);
  requireValue(store.db.prepare('SELECT version FROM terms WHERE owner=?').get(user.id)?.version === termsVersion,
    'Accept the Community Terms before posting publicly.', 428);
}

export function blocks(store, user) {
  return store.db.prepare('SELECT blocked,name FROM blocks WHERE owner=?').all(user.id)
    .map(b => ({ id: hash(b.blocked), name: b.name }));
}

// Public contributions are held for human review, including legacy comments.
// This filters objectionable material before it becomes visible to other readers.
export function moderate(store, action, id) {
  const db = store.db;
  if (action === 'approve-comment' || action === 'remove-comment') {
    const row = db.prepare('SELECT body FROM comments WHERE id=?').get(id);
    requireValue(row, 'Comment not found.', 404);
    const c = JSON.parse(row.body);
    requireValue(['public', 'pending'].includes(c.visibility), 'Private comments cannot be approved for public display.');
    if (action === 'remove-comment') db.prepare('DELETE FROM comments WHERE id=?').run(id);
    else { store.requireActive(c.owner); c.visibility = 'public'; c.moderation = 'approved'; db.prepare('UPDATE comments SET body=? WHERE id=?').run(JSON.stringify(c), id); }
  } else if (action === 'approve-paper' || action === 'reject-paper') {
    const j = store.job(id);
    requireValue(j?.kind === 'publish' && j.state === 'awaiting_review', 'Publication is not waiting for review.');
    if (action === 'approve-paper') { const paper=store.paper(j.paperId); requireValue(paper, 'Paper not found.'); mayPublish(paper, true); }
    j.state = action === 'approve-paper' ? 'queued' : 'failed';
    j.reviewed = true; j.message = action === 'approve-paper' ? 'Approved for publication' : 'Publication was declined. Contact support for details.';
    store.saveJob(j);
  } else if (action === 'suspend') {
    db.prepare('INSERT OR IGNORE INTO suspensions VALUES(?,?)').run(id, Date.now());
    db.prepare("DELETE FROM sessions WHERE json_extract(user,'$.id')=?").run(id);
    db.prepare('DELETE FROM chat_tasks WHERE owner=?').run(id);
  } else if (action === 'resolve-report') {
    requireValue(db.prepare('DELETE FROM reports WHERE id=?').run(id).changes, 'Report not found.');
  } else requireValue(false, 'Unknown moderation action.');
  return { ok: true };
}

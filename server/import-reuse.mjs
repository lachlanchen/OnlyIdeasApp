import { randomUUID } from 'node:crypto';
import { hash } from './domain.mjs';

// Identity is deliberately conservative: never match by title and never strip
// an arXiv version. A source/provenance pair can supply explicitly known aliases.
export function sourceKey(source) {
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    if (!url.search && !url.port) {
      const arxiv = ['arxiv.org', 'www.arxiv.org', 'export.arxiv.org'].includes(url.hostname)
        && url.pathname.match(/^\/(?:abs|pdf)\/((?:\d{4}\.\d{4,5}|[a-z.-]+\/\d{7})(?:v\d+)?)(?:\.pdf)?\/?$/i);
      if (arxiv) return `arxiv:${arxiv[1].toLowerCase()}`;
      if (['doi.org', 'dx.doi.org'].includes(url.hostname) && /^\/10\.\d{4,9}\//.test(url.pathname)) return `doi:${url.pathname.slice(1).toLowerCase()}`;
      if (['nature.com', 'www.nature.com'].includes(url.hostname) && /^\/articles\/[\w-]+(?:\.pdf)?$/.test(url.pathname)) return `nature:${url.pathname.replace(/\.pdf$/, '')}`;
    }
    return `url:${url.href}`;
  } catch { return null; }
}
export function importKeys(fields) {
  return [...new Set([
    fields.url && sourceKey(fields.url),
    /^[a-f0-9]{64}$/.test(fields.sourceDigest || '') && `file:${fields.sourceDigest}`,
    typeof fields.mmd === 'string' && `text:${hash(fields.mmd)}`,
  ].filter(Boolean))];
}
export const canReusePaper = (store, paper, owner) => !!paper && store.active(paper.owner)
  && !store.blocked(owner, paper.owner) && (paper.visibility === 'public' || paper.owner === owner);

export function indexPaper(store, paper) {
  const job = store.job(paper.id);
  // Only a conversion that produced this paper can assert its file hash. Reuse
  // receipts and user-supplied metadata cannot add aliases to someone else's work.
  const original = job?.owner === paper.owner && ['import', 'attachment'].includes(job.kind) ? job : null;
  const digest = original?.sourceDigest || store.db.prepare('SELECT digest FROM credit_candidates WHERE paper=? AND owner=?').get(paper.id, paper.owner)?.digest;
  const keys = new Set([...importKeys({ url: paper.source, mmd: paper.mmd, sourceDigest: digest }), sourceKey(paper.provenance?.source)]);
  store.db.prepare('DELETE FROM paper_import_keys WHERE paper=?').run(paper.id);
  for (const key of keys) if (key) store.db.prepare('INSERT OR IGNORE INTO paper_import_keys VALUES(?,?)').run(key, paper.id);
}
export function initImportReuse(store) {
  store.db.exec('CREATE TABLE IF NOT EXISTS paper_import_keys(key TEXT NOT NULL, paper TEXT NOT NULL, PRIMARY KEY(key,paper)); CREATE INDEX IF NOT EXISTS import_key_paper ON paper_import_keys(paper)');
  if (store.db.prepare("SELECT 1 FROM credit_meta WHERE name='paper_import_index_v1'").get()) return;
  // Additive migration; canonical paper bodies and personal data are untouched.
  for (const row of store.db.prepare('SELECT body FROM papers').all()) indexPaper(store, JSON.parse(row.body));
  store.db.prepare("INSERT INTO credit_meta VALUES('paper_import_index_v1','1')").run();
}
export function reusablePaper(store, owner, fields, exclude) {
  const keys = importKeys(fields);
  if (!keys.length) return null;
  const rows = store.db.prepare(`SELECT DISTINCT p.body FROM paper_import_keys k JOIN papers p ON p.id=k.paper WHERE k.key IN (${keys.map(() => '?').join(',')}) AND (p.visibility='public' OR p.owner=?) ORDER BY p.visibility DESC, p.rowid`).all(...keys, owner);
  for (const row of rows) {
    const paper = store.parsePaper(row.body);
    if (paper.id !== exclude && canReusePaper(store, paper, owner)) return paper;
  }
  return null;
}
export function reusedImport(store, user, fields) {
  if (!['import', 'attachment'].includes(fields.kind)) return null;
  const paper = reusablePaper(store, user.id, fields);
  if (!paper) return null;
  const dedupe = `reuse:${fields.kind}:${paper.id}:${paper.revision}`;
  return store.existing(user.id, dedupe) || store.saveJob({ id: fields.id || randomUUID(), owner: user.id,
    kind: fields.kind, dedupe, created: Date.now(), finishedAt: Date.now(), state: 'completed',
    message: 'Ready · existing paper reused', paperId: paper.id, reused: true });
}

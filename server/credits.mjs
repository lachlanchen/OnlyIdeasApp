import { hash, requireValue } from './domain.mjs';

// Ordinary, non-transferable database credits. All amounts are integers.
export const creditPolicy = Object.freeze({ version: 1, welcome: 30, privatePage: 1, privateFile: 1, publication: 10, rewardPerDay: 50 });
let transactionID = 0;
export function initCredits(store) {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS credit_meta(name TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO credit_meta VALUES('version','1');
    CREATE TABLE IF NOT EXISTS credit_ledger(id TEXT PRIMARY KEY, owner TEXT NOT NULL, delta INTEGER NOT NULL, kind TEXT NOT NULL, operation TEXT, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS credit_owner ON credit_ledger(owner,created);
    CREATE TABLE IF NOT EXISTS credit_welcome(identity TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS credit_holds(id TEXT PRIMARY KEY, owner TEXT NOT NULL, amount INTEGER NOT NULL, state TEXT NOT NULL, spent INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS credit_candidates(paper TEXT PRIMARY KEY, owner TEXT NOT NULL, digest TEXT);
    CREATE TABLE IF NOT EXISTS credit_rewards(id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, amount INTEGER NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS credit_reward_aliases(alias TEXT PRIMARY KEY, reward TEXT NOT NULL);
  `);
}

// Savepoints also compose with attachment/account transactions. Taking the write
// lock before any reads serializes independent API/worker processes on SQLite.
export function creditTransaction(store, fn) {
  const name = `credits_${++transactionID}`;
  store.db.exec(`SAVEPOINT ${name}`);
  try {
    store.db.exec("UPDATE credit_meta SET value=value WHERE name='version'");
    const result = fn();
    store.db.exec(`RELEASE ${name}`);
    return result;
  } catch (error) {
    store.db.exec(`ROLLBACK TO ${name}; RELEASE ${name}`);
    throw error;
  }
}
const entry = (store, id, owner, delta, kind, operation = null) => {
  requireValue(Number.isSafeInteger(delta), 'Invalid credit amount.');
  store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run(id, owner, delta, kind, operation, Date.now());
};
const balance = (store, owner) => store.db.prepare('SELECT coalesce(sum(delta),0) AS balance FROM credit_ledger WHERE owner=?').get(owner).balance;
function welcome(store, owner) {
  store.requireActive(owner);
  // A deleted/recreated provider account does not receive another welcome grant.
  const identity = store.db.prepare('SELECT id FROM identities WHERE account=?').get(owner)?.id || hash(owner);
  if (store.db.prepare('INSERT OR IGNORE INTO credit_welcome VALUES(?)').run(identity).changes) {
    entry(store, `welcome:${identity}`, owner, creditPolicy.welcome, 'welcome');
  }
}
export function creditSummary(store, owner, config) {
  const enabled = config.credits?.enabled === true;
  return creditTransaction(store, () => {
    if (enabled && owner) welcome(store, owner);
    const held = owner ? store.db.prepare("SELECT coalesce(sum(amount),0) AS n FROM credit_holds WHERE owner=? AND state='held'").get(owner).n : 0;
    return { enabled, policy: creditPolicy, maxPDF: config.maxPages || 30, balance: owner ? balance(store, owner) : 0, held,
      history: owner ? store.db.prepare('SELECT delta,kind,created FROM credit_ledger WHERE owner=? ORDER BY created DESC,rowid DESC LIMIT 40').all(owner) : [] };
  });
}
export function reserveImport(store, config, job, limit) {
  if (config.credits?.enabled !== true || !['import', 'attachment', 'markdown'].includes(job.kind)) return;
  welcome(store, job.owner);
  const amount = job.sharing === 'shared' ? 0 : (job.kind === 'import' || job.ext === 'pdf' ? job.pages || config.maxPages || 30 : 1);
  if (amount) requireValue(Number.isSafeInteger(limit) && limit >= amount, 'Confirm the private import credit cost in the latest app.', 428);
  job.credit = { version: creditPolicy.version, amount, attempt: 0 };
  hold(store, job);
  store.db.prepare('INSERT OR IGNORE INTO credit_candidates VALUES(?,?,?)').run(job.id, job.owner, job.sourceDigest || null);
}
function hold(store, job) {
  const { amount, attempt } = job.credit, id = `${job.id}:${attempt}`;
  if (!amount || store.db.prepare('SELECT 1 FROM credit_holds WHERE id=?').get(id)) return;
  requireValue(balance(store, job.owner) >= amount, 'Not enough credits for this private import. Share a paper or add credits in Profile.', 402);
  entry(store, `hold:${id}`, job.owner, -amount, 'private_import', job.id);
  store.db.prepare("INSERT INTO credit_holds VALUES(?,?,?,'held',0)").run(id, job.owner, amount);
}
export function retryImportCredits(store, job, limit) {
  if (!job.credit?.amount) return;
  requireValue(Number.isSafeInteger(limit) && limit >= job.credit.amount, 'Confirm the private import credit cost before retrying.', 428);
  job.credit.attempt++;
  hold(store, job);
}
export function finishImportCredits(store, job, success) {
  if (!job.credit?.amount) return;
  const id = `${job.id}:${job.credit.attempt}`, saved = store.db.prepare('SELECT * FROM credit_holds WHERE id=?').get(id);
  if (!saved || saved.state !== 'held') return;
  const spent = success ? (job.kind === 'import' || job.ext === 'pdf' ? job.pages : 1) : 0;
  requireValue(Number.isSafeInteger(spent) && spent >= 0 && spent <= saved.amount, 'The credit receipt needs reconciliation.', 409);
  const refund = saved.amount - spent;
  if (refund) entry(store, `refund:${id}`, job.owner, refund, success ? 'unused_reservation' : 'failed_import', job.id);
  store.db.prepare('UPDATE credit_holds SET state=?,spent=? WHERE id=?').run(success ? 'settled' : 'refunded', spent, id);
}

export function publicationAliases(paper, digest) {
  const aliases = [`text:${hash(paper.mmd.normalize('NFKC').replace(/\s+/g, ' ').trim())}`];
  if (digest) aliases.push(`file:${digest}`);
  for (const source of [paper.source, paper.provenance?.source]) {
    if (!source) continue;
    try {
      const url = new URL(source); url.hash = '';
      for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
      url.searchParams.sort();
      const arxiv = ['arxiv.org','www.arxiv.org'].includes(url.hostname) && url.pathname.match(/^\/(?:abs|pdf)\/(.+?)(?:v\d+)?(?:\.pdf)?$/i);
      const doi = url.pathname.match(/(?:^|\/)(10\.\d{4,9}\/[^\s]+)$/i);
      aliases.push(arxiv ? `arxiv:${arxiv[1].toLowerCase()}` : doi ? `doi:${doi[1].toLowerCase()}` : `url:${url.toString().replace(/\/$/, '')}`);
    } catch { /* Invalid or absent source cannot create a canonical alias. */ }
  }
  return [...new Set(aliases)].map(hash);
}
function recordAliases(store, aliases, reward) {
  for (const alias of aliases) store.db.prepare('INSERT OR IGNORE INTO credit_reward_aliases VALUES(?,?)').run(alias, reward);
}
export function seedCreditPublications(store, config) {
  if (config.credits?.enabled !== true) return;
  creditTransaction(store, () => {
    if (store.db.prepare("SELECT 1 FROM credit_meta WHERE name='public_baseline'").get()) return;
    for (const row of store.db.prepare("SELECT body FROM papers WHERE visibility='public'").all()) {
      const paper = JSON.parse(row.body);
      recordAliases(store, publicationAliases(paper), `baseline:${hash(paper.id)}`);
    }
    store.db.prepare("INSERT INTO credit_meta VALUES('public_baseline','1')").run();
  });
}
export function rewardPublication(store, job) {
  const candidate = store.db.prepare('SELECT * FROM credit_candidates WHERE paper=? AND owner=?').get(job.paperId, job.owner);
  if (!candidate || !job.reviewed) return 0;
  const paper = store.paper(job.paperId);
  if (!paper || paper.visibility !== 'public' || !paper.publication?.commit) return 0;
  const aliases = publicationAliases(paper, candidate.digest);
  const previous = aliases.map(alias => store.db.prepare('SELECT reward FROM credit_reward_aliases WHERE alias=?').get(alias)?.reward).find(Boolean);
  if (previous) { recordAliases(store, aliases, previous); return 0; }
  const ownerHash = hash(job.owner), day = Math.floor(Date.now() / 86400_000) * 86400_000;
  const used = store.db.prepare('SELECT coalesce(sum(amount),0) AS n FROM credit_rewards WHERE owner_hash=? AND created>=?').get(ownerHash, day).n;
  const amount = Math.min(creditPolicy.publication, Math.max(0, creditPolicy.rewardPerDay - used));
  const id = `publication:${hash(job.paperId)}`;
  store.db.prepare('INSERT INTO credit_rewards VALUES(?,?,?,?)').run(id, ownerHash, amount, Date.now());
  recordAliases(store, aliases, id);
  if (amount) entry(store, id, job.owner, amount, 'public_reward');
  return amount;
}
export function deleteCredits(store, owner) {
  for (const table of ['credit_ledger', 'credit_holds', 'credit_candidates']) store.db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(owner);
  // Keep only hashed welcome/reward deduplication, never document text or URLs.
}

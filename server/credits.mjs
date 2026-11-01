import { hash, requireValue } from './domain.mjs';

// Ordinary, non-transferable database credits. All amounts are integers.
export const creditPolicy = Object.freeze({ version: 1, welcome: 30, dailyBonus: 100, privatePage: 1, privateFile: 1, publication: 10, rewardPerDay: 50 });
const DAY = 86400_000;
let transactionID = 0;
export function initCredits(store) {
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS credit_meta(name TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR IGNORE INTO credit_meta VALUES('version','1');
    CREATE TABLE IF NOT EXISTS credit_ledger(id TEXT PRIMARY KEY, owner TEXT NOT NULL, delta INTEGER NOT NULL, kind TEXT NOT NULL, operation TEXT, created INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS credit_owner ON credit_ledger(owner,created);
    CREATE TABLE IF NOT EXISTS credit_welcome(identity TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS credit_daily_days(identity TEXT NOT NULL, day INTEGER NOT NULL, PRIMARY KEY(identity,day));
    CREATE TABLE IF NOT EXISTS credit_holds(id TEXT PRIMARY KEY, owner TEXT NOT NULL, amount INTEGER NOT NULL, state TEXT NOT NULL, spent INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS credit_candidates(paper TEXT PRIMARY KEY, owner TEXT NOT NULL, digest TEXT);
    CREATE TABLE IF NOT EXISTS credit_rewards(id TEXT PRIMARY KEY, owner_hash TEXT NOT NULL, amount INTEGER NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS credit_reward_aliases(alias TEXT PRIMARY KEY, reward TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS credit_bonus_lots(id TEXT PRIMARY KEY, owner TEXT NOT NULL, remaining INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS credit_bonus_expiry ON credit_bonus_lots(owner,expires);
    CREATE TABLE IF NOT EXISTS credit_hold_bonus(hold TEXT NOT NULL, lot TEXT NOT NULL, amount INTEGER NOT NULL, PRIMARY KEY(hold,lot));
    CREATE TABLE IF NOT EXISTS credit_reset_settings(id INTEGER PRIMARY KEY CHECK(id=1), days INTEGER NOT NULL, revision INTEGER NOT NULL, updated INTEGER NOT NULL, actor TEXT);
    INSERT OR IGNORE INTO credit_reset_settings VALUES(1,7,1,0,NULL);
    CREATE TABLE IF NOT EXISTS credit_reset_audit(revision INTEGER PRIMARY KEY, days INTEGER NOT NULL, updated INTEGER NOT NULL, actor TEXT NOT NULL);
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
const entry = (store, id, owner, delta, kind, operation = null, created = Date.now()) => {
  requireValue(Number.isSafeInteger(delta), 'Invalid credit amount.');
  store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run(id, owner, delta, kind, operation, created);
};
const balance = (store, owner) => store.db.prepare('SELECT coalesce(sum(delta),0) AS balance FROM credit_ledger WHERE owner=?').get(owner).balance;
// Fixed UTC periods: seven days ends Monday 00:00, one day ends at midnight.
// A grant keeps its promised boundary when an administrator changes the policy.
const MONDAY = Date.UTC(1970, 0, 5);
export function creditResetSettings(store, now = Date.now()) {
  const row = store.db.prepare('SELECT * FROM credit_reset_settings WHERE id=1').get();
  const duration = row.days * DAY;
  return { days: row.days, revision: row.revision, updated: row.updated,
    nextAt: MONDAY + (Math.floor((now - MONDAY) / duration) + 1) * duration,
    timezone: 'UTC', appliesTo: 'new_daily_credits' };
}
export function updateCreditResetSettings(store, actor, body, now = Date.now()) {
  requireValue(body && Number.isSafeInteger(body.days) && body.days >= 1 && body.days <= 365, 'Choose a reset period between 1 and 365 days.');
  requireValue(Number.isSafeInteger(body.revision), 'Reload credit settings before saving.', 409);
  return creditTransaction(store, () => {
    const current = creditResetSettings(store, now);
    requireValue(body.revision === current.revision, 'Credit settings changed. Reload before saving.', 409);
    if (body.days === current.days) return current;
    const revision = current.revision + 1;
    store.db.prepare('UPDATE credit_reset_settings SET days=?,revision=?,updated=?,actor=? WHERE id=1').run(body.days, revision, now, actor);
    store.db.prepare('INSERT INTO credit_reset_audit VALUES(?,?,?,?)').run(revision, body.days, now, actor);
    return creditResetSettings(store, now);
  });
}
function expireDailyCredits(store, owner, now) {
  if (!owner) return;
  for (const lot of store.db.prepare('SELECT * FROM credit_bonus_lots WHERE owner=? AND remaining>0 AND expires<=?').all(owner, now)) {
    entry(store, `expire:${lot.id}`, owner, -lot.remaining, 'daily_expired', lot.id, now);
    store.db.prepare('UPDATE credit_bonus_lots SET remaining=0 WHERE id=?').run(lot.id);
  }
}
function welcome(store, owner) {
  store.requireActive(owner);
  // A deleted/recreated provider account does not receive another welcome grant.
  const identity = store.db.prepare('SELECT id FROM identities WHERE account=?').get(owner)?.id || hash(owner);
  if (store.db.prepare('INSERT OR IGNORE INTO credit_welcome VALUES(?)').run(identity).changes) {
    entry(store, `welcome:${identity}`, owner, creditPolicy.welcome, 'welcome');
  }
}
export const creditsEnabled=(config,owner)=>config.credits?.enabled===true && (!Array.isArray(config.credits.accounts)||config.credits.accounts.includes(owner));
// Earning can be opened independently of private-import charges and paid quotas.
// Never remove the spending rollout allowlist merely to repair a zero balance.
export const creditEarningEnabled=(config,owner)=>config.credits?.earningEnabled===true || creditsEnabled(config,owner);
const dailyEnabled = (config, owner) => !!owner && config.credits?.dailyBonusEnabled === true && creditEarningEnabled(config, owner);

// Authenticated app activity earns one grant on the server's UTC day. The local
// account stays primary across devices and linked sign-in methods. Hashed provider
// aliases prevent deletion/re-registration from claiming that same day twice.
export function grantDailyCredits(store, owner, config, now = Date.now()) {
  if (!dailyEnabled(config, owner)) return 0;
  requireValue(Number.isSafeInteger(now) && now >= 0, 'Invalid credit date.');
  const day = Math.floor(now / DAY) * DAY;
  return creditTransaction(store, () => {
    store.requireActive(owner);
    const identities = [...new Set([hash(owner), ...store.db.prepare('SELECT id FROM identities WHERE account=?').all(owner).map(row => row.id)])];
    const lookup = store.db.prepare('SELECT 1 FROM credit_daily_days WHERE identity=? AND day=?');
    const claimed = identities.some(identity => lookup.get(identity, day));
    const remember = store.db.prepare('INSERT OR IGNORE INTO credit_daily_days VALUES(?,?)');
    for (const identity of identities) remember.run(identity, day);
    if (claimed) return 0;
    const id = `daily:${hash(owner)}:${day}`;
    entry(store, id, owner, creditPolicy.dailyBonus, 'daily_bonus', null, now);
    store.db.prepare('INSERT INTO credit_bonus_lots VALUES(?,?,?,?)').run(id, owner, creditPolicy.dailyBonus, creditResetSettings(store, now).nextAt);
    return creditPolicy.dailyBonus;
  });
}
export function creditSummary(store, owner, config, now = Date.now()) {
  const enabled = creditsEnabled(config,owner);
  const earningEnabled = creditEarningEnabled(config,owner);
  return creditTransaction(store, () => {
    if (earningEnabled && owner) welcome(store, owner);
    expireDailyCredits(store, owner, now);
    grantDailyCredits(store, owner, config, now);
    const held = owner ? store.db.prepare("SELECT coalesce(sum(amount),0) AS n FROM credit_holds WHERE owner=? AND state='held'").get(owner).n : 0;
    const reset = creditResetSettings(store, now);
    const expiring = owner ? store.db.prepare('SELECT coalesce(sum(remaining),0) AS amount,min(expires) AS nextAt FROM credit_bonus_lots WHERE owner=? AND remaining>0').get(owner) : { amount: 0, nextAt: null };
    return { enabled, earningEnabled, policy: creditPolicy, daily: { enabled: dailyEnabled(config, owner), amount: creditPolicy.dailyBonus, nextAt: (Math.floor(now / DAY) + 1) * DAY, resetDays: reset.days, resetsAt: reset.nextAt }, expiring, maxPDF: config.maxPages || 30, balance: owner ? balance(store, owner) : 0, held,
      // Installed clients fall back to displaying unknown kinds verbatim. Keep
      // the new entry readable there while retaining its stable ledger code.
      history: owner ? store.db.prepare('SELECT l.delta,l.kind,l.created,b.expires AS expiresAt FROM credit_ledger l LEFT JOIN credit_bonus_lots b ON b.id=l.id WHERE l.owner=? ORDER BY l.created DESC,l.rowid DESC LIMIT 40').all(owner).map(row => ['daily_bonus','daily_expired'].includes(row.kind) ? { ...row, kind: row.kind === 'daily_bonus' ? 'Daily credits' : 'Unused daily credits expired', code: row.kind } : row) : [] };
  });
}
export function reserveImport(store, config, job, limit, now = Date.now()) {
  if (!['import', 'attachment', 'markdown'].includes(job.kind)) return;
  if (creditEarningEnabled(config,job.owner)) {
    welcome(store, job.owner);
    grantDailyCredits(store, job.owner, config, now);
    store.db.prepare('INSERT OR IGNORE INTO credit_candidates VALUES(?,?,?)').run(job.id, job.owner, job.sourceDigest || null);
  }
  if (!creditsEnabled(config,job.owner)) return;
  const amount = job.sharing === 'shared' ? 0 : (job.kind === 'import' || job.ext === 'pdf' ? job.pages || config.maxPages || 30 : 1);
  if (amount) requireValue(Number.isSafeInteger(limit) && limit >= amount, 'Confirm the private import credit cost in the latest app.', 428);
  job.credit = { version: creditPolicy.version, amount, attempt: 0 };
  hold(store, job, now);
}
function hold(store, job, now = Date.now()) {
  const { amount, attempt } = job.credit, id = `${job.id}:${attempt}`;
  if (!amount || store.db.prepare('SELECT 1 FROM credit_holds WHERE id=?').get(id)) return;
  expireDailyCredits(store, job.owner, now);
  requireValue(balance(store, job.owner) >= amount, 'Not enough credits for this private import. Earn credits by sharing an approved paper.', 402);
  let remaining = amount;
  for (const lot of store.db.prepare('SELECT * FROM credit_bonus_lots WHERE owner=? AND remaining>0 ORDER BY expires,id').all(job.owner)) {
    const used = Math.min(remaining, lot.remaining);
    if (!used) break;
    store.db.prepare('UPDATE credit_bonus_lots SET remaining=remaining-? WHERE id=?').run(used, lot.id);
    store.db.prepare('INSERT INTO credit_hold_bonus VALUES(?,?,?)').run(id, lot.id, used);
    remaining -= used;
  }
  entry(store, `hold:${id}`, job.owner, -amount, 'private_import', job.id);
  store.db.prepare("INSERT INTO credit_holds VALUES(?,?,?,'held',0)").run(id, job.owner, amount);
}
export function retryImportCredits(store, job, limit, now = Date.now()) {
  if (!job.credit?.amount) return;
  requireValue(Number.isSafeInteger(limit) && limit >= job.credit.amount, 'Confirm the private import credit cost before retrying.', 428);
  job.credit.attempt++;
  hold(store, job, now);
}
export function finishImportCredits(store, job, success, now = Date.now()) {
  if (!job.credit?.amount) return;
  const id = `${job.id}:${job.credit.attempt}`, saved = store.db.prepare('SELECT * FROM credit_holds WHERE id=?').get(id);
  if (!saved || saved.state !== 'held') return;
  const spent = success && !job.reused ? (job.kind === 'import' || job.ext === 'pdf' ? job.pages : 1) : 0;
  requireValue(Number.isSafeInteger(spent) && spent >= 0 && spent <= saved.amount, 'The credit receipt needs reconciliation.', 409);
  const refund = saved.amount - spent;
  if (refund) entry(store, `refund:${id}`, job.owner, refund, success ? 'unused_reservation' : 'failed_import', job.id, now);
  let bonusSpent = spent, expiredRefund = 0;
  for (const lot of store.db.prepare('SELECT a.amount,b.id,b.expires FROM credit_hold_bonus a JOIN credit_bonus_lots b ON b.id=a.lot WHERE a.hold=? ORDER BY b.expires,b.id').all(id)) {
    const used = Math.min(bonusSpent, lot.amount), returned = lot.amount - used;
    bonusSpent -= used;
    if (lot.expires <= now) expiredRefund += returned;
    else store.db.prepare('UPDATE credit_bonus_lots SET remaining=remaining+? WHERE id=?').run(returned, lot.id);
  }
  if (expiredRefund) entry(store, `expire-refund:${id}`, job.owner, -expiredRefund, 'daily_expired', job.id, now);
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
  if (config.credits?.enabled !== true && config.credits?.earningEnabled !== true) return;
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
  store.db.prepare('DELETE FROM credit_hold_bonus WHERE hold IN (SELECT id FROM credit_holds WHERE owner=?)').run(owner);
  store.db.prepare('DELETE FROM credit_bonus_lots WHERE owner=?').run(owner);
  for (const table of ['credit_ledger', 'credit_holds', 'credit_candidates']) store.db.prepare(`DELETE FROM ${table} WHERE owner=?`).run(owner);
  // Keep only hashed welcome/daily/reward deduplication, never document text or URLs.
}

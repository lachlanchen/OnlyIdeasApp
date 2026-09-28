import {initReadingSpace,recordActivity} from './reading-space.mjs';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hash, sections, requireValue } from './domain.mjs';
import { initCredits, creditTransaction } from './credits.mjs';
import { initBilling } from './billing-ledger.mjs';
import { initImportReuse, indexPaper } from './import-reuse.mjs';
export class Store {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.directory = directory;
    this.db = new DatabaseSync(join(directory, 'state.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS papers(id TEXT PRIMARY KEY, owner TEXT NOT NULL, visibility TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, user TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth(id TEXT PRIMARY KEY, body TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, owner TEXT NOT NULL, dedupe TEXT NOT NULL, state TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL, UNIQUE(owner,dedupe));
      CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY, paper TEXT NOT NULL, owner TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notes(owner TEXT NOT NULL, paper TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(owner,paper));
      CREATE TABLE IF NOT EXISTS artifact_requests(key TEXT PRIMARY KEY, paper TEXT NOT NULL, revision TEXT NOT NULL, job TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS job_subscriptions(owner TEXT NOT NULL, job TEXT NOT NULL, PRIMARY KEY(owner,job));
      CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY, owner TEXT NOT NULL, digest TEXT NOT NULL, body TEXT NOT NULL, UNIQUE(owner,digest));
      CREATE TABLE IF NOT EXISTS artifacts(id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS deleted_accounts(id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS identities(id TEXT PRIMARY KEY, account TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS blocks(owner TEXT NOT NULL, blocked TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY(owner,blocked));
      CREATE TABLE IF NOT EXISTS suspensions(id TEXT PRIMARY KEY, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS terms(owner TEXT PRIMARY KEY, version TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS paper_visibility ON papers(visibility,owner);
      CREATE INDEX IF NOT EXISTS job_state ON jobs(state);`);
    initCredits(this);
    initReadingSpace(this);
    initBilling(this);
    creditTransaction(this, () => initImportReuse(this));
  }
  active(id) { return !this.db.prepare('SELECT id FROM deleted_accounts WHERE id=?').get(id) && !this.db.prepare('SELECT id FROM suspensions WHERE id=?').get(id); }
  requireActive(id) { requireValue(this.active(id), 'This account is no longer available.', 403); }
  identity(providerID) {
    const key = hash(providerID);
    const previous = this.db.prepare('SELECT account FROM identities WHERE id=?').get(key)?.account || providerID;
    if (this.db.prepare('SELECT id FROM deleted_accounts WHERE id=?').get(previous)) {
      const account = randomUUID();
      this.db.prepare('INSERT OR REPLACE INTO identities VALUES(?,?)').run(key, account);
      return account;
    }
    this.requireActive(previous); return previous;
  }
  blocked(owner, other) { return !!owner && !!this.db.prepare('SELECT 1 FROM blocks WHERE (owner=? AND blocked=?) OR (owner=? AND blocked=?)').get(owner,other,other,owner); }
  savePaper(p) { return creditTransaction(this, () => { this.requireActive(p.owner); const { sections: derived, ...record } = p; this.db.prepare('INSERT OR REPLACE INTO papers VALUES(?,?,?,?)').run(p.id, p.owner, p.visibility, JSON.stringify(record)); indexPaper(this,p); return p; }); }
  parsePaper(body) { const p = JSON.parse(body); return { ...p, sections: sections(p.mmd) }; }
  paper(id) { const r = this.db.prepare('SELECT body FROM papers WHERE id=?').get(id); return r ? this.parsePaper(r.body) : null; }
  papers(user) { return this.db.prepare('SELECT body FROM papers WHERE visibility=? OR owner=? ORDER BY rowid DESC').all('public', user || '').map(r => this.parsePaper(r.body)); }
  session(token) {
    if (!token) return null;
    const row = this.db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(token), Date.now());
    if (!row) return null;
    this.db.prepare('UPDATE sessions SET expires=? WHERE id=?').run(Date.now() + 90 * 86400_000, row.id);
    const user = JSON.parse(row.user); return this.active(user.id) ? user : null;
  }
  createSession(user) { this.requireActive(user.id); const token = randomUUID() + randomUUID(); this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), JSON.stringify(user), Date.now() + 90 * 86400_000); return token; }
  job(id) { const r = this.db.prepare('SELECT body FROM jobs WHERE id=?').get(id); return r ? JSON.parse(r.body) : null; }
  saveJob(j) { this.requireActive(j.owner); const previous=this.job(j.id); this.db.prepare('INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?,?)').run(j.id, j.owner, j.dedupe, j.state, JSON.stringify(j), j.created); if(['import','attachment'].includes(j.kind)&&!previous)recordActivity(this,j.owner,'fetch',j.id,{},'job:'+j.id); return j; }
  jobs(owner) { return this.db.prepare('SELECT body FROM jobs WHERE owner=? OR id IN (SELECT job FROM job_subscriptions WHERE owner=?) ORDER BY created DESC LIMIT 80').all(owner,owner).map(r => JSON.parse(r.body)); }
  existing(owner, dedupe) { const r = this.db.prepare('SELECT body FROM jobs WHERE owner=? AND dedupe=?').get(owner, dedupe); return r ? JSON.parse(r.body) : null; }
  pending() { return this.db.prepare("SELECT body FROM jobs WHERE state IN ('queued','running') AND owner NOT IN (SELECT id FROM suspensions) AND owner NOT IN (SELECT id FROM deleted_accounts) ORDER BY created LIMIT 1").all().map(r => JSON.parse(r.body))[0]; }
  claimJob() {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row=this.db.prepare("SELECT body FROM jobs WHERE (state='queued' OR (state='running' AND coalesce(json_extract(body,'$.leaseUntil'),0)<?)) AND owner NOT IN (SELECT id FROM suspensions) AND owner NOT IN (SELECT id FROM deleted_accounts) ORDER BY created LIMIT 1").get(Date.now());
      let job=row?JSON.parse(row.body):null;
      if(job){job={...job,state:'running',lease:randomUUID(),leaseUntil:Date.now()+180_000};this.saveJob(job);}
      this.db.exec('COMMIT');return job;
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  close() { this.db.close(); }
}

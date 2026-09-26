import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hash, sections } from './domain.mjs';
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
      CREATE TABLE IF NOT EXISTS artifacts(id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS paper_visibility ON papers(visibility,owner);
      CREATE INDEX IF NOT EXISTS job_state ON jobs(state);`);
  }
  savePaper(p) { const { sections: derived, ...record } = p; this.db.prepare('INSERT OR REPLACE INTO papers VALUES(?,?,?,?)').run(p.id, p.owner, p.visibility, JSON.stringify(record)); return p; }
  parsePaper(body) { const p = JSON.parse(body); return { ...p, sections: sections(p.mmd) }; }
  paper(id) { const r = this.db.prepare('SELECT body FROM papers WHERE id=?').get(id); return r ? this.parsePaper(r.body) : null; }
  papers(user) { return this.db.prepare('SELECT body FROM papers WHERE visibility=? OR owner=? ORDER BY rowid DESC').all('public', user || '').map(r => this.parsePaper(r.body)); }
  session(token) {
    if (!token) return null;
    const row = this.db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(token), Date.now());
    if (!row) return null;
    this.db.prepare('UPDATE sessions SET expires=? WHERE id=?').run(Date.now() + 90 * 86400_000, row.id);
    return JSON.parse(row.user);
  }
  createSession(user) { const token = randomUUID() + randomUUID(); this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token), JSON.stringify(user), Date.now() + 90 * 86400_000); return token; }
  job(id) { const r = this.db.prepare('SELECT body FROM jobs WHERE id=?').get(id); return r ? JSON.parse(r.body) : null; }
  saveJob(j) { this.db.prepare('INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?,?)').run(j.id, j.owner, j.dedupe, j.state, JSON.stringify(j), j.created); return j; }
  jobs(owner) { return this.db.prepare('SELECT body FROM jobs WHERE owner=? ORDER BY created DESC LIMIT 40').all(owner).map(r => JSON.parse(r.body)); }
  existing(owner, dedupe) { const r = this.db.prepare('SELECT body FROM jobs WHERE owner=? AND dedupe=?').get(owner, dedupe); return r ? JSON.parse(r.body) : null; }
  pending() { return this.db.prepare("SELECT body FROM jobs WHERE state IN ('queued','running') ORDER BY created LIMIT 1").all().map(r => JSON.parse(r.body))[0]; }
  close() { this.db.close(); }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { hash } from '../server/domain.mjs';
import { deleteAccount } from '../server/community.mjs';
import { createChats } from '../server/chat.mjs';
import { creditSummary, creditTransaction, grantDailyCredits, reserveImport, finishImportCredits } from '../server/credits.mjs';

const config = { credits: { earningEnabled: true, dailyBonusEnabled: true } };
const midnight = Date.UTC(2026, 9, 29), day = 86400_000;
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'onlyideas-daily-credits-')), store = new Store(dir);
  t.after(() => { store.close(); rmSync(dir, { recursive: true, force: true }); });
  return { store, dir };
}
const entries = store => store.db.prepare("SELECT * FROM credit_ledger WHERE kind='daily_bonus' ORDER BY created").all();

test('daily credits persist, repeat once per UTC day, carry over, and never backfill missed days', t => {
  const { store, dir } = fixture(t);
  assert.equal(grantDailyCredits(store, 'reader', config, midnight - 1), 100);
  assert.equal(grantDailyCredits(store, 'reader', config, midnight), 100);
  assert.equal(grantDailyCredits(store, 'reader', config, midnight + day - 1), 0);
  const reopened = new Store(dir);
  try { assert.equal(grantDailyCredits(reopened, 'reader', config, midnight + 12), 0); }
  finally { reopened.close(); }
  assert.equal(grantDailyCredits(store, 'reader', config, midnight + 9 * day), 100);
  assert.equal(creditSummary(store, 'reader', {}).balance, 300);
  assert.equal(entries(store).length, 3);
});

test('daily earning preserves rollout, accounts, paid balances, holds and refunds', t => {
  const { store } = fixture(t), spending = { credits: { enabled: true, accounts: ['pilot'], ...config.credits } };
  store.db.prepare('INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)').run('paid-fixture', 'pilot', 200, 'subscription', 'receipt-fixture', 1);
  const initial = creditSummary(store, 'pilot', spending);
  assert.equal(initial.balance, 330); assert.equal(initial.daily.amount, 100); assert.equal(initial.daily.enabled, true);
  const job = { id: randomUUID(), owner: 'pilot', kind: 'import', sharing: 'private', pages: 20 };
  creditTransaction(store, () => reserveImport(store, spending, job, 20));
  assert.equal(creditSummary(store, 'pilot', spending).balance, 310);
  creditTransaction(store, () => finishImportCredits(store, job, false));
  creditTransaction(store, () => finishImportCredits(store, job, false));
  assert.equal(creditSummary(store, 'pilot', spending).balance, 330);
  const ordinary = creditSummary(store, 'ordinary', spending);
  assert.equal(ordinary.balance, 130); assert.equal(ordinary.enabled, false);
  assert.equal(store.db.prepare("SELECT delta,operation FROM credit_ledger WHERE id='paid-fixture'").get().delta, 200);
  assert.equal(creditSummary(store, 'ordinary', {}).balance, 130);
});

test('a private import can use the daily grant before opening the balance screen', t => {
  const { store } = fixture(t), spending = { credits: { ...config.credits, enabled: true } };
  const job = { id: randomUUID(), owner: 'new-reader', kind: 'import', sharing: 'private', pages: 80 };
  creditTransaction(store, () => reserveImport(store, spending, job, 80));
  assert.equal(creditSummary(store, 'new-reader', {}).balance, 50);
  assert.equal(entries(store).length, 1);
  creditTransaction(store, () => finishImportCredits(store, job, true));
  assert.equal(creditSummary(store, 'new-reader', spending).balance, 50);
});

test('anonymous, disabled, suspended and deleted accounts cannot claim', t => {
  const { store } = fixture(t);
  for (const c of [{}, { credits: { earningEnabled: true } }, { credits: { dailyBonusEnabled: true } }, { credits: { enabled: true, accounts: [], dailyBonusEnabled: true } }]) {
    assert.equal(grantDailyCredits(store, 'reader', c, midnight), 0);
  }
  assert.equal(grantDailyCredits(store, null, config, midnight), 0);
  store.db.prepare('INSERT INTO suspensions VALUES(?,?)').run('blocked', midnight);
  store.db.prepare('INSERT INTO deleted_accounts VALUES(?)').run('deleted');
  for (const owner of ['blocked', 'deleted']) assert.throws(() => grantDailyCredits(store, owner, config, midnight), /no longer/);
  assert.equal(entries(store).length, 0);
});

test('aliases, deletion and provider re-registration cannot grant a second daily credit', async t => {
  const { store } = fixture(t); createChats(store, {});
  const owner = 'github:daily-fixture';
  assert.equal(grantDailyCredits(store, owner, config, midnight), 100);
  store.db.prepare('INSERT INTO identities VALUES(?,?)').run(hash('apple:linked-fixture'), owner);
  assert.equal(grantDailyCredits(store, owner, config, midnight), 0);
  await deleteAccount(store, { id: owner });
  const recreated = store.identity(owner);
  assert.notEqual(recreated, owner);
  assert.equal(grantDailyCredits(store, recreated, config, midnight), 0);
  assert.equal(grantDailyCredits(store, recreated, config, midnight + day), 100);
  assert.equal(creditSummary(store, recreated, {}).balance, 100);
});

test('failed grant rolls back its deduplication marker and later retry succeeds once', t => {
  const { store } = fixture(t);
  store.db.exec("CREATE TRIGGER fail_daily BEFORE INSERT ON credit_ledger WHEN NEW.kind='daily_bonus' BEGIN SELECT RAISE(ABORT,'fixture write failed'); END");
  assert.throws(() => grantDailyCredits(store, 'reader', config, midnight), /fixture write failed/);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM credit_daily_days').get().n, 0);
  store.db.exec('DROP TRIGGER fail_daily');
  assert.equal(grantDailyCredits(store, 'reader', config, midnight), 100);
  assert.equal(grantDailyCredits(store, 'reader', config, midnight), 0);
});

test('independent API processes grant only once for the same account and day', async t => {
  const { store, dir } = fixture(t), exec = promisify(execFile);
  const script = `import {Store} from './server/store.mjs';import {grantDailyCredits} from './server/credits.mjs';const s=new Store(process.argv[1]);try{console.log(grantDailyCredits(s,'reader',JSON.parse(process.argv[2]),Number(process.argv[3])))}finally{s.close()}`;
  const results = await Promise.all(Array.from({ length: 6 }, () => exec(process.execPath, ['--input-type=module', '-e', script, dir, JSON.stringify(config), String(midnight)])));
  assert.deepEqual(results.map(r => Number(r.stdout.trim())).sort((a, b) => a - b), [0, 0, 0, 0, 0, 100]);
  assert.equal(entries(store).length, 1);
});

test('existing web/native session and balance endpoints automatically grant without trusting client amount, date or owner', async t => {
  const { store } = fixture(t), origin = 'http://127.0.0.1:4182';
  const app = createApp(store, { ...config, origin }, { worker: false });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  const web = store.createSession({ id: 'web-reader' }), native = store.createSession({ id: 'native-reader' });
  const get = async (path, headers = {}) => { const r = await fetch(base + path, { headers }); return { status: r.status, data: await r.json() }; };
  assert.equal((await get('/api/session')).data.user, null);
  assert.equal((await get('/api/credits')).status, 401); assert.equal(entries(store).length, 0);
  const webHeaders = { Origin: origin, Cookie: 'onlyideas-local=' + web };
  assert.equal((await get('/api/session?amount=100000&owner=another&day=2099-01-01', webHeaders)).status, 200);
  await get('/api/session', webHeaders);
  const summary = (await get('/api/credits', webHeaders)).data;
  assert.equal(summary.balance, 130); assert.equal(summary.daily.amount, 100);
  assert.equal(summary.history.find(e => e.code === 'daily_bonus').kind, 'Daily credits');
  const nativeHeaders = { Origin: 'capacitor://localhost', 'X-OnlyIdeas-Client': 'native', Authorization: 'Bearer ' + native };
  assert.equal((await get('/api/session', nativeHeaders)).data.user.id, 'native-reader');
  assert.equal((await get('/api/credits', nativeHeaders)).data.balance, 130);
  assert.equal(entries(store).length, 2);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM credit_ledger WHERE owner=?').get('another').n, 0);
});

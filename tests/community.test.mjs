import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { makePaper } from '../server/domain.mjs';
import { moderate } from '../server/community.mjs';

test('public moderation, terms, block/unblock and permanent deletion across sessions and in-flight jobs', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'onlyideas-community-'));
  const store = new Store(directory), origin = 'http://127.0.0.1:4182';
  const app = createApp(store, { origin, agentWorkerToken: 'test-worker' }, { worker: false });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const users = ['author','reader','other'].map(id => ({ id, name: id, login: id }));
  const tokens = users.map(u => store.createSession(u));
  const call = async (path, who = 0, method = 'GET', body) => {
    const r = await fetch(`http://127.0.0.1:${app.address().port}/api${path}`, { method,
      headers: { Origin: origin, Cookie: `onlyideas-local=${tokens[who]}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: await r.json() };
  };
  try {
    const p = makePaper({ id: randomUUID(), owner: 'author', title: 'Public paper', mmd: '# A\n\nText' });
    p.visibility = 'public'; store.savePaper(p);
    const c = { id: randomUUID(), text: 'A thoughtful question', revision: p.revision };
    assert.equal((await call(`/papers/${p.id}/comments`, 1, 'POST', c)).status, 428);
    assert.equal((await call(`/papers/${p.id}/comments`, 1, 'POST', { ...c, acceptTerms: true })).status, 201);
    assert.equal((await call(`/papers/${p.id}/comments`, 0)).body.comments.length, 0);
    assert.equal((await call(`/papers/${p.id}/comments`, 1)).body.comments[0].pending, true);
    moderate(store, 'approve-comment', c.id);
    assert.equal((await call(`/papers/${p.id}/comments`, 0)).body.comments.length, 1);
    assert.equal((await call(`/comments/${c.id}/block`, 0, 'POST', {})).status, 200);
    assert.equal((await call(`/papers/${p.id}/comments`, 0)).body.comments.length, 0);
    assert.equal((await call(`/papers/${p.id}`, 1)).status, 404, 'blocks prevent interaction in both directions');
    const blocked = (await call('/blocks')).body.blocks;
    await call(`/blocks/${blocked[0].id}`, 0, 'DELETE');
    assert.equal((await call(`/papers/${p.id}/comments`, 0)).body.comments.length, 1);
    await call(`/comments/${c.id}/report`, 0, 'POST', { reason: 'Test report' });
    assert.equal(store.db.prepare('SELECT count(*) n FROM reports').get().n, 1);
    assert.equal((await call('/reports', 0, 'POST', { reason: '' })).status, 400);
    assert.equal((await call('/reports', 0, 'POST', { context: 'AI response test', reason: 'This response needs review.' })).status, 201);
    assert.equal(store.db.prepare('SELECT count(*) n FROM reports').get().n, 2);
    const chat = (await call('/chats', 0, 'POST', {})).body.chat;
    await call(`/chats/${chat.id}/messages`, 0, 'POST', { text: 'Find a paper' });
    const job = { id: randomUUID(), owner: 'author', dedupe: 'active', state: 'running', created: Date.now(), kind: 'import' };
    store.saveJob(job);
    for (const [kind,id] of [['papers',p.id],['jobs',job.id]]) {
      mkdirSync(join(directory,kind,id), { recursive: true }); writeFileSync(join(directory,kind,id,'private'), 'private');
    }
    const secondSession = store.createSession(users[0]);
    assert.equal((await call('/account', 0, 'DELETE', {})).status, 400);
    assert.equal((await call('/account', 0, 'DELETE', { confirm: 'DELETE' })).status, 200);
    assert.equal(store.session(tokens[0]), null); assert.equal(store.session(secondSession), null);
    assert.equal(store.paper(p.id), null); assert.equal(store.job(job.id), null);
    assert.equal(store.db.prepare('SELECT count(*) n FROM chats').get().n, 0);
    assert.equal(store.db.prepare('SELECT count(*) n FROM chat_messages').get().n, 0);
    assert.equal(store.db.prepare('SELECT count(*) n FROM chat_tasks').get().n, 0);
    assert.equal(existsSync(join(directory,'papers',p.id)), false);
    assert.equal(existsSync(join(directory,'jobs',job.id)), false);
    assert.throws(() => store.saveJob(job), /no longer available/);
    assert.throws(() => store.savePaper(p), /no longer available/);
    assert.throws(() => store.createSession(users[0]), /no longer available/);
    const fresh = store.identity('author'); assert.notEqual(fresh, 'author');
    assert.equal(store.identity('author'), fresh, 're-registration has one fresh identity');
    assert.equal(store.papers(fresh).length, 0);
    assert.equal(store.session(tokens[2]).id, 'other', 'unrelated accounts preserved');
    moderate(store, 'suspend', 'other'); assert.equal(store.session(tokens[2]), null);
    assert.throws(() => store.identity('other'), /no longer available/);
  } finally { await new Promise(resolve => app.close(resolve)); store.close(); rmSync(directory, { recursive: true, force: true }); }
});

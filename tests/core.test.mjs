import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { zipSync, strToU8 } from 'fflate';
import { makePaper, sections, mayPublish } from '../server/domain.mjs';
import { unpackMMD } from '../server/archive.mjs';
import { isPublicIP, downloadPublic } from '../server/network.mjs';
import { Store } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { seed } from '../server/seed.mjs';

test('sections preserve complete TeX, figures, repeated headings and stable IDs', () => {
  const mmd = '# A\n\nText\n\n## Equation\n\n\\begin{align}\na&=b\\\\\nc&=d\n\\end{align}\n\n![x](figures/a.png)';
  const first = sections(mmd), next = sections('# New opening\n\n' + mmd);
  assert.equal(first[1].text, next[2].text); assert.equal(first[1].id, next[2].id);
  assert.match(first[1].text, /\\begin\{align\}/); assert.match(first[1].text, /figures\/a.png/);
  const repeated = sections('# A\n\ntext\n\n# A\n\ntext'); assert.notEqual(repeated[0].id, repeated[1].id);
  assert.equal(sections('\\section*{One}\n\nText\n\n\\section*{Two}\n\nOther').length, 2);
});
test('public IP boundary rejects localhost, metadata, private, mapped and reserved addresses', () => {
  for (const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','::1','::ffff:127.0.0.1','fc00::1','fe80::1','0.0.0.0','224.0.0.1']) assert.equal(isPublicIP(ip), false, ip);
  assert.equal(isPublicIP('8.8.8.8'), true);
});
test('downloads reject unsafe schemes, credentials, ports and DNS before a connection', async () => {
  for (const url of ['http://example.com/x.pdf','https://user:pass@example.com/x','https://example.com:9443/x']) await assert.rejects(downloadPublic(url), /HTTPS/);
  await assert.rejects(downloadPublic('https://example.com/paper.pdf', { resolver: async () => [{ address: '127.0.0.1', family: 4 }] }), /not a public/);
});
test('archive retains figures with content addresses and rejects traversal and missing figures', () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const archive = zipSync({ 'root/paper.mmd': strToU8('# A\n\n![figure](./images/a.png)\n\n$x^2$'), 'root/images/a.png': png });
  const r = unpackMMD(archive); assert.equal(r.assets.length, 1); assert.match(r.mmd, /figures\/[a-f0-9]+\.png/); assert.match(r.mmd, /\$x\^2\$/);
  assert.throws(() => unpackMMD(zipSync({ '../bad.mmd': strToU8('x') })), /Unsafe path/);
  assert.throws(() => unpackMMD(zipSync({ 'p.mmd': strToU8('![x](images/missing.png)') })), /missing/);
  assert.throws(() => unpackMMD(zipSync({ 'p.mmd': strToU8('![x](https://cdn.mathpix.com/cropped/a.png)') })), /temporary/);
});
test('publication needs explicit permission, license and source', () => {
  const p = makePaper({ id: 'a', title: 'A', owner: 'me', mmd: 'text' });
  assert.throws(() => mayPublish(p, false), /Confirm/); assert.throws(() => mayPublish(p, true), /license/);
  p.license = 'CC-BY-4.0'; assert.throws(() => mayPublish(p, true), /source/);
  p.source = 'https://example.org/paper'; mayPublish(p, true);
});

test('API enforces ownership, CSRF, persistent sessions, comment idempotency, private publication threads and job privacy', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlyideas-test-')), store = new Store(dir); seed(store);
  const origin = 'http://127.0.0.1:4182';
  const app = createApp(store, { origin, development: true }, { worker: false });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.address().port}`;
  const a = store.createSession({ id: 'a', name: 'Reader A', login: 'a' }), b = store.createSession({ id: 'b', name: 'Reader B', login: 'b' });
  const call = async (path, { token, method = 'GET', body, from = origin } = {}) => {
    const r = await fetch(base + '/api' + path, { method, headers: { Origin: from, ...(token ? { Cookie: `onlyideas-local=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, data: await r.json(), headers: r.headers };
  };
  try {
    assert.equal((await call('/session', { token: a })).data.user.id, 'a');
    assert.match((await call('/session', { token: a })).headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=7776000/);
    assert.equal((await call('/auth/local', { method: 'POST', body: {}, from: 'https://evil.test' })).status, 403);
    const id = randomUUID();
    assert.equal((await call('/papers/markdown', { method: 'POST', body: { title: 'Private', mmd: '# Private', requestId: id } })).status, 401);
    const created = await call('/papers/markdown', { token: a, method: 'POST', body: { title: 'Private', mmd: '# Private\n\nOriginal text.', requestId: id } });
    assert.equal(created.status, 201); const p = created.data.paper;
    assert.equal((await call(`/papers/${id}`, { token: b })).status, 404);
    assert.equal((await call(`/papers/${id}/export`)).status, 404);
    assert.equal((await call('/papers', { token: b })).data.papers.some(x => x.id === id), false);
    const cid = randomUUID(), body = { id: cid, text: 'My private thought.', revision: p.revision };
    assert.equal((await call(`/papers/${id}/comments`, { token: a, method: 'POST', body })).status, 201);
    assert.equal((await call(`/papers/${id}/comments`, { token: a, method: 'POST', body })).status, 200);
    assert.equal((await call(`/papers/${id}/comments`, { token: a })).data.comments.length, 1);
    p.visibility = 'public'; store.savePaper(p);
    assert.equal((await call(`/papers/${id}/comments`, { token: b })).data.comments.length, 0, 'publishing a paper does not publish earlier private comments');
    assert.equal((await call(`/comments/${cid}`, { token: b, method: 'DELETE' })).status, 403);
    assert.equal((await call(`/papers/${id}/notes`, { token: a, method: 'PUT', body: { text: 'Only A can read this.' } })).status, 200);
    assert.equal((await call(`/papers/${id}/notes`, { token: b })).data.text, '');
    const j = { id: randomUUID(), owner: 'a', kind: 'import', dedupe: 'fixed', state: 'failed', submittedAt: Date.now(), created: Date.now() }; store.saveJob(j);
    assert.equal((await call('/jobs', { token: b })).data.jobs.length, 0);
    assert.equal((await call(`/jobs/${j.id}/retry`, { token: b, method: 'POST', body: {} })).status, 404);
    assert.equal((await call(`/jobs/${j.id}/retry`, { token: a, method: 'POST', body: {} })).status, 409, 'ambiguous charged request cannot be resubmitted');
    assert.equal((await call(`/papers/${id}/assist`, { token: a, method: 'POST', body: { kind: 'digest', language: 'en' } })).status, 503);
    await call('/auth/logout', { token: a, method: 'POST', body: {} }); assert.equal((await call('/session', { token: a })).data.user, null);
  } finally { await new Promise(resolve => app.close(resolve)); store.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('database restart preserves sessions and queued work', () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlyideas-restart-'));
  let store = new Store(dir); const token = store.createSession({ id: 'reader' });
  store.saveJob({ id: randomUUID(), owner: 'reader', dedupe: 'one', state: 'queued', created: Date.now(), kind: 'digest' }); store.close();
  store = new Store(dir); assert.equal(store.session(token).id, 'reader'); assert.equal(store.pending().dedupe, 'one');
  store.close(); rmSync(dir, { recursive: true, force: true });
});

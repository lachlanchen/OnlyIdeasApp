import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { PROFILE_BINDING as B, createProfileAdapter, profileHTTPS, uniqueJSON } from '../server/lazyingart-profile.mjs';

const binding = 'browser_' + 'x'.repeat(40), attemptId = 'f'.repeat(43);
const subject = 'la_' + 'a'.repeat(32), other = 'la_' + 'b'.repeat(32);
const config = { ...B, clientSecret: 'z'.repeat(64), enabled: true };
const sha = v => createHash('sha256').update(v).digest('hex');
const rejects = (promise, code) => assert.rejects(promise, { code });
function fixture(overrides = {}) {
  const s = { time: 1900000000000, requests: [], records: new Map(), active: true, tokenPatch: {}, claimPatch: {}, hook: null };
  s.discovery = { issuer: B.issuer, contract_version: 1,
    authorization_endpoint: B.issuer + '/account/authorize', token_endpoint: B.issuer + '/account/token',
    profile_endpoint: B.issuer + '/account/profile', introspection_endpoint: B.issuer + '/account/introspect',
    revocation_endpoint: B.issuer + '/account/revoke', account_endpoint: B.issuer + '/account',
    response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_post'],
    scopes_supported: ['profile'], providers: { password: true, google: false, apple: false, github: false } };
  s.claims = () => ({ active: true, iss: B.issuer, sub: subject, client_id: B.clientId, aud: B.audience,
    scope: 'profile', token_type: 'Bearer', iat: s.time / 1000, exp: s.time / 1000 + 600, auth_time: s.time / 1000 - 100,
    account: { subject, display_name: '<b>Fixture</b>', account_status: 'active', email_verified: false },
    verified_legacy_identities: [], ...s.claimPatch });
  // Only an in-memory contract fixture; not encrypted storage or process-race proof.
  s.attempts = {
    async create(row) { assert.ok(!s.records.has(row.stateHash)); s.records.set(row.stateHash, row); },
    async consume(query) {
      const row = s.records.get(query.stateHash);
      if (!row || row.bindingHash !== query.bindingHash || row.expiresAt <= query.now
        || !Object.keys(B).every(k => row[k] === query[k])) return null;
      s.records.delete(query.stateHash); return row;
    },
  };
  s.transport = async (method, url, fields) => {
    s.requests.push({ method, url, fields });
    if (method === 'POST') {
      assert.equal(fields.client_id, B.clientId); assert.equal(fields.audience, B.audience);
      assert.equal(fields.client_secret, config.clientSecret);
      assert.ok(!url.includes(config.clientSecret));
    }
    const result = await s.hook?.(method, url, fields);
    if (result !== undefined) return result;
    if (url.endsWith('/.well-known/lazyingart-account')) return structuredClone(s.discovery);
    if (url.endsWith('/token')) return { access_token: 'a'.repeat(43), refresh_token: 'r'.repeat(64), expires_in: 600,
      token_type: 'Bearer', scope: 'profile', ...s.tokenPatch };
    if (url.endsWith('/introspect')) return s.active ? s.claims() : { active: false };
    if (url.endsWith('/revoke')) return { success: true };
    assert.fail('Unrecognised protocol endpoint');
  };
  s.adapter = createProfileAdapter({ ...config, ...overrides }, { attempts: s.attempts, transport: s.transport, now: () => s.time });
  s.begin = async () => {
    const { authorizationUrl } = await s.adapter.begin({ binding, attemptId });
    const auth = new URL(authorizationUrl), state = auth.searchParams.get('state');
    const callback = new URL(B.redirectUri);
    callback.search = new URLSearchParams({ state, code: 'c'.repeat(43), iss: B.issuer }).toString();
    return { auth, callback: callback.href, record: s.records.get(sha(state)) };
  };
  s.posts = path => s.requests.filter(r => r.method === 'POST' && r.url.endsWith(path));
  return s;
}

test('profile adapter defaults off; pinning excludes Bunko and Platform credentials', async () => {
  assert.deepEqual(createProfileAdapter(), { enabled: false });
  const s = fixture({ enabled: false });
  await rejects(s.begin(), 'shared_login_disabled'); assert.equal(s.requests.length, 0);
  await s.adapter.revoke('r'.repeat(64)); // Existing sign-out survives disabled new sign-in.
  assert.equal(s.posts('/revoke').length, 1);
  for (const change of [{ issuer: 'http://chat.lazying.art' }, { clientId: 'bunko-server' },
    { clientId: 'platform-server' }, { audience: 'bunko-service' }, { redirectUri: B.redirectUri + '/' },
    { redirectUri: B.redirectUri + '?extra=1' }, { clientSecret: 'short' }]) {
    assert.throws(() => createProfileAdapter({ ...config, ...change }), { code: 'invalid_configuration' });
  }
});

test('profile-only discovery does not borrow bunko-v1 or a GitHub linking proof', async () => {
  const s = fixture(); await s.begin();
  assert.equal(s.posts('/token').length, 0);
  const original = s.discovery;
  for (const patch of [{ issuer: 'https://evil.example' }, { contract_version: true },
    { token_endpoint: 'https://evil.example/token' }, { account_endpoint: B.issuer + '/wrong' },
    { code_challenge_methods_supported: ['plain'] }, { token_endpoint_auth_methods_supported: ['none'] },
    { scopes_supported: ['coin.summary.read'] }, { providers: { password: 1 } }]) {
    s.discovery = { ...original, ...patch };
    await rejects(s.begin(), 'discovery_not_qualified');
  }
  assert.equal(s.posts('/token').length, 0);
});

test('independent PKCE, exact audience and one-use callback; credentials are not serialized', async () => {
  const s = fixture(), first = await s.begin(), second = await s.begin();
  assert.notEqual(first.record.verifier, second.record.verifier);
  assert.notEqual(first.record.verifier, attemptId);
  assert.equal(first.auth.searchParams.get('code_challenge'), createHash('sha256').update(first.record.verifier).digest('base64url'));
  assert.equal(first.auth.searchParams.get('scope'), 'profile');
  assert.equal(first.auth.searchParams.get('audience'), B.audience);
  assert.equal(first.auth.searchParams.get('redirect_uri'), B.redirectUri);
  await rejects(s.adapter.complete({ callbackUrl: first.callback, binding: 'wrong_' + binding }), 'callback_invalid');
  const results = await Promise.allSettled([1, 2].map(() => s.adapter.complete({ callbackUrl: first.callback, binding })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(s.posts('/token').length, 1);
  const success = results.find(r => r.status === 'fulfilled').value;
  assert.equal(success.identity.subject, subject); assert.equal(success.attemptId, attemptId);
  assert.equal(success.identity.displayName, '<b>Fixture</b>');
  assert.equal(success.identity.email, undefined);
  assert.equal(success.tokens.accessToken, 'a'.repeat(43));
  assert.ok(!JSON.stringify(success).includes('a'.repeat(43)));
  assert.ok(!JSON.stringify(success).includes('r'.repeat(64)));
});

test('callback path, issuer, duplicate/unknown parameters and fragments cannot consume the valid attempt', async () => {
  const s = fixture(), f = await s.begin();
  const callbacks = [f.callback + '&extra=1', f.callback + '&state=' + 'd'.repeat(43),
    f.callback + '&code=' + 'd'.repeat(43), f.callback + '#fragment', f.callback.replace('/callback?', '/callback/?'),
    f.callback.replace('agent.onlyideas.art', 'evil.example'), f.callback.replace('iss=https%3A%2F%2Fchat.lazying.art', 'iss=https%3A%2F%2Fevil.example'),
    f.callback + '&error=access_denied'];
  for (const callbackUrl of callbacks) await rejects(s.adapter.complete({ callbackUrl, binding }), 'callback_invalid');
  await s.adapter.complete({ callbackUrl: f.callback, binding });
  assert.equal(s.posts('/token').length, 1);
});

test('expired and cancelled attempts never exchange and cancellation is single use', async () => {
  const s = fixture(), expired = await s.begin(); s.time += 600000;
  await rejects(s.adapter.complete({ callbackUrl: expired.callback, binding }), 'callback_invalid');
  const f = await s.begin(), callback = new URL(f.callback);
  callback.searchParams.delete('code'); callback.searchParams.set('error', 'access_denied');
  await rejects(s.adapter.complete({ callbackUrl: callback.href, binding }), 'authorization_cancelled');
  await rejects(s.adapter.complete({ callbackUrl: callback.href, binding }), 'callback_invalid');
  assert.equal(s.posts('/token').length, 0);
});

test('strict token envelopes reject added scope, wrong sizes, extra fields and invented lifetimes', async () => {
  for (const tokenPatch of [{ scope: 'profile coin.summary.read' }, { scope: 'profile legacy_identity:github' },
    { expires_in: true }, { expires_in: 601 }, { expires_in: 0 }, { token_type: 'ID' },
    { access_token: 'a'.repeat(44) }, { refresh_token: 'r'.repeat(43) }, { extra: 'provider-secret' }]) {
    const s = fixture(), f = await s.begin(); s.tokenPatch = tokenPatch;
    await rejects(s.adapter.complete({ callbackUrl: f.callback, binding }), 'issuer_response_invalid');
    await rejects(s.adapter.complete({ callbackUrl: f.callback, binding }), 'callback_invalid');
    assert.equal(s.posts('/token').length, 1);
  }
});

test('introspection rejects cross-app, email, legacy proof, timestamps and extra claims', async () => {
  const s = fixture(), good = s.claims();
  for (const claimPatch of [{ aud: 'bunko-service' }, { client_id: 'platform-server' }, { sub: 'reader@example.test' },
    { iss: 'https://other.example' }, { scope: 'profile coin.summary.read' }, { active: 1 }, { exp: true },
    { auth_time: 0 }, { auth_time: good.iat + 1 }, { iat: good.iat + 31 }, { exp: good.iat },
    { exp: good.iat + 601 }, { verified_legacy_identities: [{ provider: 'github' }] }, { provider_token: 'private' },
    { account: { ...good.account, subject: other } }, { account: { ...good.account, email_verified: 'true' } },
    { account: { ...good.account, email: 'reader@example.test' } }, { account: { ...good.account, account_status: 'suspended' } }]) {
    s.claimPatch = claimPatch;
    await rejects(s.adapter.introspect('a'.repeat(43)), 'identity_invalid');
  }
  s.claimPatch = {}; await rejects(s.adapter.introspect('a'.repeat(43), other), 'identity_invalid');
  assert.equal((await s.adapter.introspect('a'.repeat(43), subject)).subject, subject);
});

test('no positive introspection cache; outages are not inactive accounts', async () => {
  const s = fixture(); assert.ok(await s.adapter.introspect('a'.repeat(43)));
  s.active = false; assert.equal(await s.adapter.introspect('a'.repeat(43)), null);
  s.hook = () => { throw new Error('secret upstream URL and response'); };
  await rejects(s.adapter.introspect('a'.repeat(43)), 'issuer_unavailable');
  assert.equal(s.posts('/introspect').length, 2);
});

test('uncertain exchange is never retried, and refresh rejects identity substitution', async () => {
  const s = fixture(), f = await s.begin();
  s.hook = (_, url) => { if (url.endsWith('/token')) throw new Error('sensitive lost reply'); };
  await rejects(s.adapter.complete({ callbackUrl: f.callback, binding }), 'issuer_unavailable');
  await rejects(s.adapter.complete({ callbackUrl: f.callback, binding }), 'callback_invalid');
  assert.equal(s.posts('/token').length, 1);
  await rejects(s.adapter.refreshOnce('r'.repeat(64), subject), 'issuer_unavailable');
  assert.equal(s.posts('/token').length, 2);
  s.hook = null;
  s.claimPatch = { sub: other, account: { ...s.claims().account, subject: other } };
  await rejects(s.adapter.refreshOnce('r'.repeat(64), subject), 'identity_invalid');
  s.claimPatch = {}; assert.equal((await s.adapter.refreshOnce('r'.repeat(64), subject)).identity.subject, subject);
  await rejects(s.adapter.refreshOnce('r'.repeat(64)), 'identity_invalid');
});

test('storage failure and unacknowledged revocation do not leak details or claim success', async () => {
  const s = fixture(); s.attempts.create = () => { throw new Error('private database and verifier'); };
  await rejects(s.begin(), 'attempt_store_unavailable');
  s.hook = (_, url) => url.endsWith('/revoke') ? { success: false } : undefined;
  await rejects(s.adapter.revoke('r'.repeat(64)), 'revocation_unconfirmed');
});

test('JSON parser rejects duplicates including escaped aliases and malformed UTF-8', () => {
  for (const raw of ['{"active":false,"active":true}', '{"a":1,"\\u0061":2}', '{"account":{"sub":1,"sub":2}}',
    '[]', '{"x":NaN}', '{"x":true}garbage']) {
    assert.throws(() => uniqueJSON(Buffer.from(raw)), { code: 'issuer_response_invalid' });
  }
  assert.throws(() => uniqueJSON(Buffer.from([123, 34, 97, 34, 58, 34, 255, 34, 125])), { code: 'issuer_response_invalid' });
  assert.deepEqual(uniqueJSON(Buffer.from('{"list":[{"x":1},{"x":2}],"text":"a, b: [x]"}')), { list: [{ x: 1 }, { x: 2 }], text: 'a, b: [x]' });
});

function httpFixture({ status = 200, headers = {}, raw = '{"success":true}', fail = false } = {}) {
  const calls = [];
  const request = (url, options, callback) => {
    const req = new EventEmitter(); req.destroy = () => { req.destroyed = true; };
    req.end = body => {
      calls.push({ url, options, body });
      queueMicrotask(() => {
        if (fail) return req.emit('error', new Error('secret transport error'));
        const res = new PassThrough(); res.statusCode = status;
        res.headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers };
        callback(res); if (!res.destroyed) res.end(raw);
      });
    }; return req;
  };
  return { calls, request };
}

test('transport uses verified direct TLS and form POST without redirect or cookie forwarding', async () => {
  const f = httpFixture();
  assert.deepEqual(await profileHTTPS('POST', B.issuer + '/account/revoke', { token: 'r'.repeat(64) }, f), { success: true });
  assert.equal(f.calls.length, 1); const call = f.calls[0];
  assert.equal(call.options.rejectUnauthorized, true); assert.equal(call.options.agent, false);
  assert.equal(call.options.headers.Cookie, undefined); assert.equal(call.options.headers.Authorization, undefined);
  assert.equal(new URLSearchParams(call.body).get('token'), 'r'.repeat(64));
  await rejects(profileHTTPS('GET', 'https://evil.example/account', undefined, f), 'invalid_transport_target');
  assert.equal(f.calls.length, 1);
});

test('transport rejects redirects, cacheable/non-JSON/oversized responses and redacts failures', async () => {
  for (const [options, code] of [
    [{ status: 302, headers: { location: 'https://evil.example' } }, 'issuer_unavailable'],
    [{ status: 403 }, 'authorization_rejected'], [{ fail: true }, 'issuer_unavailable'],
    [{ headers: { 'cache-control': 'max-age=10' } }, 'issuer_response_invalid'],
    [{ headers: { 'content-type': 'text/html' } }, 'issuer_response_invalid'],
    [{ raw: '{"padding":"' + 'x'.repeat(65536) + '"}' }, 'issuer_response_invalid'],
    [{ raw: '{"active":false,"active":true}' }, 'issuer_response_invalid'],
  ]) {
    const f = httpFixture(options);
    await rejects(profileHTTPS('GET', B.issuer + '/.well-known/lazyingart-account', undefined, f), code);
    assert.equal(f.calls.length, 1);
  }
});

test('transport deadline destroys only its request and never retries', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, destroyed = 0;
  const request = () => {
    calls++;
    const req = new EventEmitter(); req.end = () => {}; req.destroy = () => { destroyed++; };
    return req;
  };
  const pending = profileHTTPS('GET', B.issuer + '/.well-known/lazyingart-account', undefined, { request });
  const outcome = rejects(pending, 'issuer_unavailable');
  t.mock.timers.tick(15000); await outcome;
  assert.equal(calls, 1); assert.equal(destroyed, 1);
});

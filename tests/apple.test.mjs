import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.mjs';
import { hash } from '../server/domain.mjs';
import { createAppleAuth } from '../server/apple-auth.mjs';

test('Apple sign-in verifies signature/audience/nonce/PKCE/expiry, consumes flows and encrypts revocable credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'onlyideas-apple-')), store = new Store(dir);
  const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const ec = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256' };
  const config = { apple: { keyId: 'client-key', teamId: 'test-team', privateKey: ec.privateKey.export({type:'pkcs8',format:'pem'}), encryptionKey: randomBytes(32).toString('hex') } };
  let exchanged = 0, responseToken, revocationFails = false, revokedToken;
  const provider = async (url, options) => {
    if (url.endsWith('/keys')) return { keys: [jwk] };
    assert.equal(url, 'https://appleid.apple.com/auth/token');
    assert.equal(new URLSearchParams(options.body).get('client_id'), 'art.onlyideas.app');
    exchanged++; return { id_token: responseToken, refresh_token: 'sensitive-apple-refresh' };
  };
  const apple = createAppleAuth(store, config, provider, async (url, options) => {
    assert.equal(url, 'https://appleid.apple.com/auth/revoke');
    revokedToken = new URLSearchParams(options.body).get('token');
    return new Response('', { status: revocationFails ? 503 : 200 });
  });
  const token = (nonce, overrides = {}, key = rsa.privateKey) => {
    const now = Math.floor(Date.now()/1000);
    const header = Buffer.from(JSON.stringify({ kid: 'test-key', alg: 'RS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: 'apple-subject', iss: 'https://appleid.apple.com', aud: 'art.onlyideas.app', iat: now, exp: now+600, nonce, ...overrides })).toString('base64url');
    const input = `${header}.${body}`; return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
  };
  const begin = () => {
    const verifier = randomBytes(32).toString('base64url');
    return { ...apple.start(Buffer.from(hash(verifier),'hex').toString('base64url')), verifier, code: 'test-code' };
  };
  try {
    for (const invalid of [{aud:'another-app'}, {iss:'https://evil.test'}, {exp:1}, {nonce:'wrong'}]) {
      const flow = begin(); await assert.rejects(apple.complete({...flow, identityToken:token(flow.nonce,invalid)}), /expired or did not match/);
    }
    const flow = begin();
    await assert.rejects(apple.complete({...flow,verifier:randomBytes(32).toString('base64url'),identityToken:token(flow.nonce)}), /proof did not match/);
    const altered = token(flow.nonce).split('.'); altered[1] = Buffer.from(JSON.stringify({sub:'attacker'})).toString('base64url');
    await assert.rejects(apple.complete({...flow,identityToken:altered.join('.')}), /signature did not match/);
    assert.equal(exchanged,0);
    const valid = begin(); responseToken = token(valid.nonce);
    const result = await apple.complete({...valid,identityToken:responseToken,name:'Reader'});
    assert.equal(result.user.id,'apple-apple-subject'); assert.equal(result.user.name,'Reader');
    assert.equal(store.session(result.token).provider,'apple');
    await assert.rejects(apple.complete({...valid,identityToken:responseToken}), /expired/);
    assert.equal(exchanged,1);
    const saved = store.db.prepare('SELECT body FROM apple_tokens WHERE owner=?').get(result.user.id).body;
    assert.equal(saved.includes('sensitive-apple-refresh'),false);
    revocationFails = true;
    await assert.rejects(apple.revoke(result.user), /could not revoke/);
    assert.ok(store.db.prepare('SELECT body FROM apple_tokens WHERE owner=?').get(result.user.id));
    revocationFails = false; await apple.revoke(result.user);
    assert.equal(revokedToken,'sensitive-apple-refresh');
    assert.equal(store.db.prepare('SELECT body FROM apple_tokens WHERE owner=?').get(result.user.id),undefined);
  } finally { store.close(); rmSync(dir,{recursive:true,force:true}); }
});

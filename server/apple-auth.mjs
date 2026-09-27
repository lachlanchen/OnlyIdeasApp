import { randomBytes, createPublicKey, verify, sign, createCipheriv, createDecipheriv } from 'node:crypto';
import { hash, requireValue } from './domain.mjs';
import { proof } from './native-auth.mjs';
import { providerJSON } from './network.mjs';

const issuer = 'https://appleid.apple.com';
const audience = 'art.onlyideas.app';
export function createAppleAuth(store, config, provider = providerJSON, fetcher = fetch) {
  store.db.exec('CREATE TABLE IF NOT EXISTS apple_tokens(owner TEXT PRIMARY KEY, body TEXT NOT NULL)');
  const settings = config.apple || {};
  const enabled = !!(settings.keyId && settings.teamId && settings.privateKey && /^[a-f0-9]{64}$/.test(settings.encryptionKey || ''));
  let keys = [], keysUntil = 0;
  const clientSecret = () => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: settings.keyId })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: settings.teamId, iat: now, exp: now + 300, aud: issuer, sub: audience })).toString('base64url');
    const input = `${header}.${payload}`;
    return `${input}.${sign('sha256', Buffer.from(input), { key: settings.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
  };
  const seal = data => {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(settings.encryptionKey, 'hex'), iv);
    return JSON.stringify({ iv: iv.toString('base64'), data: Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]).toString('base64'), tag: cipher.getAuthTag().toString('base64') });
  };
  const unseal = body => {
    const record = JSON.parse(body), cipher = createDecipheriv('aes-256-gcm', Buffer.from(settings.encryptionKey, 'hex'), Buffer.from(record.iv, 'base64'));
    cipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    return JSON.parse(Buffer.concat([cipher.update(Buffer.from(record.data, 'base64')), cipher.final()]).toString());
  };
  async function identity(token, nonce) {
    requireValue(typeof token === 'string' && token.length < 16000, 'Apple did not return an identity token.');
    let header, claims, parts;
    try { parts = token.split('.'); header = JSON.parse(Buffer.from(parts[0], 'base64url')); claims = JSON.parse(Buffer.from(parts[1], 'base64url')); }
    catch { requireValue(false, 'Apple identity could not be read.', 401); }
    requireValue(parts.length === 3 && header.alg === 'RS256' && typeof header.kid === 'string', 'Invalid Apple identity.', 401);
    if (Date.now() > keysUntil || !keys.some(k => k.kid === header.kid)) {
      keys = (await provider(`${issuer}/auth/keys`)).keys || []; keysUntil = Date.now() + 3600_000;
    }
    const key = keys.find(k => k.kid === header.kid && k.kty === 'RSA' && k.alg === 'RS256');
    requireValue(key && verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url')), 'Apple identity signature did not match.', 401);
    const now = Math.floor(Date.now() / 1000);
    requireValue(claims.iss === issuer && claims.aud === audience && typeof claims.sub === 'string' && claims.sub.length < 300
      && Number.isFinite(claims.exp) && claims.exp > now && Number.isFinite(claims.iat) && claims.iat <= now + 60 && claims.iat > now - 600
      && claims.nonce === nonce, 'Apple sign-in expired or did not match this app. Try again.', 401);
    return claims;
  }
  return {
    enabled,
    start(challenge) {
      requireValue(enabled, 'Apple sign-in is unavailable.', 503);
      requireValue(proof.test(challenge || ''), 'A valid sign-in challenge is required.');
      const flow = randomBytes(32).toString('base64url'), nonce = randomBytes(32).toString('base64url');
      store.db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
      store.db.prepare('INSERT INTO oauth VALUES(?,?,?)').run(`apple:${hash(flow)}`, JSON.stringify({ nonce, challenge }), Date.now() + 600_000);
      return { flow, nonce };
    },
    async complete(body) {
      requireValue(enabled, 'Apple sign-in is unavailable.', 503);
      requireValue(proof.test(body.flow || '') && proof.test(body.verifier || ''), 'Sign-in expired.');
      const id = `apple:${hash(body.flow)}`, row = store.db.prepare('SELECT body FROM oauth WHERE id=? AND expires>?').get(id, Date.now());
      requireValue(row, 'Sign-in expired. Please try again.', 401);
      const flow = JSON.parse(row.body);
      requireValue(Buffer.from(hash(body.verifier), 'hex').toString('base64url') === flow.challenge, 'Sign-in proof did not match.', 403);
      requireValue(typeof body.code === 'string' && body.code.length > 0 && body.code.length < 4096, 'Apple did not return an authorization code.');
      // Consume before any await to reject concurrent replay of this flow.
      store.db.prepare('DELETE FROM oauth WHERE id=?').run(id);
      const claims = await identity(body.identityToken, flow.nonce);
      const result = await provider(`${issuer}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: audience, client_secret: clientSecret(), code: body.code, grant_type: 'authorization_code' }).toString() });
      const checked = await identity(result.id_token, flow.nonce);
      requireValue(checked.sub === claims.sub && typeof result.refresh_token === 'string', 'Apple did not finish sign-in.', 401);
      const owner = store.identity(`apple-${claims.sub}`);
      const prior = store.db.prepare('SELECT body FROM apple_tokens WHERE owner=?').get(owner);
      const previous = prior ? unseal(prior.body) : null;
      const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
      const user = { id: owner, name: name || previous?.name || 'Reader', login: 'Apple account', provider: 'apple' };
      store.db.prepare('INSERT OR REPLACE INTO apple_tokens VALUES(?,?)').run(owner, seal({ token: result.refresh_token, name: user.name, sub: claims.sub }));
      return { user, token: store.createSession(user) };
    },
    async revoke(user) {
      const row = store.db.prepare('SELECT body FROM apple_tokens WHERE owner=?').get(user.id);
      if (!row) return;
      requireValue(enabled, 'Apple account deletion is temporarily unavailable. Please try again shortly.', 503);
      const stored = unseal(row.body);
      // Apple returns an empty successful body from /revoke, unlike /token.
      const result = await fetcher(`${issuer}/auth/revoke`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: audience, client_secret: clientSecret(), token: stored.token, token_type_hint: 'refresh_token' }) });
      await result.body?.cancel();
      requireValue(result.ok, 'Apple could not revoke access yet. Please try deleting again shortly.', 502);
      store.db.prepare('DELETE FROM apple_tokens WHERE owner=?').run(user.id);
    },
  };
}

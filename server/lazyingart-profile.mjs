/**
 * Disabled preparation for OnlyIdeas' optional LazyingArt profile login.
 * Protocol port of LazyingArtLinkPrivate@309dab92. Not imported by app.mjs.
 * No local account linking, session issuance, Coin or billing permissions here.
 */
import { request as httpsRequest } from 'node:https';
import { createHash, randomBytes } from 'node:crypto';

export const PROFILE_BINDING = Object.freeze({
  issuer: 'https://chat.lazying.art',
  clientId: 'onlyideas-server',
  audience: 'onlyideas-service',
  redirectUri: 'https://agent.onlyideas.art/api/auth/lazyingart/callback',
});
const ENDPOINTS = Object.freeze({
  authorization_endpoint: '/account/authorize', token_endpoint: '/account/token',
  profile_endpoint: '/account/profile', introspection_endpoint: '/account/introspect',
  revocation_endpoint: '/account/revoke', account_endpoint: '/account',
});
const OPAQUE = /^[A-Za-z0-9_-]{43,128}$/;
const SUBJECT = /^la_[a-f0-9]{32}$/;
const sha = value => createHash('sha256').update(value).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, expected) => object(value) && Object.keys(value).sort().join('\0') === [...expected].sort().join('\0');
const check = (condition, code) => { if (!condition) throw new ProfileLinkError(code); };
export class ProfileLinkError extends Error {
  constructor(code) { super(code); this.name = 'ProfileLinkError'; this.code = code; }
}
function opaque(value) {
  check(typeof value === 'string' && OPAQUE.test(value), 'invalid_credential');
  return value;
}
function bindingHash(value) {
  check(typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value), 'browser_binding_required');
  return sha(value);
}

// JSON.parse alone accepts repeated keys. Reject them, including escaped aliases
// and nested keys, before any credential or identity can be trusted.
export function uniqueJSON(raw) {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(raw);
    const value = JSON.parse(text);
    const token = /\s+|"(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}\[\]:,]/gy;
    const stack = [];
    let match, consumed = 0;
    while ((match = token.exec(text))) {
      consumed = token.lastIndex;
      const item = match[0], top = stack.at(-1);
      if (item === '{') stack.push({ object: true, key: true, seen: new Set() });
      else if (item === '[') stack.push({ object: false });
      else if (item === '}' || item === ']') stack.pop();
      else if (item === ',' && top?.object) top.key = true;
      else if (item.startsWith('"') && top?.object && top.key) {
        const key = JSON.parse(item);
        check(!top.seen.has(key), 'issuer_response_invalid');
        top.seen.add(key); top.key = false;
      }
    }
    check(consumed === text.length, 'issuer_response_invalid');
    check(object(value), 'issuer_response_invalid');
    return value;
  } catch { throw new ProfileLinkError('issuer_response_invalid'); }
}

/** Verified TLS, no proxy/cookie/redirect/retry, 64 KiB and 15-second bounds. */
export async function profileHTTPS(method, url, fields, { request = httpsRequest } = {}) {
  const allowed = new Set(['/.well-known/lazyingart-account', ...Object.values(ENDPOINTS)]);
  check([...allowed].some(path => url === PROFILE_BINDING.issuer + path), 'invalid_transport_target');
  check((method === 'GET' && fields === undefined) || (method === 'POST' && object(fields)), 'invalid_transport_method');
  const body = fields === undefined ? undefined : new URLSearchParams(fields).toString();
  return new Promise((resolve, reject) => {
    let req, timer, finished = false;
    const done = (error, value) => {
      if (finished) return;
      finished = true; clearTimeout(timer);
      if (error) { reject(error); req?.destroy(); } else resolve(value);
    };
    try {
      req = request(url, { method, agent: false, rejectUnauthorized: true, headers: {
        Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded',
        ...(body === undefined ? {} : { 'Content-Length': Buffer.byteLength(body) }),
      } }, res => {
        const status = res.statusCode;
        if (status !== 200) {
          res.destroy();
          return done(new ProfileLinkError([400, 401, 403].includes(status) ? 'authorization_rejected' : 'issuer_unavailable'));
        }
        if (res.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json'
          || !res.headers['cache-control']?.toLowerCase().split(',').some(v => v.trim() === 'no-store')) {
          res.destroy(); return done(new ProfileLinkError('issuer_response_invalid'));
        }
        const chunks = []; let size = 0;
        res.on('data', chunk => {
          size += chunk.length;
          if (size > 65536) { res.destroy(); done(new ProfileLinkError('issuer_response_invalid')); }
          else chunks.push(chunk);
        });
        res.on('error', () => done(new ProfileLinkError('issuer_unavailable')));
        res.on('aborted', () => done(new ProfileLinkError('issuer_unavailable')));
        res.on('end', () => {
          if (finished) return;
          try { done(null, uniqueJSON(Buffer.concat(chunks))); }
          catch { done(new ProfileLinkError('issuer_response_invalid')); }
        });
      });
      req.on('error', () => done(new ProfileLinkError('issuer_unavailable')));
      timer = setTimeout(() => done(new ProfileLinkError('issuer_unavailable')), 15000);
      timer.unref?.(); req.end(body);
    } catch { done(new ProfileLinkError('issuer_unavailable')); }
  });
}

export function createProfileAdapter(config = {}, { attempts, transport = profileHTTPS, now = () => Date.now() } = {}) {
  const configured = object(config) && Object.entries(PROFILE_BINDING).every(([k, v]) => config[k] === v)
    && typeof config.clientSecret === 'string' && /^[A-Za-z0-9_-]{64}$/.test(config.clientSecret)
    && typeof config.enabled === 'boolean';
  if (!configured && config?.enabled !== true) return Object.freeze({ enabled: false });
  check(configured, 'invalid_configuration');
  const enabled = config.enabled, secret = config.clientSecret;
  const { issuer, clientId, audience, redirectUri } = PROFILE_BINDING;
  const clock = () => Math.floor(now() / 1000);
  async function request(method, path, fields) {
    try { return await transport(method, issuer + path, fields); }
    catch (error) {
      if (error instanceof ProfileLinkError) throw error;
      throw new ProfileLinkError('issuer_unavailable'); // Never expose upstream URLs/bodies.
    }
  }
  const post = (path, fields) => request('POST', path, { ...fields, client_id: clientId, audience, client_secret: secret });
  async function discovery() {
    const d = await request('GET', '/.well-known/lazyingart-account');
    check(object(d) && d.issuer === issuer && d.contract_version === 1, 'discovery_not_qualified');
    for (const [key, path] of Object.entries(ENDPOINTS)) check(d[key] === issuer + path, 'discovery_not_qualified');
    for (const [key, required] of Object.entries({
      response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['client_secret_post'],
      scopes_supported: ['profile'],
    })) check(Array.isArray(d[key]) && d[key].every(v => typeof v === 'string') && required.every(v => d[key].includes(v)), 'discovery_not_qualified');
    check(object(d.providers) && ['password', 'google', 'apple', 'github'].every(k => typeof d.providers[k] === 'boolean'), 'discovery_not_qualified');
    return Object.freeze({ providers: Object.freeze(Object.fromEntries(['password', 'google', 'apple', 'github'].map(k => [k, d.providers[k]]))) });
  }
  async function ready() { check(enabled, 'shared_login_disabled'); await discovery(); }
  function credentialEnvelope(value) {
    check(keys(value, ['access_token', 'refresh_token', 'expires_in', 'token_type', 'scope'])
      && value.scope === 'profile' && value.token_type === 'Bearer'
      && Number.isSafeInteger(value.expires_in) && value.expires_in > 0 && value.expires_in <= 600
      && typeof value.access_token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value.access_token)
      && typeof value.refresh_token === 'string' && /^[A-Za-z0-9_-]{64}$/.test(value.refresh_token), 'issuer_response_invalid');
    // Explicit property access is required for encrypted persistence. Accidental
    // JSON logging/serialization does not expose credentials.
    return Object.freeze(Object.defineProperties({ expiresIn: value.expires_in }, {
      accessToken: { value: value.access_token }, refreshToken: { value: value.refresh_token },
    }));
  }
  async function introspect(token, expectedSubject) {
    opaque(token);
    if (expectedSubject !== undefined) check(typeof expectedSubject === 'string' && SUBJECT.test(expectedSubject), 'identity_invalid');
    await ready();
    const v = await post('/account/introspect', { token, token_type_hint: 'access_token' });
    if (keys(v, ['active']) && v.active === false) return null;
    check(keys(v, ['active', 'iss', 'sub', 'client_id', 'aud', 'scope', 'token_type', 'iat', 'exp', 'auth_time', 'account', 'verified_legacy_identities'])
      && v.active === true && v.iss === issuer && v.client_id === clientId && v.aud === audience
      && v.scope === 'profile' && v.token_type === 'Bearer' && Array.isArray(v.verified_legacy_identities)
      && v.verified_legacy_identities.length === 0 && typeof v.sub === 'string' && SUBJECT.test(v.sub)
      && (expectedSubject === undefined || v.sub === expectedSubject)
      && ['iat', 'exp', 'auth_time'].every(k => Number.isSafeInteger(v[k])), 'identity_invalid');
    const time = clock();
    check(0 < v.auth_time && v.auth_time <= v.iat && v.iat <= time + 30 && time < v.exp && v.exp <= v.iat + 600, 'identity_invalid');
    const a = v.account;
    check(keys(a, ['subject', 'display_name', 'account_status', 'email_verified'])
      && a.subject === v.sub && a.account_status === 'active' && typeof a.email_verified === 'boolean'
      && typeof a.display_name === 'string' && [...a.display_name].length <= 128, 'identity_invalid');
    return Object.freeze({ issuer, subject: v.sub, displayName: a.display_name, clientId, audience,
      authenticatedAt: v.auth_time, issuedAt: v.iat, expiresAt: v.exp });
  }
  async function begin({ binding, attemptId }) {
    const browserHash = bindingHash(binding);
    check(typeof attemptId === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(attemptId), 'local_attempt_required');
    check(typeof attempts?.create === 'function' && typeof attempts?.consume === 'function', 'attempt_store_required');
    await ready();
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
    const issuedAt = clock();
    try {
      await attempts.create({ ...PROFILE_BINDING, attemptId, stateHash: sha(state), bindingHash: browserHash,
        verifier, issuedAt, expiresAt: issuedAt + 600 });
    } catch { throw new ProfileLinkError('attempt_store_unavailable'); }
    const url = new URL(issuer + '/account/authorize');
    url.search = new URLSearchParams({ response_type: 'code', client_id: clientId, audience, redirect_uri: redirectUri,
      scope: 'profile', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
    return { authorizationUrl: url.href };
  }
  async function complete({ callbackUrl, binding }) {
    const browserHash = bindingHash(binding);
    check(typeof attempts?.consume === 'function', 'attempt_store_required');
    check(typeof callbackUrl === 'string' && callbackUrl.length <= 4096
      && callbackUrl.startsWith(redirectUri + '?') && !/[\s\\#]/.test(callbackUrl), 'callback_invalid');
    let query;
    try { query = new URL(callbackUrl).searchParams; } catch { throw new ProfileLinkError('callback_invalid'); }
    const names = [...query.keys()].sort().join(' ');
    check(['code iss state', 'error iss state'].includes(names) && query.get('iss') === issuer, 'callback_invalid');
    const state = opaque(query.get('state'));
    if (query.has('code')) opaque(query.get('code'));
    else check(query.get('error') === 'access_denied', 'callback_invalid');
    await ready();
    let record;
    try { record = await attempts.consume({ stateHash: sha(state), bindingHash: browserHash, now: clock(), ...PROFILE_BINDING }); }
    catch { throw new ProfileLinkError('attempt_store_unavailable'); }
    check(object(record) && Object.entries(PROFILE_BINDING).every(([k, v]) => record[k] === v)
      && record.stateHash === sha(state) && record.bindingHash === browserHash
      && Number.isSafeInteger(record.issuedAt) && record.issuedAt <= clock()
      && Number.isSafeInteger(record.expiresAt) && record.expiresAt > clock() && record.expiresAt <= record.issuedAt + 600
      && typeof record.attemptId === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(record.attemptId)
      && typeof record.verifier === 'string' && /^[A-Za-z0-9_-]{43}$/.test(record.verifier), 'callback_invalid');
    if (query.has('error')) throw new ProfileLinkError('authorization_cancelled');
    const tokens = credentialEnvelope(await post('/account/token', { grant_type: 'authorization_code', code: query.get('code'),
      redirect_uri: redirectUri, code_verifier: record.verifier }));
    const identity = await introspect(tokens.accessToken);
    check(identity !== null, 'authorization_rejected');
    return { attemptId: record.attemptId, tokens, identity };
  }
  async function refreshOnce(refreshToken, expectedSubject) {
    check(typeof expectedSubject === 'string' && SUBJECT.test(expectedSubject), 'identity_invalid');
    check(typeof refreshToken === 'string' && /^[A-Za-z0-9_-]{64}$/.test(refreshToken), 'invalid_credential');
    await ready();
    const tokens = credentialEnvelope(await post('/account/token', { grant_type: 'refresh_token', refresh_token: refreshToken }));
    const identity = await introspect(tokens.accessToken, expectedSubject);
    check(identity !== null, 'authorization_rejected');
    return { tokens, identity };
  }
  async function revoke(token) {
    opaque(token);
    await discovery(); // Disabling new sign-in must not prevent sign-out.
    const result = await post('/account/revoke', { token });
    check(keys(result, ['success']) && result.success === true, 'revocation_unconfirmed');
  }
  return Object.freeze({ enabled, discovery, begin, complete, introspect, refreshOnce, revoke });
}

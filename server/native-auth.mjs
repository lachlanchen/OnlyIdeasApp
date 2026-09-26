import { randomBytes } from 'node:crypto';
import { hash, requireValue } from './domain.mjs';

export const nativeOrigins = new Set(['capacitor://localhost', 'https://localhost']);
export const proof = /^[A-Za-z0-9_-]{43}$/;
export function nativeFlow(store, flow) {
  requireValue(proof.test(flow || ''), 'Sign-in expired. Please try again.');
  const row = store.db.prepare('SELECT body FROM oauth WHERE id=? AND expires>?').get(`native:${hash(flow)}`, Date.now());
  requireValue(row, 'Sign-in expired. Please try again.');
  return JSON.parse(row.body);
}
export function startNative(store, challenge, origin) {
  requireValue(proof.test(challenge || ''), 'A valid sign-in challenge is required.');
  const flow = randomBytes(32).toString('base64url');
  store.db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
  store.db.prepare('INSERT INTO oauth VALUES(?,?,?)').run(`native:${hash(flow)}`, JSON.stringify({ challenge }), Date.now() + 600_000);
  return { flow, url: `${origin}/api/auth/github?flow=${flow}` };
}
export function finishNative(store, flow, user) {
  const data = nativeFlow(store, flow);
  requireValue(!data.user, 'This sign-in has already finished.');
  store.db.prepare('UPDATE oauth SET body=?, expires=? WHERE id=?').run(JSON.stringify({ ...data, user }), Date.now() + 120_000, `native:${hash(flow)}`);
}
export function redeemNative(store, flow, verifier) {
  requireValue(proof.test(verifier || ''), 'A valid sign-in proof is required.');
  const data = nativeFlow(store, flow);
  requireValue(Buffer.from(hash(verifier), 'hex').toString('base64url') === data.challenge, 'Sign-in proof did not match.', 403);
  if (!data.user) return { pending: true };
  // One-use receipt. A custom URL contains only the flow ID, never credentials.
  store.db.prepare('DELETE FROM oauth WHERE id=?').run(`native:${hash(flow)}`);
  return { user: data.user, token: store.createSession(data.user) };
}

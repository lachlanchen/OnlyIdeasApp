import {ProfileLinkError} from './lazyingart-profile.mjs';
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
export function startNative(store, challenge, origin, linkContext = null) {
  requireValue(proof.test(challenge || ''), 'A valid sign-in challenge is required.');
  const flow = randomBytes(32).toString('base64url');
  store.db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
  store.db.prepare('INSERT INTO oauth VALUES(?,?,?)').run(`native:${hash(flow)}`, JSON.stringify({ challenge, ...(linkContext ? {linkContext} : {}) }), Date.now() + 600_000);
  return { flow, url: `${origin}/api/auth/github?flow=${flow}` };
}
export function finishNative(store, flow, user) {
  const data = nativeFlow(store, flow);
  requireValue(!data.user, 'This sign-in has already finished.');
  const failed=data.linkContext?.reauthenticate&&data.linkContext.owner!==user.id;
  store.db.prepare('UPDATE oauth SET body=?, expires=? WHERE id=?').run(JSON.stringify(failed?{...data,linkError:'local_session_changed'}:{ ...data, user }), Date.now() + 120_000, `native:${hash(flow)}`);
}
export function redeemNative(store, flow, verifier, context = {}) {
  requireValue(proof.test(verifier || ''), 'A valid sign-in proof is required.');
  const data = nativeFlow(store, flow);
  requireValue(Buffer.from(hash(verifier), 'hex').toString('base64url') === data.challenge, 'Sign-in proof did not match.', 403);
  if (data.linkContext) {
    const local = store.db.prepare('SELECT user FROM sessions WHERE id=? AND expires>?').get(data.linkContext.sessionHash,Date.now());
    if (!local || JSON.parse(local.user).id !== data.linkContext.owner || context.owner !== data.linkContext.owner || context.sessionHash !== data.linkContext.sessionHash) throw new ProfileLinkError('local_session_changed');
    if (data.user && data.user.id !== data.linkContext.owner) throw new ProfileLinkError('local_session_changed');
  }
  if (data.linkError) throw new ProfileLinkError(data.linkError);
  if (!data.user) return { pending: true };
  // One-use receipt. A custom URL contains only the flow ID, never credentials.
  store.db.prepare('DELETE FROM oauth WHERE id=?').run(`native:${hash(flow)}`);
  if(context.linkOnly) {requireValue(data.linkContext, 'Invalid connection.', 400);if(data.linkContext.reauthenticate){const row=store.db.prepare('SELECT user FROM sessions WHERE id=?').get(context.sessionHash);store.db.prepare('UPDATE sessions SET user=? WHERE id=?').run(JSON.stringify({...JSON.parse(row.user),authenticatedAt:data.user.authenticatedAt}),context.sessionHash)}return {linked:true};}
  return { user: data.user, token: store.createSession(data.user) };
}

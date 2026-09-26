import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { AppError, requireValue, hash, makePaper, publicPaper, mayPublish, languages } from './domain.mjs';
import { providerJSON } from './network.mjs';
import { startWorker } from './providers.mjs';
import { nativeOrigins, nativeFlow, startNative, finishNative, redeemNative } from './native-auth.mjs';
const uuid = /^[a-f0-9-]{36}$/;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json' };
export function createApp(store, config, { worker = true, provider = providerJSON } = {}) {
  const origin = config.origin || 'http://127.0.0.1:4182';
  const secure = origin.startsWith('https://');
  requireValue(secure || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin), 'Only HTTPS or explicit loopback origins are permitted.');
  requireValue(!config.development || !secure, 'Development login cannot be enabled in production.');
  const cookieName = secure ? '__Host-onlyideas' : 'onlyideas-local';
  const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  const stopWorker = worker ? startWorker(store, config) : () => {};
  const limits = new Map();
  const response = (res, data, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  const readBody = async (req, max = 100_000) => {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; requireValue(size <= max, 'Upload is too large.', 413); chunks.push(chunk); }
    return Buffer.concat(chunks);
  };
  const json = async req => { try { return JSON.parse((await readBody(req, 2_100_000)).toString()); } catch (e) { if (e instanceof AppError) throw e; throw new AppError('The request could not be read.'); } };
  const limit = (key, max = 40) => {
    const now = Date.now(); const entry = limits.get(key);
    const value = !entry || entry.until < now ? { count: 0, until: now + 60_000 } : entry;
    requireValue(++value.count <= max, 'Please wait a moment before trying again.', 429); limits.set(key, value);
    if (limits.size > 5000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  };
  const enqueue = (user, fields) => {
    const existing = store.existing(user.id, fields.dedupe); if (existing) return existing;
    const today = store.jobs(user.id).filter(j => j.created > Date.now() - 86400_000);
    requireValue(today.length < (config.maxJobsPerUserPerDay || 20), 'Today’s request allowance is full. Try tomorrow.', 429);
    return store.saveJob({ ...fields, id: fields.id || randomUUID(), owner: user.id, created: Date.now(), state: 'queued', message: 'Waiting to start' });
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, origin), path = url.pathname, method = req.method;
      requireValue(!/%2f|%5c|%00|(?:^|\/)\.\.(?:\/|$)/i.test(req.url.split('?')[0]), 'Invalid path.');
      const nativeOrigin = nativeOrigins.has(req.headers.origin);
      if (nativeOrigin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-OnlyIdeas-Client, X-Request-Id, X-Paper-Title, X-Paper-Language');
      }
      if (method === 'OPTIONS') { requireValue(nativeOrigin, 'Origin not allowed.', 403); res.writeHead(204); return res.end(); }
      const native = nativeOrigin && req.headers['x-onlyideas-client'] === 'native';
      requireValue(['GET', 'POST', 'DELETE', 'PUT', 'HEAD'].includes(method), 'Method not allowed.', 405);
      if (method !== 'GET' && method !== 'HEAD') requireValue(req.headers.origin === origin || native, 'Please reload the app and try again.', 403);
      const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split('=')));
      const token = native ? String(req.headers.authorization || '').match(/^Bearer ([a-f0-9-]{72})$/)?.[1] : nativeOrigin ? null : cookies[cookieName];
      const user = store.session(token);
      if (user && !native) res.setHeader('Set-Cookie', cookie(cookieName, token, 90 * 86400));
      const requireUser = () => { requireValue(user, 'Sign in to save papers and join the conversation.', 401); return user; };
      const paperFor = id => { const p = store.paper(id); requireValue(p && (p.visibility === 'public' || p.owner === user?.id), 'Paper not found.', 404); return p; };
      if (path.startsWith('/api/')) limit(user?.id || req.socket.remoteAddress, 240);
      if (path === '/api/health' && method === 'GET') return response(res, { service: 'onlyideas', version: '0.2.0', ok: true });
      if (path === '/api/auth/native/start' && method === 'POST') {
        requireValue(native, 'Open sign-in from the app.', 403);
        requireValue(config.github?.clientId && config.github?.clientSecret, 'GitHub sign-in is unavailable.', 503);
        limit(`login:${req.socket.remoteAddress}`, 20);
        return response(res, startNative(store, (await json(req)).challenge, origin));
      }
      if (path === '/api/auth/native/complete' && method === 'POST') {
        requireValue(native, 'Open sign-in from the app.', 403);
        const b = await json(req); return response(res, redeemNative(store, b.flow, b.verifier));
      }
      if (path === '/api/session' && method === 'GET') return response(res, { user, development: !!config.development, capabilities: { login: !!config.github?.clientId, pdf: !!config.mathpix?.appKey, assistant: !!config.model?.url, publishing: !!(config.github?.contentToken || config.github?.checkout) }, languages, maxPages: config.maxPages || 30 });
      if (path === '/api/auth/local' && method === 'POST') {
        requireValue(config.development && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress), 'Not available.', 404);
        const local = { id: 'local-reader', name: 'Local reader', login: 'local-reader' };
        res.setHeader('Set-Cookie', cookie(cookieName, store.createSession(local), 90 * 86400)); return response(res, { user: local });
      }
      if (path === '/api/auth/logout' && method === 'POST') {
        store.db.prepare('DELETE FROM sessions WHERE id=?').run(hash(token || ''));
        if (!native) res.setHeader('Set-Cookie', cookie(cookieName, '', 0)); return response(res, { ok: true });
      }
      if (path === '/api/auth/github' && method === 'GET') {
        requireValue(config.github?.clientId && config.github?.clientSecret, 'GitHub sign-in is being connected. You can read public papers now.', 503);
        limit(`login:${req.socket.remoteAddress}`, 20);
        const flow = url.searchParams.get('flow');
        if (flow) { const pending = nativeFlow(store, flow); requireValue(!pending.user, 'Sign-in has already finished.'); }
        const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url'), binder = randomBytes(32).toString('base64url');
        store.db.prepare('DELETE FROM oauth WHERE expires<?').run(Date.now());
        store.db.prepare('INSERT INTO oauth VALUES(?,?,?)').run(hash(state), JSON.stringify({ verifier, binder: hash(binder), flow }), Date.now() + 10 * 60_000);
        res.setHeader('Set-Cookie', cookie(`${cookieName}-oauth`, binder, 600));
        const auth = new URL('https://github.com/login/oauth/authorize');
        auth.search = new URLSearchParams({ client_id: config.github.clientId, redirect_uri: `${origin}/api/auth/callback`, scope: 'read:user', state, code_challenge: Buffer.from(hash(verifier), 'hex').toString('base64url'), code_challenge_method: 'S256' }).toString();
        res.writeHead(302, { Location: auth.href }); return res.end();
      }
      if (path === '/api/auth/callback' && method === 'GET') {
        const state = hash(url.searchParams.get('state') || ''), row = store.db.prepare('SELECT * FROM oauth WHERE id=? AND expires>?').get(state, Date.now());
        requireValue(row, 'Sign-in expired. Return to OnlyIdeas and try again.');
        const data = JSON.parse(row.body);
        requireValue(hash(cookies[`${cookieName}-oauth`] || '') === data.binder, 'Use the same browser that started sign-in.', 403);
        store.db.prepare('DELETE FROM oauth WHERE id=?').run(state);
        requireValue(url.searchParams.get('code'), 'GitHub sign-in was cancelled.');
        const result = await provider('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: config.github.clientId, client_secret: config.github.clientSecret, code: url.searchParams.get('code'), code_verifier: data.verifier, redirect_uri: `${origin}/api/auth/callback` }) });
        requireValue(result.access_token, 'GitHub did not complete sign-in. Please try again.', 502);
        const account = await provider('https://api.github.com/user', { headers: { Authorization: `Bearer ${result.access_token}`, Accept: 'application/vnd.github+json' } });
        requireValue(account.id && account.login, 'GitHub account details are unavailable.', 502);
        const u = { id: `github-${account.id}`, name: account.name || account.login, login: account.login };
        if (data.flow) {
          finishNative(store, data.flow, u);
          res.setHeader('Set-Cookie', cookie(`${cookieName}-oauth`, '', 0));
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signed in · OnlyIdeas</title><body style="font:20px system-ui;background:#f6f4ed;color:#244f45;padding:10vh 8vw"><h1>Welcome back.</h1><p>You’re signed in. Return to OnlyIdeas to keep reading.</p><a style="color:inherit" href="art.onlyideas.app://oauth/complete?flow=${data.flow}">Open OnlyIdeas</a></body></html>`);
        }
        // No GitHub token is retained: this app's session does not inherit an 8-hour token lifetime.
        res.setHeader('Set-Cookie', [cookie(cookieName, store.createSession(u), 90 * 86400), cookie(`${cookieName}-oauth`, '', 0)]);
        res.writeHead(303, { Location: '/' }); return res.end();
      }
      if (path === '/api/papers' && method === 'GET') return response(res, { papers: store.papers(user?.id).map(publicPaper) });
      if (path === '/api/papers/markdown' && method === 'POST') {
        requireUser(); const data = await json(req); limit(`import:${user.id}`, 10);
        requireValue(uuid.test(data.requestId || ''), 'A request ID is required.');
        const existing = store.paper(data.requestId);
        if (existing) { requireValue(existing.owner === user.id, 'Request ID unavailable.', 409); return response(res, { paper: existing }); }
        requireValue(!/!\[[^\]]*\]\(|\\includegraphics|<img\b/i.test(data.mmd || ''), 'For papers with figures, upload the PDF so the figures are preserved. Text-only Markdown can be imported here.');
        const p = makePaper({ ...data, id: data.requestId, owner: user.id, license: 'private', assets: [] });
        store.savePaper(p); return response(res, { paper: p }, 201);
      }
      if (path === '/api/import' && method === 'POST') {
        requireUser(); requireValue(config.mathpix?.appKey, 'PDF conversion is not connected yet. Import Markdown in the meantime.', 503);
        limit(`import:${user.id}`, 5);
        const requestId = req.headers['x-request-id']; requireValue(uuid.test(requestId || ''), 'A request ID is required.');
        const previousRequest = store.job(requestId); if (previousRequest) { requireValue(previousRequest.owner === user.id, 'Request ID unavailable.', 409); return response(res, { job: previousRequest }, 202); }
        const isPDF = req.headers['content-type'] === 'application/pdf';
        let metadata, link = null, bytes;
        if (isPDF) {
          bytes = await readBody(req, 20_000_000); requireValue(bytes.subarray(0, 5).toString() === '%PDF-', 'Choose a valid PDF.');
          metadata = { title: decodeURIComponent(req.headers['x-paper-title'] || 'My paper'), language: req.headers['x-paper-language'] || 'en' };
        } else { const body = await json(req); metadata = body; link = body.url; requireValue(typeof link === 'string' && link.length <= 2000 && link.startsWith('https://'), 'Enter a direct HTTPS PDF link.'); }
        requireValue(typeof metadata.title === 'string' && metadata.title.trim() && metadata.title.length <= 300, 'Add a paper title.');
        requireValue(Object.hasOwn(languages, metadata.language || 'en'), 'Choose a supported language.');
        const dedupe = `import:${hash(bytes || link)}`;
        const previousContent = store.existing(user.id, dedupe); if (previousContent) return response(res, { job: previousContent }, 202);
        if (bytes) { const dir = join(store.directory, 'jobs', requestId); await mkdir(dir, { recursive: true, mode: 0o700 }); await writeFile(join(dir, 'source.pdf'), bytes, { mode: 0o600 }); }
        let job;
        try { job = enqueue(user, { id: requestId, dedupe, kind: 'import', url: link, metadata: { title: metadata.title, authors: String(metadata.authors || ''), language: metadata.language || 'en', license: 'private', category: String(metadata.category || 'Research') } }); }
        catch (error) { if (bytes) await rm(join(store.directory, 'jobs', requestId), { recursive: true, force: true }); throw error; }
        return response(res, { job }, 202);
      }
      if (path === '/api/jobs' && method === 'GET') { requireUser(); return response(res, { jobs: store.jobs(user.id).map(j => { const { metadata, url, pdfId, dedupe, ...safe } = j; return safe; }) }); }
      const matchPaper = path.match(/^\/api\/papers\/([\w-]+)(?:\/(comments|notes|assist|publish|artifacts|export))?$/);
      if (matchPaper) {
        const p = paperFor(matchPaper[1]), action = matchPaper[2];
        if (!action && method === 'GET') return response(res, { paper: { ...p, isOwner: p.owner === user?.id, owner: undefined } });
        if (action === 'export' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${p.id}.mmd"` }); return res.end(p.mmd); }
        if (action === 'comments' && method === 'GET') return response(res, { comments: store.db.prepare('SELECT body FROM comments WHERE paper=? ORDER BY created LIMIT 200').all(p.id).map(r => JSON.parse(r.body)).filter(c => c.visibility === 'public' || c.owner === user?.id).map(c => ({ ...c, canDelete: c.owner === user?.id, owner: undefined })) });
        if (action === 'comments' && method === 'POST') {
          requireUser(); limit(`comment:${user.id}`, 10); const b = await json(req);
          requireValue(uuid.test(b.id || '') && typeof b.text === 'string' && b.text.trim().length > 0 && b.text.length <= 5000, 'Write a comment of up to 5,000 characters.');
          requireValue(!b.sectionId || p.sections.some(s => s.id === b.sectionId), 'Select a passage from this paper.');
          requireValue(b.revision === p.revision, 'The paper changed. Reload before commenting.');
          const prior = store.db.prepare('SELECT * FROM comments WHERE id=?').get(b.id);
          if (prior) { requireValue(prior.owner === user.id && prior.paper === p.id, 'Comment ID unavailable.', 409); return response(res, { ok: true }); }
          const c = { id: b.id, paperId: p.id, owner: user.id, visibility: p.visibility, author: user.name, login: user.login, text: b.text.trim(), sectionId: b.sectionId || null, quote: String(b.quote || '').slice(0, 1200), revision: p.revision, createdAt: new Date().toISOString() };
          store.db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(c.id, p.id, user.id, JSON.stringify(c), Date.now()); return response(res, { ok: true }, 201);
        }
        if (action === 'notes') {
          requireUser();
          if (method === 'GET') { const note = store.db.prepare('SELECT body FROM notes WHERE owner=? AND paper=?').get(user.id, p.id); return response(res, { text: note?.body || '' }); }
          if (method === 'PUT') { const b = await json(req); requireValue(typeof b.text === 'string' && b.text.length <= 50_000, 'Keep notes under 50,000 characters.'); store.db.prepare('INSERT OR REPLACE INTO notes VALUES(?,?,?)').run(user.id, p.id, b.text); return response(res, { ok: true }); }
        }
        if (action === 'assist' && method === 'POST') {
          requireUser(); requireValue(config.model?.url, 'The reading assistant is not connected yet.', 503); const b = await json(req);
          requireValue(['digest', 'translation'].includes(b.kind) && Object.hasOwn(languages, b.language), 'Choose a reading action and language.');
          requireValue(!b.sectionId || p.sections.some(s => s.id === b.sectionId), 'Choose a section in this paper.');
          const dedupe = hash(JSON.stringify([p.id, p.revision, b.kind, b.language, b.sectionId || '', config.model.name]));
          const job = enqueue(user, { dedupe, paperId: p.id, revision: p.revision, kind: b.kind, language: b.language, sectionId: b.sectionId || null }); return response(res, { job }, 202);
        }
        if (action === 'artifacts' && method === 'GET') { requireUser(); return response(res, { artifacts: store.db.prepare('SELECT body FROM artifacts WHERE owner=?').all(user.id).map(r => JSON.parse(r.body)).filter(a => a.paperId === p.id && a.revision === p.revision) }); }
        if (action === 'publish' && method === 'POST') {
          requireUser(); requireValue(p.owner === user.id, 'Only the owner can publish.', 403); const b = await json(req);
          requireValue(config.github?.contentToken || config.github?.checkout, 'The public library connection is not configured yet.', 503);
          p.license = b.license; p.source = String(b.source || ''); mayPublish(p, b.attestation); store.savePaper(p);
          const job = enqueue(user, { kind: 'publish', paperId: p.id, dedupe: `publish:${p.id}:${p.revision}` }); return response(res, { job }, 202);
        }
      }
      const comment = path.match(/^\/api\/comments\/([a-f0-9-]{36})(?:\/(report))?$/);
      if (comment) {
        requireUser(); const c = store.db.prepare('SELECT * FROM comments WHERE id=?').get(comment[1]); requireValue(c, 'Comment not found.', 404); paperFor(c.paper);
        if (!comment[2] && method === 'DELETE') { requireValue(c.owner === user.id, 'Only the author can delete this comment.', 403); store.db.prepare('DELETE FROM comments WHERE id=?').run(c.id); return response(res, { ok: true }); }
        if (comment[2] && method === 'POST') { const b = await json(req); requireValue(typeof b.reason === 'string' && b.reason.trim() && b.reason.length <= 1000, 'Please describe the issue.'); store.db.prepare('INSERT OR REPLACE INTO reports VALUES(?,?,?)').run(`${user.id}:${c.id}`, user.id, JSON.stringify({ commentId: c.id, reason: b.reason, createdAt: new Date().toISOString() })); return response(res, { ok: true }); }
      }
      const retry = path.match(/^\/api\/jobs\/([a-f0-9-]{36})\/retry$/);
      if (retry && method === 'POST') {
        requireUser(); limit(`retry:${user.id}`, 3);
        const j = store.job(retry[1]); requireValue(j?.owner === user.id, 'Request not found.', 404);
        requireValue(j.state === 'failed', 'This request is already running or complete.', 409);
        requireValue(!(j.kind === 'import' && j.submittedAt && !j.pdfId), 'The conversion receipt is uncertain. Contact support before retrying to avoid another charge.', 409);
        requireValue((j.retries || 0) < 3, 'Please contact support before retrying again.', 429);
        j.state = 'queued'; j.message = 'Waiting to resume'; j.retries = (j.retries || 0) + 1; store.saveJob(j);
        return response(res, { ok: true }, 202);
      }
      const asset = path.match(/^\/content\/([\w-]+)\/(figures\/[\w.-]+)$/);
      if (asset && ['GET', 'HEAD'].includes(method)) {
        const p = paperFor(asset[1]); requireValue(p.assets.some(a => a.path === asset[2]), 'Figure not found.', 404);
        const bytes = await readFile(join(store.directory, 'papers', p.id, asset[2])); res.writeHead(200, { 'Content-Type': mime[extname(asset[2])] || 'application/octet-stream' }); return res.end(method === 'HEAD' ? undefined : bytes);
      }
      if (path.startsWith('/api/') || path.startsWith('/content/')) throw new AppError('Not found.', 404);
      if (method === 'GET' || method === 'HEAD') {
        requireValue(config.webRoot, 'The web app has not been built yet.', 503);
        const target = path === '/' ? '/index.html' : path;
        requireValue(/^\/[\w./-]+$/.test(target) && !target.includes('..'), 'Invalid path.');
        const filename = resolve(config.webRoot, `.${target}`);
        const bytes = await readFile(filename).catch(() => { throw new AppError('Not found.', 404); });
        res.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream', 'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' }); return res.end(method === 'HEAD' ? undefined : bytes);
      }
      throw new AppError('Not found.', 404);
    } catch (e) { if (!res.headersSent) response(res, { error: e instanceof AppError ? e.message : 'Something went wrong. Please try again.' }, e instanceof AppError ? e.status : 500); else res.end(); }
  });
  server.requestTimeout = 60_000; server.headersTimeout = 15_000;
  server.on('close', stopWorker);
  return server;
}

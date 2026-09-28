import {paperSegments,segmentSource,readingView} from './translation-pieces.mjs';
import {uploadContext,activeRecovery,bindRecovery,canUploadForJob,recoveryJob} from './import-recovery.mjs';
import {unlimitedAllowance,countsAsRequest} from './allowances.mjs';
import {createReadingSpace,recordActivity} from './reading-space.mjs';
import { createPaperSocial } from './paper-social.mjs';
import { createDiscovery } from './discovery.mjs';
import { paperMetadata } from './paper-metadata.mjs';
import { createServer } from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { AppError, requireValue, hash, makePaper, publicPaper, mayPublish, languages } from './domain.mjs';
import { providerJSON } from './network.mjs';
import { requestSharing } from './sharing.mjs';
import { startWorker, inspectPDF } from './providers.mjs';
import { nativeOrigins, nativeFlow, startNative, finishNative, redeemNative } from './native-auth.mjs';
import { createChats } from './chat.mjs';
import {createAgentActions} from './agent-actions.mjs';
import {inspectPaperIdentity} from './pdf-identity.mjs';
import { deleteAccount, visibleComments, acceptTerms, blocks } from './community.mjs';
import { requestArtifact, visibleArtifacts, safeJob } from './artifacts.mjs';
import { attachment, uploadAttachment } from './attachments.mjs';
import { createBilling } from './billing.mjs';
import { createAppleAuth } from './apple-auth.mjs';
import { sourceKey, reusedImport, reusablePaper } from './import-reuse.mjs';
import { creditTransaction, creditSummary, reserveImport, retryImportCredits, finishImportCredits, seedCreditPublications } from './credits.mjs';
const uuid = /^[a-f0-9-]{36}$/;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json' };
export function createApp(store, config, { worker = true, provider = providerJSON, billingOptions = {}, discoveryOptions = {} } = {}) {
  const origin = config.origin || 'http://127.0.0.1:4182';
  const secure = origin.startsWith('https://');
  requireValue(secure || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin), 'Only HTTPS or explicit loopback origins are permitted.');
  requireValue(!config.development || !secure, 'Development login cannot be enabled in production.');
  const cookieName = secure ? '__Host-onlyideas' : 'onlyideas-local';
  const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  seedCreditPublications(store, config);
  const stopWorker = worker ? startWorker(store, config) : () => {};
  const discovery = createDiscovery(store,discoveryOptions);
  const social = createPaperSocial(store,discovery);
  const space=createReadingSpace(store,social,discovery);
  const apple = createAppleAuth(store, config, provider);
  const billing = createBilling(store,config,billingOptions);
  const limits = new Map();
  const response = (res, data, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  const readBody = async (req, max = 100_000) => {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; requireValue(size <= max, 'Upload is too large.', 413); chunks.push(chunk); }
    return Buffer.concat(chunks);
  };
  const json = async req => { try { const data = JSON.parse((await readBody(req, 2_100_000)).toString()); if (req.onlyideasUser) store.requireActive(req.onlyideasUser.id); return data; } catch (e) { if (e instanceof AppError) throw e; throw new AppError('The request could not be read.'); } };
  const limit = (key, max = 40) => {
    const now = Date.now(); const entry = limits.get(key);
    const value = !entry || entry.until < now ? { count: 0, until: now + 60_000 } : entry;
    requireValue(++value.count <= max, 'Please wait a moment before trying again.', 429); limits.set(key, value);
    if (limits.size > 5000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  };
  const enqueue = (user, fields) => creditTransaction(store, () => {
    store.requireActive(user.id);
    const reused = reusedImport(store,user,fields); if (reused) return reused;
    const legacyDedupe = fields.dedupe;
    if (fields.kind === 'import' && fields.url) fields = { ...fields, dedupe: `import:${hash(sourceKey(fields.url) || fields.url)}` };
    const existing = store.existing(user.id, fields.dedupe) || store.existing(user.id,legacyDedupe)
      || (fields.kind==='import' && sourceKey(fields.url) && store.db.prepare("SELECT body FROM jobs WHERE owner=? AND json_extract(body,'$.kind')='import'").all(user.id).map(r=>JSON.parse(r.body)).find(j=>j.url && sourceKey(j.url)===sourceKey(fields.url)));
    if (existing) return existing;
    const today = store.jobs(user.id).filter(j => j.created > Date.now() - 86400_000 && countsAsRequest(j));
    requireValue(unlimitedAllowance(config,user.id) || today.length < (config.maxJobsPerUserPerDay || 20), 'Today’s request allowance is full. Try tomorrow.', 429);
    const { creditLimit, ...data } = fields;
    const job = { ...data, id: fields.id || randomUUID(), owner: user.id, created: Date.now(), state: 'queued', message: 'Waiting to start' };
    reserveImport(store, config, job, creditLimit);
    return store.saveJob(job);
  });
  const agentActions=createAgentActions(store,config,{enqueue,social});
  const chats=createChats(store,config,agentActions);
  const agentTimer=worker?setInterval(()=>agentActions.tick(),1500):null;agentTimer?.unref();
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      const url = new URL(req.url, origin), path = url.pathname, method = req.method;
      requireValue(!/%2f|%5c|%00|(?:^|\/)\.\.(?:\/|$)/i.test(req.url.split('?')[0]), 'Invalid path.');
      if (path.startsWith('/api/worker/')) {
        requireValue(chats.authorized(req), 'Worker authorization required.', 401);
        requireValue(method === 'POST', 'Method not allowed.', 405);
        if (path === '/api/worker/claim') return response(res, chats.claim());
        if (path === '/api/worker/result') return response(res, chats.finish(await json(req)));
        if (path === '/api/worker/paper') return response(res,chats.readPaper(await json(req)));
        requireValue(false, 'Not found.', 404);
      }
      if(path==='/api/billing/notifications/stripe'&&method==='POST'){limit(`stripe-webhook:${req.socket.remoteAddress}`,120);return response(res,await billing.stripeNotification(req,await readBody(req,250_000)))}
      const notification=path.match(/^\/api\/billing\/notifications\/(apple|google)$/);
      if(notification&&method==='POST') {
        limit(`billing-webhook:${req.socket.remoteAddress}`,120);
        return response(res,await billing.notification(notification[1],req,JSON.parse((await readBody(req,150_000)).toString())));
      }
      const nativeOrigin = nativeOrigins.has(req.headers.origin);
      if (nativeOrigin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-OnlyIdeas-Client, X-Request-Id, X-Paper-Title, X-Paper-Language, X-Paper-Sharing, X-File-Name, X-Credit-Limit, X-Research-Id, X-Recovery-Job-Id, X-Paper-Match-Confirm');
      }
      if (method === 'OPTIONS') { requireValue(nativeOrigin, 'Origin not allowed.', 403); res.writeHead(204); return res.end(); }
      const native = nativeOrigin && req.headers['x-onlyideas-client'] === 'native';
      requireValue(['GET', 'POST', 'DELETE', 'PUT', 'HEAD'].includes(method), 'Method not allowed.', 405);
      if (method !== 'GET' && method !== 'HEAD') requireValue(req.headers.origin === origin || native, 'Please reload the app and try again.', 403);
      const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim().split('=')));
      const token = native ? String(req.headers.authorization || '').match(/^Bearer ([a-f0-9-]{72})$/)?.[1] : nativeOrigin ? null : cookies[cookieName];
      const user = store.session(token);
      req.onlyideasUser = user;
      if (user && !native) res.setHeader('Set-Cookie', cookie(cookieName, token, 90 * 86400));
      const requireUser = () => { requireValue(user, 'Sign in to save papers and join the conversation.', 401); return user; };
      if (path === '/api/attachments' && method === 'POST') {
        requireUser();limit(`attachment:${user.id}`,10);
        const name=decodeURIComponent(req.headers['x-file-name']||'file');
        const bytes=await readBody(req,20_000_000);
        return response(res,{attachment:await uploadAttachment(store,config,user,bytes,name,enqueue,{sharing:req.headers['x-paper-sharing']==='shared'?'shared':'private',creditLimit:Number(req.headers['x-credit-limit']),inspectPDF})},202);
      }
      const attached=path.match(/^\/api\/attachments\/([a-f0-9-]{36})$/);
      if(attached&&method==='GET'){requireUser();return response(res,{attachment:attachment(store,attached[1],user.id)});}
      if (path === '/api/chats' || path.startsWith('/api/chats/')) {
        limit(`chat:${user?.id || req.socket.remoteAddress}`, 60);
        const result = await chats.client(path, method, user, method === 'POST' ? await json(req) : {}, enqueue);
        requireValue(result, 'Not found.', 404); return response(res, result);
      }
      const paperFor = id => { const p = store.paper(id); requireValue(p && store.active(p.owner) && !store.blocked(user?.id, p.owner) && (p.visibility === 'public' || p.owner === user?.id), 'Paper not found.', 404); return p; };
      if (path.startsWith('/api/')) limit(user?.id || req.socket.remoteAddress, 240);
      if (['/api/saved','/api/liked'].includes(path) && method === 'GET') { requireUser();return response(res,{papers:social.saved(user,path==='/api/liked'?'liked':'saved')}); }
      if(path==='/api/preferences'){requireUser();if(method==='GET')return response(res,{preferences:space.preferences(user)});if(method==='PUT')return response(res,{preferences:space.savePreferences(user,await json(req))});}
      if(path==='/api/activity'&&method==='GET'){requireUser();return response(res,space.history(user));}
      if(path==='/api/inbox'){requireUser();if(method==='GET')return response(res,space.inbox(user));if(method==='PUT')return response(res,space.markRead(user,await json(req)));}
      if(path==='/api/daily'&&method==='GET'){requireUser();return response(res,await space.digest(user));}
      const socialMatch=path.match(/^\/api\/items\/([\w-]+)(?:\/(comments))?$/);
      if(socialMatch){const ref=socialMatch[1];if(method==='GET')return response(res,socialMatch[2]?social.comments(ref,user):social.state(ref,user));requireUser();limit(`social:${user.id}`,40);const body=await json(req);if(method==='PUT'&&!socialMatch[2])return response(res,social.update(ref,user,body));if(method==='POST'&&socialMatch[2])return response(res,social.post(ref,user,body),201);requireValue(false,'Method not allowed.',405);}
      if (path.startsWith('/api/discovery/item/') && method==='GET') return response(res,{paper:discovery.item(path.split('/').at(-1),user)});
      if (path === '/api/discovery/taxonomy' && method === 'GET') return response(res, discovery.taxonomy);
      if (path === '/api/discovery' && method === 'GET') {
        limit(`discovery:${user?.id||req.socket.remoteAddress}`,40);
        return response(res,await discovery.find(Object.fromEntries(url.searchParams),user));
      }
      if (path === '/api/discovery/import' && method === 'POST') {
        requireUser();limit(`import:${user.id}`,10);
        const body=await json(req),card=discovery.item(body.id,user);
        if(card.paperId)return response(res,{paperId:card.paperId,reused:true});
        const recovering=recoveryJob(store,user.id,'r:'+card.id);if(recovering&&recovering.state!=='failed')return response(res,{job:safeJob(recovering)},202);
        const sourceURL=card.pdfUrl||card.source;requireValue(sourceURL,'Open the source page or upload your copy.');
        requireValue(config.mathpix?.appKey,'PDF conversion is not connected yet.',503);
        const sharing=body.sharing==='private'?'private':'shared';
        const job=enqueue(user,{kind:'import',sharing,creditLimit:body.creditLimit,url:sourceURL,sourcePage:card.source,downloadSources:card.downloadSources||[],discoveryId:card.id,dedupe:`import:${hash(sourceURL)}`,metadata:{...paperMetadata(card),title:card.title,authors:card.authors,language:'en',category:card.discipline||'Research',license:'private'}});
        if(job.state==='failed')return response(res,{error:job.message,job:safeJob(job),source:card.source,code:job.errorCode||'import_failed'},409);
        return response(res,{job:safeJob(job),paperId:job.paperId},202);
      }
      if (path === '/api/billing' && method === 'GET') {requireUser();return response(res,billing.catalog(user));}
      if(['/api/billing/checkout','/api/billing/portal','/api/billing/restore'].includes(path)&&method==='POST'){requireUser();requireValue(!native,'Use your device store for subscriptions.',403);limit(`web-purchase:${user.id}`,10);return response(res,await billing.web(path.split('/').at(-1),await json(req),user))}
      const purchase=path.match(/^\/api\/billing\/(apple|google)$/);
      if(purchase&&method==='POST') {requireUser();limit(`purchase:${user.id}`,20);return response(res,await billing.purchase(purchase[1],await json(req),user));}
      if (path === '/api/credits' && method === 'GET') { requireUser(); return response(res, creditSummary(store,user.id,config)); }
      if (path === '/api/health' && method === 'GET') return response(res, { service: 'onlyideas', version: '1.0.1', ok: true });
      if (path === '/api/auth/apple/start' && method === 'POST') {
        requireValue(native, 'Open sign-in from the app.', 403); limit(`apple:${req.socket.remoteAddress}`, 20);
        return response(res, apple.start((await json(req)).challenge));
      }
      if (path === '/api/auth/apple/complete' && method === 'POST') {
        requireValue(native, 'Open sign-in from the app.', 403); limit(`apple:${req.socket.remoteAddress}`, 20);
        return response(res, await apple.complete(await json(req)));
      }
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
      if (path === '/api/session' && method === 'GET') return response(res, { user, development: !!config.development, capabilities: { login: !!config.github?.clientId, apple: apple.enabled, pdf: !!config.mathpix?.appKey, assistant: !!config.model?.url, publishing: !!(config.github?.contentToken || config.github?.checkout) }, languages, maxPages: config.maxPages || 30 });
      if (path === '/api/auth/local' && method === 'POST') {
        requireValue(config.development && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress), 'Not available.', 404);
        const local = { id: 'local-reader', name: 'Local reader', login: 'local-reader' };
        res.setHeader('Set-Cookie', cookie(cookieName, store.createSession(local), 90 * 86400)); return response(res, { user: local });
      }
      if (path === '/api/account' && method === 'DELETE') {
        requireUser(); const b = await json(req);
        requireValue(b.confirm === 'DELETE', 'Confirm permanent account deletion.');
        await apple.revoke(user);
        await deleteAccount(store, user);
        if (!native) res.setHeader('Set-Cookie', cookie(cookieName, '', 0));
        return response(res, { ok: true });
      }
      if (path === '/api/blocks' && method === 'GET') { requireUser(); return response(res, { blocks: blocks(store, user) }); }
      if (path === '/api/reports' && method === 'POST') {
        requireUser(); limit(`report:${user.id}`, 5); const b = await json(req);
        requireValue(typeof b.reason === 'string' && b.reason.trim().length >= 3 && b.reason.length <= 5000, 'Describe the issue in 3–5,000 characters.');
        const context = String(b.context || '').slice(0, 1000);
        const id = randomUUID();
        store.db.prepare('INSERT INTO reports VALUES(?,?,?)').run(id, user.id, JSON.stringify({ context, reason: b.reason.trim(), createdAt: new Date().toISOString() }));
        return response(res, { ok: true }, 201);
      }
      const unblock = path.match(/^\/api\/blocks\/([a-f0-9]{64})$/);
      if (unblock && method === 'DELETE') {
        requireUser();
        for (const b of store.db.prepare('SELECT blocked FROM blocks WHERE owner=?').all(user.id)) {
          if (hash(b.blocked) === unblock[1]) store.db.prepare('DELETE FROM blocks WHERE owner=? AND blocked=?').run(user.id, b.blocked);
        }
        return response(res, { ok: true });
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
        const u = { id: store.identity(`github-${account.id}`), name: account.name || account.login, login: account.login };
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
      if (path === '/api/papers' && method === 'GET') return response(res, { papers: store.papers(user?.id).filter(p => store.active(p.owner) && !store.blocked(user?.id, p.owner)).map(publicPaper) });
      if (path === '/api/papers/markdown' && method === 'POST') {
        requireUser(); const data = await json(req); limit(`import:${user.id}`, 10);
        requireValue(uuid.test(data.requestId || ''), 'A request ID is required.');
        const existing = store.paper(data.requestId);
        if (existing) { requireValue(existing.owner === user.id, 'Request ID unavailable.', 409); return response(res, { paper: existing }); }
        requireValue(!/!\[[^\]]*\]\(|\\includegraphics|<img\b/i.test(data.mmd || ''), 'For papers with figures, upload the PDF so the figures are preserved. Text-only Markdown can be imported here.');
        const p = makePaper({ ...data, id: data.requestId, owner: user.id, license: 'private', assets: [] });
        const reusable = reusablePaper(store,user.id,{mmd:p.mmd});
        if (reusable) { requestSharing(store,reusable,data.sharing); return response(res,{paper:{...reusable,owner:undefined,isOwner:reusable.owner===user.id},reused:true}); }
        creditTransaction(store, () => {
          const receipt={id:p.id,owner:user.id,kind:'markdown',sharing:data.sharing};
          reserveImport(store,config,receipt,data.creditLimit);
          store.savePaper(p); requestSharing(store,p,data.sharing);
          finishImportCredits(store,receipt,true);
        });
        return response(res, { paper: p }, 201);
      }
      if (path === '/api/import' && method === 'POST') {
        requireUser();
        limit(`import:${user.id}`, 5);
        const requestId = req.headers['x-request-id']; requireValue(uuid.test(requestId || ''), 'A request ID is required.');
        const previousRequest = store.job(requestId); if (previousRequest) { requireValue(previousRequest.owner === user.id, 'Request ID unavailable.', 409); return response(res, { job: previousRequest }, 202); }
        const isPDF = req.headers['content-type'] === 'application/pdf';
        const context=uploadContext(store,discovery,user,req.headers);
        requireValue(!context||isPDF,'Choose a PDF for this paper.');
        let metadata, link = null, bytes, sharing = 'private', creditLimit, pages;
        if (isPDF) {
          bytes = await readBody(req, 20_000_000); requireValue(bytes.subarray(0, 5).toString() === '%PDF-', 'Choose a valid PDF.');
          sharing = req.headers['x-paper-sharing'] === 'shared' ? 'shared' : 'private';
          creditLimit = Number(req.headers['x-credit-limit']);
          metadata = { title: decodeURIComponent(req.headers['x-paper-title'] || 'My paper'), language: req.headers['x-paper-language'] || 'en' };
        } else { const body = await json(req); metadata = body; sharing = body.sharing === 'shared' ? 'shared' : 'private'; creditLimit=body.creditLimit; link = body.url; requireValue(typeof link === 'string' && link.length <= 2000 && link.startsWith('https://'), 'Enter a direct HTTPS PDF link.'); }
        if(context){metadata=context.metadata;sharing=context.sharing||sharing;const prior=activeRecovery(store,user.id,context);if(prior)return response(res,{job:safeJob(prior)},202);}
        requireValue(typeof metadata.title === 'string' && metadata.title.trim() && metadata.title.length <= 300, 'Add a paper title.');
        requireValue(Object.hasOwn(languages, metadata.language || 'en'), 'Choose a supported language.');
        const dedupe = `import:${hash(bytes || link)}`;
        if (bytes) { const dir = join(store.directory, 'jobs', requestId); await mkdir(dir, { recursive: true, mode: 0o700 }); await writeFile(join(dir, 'source.pdf'), bytes, { mode: 0o600 }); }
        let job,identity;
        try {
          if(context&&bytes){
            identity=await inspectPaperIdentity(join(store.directory,'jobs',requestId,'source.pdf'),metadata);
            const uncertain=identity.state==='uncertain',confirmed=req.headers['x-paper-match-confirm']===hash(bytes);
            if(identity.state==='mismatch'||uncertain&&!confirmed){await rm(join(store.directory,'jobs',requestId),{recursive:true,force:true});return response(res,{error:uncertain?'We could not verify this PDF’s title. Check that it matches the selected paper before continuing.':'This PDF does not appear to match the selected paper. Choose the correct PDF, or import it as a separate paper.',code:uncertain?'pdf_match_uncertain':'pdf_match_mismatch',expectedTitle:metadata.title,observedTitle:identity.title,confirmation:uncertain?hash(bytes):undefined},409);}
            if(uncertain&&confirmed)identity={...identity,state:'user_confirmed'};
          }
          const cached = reusablePaper(store,user.id,{url:link,sourceDigest:bytes?hash(bytes):undefined});
          if (!cached) requireValue(config.mathpix?.appKey, 'PDF conversion is not connected yet. Import Markdown in the meantime.', 503);
          if (!cached && bytes && config.credits?.enabled === true && sharing !== 'shared') pages = await inspectPDF(join(store.directory,'jobs',requestId,'source.pdf'),config.maxPages || 30);
          job = creditTransaction(store,()=>{const prior=activeRecovery(store,user.id,context);if(prior)return prior;
          const queued = enqueue(user, { id: requestId, dedupe, kind: 'import', sharing, url: link, creditLimit, pages, sourceDigest:bytes?hash(bytes):undefined, uploadSource:context?.source,paperIdentity:identity, metadata: { ...paperMetadata(metadata), title: metadata.title, authors: String(metadata.authors || ''), language: metadata.language || 'en', license: 'private', category: String(metadata.category || 'Research') } });
          bindRecovery(store,user.id,context,queued);return queued;});
        }
        catch (error) { if (bytes) await rm(join(store.directory, 'jobs', requestId), { recursive: true, force: true }); throw error; }
        if (bytes && (job.reused || job.id !== requestId)) await rm(join(store.directory,'jobs',requestId),{recursive:true,force:true});
        if (job.paperId) requestSharing(store,store.paper(job.paperId),sharing);
        return response(res, { job }, 202);
      }
      if (path === '/api/jobs' && method === 'GET') { requireUser(); return response(res, { jobs: store.jobs(user.id).filter(j=>{const p=j.paperId?store.paper(j.paperId):null;return j.owner===user.id||(p&&store.active(p.owner)&&!store.blocked(user.id,p.owner)&&(p.owner===user.id||p.visibility==='public'));}).map(safeJob) }); }
      const matchPaper = path.match(/^\/api\/papers\/([\w-]+)(?:\/(comments|notes|assist|publish|artifacts|export|segments|reading))?$/);
      if (matchPaper) {
        const p = paperFor(matchPaper[1]), action = matchPaper[2];
        if(action==='reading'&&method==='GET')return response(res,readingView(store,p,user,url.searchParams.get('language')||'en'));
        if (!action && method === 'GET') return response(res, { paper: { ...p, isOwner: p.owner === user?.id, owner: undefined } });
        if(action==='segments'&&method==='GET')return response(res,{segments:paperSegments(p.mmd,p.language).filter(s=>s.display.length>=30&&s.translatable).map(s=>({...s,text:s.display,sentences:s.sentences.filter(x=>x.display).map(x=>({...x,text:x.display}))}))});
        if (action === 'export' && method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${p.id}.mmd"` }); return res.end(p.mmd); }
        if (action === 'comments' && method === 'GET') return response(res, { comments: visibleComments(store, p.id, user) });
        if (action === 'comments' && method === 'POST') {
          requireUser(); limit(`comment:${user.id}`, 10); const b = await json(req);
          if (p.visibility === 'public') acceptTerms(store, user, b.acceptTerms);
          requireValue(uuid.test(b.id || '') && typeof b.text === 'string' && b.text.trim().length > 0 && b.text.length <= 5000, 'Write a comment of up to 5,000 characters.');
          requireValue(!b.sectionId || p.sections.some(s => s.id === b.sectionId), 'Select a passage from this paper.');
          requireValue(!b.paragraphId || /^p-[a-f0-9]{1,8}-[1-9][0-9]{0,5}$/.test(b.paragraphId),'Select a paragraph from this paper.');
          requireValue(b.revision === p.revision, 'The paper changed. Reload before commenting.');
          const prior = store.db.prepare('SELECT * FROM comments WHERE id=?').get(b.id);
          if (prior) { requireValue(prior.owner === user.id && prior.paper === p.id, 'Comment ID unavailable.', 409); return response(res, { ok: true }); }
          const c = { id: b.id, paperId: p.id, owner: user.id, visibility: p.visibility === 'public' ? 'pending' : 'private', moderation: p.visibility === 'public' ? 'pending' : 'private', author: user.name, login: user.login, text: b.text.trim(), sectionId: b.sectionId || null, paragraphId:b.paragraphId||null, quote: String(b.quote || '').slice(0, 1200), revision: p.revision, createdAt: new Date().toISOString() };
          store.db.prepare('INSERT INTO comments VALUES(?,?,?,?,?)').run(c.id, p.id, user.id, JSON.stringify(c), Date.now());recordActivity(store,user.id,'comment',p.id,{},'comment:'+c.id); return response(res, { ok: true }, 201);
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
          requireValue(!b.segmentId||b.kind==='translation'&&!b.sectionId,'Choose either a passage or a section.');
          if(b.segmentId)segmentSource(p,b.segmentId);
          const job = requestArtifact(store, config, user, p, { kind:b.kind, language:b.language, sectionId:b.sectionId||null,segmentId:b.segmentId||null }); return response(res, { job:safeJob(job) }, job.state==='completed'?200:202);
        }
        if (action === 'artifacts' && method === 'GET') return response(res, { artifacts: visibleArtifacts(store,p,user) });
        if (action === 'publish' && method === 'POST') {
          requireUser(); requireValue(p.owner === user.id, 'Only the owner can publish.', 403); const b = await json(req);
          requireValue(config.github?.contentToken || config.github?.checkout, 'The public library connection is not configured yet.', 503);
          acceptTerms(store, user, b.acceptTerms);
          p.license = b.license; p.source = String(b.source || ''); mayPublish(p, b.attestation); store.savePaper(p);
          const job = enqueue(user, { kind: 'publish', paperId: p.id, dedupe: `publish:${p.id}:${p.revision}` });
          if (job.state === 'queued') { job.state = 'awaiting_review'; job.message = 'Waiting for a community review before public sharing'; store.saveJob(job); }
          return response(res, { job }, 202);
        }
      }
      const comment = path.match(/^\/api\/comments\/([a-f0-9-]{36})(?:\/(report|block))?$/);
      if (comment) {
        requireUser(); const c = store.db.prepare('SELECT * FROM comments WHERE id=?').get(comment[1]); requireValue(c, 'Comment not found.', 404); if(c.paper.startsWith('item-'))social.check(c.paper,user);else paperFor(c.paper);
        if (!comment[2] && method === 'DELETE') { requireValue(c.owner === user.id, 'Only the author can delete this comment.', 403); store.db.prepare('DELETE FROM comments WHERE id=?').run(c.id); return response(res, { ok: true }); }
        if (comment[2] === 'block' && method === 'POST') {
          requireValue(c.owner !== user.id, 'You cannot block yourself.');
          const data = JSON.parse(c.body);
          requireValue(data.visibility === 'public' && data.moderation === 'approved', 'Comment not found.', 404);
          store.db.prepare('INSERT OR REPLACE INTO blocks VALUES(?,?,?)').run(user.id, c.owner, String(data.author));
          return response(res, { ok: true });
        }
        if (comment[2] === 'report' && method === 'POST') { const b = await json(req); requireValue(typeof b.reason === 'string' && b.reason.trim() && b.reason.length <= 1000, 'Please describe the issue.'); store.db.prepare('INSERT OR REPLACE INTO reports VALUES(?,?,?)').run(`${user.id}:${c.id}`, user.id, JSON.stringify({ commentId: c.id, reason: b.reason, createdAt: new Date().toISOString() })); return response(res, { ok: true }); }
      }
      const retry = path.match(/^\/api\/jobs\/([a-f0-9-]{36})\/retry$/);
      if (retry && method === 'POST') {
        requireUser(); limit(`retry:${user.id}`, 3);
        const j = store.job(retry[1]); requireValue(j && (j.owner===user.id || store.db.prepare('SELECT 1 FROM job_subscriptions WHERE owner=? AND job=?').get(user.id,j.id)), 'Request not found.', 404); if(j.paperId)paperFor(j.paperId);
        requireValue(j.kind !== 'publish', 'Publication decisions must be reviewed by support.', 403);
        requireValue(j.state === 'failed', 'This request is already running or complete.', 409);
        requireValue(!((j.kind === 'import' || j.kind==='attachment') && j.submittedAt && !j.pdfId), 'The conversion receipt is uncertain. Contact support before retrying to avoid another charge.', 409);
        requireValue(!j.ocrSubmittedAt || j.ocrText!==undefined || j.ocrResult, 'The image conversion receipt is uncertain. Contact support before retrying to avoid another charge.',409);
        requireValue(canUploadForJob(j) || (j.retries || 0) < 3, 'Please contact support before retrying again.', 429);
        const consent = await json(req);
        const recovering=recoveryJob(store,user.id,'job:'+j.id)||(j.discoveryId?recoveryJob(store,user.id,'r:'+j.discoveryId):null);
        if(recovering&&recovering.state!=='failed')return response(res,{ok:true,job:safeJob(recovering)},202);
        creditTransaction(store, () => {
          const current=store.job(j.id);requireValue(current?.state==='failed','This request is already running or complete.',409);
          retryImportCredits(store,current,consent.creditLimit);
          const cached=store.db.prepare("SELECT body FROM discovery_items WHERE json_extract(body,'$.pdfUrl')=? LIMIT 1").get(current.url);if(cached){const card=JSON.parse(cached.body);current.downloadSources=card.downloadSources||[];current.sourcePage=card.source;current.discoveryId=card.id;current.metadata={...current.metadata,...paperMetadata(card)};}
          current.errorCode=null;current.state = 'queued'; current.message = 'Waiting to resume'; current.retries = (current.retries || 0) + 1; store.saveJob(current);
        });
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
  server.on('close', () => {stopWorker();billing.stop();if(agentTimer)clearInterval(agentTimer);});
  return server;
}

import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { AppError, requireValue } from './domain.mjs';

export function isPublicIP(value) {
  try { return ipaddr.process(value).range() === 'unicast'; } catch { return false; }
}
// Pin the vetted DNS address in the socket. Revalidate every redirect.
export async function downloadPublic(input, { maxBytes = 20_000_000, redirects = 4, resolver = lookup, timeout = 45_000, withMetadata = false, signal, deadline = Date.now()+timeout } = {}) {
  signal?.throwIfAborted();
  let url;
  try { url = new URL(input); } catch { throw new AppError('Enter a complete HTTPS PDF link.'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443'), 'Use a public HTTPS URL without credentials or a custom port.');
  let dnsTimer;
  const addresses = await Promise.race([resolver(url.hostname, { all: true }),new Promise((_,reject)=>{dnsTimer=setTimeout(()=>reject(new AppError('The source took too long to respond.')),Math.max(1,Math.min(8000,deadline-Date.now())));})]).finally(()=>clearTimeout(dnsTimer));
  requireValue(Date.now()<deadline,'The source took too long to respond.');
  requireValue(addresses.length && addresses.every(a => isPublicIP(a.address)), 'This address is not a public download source.');
  const chosen = addresses.find(a=>a.family===4) || addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.get(url, { signal, headers: { 'User-Agent': 'OnlyIdeas/0.1 (+https://onlyideas.art)', 'Accept-Encoding': 'identity', 'Accept':'application/pdf, text/html;q=0.9, application/json;q=0.8, */*;q=0.5' }, lookup: (_host, options, cb) => options.all ? cb(null, [chosen]) : cb(null, chosen.address, chosen.family) }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        if (!redirects || !res.headers.location) return reject(new AppError('Too many redirects from this source.'));
        downloadPublic(new URL(res.headers.location, url).href, { maxBytes, redirects: redirects - 1, resolver, timeout, withMetadata, signal, deadline }).then(resolve, reject); return;
      }
      if (res.statusCode !== 200) { res.resume(); const error=new AppError(`The source returned HTTP ${res.statusCode}. Try uploading your copy.`);error.upstreamStatus=res.statusCode;error.retryAfterMs=Math.min(1200,Math.max(0,Number(res.headers['retry-after']||0)*1000));reject(error); return; }
      const chunks = []; let size = 0;
      if (Number(res.headers['content-length']) > maxBytes) { req.destroy(new AppError('Download exceeds the size limit.')); return; }
      res.on('data', chunk => { size += chunk.length; if (size > maxBytes) req.destroy(new AppError('Download exceeds the size limit.')); else chunks.push(chunk); });
      res.on('end', () => { if(!res.complete)return reject(new AppError('The source connection was interrupted.')); const bytes=Buffer.concat(chunks);resolve(withMetadata?{bytes,url:url.href}:bytes); });
      res.on('aborted',()=>{const e=new AppError('The source download was aborted.');e.code='ERR_STREAM_PREMATURE_CLOSE';reject(e);});
      res.on('error', reject);
    });
    const timer = setTimeout(() => req.destroy(new AppError('The source took too long to respond.')), Math.max(1,deadline-Date.now()));
    req.on('close', () => clearTimeout(timer)); req.on('error', reject);
  });
}

export async function providerJSON(url, options = {}) {
  const res = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(options.timeout || 60_000) });
  if (!res.ok) throw new AppError(`Provider returned HTTP ${res.status}. Please try again later.`, 502);
  const body = await res.text();
  requireValue(body.length <= 4_000_000, 'Provider response is too large.', 502);
  try { return JSON.parse(body); } catch { throw new AppError('Provider returned an unreadable response.', 502); }
}

import https from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { AppError, requireValue } from './domain.mjs';

export function isPublicIP(value) {
  try { return ipaddr.process(value).range() === 'unicast'; } catch { return false; }
}
// Pin the vetted DNS address in the socket. Revalidate every redirect.
export async function downloadPublic(input, { maxBytes = 20_000_000, redirects = 4, resolver = lookup } = {}) {
  let url;
  try { url = new URL(input); } catch { throw new AppError('Enter a complete HTTPS PDF link.'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443'), 'Use a public HTTPS URL without credentials or a custom port.');
  const addresses = await resolver(url.hostname, { all: true });
  requireValue(addresses.length && addresses.every(a => isPublicIP(a.address)), 'This address is not a public download source.');
  const chosen = addresses[0];
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'OnlyIdeas/0.1 (+https://onlyideas.art)', 'Accept-Encoding': 'identity' }, lookup: (_host, options, cb) => options.all ? cb(null, [chosen]) : cb(null, chosen.address, chosen.family) }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        if (!redirects || !res.headers.location) return reject(new AppError('Too many redirects from this source.'));
        downloadPublic(new URL(res.headers.location, url).href, { maxBytes, redirects: redirects - 1, resolver }).then(resolve, reject); return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new AppError(`The source returned HTTP ${res.statusCode}. Try uploading your copy.`)); return; }
      const chunks = []; let size = 0;
      if (Number(res.headers['content-length']) > maxBytes) { req.destroy(new AppError('Download exceeds the size limit.')); return; }
      res.on('data', chunk => { size += chunk.length; if (size > maxBytes) req.destroy(new AppError('Download exceeds the size limit.')); else chunks.push(chunk); });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    const timer = setTimeout(() => req.destroy(new AppError('The source took too long to respond.')), 45_000);
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

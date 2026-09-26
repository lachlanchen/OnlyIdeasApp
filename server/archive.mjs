import { unzipSync } from 'fflate';
import { hash, requireValue } from './domain.mjs';
export function unpackMMD(bytes) {
  let total = 0, count = 0;
  const files = unzipSync(bytes, { filter: file => {
    count++; total += file.originalSize;
    requireValue(count <= 500 && total <= 50_000_000 && file.originalSize <= 8_000_000, 'Converted archive exceeds its limits.');
    requireValue(!file.name.startsWith('/') && !file.name.includes('\\') && !file.name.includes(':') && !file.name.split('/').includes('..'), 'Unsafe path in converted archive.');
    return !file.name.endsWith('/');
  } });
  const entries = Object.entries(files), documents = entries.filter(([name]) => /\.mmd$/i.test(name));
  requireValue(documents.length === 1, 'Conversion must contain exactly one MMD document.');
  const [documentName, document] = documents[0];
  const directory = documentName.includes('/') ? documentName.slice(0, documentName.lastIndexOf('/') + 1) : '';
  let mmd = new TextDecoder().decode(document);
  const assets = [];
  for (const [name, data] of entries) {
    const ext = name.match(/\.(png|jpe?g|webp|gif)$/i)?.[1]?.toLowerCase();
    if (!ext) continue;
    const local = `figures/${hash(data).slice(0, 24)}.${ext}`;
    const relative = name.startsWith(directory) ? name.slice(directory.length) : name;
    // Replace complete references only, so names that are prefixes stay intact.
    for (const ref of [relative, `./${relative}`, name, `./${name}`]) {
      mmd = mmd.split(`](${ref})`).join(`](${local})`).split(`{${ref}}`).join(`{${local}}`);
    }
    if (!assets.some(a => a.path === local)) assets.push({ path: local, data: Buffer.from(data), bytes: data.length });
  }
  requireValue(!/https:\/\/cdn\.mathpix\.com\/(?:crop|image)/i.test(mmd), 'Conversion still references temporary figures; the complete archive is required.');
  const refs = [...mmd.matchAll(/!\[[^\]]*\]\(([^\s)]+)\)/g), ...mmd.matchAll(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g)].map(m => m[1]);
  requireValue(refs.every(ref => assets.some(a => a.path === ref)), 'A referenced figure is missing from the conversion archive.');
  return { mmd, assets };
}

// Reuse the approved store icon so the Play banner cannot retain an old logo.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const root = new URL('../../', import.meta.url);
const directory = new URL('store/google/', root);
const source = await fs.readFile(new URL('feature.svg', directory), 'utf8');
const icon = await fs.readFile(new URL('icon.png', directory));
if (!source.includes('href="icon.png"')) throw new Error('Feature icon reference missing');
const svg = source.replace('href="icon.png"', `href="data:image/png;base64,${icon.toString('base64')}"`);
await sharp(Buffer.from(svg)).flatten({ background: '#f7f6ef' }).png().toFile(new URL('feature.png', directory).pathname);
console.log('Exported Play feature graphic with the approved store icon.');

import { paperMetadata } from './paper-metadata.mjs';
import { createHash } from 'node:crypto';
export const hash = value => createHash('sha256').update(value).digest('hex');
export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const requireValue = (condition, message, status = 400) => { if (!condition) throw new AppError(message, status); };
export const languages = { en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ja: '日本語', ko: '한국어', fr: 'Français', de: 'Deutsch', es: 'Español', ar: 'العربية', ru: 'Русский', vi: 'Tiếng Việt' };
export function sections(mmd) {
  const pieces = mmd.replace(/\r\n/g, '\n').split(/(?=^#{1,3} |^\\(?:sub)*section\*?\{)/m).filter(s => s.trim());
  const counts = new Map();
  return pieces.map(text => {
    const digest = hash(text.trim()).slice(0, 16), n = (counts.get(digest) || 0) + 1;
    counts.set(digest, n);
    const title = text.match(/^#{1,3} (.+)|^\\(?:sub)*section\*?\{([^}]+)\}/m);
    return { id: `s-${digest}-${n}`, title: title?.[1] || title?.[2] || 'Opening', text: text.trim() };
  });
}
export function makePaper({ id, title, mmd, owner, source = '', authors = '', license = 'private', category = 'Research', assets = [], language = 'en', ...metadata }) {
  requireValue(typeof mmd === 'string' && mmd.trim() && Buffer.byteLength(mmd) <= 2_000_000, 'Readable text must be between 1 byte and 2 MB.');
  requireValue(typeof title === 'string' && title.trim().length <= 300 && title.trim(), 'Please add a title (up to 300 characters).');
  requireValue(Object.hasOwn(languages, language), 'Choose a supported language.');
  return { ...paperMetadata(metadata), id, title: title.trim(), authors: String(authors).slice(0, 500), source: String(source).slice(0, 2000), license, category: String(category).slice(0, 60), language, owner, visibility: 'private', createdAt: new Date().toISOString(), revision: hash(mmd), mmd, assets, sections: sections(mmd) };
}
export function mayPublish(paper, attestation) {
  requireValue(attestation === true, 'Confirm that you have the right to publish this paper and its figures.');
  requireValue(['CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0', 'author-permission'].includes(paper.license), 'Add a redistribution license or author permission before publishing.');
  requireValue(paper.source.startsWith('https://') || paper.license === 'author-permission' || ['uploader-confirmed','operator-reviewed-permission'].includes(paper.provenance?.verification)&&paper.provenance?.attestation===true, 'A public source URL is required.');
}
export const publicPaper = p => {
  const { mmd, sections, owner, ...summary } = p;
  return { ...summary, sectionCount: sections.length, words: mmd.split(/\s+/).length };
};

import { randomUUID } from 'node:crypto';

// Curated source metadata. Approval still requires review of the converted paper
// and all figures; an open URL alone never establishes redistribution permission.
const reviewedSources = [
  { urls: ['https://arxiv.org/pdf/2205.01833', 'https://arxiv.org/pdf/2205.01833v2'], title: 'OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts', authors: 'Jason Priem, Heather Piwowar, Richard Orr', license: 'CC0-1.0', source: 'https://arxiv.org/abs/2205.01833v2', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  { urls: ['https://www.nature.com/articles/s41534-019-0145-z.pdf'], title: 'Measuring holographic entanglement entropy on a quantum simulator', authors: 'Keren Li, Muxin Han, Dongxue Qu, Zichang Huang, Guilu Long, Yidun Wan, Dawei Lu, Bei Zeng, Raymond Laflamme', license: 'CC-BY-4.0', source: 'https://www.nature.com/articles/s41534-019-0145-z', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
];
export function reviewedSource(url) {
  // Exact canonical URLs only: no user-supplied license or redirect is trusted.
  return reviewedSources.find(s => s.urls.includes(url));
}
export function requestSharing(store, paper, sharing = 'private') {
  if (!paper || sharing !== 'shared' || paper.visibility === 'public') return null;
  store.requireActive(paper.owner);
  const proof = paper.provenance?.userSupplied ? null : reviewedSource(paper.source);
  if (proof) {
    paper.title = proof.title; paper.authors = proof.authors; paper.license = proof.license;
    paper.provenance = { source: proof.source, licenseUrl: proof.licenseUrl, checked: '2026-09-27', changes: 'PDF converted to reflowable Mathpix Markdown; figures retained. Check equations against the source.' };
  }
  const origin=store.job(paper.id);
  const verified=origin?.owner===paper.owner&&!origin.uploadSource&&origin.sourceLicense?.verification==='indexed-source-license'&&origin.sourceLicense.license===paper.license;
  paper.sharing = verified?'publishing':'awaiting_review'; store.savePaper(paper);
  const dedupe = `publish:${paper.id}:${paper.revision}`;
  const existing = store.existing(paper.owner, dedupe);
  if (existing) return existing;
  return store.saveJob({ id: randomUUID(), owner: paper.owner, kind: 'publish', paperId: paper.id, dedupe, created: Date.now(), state: verified?'queued':'awaiting_review', reviewed:!!verified, message: verified?'Sharing the verified open-access paper':proof ? 'Shared library · waiting for source and community review' : 'Shared library · source permission needs review before publication' });
}

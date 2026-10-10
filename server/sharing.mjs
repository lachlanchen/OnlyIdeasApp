import { randomUUID } from 'node:crypto';
import { publicationFingerprint, publicationState } from './publication-review.mjs';

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
export function requestSharing(store, paper, sharing = 'private', consent = null) {
  if (!paper || sharing !== 'shared' || paper.visibility === 'public') return null;
  store.requireActive(paper.owner);
  const proof = paper.provenance?.userSupplied ? null : reviewedSource(paper.source);
  if (proof) {
    paper.title = proof.title; paper.authors = proof.authors; paper.license = proof.license;
    paper.provenance = { source: proof.source, licenseUrl: proof.licenseUrl, checked: '2026-09-27', changes: 'PDF converted to reflowable Mathpix Markdown; figures retained. Check equations against the source.' };
  }
  const origin=store.job(paper.id);
  consent ||= origin?.sharingConsent;
  if(consent?.attestation===true && ['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','author-permission'].includes(consent.license)) {
    paper.license=consent.license;
    paper.provenance={...paper.provenance,verification:'uploader-confirmed',attestation:true,confirmedAt:consent.confirmedAt,changes:'Prepared for reflowable reading; uploader confirmed permission for the text and figures. Community review pending.'};
    paper.visibility='public';
  }
  const verified=origin?.owner===paper.owner&&!origin.uploadSource&&origin.sourceLicense?.verification==='indexed-source-license'&&origin.sourceLicense.license===paper.license;
  const dedupe = `publish:${paper.id}:${paper.revision}`;
  const existing = store.existing(paper.owner, dedupe);
  paper.sharing=existing?publicationState(paper,existing):verified?'publishing':'awaiting_review';store.savePaper(paper);
  if (existing) return existing;
  return store.saveJob({ id: randomUUID(), owner: paper.owner, kind: 'publish', paperId: paper.id, dedupe, created: Date.now(), state: verified?'queued':'awaiting_review', reviewed:!!verified, ...(verified?{reviewFingerprint:publicationFingerprint(paper)}:{}), message: verified?'Sharing the verified open-access paper':paper.visibility==='public'?'Shared · administrator review pending':'Choose a license and confirm sharing permission, or wait for administrator review' });
}

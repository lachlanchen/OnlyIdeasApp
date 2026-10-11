# Browser-assisted paper retrieval · 2026-10-11

Implemented for OnlyIdeas; Bunko and store releases were not changed.

## Changes

- Added a separate outbound retrieval queue and Docker Chromium worker, with
  public-only egress and fresh request contexts.
- Added exact repository/Europe PMC lookup, normalized stale PMC links, retained
  complete HTTP 203 responses, and supported observed inline/downloaded PDFs.
- Added Codex-assisted source discovery with Crossref/DataCite verification,
  explicit account-profile selection, shared crash-safe quota locking and bounded
  subprocess cleanup. Existing cheaper paths and cached transcripts stay first.
- Preserved paper matching, sharing permission, figures/equations, quota and
  conversion-receipt rules. No subscription, pricing or authentication product
  changes were made.

## Real retrieval evidence

| Paper / DOI | Result |
| --- | --- |
| Cerebral organoid encapsulation, `10.1016/j.xpro.2024.102952` | Previously failed PDF route; normalized PMC HTML recovered in real Chromium. Cloud queue and conversion passed, 68,056 Markdown characters and 9 images. |
| In-vitro glioma models, `10.1016/j.xpro.2023.102346` | Previously failed PDF route; full PMC article recovered and identity accepted. |
| Cortical organoid attachment culture, `10.1016/j.xpro.2023.102502` | Previously failed PDF route; full PMC article recovered and identity accepted. |
| Attention Is All You Need, `10.48550/arXiv.1706.03762` | Actual Codex search, exact DataCite verification, then Chromium PDF retrieval: 2,215,244 bytes and matching paper text. |

The live cloud canary completed in about 32 seconds with zero Mathpix calls. It
also verified that an existing public paper is reused before any retrieval or
conversion. Temporary test jobs were removed; existing papers, jobs, translations,
artifacts, chats and notes were preserved. The browser containers were cleaned up.

Not every failed import is an accessible OA paper. The tested Zenodo concept
`10.5281/zenodo.18302863` resolves to a **restricted** deposit with no public files.
For the FES TechRxiv preprint, Codex found indexed candidates, but the supplied CDN
hostname no longer resolves and the source page presents an access challenge.
Those cases retain source/upload recovery; they were not recorded as successes.

## Validation and rollout

- 215 Node tests passed, including queue/token isolation, lease reclaim, deleted
  accounts, private-address/DNS rejection, exact DOI selection, HTTP response
  handling, transcript reuse, and cross-process Codex lock/crash recovery.
- Renderer checks, TypeScript, web build and isolated runtime packaging passed.
- Actual Chromium 154.0.8037.92 with Playwright 1.64.0; sandbox enabled, non-root,
  no direct network, no owner profile or host credentials.
- Huanayun immutable API release: `retrieval-bd55a426f94c647b`.
- Previous API: `web32-3e9567849213bde0`; existing ingress and protected config
  fields were preserved. The new retrieval setting/token is additive.
- Local immutable runtime: `retrieval-449af486ac1a7d36`.
- The workstation's `onlyideas-retrieval.service` owns the browser lane. The
  existing chat worker uses the same qualified source and shared Codex ledger.
- No app-store upload or new binary is required for this server-only change.

Private detailed receipts, hashes, logs and recovered documents are under
`.runtime/browser-retrieval-20261011/` and the protected deployment history.
See [the operating guide](operations/browser-retrieval.md) for configuration,
limits and rollback. No paper payload, token or browser profile belongs in Git.

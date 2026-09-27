# OnlyIdeas reading credits

These are non-transferable database usage credits, not LAC cryptocurrency. They
have no cash value and do not expire. Accounting is per OnlyIdeas account; no
cross-product balance or automatic linking of separate provider accounts exists.

## First slice: accounting

| Action | Credits |
| --- | ---: |
| Welcome, once per provider identity | +30 |
| Approved, successfully published unique paper | +10 |
| Public contribution rewards per UTC day | Up to +50 |
| Private PDF import | −1 per page |
| Other private file / Markdown import | −1 per file |
| Shared imports, reading, chat, shared translations | 0 |

Existing service quotas still bound conversion and agent usage. Shared papers are
not public until rights and community review succeeds. Rejected papers earn
nothing; there is no surprise private-import charge. Repeated unsuitable sharing
requests are subject to the existing account moderation tools.

`credits.enabled: true` opts a server into this policy. Leave it absent/false
until client cost disclosures are qualified. Old queued jobs continue under their
original terms. A client must send `creditLimit` (JSON) or `X-Credit-Limit` (file)
for a new private import; omission fails with HTTP428 before creating a job.
Private URL imports reserve up to `maxPages` (30 by default), then settle the
actual PDF page count. Uploaded PDFs are inspected before reserving the exact
cost. Other files reserve one credit. HTTP402 means insufficient available
credits. `GET /api/credits` returns only the current account's balance, held
credits, policy and last 40 entries. No public mutation or operator mint route is
introduced by this slice.

The append-only ledger and hold state changes use one SQLite write transaction
with job creation/completion. API retries return the existing job. Failed work
refunds once; a user-triggered retry requires renewed consent and a new hold.
Worker completion is fenced by the saved lease. Successful converted files are
reused if a process stops before job completion, avoiding another conversion.

Rewards require an eligible new import, approved publication and a durable
publication receipt. Canonical arXiv/DOI/source aliases, normalized converted text
and available source-file hashes suppress duplicate rewards globally. Human
review still determines whether changed source/text is genuinely new research.
All currently public papers are registered as the unrewarded baseline when the
feature first starts. Publications above the daily reward ceiling are recorded
as zero-credit contributions and cannot later retry to claim another award.

Account deletion removes its ledger, holds and import-candidate records. Only
hashed identity and contribution aliases remain for duplicate/abuse prevention;
they contain no document text, filenames or URLs. A deleted/recreated provider
identity receives no second welcome grant. Suspended accounts cannot use credits.

## Subsequent slices

Client balance/history and explicit private-cost consent come next, followed by
native store subscriptions. Target tiers are roughly CNY20/100/200 per month;
real localized store prices are authoritative. No purchase endpoint, paid plan,
receipt grant or store activation is included in this accounting slice.

## Evidence

`tests/credits.test.mjs` checks restart persistence, rollback, consent, refunds,
retry idempotency, independent-process overspend races, cross-account rewards,
legacy content, reward caps, deletion/re-registration, API isolation and shared
attachment conversion. Full `npm run check` remains a publishing gate.

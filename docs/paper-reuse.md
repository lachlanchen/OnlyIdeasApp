# Reusing papers and discussions

OnlyIdeas checks for an accessible existing paper before importing a URL or file.
A match opens that paper's original ID, canonical Markdown and figures. It does
not create another paper, pay for Mathpix again, or reserve import credits. The
agent, PDF import and attachment routes use the same lookup. Request receipts,
attachments, conversations and notes remain scoped to the requesting account.

Identity uses conservative source aliases and exact file hashes, never titles.
arXiv abstract/PDF links for the same explicit revision match; `v1`, `v2` and
unversioned links remain separate unless recorded source/provenance provides the
alias. DOI resolver aliases and Nature article/PDF links match. Content-selecting
query parameters are retained. Existing canonical Markdown can also be reused.
When an unfamiliar URL returns known file bytes, the worker skips conversion;
that first download is necessary to establish its identity. Historical uploads
without a recorded file digest cannot be recognized by bytes until indexed.

Public papers can be reused across accounts. Private papers can only be reused
by their owner. Pending publication is still private. Blocked, suspended,
deleted or withdrawn material cannot be reused by another reader. New unreviewed
imports from different accounts remain isolated; this is not a promise of global
coalescing for unpublished/private conversion work.

Translations and digests are shared for a public paper's ID, revision, operation,
language and selected section. Concurrent requests join the same durable job.
Finished artifacts remain reusable after the configured model changes. A changed
paper revision gets its own artifacts. Private artifacts do not become public
when their source paper is published. Translation chunks keep durable progress.

The import-key migration is additive and runs once. It preserves paper bodies,
figures, accounts and credit history. Retries also recognize jobs submitted before
this migration, including saved Mathpix receipts. A worker rechecks reuse before
provider work and refunds any earlier credit reservation when reuse succeeds.

Discussion panels open at the bottom after comments arrive, with the composer
visible and keyboard closed. iOS/Mac use the same SwiftUI view; Android waits for
the dialog to appear; the web reader handles delayed initial responses and
reopening. Comment retrieval returns the latest 200 visible comments in reading
order, excluding other readers' pending comments before applying that limit.

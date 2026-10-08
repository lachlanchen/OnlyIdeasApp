# Research-agent relevance and shared-paper reuse · 8 October 2026

## Corrected behaviour

- Conversational and multilingual questions are interpreted as scientific search
  terms before querying research indexes. Model plans accept a bounded list of
  queries; unrelated search hits are filtered. A new topic cannot silently select
  an older paper merely because the message contains “this”.
- Literature-overview requests compare relevant indexed abstracts in the reader’s
  language, with numbered references and explicit limits. They do not silently
  import the first result. Full-paper conclusions require the actual transcript.
- Source-page, retrieved-PDF and verified DOI aliases reuse an accessible existing
  transcript before download or Mathpix. Uploaded files cannot assert global DOI
  aliases. Exact arXiv revisions and private-content access remain respected.
- Shared translation requests reuse the canonical paper and its revision-keyed
  artifacts. Model changes do not force retranslation. Approved publication runs
  before queued imports so concurrent readers can reuse the newly shared result.
- Indexed and agent paper requests default to Shared. Existing explicit private
  uploads, chats, notes and personal preferences remain private. Source permission
  and publication review still apply; open access alone is not a sharing licence.
- The reading room and search collapse verified public DOI aliases into one card.
  Old paper URLs, saved items, notes and explicit preprint versions remain intact.
- Publisher pages reached through a Crossref DOI can establish a supported
  licence only when the final page identifies the exact downloaded PDF.

## Qualification

`npm run check` passed: **184 tests**, reader-renderer validation, TypeScript and
production web build. Use the current Pandoc installation when running the
attachment-conversion fixture (`ONLYIDEAS_TEST_PANDOC`).

A live API check used a temporary ordinary account. The deployed worker answered
an event-camera / single-molecule microscopy question in Chinese and returned
relevant papers. A DOI import for the existing event-encryption paper completed
by reuse with **zero new papers, zero conversions and no credit hold**. The test
account and its private test conversation were removed afterward. The affected
reader’s conversation was not rewritten.

The agent uses the existing economical OnlyIdeas model configuration for semantic
planning and concise evidence summaries. Simple keyword searches and cached paper
reads do not require a model call. Provider thinking is explicitly disabled for
these bounded DeepSeek requests to preserve the response budget.

The backend was deployed in immutable releases with a consistent SQLite backup,
old-release rollback, and exact source hashes. Paper bodies, translations, notes
and chats passed preservation checks. Ingress and billing configuration were not
changed. Normal public HTTPS health and live DOI lookup passed.

The older event-encryption publication request was separately reviewed against its
explicit CC BY 4.0 notice and six stored figures, then published successfully to
OnlyIdeas-papers. Other papers with unclear or unsupported redistribution terms
remain in review; existing Only me files were not made public.

## Mac build

Mac **1.0.6 (28)** contains a compact native agent file picker, bounded to a
520–760 point layout, supporting PDF, DOCX, supported images, Markdown, text,
CSV, JSON and TeX. iPhone/iPad keep their existing picker. The approved rounded
icon is unchanged. Debug Catalyst compilation, universal release archive,
code-signature verification and package export passed.

Apple processed Mac build 28 as VALID and IN_BETA_TESTING in the existing internal
group. The signed package retains the exact build-27 approved icon. This receipt
does not claim a completed on-device picker interaction or new App Store production
approval. Existing production reviews are preserved.

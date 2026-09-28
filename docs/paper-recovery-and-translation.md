# Paper recovery and shared translations

## Download or upload the same paper

Paper cards and failed import requests offer **Upload my PDF**. The server resolves
the title, authors and source from the selected research record or the reader's
failed request. It keeps the original request until recovery finishes. Repeated
uploads reuse the same queued conversion or accessible exact-file result. A file
claimed to belong to an article cannot create a global source alias for other users.

Automatic downloads have a total deadline, bounded retries for temporary failures,
public HTTPS/DNS checks and file limits. The downloader tries locations supplied
for the same indexed work, refreshes its exact OpenAlex ID and follows citation PDF
metadata. It does not bypass a repository's access restrictions. A 403 remains
recoverable through the source link and manual upload, without a Mathpix charge
for the failed download.

Native iOS/macOS, Android and web use the same recovery contract:

- Binary `POST /api/import` with `Content-Type: application/pdf` and `X-Request-Id`.
- Add exactly one of `X-Research-Id` or `X-Recovery-Job-Id`.
- Failed requests must belong to the signed-in account and have no uncertain or
  existing conversion receipt. Existing conversions resume through their job.
- Retain `X-Paper-Sharing` and `X-Credit-Limit`; private recovery retains the
  original private choice and credit consent.
- `/api/jobs` exposes `title`, `source`, `sharing` and `canUpload` for recovery UI.

## Shared by default

Shared is the native/web default. A converted indexed paper may publish
automatically when its source page identifies the downloaded PDF and explicitly
provides CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 rights. The server records the evidence
and retains attribution, source, license and conversion notice. Other Shared
imports show pending review. Uploaded files with unverified source claims also
require review. The public library and its moderated discussions are shared;
existing private notes, private comments and conversations remain private.

## Translate only what is needed

Reading tools offer full paper/section translation and separate paragraph/sentence
selection. `GET /api/papers/:id/segments` returns stable identifiers and readable
previews. A translation request can specify `segmentId` instead of `sectionId`.
The server resolves the original text itself and rejects stale or unknown IDs.

Sentence pieces cache by paper, revision, target language and visibility. Larger
requests assemble saved pieces and translate only missing ones. A failed request
keeps completed pieces. Simultaneous requests for the same scope join one durable
job. Private caches stay private after a paper is published. Model outputs are
labeled and displayed separately from the original.

Equations, figures, code and structural TeX metadata are protected. If the model
changes preservation markers, the fallback sends only intervening prose and
reassembles the original protected content. This avoids treating a missing marker
as permission to lose an equation or figure.

# Shared papers and publication review

Live web entry points:

- [Publication review](https://agent.onlyideas.art/admin)
- [Community library](https://agent.onlyideas.art/?view=community)

## Who reviews?

Designated OnlyIdeas administrators review sharing permission and the converted
paper's content. This is an OnlyIdeas library review, not an Apple/Google store
review or academic peer review. The owner's existing verified GitHub account is
the initial administrator. Sign in with that account, then open **Profile →
Administration → Publication review**, or use the direct link above.

The server's protected `publicationReviewers` configuration lists exact OnlyIdeas
account IDs. Names, email addresses, subscription tiers and credit exemptions do
not confer this role. Other administrators must be deliberately provisioned by
the operator; there is no public self-enrollment or role-editing endpoint.

## Contributor experience

Shared imports either use an already verified supported source license or enter
the review queue. A freely downloadable PDF alone does not establish permission
to redistribute its text and figures. Unselected **Only me** papers do not enter
the queue. Notes, conversations and earlier private artifacts stay private.

The web reader and library show these states:

| State | Meaning |
| --- | --- |
| Awaiting review | An administrator needs to check permission and content. |
| Changes requested | Read the contributor-facing reason; provide the missing permission/source information and request publication again. |
| Not approved | The administrator declined sharing and supplied a reason. The private paper remains readable by its owner. |
| Publishing | Review passed; the durable public bundle is being written. |
| Publication failed | Publication needs administrator retry or a fresh review if content changed. |
| Shared | Publication completed. The paper is available to everyone. |

Existing native clients continue receiving publication-job messages and published
library updates from the same API. The new administration interface is on the web;
this change does not require a native binary to use that page.

## Review a batch

1. Filter by status or search by title, author or DOI. Each page has up to 50
   requests; a batch contains at most 20 selected papers.
2. Open each paper. Compare its source with the rendered transcript, equations
   and figures. Only submitted papers and their figures are available in this
   preview; it does not grant access to the contributor's chats or notebook.
3. For approval, choose the verified supported license, record an HTTPS permission
   evidence URL and a private review note, and check both permission and content
   confirmations for **each** paper. Supported licenses remain CC0-1.0,
   CC-BY-4.0, CC-BY-SA-4.0 or documented author permission. Check whether any
   third-party figures require separate permission.
4. Select the reviewed rows, choose **Approve selected**, and confirm. Unchecked
   papers cannot be approved in a batch. Selecting a paper opens its checklist.
   **Approve selected** stays available when rows are selected: it guides you to
   the first unfinished review, or opens confirmation when all are ready. The
   checklist names missing fields, including the minimum 10-character note, and
   the batch shows how many papers are ready. Request changes or decline with an
   explanation for the contributor when permission or content remains unclear.
5. Approved jobs move to Publishing. Successful publication makes the paper public
   through the existing Git-backed publisher and once-only reward accounting.
   The Community shelf lists public papers by publication time and excludes
   introductory samples. Existing public transcript/translation reuse remains
   active; approval does not launch a new conversion or translation.

Review decisions record the administrator account, time, exact content fingerprint,
revision and evidence in a private audit table. Private notes and reviewer account
IDs are not added to public paper metadata. Permission evidence URLs are public
provenance and must not contain credentials or private correspondence.

Every batch is atomic. Changed content or a decision from another administrator
invalidates the old page's token; refresh and review again. The publisher verifies
the approved fingerprint before publishing. A retry requires unchanged approved
content and cannot turn a declined request into an approval.

## Operator and regression notes

- API: `GET /api/admin/publications`, `GET /api/admin/publications/:job`, scoped
  figure previews, and `POST /api/admin/publications/batch`.
- All endpoints enforce the designated active account role on the server. Mutations
  retain the app's origin/CSRF protection and rate limits. Responses are not cached.
- The existing local `tools/moderate.mjs` emergency operator command also records
  approval fingerprints and CLI-attributed decisions. Prefer the web interface for
  normal work because it captures per-paper evidence and contributor messages.
- Source and rights review never infer a redistribution license from an upload's
  unverified claim. Do not bulk-approve unknown legacy uploads to clear the queue.

### Qualification · 9 October 2026

- 189 tests, document renderer validation and TypeScript/Vite build passed.
- Five new regression tests cover exact roles, ordinary/private-data boundaries,
  atomic batches, stale/replayed approvals, evidence requirements, lifecycle/retry,
  HTTP/CSRF, scoped figures and owner-visible decisions.
- Visible browser tests exercised approval, changes requested, history, logout,
  Community discovery, Chinese, dark mode and a 390px screen without horizontal
  overflow. Synthetic fixtures stayed in the isolated local test database.
- Candidate migration used a consistent copy of the actual database. Live HTTP
  checks confirmed owner access, ordinary-account denial, anonymous denial and
  the admin page. Server-issued probe sessions were deleted immediately.
- Existing papers, artifacts/translations, chats/messages, notes and jobs were
  compared before/after deployment and preserved. Seven unresolved requests remain
  queued; this deployment did not approve them or publish a test paper.
- Public HTTPS/browser checks and owned-runtime cleanup are recorded in the private
  deployment receipt. Store reviews, billing, account providers and ingress are unchanged.

### Approval-button correction · 9 October 2026

The initial page silently disabled approval until every selected paper met all
requirements. It also kept the old queue token after a fresh preview, which could
leave an otherwise completed review blocked if another administrator had changed
the paper. The corrected page explains missing requirements, opens the form on
selection, synchronizes the preview's current token, and provides a next-paper or
approval action beside completed review fields.

191 tests and the renderer/build gates passed. New component regressions exercise
incomplete-form guidance, explicit confirmation with the refreshed token, and
unsupported license/URL validation. A visible desktop/mobile browser test selected
two papers, verified that unfinished fields did not submit, completed both reviews,
and sent exactly one confirmed batch to the isolated fixture server. The production
deployment changes static web files only; API rules, data and service processes
are unchanged.

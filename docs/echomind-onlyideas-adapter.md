# EchoMind OnlyIdeas mini app adapter · 2026-09-28

Owner request: make EchoMind's existing OnlyIdeas mini app an adapter for the
standalone OnlyIdeas research service. Current delivery is a contract/handoff;
EchoMind's code, database, auth and deployment are unchanged. Friend forwarding
is explicitly deferred. Build 15 discovery/social endpoints are live and qualified
(discovery source `b05f42b`; current server release `538763aeaabee1f1`
includes the web favorites follow-up `14be743`); native builds are available
in internal testing and submitted for store review. See OnlyIdeasApp
`docs/release-candidate-15.md` and `evidence/research-discovery-15/verification.json`.
This delivery does not register or enable an EchoMind auth adapter.

## Ownership and current implementation

- Research API: `https://agent.onlyideas.art`; app source `../OnlyIdeasApp`;
  public cleared content `../OnlyIdeas-papers`.
- EchoMind reference: `EchoMind/echomind/miniprogram/onlyideas.py`,
  `EchoMind/templates/miniprogram/onlyideas*.html`, and
  `EchoMind/static/js/miniprogram/onlyideas*.js`.
- Follow EchoMind AGENTS.md: legacy `OnlyIdeasApp/` inside EchoMind is reference
  only. Implement its adapter under the current `EchoMind/` mini app.
- Canonical paper text, figures, metadata, translations, conversion jobs, paper
  discussions, favorites and likes belong to OnlyIdeas. Avoid another Mathpix
  pipeline or another translation cache inside the mini app.

## API shape

All paths below start with `/api`. JSON over HTTPS. Unknown metadata is omitted.
Responses carrying account data are `no-store`.

| Operation | Contract |
| --- | --- |
| Latest/search | `GET /discovery?q=&source=all|openalex|arxiv&discipline=&subdiscipline=&from=&to=&journal=&sort=latest|relevance&page=1` |
| Taxonomy | `GET /discovery/taxonomy`; `openalex`/`arxiv` arrays of `{id,name,children:[{id,name}]}` |
| Result | `{papers:[{id,title,authors,summary,source,pdfUrl,year,publicationDate,journal,doi,discipline,subdiscipline,index,paperId?}],nextPage,unavailable,stale?}` |
| Source card | `GET /discovery/item/:id`; `{paper}` |
| Fetch/read | `POST /discovery/import` with `{id,sharing:"shared"}`; `{paperId,reused:true}` or `{job,paperId?}` |
| Library/reader | `GET /papers`, `GET /papers/:id`, `/content/:id/figures/...` |
| Jobs | `GET /jobs`; preserve completed paperId; explicit retry only |
| Paper actions | `GET /items/:ref`; `{saved,liked,likes,commentCount,private,shareUrl}` |
| Save/Like | `PUT /items/:ref` with `{saved:boolean}` or `{liked:boolean}`; explicit desired state, idempotent |
| Saved list | `GET /saved`; `{papers:[{ref,...metadata}]}` |
| Paper discussion | `GET/POST /items/:ref/comments`; post `{id:UUID,text,acceptTerms:true}` |
| Moderation | existing `/comments/:id` DELETE, `/comments/:id/report`, `/comments/:id/block` |

A reference is the stored paper ID, or `r-` plus a discovery result ID. The server
resolves source identities to one discussion/reaction key. The client must not
invent IDs or use titles as identity. Library and source cards converge when the
same source is converted. Private paper social data is isolated. Known withdrawn
papers stop resolving. Public comments are moderated before other readers see them.
These are paper-level discussions; paragraph discussions remain in the reader.

## Reading and discovery behavior

1. Show cached local library matches immediately; query research after debounce.
2. Lazy-load `nextPage`; suppress duplicates by ID and discard stale responses.
3. If `paperId` exists, open the cached reader immediately and reconcile online.
4. Otherwise one explicit tap requests import. Poll the durable job; don't resubmit
   a second request after a timeout. The server also deduplicates repeats.
5. No direct PDF: show source/upload action. Never bypass a publisher's access
   controls. Discovery does not itself download or convert paper bodies.
6. Shared imports are free and default. Conversion saves a private owner-accessible
   draft while source/rights/community publication review runs. Open access is not
   automatic permission to republish every figure. Private imports retain credit
   consent, reservation, refund and bounded Mathpix limits.
7. Render original equations/figures and separate revision/language-keyed AI artifacts.
   Keep existing explicit arXiv versions distinct for transcription reuse.

## Auth coordination — disabled adapter until separately qualified

The central-account response file now reports a live password issuer at
`https://chat.lazying.art` for the qualified Platform/Coin profiles. That does **not**
register or enable an OnlyIdeas consumer. Do not reuse Bunko/Platform/Coin client
IDs, credentials, bearer tokens or native headers.

OnlyIdeas currently uses its own Apple/GitHub accounts and private sessions.
Request a dedicated central profile contract, client/resource registrations,
audiences/scopes, redirect URIs and introspection credentials from the central
auth owner. Prepare a disabled server adapter; preserve independent PKCE/state,
short-lived authorization codes, refresh/revocation/suspension and account erasure.
Map `(issuer, subject)` only after verified proof. Never auto-merge by email/login.
Existing accounts must link through explicit dual proof. An EchoMind invitation
may gate EchoMind usage; it must not gate the global account or public reading.
Keep tokens server-side and out of URLs, WebViews, mini-app JavaScript and logs.
The current API does not accept EchoMind sessions as OnlyIdeas sessions.

## Later friend forwarding

Deferred by owner. A future EchoMind message card can carry a canonical HTTPS
share URL, paper ID, title and bibliographic display snapshot. Fetch canonical
metadata on open. Authorize the sender/recipient independently; don't forward
private text/assets, signed download URLs, comments or tokens. Do not copy user
credits, subscriptions, friends or messages into OnlyIdeas. Recheck withdrawal
and visibility before preview/open. No forwarding endpoint ships in build 15.

## Acceptance gates for the adapter owner

Test two ordinary accounts; saved/liked state across devices; rapid retry and
concurrent conversion/translation reuse; public versus private separation; stale
search responses; revoked/suspended tokens; account deletion; paragraph versus
paper comments; comment reporting/blocking; offline figures/equations; 11 locales,
RTL and dark/light themes. Preserve existing mini-app settings and user-selected
languages. Coordinate migration before retiring any legacy conversion rows.

## Build 16 reading space extension

`GET /liked` mirrors `/saved`. `GET /activity` returns private `{events}` with
`id,kind,created,title,ref` and optional job state/paperId. `GET /inbox` returns
`{notifications,unread}`; `PUT /inbox` accepts `{ids:[notificationId]}` to mark
visible items read. `GET/PUT /preferences` returns `{preferences}` containing
`interests,discipline,language,dailyEnabled,dailyTime,timezone,commentAlerts,likeAlerts`.
`GET /daily` returns cached `{day,papers,language,unavailable,stale}`. Require an
independently authenticated OnlyIdeas account for all personal endpoints. Never
cache one user's inbox/favorites for another account. Daily notifications are
native local reminders; do not advertise remote push from these endpoints.

## Build 17 recovery and translation extension

Research cards and failed requests can offer **Upload my PDF**. Send binary PDF
content to `POST /api/import` with exactly one server-issued context header:
`X-Research-Id` for an indexed card or `X-Recovery-Job-Id` for an owned failed URL
import. Preserve the existing sharing choice and credit consent. The server
validates ownership, source metadata, completed conversions and uncertain provider
receipts. A user-supplied file's claimed source is never a trusted global alias.

`GET /api/papers/:id/segments` provides display-ready paragraphs and sentence IDs.
Pass a selected `segmentId` to `/assist` with `kind: "translation"` and a supported
language; do not combine it with `sectionId`. IDs resolve against canonical server
text. Filter segment artifacts out of the full-paper language picker. Whole-paper,
section, paragraph and sentence requests reuse cached sentence pieces by revision,
language and visibility; private pieces do not become public with a later publish.

Default new fetches to Shared. Supported source-verified licenses allow automatic
publication after conversion; other requests show awaiting review. Public papers
have one shared transcript, reusable translations and moderated discussions across
accounts. Only me papers, private notes and agent conversations remain private.
See [recovery and translation contract](paper-recovery-and-translation.md).

# OnlyIdeas · product contract

## Internal Apple delivery · 2026-10-30

OnlyIdeas 1.0.10 (40) is available in the existing internal TestFlight group on
iOS/iPadOS and macOS; the iOS package includes Watch. Both builds are `VALID`
and `IN_BETA_TESTING`. This delivers the reader tools, adaptive drafts and feed
preferences described below. Native testing also corrected search-field focus
on phones. Existing public store versions retain their selected builds.

The Windows x64 preview is published at
[LazyingArt downloads](https://lazying.art/downloads/windows/#onlyideas).
See `docs/internal-build40-20261030.md` for test results and runtime limits.

## Reader tools and Windows · 2026-10-29

The owner requests highlights, private notes, paper contents/search, figure zoom
and a Windows edition. Keep annotations private to the authenticated local
account, independent of public paper reuse and discussion. Preserve equations,
figures, translations and passage anchors; conflicting edits must not overwrite
newer notes. Use Nature, Science and Cell as new/default journal selections;
retain explicitly saved choices and unrestricted search.

Use one shared renderer toolset across web, Android and iOS/Mac. Prepare native
1.0.10 (40) independently from existing reviews. Windows starts as a per-user WPF
and WebView2 desktop preview using the existing service and system-browser PKCE
sign-in. Keep provider credentials outside the client. A cross-compiled executable
is not a Windows runtime/sign-in pass or a Microsoft Store release.

## Daily usage credits · 2026-10-29

The owner requests a useful daily free allowance. Give each active OnlyIdeas
account 100 usage credits on its first authenticated app use each UTC day.
Unused credits carry over; missed days are not backfilled. Keep the existing
welcome grant, public-contribution rewards, purchases, import costs and service
limits. Deduplicate across devices, linked methods and same-day account
re-registration. Enable this independently with `credits.dailyBonusEnabled`;
it does not enable shared LAC policies, spending gates or subscription changes.
Installed clients receive the grant through existing session/balance endpoints.

## iPhone Duo adaptation · 2026-10-28

The owner renews support for the new foldable iPhone in OnlyIdeas and Bunko.
Preserve paper position, conversations and unsent drafts through display changes.
Web conversation anchoring, bounded composer sizing and independent safe-area
edges are implemented and browser tested. Native composer remeasurement and its
long-draft XCTest are prepared but await native qualification. Full Duo work
requires Xcode 27.1 and official fold/reserved-region tests; the compatible Mini
has 27.0/26.6 and installation approval is pending. Preserve current releases and
review candidates. See `docs/iphone-duo-20261028.md`; no new test build is delivered
by this source checkpoint.

## Editable research feed · 2026-10-24

Readers can select topics and exact journals, add custom interests, choose all
journals, and restore the editorial defaults. The homepage, daily papers and
Agent use the same account-scoped preferences. Agent can show, add, remove,
replace or reset these choices and edit existing reading-language/reminder/alert
settings. Explicit searches must not silently alter preferences. A stale editor
or model plan must not overwrite a newer change; private content cannot authorize
an edit. Preserve existing accounts, subscriptions and build 39 review candidates.

## Default research shelf · 2026-10-24

The default recommendation feed now starts with English-language research in
imaging, optics and biomedicine from exact selected journal identities: Nature,
Science, Cell, PNAS, Optica and relevant Nature/Science/Light journals. Balance
subjects and journals, exclude all-capital metadata, corrections and retractions,
and keep original scientific title capitalization. Prefer accessible full text;
never imply that journal prestige grants download or redistribution permission.
This editorial default does not overwrite saved interests or restrict explicit
search. It uses the existing bounded cache and refresh contract. Apply through
the backend without replacing build 39 or restarting its store reviews.

## Cached recommendations · 2026-10-24

Opening Research for you restores the most recent recommendation page immediately.
Pull down or use Refresh at the top for newer research; reaching the bottom loads
another page. Refresh keeps visible papers until a successful response arrives.
Persist only one account-scoped first page, at most 60 cards and 512 KB, expiring
at seven days. Older pages loaded during browsing do not accumulate on disk.
Preserve downloaded papers and personal libraries independently of this cache.
This feature is accumulated in build 39, which supersedes the unrun build 38
delivery candidate.

## Cumulative release qualification · 2026-10-24

The owner requests testing, corrections and formal Apple/Google submission of the
latest updates. Prepare 1.0.9 (39), including the bounded recommendation cache, with paper mentions, quoted messages, sharing,
editable research interests and account-preserving linking recovery. Qualify
native builds and current screenshots before submission. Existing optional shared
identity and reward gates remain in effect; this release does not enable them or
change subscriptions, prices or stored content.

## Personal recommendations and foreground rewards · 2026-10-18

New readers start with research across disciplines. Agent asks which topics they
would like to follow and lets them save or skip the choice. Interests remain
editable; existing saved topics and notification preferences are preserved.
This preference operation must work without an inference provider and must not
change the meaning of ordinary research requests or consume an agent turn.

The owner now requests the daily shared LAC reward from opening and using the
app, without a check-in button, plus reading, public contributions, comments and
replies. This supersedes the manual-check-in-only candidate. Coin owns policy
amounts, caps and canonical deduplication; apps supply durable authenticated
evidence. The foreground producer and atomic outbox are prepared but disabled
until app-specific consent, delivery and live qualification pass. No local
credit grant or cryptocurrency conversion follows from recording an event.

## Final reward reconciliation · 2026-10-16

OnlyIdeas accepts Coin's `app-lac-source-final-v1` lifecycle for the future shared
points rollout: expired pending events close without an award; reversed events
may seal immediately; awarded events seal no earlier than their policy end plus
180 days. A sealed decision is immutable and new reversals receive 409; a later
correction requires a separately reviewed accounting process. Existing accepted
reversal replays retain their idempotent behavior.

The producer stores the exact final decision and first durable adoption time
before acknowledging its digest. Evidence retention begins 90 days after the
later of finalization and first adoption. Pending intake, SDK acknowledgment or
failed delivery cannot start that timer. Unknown/conflicting evidence remains
unresolved. Reconciliation after consent withdrawal or deletion never restores
eligibility or changes app credits. The dispatcher and retention are qualified
with disposable fixtures; no purge job, reward policy or public canary is enabled.

## Daily and shared LAC rewards · 2026-10-16

The first coordinated rollout is explicit linking and a consent-backed read-only
canonical balance. It activates no reward policy. Missing issuer, SDK, callback or
native capabilities stay disabled; existing accounts and releases remain intact.

The owner requests daily bonuses, usage and public-paper rewards accumulated
across opted-in LazyingArt apps through explicit shared account linking. Preserve
existing app usage credits, purchased balances, subscriptions and on-chain LAC.
Use the distinct Coin-owned earned-only nonmonetary points ledger and one
canonical account balance; no email/name merging or copied app totals. Candidate
shared defaults are daily 5, reading 1 up to 5/day, approved unique paper 10 up to
50/day, subject to qualified evidence and finite central policy limits.

Repair local earning eligibility independently of spending enforcement. The
existing welcome/publication policy can apply to all active accounts through
`credits.earningEnabled` while the private-import/billing rollout remains intact.
Shared login and rewards require actual issuer/app qualification before activation.
See `docs/account-rewards-20261016.md` and the reusable accounts/rewards skill.


## Exact paper requests · 2026-10-15

Publisher punctuation must not make a literal title dependent on a successful
language-model plan. Preserve explicit titles/DOIs, strip ordinary download-request
wrappers, reuse saved papers and verified public source metadata, and ask for a
selection when only ambiguous title matches exist. Keep unrelated earlier cards
out of fresh-title requests. Distinguish an index outage from no matching paper.
Public source-cache reuse does not bypass PDF identity, private-data boundaries,
conversion quotas or publication consent. Deliver this worker repair to existing
apps without rebuilding unchanged native clients or changing their store reviews.

## Chat usability and LAC app-credit display · 2026-10-15

Preserve the direct LLM/app research pipeline first, with Codex and independent
AgInTi recovery. Add clear left/right messages, user and approved OnlyIdeas icon
avatars, native selectable text and explicit Copy on Mac/iOS/Android/web.
Refresh relevant screenshots and accumulate the change in internal build34.

Restore the account's saved credit balance in Profile: a durable visible section
must show loading/retry and history rather than disappear before its first load.
Use “LAC · LazyingArt Coins” for these non-transferable, no-cash-value app credits,
with “OnlyIdeas balance” scope. Preserve balances, ledger lineage, purchased
allowances, pilot configuration and import cost rules. Do not mint or convert
credits during the presentation repair.

The owner also requests possible shared fun-point accumulation through EchoMind,
Bunko reading and other apps. Coordinate a separate nonmonetary ledger and explicit
shared-account linking with the central identity/Coin owners. Their existing
18-decimal cryptocurrency earnings asset must not be relabeled as these points.
Shared fun points, app-local purchased usage credits and subscriptions remain
separate. Shared accumulation is not live until exact app identity, point policies,
receipt validation, caps, retries/reversals and store disclosures are qualified.

## Browser-assisted paper retrieval · 2026-10-11

The owner requested stronger open-access retrieval with a real browser in Docker
and Codex assistance. Reuse accessible transcripts and translations first, then
try bounded HTTPS/index/repository paths. A separate outbound retrieval worker
uses fresh, sandboxed Chromium and a quota-gated bibliographic Codex fallback.
Verify the requested paper before conversion; preserve equations and figures.
Do not send private chats, uploads, account tokens or browser profiles to this
worker. Its browser has no direct network or host access; public HTTPS egress is
DNS-pinned. Respect access challenges/restricted content and retain PDF upload
recovery. No new app binary or store change is required for this server update.

## Remembered import choices · 2026-10-11

Source links and job retries never open the sharing-license prompt. Retries keep
server-stored permissions and only reconfirm a private credit cost if required.
Canceling a new sharing choice continues privately, subject to the normal credit
confirmation. Remember the choice per account and exact file/content or research
item; do not apply one paper's attestation to unrelated material. Sharing options
can reset these choices for future imports without republishing existing papers.
Agent chat has a jump-to-latest control on web, iOS/Mac and Android.


Requested by Lachlan on 2026-09-26. A quiet, social research library for reading
papers, discussing passages and making ideas easier to understand across languages.

## Screenshot refresh and accumulated test build · 2026-10-10

The owner requested updated screenshots reflecting the current app and an
accumulated internal test build. Prepare 1.0.7 (29) for TestFlight and Google Play
internal testing, with real native captures of discovery, library, agent and
illustrated multilingual reading. Stage store assets for the next review;
preserve current production listings, releases and active Mac review. Keep
original screenshot sets as historical evidence. Do not enable billing or alter
personal data as part of screenshot capture.

## Quick publication approval · 2026-10-09

The owner requested one-click approval of selected papers they have already
checked. The administrator web page offers Quick approve alongside detailed
review. The click explicitly confirms permission and content quality and records
an audit note automatically. Reuse saved permission/source details; let the
reviewer choose permission once for selected papers missing a supported licence.
Do not infer permissions. Keep exact roles, private-upload boundaries, current
revision tokens, atomic batches and durable publication unchanged.

## Optional shared identity direction · 2026-10-03

The owner requested independent apps with optional LazyingArt login, while
EchoMind owns the central issuer. OnlyIdeas owns its separate `onlyideas-server`
client, `onlyideas-service` audience and exact HTTPS callback
`https://agent.onlyideas.art/api/auth/lazyingart/callback`. Keep existing login,
local accounts, private data and subscription ownership. Explicit linking needs
fresh proof of both accounts, never an email match. Profile-only login may qualify
separately from Bunko's GitHub legacy-link extension and Coin earnings.

Canonical LAC accumulation is a later separately qualified Coin-owned settlement
integration; existing OnlyIdeas database reading credits remain independent.
Pending earning intents are not available LAC. No automatic wallet linking,
credit conversion, shared subscription or cross-app discount is authorized by
this direction. See [adapter preparation](docs/shared-profile-adapter.md) for
the disabled implementation and remaining live qualification gates.

## First release

- Responsive web reader, suitable for a later iOS/Android wrapper.
- Import an open-access PDF by URL, upload one's own PDF, or import MMD/Markdown.
- Mathpix converts PDF to MMD with durable figures. One canonical MMD and a small
  metadata manifest are stored; section JSON is derived, not another canonical copy.
- Keep original equations, tables and images, readable on a narrow phone.
- Private personal library; explicit publication of rights-cleared content to
  OnlyIdeas-papers. Open access alone is not an automatic republication license.
- In-app passage discussions, persistent accounts, private notes, reading progress.
- On-request translations and cited digests through a configurable economical model
  endpoint. Cache by paper revision, operation and language. No background spending.
- Durable bounded jobs, one conversion at a time, page/byte/day caps, safe downloads,
  idempotency, visible provider availability and useful recoverable errors.
- Cloud API at agent.onlyideas.art on Huanayun; model may be served through LazyEdge
  from this workstation. Conversion/API secrets never enter a client or content repo.

## Storage and publishing

App: OnlyIdeasApp. Content: OnlyIdeas-papers. Neither name currently exists under
lachlanchen on GitHub. An older empty OnlyIdeasAPP directory and EchoMind's separate
OnlyIdeas module are preserved. Personal data uses SQLite and private content files.
Only explicitly approved public bundles enter GitHub. No private PDF is committed.
Public discussion storage starts in the app database, with a documented GitHub
export boundary; GitHub mirrors must never silently expose a private thread.

## Next release gates

Native signed builds/store registration; account moderation operations; tested
production OAuth and provider credentials; live paid conversion after bounded cost
review; accessible reader review; on-device offline downloads and sync conflicts.
The name is a repository/product working name, not a trademark availability claim.

## Native continuation · 2026-09-26

The owner requested iOS and Android development after the web preview. Version
0.2 adds separate Capacitor projects, secure native account sessions, document
import, local offline paper/figure downloads, sharing and native navigation.
Signed developer-preview binaries and simulator/emulator evidence are required.
Store listing creation, price selection and formal store submission are separate
release actions; no existing Bunko listing is reused for OnlyIdeas.

## Native redesign and paper agent · 2026-09-26

The owner requested native implementation, larger type, a real Profile page from
the top-right account button, and a chat composer with persistent conversations.
Version 0.3 uses SwiftUI on iOS and native Android Views; only the paper body uses
an isolated renderer for Mathpix Markdown, equations and figures. Sign out is a
separate confirmed Profile action. Reading size and system text scaling apply.

A workstation agent, using a local model through LazyEdge, searches open research
indexes and checks/downloads PDFs. Conversations are private and available across
signed-in devices. Conversion remains an explicit bounded action. The worker
receives structured tasks through an authenticated outbound queue, never shell
commands or browser credentials. Test updates use the existing OnlyIdeas internal
TestFlight and Google Play groups. Formal public review remains a separate gate.

## Shared reading room amendment · 2026-09-27

The owner wants research papers shared by default and visible on opening the app,
including for signed-out readers. New import controls default to Shared and offer
Only me. Sharing requests go through source/rights and community review before
publication; openly accessible PDFs do not automatically grant republication.
Verified real papers, with equations, figures and attribution, populate the shared
reading room. Existing private notes, conversations and unselected personal uploads
stay private. Existing private libraries and accounts are preserved.
The icon keeps emerald/gold but uses a custom O/i conversation mark instead of a
common open-book symbol. Native builds must be uploaded before claiming an icon
change is available to installed apps.

## Compact cached reading amendment · 2026-09-27

Build 9 reduces margins and control sizes, uses full-width abstracts, prevents
page-level horizontal scrolling and defaults to 18-point text (adjustable from
15, with system text scaling). Tables and code keep their own scrolling area.
Automatically save recently opened papers and figures, open the local copy first
and check the cloud for updates. Warm the first three library entries; bound the
automatic cache to 20 papers / 150 MB. Keep offline pins up to 30 copies. Reconcile
withdrawn papers and visibility changes online; clear private cache on sign-out.
Cloud notes and discussions still require a connection. Preserve the live database.
The existing O/i icon receives a teal–blue–violet gradient and warm gold dot;
remove the overlapping upper-right idea stroke.

## Approved icon replacement · 2026-09-30

The owner approved the relaxed, flowing O/idea mark shown in the design preview
and requested replacement of the old icon. Use the exact approved image: a
teal–blue–violet flowing mark with a warm gold dot on ivory. It is the common
source for web, iOS/iPadOS, Watch, Mac, Android, splash and store assets. Keep the
export pipeline consistent so subsequent builds cannot regenerate the old mark.
Existing store binaries require a new build to display the replacement.

## Database credits amendment · 2026-09-28

The owner chose ordinary database reading credits, like EchoMind. Credits are
non-transferable, have no cash value, and are only used inside OnlyIdeas. Real
LazyingArt coins are a possible later project; no wallet or blockchain integration
is part of this release. Preserve the current library and account database.

Finish work in order: credit accounting, interface/sharing controls, monthly
subscriptions, release qualification. New Shared imports cost no credits and earn
10 credits after rights/community review and successful publication, once per
unique paper across all accounts, with a maximum of 50 earned credits per UTC day.
Private imports cost one credit per PDF page or other file. Welcome grant: 30.
Show costs before submission, reserve atomically, refund failures and unused PDF
reservations, and never double-charge a retry. Credits do not expire. Existing
papers/jobs are not charged or rewarded retrospectively.

Sharing controls belong in import options and an agent toolbar control, defaulting
to Shared. Chats and personal notes remain private. Reduce repeated agent help
copy and give conversations/composers more space. Monthly subscription targets
are approximately CNY20/100/200; show actual native-store localized prices, grant
credits only from verified purchases, and support restoration. Subscription
purchase integration and store configuration must be tested before activation.

## Apple platforms amendment · 2026-09-28

The owner requested macOS and Apple Watch for both Bunko and OnlyIdeas, including
formal production review. OnlyIdeas adds a native SwiftUI Mac Catalyst app with
a sidebar, keyboard navigation, the existing account, agent, file import,
illustrated reader and durable offline cache. The Mac app uses the same bundle
and server account system; it never resets the existing library or database.

Apple Watch is a focused offline excerpt companion to the iPhone app. A reader
explicitly sends selected text or an initial run of rendered prose from a public
paper. Keep at most three bounded excerpts, adjustable type and reading position.
Keep equations/figures in the full reader. Never transfer private papers, account
tokens, chats or notes. Reconcile withdrawn public papers when the phone connects.
The Watch app itself needs no login or network access. All 11 UI languages remain.
Paid subscription activation remains separately gated on purchase qualification.

## Paper reuse and discussion amendment · 2026-09-28

Reuse an accessible paper's stored transcript, figures and available translations
across readers before downloading or converting again. Use source identities and
exact file hashes; preserve explicit paper revisions and private-content isolation.
Existing work must not incur another conversion charge. Open discussion panels
at the latest replies and composer after loading, without opening the keyboard.

## Research discovery and paper cards · 2026-09-28

The first page lazy-loads latest open-access research, with immediate local fuzzy
matches and wider OpenAlex/arXiv search. Provide primary/secondary disciplines,
publication year/date, journal and DOI when supplied by the source index. Advanced
filters select hierarchy, year range, journal, source and sort order. A tap opens
an existing accessible paper or explicitly starts a bounded shared import, saving
its progress and reusing prior conversions/translations. Public publication review
and private-content isolation remain. Show partial/index outages honestly.

Each paper item has account-synced Save, Like, whole-paper Comment and Share.
Preserve paragraph comments in the reader. Private paper links are not shareable;
public comments retain moderation, report/block and deletion. Provide an EchoMind
mini-app adapter handoff; forwarding to friends is deferred. Do not enable central
auth for OnlyIdeas until that dedicated adapter is separately registered/qualified.

## Personal reading space and source recovery · 2026-09-28

Saved and Liked have separate account-synced collections, reachable from a visible
Your space destination and Profile. Record reading requests, saves, likes and
comments in private activity history. An inbox tracks unread, moderated comments
on followed papers and likes on one's own papers; respect blocks, withdrawal and
account deletion. Preferences include interests, discipline, reading language,
comment/like inbox notifications and an opt-in daily reading reminder/time zone.
For you retrieves cached research metadata without downloading or converting it.
Native daily reminders request OS permission; activity notifications are in-app
and refresh when the app is open. Remote APNs/FCM activity push is not configured.

Recover blocked or obsolete PDF URLs using only verified open-access locations
for the same indexed work and its citation PDF metadata. Preserve original source
provenance and record the actual download URL. Never evade publisher access checks.
If all sources deny access, explain the repository restriction and offer source /
upload recovery, without spending Mathpix credits or silently repeating a failed job.

Owner amendment: daily request, agent, OCR/conversion and reading-assistant limits
are disabled only for server-provisioned owner accounts. Ordinary accounts keep
their limits. Exact authenticated IDs come from private operator configuration;
clients cannot grant exemptions. Keep file limits, deduplication, source access
checks and uncertain-provider-receipt protection.

## Contextual recovery and shared translations · 2026-09-28

The owner requested stronger fetching, a PDF upload action on indexed paper items
and failed requests, and reusable paragraph/sentence translation. Recovery keeps
server-resolved bibliographic context and original requests; exact-file reuse and
provider receipt protection remain. An uploaded file's claimed source never
becomes a trusted global source alias. Retry temporary upstream failures within
a total deadline, refresh exact indexed work locations and follow citation PDF
metadata; offer manual upload when repositories deny automatic access.

New Shared indexed imports with a directly verified CC BY 4.0, CC BY-SA 4.0 or
CC0 1.0 article license may publish automatically after successful conversion,
with source, attribution, license and conversion notice. The source page must
identify the downloaded PDF. Other Shared imports display pending review;
existing Only me content and private comments never become public automatically.
Once published, the transcript and moderated discussions are shared across readers.

Translate a whole paper, section, paragraph or sentence. Store durable sentence
pieces keyed by paper revision, language and visibility, and assemble larger
requests from those pieces. Equations and figures stay unchanged; if the model
alters preservation markers, translate only intervening prose. Private translation
caches remain private after a paper is shared.

## Agent reliability and broad discovery · 2026-09-28

The owner reported a 503 in agent search and requested searching both the local
library and online papers, whether or not PDFs/transcripts already exist. The
worker must use the deployed shared metadata service and reusable library cards.
Keyword searches include metadata for papers without open PDFs; the latest feed
remains open-access research. Existing accessible transcripts open immediately.
Other cards offer bounded source resolution and contextual PDF upload. Metadata
presence does not grant access or redistribution rights. Private libraries remain
isolated. Model-planning failures must not disable research search, and temporary
index failures should retain clearly labeled cached/library results. Verify a real
native chat, search, download, conversion/reuse and library-opening flow before
promoting the successor build to production review.

## Research requests and focused recommendations · 2026-09-28

A single search or chat request can find a paper, import its accessible PDF, then
summarize, translate, save or like it. Persist bounded action steps and their
results in the conversation. Reuse stored transcripts and artifacts. A new DOI
or link must not silently target a previous paper. Private imports retain the
explicit credit confirmation. Contextual PDF uploads check the title/DOI before
conversion; unreadable or uncertain matches require the reader's confirmation.

Use economical metadata indexes first, including Crossref when other indexes
are unavailable. The owner authorizes a bounded local Codex web-search fallback
for public bibliographic queries and missing PDF locations. Verify citations
against a research index and verify downloaded PDFs before conversion. Never
pass private documents, credentials or full conversations to this fallback.

Default recommendations reflect the owner's published research interests:
neuromorphic imaging, event cameras, hyperspectral imaging, biomedical imaging,
organoids and computational optics. Include relevant work by all researchers.
Readers can replace these defaults with their own interests; keep advanced
filters collapsed and provide full online search from the same search field.

## Integrated translations and subscriptions · 2026-09-28

Translations are peer reading languages in the main reader: Original, Translation,
or Interlaced, with source paragraphs and translated passages paired by canonical
ranges. Keep figure/equation rendering, source discussion anchors, and offline
reuse. Opening or switching a view must not start paid model work. Missing pieces
remain in the original with an explicit request action. Generated translations
remain labeled and revision keyed. Default research interests also include
Professor Shaohua Ma's organoid work at Tsinghua SIGS; preserve custom preferences.

The owner confirmed monthly US$2.99 / 14.99 / 29.99 price targets with 200 / 1,200 /
2,600 new transcription pages. Existing papers and cached translations remain
free to read. Plans include 60 / 300 / 700 new-paper fetches each period, alongside
existing paid credits and daily agent allowances. Eligible subscribers have a
seven-day trial with 50 transcription pages and 10 fetches. Free accounts have
30 new transcription pages and 10 fetches per calendar month when quota billing
is enabled. Private-import credit costs remain separate and explicit. Successful
reuse uses no new quota; failed imports release reservations, while uncertain
provider submissions retain a reservation until reconciled. Never double-charge
retries, restore, renewals or simultaneous callbacks. Owner exemptions remain.

PWA subscriptions use Stripe through ../Stripe's dedicated OnlyIdeas catalog.
iOS and Mac Catalyst use StoreKit; Android uses Google Play Billing. The Watch
excerpt companion remains available without a separate purchase. Show actual
provider prices, trial eligibility, renewal dates, restoration and cancellation.
Provider configuration and sandbox qualification precede purchase activation.

## Subscription cancellation · 2026-09-28

The owner confirmed that the ordinary customer action is cancellation. Stop future
renewal and retain access until the paid period ends. Provide Manage subscription
through the original store or Stripe portal; do not add an in-app self-service
refund action. Continue reconciling refunds/revocations issued by payment providers
or store support so credits and access reflect authoritative payment status.
Sandbox refund checks verify this backend behavior and never move real money.

## Watch and Mac refinement · 2026-09-30

The reader exposes Send to Watch with Original, Translation and Interlaced public
prose editions from already downloaded text; private content and paid generation
remain outside transfer. iPad/Mac explain the paired-iPhone requirement. Mac
Catalyst supports macOS12+, qualified on the owner's3040,7050,Mini and KVM Macs.
Exact research references preserve observed revisions for transcript reuse, and
slow indexes have a cancellable shared deadline.

## Web/PWA store access · 2026-10-01

The owner requested Apple and Google store routing from the PWA. Provide gentle,
dismissible device-aware suggestions and permanent store links in web Settings
(Bunko) or Profile (OnlyIdeas). Installed PWAs retain this choice. Reading stays
available; opening a store is explicit. Enable each destination only after its
public platform release is verified. See `docs/pwa-store-links.md`.

## Rounded icon test candidate · 2026-10-07

The owner requested rounded icon corners for both apps, with internal test builds
only and no new production review. Preserve the approved artwork and archived
masters. Legacy Mac, web and Android launcher exports receive transparent rounded
corners; iOS/Watch and store marketing assets remain opaque for platform masking.
Version 1.0.6 (27) is a test candidate. Accumulate this change for the
next owner-authorized review; preserve current production releases and reviews.

## Research-agent reliability · 2026-10-08

The owner reported an unrelated research-agent answer and duplicate conversion
of an already fetched paper. Interpret conversational/multilingual requests into
scientific search concepts, exclude unrelated hits and keep a fresh topic separate
from prior paper references. Literature overviews use attributed abstracts and
state their limits; full-text claims require the saved transcript. Reuse verified
DOI/source aliases and revision-keyed translations across readers before fetching
or converting. Shared paper requests are the default; explicit private uploads,
chats, notes and interests remain isolated. Collapse duplicate verified public
cards without removing historical paper IDs. Mac Agent uses a compact native
file picker. Existing interests, discovery, saved/liked collections and discussion
remain the product foundation; no private user-profile sharing is implied.

## Owner amendment · 11 October 2026 · smoother reading and sharing

- New Shared uploads ask for a redistribution license and an explicit confirmation covering text and all figures. Confirmed material becomes readable in the community immediately after preparation, then enters administrator review. Users may request review first if unsure. Existing private uploads remain private. Administrators can withdraw a contribution; GitHub archival publication and contribution rewards still require approval.
- Preserve the active conversation across library requests and app visits. Send bounded recent context to the agent, preserving exact paper references; retain conversation history in the account.
- Keep the composer compact until it needs more lines. Dismiss the keyboard on downward dragging, and preserve scroll position across request sheets, polling and tabs. Show journal names on agent paper cards.
- Revalidate cached paper text, translations and figures against current access and content. Pull-to-refresh refreshes library and research results. Existing local/offline limits and account isolation remain in force.
- Import accessible full-text HTML as well as PDF. Preserve equations, tables, captions and locally cached figures, and reject abstract-only/error pages. HTML preparation does not use Mathpix or transcription-page quota. Source access controls and identity checks remain in force.
- Deliver this batch to internal testing; no new production review is authorized by this amendment.

## Reliable research and owner publication · 2026-10-15

The owner requested an independent AgInTi backend when Codex is unavailable,
a compact attachment control, and a clear way to make an existing private paper
public on Mac and mobile. Reuse saved transcripts/translations first. A bounded
AgInTi/DeepSeek public-metadata search precedes the existing quota-gated Codex
fallback; it has no shell, file, wrapper, MCP or account access. Conversion and
translation remain in the durable existing pipeline. Specific long paper titles
remain searchable if interpretation temporarily fails.

Provide **Make public** separately from **Share** (sending a link). The paper owner
chooses permission, confirms rights to its text and figures and accepts the
Community Terms. The paper becomes readable immediately and receives administrator
review afterward. Save visibility/permission/review atomically and idempotently;
keep notes, chats, files not selected for publication and moderation refusals
private. Existing import choices stay remembered per material and source/retry
links do not reopen permission dialogs. Prepare the accumulated 1.0.8 (33) internal
test candidate, preserving production reviews and billing.

## Research backend preference amendment · 2026-10-15

The owner prefers keeping Codex now and qualifying AgInTi for broader fallback
use with its existing development session. After reusable library/index searches,
try the existing quota-gated Codex public research helper first, then the already
qualified AgInTi/DeepSeek metadata helper for failure or no results. This supersedes
the helper order above. Direct DeepSeek chat/planning and durable conversion and
translation remain in place. Do not describe bibliographic search qualification
as evidence that AgInTi can execute every app task. Coordinate broader capability
gaps separately; preserve private account/files and app-owned action permissions.

The owner's follow-up explicitly prioritizes the previously working direct-LLM
path. Preserve direct model interpretation and the app's library/index/download
pipeline as the normal route; neither Codex nor AgInTi replaces it. Research
helpers run only when that route needs additional public sources or the user
explicitly requests agent-assisted research.

## Reading shares and quoted context · 2026-10-18

The owner requests title-rich book/paper sharing to WeChat and EchoMind, and AiMemo read-later or research-idea drafts. Public share pages contain canonical metadata, a browser reader, an explicit app link and store choices. Sharing never publishes a private document or sends a message automatically. EchoMind owns its recipient/draft/card receiver and AiMemo owns its memo/agent draft receiver; qualify accepted ingress before enabling direct handoff. The OS share sheet and clearly labeled copy fallback remain usable independently.

The chat composer supports up to three paper mentions and a quote from either side of the current conversation. Server-resolved IDs establish access; existing transcripts are reused. Quotes and papers are reference data, not instructions to execute. Draft context is removable, retained after a failed send, and cleared on account/conversation change. These changes accumulate in internal build36, without replacing public reviews.

## Account linking · 2026-10-19

Start from the account whose data and subscription the reader wants to keep.
That initiating local ID remains primary. Refuse a connection when the target
already belongs to another local account; offer cancellation or another login.
There is no account consolidation, purchase inheritance or automatic grant.
Reauthentication must return to the same app account and preserve drafts.
Central account management is shown only after its exact destination and return
contract are qualified by EchoMind. Source preparation does not establish live
native/PWA parity, enable providers or change current releases.

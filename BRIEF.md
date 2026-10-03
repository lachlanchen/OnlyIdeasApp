# OnlyIdeas · product contract

Requested by Lachlan on 2026-09-26. A quiet, social research library for reading
papers, discussing passages and making ideas easier to understand across languages.

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

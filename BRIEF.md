# OnlyIdeas · product contract

Requested by Lachlan on 2026-09-26. A quiet, social research library for reading
papers, discussing passages and making ideas easier to understand across languages.

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

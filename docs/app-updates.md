# App updates

The web app checks its deployment record when opened, when it returns to the
foreground and when connectivity returns. Checks are limited to once every six
hours after success. **Profile → App updates → Check for updates** checks
immediately. A changed deployment offers **Update & reload** and **Later**.
Reloading is explicit and unavailable while a paper or Agent is open. Dismissal
preserves drafts and hides the same release for 24 hours; a different release can
be offered immediately. A failed or offline check never reloads the page.

The iPhone, iPad, Mac and Android apps compare their installed version and build
with the public record and open their platform's store. Profile contains a manual
check. The compact automatic card appears in the library, away from reading and
writing. Windows provides the same check in its toolbar and opens the LazyingArt
Windows download page. Watch offers a manual check and an update card directing
the reader to the App Store on the paired iPhone.

## Release records

`public/updates.json` is served at `https://agent.onlyideas.art/updates.json`.
Each platform has a `{ "version": "…", "build": "…" }` entry or `null` before a
public release. Only verified publicly available releases belong here; TestFlight,
internal testing, pending review and approval awaiting release are insufficient.
Never change the feed merely because a new binary has uploaded. This initial
record uses the verified Apple 1.0.9(39), Android 1.0.7(32) and Windows 1.0.10 preview
receipts. Reconcile each platform during its next public release.

Store/download URLs are compiled into the apps, never taken from feed data.
Native checks use no account credentials, do not install code and never suggest
a downgrade to newer internal builds. Successful checks are throttled; manual
checks bypass the interval. Invalid feeds produce a retryable error. Each
platform retains dismissal independently of accounts, papers and billing.

Vite emits `web-release.json` with the version and a SHA256 revision of the web
source and public assets; the same revision is embedded in the running client.
The API serves this record without a persistent HTTP cache. A first/current
installation shows no update prompt. A changed revision requires an explicit
reload; cached papers, notes and account state are not cleared.

## Qualification · 31 October 2026

All 362 application tests, renderer checks and the production build pass using
the existing Pandoc 3.11 toolchain. New browser-policy cases cover comparison,
beta/downgrade protection, invalid/offline responses, request deduplication,
throttling, dismissal and subsequent releases. The actual Profile regression
continues to verify account, credit and subscription sections across account changes.

The Android Java build passes, with 15 standalone JVM update-policy checks.
Both Windows policy checks and its WPF project build pass without warnings.
Real Chromium component fixtures cover 320/390/1024 px, English/Chinese/Japanese,
light/dark appearance, manual checks, draft preservation and reading reload guards.
These are component captures, not store-listing screenshots.

iOS/Mac/Watch source controls are prepared; they have not received a new Xcode
compile or device interaction test in this round. Android and Windows controls
also need installed-runtime qualification. No native binary, store release,
public web deployment or billing configuration was changed by this source round.

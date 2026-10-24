# Recommendation cache · 24 October 2026

## Reading behavior

Research for you restores its most recent first page when reopened. Refresh at
the top, including the existing mobile pull gesture, checks for newer research.
The bottom loads another page and retains an explicit Load more button. Appended
pages remove duplicate paper IDs. Failed refreshes retain the displayed papers.

One account-scoped snapshot replaces the previous snapshot: maximum 60 cards,
512,000 encoded bytes, seven-day expiry, five-minute freshness. Pagination does
not append to the stored snapshot. Search results and Saved lists are excluded.
Changing interests invalidates the recommendation snapshot; sign-out removes it.
Account switches and late requests cannot restore another account's results.
This policy does not evict saved papers or downloaded full-text documents.

Usable partial results can be cached when one index is unavailable. Stale upstream
fallbacks do not renew the device snapshot. Manual refresh revalidates server
pages older than one minute, shares in-flight work, and retains existing provider
limits. Personalized results request latest publications and sort the first page
by publication date. No conversion, translation, model task or reward is triggered.

## Qualification

- Full `npm run check`: 330 tests passed, renderer checks, TypeScript and production
  web/native-reader build passed. Use the existing Pandoc 3.11 installation on PATH
  and generate the document renderer before the first run in a clean worktree.
- Real headless Chromium with a disposable local server: 12 checks passed at
  320, 390 and 1280 pixels, including cached reopen, bottom pagination, fresh top
  replacement, offline refresh, bounded storage and no runtime errors. Light and
  dark QA captures were visually reviewed; all research cards are synthetic.
- Android: single-worker Debug Java compile and lint passed. The actual Java cache
  class passed eight JVM checks for restart, cursor, account isolation, item/byte
  limits, replacement, expiration and malformed storage. Reproduce with
  `tools/native/RecommendationCacheCheck.java` and the installed org.json JAR.
- iOS/Mac: Swift source updated; this feature has **not** been compiled or exercised
  on Apple devices. Runtime refresh, relaunch, pagination and accessibility checks
  remain required for its new native candidate. Android device UI testing also
  remains separate from the Java/lint qualification above.

## Delivery boundary

Changes live on `feat/recommendation-cache-20261024`, separate from the accepted
OnlyIdeas 38 source and delivery helpers. The canonical checkout remains clean;
all 139 frozen files and 19 helper/input hashes were reverified unchanged.
No deployment, new TestFlight/Play upload, public-review change or billing/identity
activation was performed for this feature. It must be qualified and accumulated
into the next candidate after the existing delivery. New native/store captures
must show the actual candidate; the synthetic browser QA images are not store assets.

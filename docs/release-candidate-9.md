# OnlyIdeas 1.0.0 (9) · compact cached reading

Verified 27 September 2026. The native iOS, native Android and web readers use
narrower margins and full-width abstracts, with an 18-point default and a 15-point
minimum. Text sizing remains adjustable and respects native accessibility scaling.
Library cards and navigation are more compact. The selection discussion action
appears when needed. Page-level horizontal movement is blocked; wide tables and
code retain their own scrolling area, and equations fit the available width.

The existing cream O/i icon is simplified: a teal–blue–violet gradient and gold
dot replace the plain background and overlapping upper-right stroke. Every icon
size is rendered from the vector source, including Android adaptive artwork.

## Local reading and cloud updates

- Automatically save papers and figures when opened. Restore the saved library
  after a cold launch and show the local paper immediately while checking updates.
- Cache the first three library entries in the background. Keep up to 20 automatic
  copies / 150 MB. **Keep offline** pins up to 30 copies outside that automatic limit.
  Existing manual downloads remain pinned. Unpinning returns a copy to the cache.
- Reuse saved figures for an unchanged paper revision. A changed cloud revision
  updates the paper and its figures. Online library reconciliation removes
  withdrawn papers and copies whose visibility changed.
- Private cache is scoped to its account and cleared on sign-out. Identity changes
  invalidate pending cache writes. An explicit access denial removes the copy;
  ordinary connection failures leave an authorized local copy readable.
- Notes, comments and agent conversations continue to use the cloud API. This
  update does not add offline editing or merge competing note edits.
- The production database and existing real papers are preserved. New web releases
  use immutable packages, a fresh SQLite backup and automatic health rollback.

## Verification

`npm run check` passed backend tests, compiled reader checks, TypeScript and
production builds. Signed Android release lint, APK and AAB builds passed; the
release APK upgraded the existing emulator installation without clearing its data.
iOS archive, export and validation passed.

An iOS XCTest opened the real quantum-simulator article, terminated the app and
reopened it with network requests disabled. The automatically cached article
remained readable without selecting Keep offline. Android repeated the cold-start
check with Wi-Fi and mobile data disabled; text and equations rendered locally.
Screenshots before and after a horizontal swipe had identical reader pixels.

The phone-width browser check loaded all three original figures, rendered the
equations, used 18 px text and a full-width abstract, and kept page width within
the viewport. With the API and content network blocked, a cold reload reopened
the saved paper in 662 ms in this test environment. A browser-only changed-revision
fixture refreshed the cached paper after reconnection; a withdrawn-library fixture
removed the cached papers. These fixtures never changed production content.
The deployed public reader was also checked at phone width.

## Distribution

- iOS build `99f71c6d-1c86-4194-8f21-56c873ab7266` is **VALID / IN_BETA_TESTING**.
  The existing internal tester group includes build 9 with updated test notes.
  The App Store draft selects build 9. Apple’s processed icon matches the new design.
- Android **1.0.0 (9) – Fast cached reading** is **Available to internal testers**,
  confirmed in Google Play on 27 September 2026.

- iOS IPA SHA-256: `254e83d3eea62c07e5dc5d335e975d0b77ceb94a3c9490585099e2fb3929a4c7`.
- Android AAB SHA-256: `58faa8cdd406e4d596e8760112867feba23d6b9e6d0286a6743d277ce9cf9bbc`.
- Android APK SHA-256: `dfbee34fbe94fe8d2bb2142d039f3700a10434b7aeac70d43441ac61b581f283`.

The web update is deployed and verified at [OnlyIdeas](https://agent.onlyideas.art).
Apple public review remains pending final screenshots and live Apple sign-in
verification. Google production review remains on build 6. Internal test availability
is separate from public review or approval.

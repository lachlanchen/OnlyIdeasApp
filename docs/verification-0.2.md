# Native preview verification · 2026-09-26

## Automated checks

`npm run check` passes: eight server/data tests and the TypeScript/Vite production
build. New native authentication tests exercise both browser binding and app PKCE,
wrong origins and proofs, CORS preflight, one-use redemption, bearer sessions,
private figure authorization and logout revocation. Android Release lint passes
with no errors. Template arithmetic/package-name tests were removed.

## Android API 34 emulator

The packaged app uses the production cloud API. Verified:

- 393 px reader and library have no horizontal page overflow.
- Original sample renders five math containers and its figure via a blob URL.
- GitHub sign-in starts in the system browser and completes through the existing
  authorized GitHub account. Credentials are absent from localStorage.
- Signed-in library and private figures survive a process restart. A private
  downloaded paper opens with its equation and figure in airplane mode after a
  cold launch. Reconnecting restores the same signed-in account.
- The real Android document picker selects an original one-page PDF from
  Downloads. Import returns 202 and reuses its existing conversion receipt.
- Export opens the native share sheet with the expected `.mmd` file. No file was
  sent to another person or external destination during QA.
- Discussion drawer and Back navigation work. Signing out removes private
  downloads and draft keys; counts are both zero.

The sign-in tests found and fixed a stale anonymous session response that could
clear a newly signed-in session after the system browser returned. Native refresh
now awaits login completion and checks the authentication revision.

## iOS 26.3 simulator

The actual packaged WKWebView passes eight reader checks: native bridge identity,
library width, equation SVGs, figures, reader width, text sizing, local paper/figure
download and discussion drawer. A second cold launch blocks cloud requests inside
OnlyIdeas only and passes the same reader checks using the saved download.

The Debug harness waits for the real document before running; injecting into the
initial blank document could otherwise lose the test on navigation. The harness
is excluded from Release compilation. Signed archives verify the actual embedded
0.2.0 / build 1 before export. The owner's established distribution identity is
used through a one-shot job in the Mac user's audit session. Initial isolated
keychain attempts failed during signing; a direct binary/framework signing probe
identified the working existing keychain. Its ACLs and settings are preserved.
No other project's identity, profile, simulator or desktop was replaced.

## Limits

No physical iPhone/Android test or completed share-to-another-app transfer is
claimed. iOS GitHub sign-in has not yet been exercised end to end; the full
native OAuth interaction was tested on Android. Build 1 subsequently entered
internal TestFlight and Google Play testing; public store review has not been
submitted. See the [publication record](store-release-20260926.md) for the store
states and [native.md](native.md) for the remaining public-release work.

Final APK and exported IPA contain the same 17 web assets as the verified
production bundle. The exported IPA passes deep/strict signature verification.
Artifact hashes and source provenance are in
[release-manifest.json](../evidence/native-0.2/release-manifest.json).

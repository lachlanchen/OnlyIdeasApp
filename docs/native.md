# Native mobile preview · 0.2.0 (1)

This is the original wrapper implementation record. The current implementation
and test status are described in [Native reading and agent chat · 0.3](native-0.3.md).

OnlyIdeas has independent iOS and Android projects with bundle/application ID
`art.onlyideas.app`. The reader, equation renderer, fonts and interface ship in the
binary. The API remains at `https://agent.onlyideas.art`; no provider key ships in
an app. Capacitor 8 requires Node 22 and Xcode 26; Android targets API 36 with a
minimum of API 24, and iOS targets 15 or later.

## Included

- GitHub sign-in in the system browser, returning to the native reader. A separate
  PKCE proof binds the app to its one-use login receipt. OnlyIdeas session tokens
  use iOS Keychain / Android Keystore and expire after 90 days of inactivity.
- Native PDF document picker (20 MB), shared cloud conversion jobs, private
  library, passage discussions, notes, reading guides and translations.
- Explicit **Read offline** downloads retain the original MMD and every figure
  together. Up to 30 papers, 50 MB each. Downloads use the app's IndexedDB storage;
  signing out clears private downloads and private drafts on that device.
- Authenticated figures use bearer requests and temporary blob URLs; no token is
  placed in an image URL. Downloads preserve revision identity.
- Native Markdown sharing, Android Back, left-edge swipe to the library, safe
  areas, larger touch targets and independent reader text size.

Offline reading works after a cold launch. Discussion posting, remote notes and
assistant requests require a connection. Offline edits are not silently queued.
This preview exports the canonical Markdown file; embedded figure bundles remain
available through the published content repository when the owner publishes one.

## Build

```bash
npm ci
npm run check
npm run native:sync
```

For an Android development APK:

```bash
cd android
./gradlew --no-daemon --max-workers=2 :app:assembleDebug
```

Release builds use `tools/native/build-android.py`. It reads a mode-600
`~/.config/onlyideas/android/signing.json` with `keystore` and `password` fields.
The upload alias is `onlyideas-upload`. Keep that key securely backed up: an
unrelated application's upload key must never be substituted.

On a Mac, sync `ios/`, `tools/native/`, and the referenced Capacitor plugin
packages in `node_modules/`. Use the existing shared Xcode installation. The
OnlyIdeas distribution profile belongs in the user's provisioning-profile
directories. `tools/native/build-ios.sh` unlocks the configured keychain, archives,
verifies the embedded version/build, verifies the signature and exports an IPA.
On a headless SSH host whose audit session cannot access signing keys,
`tools/native/launch-ios-build.py` runs one headless archive through the existing
user session. Its optional mode-600 `~/.config/onlyideas/apple/signing.json` accepts
`keychain`, `passwordFile` and `managed` fields. Set `managed: false` when reusing
the owner's established signing keychain: the build unlocks it without changing
its settings or ACLs, and does not lock it on exit. A project-owned keychain uses
`managed: true`. No password belongs in that JSON or in Git. The job creates no
desktop and does not replace the shared keychain list. Remove its completed
launch agent using the cleanup command it prints.

## Native QA

Android evidence covers the actual Capacitor WebView and system controls. The
server tests cover CORS, browser binding, PKCE, one-use receipts, bearer ownership,
private figures and revoked sessions. Client refreshes discard a session response
that predates a sign-in change, avoiding a browser-return race.

An iOS Debug build accepts `--onlyideas-smoke`. It exercises the packaged reader,
math, figures, text sizing, discussion panel and offline download. Relaunch with
`--onlyideas-smoke --onlyideas-offline` to deny cloud fetches inside that app only
and check a cold offline launch. Results are written to the simulator app's
Documents/native-smoke.json. The harness compiles out of Release builds.

## Distribution status

Build 0.2.0 (1) is now in internal TestFlight and Google Play internal testing for
the owner. [The publication record](store-release-20260926.md) distinguishes the
accepted uploads and actual testing state from public store review, which has
not been submitted. Before public submission: finish account deletion and
moderation/blocking flows, review the iOS sign-in requirements, complete store
privacy disclosures and metadata, and qualify iOS login end to end. Physical
testing remains valuable; no new cross-platform hardware gate is introduced.
Physical-device behavior, background uploads and low-storage eviction are not
yet fully validated.

## References

- [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [System browser API](https://capacitorjs.com/docs/apis/browser)
- [App lifecycle and Back events](https://capacitorjs.com/docs/apis/app)

# OnlyIdeas on Mac and Apple Watch

## Mac

`ios/App/OnlyIdeasMac.xcodeproj` builds the native SwiftUI app for Mac Catalyst,
macOS 13 and later, with Intel and Apple silicon slices. It shares the iPhone
account, paper, agent and renderer code. Capacitor's iOS-only binary is excluded.
Run `node tools/native/configure-mac.cjs` after modifying the iOS project source
list or version; the generated Mac project is tracked for reproducible archives.

Use the sidebar or Command-1/2/3 for Library, Agent and Profile. Command-comma
opens Profile settings. The complete paper renderer preserves equations and
figures; recently opened papers and their figures remain cached for offline use.
Signed-in private caches stay scoped to the account and are cleared at sign-out.

## Apple Watch

Install the companion on a paired Watch running watchOS 11 or later. On iPhone,
open a public shared paper, optionally select a short passage, then choose
**Reading options → Send excerpt to Watch**. Without a selection, the app sends
an initial run of rendered prose, stopping before mathematical or figure content.
Read the latest three excerpts offline, navigate between paragraphs and adjust
type from 14 to 24 points. Reading position survives relaunch.

The phone sends a validated versioned WatchConnectivity application context.
Each excerpt is at most 15 KB / 24 blocks, with a 50 KB total shelf limit.
No private papers, account tokens, discussions, agent messages or notes transfer.
The phone removes withdrawn public excerpts when its next refresh learns of the
withdrawal; a disconnected Watch retains its last received shelf until it syncs.
The complete illustrated paper remains on iPhone and Mac.

## Reproduce the release

1. `npm run check`, then `npx cap sync ios` on the source host.
2. Sync `ios/`, `watch/`, `shared/` and `tools/native/` to the existing Mac checkout.
3. Keep signing profiles/config in `~/.config/onlyideas/apple/`, mode 600.
4. `python3 tools/native/launch-ios-build.py ios`, wait for completion, then
   `python3 tools/native/launch-ios-build.py macos`. One archive at a time.
5. Validate and upload the signed IPA and universal PKG, qualify TestFlight,
   attach real screenshots and only then replace the pending production review.

The Debug-only Mac QA mode exercises the real public library and native navigation.
Its offline argument rejects app API requests; it never fabricates paper content
or writes server accounts, credits or papers. Debug proxy support is scoped to
this app's URLSession and is excluded from release builds.

For native Mac QA, launch the app bundle through Launch Services with `open -n`
and pass `--onlyideas-mac-qa` after `--args`. Launching the executable directly
from a LaunchAgent can fail before Catalyst creates its main scene. Use
`--onlyideas-native-offline` for the second cold launch; it blocks this app's API
requests while preserving its real cache. The QA output distinguishes online and
offline runs. It must be fresh, successful and match the tested build.

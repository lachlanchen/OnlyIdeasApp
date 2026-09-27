# OnlyIdeas 1.0.2 (13) · Apple platforms

Adds a native SwiftUI Mac Catalyst app for macOS 13+, Intel and Apple silicon,
with sidebar navigation and Command-1/2/3 shortcuts. The existing native reader,
agent, profile, account system and paper cache are shared with iPhone.

The new watchOS 11+ companion receives explicitly requested public-paper excerpts
from iPhone. Its latest three excerpts persist offline, with adjustable type and
saved reading position. Rendered prose extraction excludes paragraph controls,
author metadata, figures and formulas. The full illustrated paper stays on the
phone and Mac; private papers, notes, chats and account tokens never transfer.
All eleven interface languages and the approved icon are retained.

## Verification

- 51 automated tests, renderer checks and web build; Swift excerpt/schema bounds,
  Unicode, private-paper exclusion and duplicate rejection.
- Physical M5 Pro Mac mini: live public library, native navigation and real physics
  paper with 186 SVG equations, three figures and 67 paragraph discussion actions.
  No horizontal page overflow; text size and dark appearance update correctly.
  A disconnected cold launch reopened the durable cache with all app HTTP rejected.
- The Mac mini's direct DNS was unavailable. Online QA used a temporary loopback
  proxy scoped to the Debug app's URLSession, without changing system networking.
- Native iPhone tests: automatic offline cache, paragraph discussion, translation
  menu and attachment controls passed. Real iPhone-to-Watch transfer passed after
  fixing a paragraph-action SVG incorrectly classified as paper mathematics.
- The Watch received the real shared physics abstract through WatchConnectivity;
  no fixture was injected. With the phone shut down, the Watch reopened its saved
  excerpt after termination. Physical Watch hardware was not available.
- Mac screenshots are actual native views at 1280×800. The physics paper is
  *Measuring holographic entanglement entropy on a quantum simulator*, Keren Li
  and coauthors, CC-BY-4.0: https://www.nature.com/articles/s41534-019-0145-z.

Paid subscriptions remain drafts and ordinary users retain existing access.
Purchase qualification and broader credit rollout are separate pending work.
No production account, paper, credit ledger or server configuration was reset.
New Mac OAuth completion has not been separately tested with a real signed-in
account; existing server authentication tests and native sign-in UI were checked.

## Store status · 28 September 2026

Both signed archives passed Apple validation, upload and processing. Both are
**VALID / IN_BETA_TESTING** in the existing OnlyIdeas internal TestFlight group.
No new invitation is needed for existing testers.

| Platform | Production review | Submitted (UTC) |
| --- | --- | --- |
| iPhone / iPad + Apple Watch | **Waiting for Review** | 27 Sep 2026, 21:07:12 |
| Mac (Intel + Apple silicon) | **Waiting for Review** | 27 Sep 2026, 21:07:28 |

Both versions are configured to release automatically after Apple approves them.
The previous iOS build 10 submission was replaced only after both build 13
archives were qualified and processed. This is submission, not approval.
Android production review remains on build 10; Android internal testing remains
on build 12. Its staged privacy declaration and pending purchase tests are unchanged.

- iOS/Watch review: `69a253e7-8c06-4deb-a9b9-a79ad7e85b9a`.
- Mac review: `c209684b-6845-4f83-9785-0389622c3e5f`.
- [Build hashes and store receipts](../evidence/apple-platforms-1.0.2-13/release.json).
- [Curated verification record](../evidence/apple-platforms-1.0.2-13/verification.json).
- [Mac screenshots](../store/apple/build13/macos/reader.png) and
  [Watch screenshot](../store/apple/build13/watch/reader.png).

The source and release scripts are pushed to `lachlanchen/OnlyIdeasApp` on `main`.
Temporary Mac test apps, Apple simulators, proxy/tunnel and archive LaunchAgent
were stopped after evidence capture. The shared store browser was preserved.

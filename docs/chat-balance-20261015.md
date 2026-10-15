# OnlyIdeas 1.0.8 (34) · chat and LAC balance

## Changes

App source: `7a26b9dc3e281d640eb2ed913068aec636dc0779`; final iPhone
test procedure: `520a240`. Version 34 accumulates the previous research and
publication fixes for internal testing. Production store reviews are unchanged.

- Native Apple, Android and web chat have bounded left/right message columns,
  a user avatar and the approved OnlyIdeas icon. Header text has sufficient inset.
- Mac/iOS use a read-only selectable native text view. Mac avoids the phone drag
  gesture that conflicted with selection. Explicit Copy is available on all clients.
- Profile always creates the balance section before its first load. Loading,
  retry, history and last-known balance states are visible; account switches
  retain identity guards. Disabled credit policy does not hide an existing balance.
- The label is **LAC · LazyingArt Coins**, scoped to **OnlyIdeas balance**, with
  the non-transferable/no-cash-value explanation. Relevant strings cover all 11
  supported interface languages. Existing ledger and purchase semantics are unchanged.

The owner's saved 45 credits were confirmed by a read-only production query
before and after delivery. No credits were awarded, converted or migrated.
[Shared fun-point design and owner coordination](lac-app-credits-20261015.md)
remain a separate follow-on; no shared balance is live in this candidate.

## Research route retained

`4a54afb2ab20599015832fec843f558e8edd7044` keeps direct DeepSeek interpretation
and the existing library/index/download pipeline first. Additional public-source
research tries the bounded Codex helper, then independent AgInTi/DeepSeek recovery.
Conversion and translation remain app-owned durable operations.

A real query for the owner's polarization 4D paper completed in 3.751 seconds via
the direct model path and found DOI `10.1002/advs.77832`. A separate helper
qualification observed Codex returning no output before its 210-second deadline;
AgInTi then recovered metadata, total 236.975 seconds. This is recovery evidence,
not proof that Codex succeeded or that all research requests finish quickly.
General autonomous execution of every app task is not claimed for either helper.

## Qualification

| Check | Actual result |
| --- | --- |
| `npm run check` with qualified Pandoc 3.11 | 227 tests, renderer checks, TypeScript and production web build passed |
| Browser 320/390/1280px, light/dark | Avatar bounds, readable columns, no horizontal overflow and exact Copy passed |
| iPhone, iOS 26.3 simulator, Xcode 26.6 | Cold Profile balance, chat bounds, Copy then paste into composer passed |
| Mac Catalyst debug harness on KVM Mac | Five checks passed, including native select/copy and cold balance 45 fixture |
| Android API 34 emulator, isolated QA package | Avatar/Unicode initial, alignment, selectable text and exact clipboard Copy passed |
| Signed Android release APK | Signature verified; update installed over normal package; launch and LAC Profile labels checked |
| Apple source transfer | 41 selected source/resource hashes matched the build Mac |

Native UI checks use an isolated fixture account and conversation. They are not
new physical-device purchase tests. The actual owner's balance was checked
read-only in the live ledger; the production browser was signed out.

Fresh captures and hashes are in
[`store/screenshots/1.0.8-34`](../store/screenshots/1.0.8-34/README.md).
They are locally reviewed drafts, not uploaded or approved production screenshots.

## Web and worker delivery

The public PWA at <https://agent.onlyideas.art> serves the new assets. Its index
SHA-256 is `88d5c90fd05d47e5c02011024420294051c8fab87a1425ca9fbbb6fa25eab48a`.
HTTPS health and translated LAC strings were checked after deployment.

The static update retained the existing server implementation/configuration and
used an idle-queue app-only restart. A consistent private database backup and
logical comparisons of 17 relevant tables confirmed unchanged papers, artifacts,
translations, chats, notes, comments, sessions, jobs, identities and billing/credit
state. Both existing research workers remained active. Shared ingress was unchanged.

## Internal delivery

Google Play internal testing: **1.0.8 (34), available to internal testers**,
verified 15 October 2026 at 10:19 UTC; zero device exclusions on the release preview.

iOS (including the Watch companion) and Mac TestFlight: **1.0.8 (34),
VALID / IN_BETA_TESTING** in the existing internal group. Both uploads succeeded
without errors. [Machine-readable receipt and artifact hashes](test-candidate-34.json).
No formal production submission is part of this internal candidate.

The temporary app-owned browser/noVNC, Android emulator, QA API, reverse test
tunnel, Mac QA process and completed launch jobs were stopped after evidence
capture. The owned iPhone simulator is shut down. Other apps and the production
research workers remain running.

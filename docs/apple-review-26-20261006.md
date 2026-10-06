# OnlyIdeas build 26 review qualification · 6 October 2026

## Candidate and scope

The owner requested release of the approved app, then submission of the latest
build with the approved icon. Apple automatically released iOS/Watch 1.0.2 (21)
on 6 October at 14:05:04 UTC. Mac 1.0.4 (24) remains public. The release is available
in all 175 configured Apple storefronts; the US download price is $0.99.

The successor is the already uploaded iOS/Watch and universal Mac 1.0.5 (26),
source `5647308`. Both Apple builds are VALID, not expired, and eligible for the
App Store. Apple's processed icons were inspected: the flowing cyan, blue and
violet mark with a gold dot on ivory matches the owner's selection. Native
archives passed signature verification again. No binary was rebuilt for upload.

## Checks performed

- 174 project tests passed, with renderer checks, TypeScript and production build.
- Live iPhone and Android web prompts open their exact store destinations,
  preserve dismissal after reload, and have no horizontal page overflow.
- The native GitHub recovery behavior executable passed callback/PKCE binding,
  duplicate suppression, cancellation, expiry and transient recovery checks.
- An isolated iOS 26.3 simulator on the KVM Mac ran a signed simulator build from
  the same native source. `NativeStore.swift` and `NativeOAuthRecovery.swift`
  hashes match the candidate source. The app initiated its own production PKCE
  flow through its actual sign-in interface and system consent.
- GitHub authentication used the existing dedicated reviewer account through
  an owned tab in the retained Linux browser profile. Only the single newly
  initiated native flow was continued; no session, account or provider response
  was fabricated. No verification code was requested on this login.
- The native app recovered the completed flow without receiving a browser return
  URL, saved the session to Keychain, showed the account, and retained it after
  termination and relaunch. This exercises the lost-return recovery case.

The simulator harness first ran unsigned and could not write Keychain. After
normal simulator signing, the real login and persistence assertions passed.
The initial sign-out check selected an alert instead of the confirmation sheet;
a subsequent check terminated the app before asynchronous sign-out completed.
These harness problems were corrected by selecting the actual sheet and waiting
for signed-out UI before testing relaunch. The final result is recorded in the
submission receipt; earlier failed harness runs are retained privately.

## Evidence limits

This is real GitHub/server authentication in an iOS simulator build from the
candidate source, not a newly installed TestFlight or physical-device test.
The same shared recovery logic and Mac scene callback compile checks passed;
no new Mac desktop interaction or actual Mac provider-login completion is claimed.
Previous build24 reading/offline tests on all four Macs remain historical evidence.

General subscription purchases remain disabled. No Apple payment was attempted,
no subscription products were added to this submission, and no real StoreKit
purchase lifecycle is claimed. The uploaded build26 does not include the later
disabled shared-login adapter. Current accounts, paper data and credit balances
were retained. The deployed website change is only store availability JSON.

## Submission result

Both iOS/Watch and macOS **1.0.5 (26)** are **WAITING_FOR_REVIEW**.
They were submitted on 6 October 2026 at 14:51 UTC and will release automatically
after approval. The final sign-out/relaunch XCTest passed: one test, zero failures.
[Submission receipt](apple-review-26-20261006.json) ·
[Current public distribution](distribution-20261006.json).

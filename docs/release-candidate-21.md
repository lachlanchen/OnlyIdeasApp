# OnlyIdeas 1.0.2 (21) — visible plans

Build 20 incorrectly hid the entire subscription section behind purchase and
credit rollout flags. Profile now has a persistent **Plans & usage** entry on
iOS, Android, Mac Catalyst and PWA, including before sign-in. Plans stay visible
when store products or checkout are unavailable. Preview prices are explicitly
labeled; enabled native purchases still use actual localized store prices.
The PWA plans section is independent of the credit pilot. Native error states
show a retry action instead of disappearing.

The public catalog returns plan descriptions and quotas only. Signed-out users
receive no account token, credit balance, quota usage or subscription history.
Purchasing, restoring and entitlement changes retain authenticated provider
verification and the existing rollout gates. No paid activation or database reset.

Approved monthly prices are US$2.99 / $14.99 / $29.99, with 200 / 1,200 / 2,600
transcription pages and 60 / 300 / 700 fetches. Eligible seven-day trial remains
staged until real sandbox qualification. Existing papers and cached translations
remain free. All new interface text is localized in 11 languages.

## Latest distribution update

On 2026-09-30 HKT, iOS/Watch21 replaced the pending20 review and is Waiting for
Review. Mac20 is publicly available; the same qualified client changes from Mac21
were rebuilt as 1.0.3(22), uploaded to TestFlight and submitted for review. Google21
remains in review with automatic publishing. See the [current release record](distribution-20260930.md).

## Verification and availability (2026-09-28 checkpoint)

102 tests passed, including anonymous plan discovery with protected checkout and
no account-row creation. Renderer and production web build passed. Signed Android
build and release lint passed; real native Profile → Plans shows all three plans.
iOS XCTest confirms the visible entry and disabled coming-soon purchase actions.
PWA/server deployed with original papers, credits, holds and config preserved.
Physical Mac mini plans presentation also passed; signed iOS/Watch and universal
Mac archives are built. Both Apple builds are VALID and IN_BETA_TESTING. Android
21 is available internally and its production release is in review. The PWA is
live. Apple production review still contains build 20 on iOS and Mac; build 21
has not replaced it. Approval or public availability is not claimed.

## Subscription setup checkpoint

Store setup advanced after the owner clarified that visible plans must lead to
working purchases:

- Apple: all three products are now READY_TO_SUBMIT. Genuine build 21 screenshots
  are uploaded; they show the staged screen and must be replaced with the actual
  working purchase screen after sandbox qualification. Products are not submitted.
- Google: all three monthly base plans and P7D trial offers are ACTIVE. Verified
  US prices remain 2.99 / 14.99 / 29.99. English benefits now include approved page
  and fetch allowances; the 11 existing listing localizations remain. The app's
  existing owner-only purchase rollout is unchanged.
- Apple signed sandbox TEST notification: provider delivery SUCCESS, replay HTTP200.
  This verifies notification transport, not a purchase. Production TEST API still
  returns 401 before the app's first production release.
- Stripe: real hosted sandbox checkout passed with a seven-day trial, 50 pages
  and 10 fetches. Two paid test cycles each granted 200 credits once; repeated
  restores, portal cancellation and provider refund reconciliation passed. The
  second cycle used an explicit test API cycle reset, not an automatic test clock.
  Live catalog remains staged and the cloud webhook/checkout remain disabled.
- Android: the owner signed in after repair of the test phone's crashed scrcpy
  input handler. Real Play test checkout, acknowledgement, account binding,
  accelerated trial, two automatic paid cycles, repeated restores, cancellation
  in Play, and refund/revocation notifications passed against the existing cloud
  service. All 400 test credits were reversed; no real charge or data reset.
- The internal-test URL was incorrect in two old notes and the first publication
  receipt. Corrected from the OnlyIdeas Console and verified enrollment:
  https://play.google.com/apps/internaltest/4701325459048995948 . The Play listing
  still reports “Item not found” on the enrolled emulator and in its browser.
  The console reports build 21 available internally; download availability is not
  yet verified. Purchase tests used the existing signed sideloaded build.

Actual Apple StoreKit purchase/restore/renewal testing remains outstanding. No
ordinary-user checkout or quota enforcement was enabled. The original owner
pilot remains; Stripe used an isolated local QA database. Backend fixes discovered
in sandbox testing pin Checkout to the configured USD currency and resolve
invoice/charge links using the pinned API when newer webhook payloads omit them.
103 tests, renderer and production web build pass. These server fixes are staged
in source and have not been deployed to the cloud in this checkpoint.

The owner confirmed cancellation as the customer action: stop renewal and keep
paid access until the period ends. No refund action is exposed in PWA, Android,
iOS or Mac UI. Provider-issued refunds/revocations still reconcile on the server.
See [sandbox evidence](../evidence/plans-1.0.2-21/billing-sandbox-20260928.json).

Apple permits sandbox testing before review; the first auto-renewable subscription
must be submitted with an app version and its subscription group. See
[Apple submission instructions](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/)
and [sandbox overview](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/).
Apple staff states that production API access requires a production release;
that is consistent with this app's current 401, but does not establish that
production purchase verification has passed:
[Apple Commerce Engineer response](https://developer.apple.com/forums/thread/806452).

Sanitized receipts are in `evidence/plans-1.0.2-21/`. Original library, account,
credit, quota and discussion data are preserved. No new general billing rollout
or production payment credential installation occurred in this checkpoint.

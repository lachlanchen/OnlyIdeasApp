# OnlyIdeas distribution

## Mac approval and availability · 1 October 2026 (Hong Kong)

App Store Connect now confirms **Mac 1.0.3 (22)** is `READY_FOR_SALE` /
`READY_FOR_DISTRIBUTION`, with `downloadable: true`. Its existing
`AFTER_APPROVAL` setting released it automatically; no manual release request
was needed. All **175 Apple storefronts** report available, and availability
in new territories is enabled.

The public US and Hong Kong lookups confirm OnlyIdeas can be purchased for
**US$0.99 / HK$8**. They still display version 1.0.2 while the approved update
propagates. This is a confirmed store release, not a claim that every public
storefront already displays 1.0.3. [Mac App Store](https://apps.apple.com/app/onlyideas/id6816392935?mt=12).

The iOS 1.0.2 (21) review still reports `WAITING_FOR_REVIEW`. The newer
1.0.4 (24) remains the recorded internal TestFlight candidate; it was not
promoted by this Mac availability check. No source build, server, account,
pricing, subscription, database or other platform submission was changed.
No GUI or native runtime was started. [Verified receipt](../evidence/mac-release-20261001/receipt.json).

## Historical distribution snapshot · 30 September 2026

| Platform | Public version | Latest qualified submission |
| --- | --- | --- |
| Mac | **1.0.2 (20)**, App Store; US$0.99 configured, storefront propagation pending | **1.0.3 (22)**, Waiting for Review |
| iPhone/iPad and Watch companion | Not yet confirmed public | **1.0.2 (21)**, Waiting for Review |
| Android | Not yet confirmed public | **1.0.2 (21)**, In review |

[Get OnlyIdeas for Mac](https://apps.apple.com/app/onlyideas/id6816392935?mt=12).
The US and Hong Kong public lookups both return `mac-software` version1.0.2,
released at 2026-09-29 22:39:32 UTC. The shared app ID alone does not establish
that the iOS version is public. Apple released Mac automatically after approval;
no additional manual release action was required.

## Download pricing update

At 00:35 UTC on 30 September, the owner requested a **US$0.99 download price**
across Apple and Google. Apple accepted an immediate, indefinite US$0.99 base
price for the shared OnlyIdeas app record, with automatically equalized prices
for the other 174 storefronts. The API readback confirms the price; both pending
Apple reviews remain `WAITING_FOR_REVIEW`. The public US Mac lookup still showed
Free during propagation. This download fee is separate from subscriptions.

After the owner signed in, Google App pricing confirmed at 00:42 UTC that
OnlyIdeas is already available for free and cannot be changed to paid. Google
[does not allow an app already offered for free to become paid](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en).
This is a permanent listing restriction, rather than an editing lock during
review. Production **1.0.2 (21)** remains in review with managed publishing off;
no Google pricing or review change was made. A replacement paid package or an
in-app fee would need a separate owner decision. The dedicated browser was
closed gracefully after evidence capture, retaining the private sign-in profile.
[Pricing receipt](../evidence/pricing-20260930/receipt.json).

## Latest updates submitted

The owner requested distribution and the latest qualified update. iOS build21
replaced the pending build20 submission at 23:07 UTC. Mac20 had already shipped,
so the qualified client changes from Mac21 were rebuilt as **1.0.3 (22)** and
submitted at 23:12 UTC. Both Apple updates use `AFTER_APPROVAL`; Mac22 is also
`VALID` and `IN_BETA_TESTING` in the existing internal group. Existing review
access, metadata and screenshots were preserved; Mac has release notes.

Google Play Console confirms production **1.0.2 (21) – Visible plans and usage**
is already in review for a full rollout. Managed publishing is off, and the
submission includes 177 countries/regions plus the rest-of-world setting.
There are no pending changes needing another submission. Avoid restarting its
review queue just to submit the same build again. The earlier internal listing
visibility problem is not claimed resolved by this production review check.

The update makes Profile → Plans & usage visible, even before sign-in, across
native clients. Integrated original/translation/interlaced reading, equations,
figures, offline cache, community features and 11 interface languages remain.
This is **not** activation of general paid subscriptions. Apple purchase lifecycle
qualification is still outstanding; Stripe source fixes are not yet deployed.
Existing Google/Stripe sandbox results are recorded in the build21 report.

## Verification and ownership

- `npm run check`: **103 tests passed**, renderer checks and production web build passed.
- Mac22: signed universal `x86_64`/`arm64` archive and export passed; `codesign
  --verify --deep --strict`, Apple validation and upload passed.
- Client behavior is unchanged from qualified21. Prior iOS XCTest and physical
  Mac checks cover native plans, equations, figures, interlaced reading and offline use.
- Preserved application databases and account state; no cloud deployment or general
  billing flag change was part of this store submission.
- OnlyIdeas used one headless KVM archive. Its launch agent and exact uploader
  log process were stopped after receipts were copied. No Mac desktop was held.
- Store operations moved to the [isolated desktop workflow](store-desktop.md).
  Private sign-in state, raw store responses and credentials remain outside Git.

Sanitized [submission and qualification receipts](../evidence/distribution-20260930/)
record exact Apple build/review IDs, Google status and package hash. These are
submission receipts, not a claim that the pending updates have passed review.

## Approved icon update — 1.0.4 (23)

The approved flowing icon is packaged for iPhone/iPad, the Watch companion,
Mac, Android and web. Both Apple builds are VALID and IN_BETA_TESTING in the
existing internal group. Google Play confirms build 23 is available to internal
testers. Signed packages and provider upload receipts are retained privately.

The production Google build (100% of all 177 configured territories plus rest
of world) and its new listing icon are staged, not submitted. The app icon’s AI
provenance is declared; screenshots and the existing feature graphic are retained.
Apple iOS 1.0.2 (21), Mac 1.0.3 (22), and Google 1.0.2 (21) reviews remain intact
pending the owner’s choice about replacing queued reviews. A new installed
production icon therefore still depends on approval and installing the update.

The web icon and Apple home-screen icon are already live and byte-verified. A
bounded immutable release changed only three icon assets and the home-screen
link in the existing HTML. Backend and all other web assets match the preceding
release. The service was not restarted; its database, credit configuration,
subscriptions and real papers were preserved.

Validation: 103 tests, renderer checks, TypeScript/web/native-reader build,
Android release lint and signed APK/AAB builds, Apple signed archives, export,
provider validation and upload. No new physical device claim is made for this
artwork-only update. See `evidence/icon-replacement-20260930/distribution.json`.

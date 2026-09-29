# OnlyIdeas distribution · 30 September 2026

| Platform | Public version | Latest qualified submission |
| --- | --- | --- |
| Mac | **1.0.2 (20)**, free, App Store | **1.0.3 (22)**, Waiting for Review |
| iPhone/iPad and Watch companion | Not yet confirmed public | **1.0.2 (21)**, Waiting for Review |
| Android | Not yet confirmed public | **1.0.2 (21)**, In review |

[Get OnlyIdeas for Mac](https://apps.apple.com/app/onlyideas/id6816392935?mt=12).
The US and Hong Kong public lookups both return `mac-software` version1.0.2,
released at 2026-09-29 22:39:32 UTC. The shared app ID alone does not establish
that the iOS version is public. Apple released Mac automatically after approval;
no additional manual release action was required.

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

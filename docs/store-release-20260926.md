# OnlyIdeas first store test publication

Owner request: upload OnlyIdeas to Apple and Google Play for testing and review.
The standalone application is `art.onlyideas.app`, not EchoMind's embedded
OnlyIdeas module or the legacy OnlyIdeasResearch application.

## Exact candidate

- App source: `d9f6cef55e7df9f33b238a54b396e2e30ff11c72`.
- Evidence baseline: `4089da5754407f184ade80930aa1acfc0de17315`.
- Version: 0.2.0, build/version code 1.
- SHA-256 and simulator/emulator scope:
  [release manifest](../evidence/native-0.2/release-manifest.json).
- `npm run check` repeated successfully before publication: 8 tests and
  TypeScript/Vite production build. Both artifact hashes matched.

## Store identities

- Developer: LazyingArt LLC.
- Apple app: `6816392935`, SKU `onlyideas-ios`, bundle `art.onlyideas.app`.
- Google Console app: `4974173414823223936`, package `art.onlyideas.app`.
- Separate new store records created; other apps and submissions preserved.
- No purchase or subscription flow in this preview. Google app created as free.

## Distribution and review

Upload processing, internal tester access, external beta review, production
review, approval and public availability are separate outcomes. Record each from
actual provider readback; a signed binary or app record is not a submission.

The existing preview's remaining public-release work is concrete:

1. In-app account deletion and a published deletion/retention policy.
2. Complete discussion moderation, blocking and operational reporting workflow.
3. Review and implement iOS sign-in compliance; GitHub is currently the sole login.
4. Accurate privacy disclosures, support/privacy URLs, reviewer access, listing,
   age declarations and genuine screenshots.
5. iOS end-to-end login qualification, retaining the true simulator/device scope.

Do not assert these are finished or submit inaccurate privacy declarations.
Internal QA distribution can proceed independently of production listing setup.
The owner was asked whether to implement these public-release fixes in this repo.

### Verified outcome

- Apple validation: succeeded with no errors. Upload accepted once, delivery ID
  `cafe63b2-c3dc-470f-b12e-ae091d036309`.
- Apple build 0.2.0 (1): `VALID`, `IN_BETA_TESTING`. The OnlyIdeas Internal group
  `aa16986d-2d1d-443b-9cf8-99677d3f7a68` has one authorized owner tester and this
  one build. Invitation state: `INVITED`; automatic tester notifications enabled.
  This is internal TestFlight, not an externally shareable public beta link.
- Google version code 1: published to internal track `4701325459048995948`.
  Console readback: **Active**, **Available to internal testers**, **Not reviewed**.
  A separate OnlyIdeas Internal Owner list is selected and saved; other apps'
  tester lists were neither selected nor changed.
- Google join URL: https://play.google.com/apps/internaltest/4701512710674115784
  (restricted to the selected tester account). Google may temporarily display
  `art.onlyideas.app (unreviewed)` until listing review.
- Formal Apple version 1.0 remains `PREPARE_FOR_SUBMISSION`; external beta review
  and Google Production review have not been submitted. Resolve the listed
  product requirements before preparing the next review candidate.

No application source, server deployment, account data or other app's submission
was changed in this publication round. The normal store workflow kept testing
separate from formal review; no additional physical-device prerequisite was added.

## Repeatable workflow

### Status recheck and reading flow

A subsequent live readback confirmed Apple build 1 is `VALID` /
`IN_BETA_TESTING`, with external beta `READY_FOR_BETA_SUBMISSION`. The formal
Apple version remains `PREPARE_FOR_SUBMISSION`. Google Console still shows
0.2.0 (1) as **Available to internal testers**, **Not reviewed**. The accepted
binaries were not uploaded again.

The live API reports PDF conversion enabled, with a 30-page limit. The app accepts
a direct public HTTPS PDF link or an uploaded PDF (up to 20 MB). Mathpix converts
it to flowing Markdown with TeX equations and durable figure files. The reader
uses adjustable text, passage discussions and explicit offline downloads; it
does not require reading the original fixed-page PDF. Ordinary publisher landing
pages and paywalled links are not supported as PDF inputs. Previous live
conversion evidence is in [the web verification](verification-0.1.md), and native
reading/picker/offline evidence is in [native verification](verification-0.2.md).

### Publication procedure

1. Fetch origin and verify source/status, then read AGENTS/BRIEF and native docs.
2. Reuse the exact signed candidate where application inputs are unchanged.
3. Verify bundle/package, version, signing identity and artifact SHA-256.
4. Reconcile current app/build/track state before any upload retry.
5. On the existing Mac, run `xcrun altool --validate-app` with the OnlyIdeas IPA
   and the established protected App Store Connect API key directory. After
   successful validation, upload that exact file once and retain the receipt.
6. After Apple processing, associate the exact build with an OnlyIdeas internal
   group; invite only authorized testers. External TestFlight requires its own
   beta review and working reviewer access.
7. In the OnlyIdeas Google Console record, use Internal testing → Create release,
   select the exact AAB once, review the version and provider warnings, and
   publish only after the visible confirmation. Preserve the current source key.
8. Keep signing keys, tester addresses, API receipts and screenshots of account
   controls in ignored `.runtime/` and protected configuration, not Git.
9. Resolve the public-release work above before formal review. Do not touch
   Bunko, EchoMind, other store apps, shared runtime ownership or credentials.

Sources: [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/),
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[Google internal testing](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).

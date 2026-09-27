# OnlyIdeas 1.0.0 (5) · review candidate

Prepared 27 September 2026. Formal App Store and Google Play review has not yet
been submitted. Existing internal testers previously received build 2. Build 5
supersedes the unsubmitted build 4 and must be selected for the next release.

## Changes

- Permanent account deletion, late-result guards and provider revocation.
- Public paper/comment moderation queues, mutual blocking, in-app content and AI
  reports, moderator tools, community terms and public privacy/deletion pages.
- Native Sign in with Apple on iOS, GitHub login retained. Real Apple authorization
  acceptance remains outstanding; signed entitlements and cryptographic tests pass.
- Rebuilt paper renderer using the installed dependency fixes, without copying
  Mathpix's prebuilt bundle. Equations display once, with accessible MathML;
  uploaded Word-style figure dimensions no longer collapse mobile images.

## Evidence

`npm run check` passes 13 backend tests, a compiled-browser renderer regression
and TypeScript/web/native-reader builds. Android release lint, signed APK/AAB and
iOS archive/export/Apple validation pass. The native iOS navigation, reading and
offline cold-launch test passed on the KVM simulator. Android emulator build 5
opened a converted PDF and displayed its equations correctly.

Apple upload succeeded, delivery `d584994c-c756-4d93-bbf8-2b4772fe11b3`.
This is an upload receipt, not a formal review submission or public release.

Current constraints: KVM iOS screenshots have incomplete Liquid Glass controls
and are unsuitable for the listing. The physical iMac is reachable through UU
terminal via the Mac mini's LAN, but repeated workstation-to-iMac artifact copies
failed during SSH banner exchange. No fleet service was restarted. Physical Apple
sign-in and final listing screenshots remain unverified.

Google privacy, ads, reusable reviewer access, IARC content rating, target ages
16–17 / 18+, advertising-ID and government declarations have been saved. Finish
remaining declarations, listing and release selection before sending for review.

Private screenshots, logs, accounts and device identifiers remain in `.runtime/`.
No personal paper payloads or provider credentials belong in this repository.

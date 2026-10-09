# Latest OnlyIdeas review submission · 9 October 2026

The owner requested the latest fixes and builds submitted to both stores,
superseding the earlier test-only instruction.

| Platform | Candidate | Verified outcome |
| --- | --- | --- |
| iOS / paired Apple Watch | 1.0.6 (27) | Waiting for Review |
| Universal Mac | 1.0.6 (28) | Waiting for Review |
| Google Play production | 1.0.6 (27) | Changes in review; automatic checks running |

Apple will release automatically after approval. Google received the production
change at 100% rollout across the existing targeted countries, with managed
publishing off. The preceding Apple1.0.5(26) versions were already released at
preflight; Google production25 remained public.

## Qualification and included fixes

- Fresh `npm run check`: 191 tests, renderer/Watch prose checks, TypeScript and
  production build passed, using the configured Pandoc3.11 converter.
- Existing signed and validated uploads were reused. Android artifacts match
  the internal build27 hashes. Native reader and Android source inputs are
  unchanged since that candidate. The iOS changes after build27 are confined to
  the Mac picker branch and a type unused by iOS.
- Mac28 contains the compact native attachment picker and the approved rounded
  icon. Debug compilation, universal archive, signature and export validation
  passed. No fresh installed-app picker interaction is claimed here.
- Native authentication source hashes still match the October6 real production
  GitHub login, Keychain persistence, relaunch and sign-out simulator
  [qualification](apple-review-26-20261006.md).
- All copied Apple screenshot sets are complete; exact builds, version strings,
  automatic release and private reviewer credentials were read back.
- Google preview reported no lost supported devices or blocking release errors.
  The existing Android15 edge-to-edge advisories remain: the app explicitly
  handles system-bar and keyboard insets. No warning is reported as a new test.
- Production health and privacy/account-deletion pages returned HTTPS200.
- A fresh anonymous production check read all three real shared-paper transcripts
  (33,881 / 33,520 / 10,500 characters), their reading endpoints and all10 figures.
  It created no import, conversion, translation or credit charge.

The server already contains the [paper-agent and reuse fixes](agent-reuse-20261008.md)
and the [protected batch publication review](publication-review.md), including
the approval guidance correction. Those changes do not require another native
binary. Public transcripts/translations can be reused; private files, chats and
preferences remain private. Publication still requires supported source rights.

General subscription purchases remain disabled. No product, price, provider,
entitlement or shared-account activation was performed. This task did not run a
new physical-device test or payment transaction. Review submission is not approval.

[Provider receipt](latest-review-20261009.json). Private shared store evidence is
in `../Bunko/.runtime/latest-review-20261009/`; no credentials are tracked.

# OnlyIdeas 1.0.5 (25) · 3 October 2026

Source: `49a682cfe46595372925a682da63c64c2b9a369d`.

Google Play internal testing is available. Production build25 and the approved
store icon were sent for review; Publishing overview reports **Changes in
review**, managed publishing off, full rollout to the existing country set.
The old unsubmitted build23 draft was discarded before promoting build25.
Public build21 remains available until approval. Automated quick checks completed; the Console confirms the changes are now in
review. Android remains a free download;
a previously published free Play listing cannot be converted to paid.

Android AAB SHA-256:
`526321352ded5ee3f90cc433e6b1bd1b875a167e41966031cf4330d35c6dea9d`.

Apple iOS and Mac build25 are VALID and IN_BETA_TESTING. They are not claimed
as production submissions here. The current Apple iOS build21 review and public
Mac build24 are preserved. Actual OnlyIdeas StoreKit purchase/restore lifecycle
qualification remains incomplete; general subscription sales remain disabled.

Validation: 160 tests, renderer checks, TypeScript/build, Android lint and signed
release build passed before upload. TestFlight Mac25 installed on the Mac mini
and loaded real library data. GitHub consent reached the server success page,
but the return left the app showing Signing in. Native callback recovery needs
qualification before promoting the Apple successor. No real Apple purchase is
claimed. No papers, user data or credit ledger were reset.

At the owner's request, all Mac GUI automation is disconnected. Continue via
headless SSH and isolated testing; do not reconnect UU or use the owner's active
desktop. Private receipts stay in `.runtime/billing-cash-20261003/` and Bunko's
`.runtime/store-latest-20261003/`.

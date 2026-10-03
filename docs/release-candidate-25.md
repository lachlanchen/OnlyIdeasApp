# OnlyIdeas 1.0.5 (25) · 3 October 2026

Source: `49a682cfe46595372925a682da63c64c2b9a369d`.

Google Play production **1.0.5 (25) is public at 100% rollout**, verified on
3 October 2026. Publishing overview has no unpublished changes. The approved
store icon is included. The old unsubmitted build 23 draft was discarded before
promoting build 25. Build 26 changes only Apple code; build 25 is the latest Android
application. Android remains a free download;
a previously published free Play listing cannot be converted to paid.

Android AAB SHA-256:
`526321352ded5ee3f90cc433e6b1bd1b875a167e41966031cf4330d35c6dea9d`.

Apple iOS and Mac build 25 are VALID and IN_BETA_TESTING. They are not claimed
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

## Fresh release verification · 3 October 2026

Installed the signed release APK as an upgrade from 21 on the existing dedicated
Android API34 emulator. Account and library remained. A real shared paper
(`10.1038/s41534-019-0145-z`) opened, and reopened after a cold app restart with
emulator Wi-Fi and mobile data disabled. Profile opened its page; Plans & usage
displayed the three localized Play prices. No purchase was attempted.

All 160 tests, the renderer checks and TypeScript/production build passed using
`ONLYIDEAS_TEST_PANDOC=/home/lachlan/.local/share/pandoc/3.11/bin/pandoc npm run check`.
An initial run picked the workstation's older Pandoc 2.12 and failed the sandboxed
DOCX test; rerunning with the already configured Pandoc 3.11 passed without relaxing
the sandbox or changing application code.

[Curated receipt](google-public-25-20261003.json). Actual OnlyIdeas Apple purchase
qualification remains outstanding. EchoMind's new receipt is peer guidance, not
OnlyIdeas payment evidence. Shared Mac desktops were not controlled.

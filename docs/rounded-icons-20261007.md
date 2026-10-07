# Rounded icon test candidate · 7 October 2026

Candidate: **1.0.6 (27)**. The owner requested internal testing only.
Do not attach this build to a production App Store version, replace a current
review, promote a Google release, or deploy the web changes without a later
owner instruction. Accumulate this change for the next review.

## Changes

- Retain the exact approved master and all archived icon designs.
- Export transparent rounded tiles with consistent Dock insets for legacy macOS.
- Round web icons and legacy Android launcher assets. Android adaptive icons
  retain their full-size background and launcher-controlled outer mask.
- Keep iOS, Watch and store marketing artwork opaque; those platforms mask it.
- Keep the current account, library, billing configuration and production feeds.

## Verification

Source exports were inspected visually and checked for transparent corners,
opaque centres and correct sizes. iOS icons remain opaque 1024px assets.
Full project checks passed. Native signed-package and store-processing evidence
will be recorded after upload; an archive or upload alone is not tester access.

The candidate is on `test/rounded-icons-20261007`; production reviews are separate.

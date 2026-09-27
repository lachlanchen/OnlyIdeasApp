# OnlyIdeas 1.0.0 (6) · paper layout update

Prepared 27 September 2026. Build 6 follows the internally distributed build 5.
This record describes the tested candidate; upload, review and public release
must be confirmed separately in the stores.

## Changes

- Long equations scroll within their own line instead of widening the page.
  Inline equations do not show distracting scrollbar arrows.
- Author names, affiliations and email lines remain separated on narrow screens.
- An exact modern arXiv identifier takes the direct PDF path instead of becoming
  a broad keyword search. The downloaded file is checked before offering import.
- Native and web policy links use a static GitHub Pages mirror. Google checks
  timed out on the app domain's authoritative DNS; the API origin is unchanged.

## Real-paper checks

A signed-in, non-maintainer review account used the production agent to import
*Attention Is All You Need* (arXiv 1706.03762) and *Deep Residual Learning for Image
Recognition* (arXiv 1512.03385). Both were kept private. At a 390 px viewport:

- Attention: all 5 figures loaded; 4 tables and mathematical expressions rendered.
- ResNet: all 7 figures loaded; 15 table elements and mathematical expressions rendered.
- Document width and scroll width both measured 375 px, with the remaining width
  occupied by the vertical scrollbar. Long display equations scroll independently.

The native Android agent previously searched for, downloaded and converted
*Measuring Holographic Entanglement Entropy on a Quantum Simulator*. Upgrading
to the signed build 6 preserved that library and reopened the paper with readable
text and equations. Paper contents and screenshots remain private runtime evidence.
These checks verify layout and preservation, not every OCR character or equation.

`npm run check` passed all 13 backend tests, the compiled renderer check and
TypeScript/web/native-reader builds. Signed Android APK/AAB generation and release
lint passed. iOS archive, export, signature verification and Apple validation
passed. The prior build's native iOS navigation/offline test passed; physical
Apple sign-in and usable Apple listing screenshots remain outstanding.

## Artifacts

- Android AAB SHA-256: `123c02bb1f9c14e27a02af7134d14bd892c98d82319dff087759e9615e992011`
- iOS IPA SHA-256: `445e3c28ac16cb4f82eae742ee38f35dd742be344144c9f33d930afcd62c6696`
- Deployed web release archive SHA-256: `142d848f14dfaa79f0ab2f37c49b45202644eec4e491ec352586b652677a4c2f`

Google listing assets use the original CC0 reading sample and empty agent welcome
screen. No imported paper or private conversation is included in store screenshots.
All Google content declarations, reviewer access, English listing and 176 countries
plus the remaining world region have been saved. Apple privacy declarations,
reviewer access, free pricing and all 175 available territories have been saved.
The store confirmation below records the subsequent submission outcome.

## Store confirmation · 27 September 2026

Apple build `3bbea323-4e3d-463d-86ee-b88ecdd24fef` processed as **VALID** and
**IN_BETA_TESTING**, was added to the existing internal TestFlight group, and is
selected for the draft App Store version. What to Test notes were saved. App Store
public review remains **PREPARE_FOR_SUBMISSION** while the screenshot and live
Apple authorization checks above remain outstanding.

Google accepted build 6 for internal publication. The unsubmitted production
build 5 was discarded and replaced with build 6. Play Console confirmed
**“11 changes sent for review”** for build 6, its listing and declarations, and
176 countries plus the remaining world region. This is a submission receipt,
not approval or public availability; Google may run pre-review checks first.

The live worker now uses the tested source, and the ordinary review account's
exact-ID request returned the PDF for arXiv 1706.03762. No duplicate conversion was
requested. Temporary emulator, Bunko QA desktop and owned Mac build processes
were stopped; the production paper worker and model tunnel remain active.

# OnlyIdeas 1.0.0 (10) · languages and shared reading

## Changes

- A vivid teal, blue and violet native interface with system, light and dark themes.
  Keep the accepted build 9 icon and compact, automatically cached paper reader.
- Eleven UI languages: English, simplified and traditional Chinese, Japanese,
  Korean, Arabic, Spanish, French, German, Russian and Vietnamese. Follow device
  language by default, with an app override and right-to-left Arabic layouts.
- Attach up to three private PDF, Word, image or text files to an agent message.
  Supported text includes Markdown, CSV, JSON and TeX. Converted text and original
  figures become readable papers; follow-up messages retain document context.
- Discuss a paragraph using its button, or continue selecting text to comment.
  Anchors include the paper revision and distinguish repeated paragraphs.
- Fetch translations in all eleven languages. Concurrent readers of a public paper
  reuse one job and result for the same revision, operation and model. Personal
  uploads, attachments and their generated text remain private.

## Reliability and data

SQLite transactions deduplicate uploads and translation requests across processes.
Workers claim leases and save translated sections durably, so interrupted work
resumes without repeating completed sections. Math, code, figure references and
source URLs are protected and checked before accepting a translated section.
Changed revisions receive separate results. Existing private artifacts do not
become public merely because their source paper is later published.

Uploads have byte, image-pixel, ZIP-entry and expanded-size limits. Word conversion
uses Pandoc's sandbox and preserves embedded equations and figures. Image OCR
sends a bounded normalized copy while keeping the original figure. Durable
receipts prevent automatic retries from repeating an uncertain paid OCR request.
Source documents are removed after successful conversion. Account deletion covers
attachments, job subscriptions and private results. No production database reset
or removal of existing papers was performed.

## Verification

- `npm run check`: 25 tests, compiled renderer checks, TypeScript and production
  builds passed. This includes twelve independent SQLite workers competing for a
  translation job, upload ownership, lease fencing, checkpoint recovery, catalog
  coverage and paragraph selection behavior.
- All 22 web combinations of language and light/dark theme passed at phone width.
- All 22 iOS language/theme checks and paragraph/translation menu tests passed
  before the final label refinements. The final iPhone screenshot test also passed
  against the live shared library.
- Real UI tests uploaded PDF, Word, text and an image. Mathpix converted the real
  OpenAlex PDF and an equation image; the agent used file contents and remembered
  them in follow-up messages. Original PDF figures rendered successfully.
- A real OpenAlex Japanese translation completed and was reused. Paragraph posting
  and the existing selection-comment flow both passed. Test accounts and comments
  stayed in the isolated QA database.
- Signed Android release lint, APK and AAB builds passed. An in-place upgrade
  retained the existing account and cached library. All 22 Android locale/theme combinations also passed system-bar inset checks.
  The live native agent read an uploaded private text file correctly; the native
  reader fetched and reopened the public OpenAlex Japanese translation. That
  completed translation remains available to readers.

The live web/API and paper worker are deployed. The policy mirror documents image
and file attachments, processors, privacy and shared translation results.

## Build tooling

The final archive disables Swift explicit modules after an observed vendor
module compilation stall on the shared Xcode host. This uses Apple’s documented
[explicit-module opt-out](https://developer.apple.com/documentation/Xcode-Release-Notes/xcode-26-release-notes).

## Distribution

- Android 1.0.0 (10): available in the existing internal testing group; production
  submission verified **In review**, replacing build 6. Full rollout is configured
  for all targeted countries, including the rest-of-world option.
- iOS 1.0.0 (10): Apple validation and upload passed; processing is **VALID** and
  the existing internal TestFlight group reports **IN_BETA_TESTING**. The App Store
  submission selects build 10 and reports **WAITING_FOR_REVIEW**. Five iPhone and
  three iPad screenshots are accepted and attached to the submission.
- Updated attachment privacy declarations and the public policy are saved in both
  stores. Apple release is configured for automatic publication after approval.

### Artifact verification

| Artifact | SHA-256 |
| --- | --- |
| Android AAB | `bdb9890341d6f56c753affe439b26b190e15afce2868b0eacc947c2fa056ef47` |
| Android APK | `f4abb3b2318f80d4545d013c5a462759e1b3bc6100d315f102a2abc8f51f0c83` |
| iOS IPA | `533e67443e393b760969393429ff7fb1c365c50a1c4f3d3f0abc474929781081` |

Apple build/delivery ID: `9551bb61-55f9-4a41-a06b-f9cf702a7443`.
Apple public review ID: `106b9439-c8e4-4985-9e2c-821da9b31436`.
Store states verified on 2026-09-28 (Hong Kong).
Testing used iOS simulators and an Android emulator. Physical-device Apple account
authorization was not rerun in this pass. An additional iMac paragraph-test run
failed during simulator relaunch; the earlier paragraph test passed. On iPad,
real-library, Agent and Profile navigation/screenshots passed. The reader step
was interrupted by the host SimRenderServer process crashing with SIGILL, so the
complete iPad reader test is not counted as passed. No claim of store approval is implied by a successful upload or review submission.

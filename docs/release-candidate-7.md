# OnlyIdeas 1.0.0 (7) · sharp icon and retained real papers

Verified 27 September 2026. The former enlarged raster icon is replaced by an
editable vector master with an emerald background, cream pages and a gold spark.
Every raster size is exported directly from the SVG; the iOS 1024 px asset is
opaque. Apple’s processed build icon was downloaded and visually verified.

- iOS build `16535d6c-5ae5-4ace-8533-4d0b984b37d4`: **VALID / IN_BETA_TESTING**.
- Existing internal TestFlight group includes build 7; release notes are saved.
- The App Store draft selects build 7. Public review still requires final iOS
  screenshots and live Apple sign-in verification; it has not been submitted.
- Android icon resources and version 7 are prepared in source. Google internal
  testing and production review remain on build 6; no Android 7 upload is claimed.
- IPA SHA-256: `d6505f5c4a40e88f61ac4ff0900d5be7a8079679977a4ae1839bda5be10b9e17`.
- iOS source icon SHA-256: `d2f27afcd36ef8a753347c108f8bc70a6d97e06dc99a3f99fc1158b1ea5ec361`.

## Real imports retained at the owner’s request

The signed-in owner used the live agent composer to find the exact arXiv papers,
then **Convert & add** to download and convert them through Mathpix. Both results
remain in that account’s private library, along with their agent conversations:

| Paper | Loaded figures | Tables | Rendered math elements |
| --- | ---: | ---: | ---: |
| Attention Is All You Need — arXiv 1706.03762 | 5 | 4 | 126 |
| Deep Residual Learning for Image Recognition — arXiv 1512.03385 | 7 | 15 | 111 |

The earlier real quantum-simulator paper is also retained. Mobile browser checks
used a 390 px viewport; content width and scroll width matched at 287 px, and the
page stayed at 375 px including the browser’s scrollbar allowance. Wide tables
scroll within the reader. Figure and table screenshots were inspected. These are
layout/import checks, not a complete scientific proofreading of OCR output.

The production database and private figure directory remain outside application
releases. An SQLite backup passed integrity checking, and all 31 figure files
were extracted from a separate backup and verified by SHA-256. This verified
backup contents; a full service restoration was not performed. Account IDs,
private paper IDs, backup location and screenshots stay in the runtime handoff.
No private paper or database is committed or publicly republished.

`npm run check` passed 13 backend tests, the compiled renderer check and the
TypeScript/web/native-reader builds before packaging. The signed iOS archive,
export, Apple validation and upload succeeded. Install the TestFlight update over
the existing app; the server library does not require a reset or fresh import.

## Subsequent web correction

Opening a completed request while on the Agent or Profile page now switches to
the reader immediately, including its offline fallback. This is a web navigation
correction made after the iOS 7 archive; native SwiftUI navigation is separate.
Generated figure backups now follow the same 30-day retention policy as SQLite
snapshots. Cleanup never targets the live library. The retention boundary test
and the full application check passed.

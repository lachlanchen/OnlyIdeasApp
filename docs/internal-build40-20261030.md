# OnlyIdeas 1.0.10 (40) — internal testing

OnlyIdeas 1.0.10 (40) is available to the existing internal TestFlight group on
iOS/iPadOS and macOS. The iOS package includes the Watch app. Apple reports both
builds as `VALID` and `IN_BETA_TESTING`, verified on 30 October 2026.

Readers can highlight passages, keep private notes, browse a paper's contents,
search its text and zoom figures. New default journal selections include Nature,
Science and Cell; saved preferences remain available. Conversations and unsent
drafts stay in place when the reading window changes size.

## Validation

- All 358 application checks passed, along with equation, table, figure and
  HTML-escaping renderer checks.
- All 17 browser reader checks passed, covering search, highlights, private-note
  persistence, account isolation, figure zoom and widths from 320 to 1280 pixels.
- Three native XCTest cases passed: adaptive composer drafts, interest setup
  without losing a draft, and reader contents/search/private notebook/figure zoom.
  The reader case completed in 44 seconds after correcting search-field focus.
- Archived and exported packages passed bundle identity, version, resource,
  signature and embedded Watch checks. The Mac executable contains both `arm64`
  and `x86_64` slices and declares macOS 12.0 support.
- Apple processing completed, and both builds were assigned to the existing
  internal tester group. Formal store versions and selected builds were checked
  against the pre-upload baseline and remain unchanged.
- The shared build host's signing settings, provisioning profiles and all
  simulator states were restored. Owned build and upload processes exited.

This round did not test a physical iPhone Duo, official fold poses or a fresh
macOS Monterey installation. Target compatibility does not establish those
runtime results.

Source revision: `a4d88a8f3fb812c4e28422b8f6aa511b81cdb7ba`.

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| iOS/Watch IPA | 14,840,822 | `80fa3407f14b5c6893612368261c59c45d2cc3657cd43a9c1f17ad704ca60141` |
| Universal Mac PKG | 13,845,051 | `4f2812cb7b63e9f658367bde1cab99cfdd213edc2c3f806706649bdaba3b0323` |

Machine-readable receipt:
[`internal40-20261030.json`](../store/testflight/internal40-20261030.json).

## Windows preview

The [Windows EXE](https://lazying.art/downloads/windows/#onlyideas) is published
on LazyingArt's download page and product directory. Windows 11 testing opened a
real public paper and verified contents, search, figure zoom and page width.
The unsigned x64 preview includes .NET and requires Microsoft Edge WebView2
Runtime. Actual provider sign-in and Windows 10 remain unqualified.

# OnlyIdeas 1.0.10 (42) — internal testing

OnlyIdeas 1.0.10 (42) is available in the existing internal TestFlight group for
iOS/iPadOS and macOS. The iOS package includes Watch. Both builds are `VALID`,
unexpired and `IN_BETA_TESTING`; group membership and testing notes were verified
on 1 November 2026 at 01:59 UTC.

This candidate includes journal selection by name or ISSN in Settings and Agent,
and preserves the visible conversation passage and draft as the layout changes.
It is built with Xcode 27.1 (27A9275).

## Validation

- Unsigned native iOS/Watch and universal Mac Catalyst compilation passed.
- Eight compiled checks passed against the exact conversation-anchor source:
  empty, hidden and offscreen histories; the first visible passage; long and
  short answers; clamping; and horizontal alignment. These are geometry checks,
  not SwiftUI interaction, rotation or physical-device tests.
- Before signing, all three profiles were checked against project and export
  selections, team and bundle identifiers, expiration, required Apple sign-in
  entitlements and a matching valid certificate in the temporary keychain.
- Both archives and exported packages passed identity, version, resource and
  signature checks. The iOS app links the iOS 27.1 SDK and retains iOS 15.0 as
  its minimum. The embedded Watch app matches build 42 and retains watchOS 11.0.
- The Mac package declares macOS 12.0 support and contains both `arm64` and
  `x86_64` slices. The receipt records their Mac Catalyst load-command targets.
- Independent cleanup verified the original keychain search list, six restored
  provisioning-profile entries, removal of the temporary signer, unchanged
  source and helpers, and absence of owned processes and the build guard.
  Device state and other metadata fields were preserved; one existing
  `lastUsedAt` timestamp advanced. No device metadata was written by the helpers.

Qualification corrected two delivery-helper errors: a Swift access modifier in
the generated test harness and selection of an older provisioning profile.
Their failed attempts remain recorded separately. The final round passed all
gates with the unchanged app source. A partial Mac network upload was recovered
within the same existing file, retaining its completed first chunk; Apple then
accepted the full-file checksum.

No fresh SwiftUI rotation, official iPhone Duo pose, physical iPhone/Watch or
Monterey runtime test ran. SDK linkage and deployment targets do not establish
those runtime results. Public releases, formal reviews, accounts and billing
remain unchanged.

Source revision: `4d706350569e789aed309bc6b99f6d15cd60b67f`.

| Package | Bytes | SHA-256 |
| --- | ---: | --- |
| iOS/Watch IPA | 10,609,161 | `f185f733d5c6856e4c5c8be5d6144db5dfd7d28b1f010dd803af2c70e9c7c8e7` |
| Universal Mac PKG | 9,658,971 | `3a34d601cb20588a93f80bbc68946b5a1af87ff1bf1484f6335e1b6e8587e8ae` |

See the [machine-readable receipt](../store/testflight/internal42-20261101.json).

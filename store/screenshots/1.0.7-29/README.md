# Screenshots for the next OnlyIdeas update

These genuine native captures are selected for **1.0.7 (29)**. They are staged for the next
owner-authorized production update, not uploaded to the current product pages.
The previous screenshot sets remain in `store/apple/` and `store/google/`.

## Why refresh

The live iPhone/iPad sets still use build 10 captures. They omit the current
research recommendations, shared library actions and integrated reading modes.
The new set shows the current public app without personal accounts or chat data.

## Capture order and evidence

| Screen | Purpose |
| --- | --- |
| Discovery | Research suggestions, source attribution and immediate opening of existing papers |
| Reading library | Shared papers with Save, Like, Comment and Share |
| Agent | Native composer, file attachment control and private-conversation notice |
| Reader | Actual open-access paper in the native reader with language and Watch controls |

iPhone: 1320 × 2868, the existing OnlyIdeas simulator on the 7050 iMac, Xcode 26.6.
`NativeUITests/testFinalStoreScreens` passed against the live public library.
Its DEBUG guest cache bypasses saved account tokens. The selected four captures
were reviewed visually. Two later captures had simulator compositor corruption
and were excluded; passing accessibility assertions do not prove image quality.

Mac: 1280 × 800, preserved physical Mac mini captures from **1.0.4 (24)** on
30 September. The native reader section and all native/parallel renderer source
files are unchanged from `e08c39e` through the build 29 source. Reader, equations
and interlaced images were inspected again and remain accurate. These replace
the less current build 13 reading images in the staged selection; they are not
reported as new build 29 device tests. The old discovery screenshot is not reused
because its saved library state predates the latest shared-paper updates.

Exact capture provenance is in [capture-sources.json](capture-sources.json).

iPad refresh is pending: the simulator test runner terminated twice and direct
capture timed out waiting for screen surfaces. No failed or blank iPad image is
included. Preserve the existing iPad set until a visually verified replacement
is available. These screenshots are not yet a complete replacement for every
Apple device slot.

Android: six fresh 1080 × 1920 captures from the API 34 emulator, using a separate
debug application ID so saved tester data remained untouched. Discovery, library,
agent, original reader, equation and interlaced views were inspected. The live
paper supplied 33 cached reading pairs and three visible figures; the reader fit
the viewport without horizontal overflow. PNG conversion only removed the fully
opaque alpha channel; RGB pixels are unchanged. The signed release APK and AAB
use the normal application ID and signing configuration.

The paper in the reader is *Measuring holographic entanglement entropy on a
quantum simulator*, Keren Li et al., DOI
[10.1038/s41534-019-0145-z](https://doi.org/10.1038/s41534-019-0145-z), CC BY 4.0.
The screenshot presents the original paper text inside the app; it is not a
fabricated paper or a new conversion. Public metadata and captions retain their
authors. Personal files, conversations and interests are absent.

## Next listing update

Use the image order in [manifest.json](manifest.json). Verify the target Apple
device slot and locale inheritance; do not assume a new version inherits this
staged set. Confirm uploaded images reach COMPLETE and inspect the resulting
product page. Preserve active reviews unless replacement is explicitly requested.

```sh
python3 tools/native/check-store-screenshots.py store/screenshots/1.0.7-29 \
  --version 1.0.7 --build 29
```

The checker records dimensions and SHA-256 hashes. It does not replace visual
inspection. Requirements: [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
and [Google preview assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).

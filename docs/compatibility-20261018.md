# Compatibility candidate 1.0.9 (35)

## Changes

The paper reader keeps the current passage when the reading area changes size. The native iOS and Mac composer stores an unsent message with its scene, retaining it through view reconstruction and unsuccessful sends. A successful send clears only the unchanged draft for the same account; changing accounts clears the account-bound draft.

Android retains the composer and reader views during geometry-only configuration changes. Appearance changes still rebuild the appropriate views. This round does not change account identity, billing, publication permissions or paper formats.

The Mac deployment target remains macOS 12.0; iOS remains 15.0. The existing Watch companion is included in the version update.

## Validation as of 18 October 2026

- 302 tests passed, together with type, renderer and web builds.
- Ten browser resize transitions passed for element and document reading surfaces.
- Two Android instrumentation tests passed, covering chat layout/selection/copy and preserving the actual composer and reader instances through orientation changes. The first rotation test exposed a view-recreation bug; the corrected implementation passed.
- The signed Android upgrade from build 34 to 35 retained the account and existing chat history. An unsent draft survived portrait-to-landscape rotation.
- Android release lint, APK signing and AAB generation passed. Google Play reports build 35 available to the existing internal testers.
- Native Apple compilation, runtime QA and internal TestFlight delivery remain pending the shared build slot. Existing public releases and review candidates were preserved.

## Duo qualification gap

Both phone and tablet orientations remain enabled, without a full-screen-only requirement. Browser resizing and Android rotation do not establish iPhone Duo compatibility. The available hosts do not have Xcode 27.1 or a Duo simulator; opening, closing and partial-fold behavior has not been qualified. See Apple's [Duo layout guidance](https://developer.apple.com/videos/play/tech-talks/111461/) and [Xcode requirements](https://developer.apple.com/xcode/system-requirements).

Android AAB SHA-256: `1920f65e3f13a91a8408954a5cfa7eff6b28754092d9b59c045e322969b75f65`.

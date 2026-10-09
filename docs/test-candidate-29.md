# OnlyIdeas 1.0.7 (29) · internal update

The owner requested current screenshots and an accumulated test build.

| Platform | Verified distribution |
| --- | --- |
| iOS / embedded Watch | VALID, IN_BETA_TESTING in the existing TestFlight group |
| Universal Mac | VALID, IN_BETA_TESTING in the same group |
| Android | Available to internal testers in Google Play |

This candidate contains the current reader, approved rounded icon and native
authentication fixes; Mac includes the compact attachment picker. The research
agent relevance, shared transcript/translation reuse and publication review fixes
are already server features. Quick publication approval is available in the web
administrator interface. This task did not activate subscriptions or shared login.

## Screenshots

The public iPhone/iPad screenshot inventory still names build 10 files, and the
old Mac selection predates integrated translations and Watch transfer. The staged
[current selection](../store/screenshots/1.0.7-29/README.md) includes fresh iPhone
and Android captures plus preserved Mac captures of the unchanged reader. Capture
versions, devices, dimensions and hashes are recorded explicitly. The old sets
remain available. No image was uploaded to a production listing in this task.

## Verification

- Full `npm run check`: **194 tests passed**, renderer/Watch prose checks,
  TypeScript and production build passed. Pandoc 3.11 was selected explicitly;
  the older default installation lacks the required sandbox option.
- Android release lint, APK/AAB build and upload signature passed. Google preview
  reported zero lost supported devices. Its existing production edge-to-edge
  advisories remain; no new compatibility claim is inferred from this upload.
- iOS/Watch archive, matching version/build, deep signature, export and Apple
  validation passed. The native iPhone screenshot test passed against the actual
  public library with saved account tokens bypassed by DEBUG isolation.
- Mac archive/export and Apple validation passed for **arm64 and x86_64**.
  Reused Mac reader captures are build 24 evidence, not a new installed build 29
  functional test. The depicted reader and renderer source is unchanged.
- Fresh iPad captures remain pending. Two attempts ended with a terminated
  XCTest runner; a direct simulator capture then timed out waiting for screen
  surfaces. They are recorded as failures, not successful iPad qualification.
  The existing iPad listing images were preserved. The owned simulator and
  capture job were stopped after recovery attempts.
- Android's isolated debug package opened the real holographic paper, switched
  Original/Interlaced modes and rendered **33 cached reading pairs** and **three
  visible figures**, with no horizontal page overflow. Selected screenshots were
  inspected; duplicate/transitional captures were replaced. Release artifacts
  retain the normal package ID and upload key.
- No new conversion, translation generation, payment or personal data mutation
  was needed for these captures. Watch behavior is inherited from the previously
  qualified companion; this was not a new paired-device test.

## Production state preserved

iOS/Watch 1.0.6 (27) remains public. Mac 1.0.6 (28) remains IN_REVIEW with automatic
release after approval. Their exact Apple build attachments were read back and
unchanged. Google production remains 1.0.6 (27), at 100% rollout; Console showed
no unpublished changes after internal build 29 was published.

See [provider state and artifact hashes](test-candidate-29.json). Signed packages,
private raw store responses, native logs and rejected screenshot captures are
retained outside Git under `release/` and `.runtime/screenshots-test29-20261010/`.
The application source is `532f448`; later screenshot/test-tool/documentation
changes do not change the uploaded binaries.

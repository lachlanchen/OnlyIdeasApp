# Reading experience update · 11 October 2026

OnlyIdeas 1.0.7: Android build 30, Apple build 31. Android internal and iOS/Watch/Mac TestFlight delivery are verified.
Apple build 30 remains available internally. No new production review is part of this update.

## Changes

- Compact, expanding native/PWA composer; downward keyboard dismissal;
  tab-aware message scrolling; journal metadata on agent results.
- Resume each account's current conversation. Bound the context sent to the
  model while retaining the full server history and recent paper references.
- Conditional read responses after current permission checks. Native memory
  validators are scoped to the session; existing durable offline caches remain.
- Pull-to-refresh also refreshes research discovery. Local-first search remains.
- New Shared uploads become readable after explicit license/permission
  confirmation, followed by administrator review. Existing private items are
  not bulk published. Rejection removes public access; GitHub archival
  publishing and rewards still require approval.
- The owner-identified Robbie marker-report item was declined through the
  existing audited review action. Its original remains private.
- Full-text HTML conversion uses a script-disabled DOM parser and sandboxed
  Pandoc. Public-network checks apply to each page and figure. Figures are
  decoded and cached locally; tables, captions and equations are retained.
  Abstract-only and mismatched pages are rejected. HTML conversion uses no
  Mathpix call or transcription-page charge. PDF fallback remains available;
  a figure that cannot be preserved produces a recoverable import error.

## Verification

- 199 server/domain tests, renderer check, TypeScript and web build.
- Android release lint and signed release build; isolated native capture app
  tested compact input, multiline expansion, downward keyboard dismissal and
  return to Library. Capture app removed; emulator stopped afterward.
- Phone-sized PWA: no outer overflow; 36px one-line editor grows while typing;
  current conversation restores; scroll stays stable through polling and the
  requests dialog; confirmed sharing exercised through the local UI.
- Real cloud conversion: *Intensified optical camera with Timepix4 readout*,
  https://arxiv.org/html/2509.14649v1. Ten locally cached figures, equations,
  citations and tables checked in an isolated private QA library. This QA run
  did not publish a paper into the community or use Mathpix.
- Rendering inspection caught publisher layout syntax and citation brackets
  interpreted as equations. Converter corrections and regression checks cover
  both. The corrected phone reader loaded all ten figures, rendered two tables
  and ten math nodes, and stayed within the viewport.
- Live HTTPS health/library checks passed, unchanged responses returned 304,
  and the exact private marker-report paper returned 404 anonymously.
- Server deployment retained consistent database backups and rollback targets;
  user content, configuration and shared ingress were verified unchanged.

## Delivery and evidence

Android internal track: 1.0.7 (30), completed; production remains 1.0.6 (27).
The API service account uploaded the bundle but lacked release-track permission;
the existing signed-in Play Console session completed internal publication.
Independent API readback confirmed the resulting track states.

Apple build 30: iOS/Watch and Mac VALID and IN_BETA_TESTING. Build 31 adds an
explicit downward-drag fallback. The initial UI test targeted the keyboard's
44px toolbar scroller; the corrected harness selects the message scroller.
The corrected native test passed (one test, zero failures): editor expansion,
downward keyboard dismissal, Library return and draft retention. iOS/Watch31 is VALID and IN_BETA_TESTING. Both Apple archives exported and
passed signing/validation checks. Mac31 contains arm64 and x86_64. The initial
Mac upload hit altool’s local Info.plist detection error; the inspected package
was successfully submitted with explicit bundle metadata via `--upload-package`.
Mac31 is VALID and IN_BETA_TESTING, independently read back from App Store Connect.

New Android screenshots and Apple interaction evidence are staged under `store/screenshots/1.0.7-30/`; previous
1.0.7-29 discovery and reader sets remain available for the next review.
Private logs, raw UI captures, store API responses, deployment manifests and
rollback details are retained in `.runtime/reading30-20261011/`.

Physical-device gestures and every publisher's HTML structure are not claimed
as tested. No billing lifecycle or unified-login qualification was changed.

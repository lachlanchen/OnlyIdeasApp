# Adaptive paper reading and conversations

## Changes

The web conversation keeps the message being read when its pane changes size,
including a temporary zero-size transition. Following the latest answer keeps
it above the composer. Draft text and selection remain in the existing editor;
width and keyboard changes remeasure its height without moving the conversation.

Web navigation, the library, Agent and paper layout now use independent left and
right safe-area insets. The native Apple composer has an additional width-change
measurement callback, so wrapping can update without typing another character.
Its existing native rotation test now uses a long draft and checks remeasurement.

## Verification

- 342 application/server tests, renderer checks and web build passed using the
  existing Pandoc 3.11 installation. An initial run selected an older Conda
  Pandoc without sandbox support; its two conversion-test failures were retained
  and resolved by using the qualified tool path. No converter safeguards changed.
- The final complete test run used two workers. An earlier unrestricted parallel
  run reached a SQLite contention deadline in an existing rewards race test;
  that failure remains recorded. Reward code and activation were not changed.
- Eleven Chromium conversation checks cover narrow/wide/short panes, asymmetric
  insets, a hidden view, older messages, following the latest answer, draft
  selection and zero unintended submissions.
- Ten browser reader checks cover passage retention for document and element
  scrolling. Five further viewport checks use the actual Agent component with
  synthetic local history and confirm a reachable composer and preserved draft.
- Phone/wide component captures were reviewed locally. They are engineering
  fixtures, not new native store screenshots.
- The additional Swift composer implementation and expanded XCTest are prepared;
  their native compilation and runtime checks are pending the shared Mac lane.

## iPhone Duo delivery boundary

Apple's [preparation guide](https://developer.apple.com/iphone-duo/prepare/) calls
for the iOS 27.1 SDK for the full-display experience. The inspected compatible
Mac has Xcode 27.0 and 26.6; the 27.1 toolchain is not installed. Official Duo
opening/closing, partial-fold, hinge/camera reserved regions and Split View have
not been tested. Browser sizes do not substitute for those checks.

No minimum OS, account, paper, subscription or review candidate changed. This
source round has not produced or submitted a new TestFlight build. Native
compilation, Duo-specific layout qualification and internal delivery remain
pending the required toolchain and coordinated device lane.

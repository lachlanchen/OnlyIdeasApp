# Recommendations and activity source qualification

New readers receive a broad research feed. Agent offers a short interest editor,
with Skip and a later edit option. Saving topics creates a private conversation
confirmation, preserves an unsent research draft and does not use a model.
Existing saved interests and notification settings remain intact. The editor is
implemented for web, Android and iOS/Catalyst, with all eleven interface locales.

`POST /api/chats/interests` uses app authentication, an immutable request ID and
an optional owned conversation. It commits preferences and both messages in one
transaction. Replays return the original messages. Preference messages are
excluded from the model's research history. Changing topics changes the daily
digest revision and refreshes web discovery.

`POST /api/lac/activity` accepts only `{"kind":"foreground"}`. The source requires
separate qualified points authorization and explicit runtime enablement.
Foreground v2 evidence and its outbox commit together. Legacy check-in and new
foreground events share the same daily source identity. Reopening, retries and
concurrent requests do not create additional source events. Unlink/deletion
holds or invalidates pending work; reconnection can resume only its original
central subject. Existing final-decision retention remains in force.

Qualification: 309 server tests, renderer checks and web build passed. Nine
browser checks at320/390/1280 widths passed, including persistence, draft
preservation and model-independent operation. Android release lint and signed build passed. Native emulator checks passed for
interest-editor cancellation/reopen with an unsent draft and existing quote/paper
context through rotation. The first interest UI attempt selected the inactive
parent window; the corrected dialog-scoped test passed. The actual Android
editor screenshot is reviewed and retained as a local draft.
The app-emitted Bunko and OnlyIdeas daily records passed Coin's actual candidate
verifier/ledger in a disposable database: one5-point award and one semantic
duplicate conflict for the same canonical subject/day. No live points were
created. New iOS/Catalyst code still needs the next serialized Apple build/QA.

The recommendation backend/PWA overlay was deployed on 2026-10-18 at
03:54:43 UTC. The public bundle matches the candidate hash, health and public
paper sharing return200, and anonymous preference/activity writes return401.
The immutable overlay is `interests-78d88332d23d4b44`, based on the prior
qualified service. A consistent database backup was retained; all52 application
tables and protected configuration were unchanged. Native build36 does not
contain the new interest editor. Android37 is now available on the existing
internal track. Apple37 is locally prepared for its separate serialized slot.
The reward source remains disabled. Actual app callback/points consent,
authenticated delivery/outbox dispatch and a bounded live round trip remain
required. Reading/discussion producers and the shared work/rights registry are
the next integration slice. Opening a share sheet cannot prove external delivery.
Existing app credits, purchases, store prices and formal reviews are unchanged.

## Apple qualification at 04:35 UTC

Build37 passed the universal Catalyst Debug compile and both native iPhone
tests: draft preservation through rotation/tab changes, and interest editing,
saving and reopening without losing the draft. Both tests used a synthetic
loopback fixture with activity rewards disabled. The owned simulator was shut
down afterward; the peer simulator and signing search list were preserved.

Signed iOS/Watch and universal Mac archives and exports passed. Validation checked
the app identity, build/version, signatures, minimum OS and31 bundled reader
resources per platform. Native captures are retained with their screenshot
manifest; the saved-state image includes a system keyboard tutorial and is QA
evidence only. Physical Monterey and iPhone Duo runtime checks remain outstanding.

The first Apple provider validation returned401 because the upload helper had an
incorrect issuer ID. The bounded round stopped before any upload. Corrected
helpers match the working authenticated API client, but native provider validation
and TestFlight delivery still require a new upload-only slot. The existing signed
packages can be reused; no rebuild is required. Android37 remains internally
available, and current Apple testers retain build36.

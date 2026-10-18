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
preservation and model-independent operation. Android Java compilation passed.
The app-emitted Bunko and OnlyIdeas daily records passed Coin's actual candidate
verifier/ledger in a disposable database: one5-point award and one semantic
duplicate conflict for the same canonical subject/day. No live points were
created. New iOS/Catalyst code still needs the next serialized Apple build/QA.

The new recommendation UI is source-qualified, not yet deployed or in build36.
The reward source remains disabled. Actual app callback/points consent,
authenticated delivery/outbox dispatch and a bounded live round trip remain
required. Reading/discussion producers and the shared work/rights registry are
the next integration slice. Opening a share sheet cannot prove external delivery.
Existing app credits, purchases, store prices and formal reviews are unchanged.

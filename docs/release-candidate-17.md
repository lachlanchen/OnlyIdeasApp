# OnlyIdeas 1.0.2 (17) · paper recovery and shared translations

Build 17 adds contextual PDF recovery and reusable passage translation. The web
and API are deployed; the existing production database has been preserved.
Store status is recorded separately below and in the verification receipt.

## Changes

- Bounded same-work open-access download fallback, transient retry and exact
  source refresh. Publisher restrictions remain visible; no conversion is charged
  before a successful PDF download.
- Upload my PDF on research cards and owned failed requests, with original context,
  sharing choice, exact-file reuse and uncertain-provider receipt protection.
- Whole-paper, section, paragraph and sentence translation use the same durable
  sentence cache. Equations, figures, TeX commands and grouping are preserved.
- Shared is the default for new requests. Indexed papers with directly verified
  supported licenses publish after conversion; other Shared papers await review.
  Public transcripts, translations and moderated discussions are shared across
  accounts. Existing Only me papers, notes and agent chats remain private.
- Native iOS/Mac, Android and web controls; all 11 UI languages. Saved, Liked,
  activity, inbox, research preferences and optional local daily reminders from
  build 16 are included.

See the [recovery and translation contract](paper-recovery-and-translation.md).

## Qualification

80 server tests pass, along with renderer checks and the production web build.
Tests cover recovery ownership, trusted source aliases, simultaneous database
startup, public/private separation, source licenses, concurrent reuse and model
marker loss. A real PDF upload through the browser recovered an isolated failed
request using its existing conversion. No fabricated paper was added to production.

Android release lint, signed APK/AAB and debug build pass. The signed release was
installed without clearing the account/library. Native controls, completed passage
reuse and the actual Chinese result were checked. The iOS XCTest for passage
controls passes after collapsing the long preview. iOS/Watch and universal Mac
archives and exports pass. Mac shares the checked SwiftUI views; prior build 13
Mac/offline and Watch-transfer tests remain the platform baseline. No Watch
behavior changed in build 17.

The immutable server package is `793dbf0eafcd66cf`. A candidate using a copy of
the live database passed authentication boundaries and two-reader reuse with
Mathpix disabled. A real Chinese paragraph request succeeded; rebuilding the
same result required no further model calls. Deployment preserved existing paper
records, credit ledger/holds, owner exemptions and ingress configuration.

The previously failed full Chinese translation of *Measuring holographic
entanglement entropy on a quantum simulator* is now completed and public. All
185 source math expressions and three figures match exactly. Its 355 unique
cached pieces can be reused. Screenshots show the real saved result.

## Privacy and integration

The privacy policy explains preferences, shared publication and private translation
caches. Apple declarations include linked product interaction and personalization
of user content/account IDs. Google declaration changes and final review receipts
are recorded in the verification receipt. The EchoMind adapter handoff now covers
contextual PDF recovery and passage translation without enabling central auth.

## Remaining product limits

A source can still reject automatic downloads; Upload my PDF is the recovery path.
Open access alone does not guarantee redistribution permission. Private papers
and unsupported/unclear licenses are not silently published. Activity alerts
refresh in-app; remote APNs/FCM activity push is not configured. Paid subscriptions
remain gated on purchase qualification. Store approval and public availability
must be verified separately from upload/submission.

## Store handoff

iOS and Mac build 17 are VALID and IN_BETA_TESTING. Android 17 is available
to internal testers. Production still has build 15 pending review; build 17 is
a Google production draft. The owner reported an agent search 503 during final
submission preparation and requested broader metadata search. Production promotion
is held for that follow-up. The old workstation worker was replaced with the
qualified shared-search worker; the service returned 24 live results.

[Verification and package hashes](../evidence/paper-recovery-17/verification.json)

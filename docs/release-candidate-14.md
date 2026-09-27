# OnlyIdeas 1.0.2 (14) · paper reuse and discussions

Source: `25663fd`. This follows the native Mac/Watch release in build 13.

## Changes

- Existing accessible papers are reused across URL, agent and file import routes.
  Keep their canonical text, figures and ID; do not reconvert or charge for reuse.
- Public translations/digests share revision-scoped jobs across readers and retain
  completed results when the model configuration changes.
- Discussion panels open at the bottom after loading. The latest replies and
  composer are visible; the keyboard remains closed. Long discussions return the
  latest 200 visible comments in chronological order.
- Existing private papers, notes, chats, accounts and the live database are retained.

See [paper reuse](paper-reuse.md) for matching rules and privacy boundaries.

## Qualification

58 server tests pass, including eight concurrent readers reusing a public paper,
identical uploads, agent attachment access, credit refunds, legacy Mathpix receipt
reuse, translation concurrency and account isolation. Renderer checks and web
production build pass. Browser checks cover delayed comments, reopening, mobile
and desktop. Signed Android build passes release lint and compilation; installed
without clearing data and checked against the real physics paper. iOS XCTest
confirms the discussion composer is visible on opening and verifies language and
attachment controls. Both Apple archives/export/validation succeeded. Mac uses
the same SwiftUI discussion view; its full native reading/offline checks and the
Watch transfer checks from build 13 remain the platform baseline.

## Server

Deployed the verified immutable package on 2026-09-27 UTC. The candidate used a
copy of the real database: two readers reused the existing physics paper with
Mathpix disabled. The production switch preserved all paper bodies, credit ledger,
credit holds, rollout configuration and ingress. The public library still has
three entries; the physics text hash and all three figures were verified.

## Apple

Both 1.0.2 (14) builds are VALID and IN_BETA_TESTING in the existing internal group.
Both formal submissions are WAITING_FOR_REVIEW with automatic release after
approval. The pending build 13 submissions were replaced only after build 14
qualified. Store screenshots, privacy declarations and reviewer access are retained.
Approval is not yet claimed.

[Verification and submission receipts](../evidence/paper-reuse-discussion-14/verification.json)

Subscription plans remain gated on the separate purchase qualification work.

## Android

Signed 1.0.2 (14) is available to the existing internal testers. The previous
internal build 12 was replaced without clearing the on-device account or library.

Google production build 14 was sent for review at 2026-09-27 23:49 UTC, replacing
the pending build 10. Full rollout retains 176 selected countries plus the rest
of world. Google lists it under Changes in review while automatic quick checks
finish. Purchase History data safety changes are included; billing stays gated.

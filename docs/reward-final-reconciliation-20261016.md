# Final reward reconciliation

## Implementation and availability

The source implementation accepts `POST /api/lac/source/v1/final` with the same
dedicated source credential as the evidence and eligibility routes. It implements
Coin's `app-lac-source-final-v1` contract. This update is qualified on disposable
databases and a patch against the deployed backend baseline. It has not been
deployed; the live final route remains unavailable. Existing evidence and
eligibility transport remains unchanged.

OnlyIdeas accepts the lifecycle for future shared rewards: expired pending work
closes without an award; reversed work can seal immediately; awarded work seals
only after policy end plus 180 days. A sealed decision is immutable. New reversals
then return `decision_finalized` 409, while previously accepted exact reversal
replays keep their existing behavior. Subsequent corrections require a separately
reviewed accounting process. Acceptance does not activate a reward policy.

## Binding and durable acknowledgment

The dispatcher requires the exact outer and nested field sets, original issuer,
subject and actor, full event and evidence digest, and the known intake receipt
when one has been recorded. Wrong source credentials, browser credentials,
duplicate JSON keys, extra fields and malformed values are rejected. Future
finalization beyond 30 seconds is rejected; delayed delivery is allowed.

`lac_source_finals` stores canonical decision JSON, its digest, finalization time
and first adoption time in one SQLite transaction. Reference, decision ID and
receipt ID are unique. The response is emitted after that transaction commits,
with the stored digest, current nonce, actor and fresh server time. A lost reply
can be retried without changing the decision or restarting retention. A different
decision for the same event is 409. Missing original evidence is also 409;
storage failure is 503. No unresolved record is acknowledged as successful.

`bindIntake` is an internal seam for a future trusted receipt verifier. It binds
an already verified intake receipt to the original event; it is not an HTTP route
or an unverified SDK callback. It never starts a retention timer. No production
intake verifier is connected by this change.

Final reconciliation authenticates the source key independently of user consent.
It works for retained evidence after logout, hold, withdrawal or account deletion.
It grants no points, changes no app balance and cannot reopen event eligibility.
No new issuer scope or SDK receipt field is introduced.

## Retention

The explicit maintenance method considers at most 1,000 records per call. A
record is eligible only at or after:

```text
max(finalized_at, first_durable_adoption) + 90 days
```

Evidence, intake binding and final metadata are removed atomically. The legacy
`decided` column is ignored; its former setter has been removed. Unresolved
intakes remain retained. Failure midway rolls back all deletions. This method
has no public endpoint or scheduler and is not enabled in production. Backups,
Coin compaction and central account retirement remain separate procedures.

## Qualification

Tests cover lost acknowledgment, process restart, independent SQLite writers,
conflicting decisions/receipts, exact event and subject binding, storage failures,
withdrawn/deleted users, in-flight eligibility, and both sides of the retention
boundary. SQLite lock waits are bounded to one second for reconciliation and
maintenance, then the store's previous timeout is restored.

The opt-in interoperability tool uses Coin's actual `AuthenticatedSource` against
a disposable local OnlyIdeas HTTP server. It discards the first successful reply,
retries with a fresh nonce, verifies the canonical digest and confirms one durable
adoption with no app-credit change. It opens no Coin database and calls no
production endpoint. Run from the app checkout:

```sh
node tools/check-reward-final-coin.mjs ../LazyingArtCoin
```

Seven HTTP tests and this interoperability check also pass against the deployed
`source16-1c2c89e89e491a1e` baseline with only the three reconciliation modules
replaced. The full application gate passes 302 tests plus compiled-renderer,
TypeScript and web-build checks. It uses the project's qualified Pandoc 3
installation for document-conversion fixtures. Fourteen final-reconciliation
tests include retry from a fresh Node process reading the same SQLite database.

Remaining live gates are production deployment, the qualified points-consent
adapter, explicit check-in POST/UI, coordinated Coin policy qualification and a
bounded end-to-end canary. Shared balance, reward policies, native packages and
store releases are unchanged.

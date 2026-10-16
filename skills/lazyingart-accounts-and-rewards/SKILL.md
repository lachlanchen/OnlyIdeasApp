---
name: lazyingart-accounts-and-rewards
description: Integrate independent LazyingArt apps with optional shared login, verified account linking and shared earned LAC points. Use for daily or contribution rewards, cross-app balances and zero-balance diagnosis; native subscriptions and cryptocurrency operations remain separate workflows.
---

# LazyingArt accounts and rewards

Preserve each app's local accounts and purchases while adding an optional common
identity and one canonical earned-points balance. Read the app's AGENTS.md,
product contract and current implementation receipt before editing it.

## Establish the actual state

Read [integration boundaries](references/integration.md) for canonical source
locations and the onboarding procedure. Use `$lazyingart-shared-login` for the
profile callback, linking, consent, refresh and revocation implementation.
Consult the Coin-owned current contract and LinkPrivate adapter; a proposal,
accepted callback or successful source test is not a deployed integration.

When someone reports zero credits, check authenticated local identity, ledger,
earning rollout, reserved credits, cached UI and any central mapping separately.
An API outage or missing account link is not a zero balance. A GitHub login named
`lazyingart` is not proof of a shared LazyingArt identity. Never merge accounts by
display name, username or email. Preserve existing balances and history.

## Keep three balances distinct

- **App usage credits:** local welcome grants, imports, refunds and purchases;
  preserve their app and paid-transaction lineage. Enabling rewards must not
  inadvertently enable private-import charges or billing quota enforcement.
- **Shared LAC points:** the exact nonmonetary, whole-integer Coin asset
  `lazyingart.fun-points.v1`; earned, non-transferable, no cash value or spending.
  Every app reads the same canonical snapshot for the verified central subject.
- **On-chain LAC:** a separate asset and workflow. Do not convert credits, reuse
  token contracts, assign a fiat value, promise redemption or award crypto for
  app activity as part of this integration.

Linking does not share subscriptions, content, chat history or tool permissions.
Use a separate app client/audience/exact callback and explicit account-link proof.
Keep existing login and offline reading available when shared services fail.

## Implement rewards from durable events

The Coin policy owns amounts, caps, award decisions and reversals. The app owns
evidence. Use server-observed successful activity, immutable semantic event keys
and a durable outbox. Daily rewards deduplicate by canonical account and UTC day
across apps; paper rewards deduplicate by canonical work across uploaders, files,
versions and retries. A timer, page open, repeated button tap or self-like does
not prove completed reading or a new contribution.

Public sharing requires permission and a license. Visibility may precede review
where the app supports that; reward approval remains independently recorded.
Do not reward private uploads or unreviewed papers as approved public works.
Rejection, withdrawal, duplicate detection and moderation need one compensating
reversal with the original lineage, never deletion of accounting evidence.

Freeze issuer, subject, actor, event and evidence when enqueueing. Retry an
uncertain intake with the same event, within bounded backoff and event lifetime.
Account switching, unlinking or revoked consent holds old work; never replay it
under the current user's identity. Pending means pending, not awarded. Do not
backfill pre-link history automatically or copy local balances into Coin.

## Qualify and report

Test simultaneous claims from different apps/devices, lost responses, restart,
repeated imports of one DOI, corrected publication, account switching, revocation,
deletion, caps and unavailable-versus-zero UI. Verify one canonical balance is
replaced in each app, never summed across app snapshots. Test server evidence
with fixtures before a bounded live round trip.

Coordinate existing owners through private path-only packets: EchoMind owns the
issuer, LinkPrivate the reusable adapter, Coin the points ledger, each app its
callback/UI/evidence. Check current ownership before edits. Return commits, actual
tests, deployed revision and any remaining qualification. State separately what
is implemented, deployed, enabled and available in native builds. Install this
skill for future sessions; the skill itself grants no production authority.

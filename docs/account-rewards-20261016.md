# Account rewards integration · 16 October 2026

## Earning eligibility repair

The early credit rollout allowed one account to earn and spend. Accounts outside
that list could display a genuine zero because they never received the welcome
credit. Earning now has its own `credits.earningEnabled` switch. This enables the
existing 30-credit welcome and approved-publication rewards for active accounts
without changing the private-import spending list, paid quotas or subscription
eligibility. Existing balances and purchase lineage remain unchanged.

The server and PWA repair is deployed. The affected account's welcome grant was
applied through the normal policy once, with an idempotency check. Existing
balances were preserved. No arbitrary adjustment or cross-account transfer was
used. The source native clients understand the separate earning flag; that UI
change is pending the next qualified internal build.

## Optional shared account

The source now includes an app-owned encrypted profile store and disabled-by-
default HTTP integration for the accepted OnlyIdeas client and HTTPS callback.
It uses the existing custom profile protocol, independent native PKCE, one-use
browser-bound attempts, explicit fresh local and central proof for linking, and
unique local-account/central-subject mapping. It never matches by email or name.

Access/refresh credentials and PKCE verifiers are encrypted with an app-specific
AES-GCM key outside the database. Refresh claims persist before network I/O;
unknown rotation requires reconnecting. Sign-out fences late responses and queues
remote revocation durably. Disabling new login preserves revocation capability.
Deletion removes local mappings while retaining only pending revocation work.

PWA, Apple and Android source clients offer the optional connection only when
the backend advertises readiness. Existing provider login remains available.
The issuer has registered the exact client and passed its HTTPS binding checks.
Live callback qualification and native build delivery
are separate from the isolated source tests. Shared login is not yet activated
in the deployed OnlyIdeas service.

## Shared LAC rewards

The new shared recognition asset is separate from OnlyIdeas usage credits and
on-chain LAC. Coin's implemented contract is `app-lac-fun-points-v1`, with asset
`lazyingart.fun-points.v1`. Candidate rewards are 5 for daily activity, 1 for
qualified reading (up to 5/day), and 10 for approved unique public papers (up to
50/day). Daily and work eligibility deduplicate across participating apps.

The Coin and issuer owners are implementing the shared ledger, explicit operation
consent and reusable adapter. No shared points are awarded by this source change.
A qualified evidence source, canonical work registry, finite pilot limits,
retention/reversal behavior and actual app callback remain activation requirements.
Pending events and an unavailable service must never appear as earned points or
as a fabricated zero balance. Purchased credits and subscriptions stay app-local.

## Reusable skill

`skills/lazyingart-accounts-and-rewards` documents diagnosis, account linking,
shared reward evidence, duplicate prevention and qualification. It is installed
for local Codex discovery. The existing shared-login and billing skills retain
their own protocol and payment responsibilities.

## Verification

- 248 Node tests pass, including ordinary-account earning without new charges,
  durable callbacks, browser-origin/binding checks, independent native PKCE,
  account-link collisions, concurrent refresh, late responses, key mismatch and
  revocation retry.
- Compiled renderer checks, TypeScript and production web build pass.
- Real PWA Profile at 390 and 1280 pixels shows the fixture's one-time 30-credit
  welcome and publication rewards; reload does not grant again. Captures are
  internal QA evidence, not updated public store screenshots.
- The earning deployment preserved logical digests of 17 existing data tables;
  only `credits.earningEnabled` changed in runtime configuration. Ingress and
  existing spending/billing configuration were preserved.
- Android Java compile/lint and Mac Catalyst debug compilation pass. No new
  distributed native binary or formal store submission is claimed by this checkpoint.

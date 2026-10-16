# Sources and integration procedure

Resolve repository paths from the workspace root; case-sensitive names are
`EchoMind`, `LazyingArtLinkPrivate`, `LazyingArtCoin`, `OnlyIdeasApp`, `Bunko`,
and `AiMemo`. Read current files and dated owner receipts before relying on the
historical starting points below. No private credential path belongs in a
customer-facing document.

## Canonical sources

| Area | Source |
| --- | --- |
| Account and adapter boundaries | `LazyingArtLinkPrivate/docs/architecture.md` |
| Per-app registration and callback qualification | `LazyingArtLinkPrivate/docs/onboarding.md` |
| Issuer/provider operations | `LazyingArtLinkPrivate/docs/auth/issuer-provider-workflow.md` |
| Points asset and wire | `LazyingArtCoin/docs/integrations/LAC-FUN-POINTS-V1-PROPOSAL.md` and its implemented successor |
| SDK contract readiness | `LazyingArtLinkPrivate/docs/fun-points-proposal-20261015.md` and current validation receipts |
| OnlyIdeas local credits | `OnlyIdeasApp/server/credits.mjs`, `docs/reading-credits.md` |

The 15 October proposal uses contract `app-lac-fun-points-v1`, resource
`lazyingart-fun-points-api`, header `X-Lac-Points-Token` and distinct
`/api/points/v1/intents`, `/reversals`, `/balance` routes. These names are a
discovery aid, not permission to assume they are live. Read the implemented
validator rather than reproducing an old schema from memory. Do not use the old
18-decimal earnings API or an incompatible earlier SDK draft for points.

## App onboarding

1. Inventory local identities, sessions, balances, purchase binding and deletion
   behavior. Record preservation checks without copying private histories.
2. Agree exact client/audience/HTTPS callback with the issuer owner. Stage secrets
   in the existing protected app configuration. Register additively and qualify
   actual browser/native completion before enabling the optional login.
3. Link by fresh local proof plus fresh central `(issuer, subject)` proof with
   explicit consent. Unique constraints reject collisions. Central signup stays
   independent of EchoMind invitation or app subscription access.
4. Qualify separate points consent and exact resource/scope delegation. No app
   borrows another app's client or treats remembered profile consent as rewards
   consent. Keep tokens server-side and refresh in a durable single flight.
5. Define evidence, semantic deduplication, finite policy budgets, retention and
   deletion/reversal behavior jointly with Coin. A policy version change must
   not reset daily or lifetime eligibility.
6. Connect the app outbox and canonical balance read. Validate asset, original
   subject, actor, receipt, revision and freshness. `awarded_points` in the
   proposed contract is already net; do not subtract reversed points again.
7. Test isolated fixtures and the exact app's authorized live path, then enable
   only qualified functionality. Store screenshots and internal native builds
   follow `$lazyingart-app-development`; billing follows its separate skill.

## Starting reward defaults

The 16 October implementation request proposes daily activity +5 once globally
per UTC day, completed reading +1 up to 5/day, and an approved unique public
paper +10 up to 50/day. These are candidate server policies, not client constants
or proof of active awards. Coin must freeze evidence rules, campaign budgets,
per-actor limits and retention before rollout. Follow later owner decisions.

## Presentation

Show local usage credits and shared points as separate labeled values. Use
“Connect LazyingArt”, “Loading”, “Last updated”, “Reconnect” or “Unavailable”
when appropriate. Show zero only from a valid current account-bound snapshot.
Explain pending rewards and rejection without exposing another user's activity.
No wallet or exchange-rate UI is needed for nonmonetary points.

Store policies should be rechecked for an actual release: Apple App Review
Guidelines 3.1.1/3.1.5 and Google Play Payments policy and its earned-points FAQ.
Do not claim store approval of shared points merely because the app's earlier
version passed review.

# OnlyIdeas reading credits

These are non-transferable database usage credits, not LAC cryptocurrency. They
have no cash value and do not expire. Accounting is per OnlyIdeas account; no
cross-product balance or automatic linking of separate provider accounts exists.

## First slice: accounting

| Action | Credits |
| --- | ---: |
| Welcome, once per provider identity | +30 |
| Approved, successfully published unique paper | +10 |
| Public contribution rewards per UTC day | Up to +50 |
| Private PDF import | −1 per page |
| Other private file / Markdown import | −1 per file |
| Shared imports, reading, chat, shared translations | 0 |

Existing service quotas still bound conversion and agent usage. Shared papers are
not public until rights and community review succeeds. Rejected papers earn
nothing; there is no surprise private-import charge. Repeated unsuitable sharing
requests are subject to the existing account moderation tools.

`credits.enabled: true` opts a server into this policy. Leave it absent/false
until client cost disclosures are qualified. Old queued jobs continue under their
original terms. A client must send `creditLimit` (JSON) or `X-Credit-Limit` (file)
for a new private import; omission fails with HTTP428 before creating a job.
Private URL imports reserve up to `maxPages` (30 by default), then settle the
actual PDF page count. Uploaded PDFs are inspected before reserving the exact
cost. Other files reserve one credit. HTTP402 means insufficient available
credits. `GET /api/credits` returns only the current account's balance, held
credits, policy and last 40 entries. No public mutation or operator mint route is
introduced by this slice.

The append-only ledger and hold state changes use one SQLite write transaction
with job creation/completion. API retries return the existing job. Failed work
refunds once; a user-triggered retry requires renewed consent and a new hold.
Worker completion is fenced by the saved lease. Successful converted files are
reused if a process stops before job completion, avoiding another conversion.

Rewards require an eligible new import, approved publication and a durable
publication receipt. Canonical arXiv/DOI/source aliases, normalized converted text
and available source-file hashes suppress duplicate rewards globally. Human
review still determines whether changed source/text is genuinely new research.
All currently public papers are registered as the unrewarded baseline when the
feature first starts. Publications above the daily reward ceiling are recorded
as zero-credit contributions and cannot later retry to claim another award.

Account deletion removes its ledger, holds and import-candidate records. Only
hashed identity and contribution aliases remain for duplicate/abuse prevention;
they contain no document text, filenames or URLs. A deleted/recreated provider
identity receives no second welcome grant. Suspended accounts cannot use credits.

## Second slice: client controls

Web, SwiftUI and Android Views show available/held credits and history in Profile.
Sharing options sit above the agent conversation or in the native toolbar, with
Shared selected initially. The options sheet explains publication review and file
processing; repeated instructions no longer fill each result card. Private file,
URL, Markdown and retry actions confirm their maximum cost before sending it.
The web requests control also sits above the conversation instead of overlapping
the composer. New controls and explanations are translated into all 11 languages.

Verified: 35 server/localization tests, renderer checks and web production build;
Android debug compile and lint; iOS Release device compile with signing disabled;
28 web language/theme/width cases, including cancellation, one-credit text import,
duplicate upload and free shared import. Native purchase/device qualification is
still part of the subsequent release gate, not implied by these compile checks.

## Subsequent release

Monthly plans target roughly CNY20/100/200. The implementation below is staged;
store setup and purchase qualification must finish before activation.

## Evidence

`tests/credits.test.mjs` checks restart persistence, rollback, consent, refunds,
retry idempotency, independent-process overspend races, cross-account rewards,
legacy content, reward caps, deletion/re-registration, API isolation and shared
attachment conversion. Full `npm run check` remains a publishing gate.

## Native monthly plans (staged, purchases disabled)

| Plan | Target USD/month | Credits per paid period | Agent messages/day |
| --- | ---: | ---: | ---: |
| Reader | 2.99 | 200 | 40 |
| Researcher | 14.99 | 1,200 | 80 |
| Studio | 29.99 | 2,600 | 160 |

The native store supplies the actual localized monthly price. Plans provide the
ongoing agent allowance as well as credits; ordinary reading stays free. Existing
file/page/job limits and aggregate service capacity still apply. Credits carry
over after cancellation or expiry. A verified full refund reverses its grant once
and can leave a negative balance; this blocks new private imports, not reading.
A partial refund preserves the grant. Subscription upgrades are managed by the
original store, with each verified paid transaction credited once.

SwiftUI uses StoreKit 2 and Android uses Play Billing. Both bind purchases to an
opaque UUID created for the signed-in OnlyIdeas account, display store prices,
restore purchases and link to subscription management. Neither sends an amount
to mint. Apple transactions finish only after server delivery; Play acknowledgement
happens on the server after the credit ledger commits. Pending payment is not a
purchase. Account deletion does not cancel a store subscription, and both apps
say so before deletion.

### Server configuration and operations

Keep credentials outside Git in owner-only files. `billing.enabled` and
`credits.enabled` both default to false. Providers also require their own configured
verification credentials before the catalog exposes that provider. An optional
`credits.accounts` array restricts a rollout to those account IDs; an empty array
allows nobody. Omit it only for a qualified general rollout. This permits native
QA without changing costs for installed older clients.

- Apple: `billing.apple.keyFile`, `keyId`, `issuerId` for a dedicated In-App Purchase
  server key. Signed transactions use Apple's official verification library and
  public root certificates, online chain checks, exact app/bundle/environment,
  followed by a fresh server transaction lookup.
- Google: `billing.google.keyFile` for an OnlyIdeas-specific service account with
  app-scoped purchase/order permissions. SubscriptionV2 and Orders responses must
  agree on purchase token, product and account binding. No provider tokens reach
  app clients.
- Sandbox requires both `billing.allowSandbox: true` and an explicit
  `billing.sandboxAccounts` allowlist. Do not let free test renewals fund ordinary
  users' paid processing.
- Apple V2 notification URL: `/api/billing/notifications/apple` (signed payload).
  Turn off Streamlined Purchasing before sales: every new purchase must start
  inside the signed-in app so it has an account binding.
- Google authenticated Pub/Sub push URL: `/api/billing/notifications/google`;
  configure exact `billing.google.pushAudience` and `pushServiceAccount`. Verify
  the Google OIDC token and email before reading a notification.
- `GET /api/billing` exposes the public plan catalog. Account binding requires
  an eligible authenticated account; subscription status is private to the signed-in
  account. `POST /api/billing/apple` accepts only `signedTransaction` as purchase
  evidence; Google accepts `purchaseToken`. All other claimed amounts/owners are
  ignored. Account-bound proof is required for delivery and restore.

Provider tokens and Apple history cursors remain in the private app database.
Reconciliation wakes each minute, claims up to 20 due sources with a durable
15-minute lease, retries failures with bounded backoff, and checkpoints successful
history pages. Apple history catches missed renewals and older refund changes;
signed current subscription status preserves verified grace periods. Play checks
current and retained renewal orders against the verified token; known renewal
suffixes are merely lookup candidates and never proof. Expired token responses
can fall back to verified Orders records using the saved account binding. Up to
100 historical order references are retained per Play source. Operator follow-up
is needed for older history or provider records that are no longer available.
Monitor `billing_sources.failures`; provider exception text is deliberately not
logged because it can contain purchase credentials. Back up the existing database
before deployment. Deletion purges reconciliation credentials while retaining
only de-identified receipt ownership needed to prevent repeated grants.

### Qualification still required before activation

The ledger, wrong-owner/forged HTTP input, replay, refund, independent-process race,
restart/acknowledgement failure, sandbox and staged-rollout tests pass. Android
compile/lint and iOS device Release compile pass. This is not a real purchase test.
Store configuration, actual sandbox purchase/renewal/refund/restoration, device UI
checks, purchase-history privacy declarations, and successor store builds remain
release gates. Build 10's existing review has not been replaced by this work.

## Build 20: approved page quotas and web billing

The owner approved US$2.99 / 14.99 / 29.99 monthly with 200 / 1,200 / 2,600 new
transcription pages and an eligible seven-day trial. See the [build 20 contract](release-candidate-20.md)
for fetch allowances and trial limits. Existing reading/cache reuse is free.
`billing.quotasEnabled` separately gates receipt-period quota enforcement and
respects the existing credits rollout allowlist and exact owner exemption.

Stripe PWA configuration uses protected `billing.stripe.keyFile`,
`webhookSecretFile`, the three fixed `prices`, and a dedicated
`portalConfiguration`. The existing account-wide/EchoMind Stripe products and
portal are not changed. Portal subscription updates are disabled; cancellation
is at period end. Web checkout is never offered inside native store apps.
The OnlyIdeas webhook route is `POST /api/billing/notifications/stripe`.
Keep it disabled at Stripe until the matching server config and sandbox
qualification are ready. Never use a live card charge as a substitute for testing.

## Build 21 billing setup status

Profile → Plans & usage is visible on all four clients. Apple products are now
READY_TO_SUBMIT; Google base plans and seven-day trial offers are ACTIVE. General
checkout is still disabled. Real Stripe sandbox and Android Play test purchases,
restores, paid cycles, cancellation and refund reconciliation now pass. Actual
Apple StoreKit qualification remains pending. Stripe fixes are not cloud deployed;
Play download listing availability remains unresolved despite verified enrollment.
See [the current receipt](release-candidate-21.md).

### Cancellation controls

Customer controls offer Manage subscription / Cancel subscription and Restore
purchases. There is no in-app refund request button on PWA, iOS, Mac or Android.
Cancellation stops future renewal and keeps the paid period available; it does not
issue an automatic prorated refund. Keep support, terms and provider remedies
available. Provider-approved refunds, disputes and revocations must still update
credits and entitlements, and actual reversals remain visible in credit history.

Provider references checked on 2026-09-28: [Google cancellation](https://support.google.com/googleplay/answer/7018481),
[Apple refund requests](https://support.apple.com/en-us/118223), and
[Stripe customer portal](https://support.stripe.com/questions/billing-customer-portal).
The ordinary cancellation UI and backend refund reconciliation are separate
operations. Sandbox refund tests are qualification evidence, not a customer feature.

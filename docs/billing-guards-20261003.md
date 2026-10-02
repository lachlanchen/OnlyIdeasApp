# Purchase eligibility and account continuity · 3 October 2026

Adopts the applicable EchoMind cross-app handoff in `dc36eaa6` against
OnlyIdeas source `5571c55`. This checkpoint is source qualification only.
The owner subsequently requested completion of subscriptions and separately
authorized optional Bunko cloud subscriptions; that work remains in progress.

## Changes

- Extract `hasBlockingPurchase` from displayed plan calculation. Existing active,
  grace, pending and paused records block another purchase independently of
  verification age or available display-period rows. Provider-canceled periods
  remain normalized as active until paid-through expiry.
- Expose affirmative `newPurchaseEnabled`. Missing capability disables new
  client purchases. Optional `billing.salesEnabled=false` closes new sales while
  configured verification, restore and management remain usable. Legacy
  `canSubscribe` in the catalog respects the same sales gate.
- Expire a saved open Stripe Checkout when a native purchase becomes known.
  Recheck after provider creation as well as before returning a saved URL.
- Add an additive private checkout `request` column. A lost creation response
  retains its exact parameters and idempotency key, including original trial
  settings, so a retry can recover and expire the same provider session.
  Failed expiry stays retryable; known blocked requests create no new operation.
- Android checks permission inside the billing controller and refreshes server
  authorization before opening Play. Session/account and request-generation
  checks discard stale results; delivery carries the captured bearer identity.
- StoreKit refreshes server authorization before purchase and checks session
  continuity after suspension points, including an empty restore result.
- PWA account remounts discard late checkout/restore results. Polling does not
  replace an in-progress restore; missing purchase capability leaves Restore
  available while preventing new Checkout.

## Tests actually run

- `ONLYIDEAS_TEST_PANDOC=/home/lachlan/.local/share/pandoc/3.11/bin/pandoc npm run check`:
  **147 tests passed**, renderer checks, TypeScript and Vite/native reader build.
- Targeted billing/Stripe tests: **52 passed**, including 24 combinations of
  provider/environment/blocking state, unknown outcomes and expiry recovery.
- Two real React/jsdom tests: old-account Checkout cannot navigate after remount;
  old-account Restore cannot replace the new account catalog.
- Android `:app:compileDebugJavaWithJavac`: passed.
- Isolated KVM Mac Catalyst `xcodebuild ... CODE_SIGNING_ALLOWED=NO build`:
  passed. Existing installed apps and shared source were not replaced.

Native compilation is not a StoreKit/Play payment or UI interaction receipt.
The source changes are absent from previously uploaded/released binaries.
No backend, public web deployment, store product, review or runtime billing flag
was changed by this checkpoint.

## Remaining qualification

- Actual Apple purchase, restore, renewal, cancellation and notification/ledger
  qualification using OnlyIdeas products; authentic purchase screenshots and
  first-subscription submission with the qualified successor app.
- Deploy/test the staged Stripe adapter and app-specific provider configuration
  before general web sales; current runtime differs from source.
- Stripe upgrades/discounts/non-cash paid-credit lineage remain unqualified.
  The portal's plan changes stay disabled. EchoMind net-price upgrade evidence
  does not qualify OnlyIdeas pricing or provider objects.
- Independent stores can still confirm concurrently; these safeguards do not
  create a global transaction across payment providers.
- Run new native account-switch/empty-history behavior through actual store
  sandbox clients before distributing the successor binaries.

Private logs: `.runtime/billing-guards-20261003/`. No purchase credentials belong
in source, fixtures, public receipts or coordination messages.

# Stripe monthly-payment qualification · 3 October 2026

OnlyIdeas currently sells full-price monthly plans. The verifier now checks the
subscription line, invoice subtotal/total, actual captured charge, customer,
invoice linkage, currency and payment state before granting a period. Discounts,
credit-balance funding, extra invoice lines and prorated upgrades require a
separately qualified contract; they cannot silently earn a full-price allowance.
The portal continues to disable plan changes. Future cross-app discounts remain
an undecided design note in `shared-subscription-options.md`.

A partial refund or post-payment credit note takes the payment below this
contract and revokes its grant once. Public reading and previously cached papers
remain available. An invoice merely marked paid, without the bound captured
charge, does not authorize credits.

## Evidence actually obtained

- `npm run check` passed **160 tests**, renderer checks and the web/native reader
  build; Pandoc 3.11 was selected explicitly for the test run.
- Twelve negative payment-contract cases passed: discounted/credit-funded
  invoices, missing or unrelated charges, wrong customer, unsettled or uncaptured
  payments, insufficient cash, changed line amount, wrong subscription, truncated
  lines and unexpected extra lines.
- Real **Stripe test-mode Test Clock**: seven-day trial grants zero paid credits;
  automatic transition to a paid Reader period grants 200 once; advancing the
  clock to the next monthly boundary produces another paid invoice and 200 more.
- Replaying a verified invoice grants zero additional credits. A one-cent test
  refund revokes the corresponding full-price grant; replaying that refund adds
  no duplicate reversal. Period-end cancellation was configured successfully.
- Synthetic test clock/customer/subscriptions were removed after qualification.
  No live-mode payment, real-card charge or production user account was used.

This run exercises real Stripe invoices/charges through the current server
verifier and local ledger. It does not test a new hosted Checkout UI, native
StoreKit, Play, delivery of real webhook events to production, or expiration
following the configured cancellation. Test Clock timestamps advance ahead of
wall time; these assertions concern provider payment lineage and ledger grants,
not the current-time quota display. Earlier hosted Checkout/webhook/Play evidence
is recorded separately in the plans release receipts.

Private test store and curated results: `.runtime/billing-cash-20261003/`.
Broader sales remain subject to app-specific provider configuration and release
qualification. This source checkpoint alone is not a production activation.

# Daily credit resets

OnlyIdeas grants 100 free usage credits on the first authenticated use each UTC
day. New grants share the current reset boundary: by default, Monday at 00:00
UTC. Unused daily credits from that week expire together. There is no missed-day
backfill. A grant on Sunday does not last another seven days.

## Administration

Open Profile → Administration → Daily credit settings on the website. The same
designated administrators who review publications can save this setting.
Choose **7** for weekly resets or **1** for daily UTC-midnight resets; the accepted
range is 1–365 days. Periods use a fixed Monday UTC anchor. The saved policy is
read from the database for every new grant, so changes need no app rebuild or
service restart. Existing grant expiry dates stay fixed.

`GET /api/admin/credits/reset` returns days, revision, nextAt and timezone.
`PUT` takes `{days, revision}`; stale revisions return 409. Anonymous, ordinary
and suspended accounts cannot edit the setting. Changes have a durable audit
entry. This endpoint does not enable earning, spending, purchases or shared LAC.

## Accounting

- Grants issued before this policy keep their previous terms. Welcome credits,
  publication rewards and purchased credits are not reset.
- Each new daily grant has an immutable expiry and remaining amount. Imports
  reserve daily credits with the earliest expiry before other credits.
- Reserved credits stay assigned while a job finishes. An unused reservation
  returns to its original grant; an already-expired return expires immediately.
- Expiry appends a negative ledger entry once. It does not delete history.
  Balance reads and new reservations reconcile overdue grants transactionally,
  including after downtime. There is no scheduler or midnight race dependency.
- Account deletion clears its lots and allocations while preserving the existing
  hashed grant-deduplication rules. Shared points and paid lineage are unchanged.

The balance API adds `daily.resetDays`, `daily.resetsAt`, `expiring` and per-grant
`expiresAt`. Existing installed clients continue to receive the enforced balance
and readable expiry history without rebuilding. The website displays the period
and nearest expiry. Existing native binaries may retain older explanatory copy;
the policy and spendable balance are enforced by the server.

## Qualification

The 1 November 2026 deployment passed all 387 source tests, renderer checks and
the production build. Focused tests cover the UTC week boundary, daily mode, unused and spent lots,
paid/legacy preservation, hold completion and refunds across expiry, independent
processes, rollback, deletion, admin authorization, CSRF and stale revisions.
The staged production backend passed 33 credit tests. Twelve browser checks
passed at 320, 390 and 1280 pixels, including settings save/reload and Chinese
copy. Live authenticated web/native balance checks confirmed the 100-credit
grant, weekly expiry and same-day deduplication; synthetic records were removed.
Public HTTPS checks verified the deployed website, terms, health and anonymous
admin denial. The existing database tables, service configuration, ingress and
public native-release feeds were preserved. No new native binary was required.
The older native-copy limitation above remains; no new device or store-billing
qualification is implied by these server checks.

# OnlyIdeas 1.0.1 · builds 11–12

Prepared 28 September 2026. These builds extend build 10 with database reading
credits, monthly subscription foundations and clearer import controls.

## Completed behavior

- Non-transferable reading credits: 30 welcome credits, private PDF imports at
  one credit per page, other private files at one credit. Confirm the maximum
  cost first; refund failed imports and unused reservations. Credits never expire.
- New imports default to Shared. Approved, successfully published contributions
  earn 10 credits once per unique paper, up to 50 per UTC day. Existing papers
  are preserved without retrospective charges or rewards.
- Sharing controls sit in the library/agent toolbar, with details in a sheet.
  Profile shows the balance and history. All eleven languages are included.
- Verified native monthly plans are prepared at USD 2.99 / 14.99 / 29.99 with
  200 / 1,200 / 2,600 credits and ongoing agent allowances. Native stores supply
  localized prices. Receipt verification, account binding, restoration, renewal
  reconciliation and refund handling are implemented behind rollout controls.
- Build 12 refreshes the library and balance when request status changes to
  complete or failed, refreshes Android credits after verified purchases,
  removes a duplicate unavailable message and displays the actual build number.

## Evidence

- All 50 automated checks passed, including concurrent reservations, failed
  imports, publication deduplication, forged receipts, account isolation,
  renewals, refunds, deletion and reconciliation retries. Renderer and web builds
  passed; signed Android release lint/build and iOS archive/export passed.
- A real Android agent import of the five-page DistilBERT paper (arXiv
  1910.01108) reserved 30 credits, settled at five and refunded 25. Cancellation
  created no hold. A separate import rejected by the daily provider allowance
  refunded its full reservation. No conversion-budget increase was needed.
- The real converted paper remains in the private library. It renders in the
  native Android reader and opens from cache with Wi-Fi and mobile data disabled.
  The in-place upgrade preserved the account, library and credit balance.
- Google authenticated billing notifications reached the deployed endpoint with
  HTTP 200. Apple notification URLs are saved; successful delivery is pending.

## Release limits

Credit charging and billing are enabled only for the operator's QA account.
Other readers retain their previous behavior. The three store plans are drafts;
actual sandbox purchase, restoration, renewal and refund tests remain pending.
Apple also requires an approved binary containing the new PurchaseIntent API
before its Streamlined Purchasing setting can be disabled.

Build 11 is available in existing internal TestFlight and Google Play testing.
Build 12 is being uploaded. Public review remains on build 10; these records do
not claim build 12 public submission, approval, or general paid activation.

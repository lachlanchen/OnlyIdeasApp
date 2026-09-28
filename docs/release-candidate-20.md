# OnlyIdeas 1.0.2 (20)

## Reader and native platforms

Original, Translation and Interlaced are peer modes in the main reader on web,
iOS, Android and Mac Catalyst. Whole-paper rendering preserves equation numbering,
figures and links. Canonical source ranges pair paragraphs with cached translation
pieces; discussion buttons retain the original quote and paragraph ID. Interlaced
mode displays figures and standalone equations once. Partial translations clearly
retain the original for missing pieces. Switching modes never requests model work.

Translation views are cached with the paper revision and visibility. The public
reader only assembles public pieces; private caches remain scoped to the account.
Existing custom interests are preserved. Only the previous exact default is
migrated to include Professor Shaohua Ma’s organoid research alongside imaging,
event cameras, biomedical imaging and optics.

The native SwiftUI Mac Catalyst build includes Apple silicon and Intel. Apple
Watch remains the free offline public-excerpt companion, with full illustrated
reading on iPhone and Mac. All 11 UI languages remain available.

## Approved subscriptions, staged

| Plan | USD/month target | New transcription pages/month | New-paper fetches/month |
| --- | ---: | ---: | ---: |
| Reader | 2.99 | 200 | 60 |
| Researcher | 14.99 | 1,200 | 300 |
| Studio | 29.99 | 2,600 | 700 |

Eligible trial: seven days, 50 transcription pages and 10 fetches. Existing papers
and cached translations stay free. Private-import credits are separate and shown
before confirmation. Actual native prices come from the store. Monthly page/fetch
reservations are atomic, receipt-bound and retry-safe; failed work releases quota,
while uncertain provider submissions remain reserved until reconciled.

PWA billing uses a dedicated OnlyIdeas Stripe catalog and customer portal, fixed
server prices/account bindings, signed raw-body webhooks and authoritative invoice
verification. Native billing uses StoreKit and Play Billing. Refunds, account
deletion, restoration and replay are covered by server tests. Trial quota cannot
be granted again through a different provider on the same account.

Apple seven-day introductory offers are configured in 175 territories. The three
Google seven-day offers are saved as drafts. Stripe live prices and its dedicated
portal/webhook are prepared; the webhook is disabled until qualification. General
purchases and monthly quota enforcement are not activated. Actual sandbox
purchase, restoration, renewal and refund checks remain required by BRIEF.md;
unit tests and store configuration are not substitutes for those checks.

## Verification

101 server/localization tests, document renderer checks and production web build
pass. The real public physics paper reuses 324 translated pieces across 33 rendered
pairs, preserving three figures and fitting a 347-pixel reading area without page
horizontal scrolling. A browser test caught and fixed an early mode-selection race.
The integrated iOS reader XCTest passes. Android signed build and release lint pass;
background inbox, taxonomy and social refresh failures no longer stack offline
network dialogs. Physical Mac and final Android offline evidence is recorded with
the release receipt after completion.

The cloud update was checked against a SQLite backup before promotion. Two separate
readers reused the real physics transcript with Mathpix disabled. Cached Chinese
reading created no jobs. Existing paper records, credit ledger and credit holds
were verified unchanged; shared ingress and the worker service were preserved.

## Release status

Both iOS/Watch and universal Mac build 20 are VALID and available to the existing
internal TestFlight group. Google internal and formal production review receipts
are recorded below when confirmed. Store approval is separate from submission.

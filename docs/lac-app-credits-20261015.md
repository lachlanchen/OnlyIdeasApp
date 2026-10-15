# LAC app credits and optional shared fun points

## Current app change

The owner recalled45 credits. A read-only production ledger/config probe confirmed
the existing owner balance is45, held0, and that account is in the current credit
rollout. No ledger, allowance or rollout configuration was changed.

The native Profile credit view previously attached its initial loading task to a
conditionally empty Group. It could disappear before loading. The section now
exists immediately, with Loading, Retry, exact balance/history and disabled-policy
states. A transient failure preserves an already loaded value as last known.
Web/Android expose the same states. Account changes retain the existing identity
guards; the web component remounts per account.

The visible name is **LAC · LazyingArt Coins**, with **OnlyIdeas balance** and
**Non-transferable app credits. No cash value.** Existing welcome/publication,
private-import, reservation/refund and verified-purchase entries remain unchanged.
This display name creates neither a cryptocurrency nor a shared account balance.

## Material cross-app owner responses

Coin proposal `f37b14e15d21d49147ee21255699161d9dd10d2d`, published at
`8ffbb403a7ba6a3199106917a6a573c672a720db`, specifies a separate asset:
`lazyingart.fun-points.v1`, whole integers, non-transferable, non-purchasable,
non-redeemable, no cash value, no spending or chain operations. Its new store,
routes and policies are **proposed, not implemented or live**.

EchoMind checked its actual central registry on15 October: neither
`onlyideas-server` nor `bunko-server` is registered. Current discovery advertises
password/Google/Apple/GitHub, but this does not qualify an app callback or account
link. OnlyIdeas' existing disabled source preparation is still separate from the
live local account/session and subscription ownership.

OnlyIdeas accepts the architectural separation. A future shared panel must read
one canonical balance for an explicitly linked immutable central subject. It
must not add copied app views, migrate the current mixed local ledger or redirect
an old earning event after account switching. No email matching, wallet linking,
shared purchases, prices or subscription grants are implied.

Reading/publication rewards require durable app-owned evidence, semantic event
deduplication, original-subject authorization, finite daily/lifetime caps,
idempotent intake/reversal and deletion rules. A client timer alone does not prove
reading. Reward amounts remain unset; this candidate awards no new reading points.
Exact app linking and the distinct Coin contract must be qualified before launch.

## Store-policy design check

Checked15 October2026. Google allows earned/awarded points without Play Billing,
but selling virtual points requires the applicable billing system. Purchased
virtual currency is restricted to the app/title where purchased. This is a reason
to keep purchased OnlyIdeas credits local and future shared fun points earned-only.
[Google points guidance](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en),
[Google Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en).

Apple requires applicable in-app purchase for digital paid features and prohibits
cryptocurrency apps from awarding currency for completing tasks. This design uses
ordinary database app credits and proposes separate recognition-only fun points,
with no token conversion or cash-out. Store approval of future features is not
inferred from this review.
[Apple App Review Guidelines3.1.1/3.1.5](https://developer.apple.com/app-store/review/guidelines/).

Private coordination receipts are in the owner's OneTimeSync/OnlyIdeasApp packet.
No credentials, full ledger or personal history is included in this source note.

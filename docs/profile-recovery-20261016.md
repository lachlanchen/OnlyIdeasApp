# Profile recovery and product copy · 16 October 2026

## Source changes

The optional shared-account panel now offers Retry after a failed status request,
refreshes after returning to the app or reconnecting, and distinguishes an active
refresh lease from a disconnected account. Reconnection starts only after an
explicit button press. Returning from the authorization browser releases the
button; late responses cannot update another mounted account or sign it out.

The local credit panel refreshes on resume and reconnection. A failed refresh
preserves the last known balance and labels it as such until a new response
arrives. It never substitutes zero for an unavailable balance.

Browser verification also reproduced duplicate Profile panels: the subscription,
credit and shared-account sections had the same sibling React key. Each now has
a distinct key that includes the account ID. The full Profile regression test
covers repeated resume events and switching accounts.

The English Google listing and support copy now describe finding papers, opening
existing transcripts, reflow, translations, saved conversations and sharing
choices. The sharing paragraphs in Community Terms match the established
permission-confirmation and subsequent administrator-review flow. Credit,
subscription, refund and other terms are unchanged.

## Verification

- Full check: 267 Node tests passed, followed by renderer checks, TypeScript and
  the web/native-reader asset build.
- `tests/shared-account-ui.test.mjs`: failed-load retry, refresh state,
  cancellation/return, explicit reconnect, stale reads and late disconnects.
- `tests/credits-ui.test.mjs`: visible balance, account isolation, offline
  labeling and recovery.
- `tests/profile-recovery-ui.test.mjs`: actual application Profile rendering,
  one section of each kind after refreshes, and account switching.
- Local browser checks at 390 and 1280 pixels: Retry, refresh lease, reconnect,
  connected state, prior balance during an outage and successful recovery;
  no horizontal overflow or duplicated panels.

Browser evidence uses a disposable local preview account and mocked shared-login
capability/status. It does not qualify a central callback or grant points.
The new account strings cover all 11 interface languages. English store copy is
a staged draft; other store locales retain their previously qualified copy.

## Delivery boundaries and remaining work

This is an accumulated source/copy update. No runtime deployment, store metadata
upload, native binary upload, billing change or review replacement accompanies it.
The existing production service and releases remain the delivery baseline.

Optional shared login and canonical earned points remain disabled. They require
the approved disposable-identity callback, exact client qualification and explicit
points consent. App-local credits and purchases are preserved; connecting an
identity does not copy or combine them.

The staged Swift and Android account panels still use a boolean connection
representation. Before enabling them, preserve unavailable/refreshing/reconnect
states independently. In Android, a shared-status failure must also be separated
from library loading. These are native activation gaps, not a claim that the
new PWA recovery behavior has shipped on native platforms.

The Coin final-decision dispatcher, durable decision adoption and retention gate
are a separate pending integration slice. A source fixture or successful local
ledger test does not establish live daily or cross-app rewards.

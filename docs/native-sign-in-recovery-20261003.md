# Native sign-in recovery · 3 October 2026

Observed on TestFlight Mac25: GitHub completed consent and the server displayed
Welcome back; opening OnlyIdeas left the app on Signing in. Inspection found
that Mac Catalyst's scene URL handler discarded incoming URLs. This identifies
one missing return path; it does not prove that every stalled session had that
same cause.

The successor now routes scene callbacks into the native store. A small recovery
controller binds the complete URL to the current PKCE flow, suppresses concurrent
redemptions and checks the same flow every five seconds for at most ten minutes.
Only the server can issue a session after successful consent. No provider login,
verification or consent is bypassed. Cancellation and superseded attempts cannot
replace a later account. Expiry exits the progress state with a retry message.
Profile exposes Cancel during GitHub sign-in. The sign-in sheet scrolls and wraps
long localized copy instead of clipping Privacy on small Mac windows.

Validation actually completed:

- Standalone Swift behavior checks on the KVM Mac: exact callback binding,
  wrong/ambiguous flow rejection, duplicate callback suppression, pending/lost
  return recovery, cancellation, expiry and transient network retry.
- Universal arm64/x86_64 Mac Catalyst Debug compile, signing disabled: passed.
- Full project check: 160 tests, renderer checks, TypeScript and production build.

These are source/compile checks. No fresh real native OAuth or StoreKit payment
is claimed, and these changes are absent from the already uploaded build25.
The owner's shared Mac desktop was not controlled. Qualify the successor native
binary before production promotion; keep the submitted Google build25 review.

Apple contracts: [ASWebAuthenticationSession](https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession)
and [scene URL delivery](https://developer.apple.com/documentation/uikit/uiscenedelegate/scene(_:openurlcontexts:)).

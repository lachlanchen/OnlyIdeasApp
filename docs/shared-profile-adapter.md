# Optional LazyingArt account connection

OnlyIdeas uses its own confidential client, audience and callback. Existing
Apple and GitHub accounts, papers, chats and purchases keep their local owners.
The connection does not merge accounts by email, username or display name.

| Field | Accepted value |
| --- | --- |
| Issuer | `https://chat.lazying.art` |
| Client | `onlyideas-server` |
| Audience | `onlyideas-service` |
| Callback | `https://agent.onlyideas.art/api/auth/lazyingart/callback` |
| Profile scope | `profile` |
| Flow | Authorization code, S256, `client_secret_post` |

This is the custom LazyingArt account protocol. Profile login and separate earned
points consent have distinct token families; neither grants billing access.

## App implementation

`server/lazyingart-profile.mjs` validates pinned discovery, exact schemas,
issuer/client/audience/subject and bounded HTTPS responses. It rejects duplicate
JSON keys, callback parameters, redirects and replay. `server/lazyingart-store.mjs`
provides encrypted durable attempts, unique account mappings, serialized refresh
and revocation retry. `server/app.mjs` supplies the optional routes.

Existing-account linking requires an active, recently authenticated local
session and fresh central authentication. A newly signed-in central identity
creates a separate local account unless it already has an explicit mapping.
Conflicting mappings fail without moving data or balances.

New credentials are encrypted in a pending cleanup record before introspection.
A successful mapping or refresh removes that record in the same transaction that
accepts the credentials. Failed or interrupted completion retains revocation
work. A bounded cleanup delay prevents a worker from racing a live callback.
Unknown refresh outcomes require reconnecting; old refresh tokens are not retried.

Central-origin app sessions revalidate writes and permit at most 30 seconds of
cached read authorization. Local sign-out and account deletion work during issuer
outages. The native app's independent PKCE challenge is still required before its
opaque app session can be redeemed; issuer tokens never reach the client.

PWA, iOS/macOS and Android source show the optional login and account connection
only when the backend advertises readiness. Other providers remain available.

## Current qualification boundary · 16 October 2026

The issuer has registered the accepted binding and reported actual HTTPS binding
checks. The app's protocol, durable store, browser and native-flow fixtures pass;
Android compile/lint and Mac Catalyst compilation pass. The deployed credit
repair does not enable this account connection. Actual issuer callback and new
native binary qualification are still required before activation.

Run the profile suites with:

```sh
node --test tests/lazyingart-profile.test.mjs tests/lazyingart-store.test.mjs
```

Shared daily/reading/publication rewards use the separate Coin-owned points
contract. See [account rewards](account-rewards-20261016.md) and the reusable
`lazyingart-accounts-and-rewards` skill for the current source/rollout boundary.

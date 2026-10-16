# Optional account linking and read-only shared points

## Status and binding

The app-owned read consumer and web UI are staged and disabled. Current server
rollout, local accounts, papers, chats, purchased credits, subscriptions and store
releases are unchanged. The existing local balance remains separate from shared
LAC. No balances are converted and no reward policy is activated.

| Field | Exact value |
| --- | --- |
| Issuer | `https://chat.lazying.art` |
| Client | `onlyideas-server` |
| Audience | `onlyideas-service` |
| Callback | `https://agent.onlyideas.art/api/auth/lazyingart/callback` |

The existing profile adapter uses explicit fresh local and central proof for
linking, immutable subject mapping, encrypted credentials, durable revocation and
refresh leases. This update adds an internal connection-generation read so the
points consumer can reject stale account or link responses. It does not introduce
another identity service or merge accounts by email.

## Read contract and UI

`server/lac-balance.mjs` consumes a separately qualified SDK provider with exact
`lac.points.balance.read` consent. `server/app.mjs` exposes authenticated
`GET /api/lac/balance` and advertises `capabilities.lacPoints` only when the provider,
profile adapter and app feature are all enabled. No production provider is wired
yet, so a configuration flag alone cannot expose the capability.

The consumer validates the exact Coin contract, asset, original subject,
integer-string amounts, freshness and monotonic revisions. An identical revision
must retain the same ledger values. Reads are fenced against unlink and account
changes, and the local session is rechecked before sending a result. The canonical
awarded amount is already net; app balances are never summed or subtracted from
it. No intent, reversal, transfer or grant route is used.

`src/SharedPoints.tsx` appears separately in Profile when qualified. It supports
all eleven interface languages, explicit unavailable/consent/link states and
refresh on resume, reconnect and connection changes. A failed read never becomes
zero. An old account's delayed response cannot replace the current account's
display. Disconnecting clears the visible shared balance through a refresh.

## Evidence and dependencies

The full 281-test server/UI suite, document-renderer checks, TypeScript and web
build pass. Tests include actual local HTTP routing, absent SDK capability,
separate consent, verified zero, integer precision, revision races, unlink during
a request and preservation of local purchased credits. Browser fixture evidence
covers 390 and 1280 pixel widths and unavailable-versus-zero presentation.

These are synthetic local tests. Live app callback/native completion, the
maintained SDK bridge, app-specific points consent and actual Coin resource
qualification remain required. Work in another owner's uncommitted SDK checkout
is not a qualified dependency. Native Swift/Android points UI and device evidence
remain pending; no native package was built, submitted or released in this slice.
The protected SDK Fernet storage key must not be used as the staged Node profile
adapter's AES key. Existing login and local credit display stay available.

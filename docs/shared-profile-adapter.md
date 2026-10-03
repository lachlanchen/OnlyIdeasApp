# Optional LazyingArt profile adapter · 3 October 2026

**Disabled source preparation. No shared-login button or live callback yet.**

The owner wants independent apps with optional shared LazyingArt login and
canonical LAC accumulation through the Coin service. OnlyIdeas retains its own
accounts, papers, private content, reading credits and subscriptions. Shared
identity does not grant another app's purchases or convert reading credits to LAC.

## Accepted app-specific contract

| Field | Exact accepted value |
| --- | --- |
| Issuer | `https://chat.lazying.art` |
| Confidential client | `onlyideas-server` |
| Audience | `onlyideas-service` |
| HTTPS callback | `https://agent.onlyideas.art/api/auth/lazyingart/callback` |
| Scope | `profile` |
| Flow | Authorization code, S256, `client_secret_post` |

This is the existing custom LazyingArt protocol, not OIDC. Bunko and Platform
credentials are never valid for OnlyIdeas. The independent profile-only contract
does not require `bunko-v1` or a fresh GitHub legacy-link proof. Central issuer
registration, provisioning and provider qualification remain EchoMind-owned.

The shared private owner response accepted this tuple. Anonymous verified-TLS
GET at 03:30:37 UTC found the OnlyIdeas origin healthy (`/api/session`: 200), but
the proposed callback returned 404 JSON. It does not collide with the existing
GitHub `/api/auth/callback` or native Apple routes. Discovery advertised central
password login; central Google/Apple/GitHub were false. OnlyIdeas' own currently
available Apple/GitHub login is a separate capability.

## Prepared protocol module

`server/lazyingart-profile.mjs` ports the profile protocol from the owner-delivered
private LazyingArtLinkPrivate source `309dab92e30c03720ebd10dbfb62e4d1849363f4`.
It is not imported by `server/app.mjs` or any client. No production configuration
loader, callback route, credential delivery or provider activation was added.

- Exact issuer/client/audience/callback binding, fresh discovery, only `profile`.
- Independent random state/verifier, browser binding and expiring attempts.
  Callback path/issuer/parameters are exact; duplicates, unknown fields and replay
  are rejected before exchange. Cancellation consumes only its matching attempt.
- Direct verified HTTPS with no redirects, proxies, cookies or automatic retry;
  a 15-second deadline, 64 KiB limit, JSON/no-store requirements and repeated-key
  rejection. Transport/storage failures expose fixed diagnostic codes only.
- Strict token and introspection schemas: exact subject/audience/client/scope,
  active account, timestamps, empty legacy proof list and expected subject on
  refresh. No positive introspection cache or email/name matching.
- Returned credentials are server-only, immutable and omitted by JSON
  serialization. Persistence must access their properties explicitly and encrypt
  them. Plain profile identity supplies no posting, billing or Coin permission.
- `refreshOnce` never retries. It must be called under a durable generation claim;
  an ambiguous response requires new authorization. A configured disabled client
  can still revoke existing credentials, and requires acknowledgement.

## Required integration before enablement

The Python framework includes encrypted coordinated storage. **That storage has
not been ported here.** This module requires a trusted attempt-store adapter:

| Method | Required implementation |
| --- | --- |
| `create(record)` | Durably insert the exact tuple, local attempt ID, state/binding hashes, encrypted verifier and issue/expiry times; reject collisions. |
| `consume(query)` | Atomically match the tuple, state, browser binding and expiry and consume once across processes; a wrong binding must not consume the legitimate attempt. |

An attempt ID refers to a server-owned local workflow. The HTTP handler must bind
it to its initiating web session or the independent native PKCE flow. The central
verifier never substitutes for the native verifier. `server/native-auth.mjs`
currently starts GitHub only; native shared login is not qualified by that code's
existing tests. Callback URLs must never be logged with authorization parameters.

Add encrypted credential storage with serialized refresh, generation checks,
absolute family expiry and a bounded revocation outbox. Unknown refresh outcome
must not replay an old token. Concurrent logout/deletion must reject late identity
or token writes. Preserve inactive versus unavailable results. Revalidate before
protected writes/private sync and on foreground/reconnect; central suspension
must invalidate old sessions even after reactivation.

The protocol helper currently returns credentials only after successful
introspection. Add a protected pending-credential persistence/revocation hook
before integration so an exchange followed by failed introspection cannot leave
an untracked central family. This cleanup is not supplied by the fixture store.

Use unique, transactional `(issuer, subject)` mappings to existing local account
IDs. Explicit linking requires fresh local and central proof and consent; an
email/name match never links accounts. Conflicts need an explicit recovery path.
Do not change authorship, libraries, privacy, purchases or subscription owners.
The currently implemented `Store.identity()` does not provide this linking policy.

Only after callback/session/mapping tests pass may the exact separately registered
client be privately provisioned and real web/iOS/Android/Mac flows qualified.
Keep general registration separate from any EchoMind invitation requirement.
Provider display follows current central readiness. Local login and anonymous
reading remain available independently of central availability.

Coin operation consent, policy/event IDs, canonical settlement and authoritative
balance receipts are a separate future adapter. Pending intents are not available
LAC; do not sum the same canonical balance across apps. Existing reading credits
stay local. Shared subscriptions and discounts remain unselected design notes.

## Validation boundary

Run `node --test tests/lazyingart-profile.test.mjs`. Contract fixtures cover pinned
registration, independent PKCE, wrong browser/issuer/parameters, replay/expiry,
cancellation, cross-app identity and scope, malformed credentials, inactive versus
unavailable responses, uncertain exchange/refresh, subject substitution, no secret
serialization, strict JSON/TLS/response limits and request timeout cleanup.

The attempt store in these tests is an **in-memory fixture**, not a durable or
encrypted implementation. These tests do not exercise the real issuer, concurrent
service processes, native UI, account linking or a Coin/payment transaction.
Preparation validation: all **14 profile protocol tests** passed; full
`npm run check` passed **174 tests**, renderer checks, TypeScript and web/native
reader asset builds with the existing configured Pandoc 3.11. No installed
binary, live backend, database, central registry or store review is changed by
this preparation.

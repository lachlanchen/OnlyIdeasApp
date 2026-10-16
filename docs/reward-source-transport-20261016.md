# Authenticated reward evidence transport

## Availability

OnlyIdeas exposes two authenticated server-to-server reads at
`https://agent.onlyideas.art`:

- `POST /api/lac/source/v1/evidence`
- `POST /api/lac/source/v1/eligibility`

The transport is deployed and qualified for missing-record responses and denial
cases. There are no live source events, check-in creation route or active reward
policies. The candidate daily rule remains `onlyideas-daily-check-in-v1`; Coin
owns its proposed +5 amount and canonical account/day deduplication.

## Authentication and limits

`server/reward-source-routes.mjs` connects the existing evidence dispatcher to
the HTTP server before browser session and CORS processing. It pins the app
origin and exact paths, accepts POST JSON only, and authenticates a dedicated
`X-Lac-Source-Key`. Browser Origin, Cookie and user Authorization headers are
rejected, including empty headers. Query aliases, unknown routes, duplicate JSON
keys, extra fields, wrong actors and malformed nonces are rejected.

The source credential is an opaque value stored in a protected regular file.
Symlinks and publicly readable files are refused. The service also supports its
named systemd credential. This key authorizes evidence reads only; it is separate
from app sessions, profile credentials, Coin resource tokens and wallet keys.

Requests are bounded to 8 KiB, four concurrent operations and 120 authenticated
requests per minute. The four-second deadline propagates an abort signal to the
authorization adapter. A timed-out proof retains its concurrency slot until the
work settles. Responses are JSON with `Cache-Control: no-store`; each echoes the
current nonce and supplies a server timestamp. No browser CORS is enabled.

## Qualification boundary

Transport enablement is separate from reward consent. Existing evidence requires
a qualified app-bound authorization adapter and fresh original-subject operation
proof. Ordinary profile permission cannot substitute for
`lac.points.intents.write`. The adapter must prove consent through the issuer and
app mapping; it must not call Coin while handling Coin's source request.

No such production authorization adapter is registered yet. If an active record
requires that proof, the source returns unavailable. Missing records return null
evidence or false eligibility. An outage is never converted to eligible=true.
Held, deleted, wrong-subject and changed-lineage records cannot authorize awards.

This source does not grant points, modify app credits, merge accounts or create
check-ins from login, navigation or timers. No paper registry is needed for later
independent qualification of the explicit daily action.

The later final-decision protocol still requires atomic decision adoption and
retention measured from the later of sealing and first durable adoption.
`/api/lac/source/v1/final` remains unavailable. Intake receipts do not authorize
purging evidence. No purge or central-deletion retirement runs in OnlyIdeas.

## Verification and deployment scope

- Full application gate: 287 tests pass, plus compiled renderer, TypeScript and
  production web-build checks.
- Six HTTP tests also pass against a copy of the exact deployed baseline with
  only the source-route patch applied. Fixtures cover positive evidence,
  consent/identity changes, missing proof, withdrawal, malformed requests,
  timeouts, concurrency and credential-file permissions.
- Sixteen public HTTPS checks pass, including authenticated absent evidence,
  absent eligibility, nonce freshness, wrong/missing key, browser credentials,
  malformed JSON, wrong method/path and normal API health.
- Coin's committed `AuthenticatedSource` implementation successfully reads the
  actual HTTPS endpoints and rejects a wrong key. No Coin database was opened.
- Deployment changes five backend files. All 51 existing data tables passed
  preservation checks; the new evidence table is empty. Existing web assets,
  ingress, login, purchased credits, plans, native packages and store releases
  remain unchanged. The previous immutable release and consistent backup remain
  available for rollback.

These checks establish the deployed source transport. They do not qualify an
actual check-in, live shared balance, point award or final-decision retention.

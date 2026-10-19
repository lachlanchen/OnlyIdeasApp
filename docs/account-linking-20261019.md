# Account-linking recovery

Start from the account containing the papers, conversations and plan to keep.
Its local ID remains primary. A login already assigned to another local account
is refused; there is no consolidation or transfer of purchases or credits.

## Implementation

- The optional account section identifies the current local sign-in method and
  explains the account to keep. Collision, changed-session and stale-proof
  messages offer cancellation, another account or same-account reauthentication.
- PWA linking and GitHub reauthentication use a separate popup and an independent
  PKCE receipt. The reader stays open with its draft and original session cookie.
- Callback refusal reaches only the matching flow. The completion/cancellation
  endpoints require the original session, owner and verifier. Cancellation fences
  late linking callbacks. Errors disclose no other account's identity or content.
- Native GitHub, Apple and authenticated central reauthentication are bound to
  the initiating account. Wrong-account results cannot replace its session.
  Android saves the returned session only after the account-generation check.
- Swift and Android include persistent connection guidance; translated messages
  cover all eleven supported interface languages.

## Evidence and limits

`PATH=/home/lachlan/.local/share/pandoc/3.11/bin:$PATH npm run check` passed:
318 tests, renderer validation, TypeScript and the web/native-reader build.
The older system Pandoc lacks `--sandbox`; use the existing 3.11 installation.

Android single-worker `:app:compileDebugJavaWithJavac :app:lintDebug` passed.
This is compilation/lint evidence, not an installed-device sign-in or new package.
Swift source has not been compiled or run in this round; no shared Mac was used.

Actual React/CSS component fixtures were captured at 320/390/1280 pixels,
including Arabic RTL. Draft preservation and no horizontal overflow passed.
Synthetic account/provider transport was used; these are QA captures, not store
screenshots or evidence of live issuer/provider qualification.

The central account-management contract is now delivered below; its standalone
entry is not yet implemented in the app.
Legacy Apple/GitHub buttons retain their existing local identity mapping; no
email-based aliasing or claim of live bidirectional provider parity is made.
This checkpoint changes source only. Releases, provider activation, plans, paid
credits, reward grants and production data remain unchanged.

## Peer comparison

AiMemo's October 19 implementation uses the same initiating-account and refusal
rule. The app-owned source retains its existing mapping and purchase boundaries.
A subsequent copy correction distinguishes a login owned by another local account
from an attempt to replace this account's existing LazyingArt connection. The
latter now asks the reader to reconnect the original LazyingArt account, matching
the structured recovery action and translated UI.

AiMemo's deployed and native-test evidence does not qualify this app's runtime.
Direct-provider convergence remains a separate qualification requirement.

## Delivered central management contract

EchoMind's October 19 issuer receipt supplies the exact entrance:
`https://chat.lazying.art/account#sign-in-methods`, labelled **Manage LazyingArt
account**. The issuer reports live web release `132d6ef9`, source `0043b6ea` and
verified-TLS health/discovery at 00:45:28 UTC. This closes the missing contract
dependency; it is peer evidence, not an OnlyIdeas callback or native test.

- Open management in the system authentication browser on native, with a warning
  to check the central account shown. It may differ from the app's linked account.
- Management uses first-party browser forms. Do not construct provider/password
  POSTs, scrape HTML as proof, or adopt an app session from visiting the page.
- Standalone success and cancellation return to `/account`; there is no app
  management API, arbitrary return URL or automatic native completion callback.
- Central `identity_link_conflict` (409) refuses and preserves both accounts.
  It is distinct from OnlyIdeas' structured local collision errors.
- Password changes revoke central access. Independent local sessions require
  reconciliation; they do not disappear merely because the browser signs out.

OnlyIdeas Connect remains the separately bound `onlyideas-server` /
`onlyideas-service` flow with
`https://agent.onlyideas.art/api/auth/lazyingart/callback`. Preserve the initiating
local ID, session, draft and disconnect reservation. Central provider linking
does not alias legacy Apple/GitHub identities; Apple native and web subjects
remain distinct.

Live app capability, callback acceptance, revocation reconciliation and native
provider round-trips remain app-owned qualification work. Native completion may
still issue a same-owner replacement token; it is not AiMemo's token-free link
receipt. This documentation receipt activates nothing.

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

The central account-management destination remains unqualified and absent.
Legacy Apple/GitHub buttons retain their existing local identity mapping; no
email-based aliasing or claim of live bidirectional provider parity is made.
This checkpoint changes source only. Releases, provider activation, plans, paid
credits, reward grants and production data remain unchanged.

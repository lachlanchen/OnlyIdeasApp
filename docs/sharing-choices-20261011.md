# Import choices and chat navigation · 11 October 2026

OnlyIdeas 1.0.7 (32) accumulates the reading update from build31.

- Jump to the latest agent message when scrolled up, on web, iOS/Mac and Android.
- Source links open directly. Retrying a request retains the server's existing
  sharing permission, without opening a license prompt. A private retry can
  still ask the reader to authorize its credit cost.
- Canceling a new sharing prompt means private import. The usual private-credit
  confirmation still applies. Confirmed sharing retains its selected license.
- Choices are stored locally per account and specific material: hashed file or
  text content, URL, or indexed research item. Unrelated uploads and different
  accounts do not inherit the attestation. Up to 128 choices are retained.
- Sharing options offers **Reset saved sharing choices** to select again on the
  next import. Existing published/private papers are unchanged by this reset.
- All new controls are localized in the eleven OnlyIdeas interface languages.

Validation: 201 tests pass, including real dialog interactions for cancellation,
remembered choices, material/account isolation, reset and retry costs. A changed
account prevents a pending web authorization from being used. Renderer,
TypeScript, web build, Android release lint and signed builds pass. The real
390px web UI shows the jump button only away from the latest messages and reaches
the bottom when tapped; no outer horizontal overflow. Apple archive/delivery
receipts are recorded separately after completion. Build31's physical/simulator
qualification boundaries remain; a new native gesture run is not implied here.

Only internal test distribution is authorized for this update. No new production
review, pricing, login, database migration or bulk publication is included.

## Delivery verified

Build32 is VALID and IN_BETA_TESTING on iOS/Watch and macOS. The Mac binary
contains both arm64 and x86_64. Google Play internal build32 is completed and
shows Available to internal testers; production build27 is unchanged. Apple
signed archives exported and uploaded successfully. Native source hashes match
the committed files. No new native interaction run is claimed for this small
follow-up; build31's keyboard/tab test remains its own evidence.

The web update is live at https://agent.onlyideas.art. Public HTTPS readback
matched the candidate index and JavaScript exactly, with health200. Only web
assets changed; server source, configuration and shared ingress remained intact.
The deployment preserved a consistent database backup and rollback release.
A first local health probe used the wrong port and automatically rolled back;
the corrected probe used the established18628 listener and passed before the
public HTTPS check. No account, paper or subscription migration occurred.

Curated delivery details: `store/review/sharing-choices-20261011.json`.

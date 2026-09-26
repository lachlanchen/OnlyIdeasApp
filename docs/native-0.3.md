# Native reading and agent chat · 0.3

## Experience

OnlyIdeas uses SwiftUI for iOS navigation, library, profile, discussions, settings,
requests and chat. Android uses native Android Views for the same screens. The
paper body has an isolated embedded renderer for Mathpix Markdown, TeX, SVG math,
figures and tables. App controls and chat are native.

Reading text defaults to 22 points/sp and can be changed from 18 to 34. Native
labels use system text styles/scaled pixels; system text scaling also affects the
reader. The profile button opens Profile. Sign out is a separate confirmed action
there. Existing secure session storage is reused.

Agent has a multiline composer, new conversations, saved history, visible work
status, abstracts, and Convert & add actions. Private conversations are available
on signed-in devices. Deleting a conversation removes its messages and queued work.

Notes, guides, translations, passage discussions, offline paper/figure downloads,
PDF file import and Markdown sharing remain available. Guides and translations
are labeled as generated text. Personal imports remain private.

## Agent connection

The workstation worker pulls bounded jobs over authenticated HTTPS. It does not
expose a workstation management port or accept shell commands. Its economical
local model runs through the existing LazyEdge token gateway and worker guard,
reached over an independently restricted, pinned SSH connection. No client,
relay, provider or SSH credential is included in the app.

Search uses arXiv metadata, with OpenAlex as a fallback when arXiv is unavailable.
Only observed index records become paper cards. Direct PDF links are downloaded
and checked before a conversion action is offered. The existing durable Mathpix
queue enforces conversion limits and preserves figures with canonical MMD.

- 4,000 characters per message; 100 conversations per account.
- 30 agent turns per account per day; 200 shared turns per day by default.
- One active task per conversation; one worker; expiring leases allow recovery.
- Private-network destinations, credentials in URLs and custom ports are rejected.
- Source downloads use DNS validation, redirect checks, byte caps and deadlines.
- Model replies cannot create paper cards or run commands.

Metadata references: [arXiv API](https://info.arxiv.org/help/api/user-manual.html)
and [OpenAlex API](https://help.openalex.org/api/). Search availability depends on
these services. Conversion is an explicit action and uses the configured allowance.

## Operation

`worker/paper-agent.mjs` reads an owner-only configuration at
`~/.config/onlyideas/agent-worker.json`, or `ONLYIDEAS_AGENT_CONFIG`. It contains the
cloud `origin`, a dedicated queue `token`, and a `model` with `url`, `name` and
`token`. Set `agentWorkerToken` to the matching queue token in the cloud config.
Keep all values out of Git. The worker uses no browser session or app user token.

Run `npm run check`, `npm run native:sync`, and the native build scripts. Android
instrumentation verifies encrypted session persistence/removal. The iOS
`NativeUITests` target checks Profile, text controls, Agent composition and the
native reader. Use only project-owned test devices and clean them up after QA.

## Verification and distribution

Build 0.3.0 (2) is being prepared for the existing internal test groups. See the
release record for the confirmed upload state. Public store review remains a
separate pending release gate.

Live verification passed for account-isolated chat, saved history, local-model
responses through LazyEdge, research search, a direct arXiv PDF download and
Mathpix conversion. The converted private paper retained 10,500 characters,
12 sections and one figure. No public test discussion or paper was published.

Native iOS navigation/composer/reader XCTest passed. Android native build and
secure-session instrumentation passed; final device evidence is recorded with
the release. KVM simulator screenshots have incomplete rendering of some iOS 26
system glass surfaces; physical-device visual coverage remains limited.

When upgrading from the earlier web wrapper, existing cloud papers and secure
sessions remain available. Offline papers saved by the earlier wrapper should be
downloaded again in the native reader; native downloads use a separate store.

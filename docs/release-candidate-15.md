# OnlyIdeas 1.0.2 (15) · research discovery

Source: `b05f42b`. Web/API deployed; signed native builds available internally and
submitted for production review on 2026-09-28 UTC. Supersedes build 14.

## Changes

- Latest open-access research with lazy pages and local fuzzy search.
- OpenAlex/arXiv search and agent discovery; discipline/subdiscipline, date,
  journal, DOI and source metadata; advanced filters.
- One-tap fetch/conversion; existing papers open without reconversion.
- Synced Save/Like, paper-level discussion and link sharing. Paragraph discussion
  is retained. EchoMind adapter handoff written; friend forwarding deferred.
- SwiftUI iOS/Mac and native Android controls, light/dark and all 11 UI languages.

## Qualification

65 server tests pass; renderer checks and production web build pass. Browser
checks cover mobile and desktop, hierarchical filters, immediate typo-tolerant
local matches, Save, Like and a moderated whole-paper comment in an isolated
database. The discussion overlay keeps its composer visible above navigation;
the mobile page does not scroll horizontally.

Two native iOS XCTest cases pass, covering discovery, filters, local search,
paper and paragraph discussions, translation and attachment controls. Signed
Android passes release lint/build and was installed without clearing the account
or library; native discovery, filters and the paper discussion were checked.
Both native platforms open discussion without forcing the keyboard open.

Apple archive, export, validation and upload succeeded for iOS/Watch and universal
arm64/x86_64 Mac. Mac shares the SwiftUI views checked on iOS; Mac reading/offline
and Watch transfer tests from build 13 remain the platform baseline. No new Watch
behavior ships in this build.

## Live data and discovery

The immutable server release is `09cd6626a910a1b1`. A candidate using a copy of
the real database passed live research metadata, taxonomy and access checks.
Two readers reused the existing public physics paper with Mathpix disabled.
The production switch preserved existing bodies, figures, accounts, private
libraries, credit ledger/holds and rollout/ingress configuration.

Verified bibliographic fields were added to the existing holographic-entanglement
paper; its text, revision and figures are unchanged. The test comments and reactions
remain in the isolated QA database. No sample papers were added to production.

OpenAlex latest results and arXiv category retrieval were verified live. Some
anonymous OpenAlex searches return upstream rate limits, and arXiv occasionally
rejects queries. Cached/partial results carry notices. Compatible arXiv requests
can fall back to OpenAlex's verified arXiv repository. Agent searches now reuse
the server metadata cache and provider budgets. See [discovery](research-discovery.md).

## Apple

Both 1.0.2 (15) builds are VALID and IN_BETA_TESTING in the existing internal group.
iOS (including Watch) and Mac are WAITING_FOR_REVIEW, with automatic release after
approval. Their pending build 14 submissions were replaced after build 15 qualified.
Existing store screenshots, privacy declarations and reviewer access are retained.

## Google Play

Signed 1.0.2 (15) is available to internal testers. Production submission is listed
under Changes in review, with automatic quick checks running. Full rollout retains
176 selected countries plus the rest of world; managed publishing is off.
Approval and public availability are not yet claimed.

## Integration and remaining gates

[EchoMind adapter handoff](echomind-onlyideas-adapter.md) was copied to the EchoMind
repo. Paper-item discussions and paragraph annotations use separate endpoints.
Friend forwarding is deferred, and central login requires its own registered and
qualified adapter. Paid subscriptions remain gated on purchase qualification.

[Verification, artifact hashes and submission receipts](../evidence/research-discovery-15/verification.json)

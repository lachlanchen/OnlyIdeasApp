# OnlyIdeas research backend and AgInTi qualification

Owner direction, 15 October 2026: prioritize the previously working direct-LLM
and app pipeline. Keep Codex as additional research help for now, qualify AgInTi
as a fallback with the existing AgInTi development session. This is an OnlyIdeas
adapter contract; it does not make AgInTi the whole application backend.

## Current division of work

| Task | Current implementation |
| --- | --- |
| Request interpretation, conversation, document questions | Direct configured DeepSeek model through the app worker |
| Public research discovery | Saved library and ordinary indexes first; Codex helper, then independent AgInTi helper |
| Download | App-owned HTTPS/repository paths and isolated browser retrieval worker |
| Reflow/conversion | Durable app jobs, accessible full-text HTML preparation or Mathpix PDF conversion |
| Translation/digest | Configured model, durable jobs, revision/language/segment caches |
| Publication, account permissions, billing, moderation | App server; never delegated to a model |

Both research helpers receive bounded public bibliographic queries, not private
chat history, uploads, credentials or account access. Results pass independent
DOI metadata verification and later downloaded-content checks. The Codex helper
checks quota and a daily cap. AgInTi has its own cap, lock and positive cache.
The fallback applies to research; it does not recover every model/planner outage.

## Evidence and current limits

- Installed AgInTi CLI observed: `0.20.339-integration.0`.
- The preceding [build 33 qualification](research-publication-20261015.md) found
  DOI `10.1002/advs.77832` with AgInTi/DeepSeek in 36.3 seconds, without Codex.
  Its accessible full-text HTML was converted by the app pipeline with seven
  figures. These are separate research and conversion results.
- The previously investigated request failed during interpretation; Codex quota
  exhaustion was not established as its cause.
- Broader AgInTi planning, private-document questions, translation and durable
  action recovery have not been qualified by that public-search test.

## Request to the AgInTi owner

Thread: `01a01d45-9ba6-7b11-9a0e-2db94cf1633a` in `../Agent`.
OnlyIdeas retains its adapters, data, runtime, credentials, UI and reviews.
The AgInTi session owns general runtime/SDK capability changes; no sibling edits
or OnlyIdeas deployment are requested.

Please assess the installed CLI and restricted SDK against these app needs and
return exact version/commit, entry point, tests, limits and any reusable fixes:

1. Public literature discovery using ordinary imprecise English/Chinese queries,
   author/title/DOI hints, topic changes and follow-up references. Structured
   observed metadata, no invented DOI/PDF URL or unsupported completion claim.
2. A restricted structured-plan interface for search/import/translation/digest/
   save/like proposals. OnlyIdeas validates ownership, visible target identifiers,
   permissions, costs and idempotency before its durable server executes actions.
   No account authority or direct database mutation belongs in the agent.
3. Bounded text-only document questions and translation with equations/figures
   preserved. Any later private-document adapter requires independent app tests;
   do not activate it through this coordination request.
4. Stable structured success/error/cancel/budget statuses, abort propagation,
   bounded retries, schema validation and evidence for actual tool execution.
   Include timeout/partial-result and provider quota/503 tests. Search availability
   must be distinguishable from model availability; do not silently report success.
5. No retained Studio/server requirement for the lightweight adapter, no implicit
   wrappers or additional tools, no hidden installs/updates, no private telemetry.

Classify missing support as general runtime, reusable skill, app adapter or
transient provider failure. Use synthetic/local fixtures and public bibliography;
do not change OnlyIdeas services, credentials, data, billing or store state. Return
a curated receipt through the shared OnlyIdeasApp handoff directory. Broader
activation remains an app-owned qualification decision.

## Applied routing receipt

- Normal route remains direct `deepseek-flash` planning and app-owned search.
  A live ordinary title request found DOI `10.1002/advs.77832` in **3.75 seconds**,
  with one direct-model call and neither research agent invoked. No production
  account, paper or job was modified by this standalone public-query check.
- Extra research now tries Codex, then AgInTi. One live Codex attempt produced
  no result before its configured timeout; AgInTi recovered the verified paper.
  Total helper-path time was **237 seconds**. This is fallback evidence, not a
  successful Codex qualification or evidence that agent research is fast.
- A separately simulated Codex quota failure recovered through the actual
  AgInTi adapter's positive cache. The test did not exhaust real quota.
- **225 tests passed**, renderer validation, TypeScript and web build. Added
  coverage proves normal LLM/index success skips both helpers, library reuse,
  Codex-first success, empty/error recovery, disabled backends and expired work.
- Two app-owned workstation workers run immutable release
  `research-routing-046e8866fe515f19`; router SHA-256
  `046e8866fe515f19b13d2b3f27711107380ccbbf463823871e494812b47ed062`.
  Both were idle at rollout and active afterward; retrieval heartbeat was fresh.
  Protected configuration, cloud API release, queues and native builds were
  preserved. No store submission or new binary was needed for this routing change.
- Contract and owner priority clarification were queued to the existing AgInTi
  thread. No peer implementation receipt has been received at this checkpoint.
  One Codex helper launch was attempted after a passing quota check; exact model
  token consumption is unknown because it emitted no completion events.

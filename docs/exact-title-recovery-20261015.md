# Exact-title recovery · 15 October 2026

## Report and cause

The reported prompt was:

> Metasurface‐Encoded Single‐Pixel Hyperspectral Imaging help me download this paper

A scoped read-only check found two completed requests with the reported
interpretation-error response and no resulting paper. The title contains U+2010
hyphens. The old planner gate classified every character outside U+0000–U+024F
as requiring interpretation, and its literal-title fallback rejected the same
punctuation. An unsuccessful or unusable plan therefore stopped before search.
The old requests did not record why their plans were unusable; a later live model
probe succeeded, so a historical provider outage is not asserted.

## Repair

- Classify letters rather than Unicode punctuation when deciding whether a
  request needs translation. Normalize publisher hyphens and quotes for lookup.
- Extract concrete title queries from ordinary download wrappers. Exact import
  requests can use the existing indexes without depending on a model response.
- Preserve the literal title if a model returns invalid, empty or unrelated
  planning output. General conversational/multilingual research still uses the
  direct model; Codex and AgInTi remain bounded public-research recovery.
- Compare title coverage in both directions and require a strong unique match
  before automatic processing. A related older card or a longer variant does
  not silently replace the requested work; ambiguous matches ask for selection.
- Reuse same-day, exact-DOI verified public-source cache entries before another
  research-helper call. Preserve original download alternatives and require
  document identity verification before conversion. No transcript is invented.
- Distinguish temporary search outages from no matches. Planner diagnostics
  record a fixed reason category and task identifier, without prompts, model
  output, account credentials or private document contents.

## Real-paper qualification

The publisher identifies the paper as DOI `10.1002/adpr.202500181`.
[Publisher record](https://advanced.onlinelibrary.wiley.com/doi/full/10.1002/adpr.202500181).
The [HKU author copy](https://www.eee.hku.hk/optima/pub/journal/2601_APR.pdf)
is a 10-page, 2,222,555-byte PDF. Title, author names and the exact DOI were
verified in its extracted text.

| Run | Evidence |
| --- | --- |
| Exact prompt after punctuation repair | Correct DOI and import action in 2.149 seconds; no planning-model dependency |
| First real search/download | Wiley returned 403; existing isolated browser/research recovery found the HKU PDF, total 58.061 seconds |
| Helper provenance | The verified source cache identifies `codex-web` for this successful lookup; AgInTi remains the fallback |
| Deployed worker code with source reuse | Search 2.341 seconds; search plus verified PDF download 3.057 seconds; no new helper/model call |
| Download identity | SHA-256 `2085d705b493302889435cc8e6f5976b4aa3493ac590733f58e25e990b5d104b` |

These timings describe this paper and current network/cache conditions, not a
latency promise for every source. Download qualification used the real providers
and PDF, without creating a production paper, changing a user's chat, running
Mathpix or charging conversion credits. Saved-paper reuse remains tested separately.

`npm run check`, using the qualified Pandoc 3.11 installation, passed all **235
tests**, renderer checks, TypeScript and production web compilation. Added cases
cover five hyphen variants, smart quotes, provider failure, malformed/empty/wrong
plans, old related cards, ambiguous matches, saved transcripts, outage wording,
cache expiry, DOI mismatch, unsafe/malformed cache fields and no paid helper on
cache reuse. Existing download-and-summary and multilingual isolation checks pass.

## Deployment

Three worker files were promoted as immutable manifest
`15b60314cc8ae691a1fa899b3a03fe2ef88629bcbe7fa23a16ee85e6dd28d8b7`.
Only the paper-agent unit restarted, after confirming no active tasks. The previous
release remains available for rollback. The retrieval worker's process, protected
configuration, cloud server release, database, ingress and store reviews remained
unchanged. Public HTTPS health and both worker services passed after promotion.

This is a server-side behavior repair for the existing web, iOS, Android and Mac
clients. No new native build or review was needed. The temporary retrieval
containers exited and were removed; no GUI or test server was left running.

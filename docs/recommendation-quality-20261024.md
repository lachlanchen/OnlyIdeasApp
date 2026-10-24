# Default research recommendations

The starting shelf focuses on English-language imaging, optics and biomedicine.
It uses exact journal identities for Nature, Science, Cell, PNAS, Optica,
Nature Photonics, Nature Methods, Nature Biomedical Engineering,
Nature Communications, Science Advances, Light: Science & Applications,
Nature Biotechnology and Nature Medicine. This is an editorial selection, not a
numerical journal-impact ranking.

Three title-filtered queries keep the subjects balanced. Each page contains up to
12 papers and at most three from any one journal. The feed excludes retracted
work, correction notices, future dates and all-capital metadata. Scientific titles
and acronyms are preserved as supplied. Only papers with indexed open access are
selected; actual retrieval still checks the source and permissions.

Saved interests remain the reader's choice. Explicit search and advanced filters
can still find research outside this starting shelf. The default does not write
preferences or change private libraries. Existing readable transcripts are matched
for the current reader after public metadata is cached.

Recommendation pages share bounded, coalesced server caching. A new policy key
prevents reuse of the former unrestricted default. An index outage can retain the
same curated page; it cannot fill the shelf with unrelated cached search results.
The existing app's Refresh action replaces its saved first page, so this backend
change does not require a replacement binary or a store-review restart.

## Verification

- 337 automated tests, renderer checks, TypeScript and production build passed.
- 28 discovery/recommendation tests passed against the exact deployed server
  baseline with only the three changed server files overlaid.
- Ten real Chromium checks passed at 320, 390 and 1280 pixels with actual public
  paper metadata: title preservation, paging, bounded disk cache, reopen and
  refresh. Phone and desktop captures were visually reviewed.
- Live provider previews returned 12 relevant cards on each of two pages, with
  no duplicate DOI between those pages and no unavailable provider response.

OpenAlex source identities were verified by ISSN. Its language attribute describes
metadata language; the feed also checks title quality. See the
[OpenAlex work attributes](https://help.openalex.org/data/works/attributes/).

## Live verification

The three-file backend update was deployed on 24 October 2026 from source
`ec340e760f381e8f46f01998fd072a5fcfb6ef89`. Verified HTTPS responses at
06:03 UTC contained 12 papers on each of two pages, spanning eight and six
journals respectively, with no duplicate DOI between pages. Both responses
reported the new recommendation policy and no unavailable provider. A repeated
cached request took 17 milliseconds in this check; this is an observation, not a
latency guarantee.

Three existing public papers, their reading responses and six figures remained
accessible after deployment. A consistent database backup and the previous
release were retained. Logical table comparisons passed, excluding only the
worker's volatile heartbeat timestamp; protected configuration was unchanged.

Existing iOS, Android, macOS and web clients receive the updated feed through the
same API. Refresh the home feed once to replace locally saved recommendations.
This backend update did not change the build 39 binaries or their submitted
store-review candidates.

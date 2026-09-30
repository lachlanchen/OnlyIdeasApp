# Research discovery and paper actions

Latest articles are fetched lazily from OpenAlex and arXiv. Existing local papers
match immediately with case/diacritic normalization, partial terms and one-edit
matching for longer words. Wider search is debounced; filters support research
index, primary and secondary discipline, years, journal and relevance/date order.
OpenAlex indexes journals and repositories across disciplines; arXiv offers its
own category hierarchy. With OpenAlex discipline/journal filters, the combined
view uses OpenAlex's indexed corpus rather than translating taxonomy IDs loosely.
Search covers the configured indexes, not every publisher or Google Scholar.

Classification snapshots were retrieved from the [OpenAlex fields API](https://api.openalex.org/fields?per_page=100)
and [arXiv taxonomy](https://arxiv.org/category_taxonomy) on 2026-09-28. Metadata
comes from these indexes, is not invented by a model, and can contain upstream
errors. Publication dates differ from the date a reader imports a paper.
Unknown metadata is omitted. Source links allow readers to verify the record.
See [OpenAlex API](https://help.openalex.org/api/) and [arXiv API](https://info.arxiv.org/help/api/user-manual.html).

Metadata pages are cached in SQLite (10 minutes search / 1 hour latest), with
in-flight coalescing and a 7-day stale fallback. Four distinct searches at once,
80 fresh searches/hour per process, per-client API limits, 100-page bounds, and
three seconds between serialized arXiv calls bound provider load. Client paging
removes duplicate IDs; partial failures are visible. No PDF/Mathpix/translation
is triggered by browsing. Server page caches contain public metadata only; every
response independently checks the reader before exposing an existing paper ID.

The agent uses this same server cache, so app and chat searches share metadata
and provider budgets. When arXiv is unavailable, an unfiltered arXiv request can
fall back to OpenAlex records restricted to arXiv repository `S4306400194`.
Category/journal requests are not broadened silently. Results retain source URLs
and a truthful unavailable/fallback notice. Anonymous OpenAlex search may itself
return rate limits; stale metadata and partial results remain usable.

A tap on a result reuses an accessible stored paper, or enqueues conversion using
the server's cached metadata and PDF URL. No client URL override is accepted.
No direct PDF means the source/upload path. Shared conversion produces an owner
copy; rights/community review controls publication. Standard conversion quotas,
provider size/page caps, durable receipts, refunds and identity reuse remain.

Paper item actions use canonical source keys. Save is private to the account,
Like is idempotent, and comments on the item stay separate from paragraph
annotations. Public comments require terms consent and moderation. Reporting,
blocking and account deletion apply. Private papers have isolated item keys and
no share link. Public HTTPS links open the paper/source card without triggering
an import merely by visiting. Withdrawal checks precede social reads and writes.

[EchoMind adapter handoff](echomind-onlyideas-adapter.md) covers the later mini app
and friend-forwarding integration. No EchoMind session is implicitly accepted.

## Exact references and latency · 2026-09-30

DOIs use exact records instead of full-text mentions. arXiv DOI, abstract and PDF
links use repository citation metadata and the observed canonical revision, so an
already converted revision can open immediately. Explicit revisions stay distinct.
Combined provider work has an eight-second deadline with socket/queue cancellation;
completed results survive another provider timing out. Crossref figure components
and datasets no longer appear as standalone papers. Download recovery avoids
fetching a denied URL twice when it is also the source page.

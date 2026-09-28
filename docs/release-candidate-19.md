# OnlyIdeas 1.0.2 (19) · research requests that complete

## Changes

- Search the library and online metadata by approximate title, author or DOI.
  Crossref supplements OpenAlex/arXiv when their endpoints are unavailable.
- Ask the agent to fetch a paper and summarize or translate it. Durable action
  records connect import, conversion and reading results; save/like also persist.
  Reuse existing transcripts and revision-specific translations.
- Economical catalog search runs first. A bounded local Codex fallback can find
  missing public metadata/PDF sources. Citations are independently checked and
  PDFs go through download and identity checks. No private document body, account
  token or full conversation is sent to that fallback.
- Contextual PDF uploads compare the title/DOI before conversion. Uncertain scans
  ask for confirmation; mismatches explain how to choose another PDF.
- Home recommendations use research interests across all authors, initially
  imaging, event cameras, optics, biomedical imaging and organoids. Preferences
  remain editable; advanced filters stay collapsed.
- Open saved results from chat. Android Back returns from a reader to its source
  conversation or collection. New interface messages support all 11 languages.

## Verified research workflow

A real Android request for “self calibrated neuromorphic hyperspectral imaging”
found the published Optica paper (DOI `10.1364/OPTICA.585766`). The fallback found
its university-hosted PDF. The title/author check matched; the same PDF was rejected
against an unrelated quantum-paper title. Mathpix converted four pages into
18,414 characters and four preserved figures. A reading guide, a Chinese sentence
translation and a saved-paper action completed. Results remain in the owner's
account. Shared publication is awaiting source permission review.

The native test also caught and fixed a planning-model reply that incorrectly
stopped a concrete download-and-summary request. A regression test covers it.

93 backend tests pass; renderer checks and the web production build pass. Android
release lint, signed APK/AAB and debug builds pass. iOS/Watch and universal Mac
archives and exports pass. Detailed platform/UI and store receipts are recorded
in the accompanying verification file when qualification completes.

The server deployment retained existing paper records, credits and holds, used
a database backup and checked a candidate against a copy of the live database.
Two accounts reused a stored physics paper with Mathpix disabled. A cached Chinese
passage rebuilt with no extra model calls. The public policy includes Crossref
and the public-query Codex fallback.

## Limits and release status

A source may deny automated downloads; contextual PDF upload remains available.
Uncertain PDFs need reader confirmation. Shared requests with unresolved rights
remain pending review; private content never becomes public automatically.
Private import costs require explicit confirmation. Paid subscriptions remain
limited to operator qualification. Activity alerts refresh in-app; daily reminders
are local notifications. Central account integration remains separately gated.

Build 19 is in internal TestFlight for iOS/Watch and Mac. Production submission
receipts are recorded separately; uploading a build does not establish approval.

Android 19 is available to internal testers. The owner then requested translations
inside the main reader with interlaced languages and Professor Shaohua Ma's
research in the default interests. Those changes will be qualified in build 20
before production submission. Apple build 15 was canceled; 19 is prepared but
not submitted. Google production 15 remains pending.

[Verification receipt](../evidence/research-agent-19/verification.json)

# Live agent and upload verification

Verified on 2026-09-27 against the deployed OnlyIdeas service, using the signed-in
owner's browser and visible app controls. Source baseline: `cf59271` (native
release 0.3.0, build 2). This check did not rebuild or redistribute native apps.

## Results

| Step | Observed result |
| --- | --- |
| New agent conversation | Natural-language request returned six research-index paper cards. The configured `localllm-pocket` worker and its LazyEdge tunnel were active. |
| Direct PDF request | A follow-up arXiv link was downloaded and checked by the worker, which offered a conversion card. |
| Convert from chat | The visible Convert & add action returned the already completed five-page import. Durable deduplication reused that paper without another conversion. |
| Fresh PDF upload | A newly created original one-page PDF was uploaded through Add a paper. A new Mathpix job completed in approximately five seconds. |
| Reflow reader | The new private paper contained 719 Markdown characters, four sections, two rendered math elements and one loaded figure (1453 × 835 pixels). The source and rendered reader were visually checked. |
| Private discussion | A test question was posted on the original private paper and remained visible after reload. |
| Conversation history | The agent's request, search results, direct PDF response and import message returned when reopening the conversation after reload. |
| Privacy | An unauthenticated request for the new paper returned 404. The paper and its discussion remained private. |

The source fixture contains a square-law equation, synthetic observations, a
chart and a discussion question. It is original test content, not a user paper.
It is available in the owner's private library as
**OnlyIdeas verification - 2026-09-27**.

## Scope and limits

- This is fresh live web/service evidence. Previous iOS simulator and Android
  emulator checks are recorded in [native 0.3](native-0.3.md); this run is not a
  new physical iPhone, iPad or Android-device test.
- Conversion requires the explicit **Convert & add** action. Agent search does
  not silently spend the Mathpix allowance or publish a paper.
- One fresh one-page Mathpix conversion was submitted. Reopening the existing
  five-page paper exercised deduplication, not a second paid conversion.
- No paper or discussion was published to the public GitHub content repository.
  Public publication remains a separate, explicit rights-cleared action.
- Raw job identifiers, account information, screenshots and private content stay
  in the ignored runtime evidence, not this public document.

Private evidence: `.runtime/verification-20260927/`. It includes the original
fixture, search/download/upload screenshots, job receipts, reader counts and
discussion/history/privacy results. Only the temporary owned browser tab is
closed after capture; the production agent and tunnel remain running.

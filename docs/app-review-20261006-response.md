# OnlyIdeas - response to App Review, 6 October 2026

Submission under discussion: iOS 1.0.2 (21). Latest uploaded candidate:
1.0.5 (26), available in internal TestFlight. The three parts below answer
Apple's nine questions. They distinguish implemented behavior, recorded testing,
and future integration. No subscription activation is part of this response.

## Message 1 - questions 1 through 4

Thank you for the detailed questions. This is part 1 of 3 of our response about OnlyIdeas, art.onlyideas.app, iOS 1.0.2 (21). We are following your request to explain the product before resubmitting. We have not treated an icon change or a newer build number as a resolution of 4.3.

1. Purpose and problem solved
OnlyIdeas is a research-paper reading room. A researcher enters a title, DOI or research query, checks bibliographic results, and imports an accessible paper or supplies a PDF. A durable conversion job retains the paper's equations, tables, figures, citation and source information while producing flowing text for a phone. The reader can view original text, a requested translation, or aligned original/translation passages; annotate or discuss a paragraph; save the paper; and reopen cached text and figures offline. The agent can carry out this paper workflow from a saved conversation. Existing accessible transcripts and translation pieces are reused instead of repeatedly converting the same work. Private uploads and conversations remain separate from rights-cleared public papers and discussions. This addresses the interrupted workflow between finding a paper, reading a dense PDF on a small screen, and discussing its exact passages across languages.

2. Intended audience
Graduate students, researchers and journal-club members who regularly read equation- or figure-heavy papers, including multilingual labs. Our initial hands-on use has focused on computational optics, biomedical imaging, event cameras and organoids. Interests are editable; the app is not a separate edition for each field or language. A useful session is reading one identified article with its figures and translation, then returning to a saved discussion or excerpt.

3. Specific gap
We do not claim that search, PDF reading or AI chat is unique by itself. Our contribution is their integration around a persistent, source-identified paper: safe source recovery and a matching-PDF upload path; shared conversion and sentence/paragraph translation reuse; interlaced reading without opening another reader; source-anchored discussions; and cached figures/text for offline reading. It reduces repeated conversion, lost context between separate tools, and the need to alternate between a PDF and an unrelated translated answer. Generated text is labeled and kept separate from the original.

4. Beta testing and feedback
Testing has been a small owner-led beta, not a large external user study. We distributed internal TestFlight builds and ran native UI, renderer, network, persistence and server tests. Concrete owner feedback led to larger adjustable text and a real Profile page instead of immediate logout; tighter margins and removal of page-wide sideways scrolling; local paper/figure caching; upload recovery when a repository returns 403; and Original/Translation/Interlaced views after feedback that a separate translation reader interrupted reading. These reader improvements were present by build 21.

Recorded tests include a real optics paper with four figures, verified title/author, conversion, saved digest and sentence translation; and a real quantum-simulator paper with 324 translated pieces in 33 aligned groups and retained figures. iOS simulator reader tests, Android offline cold-start tests and Mac reading checks are recorded separately. Continued beta after the original submission added all three Watch excerpt editions, four-Mac offline checks, and build 26's native sign-in return recovery. The latter has Swift behavior/compile checks; fresh end-to-end native OAuth acceptance remains pending. We are not claiming these later checks occurred in the rejected build or that an actual Apple subscription purchase passed.

## Message 2 - questions 5 and 6

OnlyIdeas review response, part 2 of 3.

5. Standalone product and relationship to our other apps
OnlyIdeas is an independently usable product under LazyingArt LLC. Its main objects are bibliographically identified papers, conversion jobs, aligned reading editions and paper discussions. No purchase or installation of another LazyingArt app is required. Our account also contains these products/records:

- Bunko: downloadable books with ruby readings, aligned book-language layers, dictionaries and book progress. Bunko also has a private document companion, so PDF rendering and asking questions overlap. OnlyIdeas adds a research-index discovery/import pipeline, shared canonical paper records, revision-keyed transcript/translation reuse and paper-centered community activity. It does not embed Bunko's book catalogue or ruby-reading engine.
- EchoMind: AI/voice conversations, social posts/friends and multilingual practice. It also contains an earlier OnlyIdeas mini program with paper search, PDF conversion and paper chat. We acknowledge this functional overlap. This standalone app supplies the dedicated SwiftUI paper-reading/navigation, durable native offline cache, aligned multilingual paper editions, paper-specific saved/liked collections and paired Watch excerpts. Our documented future direction is to make EchoMind's mini program an adapter to this research service; that integration is not yet completed and is not a feature claimed for this submission.
- AiMemo: capture, organize and retrieve personal notes, voice messages, tasks, documents and tables. Its primary saved object is a personal memo/task, rather than a source-identified shared research paper and its reading editions.
- LazyEdit Studio: a private video-editing/subtitle workflow. Musia: listening, rhythm and guitar practice. GlassAgent: local personal context and optional smart-glasses workflows. None is the standalone paper reading room submitted here.
- L & N and ClearPair L & R / H & F: focused sound-contrast listening, recording and practice. ClearPair English, Japanese, Korean, Mandarin, Cantonese and Arabic Letters address their named language's sounds or scripts. OnlyIdeas has no pronunciation-drill curriculum, contrast lessons or language-specific app editions.
- LazyOracle: symbolic-system exploration and a reflection notebook. LazyArtCoin: viewing platform credits and public blockchain balances. SHI: historical strategy narrative. These have different primary tasks and data; OnlyIdeas contains no divination engine, wallet or game.
- LazyGame, weStory and Auspice are additional records in our account, not alternate OnlyIdeas listings. Their current iOS records have no English product description. We do not rely on their review or availability as evidence for OnlyIdeas, or claim a paper-reader implementation in those records.

6. Why not consolidate it as a feature or IAP?
It is technically possible to put paper search and conversion into EchoMind or Bunko; their overlapping document tools demonstrate this. We chose a focused research product because the full workflow requires a paper library with citation/source identity, acquisition/conversion jobs, shared revision-based translations, paper/paragraph discussion, and native offline reading. That is a different navigation and data lifecycle from EchoMind's conversations/social feed or Bunko's annotated book editions. It can be used without entering those products or their account/invitation experiences. It is not a paid unlock of content already supplied by either app. Accounts, libraries and entitlements currently remain separate. Future optional shared login or an EchoMind adapter is not a claim that consolidation is already implemented. If your concern specifically concerns that overlap, please identify the workflow you consider insufficiently distinct so we can address it rather than submit another cosmetic variant.

## Message 3 - questions 7 through 9 and verification route

OnlyIdeas review response, part 3 of 3.

7. Shared code, frameworks and assets within our account
There is reuse and we do not claim every line is novel. One identified shared custom file is tools/build-document-renderer.mjs, also used by Bunko: it bundles the standard mathpix-markdown-it package for isolated document rendering. Its output contains the third-party math/Markdown renderer, which accounts for a substantial common rendering dependency. We reuse engineering approaches for safe document handling, Capacitor/native project setup, signing and account-bound billing, and have adapted subscription reliability lessons from EchoMind. These are infrastructure/engineering reuse, not a shared paper-app UI or shared subscription.

The iOS research interface is implemented in OnlyIdeas' NativeViews.swift and NativeStore.swift, with OnlyIdeas-specific discovery, jobs, saved papers, conversations, reader controls and persistent cache. WebKit renders the paper body; the iOS navigation and screens use SwiftUI. Its research server is separate Node/SQLite code. EchoMind's Python mini program/backend and AiMemo's memo backend are not imported into this app. The OnlyIdeas icon is separately designed; Bunko book payloads and covers are not packaged in it. A disabled future shared-profile protocol module exists only in later server source, not in the uploaded build 26 native binary, and does not enable shared login or entitlements.

8. Third-party code or content
We use standard dependencies including Capacitor, React for the PWA, Mathpix Markdown/MathJax, DOMPurify and Apple's native frameworks. We use Mathpix as a conversion service and configured model services for requested digests/translations, and research metadata from OpenAlex, arXiv and Crossref. These services and scholarly content are not authored by us. Papers retain source/attribution; private uploads remain private, while shared imports pass publication checks before joining the common library. Our original application work is the paper identity/reuse pipeline, permission boundaries, durable research actions, aligned reading/cache model and moderated paper discussions. This is not a purchased third-party app codebase with a replacement brand.

9. Client, template or content-provider relationship
OnlyIdeas is developed and operated as LazyingArt LLC's own product, initiated by its owner for research reading. It was not commissioned by an outside client or submitted on behalf of a template customer. We use AI-assisted development tools in our own repositories; we are not reselling a commercial app-generation template. The company operates the service, product design and user-content moderation. The paper authors retain their content rights: operating the application does not imply that we authored the imported research. Users supply private documents and the common library uses cleared content with provenance.

Review route: open Library > Reading library and select "Measuring holographic entanglement entropy on a quantum simulator". This is a real public article, DOI 10.1038/s41534-019-0145-z, with equations and figures. Open the reading-language controls to compare original and cached Chinese/interlaced text. Research for you supports a title/DOI query; account-based Agent, Save and discussion actions use the supplied review sign-in. The service is live. Latest iOS/Watch and Mac candidate 1.0.5 (26) is VALID in internal TestFlight, but we have kept this rejected submission in place while answering your request. Please reconsider the distinct research workflow or clarify the specific duplication/template concern and whether you would like us to attach the latest candidate and resubmit.

Attachments show the existing iOS build 20 reader and later Mac build 24 beta, with real paper content. They are dated implementation evidence, not claimed as new build 26 screenshots.

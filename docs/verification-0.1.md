# OnlyIdeas 0.1 · verification, 2026-09-26

The initial web preview is live at https://agent.onlyideas.art.

## Verified

- GitHub OAuth with the owner account; browser reload restores the session.
  Cookie is Secure, HttpOnly, SameSite=Lax, with 90 days of sliding inactivity.
- Live Mathpix conversion of an original one-page CC0 test PDF, locally and on
  the cloud service. A converted equation rendered and the extracted figure loaded
  from OnlyIdeas storage. Source PDF removal follows successful conversion.
- Live DeepSeek Flash reading guide, locally and on the cloud service.
- Japanese translation of one source section retained its rendered equation.
- Private notes and a private passage comment survive a browser reload.
- Library and equation reader fit 320px and 390px phone viewports. Equations scroll
  within the reading column, without forcing horizontal page scrolling.
- Anonymous cloud readers see only the public original sample, not the owner's
  private conversion test. Local development login is disabled in production.
- Wrong-origin mutations fail with 403; anonymous uploads 401; unknown routes 404.
- Dedicated GitHub content deploy key has write permission and passes a dry-run
  push. No private test paper or public test comment was published.
- Seven automated test cases cover section stability, public-address validation,
  ZIP path/figure validation, publication permission, session persistence, owner
  access, private notes/comments, duplicate comments, OAuth query handling, and
  rejection of ambiguous paid retries. `npm run check` passes.
- Both repositories have checked 11-language READMEs, funding, citations, homepage
  and topics. App source and public paper content are separate.
- Cloud service binds loopback, uses protected credentials and about 36 MB at rest.
  Other existing sites retained their prior HTTP responses. No firewall changed.
- Initial SQLite backup passed integrity checking; associated figure files exist.

## Evidence

See [UI results](../evidence/ui-checks.json), [cloud results](../evidence/cloud-checks.json),
[phone library](../evidence/library-phone.png),
[phone reader](../evidence/reader-phone.png),
[Japanese translation](../evidence/translation-phone.png), and
[cloud reader](../evidence/cloud-reader.png).

## Scope still to validate or implement

This is an early web preview. Native store builds and offline packs are not built.
UI copy is currently English; paper languages and translation choices cover 11
languages. Broader literature discovery, cross-revision annotation migration,
community moderation operations and account deletion/export need further work.
An independent reader account, live public publication, backup service-restore drill,
automated failed-upload retention and a host reboot test have not been exercised.
Provider conversions can contain OCR errors; readers should retain the source link
and verify technical claims. Generated guides/translations are labeled in the app.

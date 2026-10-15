# Reliable research and owner publication — 2026-10-15

## Delivered

OnlyIdeas 1.0.8 (33) is available in the existing iOS/Mac TestFlight group and
Google Play internal track. The API, PWA and two workstation workers were updated.
This candidate does not change current production store releases or billing.

- Research discovery tries ordinary indexes and reusable library entries first.
  The bounded AgInTi/DeepSeek helper precedes the independent, quota-gated Codex
  helper. A failed planner can still recognize an explicit long English title.
  Other ambiguous requests retain truthful retry guidance.
- The agent helper receives public bibliographic metadata only. Its shell, file,
  wrapper and MCP tools are disabled. DOI candidates must pass Crossref/DataCite
  verification; PDF contents are separately checked before conversion.
- Existing transcripts and revision/language-keyed translations remain reusable.
  Conversions and translations continue through their existing durable workers;
  the new AgInTi helper is specifically the discovery/retrieval fallback.
- The attachment control is fixed at 44 points/pixels, leaving the composer room
  to grow. The native document picker uses a smaller preferred presentation size.
- **Make public** is visible in an owned private paper's reader on web, iOS,
  Android and Mac. It is separate from sharing a link. The uploader chooses a
  permission and confirms rights/Community Terms once. The paper is immediately
  public and queued for administrator review afterward. Source/retry actions keep
  the saved per-material choice and do not reopen permission prompts.
- Publication updates visibility, permission and the review job in one SQLite
  transaction. Repeated confirmation reuses the existing job. Ownership, active
  account, revision, moderation rejection and permission checks remain enforced.
  Chats and notes remain private. New strings are present in all 11 UI languages.

## Qualification

- `ONLYIDEAS_TEST_PANDOC=~/.local/share/pandoc/3.11/bin/pandoc npm run check`:
  **221 tests passed**, renderer checks, TypeScript and production web build.
- Six new regression cases cover planner failure, exhausted independent backend,
  transcript reuse, owner publication, invalid consent/stale revisions/moderation,
  and rollback on storage failure.
- Live AgInTi/DeepSeek found DOI **10.1002/advs.77832** in 36.3 seconds without
  invoking Codex. The direct PMC PDF returned 403; the existing isolated browser
  worker retrieved the matching full-text HTML. Conversion preserved **7 figures**
  and produced 106,941 Markdown characters without Mathpix. No production paper
  or personal conversation was changed by this qualification.
- Browser interaction at 390 and 1024 pixels verified the public confirmation,
  anonymous read afterward, compact attachment/input proportions and no horizontal
  overflow. The narrow toast was also corrected and its dismiss control exercised.
- iPhone native UI test passed: attachment width, input width, private reader entry,
  actual permission toggle, publish action, disappearance of the private action,
  and refreshed library review status. The synthetic fixture ran on a local API.
- Android release lint/APK/AAB passed. The signed release upgraded the existing
  app in the owned emulator; the actual composer was inspected and captured.
- Universal Mac and iOS/Watch archives exported and uploaded successfully. Both
  Apple builds report VALID / IN_BETA_TESTING. Google reports Available to internal
  testers for version code 33.
- The Mac Debug reader loaded the real downloaded article from the local QA API:
  **7 figures, 3 rendered equations, 130 paragraphs, no horizontal overflow**.
  That older extended harness later stopped at its expected cached Chinese
  translation, which was absent from this new fixture; it is not a full pass.
  Full Mac publication/file-picker interaction remains unqualified because another
  app's system keychain sheet blocked desktop input. It was left untouched.
  Internal Mac snapshot files were blank and are not release screenshots.

## Deployment and evidence boundaries

Deployment used immutable releases, an idle-queue check, consistent SQLite backup,
service-account readability checks and rollback. A first rollout failed its health
check because archive file modes were too restrictive; it restored the previous
release. The corrected rollout passed. Digests of papers, artifacts, translation
pieces, chats, messages, notes, comments, sessions and jobs remained unchanged.
Shared ingress and protected server configuration were unchanged.

The AgInTi worker configuration is private and points to the installed CLI and
existing protected model configuration. Separate locking, daily limits, a short
positive cache, output limits and deadlines bound research attempts. No credentials
are stored in this repository. Operations, raw account inspection and rollback
receipts remain in the private runtime directory.

[Build and test receipt](../store/review/research-publication-20261015.json)
records exact binaries and release states. [Current screenshot drafts](../store/screenshots/1.0.8-33/README.md)
are reviewed locally only; existing public store imagery/reviews were preserved.

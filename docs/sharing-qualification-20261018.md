# Sharing and chat context qualification — 18 October 2026

Candidate: OnlyIdeas 1.0.9 (36), cumulative with the pending compatibility work.

- Full check: 305 tests passed, plus compiled equation/table/figure renderer checks
  and production build.
- 16 browser interaction checks passed at 320/390/1280 widths: both quote roles,
  paper mentions, failed-send retention, durable IDs, immediate re-quoting, share
  drafts and dismissal. No import job was created by selecting references.
- Three Android instrumentation tests passed, including quote/paper-context
  retention across rotation and existing avatar/copy/reader checks.
- Universal Catalyst Debug compile and iPhone simulator adaptive-draft test passed.
  These do not establish a Monterey physical-device or foldable-hardware pass.
- Public previews, mention API and updated research worker were deployed through
  a sharing-only patch of the production baseline. All 52 database table digests
  remained unchanged. No identity, billing, rewards or account configuration was
  activated. Private/withdrawn preview denial was tested with owner credentials.
- A real public research-paper preview resolves with canonical metadata and store
  links. Anonymous mention lookup is denied. The research worker reuses saved
  transcripts when explicit papers are selected.
- EchoMind accepted the rich-card contract but its direct receiving route was not
  live at this checkpoint. AiMemo's receiving contract is pending. Both retain
  clearly explained copy drafts; no external message, memo or paid job was sent.

Native internal upload/processing receipts follow the signed archive checks.
Current formal review candidates and public release selections are preserved.

## Internal Android delivery

OnlyIdeas1.0.9(36) is available to the existing Google Play internal test track.
The signed release upgraded35 without clearing data. Real public-paper links and
the native reader share menu passed. Three isolated Android UI tests covered
quotes, paper context, copy and rotation. Sixteen browser interaction checks
covered compact/desktop layouts, quote/reference submission, failed-send draft
retention and the distinct AiMemo/EchoMind copy drafts. No messages were sent to
contacts. Apple36 iOS upload succeeded; Apple processing and Mac delivery are
tracked separately and are not claimed by this source receipt.

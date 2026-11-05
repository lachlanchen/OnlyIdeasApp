# Paper reading and translation reliability

Reopening a language keeps its existing translation visible. A late offline
cache cannot replace a newer network response, and unchanged reading data keeps
its rendered document. Original, translation and interlaced controls use a full row on
narrow phones, keeping their labels readable. Changing a reading layout uses a short transition and respects
reduced motion.

Translation requests track their exact job, including older shared jobs outside
the recent-request list. Failed work shows its message and can be retried through
the existing deduplication path. Polling is bounded and stops when the account,
paper or language changes. Native iOS/Mac and Android readers use the same exact
job-progress endpoint.

The web and native document renderers preserve the visible source passage when
new translated content replaces the document. Equations, figures, source links
and paragraph discussion anchors retain their existing rendering paths.

## Qualification and delivery

All 393 source tests pass, including translation failures, cross-account isolation,
cache races, passage restoration, shared reuse and offline workflows. Renderer
checks and the production build pass. Android Java compilation passes.

Eleven live browser checks cover a public metasurface paper, local-first search,
its existing 543-piece Chinese translation, four widths, reading modes, saved
figures and reopening from the offline cache. Browser testing is distinct from
native device or Duo runtime qualification. Build 43 passed its separate native checks and is available internally;
see [delivery details](internal-build43-20261105.md).

The deployed API includes owner/subscriber-scoped job progress; unrelated users
receive 404. The web reading improvements are deployed. Existing papers, sessions,
credit lots, plans and protected service configuration were preserved. The prior
weekly reset policy is unchanged.

Shared LazyingArt login and canonical earned LAC remain a separate callback and
consent qualification. This update does not enable new providers, reward grants
or shared subscription entitlements.


The additional phone control correction is web source `ee99ea5`, deployed after
four browser width checks and a fresh 393-test/renderer/build pass. Native build
43 remains bound to source `09553db`; its toolbar controls are native. Genuine
walkthrough recordings and eight locally reviewed screenshot drafts were prepared
with public books/papers and existing translations. They have not been posted
publicly or uploaded as store screenshots.

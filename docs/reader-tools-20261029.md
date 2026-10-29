# Reader tools · 29 October 2026

Open **Contents** to jump to a section, or **Search** to find words inside the
current reading language. Select text and choose **Highlight** or **Add note**.
**Highlights** lists saved passages and their notes; **Notes** opens the paper's
private notebook. Click or tap a figure to enlarge it, then use zoom controls and
scrolling. Highlight colors and labels work in light and dark themes.

Highlights and notes belong only to the signed-in account. Sharing a paper does
not publish them. Saving requires a connection. The server keeps notes across
reopening and devices. An outdated editor cannot replace a newer version silently.
Old clients remain compatible with the existing notebook endpoint.

Passage anchors retain quote, surrounding text, language and source revision.
After a source change, a highlight is placed only where its quote and context can
be identified. An unresolved passage remains available in Highlights. Equations,
tables, links and figures keep their original rendered structure. Public paper
bundles do not contain personal annotations.

New/default research feeds select Nature, Science and Cell. Existing explicit
journal/topic choices remain unchanged; settings and Agent can still edit them.

## Verification scope

- 358 backend, account, reader-anchor and existing regression tests passed.
- Renderer checks, TypeScript and production web/native-reader bundling passed.
- Fifteen browser checks covered contents, styled-text search, saved highlights,
  private notebooks, zoom, reopening, two-account isolation and 320/390/768/1280px
  layouts. Native and web reader labels share the 11-language catalog.
- Android 1.0.10 (40) release lint, signed APK/AAB and Debug compilation passed.
  An isolated API 34 emulator ran the actual native reader bridge against a
  disposable backend: saving a highlight, attaching a private note, figure zoom
  and text search passed. The emulator and fixture were stopped afterward.
  Build 40 is published to the existing Google Play internal track. A fresh
  provider readback confirmed `completed`, the exact uploaded bundle hash and
  unchanged tester settings. Production remains on build 39.
- Windows x64 self-contained publish and 16 URL/PKCE policy checks passed. The
  actual executable opened a public paper on Windows 11: all four tools loaded,
  contents/search and figure enlargement passed, with no horizontal overflow.
  The anonymous test used no foreground input. Real provider sign-in remains
  untested on Windows.
- iOS/Mac source integration is prepared. Native compilation/device checks and
  TestFlight delivery require a new coordinated Mac slot; old admissions are not
  reusable. Current public store reviews remain unchanged.

The new `reader_annotations` table is additive. Writes are per-account,
per-paper, versioned and idempotent; deleted records retain a version tombstone.
Account deletion removes annotations, including notes on deleted owned papers.
The existing `notes` endpoint accepts optional optimistic versions so older
installed clients remain usable. The web adapter additionally binds requests to
the account shown in its editor.

The rollout applies only the reader and journal-default changes to the deployed
backend baseline. It does not enable newer unqualified shared-login adapters from
the source branch. Configuration, billing, 100 daily usage credits, ingress and
paper data stay in place.

# OnlyIdeas 1.0.0 (8) · a shared reading room

Verified 27 September 2026. The generic book icon is replaced by an original
O/i conversation mark in emerald, cream and gold. All raster sizes are exported
directly from the SVG. Apple’s processed icon was downloaded and visually checked.

## Distribution

- iOS build `421db19b-7bc0-4a2c-98ed-0a212913e8bd`: **VALID / IN_BETA_TESTING**.
  The existing internal group includes build 8, with updated test notes.
- The App Store draft selects build 8. Public submission remains pending final
  iOS screenshots and live Apple sign-in verification. No Apple approval is claimed.
- Android version code 8 passed lint and signed APK/AAB builds. **Available to internal testers** was confirmed in Google Play. Production
  review remains on build 6.
- iOS IPA SHA-256: `05eaa881926ff078d1f34779b4b8fe580ad601973a60959b16d22898776a4b71`.
- Android AAB SHA-256: `e20567dd023c5400b55ed6ffe9d70b35d352afbf0ff38b28d8af2d83dcb93906`.

## Real public research

| Paper | Source permission | Original figures |
| --- | --- | --- |
| [OpenAlex](https://arxiv.org/abs/2205.01833v2) | CC0-1.0 | 1 |
| [Measuring holographic entanglement entropy on a quantum simulator](https://www.nature.com/articles/s41534-019-0145-z) | CC-BY-4.0, published article | 3 |

These are actual PDF-to-Mathpix conversions, retained in the production database
and published as compact MMD, metadata and figures in OnlyIdeas-papers. Public
source and license provenance accompany each bundle. The original demonstration
article remains separately labeled. No private notes or conversations were exported.
The quantum paper came through the live agent chat and Convert & add controls.

Signed-out browser checks opened both complete articles at phone width: all four
figures loaded, equations rendered, and the page stayed within the viewport. The
quantum article rendered 185 MathJax elements. Android 8 showed both Reading room
entries and opened the quantum article in its native reader.

## Sharing and retention

- Web, iOS and Android import controls default to Shared, with an Only me option.
- Shared queues source/rights and community review; it does not skip permission.
- Legacy requests without a sharing choice retain their previous private behavior.
- Existing private notes, conversations and unselected papers stay private.
- Conversion and sharing requests are deduplicated; requesting publication of an
  existing completed import does not purchase another Mathpix conversion.
- Unknown source permissions remain pending; approval rejects unsupported licenses.
- Publication metadata identifies shared visibility consistently in Git and SQLite.
- The web Library navigation now returns from the reader to the paper list.
- Privacy and community terms describe the choices; the hosted policy mirror
  was updated. All eleven README translations describe the shared collection.

A fresh private backup contains the database and 34 figure files. SQLite integrity
and an extraction/hash check passed. Live records persist outside releases; only
generated backup copies expire after 30 days. No database or personal data entered Git.

## Verification

`npm run check` passed 14 backend tests, compiled reader checks, TypeScript and
production builds. Sharing tests cover deduplication, review, rejected unknown
permissions, forged source hosts, and private notes/comments remaining private.
Android release lint/build and iOS archive/export/validation passed. Native Android
UI checks confirmed Shared is initially enabled and Only me can be selected.

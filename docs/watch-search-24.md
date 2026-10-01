# Watch editions and research reliability · build 24

## Reader

The visible **Send to Watch** menu offers Original, Translation and Interlaced
excerpts from public papers. Translation modes use text already downloaded in the
reader; sending never starts a paid translation. The menu shows preparation
progress and enables each edition when its text is ready. Selected text remains
available. On iPad and Mac, the menu explains that transfer uses the iPhone paired
with the Watch.

Excerpts contain bounded prose, language labels and an AI translation label.
Figures and equations remain in the full reader. Private papers are excluded.
The Watch retains the latest three paper excerpts and supports offline reading.

## Finding and downloading

- Pasted DOI and arXiv links resolve exact records, including observed arXiv
  revisions. A different cached revision is not silently substituted.
- Known source revisions reopen their existing transcript. No new conversion is
  needed for the already available public paper.
- A combined eight-second index deadline cancels slow requests and retains results
  from providers that completed. Existing local results and cache recovery remain.
- Standalone Crossref figures and datasets are excluded from paper results.
- A source that returns 403 is not retried as the same landing URL. The existing
  source link and contextual PDF upload remain available; access controls are
  respected and failed downloading does not start transcription.

## Qualification

The universal native Mac app now supports macOS 12 and later. The 3040 (12.7.6),
7050 iMac (15.7.7), Mac mini (27.0) and KVM Mac (15.7.9) passed real public paper
search and reading, equations, figures, Chinese interlacing, text size/dark mode,
and an offline cold launch with app HTTP disabled. Tests used an isolated QA
account/cache and left existing signed-in apps untouched. Physical Mac screenshots
provide visual evidence; the KVM capture API produced black images, while its
native and rendered-document checks passed.

The paired iPhone/Watch simulator test exercised all three send choices using a
real public paper. The received interlaced shelf contains English and Chinese.
The web/server suite passed 114 tests plus the compiled renderer and build.

The server changes are deployed. All 20 existing paper records were preserved,
along with account configuration and shared ingress. Apple iOS/Watch and universal Mac 1.0.4 (24) are VALID and available to the
existing internal TestFlight group. On 1 October 2026 (Hong Kong), Mac build 24
was submitted after Mac 22 had been released. On 2 October (Hong Kong), Mac
1.0.4 (24) is publicly released with the new icon in 175 storefronts. The existing
iOS build 21 review remains unchanged. See the
[Mac release](../evidence/mac-release-20261002/receipt.json).
See the [release receipt](../evidence/watch-search-24/release.json).

# Journals and interests

Nature, Science and Cell are the starting journal selection. Saved choices stay
unchanged until the reader edits them. Recommendations continue to follow the
reader's topics; explicit paper searches are unrestricted.

Add a journal in **Tune your feed → Add a journal**, or tell Agent:

- “Add journal Advanced Photonics.”
- “Add Physical Review Letters to my journals.”
- “Remove Advanced Photonics from my journals.”
- “Add quantum imaging to my interests.”

Full journal names and ISSNs resolve to canonical OpenAlex source IDs. Ambiguous
names require a more exact name or ISSN. Aliases and repeated additions do not
create duplicate selections. A failed lookup changes nothing.

Each account can follow up to 24 journals and keep eight custom interests within
120 characters. Unselected custom journal metadata is removed on Save. There is
no growing shared catalogue of readers' searches. A bounded, one-day resolver
cache coalesces concurrent lookups; each upstream request has an eight-second
timeout and a 350 KB response limit. Names cannot supply an outbound URL.

Settings, interest onboarding, direct chat commands and model-planned edits use
the same cleanup rules. Changes use the saved preference revision so a delayed
lookup or chat plan cannot overwrite a newer edit. Paper text, quotes and file
attachments do not authorize preference changes.

## Journal metrics

Journal Impact Factors are shown with their data year and publisher source.
Seven Nature Portfolio entries use the publisher's
[2025 journal metrics](https://www.nature.com/nature-portfolio/about-journals/journal-metrics),
including [Nature's own metrics page](https://www.nature.com/nature/journal-impact).
Other values remain unlisted until verified. OpenAlex's two-year citation average
is not relabeled as Journal Impact Factor; neither the user nor a model supplies
the displayed metric.

Canonical names, source types and ISSNs follow the
[OpenAlex source schema](https://help.openalex.org/data/sources/attributes/).
Journal selection does not change access or redistribution permissions.

## Qualification

- 373 source tests, document renderer checks, TypeScript and production build pass
  using the existing Pandoc 3.11 installation.
- Real OpenAlex lookups resolved Advanced Photonics and Physical Review Letters.
- The real settings component and preference gate passed at 320, 390 and 1024 px,
  including Chinese/dark mode, duplicate additions, Cancel and Save.
- Android release Java compilation passed. Native iOS/Mac metric-label changes are
  source changes for the next cumulative native candidate, not a new uploaded build.

### Android internal build 42

OnlyIdeas 1.0.10 (42) is available in the existing Google Play internal track.
The signed release passed installation over build 41 without clearing app data.
Native instrumentation verified the dated journal metric, saving/reopening
preferences, and composer/reader continuity across rotation. Both selected tests
passed; the owned emulator and loopback fixture were stopped afterward. The
release signer matches build 41, and Play reports no reduction in supported
devices. The 373 source checks above remain the previously qualified baseline;
they were not represented as a new native or Duo test run.

The iOS/Mac 42 candidate includes the conversation-position change and is not yet
uploaded to TestFlight. Official Duo pose checks remain separate from Android
rotation tests and depend on the qualified shared Apple toolchain.

The initial full check used the older system Pandoc, which does not support
`--sandbox`; both affected conversion tests passed with the existing 3.11 binary.
The initial browser fixture had a global-name collision and omitted the settings
stylesheet. The corrected fixture passed; failed captures are retained privately.

## Deployment

The journal gate and web editor are live at [OnlyIdeas](https://agent.onlyideas.art).
Existing iOS, Android and Mac builds can add journals and interests through Agent.
The worker received only the matching preference-planner instruction update.
The deployed backend was updated from its current release with a narrow overlay;
source-only shared-account changes were not included. Live HTTPS checks verified
the new option limits, seven dated metrics, the exact web bundle and rejection of
anonymous journal lookups. Existing public update feeds were preserved.

Seventeen focused cases passed against the actual backend candidate before
promotion. A consistent database backup and prior release remain available. The
first staged candidate revealed an older server-side worker module; it was never
promoted. The replacement carries only the relevant preference-planner branch
and passed all focused checks. Store builds and review selections were unchanged.

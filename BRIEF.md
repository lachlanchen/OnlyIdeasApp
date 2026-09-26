# OnlyIdeas · product contract

Requested by Lachlan on 2026-09-26. A quiet, social research library for reading
papers, discussing passages and making ideas easier to understand across languages.

## First release

- Responsive web reader, suitable for a later iOS/Android wrapper.
- Import an open-access PDF by URL, upload one's own PDF, or import MMD/Markdown.
- Mathpix converts PDF to MMD with durable figures. One canonical MMD and a small
  metadata manifest are stored; section JSON is derived, not another canonical copy.
- Keep original equations, tables and images, readable on a narrow phone.
- Private personal library; explicit publication of rights-cleared content to
  OnlyIdeas-papers. Open access alone is not an automatic republication license.
- In-app passage discussions, persistent accounts, private notes, reading progress.
- On-request translations and cited digests through a configurable economical model
  endpoint. Cache by paper revision, operation and language. No background spending.
- Durable bounded jobs, one conversion at a time, page/byte/day caps, safe downloads,
  idempotency, visible provider availability and useful recoverable errors.
- Cloud API at agent.onlyideas.art on Huanayun; model may be served through LazyEdge
  from this workstation. Conversion/API secrets never enter a client or content repo.

## Storage and publishing

App: OnlyIdeasApp. Content: OnlyIdeas-papers. Neither name currently exists under
lachlanchen on GitHub. An older empty OnlyIdeasAPP directory and EchoMind's separate
OnlyIdeas module are preserved. Personal data uses SQLite and private content files.
Only explicitly approved public bundles enter GitHub. No private PDF is committed.
Public discussion storage starts in the app database, with a documented GitHub
export boundary; GitHub mirrors must never silently expose a private thread.

## Next release gates

Native signed builds/store registration; account moderation operations; tested
production OAuth and provider credentials; live paid conversion after bounded cost
review; accessible reader review; on-device offline downloads and sync conflicts.
The name is a repository/product working name, not a trademark availability claim.

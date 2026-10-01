# Web and PWA store access · 1 October 2026

Store opening is an explicit link tap. The web reader stays available, and links
open a new browsing context so reading state is retained. iPhone/iPad detection
includes iPadOS desktop user agents. Installed PWAs may also show the optional
suggestion; dismissing it lasts 30 days. Native app shells omit these promotions.
Desktop and mobile users can always revisit the permanent store section.

Store destinations are compiled HTTPS links for the exact app IDs. Network
responses only control availability; they cannot supply a redirect destination.
Unavailable stores show a pending state instead of sending readers to a 404.
Failed or offline checks retain the last bundled known availability.

OnlyIdeas keeps store links in **Profile → Get the app**, before the plans.
Available devices receive a dismissible library suggestion; the reading view,
agent composer and upload/sign-in flows stay clear. All 11 interface languages
include the new copy, including RTL Arabic.

`public/store-availability.json` records verified public platform availability.
Mac is enabled; iOS remains in review and Google Play returned 404. After a
platform is publicly verified, set only its boolean to true and deploy the file.
Both the permanent section and device suggestion read it without a native build.
A shared Apple app ID or HTTP 200 alone does not establish iOS availability when
only the Mac platform is released. Do not enable flags from TestFlight or review.

Validation: 114 tests, renderer, TypeScript and build; real-browser iPhone/PWA,
iPadOS desktop identity, Android and Mac routing, pending destinations, Arabic
at 320px and public-release fixture popup checks. Uses the existing Pandoc 3.11
via `ONLYIDEAS_TEST_PANDOC` for the document conversion tests.

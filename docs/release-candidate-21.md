# OnlyIdeas 1.0.2 (21) — visible plans

Build 20 incorrectly hid the entire subscription section behind purchase and
credit rollout flags. Profile now has a persistent **Plans & usage** entry on
iOS, Android, Mac Catalyst and PWA, including before sign-in. Plans stay visible
when store products or checkout are unavailable. Preview prices are explicitly
labeled; enabled native purchases still use actual localized store prices.
The PWA plans section is independent of the credit pilot. Native error states
show a retry action instead of disappearing.

The public catalog returns plan descriptions and quotas only. Signed-out users
receive no account token, credit balance, quota usage or subscription history.
Purchasing, restoring and entitlement changes retain authenticated provider
verification and the existing rollout gates. No paid activation or database reset.

Approved monthly prices are US$2.99 / $14.99 / $29.99, with 200 / 1,200 / 2,600
transcription pages and 60 / 300 / 700 fetches. Eligible seven-day trial remains
staged until real sandbox qualification. Existing papers and cached translations
remain free. All new interface text is localized in 11 languages.

## Verification and availability

102 tests passed, including anonymous plan discovery with protected checkout and
no account-row creation. Renderer and production web build passed. Signed Android
build and release lint passed; real native Profile → Plans shows all three plans.
iOS XCTest confirms the visible entry and disabled coming-soon purchase actions.
PWA/server deployed with original papers, credits, holds and config preserved.
Physical Mac mini plans presentation also passed; signed iOS/Watch and universal
Mac archives are built. Android 21 is available internally and iOS 21 is VALID in
TestFlight. Mac processing and formal review replacement are in progress.

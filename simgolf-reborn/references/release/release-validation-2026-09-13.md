# Release validation — 13 September 2026

## Executed checks

- Thirteen account-screen checks pass, including sign-in invitation preservation,
  save isolation, logout across tabs and a simulated medals-service outage.

- Eight authenticated local D1/browser integration tests passed: cooperative
  edits, reload/reconnect, spectator permissions, immutable publication practice,
  registration, two entrants completing rounds, withdrawal and earnings isolation.
- Hosted review deployment `2074bece-bb1f-4943-bc41-cc52e53f9b6b` uses the
  production gameplay source with a separate database and test identities.
- A new server-created protocol-91 course was published. Two independent Chrome
  contexts (desktop and phone viewport) accepted an invitation, downloaded the
  calendar entry, waited for the scheduled start, completed rounds across reload,
  and received persistent standings/medals. No browser page errors occurred.
  Both players completed in three strokes. See the adjacent multiplayer JSON.
- Ten daily-accounting tests pass, including the corrected training-spend metric.

## Fixes

Training facility payments were recorded in income but omitted from average
visitor spending. Current visitor rules now include those payments in the daily
spend total. Helicopter landing charges remain resort income rather than direct
player purchases. The new test covers both distinctions.

A failed medals request previously prevented tournament registration and
invitation details from loading. Registration now remains usable and shows a
medals retry message. Tests explicitly simulate the failed endpoint.

The hosted harness now creates a fresh publication with the current ruleset on
all runs, avoiding a false pass from replaying an older saved course.

## Economy observations

The same prepared two-hole course ran for three days with and without a
Groundskeeper. These are diagnostic scenarios, not a representative balance study.
The staffed scenario completed 75 rounds, ended with two weed patches, and had
positive operating results. Without maintenance, 64 rounds completed, weeds
reached the 180-patch cap, and signed happiness refunds produced large losses.
See `economy-validation-2026-09-13.json` for complete daily figures. Construction
costs are included in day-one net cash flow. No fee or wage constants were changed
from this single comparison. Onboarding should make maintenance and refund risk
clear before final release acceptance.

## Limits

Phone viewport testing is not physical-phone performance testing. Hosted test
sessions exercise authenticated authorization and gameplay, not Apple/Google
OAuth consent on a real user account. Production player saves were not changed.
Final physical-device and production OAuth acceptance remain open.

## Production publication

Fixes from `9ab4c8b` deployed to `simgolfer.0x4d.in` as Cloudflare version
`2ec92ffd-ccbb-4c98-85e2-62baba43c698`. The final hosted multiplayer rerun
uses the same game source. No production player data was changed by testing.

# Fairway Baron — remaining work and release status

This checkpoint includes regional/audio work and recovered-runtime integration through `9ab4c8b`.
The package version `1.0.0` names the earlier playable rebuild; it is not a claim
that the complete game or original-game parity is finished. The older dated
entries in [backlog.md](backlog.md) retain implementation history. This checklist
summarizes what still remains; it does not replace the requirements in
[whattobuild.md](whattobuild.md).

## Deployed preview, with remaining acceptance checks

- Green/gold opening flow, dialogs and controls; new-game preview rendered by
  the game, with camera rotation and zoom.
- Eight-minute daylight, ten-second night, saved daily accounting and reports.
- Helicopter, boat and aircraft visits with passenger follow-through.
- Shared-computer sign-out and account-owned saves in the account-backed game.
- Distinct Tropical palms, turquoise coast, clubhouse and hotel; Links scrub,
  dry ground and clubhouse. Regional planted trees and collision sizes follow
  the environment. False shoreline strips at map edges are corrected.
- Regional snack bars, pro shops, homes, marina buildings, cart garages, swim
  pavilions and range shelters; building caches refresh on regional/layout changes.
- Contact, putt, cup, rotor and occasional birdie-applause recordings with credits.
  Coastal ambience has its own saved volume control. Speech, other ambience and
  final listening/mix review remain open.
- Local cooperative building, course publications/history, earnings competition
  and asynchronous tournament implementation with authenticated integration tests.

Production was updated on 2026-09-13 from game commit `9ab4c8b` at
https://simgolfer.0x4d.in/. Cloudflare version:
`2ec92ffd-ccbb-4c98-85e2-62baba43c698`. No new database migrations
were required; migrations 0004–0011 were applied in the earlier deployment. The live login loaded without browser errors and all 25
JavaScript/CSS assets matched the local build exactly. Authenticated production
play and physical-device acceptance remain separate release gates.

The game and deployment documentation were pushed successfully to
`codex/simgolf-reborn-v1` after GitHub workflow permission was refreshed.
Repository CI is active. The release validation pass adds account and multiplayer
checks to CI; see [validation evidence](references/release/release-validation-2026-09-13.md).

## Deployed gameplay integration

Protocol 90 adds recovered draw/fade motion and velocity-driven ground release,
contour-aware live putting, and golfer targeting that predicts full flight and
roll. New games use this version; old saves and version-89 course packages retain
their previous motion. This motion is included in the deployed preview.

Protocol 91 connects recovered routing costs, remark history/selection/outcomes,
and nearest-facility search/service payments to live visitors. Complete rounds
now exercise these together with shots, release, putting and score settlement.
New games enable the new visitor rules; older saves and published courses retain
their rules for replay compatibility. This is included in the deployed preview.
See [visitor integration evidence](references/release/live-visitors-2026-09-13.md)
and [motion evidence](references/release/live-shaped-motion-2026-09-13.md).

## Remaining completion checklist

- [x] **Connect the core live gameplay loop.** Shots, putting, reactions,
  routing, facility visits and completed rounds run through tested live adapters.
- [ ] **Finish original-game fidelity and audio acceptance.** Live world scale,
  service durations, some incident triggers and sound presentation remain browser
  adaptations. This checkpoint does not establish bit-for-bit retail parity.
- [ ] **Complete original career progression.** SGA evaluation, eligibility,
  rankings, tournament prizes, accomplishments, progression and retirement.
- [ ] **Complete resort fidelity.** Original facility gates/upgrades, staff
  experience and behavior, membership/housing/celebrity rules and remaining
  stories; verify visitor-flow and economy tuning.
- [ ] **Finish worlds and presentation.** Full tropical island composition,
  remaining regional resort architecture, original properties/theme choices,
  richer atmosphere and audio coverage, final owner visual review.
- [ ] **Activate and verify remaining account providers.** GitHub owner
  verification, Apple/Microsoft credentials and email delivery; complete hosted
  account lifecycle checks.
- [ ] **Finish multiplayer release gates.** Hosted multi-device sessions,
  physical-device acceptance, capacity and resource measurements. Scheduling,
  invitations, reload, two entrant rounds and persistent awards passed on the
  isolated hosted deployment; see the September 13 validation evidence.
- [ ] **Complete release stability assessment.** Broad regression on the final
  revision, prolonged hosted sessions, physical-phone performance, reconnect,
  save migration and recovery.
- [ ] **Audit original-game requirements F01–F12/P01–P20.** Record evidence and
  remaining differences for each requirement before claiming parity.
- [ ] **Publish a reviewed release.** Reconcile remaining dirty work, verify
  CI and the final repository revision, then deploy and smoke-test the actual
  hosted revision. Production contains `9ab4c8b`; GitHub permissions are fixed.
  Expanded remote CI failed on software-rendering timing and job limits;
  run `34765776218` is not green. The rendering fallback remains undeployed.

## Evidence and limitations

- [Regional appearance, palms, coast and resort checks](references/release/regional-environment-appearance.md)
- [Day/night accounting](references/release/day-night-cycle.md)
- [Shared-computer account switching](references/release/account-switching.md)
- [Actual-renderer interface and preview](references/release/fairway-baron-interface.md)
- [Aircraft visits](references/release/aircraft-visits.md)
- [Live putting and recovered-engine integration gap](references/observations/live-putting-gap.md)
- [Latest broad live stability assessment](references/release/ruleset-85-live-regression.md)

The latest regional/audio full local rerun passed 523 checks with five explicit
private-reference skips (528 total, 5.7 minutes). The private-reference suites
also passed separately with local files available. This is not a hosted stability
assessment. Original-engine modules remain separate from the
live simulation until their integration is explicitly verified.

The 2026-09-13 release run reported all 559 live cases passing, but hung during
worker shutdown and was interrupted. This supersedes the older local test count
above without claiming a clean full-suite exit. See deployment evidence.


Latest source validation (`1debf6d`): **578 live tests passed with a clean exit**
in 7.2 minutes locally. Linux CI remains failing, as detailed in the
[September 13 validation report](references/release/release-validation-2026-09-13.md).
This supersedes the older interrupted local-run count above.

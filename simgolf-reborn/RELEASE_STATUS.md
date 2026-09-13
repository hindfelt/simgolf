# Fairway Baron — remaining work and release status

This checkpoint includes regional/audio work and recovered-runtime integration through `c9ad46e`.
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

Production was updated on 2026-09-13 from game commit `c9ad46e` at
https://simgolfer.0x4d.in/. Cloudflare version:
`e6a699e2-49b9-4a3d-9486-48928624dd61`. Database migrations 0004–0011
applied successfully. The live login loaded without browser errors and all 25
JavaScript/CSS assets matched the local build exactly. Authenticated production
play and physical-device acceptance remain separate release gates.

The game changes are committed locally. GitHub rejected the branch push because
the `hindfelt` OAuth credential lacks `workflow` scope; the active
`trihack_admin` credential has no repository write access. The newer CI workflow
has therefore not run remotely. Unrelated dirty workspace files are excluded.
See [deployment evidence](references/release/production-deploy-2026-09-13.md).

## Remaining completion checklist

- [ ] **Adopt the recovered simulation in live gameplay.** Finish current-world
  map/effect bindings, shot planning, putting slopes, motion, audible reactions
  and completion. Isolated native comparisons do not prove live adoption.
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
  scheduling and awards, invitation flows, full event completion, capacity and
  resource measurements. Local shared-building tests are not production proof.
- [ ] **Complete release stability assessment.** Broad regression on the final
  revision, prolonged hosted sessions, physical-phone performance, reconnect,
  save migration and recovery.
- [ ] **Audit original-game requirements F01–F12/P01–P20.** Record evidence and
  remaining differences for each requirement before claiming parity.
- [ ] **Publish a reviewed release.** Reconcile remaining dirty work, verify
  CI and the final repository revision, then deploy and smoke-test the actual
  hosted revision. Production now contains the committed game; GitHub publication
  and remote CI remain blocked by credential scope.

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

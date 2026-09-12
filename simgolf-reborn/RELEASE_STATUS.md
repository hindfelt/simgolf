# Fairway Baron — remaining work and release status

This is the current local development checkpoint following commit `06457df`.
The package version `1.0.0` names the earlier playable rebuild; it is not a claim
that the complete game or original-game parity is finished. The older dated
entries in [backlog.md](backlog.md) retain implementation history. This checklist
summarizes what still remains; it does not replace the requirements in
[whattobuild.md](whattobuild.md).

## Implemented locally, awaiting hosted release verification

- Green/gold opening flow, dialogs and controls; new-game preview rendered by
  the game, with camera rotation and zoom.
- Eight-minute daylight, ten-second night, saved daily accounting and reports.
- Helicopter, boat and aircraft visits with passenger follow-through.
- Shared-computer sign-out and account-owned saves in the account-backed game.
- Distinct Tropical palms, turquoise coast, clubhouse and hotel; Links scrub,
  dry ground and clubhouse. Regional planted trees and collision sizes follow
  the environment. False shoreline strips at map edges are corrected.
- Local cooperative building, course publications/history, earnings competition
  and asynchronous tournament implementation with authenticated integration tests.

These statements describe local code and recorded tests, not deployed features.
The latest changes have not been pushed or deployed. A fresh remote comparison
and deployment inspection are required before publishing a release.

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
  repository sync, push the release branch and documentation, then deploy and
  smoke-test the actual hosted revision.

## Evidence and limitations

- [Regional appearance, palms, coast and resort checks](references/release/regional-environment-appearance.md)
- [Day/night accounting](references/release/day-night-cycle.md)
- [Shared-computer account switching](references/release/account-switching.md)
- [Actual-renderer interface and preview](references/release/fairway-baron-interface.md)
- [Aircraft visits](references/release/aircraft-visits.md)
- [Live putting and recovered-engine integration gap](references/observations/live-putting-gap.md)
- [Earlier broad live stability assessment](references/release/ruleset-83-live-regression.md)

The earlier broad assessment predates rulesets 84/85. The regional changes have
focused verification and successful builds; they have not received a new full
hosted stability assessment. Original-engine modules remain separate from the
live simulation until their integration is explicitly verified.

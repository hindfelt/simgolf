# Live simulation integration — 12 September 2026

## Implemented locally

Newly created games carry `liveSimulationVersion: 1`. Actual golfer shots call the recovered club selector, using explicit integer-yard conversion from the live world's four yards per render unit. Airborne flight, dispersion and terrain release still use the browser model; adding club selection does not make those native physics.

Eligible automatic putts use recovered aim, strength search, ground motion and cup capture. The adapter requires a flat green corridor and checks every subsequent position against the live green, height, trees and out-of-bounds markings. The legacy projected landing cannot assign a water penalty to a recovered putt. The original local coordinate frame uses 1024 units per 25 yards; the 45×72 live world is not rescaled into the original 50×50 grid. Putts stop at unsupported surface transitions; arbitrary slopes, obstacles and hazard transitions are not integrated into this component.

The ten-entry strength cache is shared across golfers and serialized. Green motion consumes the live simulation RNG and shared time phase. Original airborne searches are not yet included in that cache, so its complete retail ordering is not reproduced. Profile skill conversion and pro capture policy are explicit browser adaptations; native attitude is neutral because current fee happiness is not the original attitude byte. The preceding browser landing draws still exist. These boundaries preclude a full original parity claim.

Native putts score on recovered cup capture rather than the old 0.75-unit proximity rule. The existing 12-stroke pickup rule remains. Manual aiming remains disabled during automatic putting.

Protocol 88 identifies this model. Older saves without the field retain browser shots. Older published course rulesets produce legacy-model tournament rounds, preserving their pinned behavior. No existing user's save is silently upgraded to the new model.

## Evidence

`tests/live-original-integration.spec.js` exercises:

- Automatic live putting and exact state equality after a mid-roll save/reload.
- A paid visitor round using the recovered club selector through score and fee settlement.
- Conservative fallback for a sloped green.
- Legacy save behavior and rejection of malformed motion/cache state.
- A stopped ball inside the previous gimme radius remaining in play.
- The actual browser game loop completing a putt and displaying the round result without JavaScript errors.

The focused integration suite passes all six tests. Account/server checks pass 82 tests with one capacity test intentionally skipped; the production build passes with its existing large-chunk warning. All 544 gameplay/browser tests pass. This run includes every top-level `tests/*.spec.js` except `original-*` native-emulation suites; it does not claim a full 1,421-test native-plus-browser run. These are local results; this change has not been deployed or pushed.

## Remaining delivery sequence

### September 13 integration follow-up

Flight animation, tree collision sampling, aiming and shot analysis now share the same airborne sampling function. Ground release animation and aiming also share a sampler. This preserves existing browser flight arithmetic; it does not replace it with recovered airborne physics. The focused flight/preview/tree/replay/integration run passed 20 tests.

Flat recovered putting previews now step the same native-green motion and boundary checks as live play, using a copied clock, RNG and strength cache. A regression checks each preview point against the actual live ball and verifies no preview mutation. All eight preview/live-integration tests and the production build pass. Simultaneous golfers can consume shared RNG after a forecast, so a preview is not a guarantee of an identical future result. These changes remain local.

1. **Live integration:** explicit original map and actor bindings for flight/collisions, sloped putting, full reaction state, walking routes and facility visits; verify complete rounds and resort visits, not only native fixtures. Do not infer packed fields from similarly named browser UI values.
2. **Career:** connect measured SGA inputs, accreditation, rankings, prizes, accomplishments and retirement. Current challenge wagering and early accomplishments do not complete career progression.
3. **Resort:** facility upgrades, staff experience, membership/housing/celebrity follow-through and visitor spending. Distinguish original measured rules from product balance choices.
4. **Worlds/polish:** finish lush tropical composition, remaining regional buildings, sound coverage and desktop/phone visual review.
5. Reassess stability across complete careers, long resort sessions, save migrations, hosted reconnect and physical devices.

The four requested areas remain open. This checkpoint closes only the initial club-selection/flat-putting live integration slice.

## Local soak

The existing `node scripts/stability-soak.mjs` scenario ran 7,260 simulated seconds, completing 320 rounds with 12 reload cycles and nine $200 helicopter landing charges. After the reload sequence, another minute of uninterrupted and restored simulation matched exactly. This exercises the live resort loop; it is not hosted or physical-device verification. [Machine-readable result](live-simulation-soak-2026-09-12.json).

The broad run also exposed stale tests for guaranteed long-putt success, old-course replay setup, and pre-variation coastlines. Cart collection now uses a short tap-in; legacy competitions are created with old pinned rules before playing; coast tests use the saved generation and construct an explicit water ring for the island route scenario. Assertions still require cart behavior, identical replay, continuous banks and playable bridge access.

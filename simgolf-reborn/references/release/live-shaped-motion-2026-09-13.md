# Live shaped motion and ground release — 2026-09-13

Ruleset `live-native-shaped-release-2026-09-13`, protocol 90. New games use
`liveFlightVersion: 2`. Existing version-one saves and published version-89
course packages retain their previous motion; no active tournament is silently
changed to the new physics. These changes are local, not the deployed preview.

## Live behavior

- Straight, draw, fade, punch and backspin shots use the same sampled airborne
  trajectory for rendering, preview and tree collision. Recovered shape code
  supplies the draw/fade speed boost and curvature; recovered position, gravity
  and air response advance the flight.
- Version two allocates 80% of the requested shot distance to airborne travel,
  matching the recovered launch allocation now that impact velocity carries
  into ground release. Version one's full-carry calculation remains unchanged.
- Live accuracy dispersion is preserved below the native integer-cell precision.
  Otherwise per-tick truncation erased the measurable benefit of accuracy
  training. Training and ballwashing checks retain strict improvement assertions.
- Ground release carries impact velocity into recovered bounce, position and
  ground-response arithmetic. It samples crossed surfaces and sweeps short
  segments against water, out-of-bounds areas and tree trunks. The release has
  its own duration, replacing the fixed 1.8-second animation.
- Golfers predict full flight and roll before choosing their approach. They
  compensate for short carry and consider safe alternatives when the forecast
  hits water, a boundary or a tree. Planning uses independent dispersion samples
  and never consumes the live round's next RNG outcome.
- Sloped, uninterrupted greens use native rolling/cup capture with explicitly
  marked live contour forces. Flat greens retain their recovered behavior.
- Flight, release and putting survive mid-shot saves; previews do not alter
  authoritative state. Version checks preserve older course-package behavior.

## Explicit adaptations and remaining original-game integration

The live terrain surface coefficients, soft-ground absorption, punch/backspin
height and spin strength, profile skill weighting, contour-gravity force and
50 ms host timing are browser-world bindings, not verified retail constants.
The trace is prepared at launch; terrain edits do not resimulate a ball already
in flight. Tree impacts still use the live collision/drop policy. Putting that
cannot use an uninterrupted green still has a fallback; green-edge handling
remains conservative.

The tactical planner, incident deduplication and golfer remarks, walking-route
search, facility selection/training and service economy remain the live game's
policies. This change tests their end-to-end operation with recovered motion;
it does **not** claim that the complete recovered actor/reaction/routing/service
state machine has been adopted. Those bindings remain on the release checklist.

## Regression fixture changes

- Landing/roll timing tests now sample the actual release duration.
- A longer real course supplies the length-skill advantage needed for the
  challenge award; native motion changes the cohorts on the old shorter layout.
- Ordinary golfers are expected to avoid a forecast tree collision with a
  straight layup; imagination still permits the curved alternative.
- The personality test verifies signed fee settlement and exact ledger totals.
  A difficult rough course can refund unhappy players, so positive fees are not
  a valid invariant of personality compatibility.

## Verification

- Full live regression: **569 passed**, clean exit, 3.6 minutes.
- Focused motion/contour/old-course compatibility suite: 10 passed.
- Two-hour live resort soak: 7,260 simulated seconds, 298 completed rounds,
  298 facility visits, nine helicopter landing fees and 12 reload cycles.
  Both holes received shots and completed rounds. Mid-flight, mid-release and
  mid-putt replay comparisons matched the uninterrupted simulation exactly.
  [Machine-readable soak result](live-shaped-motion-soak-2026-09-13.json).
- Local Node simulation timing over 6,000 ticks: p95 0.059 ms, p99 0.601 ms,
  maximum 35.3 ms. This excludes rendering and is not a physical-phone result.
- A Chrome render check loaded the active draw-shot game without page errors.
- Production build passed (existing large-chunk warning). Account/server checks: 82 passed, one explicit capacity skip.

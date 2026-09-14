# Straight-flight live integration — September 13

New games enable `liveFlightVersion: 1`, alongside flat-putting integration. Straight airborne shots use recovered launch-base vertical velocity, strength-search cache, fixed-point position stepping, gravity and air drag. The landing point comes from this motion, rather than the old chosen-distance parabola. Live animation, aiming, analysis and tree intersection read the same sampled path. The host uses 50 ms logical motion steps, as for flat putts; this is not a recovered wall-clock timing claim. Flights survive midair save/reload. Samples are prepared at launch; later terrain edits do not resimulate an airborne shot.

The live planner supplies carry distance, whereas the native launch base budgets only 80% for air travel before native release. The adapter therefore runs the recovered strength solver for the full requested carry while browser release remains in place. This is an explicit binding policy; retaining the 80% budget here made shots too short.

## Boundaries

This is partial integration. The horizontal binding preserves 1,024 fixed units per 25 yards. Browser elevation uses the same render-unit conversion as horizontal distance; this is an explicit adaptation, not a claim that browser terrain is the native height grid. Browser skill/range, initial accuracy draws (kept at full angular precision after base-direction conversion), tree collision/drop policy, hazards and post-landing bounce/roll remain. Draw, fade, punch and backspin retain their prior trajectory until their launch policies are bound. Full native launch variation, actor flags and impact response remain unfinished.

Air and putt searches now share the saved ten-entry cache. The entire native RNG/cache ordering is not reproduced. Original airborne phase tests still exercise the extracted arithmetic through the original caller.

Protocol 89 pins the new model. Existing saves without the flight marker remain unchanged; older published courses explicitly omit it, including protocol 88 courses. Both planted and natural tree contacts are covered. Native trunk impacts stop just outside the solid trunk, keeping the dropped ball reachable instead of imposing a spurious unplayable penalty. Legacy shape-selection fixtures retain their old model because a lower native straight flight can already clear their canopy obstacles; current-model tactical avoidance is separately tested.

## Verification

- New flight tests cover actual sampled motion, preview non-mutation, malformed saves, midair replay and browser-loop completion at the calculated endpoint.
- Targeted gameplay, original-air-phase and course-package checks passed.
- Production build passed with its existing large-chunk warning.
- Expanded 7,260-second soak completed 302 rounds, 304 services and nine helicopter landing fees. Twelve reload cycles and separate midair and mid-putt continuations matched exactly. See the [machine-readable result](native-flight-soak-2026-09-13.json).
- The clean wider run passed 553 gameplay/browser tests and exposed five trajectory-fixture/contact failures. After correcting those, all 21 affected flight, collision and planner tests passed, including an additional native trunk-contact check. The full wider suite was not repeated after that final contact correction.
- All 82 account/server checks passed; the capacity check remains skipped.
- Accuracy/training, approach reactions, old protocol 88 replay and coastal rounds were also checked after the carry/precision corrections. Earlier overlapping browser runs suffered a development-server shutdown and are not counted as successful runs.

This work is local, not pushed or deployed. Career, resort depth, remaining worlds, accounts and release verification remain open after the remaining live integration.

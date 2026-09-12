# Live putting integration gap — 12 September 2026

Run `node simgolf-reborn/scripts/audit-live-putting.mjs` from the repository root. The adjacent JSON is generated from current live `takeShot` and the recovered cold-cache strength helper.

## Measured behavior

Twelve flat ordinary-green NPC samples (2/5/10/20 yards, three seeds) all plan an endpoint at the cup within floating-point noise (maximum 1.07e-14 world units), zero apex/curvature and a fixed 1.3-second duration. This is the planned path, not a measurement of cup capture or all shots. The fixture removes facilities/height changes and retains a real spawned golfer.

The live code chooses the cup instead of the supplied target for putts, gives ordinary NPC putts zero dispersion, computes a final endpoint, and animates toward it. `groundRoll` handles crossed terrain and obstacles but consumes a distance budget rather than the original fixed-point velocity. The live downhill bias also differs from the recovered rule that green-origin ground response resets directional slope terms.

The recovered helper gives distance-dependent integer launch speeds and a final random strength adjustment. Its seed is positioned at that final draw. Equal numeric seeds in this diagnostic are NOT equivalent full shot histories and the output is not an original-versus-browser accuracy statistic.

## Required integration boundary

1. Carry original fixed-point position, speed, vertical speed, heading, curvature phase, strength cache and RNG through the complete shot state, not only an endpoint.
2. Use the existing recovered strength cache and launch caller, with original shot-planning RNG ordering. Do not substitute the cold-cache helper for every shot.
3. Compose position, ground response, curvature, cup capture, bounce and stop ordering against the real terrain/flags adapter. Ordinary/tricky green flags must affect this same path.
4. Render sampled authoritative positions and derive shot previews from a cloned state using the same integrator; do not maintain a second visual-only physics path.
5. Pin a new ruleset and migration policy before changing live play, including server rounds and saved mid-shot state. Preserve old tournament replays under their existing semantics or reject them explicitly.
6. Verify flat and tricky greens, boundary/hazard/obstacle crossings, slow/fast cup passes, repeated save/reload and cross-client replay, against the executable at the full composed boundary.

This investigation does not change gameplay or close F03/F04. It identifies why adding only a tricky-green button or tweaking dispersion would not meet the requested original-game behavior.

## Resumable flat-green component

`original-flat-putt.js` now composes the recovered position, ground response, cup and stop helpers for grounded putter launches on an uninterrupted flat green. It accepts an already-prepared launch, rather than silently running a fresh strength cache. Each step requires the world's unsigned phase counter and current RNG state, returning the resulting RNG state and draw count for the next world operation. Its `steps` field is diagnostic only; it does not drive curvature timing. This prevents each golfer independently resetting the phase or hiding intervening world RNG draws.

Eight focused component/strength checks pass: straight 2/5/10/20-yard capture fixtures, exact JSON resume, persistent curvature, immutable inputs, airborne rejection, unsigned phase wraparound, external RNG handoff and terminal no-draw behavior. These are composition checks, not a native full-update comparison. The pre-movement cell sample at tile crossings, complete launch caller, world timing, terrain transitions and collision ordering still require full executable comparison before live adoption. The component is not imported into live gameplay, and the twelve-sample live fidelity gap remains open.

### Native cell/cup boundary verification

Run `PYTHONPATH=/tmp/simgolf-binary-tools python3 simgolf-reborn/scripts/verify-original-putt-cells.py`. The verifier checks the executable SHA-256, executes `0x4285bb–0x4285ff` to obtain the actual pre-movement cell locals, then executes `0x42c354` through capture/rejection with supplied post-movement positions. Its map-validation and distance routines execute unchanged; sound and scoring callbacks are stubbed. All 360 cases match the JavaScript cup helper, including three starting cells, strict radial thresholds, speed 319 versus 320 and both event-flag values. Deliberately large cell-crossing probes establish local-variable behavior; they are not claims about achievable single-tick putt displacement.

This resolves the cell-sampling uncertainty above: the original stores X/Z shifted by 10 in stack locals before movement and uses those same locals in cup detection. It does not verify intervening collision/bounce paths, native timing, scoring callbacks or the entire composed update. Those remain required for live adoption.

### Native composed flat rolls

`verify-original-flat-putt.py` executes native pre-movement cell sampling, position integration, ground response/curvature, cup capture and the stop predicate/zeroing branch. The executable initializes its own projection table and executes its RNG, clamp and distance routines. Flat slope sampling returns zero; audio/scoring callbacks are stubbed. The verifier explicitly sequences these blocks, so it is not evidence for the omitted intervening collision paths or the whole game caller.

160 rolls (7,187 updates) match position, height, velocity, heading, curvature, RNG and terminal status exactly. Cases vary launch direction/strength, curvature sign, drag coefficients, event flags and shared phase including wraparound; intervening external RNG state changes and JSON round-trip after every JS step are included. The comparison caught and fixed residual speed at rest: native `0x42ca97` clears it to zero after the stop predicate passes. Full world timing, launch integration, actual course terrain and scoring transitions remain outstanding.

### Live terrain-edge sampling

`original-motion-sample.js` recovers `0x42beb0–0x42bf82`. It samples post-movement 1/16-tile coordinates while reading neighbors relative to the pre-movement tile locals. Near each differing terrain edge it retains separate bits: negative X=8, negative Z=1, positive X=2, positive Z=4. The direction is the original signed heading rounding into eight directions. Original AI candidate sampling reduces boundaries to a boolean and must not replace this live mask.

`verify-original-motion-sample.py` executes the original instruction block for all 256 subcell positions and 16 neighbor/direction combinations: 4,096 matching outputs. Probe positions deliberately occupy different tiles from the stored cell locals. Two focused tests cover the queried neighbor coordinates, positive/negative edge masks, no queries in tile interiors and signed direction wraparound. Original map-edge storage remains an explicit caller responsibility; no clamping is invented. This helper is ready for the pending general terrain/collision integrator but does not yet change live browser shots.

### Ground contact and crossed-edge reflection

`original-ground-contact.js` recovers the live blocks `0x42c27b–0x42c354` and `0x42c480–0x42c523`. Terrain code 17 halves speed away from differing-terrain borders. Code 10 halves speed in the centre or centre strips extended into matching neighbors; it preserves the caller's existing centre flag. Cup capture occurs between this slowdown and reflection, so a successful cup check must skip reflection. Reflections read the old cell's edge byte: X uses bit 4 for positive displacement and 64 otherwise; Z uses bit 1 for positive cosine projection and 16 otherwise. Z projection is subtracted from the coordinate, so its sign must not be confused with Z displacement. Two crossed edges apply sequentially.

`verify-original-ground-contact.py` compares 5,000 randomized contact and reflection states against the original instruction blocks, including native branch instrumentation for each reflection. All match. Two focused regressions cover adjacent-strip slowdown, boundary suppression and both-axis reflection/sign behavior. These helpers do not resolve airborne obstacles, world terrain adapters, scoring or live integration.

### Shared ground phase composition

`original-ground-phase.js` now joins motion-edge sampling, friction/slope/curvature, surface slowdown, cup capture and crossed-edge reflection, in that order. It takes a terrain adapter with original cell metadata and directional slope samples. The old cell supplies terrain/cup/edge data; the moved position supplies slope coordinates. Capture skips reflection. Bounce, hazards, stop/scoring and the airborne branch remain caller work.

The existing flat-putt component now delegates to this phase instead of keeping a separate ground/cup path. All 160 native flat rolls / 7,187 steps still match after this refactor. Eight targeted tests pass, including contact-before-capture, old-cell metadata versus new-position slope sampling, reflection order and rejection of airborne input. General-course/native composed comparisons remain necessary beyond the flat fixture; live browser shots still use the old motion model.

### Airborne phase

`original-air-phase.js` recovers `0x42bf91–0x42c135`, composing terrain-relative height adjustment, airborne drag and curvature with the recovered obstacle-height sampler. It preserves obstacle-height RNG draws even when the prior-hit flag suppresses another deflection. Eligible obstacles apply the native distance/luck gate, deflection, speed reduction, effect draw and hit flag. Raw original skill/state fields remain explicit inputs, rather than inferred browser skill mappings. Gravity/position precede this phase; bounce/hazard/stop/scoring follow it.

`verify-original-air-phase.py` executes the original block and original obstacle/RNG/distance helpers for 3,000 cases. Supplied terrain-height samples replace only the height callback; sound/stat callbacks are no-ops. Ball state, hit flag, effect selection and RNG draw counts all match. Three focused tests verify terrain height/drag, RNG consumption after an earlier hit and a central obstacle impact. This completes the recovered airborne phase, not the full world shot caller or its live integration.

### Post-rebound response

`original-impact-response.js` recovers `0x42c648–0x42c815`: deferred reverse/half-speed flags, slope-induced heading/horizontal/vertical changes, metadata scattering and current-terrain code 17 stopping away from boundary flags. Unlike the candidate simulator, reversal does not add an extra speed RNG draw, and slope response is not guarded by its candidate skill mask. Native flow reaches this block only after an actual rebound/landing (`height<=0 && verticalSpeed<0` before rebound); ordinary rolls and airborne ticks bypass it. Later rock/luck/social effects remain separate work.

3,000 states match `verify-original-impact-response.py`, including native slope callback direction/order and RNG draw counts. Height-independent slope and current-terrain samples are stubbed to the supplied values; original arithmetic, clamp and RNG execute natively. Two focused regressions cover deferred flags, scattering-before-terrain-stop and boundary suppression. This is not yet a complete shot update.

### Landing deflections and assembled motion step

`original-landing-deflection.js` recovers `0x42c815–0x42c9ea`, including rock deflection, the reduced skill-enabled spread, sound selection and the luck gate/near-cup heading correction. The heading correction retains signed 32-bit wrapping before division. `verify-original-landing-deflection.py` compares 3,000 native states using original RNG, distance and inverse-heading routines; all match, including effect branches.

`original-motion-step.js` assembles position/gravity, terrain sampling, air or ground phase, rebound, landing-only impact response/deflection and stopping. It returns explicit sounds, terrain-stop and luck outcomes plus a nearby-golfer-check request instead of mutating presentation or other golfer state. A capture exits before rebound. Ordinary rolling ticks bypass landing-only scattering. Two integration tests demonstrate a flight/landing/roll-to-rest sequence with JSON resumption after every step and no landing RNG on an ordinary roll.

This assembled step still needs a full native composed oracle, actual terrain adapter, launch/scheduling integration and caller handling for score/stat/social outcomes. Nearby-golfer checks are requests, not implemented social updates. It is not yet used by live browser shots. The original tricky-green post-rebound negative-velocity test remains unreachable under the verified nonnegative rebound result.

### Continuous native motion verification

`verify-original-motion-step.py` now executes the continuous original block from `0x42bdc3` through its motion exit/stop, after the original cell-local sampling. Unlike the earlier block composition, native branch flow chooses air/ground, impact, deflection and stop order. Original projection initialization, map, RNG, obstacle, distance and inverse-heading helpers execute. Flat height/slope samples and presentation/scoring callbacks remain controlled replacements.

All 120 complete trajectories / 4,668 updates match the assembled JS step across five uniform terrain codes (1, 10, 12, 13, 17), different initial height/vertical speed/heading/curvature and skill-enabled states. The verifier compares ball fields, persistent flags/centre local, RNG state/draw count, capture/stop decisions and sound events, with JS serialization after every update. Every trajectory must reach a terminal state within the limit. This establishes continuous ordering on these fixtures; mixed terrain, map edges, elevation geometry, actual launch scheduling and social/scoring integration remain unverified.

### Mixed-terrain continuous verification

The continuous verifier now includes 120 additional trajectories over alternating terrain codes and marked crossing edges. All 240 complete trajectories / 8,889 updates match, with 160 mixed-terrain tile crossings explicitly counted. This comparison found a missing emitted sound for edge reflections; the motion step now emits sound 6 for each reflected axis in native order. A regression exercises two reflected axes and expects two events. Heights/slopes remain flat controlled samples; elevation geometry, real map-edge behavior and live integration are still open.

### Elevation adapter and continuous geometry verification

`createOriginalMotionTerrain` now connects live original cell/corner/vertex readers to the recovered physics-height and slope functions. It rereads geometry so course edits do not leave stale samples. This accepts original data; mapping browser construction tiles into that data remains separate work.

The native verifier now runs original height and slope routines, supplying corner/vertex fixtures instead of stubbing final flat samples. The additional 120 elevated mixed-terrain trajectories brought the total to 360 complete trajectories / 14,166 updates / 373 mixed-terrain crossings, all matching. Elevation exposed a real signed-speed case after landing-slope response: air/ground validation incorrectly rejected negative horizontal speed even while a ball was still airborne. Both phases now retain the original signed arithmetic. Eight targeted tests pass, including signed velocity and terrain edits. The fixture is a stepped height field, not every possible original map or browser course; map edges, real data mapping, launch/scheduler and social/scoring integration remain open.

### Planning and motion map connection

`originalShotMap` now exposes `motion`, backed by the same terrain, marks, derived edge masks, cached corner heights and raw height reader used by recovered planning. Motion terrain coefficients use the same metadata revision. Neighbor reads preserve the original flattened terrain access (including in-array aliases), while an active ball outside the supported map requires explicit outer-shot handling instead of fabricated cell flags. Ten map/motion tests pass, and the 360-trajectory native oracle remains green.

Live migration constraint confirmed from current code: `world.js` has a 45×72 grid with size 2 world units, and `rules.js` specifies 4 yards/unit: 8 yards per current construction tile. Original motion uses 50×50 cells at 25 yards/cell and 1,024 fixed-point units/cell. Mapping current cells directly would change distances by 25/8; mapping only physical distance would merge current construction cells. A versioned original-format world and explicit legacy-save handling are needed; neither silent conversion is a 1:1 solution. This remains a real integration requirement, not an excuse to substitute the existing endpoint simulation.

### Versioned original-world state

`original-world-state.js` defines `fairway-baron.original-world` version 1 with explicit 50×50 geometry, 25 yards/cell and 1,024 fixed-point units/cell. It serializes original terrain/marks/ownership/vertices, runtime metadata including shape, shared phase/RNG, strength-cache contents and active shot fields. `originalWorldMap` rebuilds derived map data from that source and supplies the shared planning/motion adapters. The codec rejects legacy formats and rescaled geometry instead of silently translating the 8-yard browser tiles.

Three tests pass: whole-state round-trip plus the same next motion update after map rebuild, independent restored metadata, rejected legacy/scale changes and malformed map arrays. This is the new simulation-world payload, not a complete replacement for player/course/career/account saves. Browser construction, world creation/rendering, command/replay protocol and golfer scheduling still need to adopt it explicitly.

### Recovered simulation regression run

After the motion/world-state changes, `npm --prefix simgolf-reborn/scene test -- 'original-.*\.spec\.js'` completed with **658 passed in 2.6 minutes**. This includes recovered planning, geometry, construction, golfer/remark/fee logic and the new motion/state tests. It is the recovered subsystem suite, not the browser UI/account/production deployment suite, and does not close the live integration requirement.

### World launch and motion transactions

`original-world-launch.js` connects resolved-target assessment/launch and the assembled motion update to the versioned world. Launch reads authoritative world RNG/global flags and shared cache, then publishes a validated clone containing the active shot, resulting RNG/cache and revision. A per-actor motion transaction similarly publishes the next state or removes a settled shot while returning its outcome to the host. It does not advance the shared phase per actor; original scheduling/order and score/effect consumption remain host work. These are internal simulation operations, not exposed multiplayer commands.

Three tests pass: launch/save/motion handoff, stale caller RNG/global-flag rejection through authoritative override, invalid/duplicate rollback, and repeated full-world save/reload while a launched shot settles. The implementation rebuilds map derivatives for correctness on each transaction; caching by terrain revision and production integration remain work. No claim is made that the browser now uses this world or that full native launch-through-motion scheduling is verified.

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

### Outer actor-loop correction

Inspecting `0x428100` exposed a caller invariant omitted from the earlier continuous-motion fixture: `0x4281a5` resets the centre scratch local before every actor update. It is not persistent shot state. `originalMotionStep` now ignores an incoming stale centre flag and starts it at zero; the saved-world transaction also clears its compatibility field. The native fixture now performs the same per-update reset. All 360 trajectories match again (14,389 updates / 377 mixed-terrain crossings), and seven motion/world tests pass including a regression where a stale centre flag previously would have halved speed incorrectly.

Scheduling evidence: `0x4295ef–0x429603` iterates actor slots 0 through 151 in order. The world caller invokes this loop at `0x4172e5`; `0x41730b–0x41732d` advances the shared phase afterward, rounding the incremented phase up to even when global flag 8 is set. Non-motion actor work and other world callbacks also consume shared RNG, so stepping only active balls is still not the complete original scheduler.

### Verified world update boundary

`original-world-update.js` recovers the contiguous caller section `0x4172ce–0x41732d`. It clears `0x59a188` even when flag 4 skips the updates, invokes `0x428100`, `0x4029e0`, and `0x409980` in order, then invokes `0x46df40` only when the current `0x568148` byte and `0x53ce64` counter are zero. The phase increment and optional even rounding use flags after these callbacks, with unsigned wraparound. Every callback receives the state left by its predecessor; the API requires explicit synchronous resolvers and returns a cloned result for host publication.

`verify-original-world-update.py` compares 4,096 cases directly with that original executable section, including pause, callback changes to flags/conditional fields, and phase overflow. Native callback bodies are deliberately replaced by controlled mutations in this oracle; it proves dispatch and clock behavior, not the bodies. Eleven world state/launch/update tests pass. The saved-world active-shot limit is corrected from 160 to the verified 152 actor slots.

This remains a recovered internal boundary. The complete golfer loop (including non-motion actors), the other world callback bodies, subsequent tick work, and browser/world-format migration must still be integrated. No production gameplay switch or deployment is included.

### Golfer-slot dispatch and entry states

`original-golfer-loop.js` recovers the 152-slot loop entry/exit and the complete `holeByte == 0xff` branch (`0x428100–0x42819c`, `0x4295ef–0x42960a`). Empty slots consume no RNG. FF slots with zero countdown draw with bound 100 and may reset coordinates to the signed clubhouse tile coordinates shifted by 10 plus 0x600. Nonzero countdown slots draw with bound 2 and may decrement. Normal actor bodies remain explicit synchronous resolvers; slot order is fixed and later slots see state mutations from earlier actors.

`verify-original-golfer-loop.py` executes 300 complete native loop cases (45,600 slot visits), retaining original FF branch and RNG instructions while replacing normal actor bodies with controlled mutations. Cases include signed clubhouse coordinates, countdown zero/nonzero, mixed inactive/active/FF slots, and activation of a later slot. All match. Eight loop/world-update tests pass, including composition showing entry RNG flows to subsequent world callbacks while phase advances only once. These tests do not verify normal walking/shot/remark bodies, nor claim live browser integration.

### Normal actor prelude

`original-actor-prelude.js` recovers `0x42819c–0x428272`: reset centre scratch, scan the 16 visual-owner records (last match wins), release the matching record when flag 0x40000 is clear, and update the countdown every eighth phase. Reaching countdown 1 consumes the original bound-6 draw and conditionally invokes 0x466ea0; the subsequent countdown-6/focus gate rereads callback state. The signed increment/comparison against 0x820344 is preserved, including overflow. Raw fields remain neutrally named until their broader meanings are verified.

The native verifier matches 2,000 cases with the original branch/RNG instructions, controlled 0x466ea0 callback mutation, duplicate visual ownership, phase gates, signed comparison boundaries, and focus conditions. Eleven prelude/loop/world-update tests pass. Remaining normal-actor logic begins at 0x428272 (paired/social checks), followed by scenery/remark sampling and walking/shot dispatch. The prelude does not yet replace the browser golfer update.

### Paired actor update gates

`original-paired-update.js` recovers `0x428272–0x42841a` using the typed 256-byte actor records already used by recovered remark-world adapters. It preserves flag/hole/animation gates, the slot-offset 64-phase cadence, signed elapsed-phase comparison, original map distance and signed division, detail/screen bounds, probe-before-reaction order, and post-callback partner/flag rereads. Effects 0x406dd0 and 0x465c40 require explicit stateful resolvers; they are not silently skipped. This is the trigger and surrounding writes, not those effect bodies.

The native verifier matches 2,000 paired-update cases with the original distance helper retained and controlled effect bodies. Fourteen paired/prelude/loop/world tests pass, including a reaction changing the current partner before the final paired flags are written. Scenery/remark sampling from 0x42841a onward and complete normal-actor assembly remain open. No live simulation switch or deployment is included.

### Scenery sampling and reaction dispatch

`original-scenery-update.js` recovers `0x42841a–0x42858d`. The cadence mask uses actor flags and the signed actor modifier, and slots use phase + 33×slot. Recent remark bytes suppress the sample before RNG. A bound-5 draw offsets the facing direction using the native eight-direction table. Terrain lookup uses x×50+z while remark arguments use z×50+x; these remain distinct. Building types 2/4 and the type-4 threshold of 16 choose reactions 11/20. Subsequent marked-tile reactions reread tile flags after helper 0x466ea0. Building lookup and reaction bodies require explicit synchronous resolvers using typed original records.

`verify-original-scenery-update.py` matches 1,500 native cases, retaining native RNG and controlled building/reaction helper bodies. Seventeen scenery/paired/prelude/loop/world-update tests pass. This completes recovery of the pre-motion scenery branch, not reaction-body integration or the entire golfer body. The following camera-state, motion/walking dispatch and assembly with original world state remain pending; the browser still uses its existing simulation.

### Continuous assembled actor checks

`original-actor-checks.js` assembles the recovered prelude, paired update and scenery branches on raw world actor records, followed by the original tracked-position/facing writes at 0x42858d–0x4285bb. The prelude scalar adapter refreshes from raw world state after every callback and writes only its own output fields; reaction changes to other actor bytes or map data are retained.

`verify-original-actor-checks.py` now executes the continuous native section 0x42819c–0x4285bb for 1,000 cases, with native branch ordering and RNG and controlled lookup/reaction callbacks. Whole actor records, visual owners, focus/camera fields, sample, effect order and RNG match the assembled result. Nineteen targeted tests pass, including a callback replacing the actor record and suppressing later scenery sampling. This establishes assembly of the pre-motion checks; native effect bodies, subsequent walking/motion dispatch, saved-world actor persistence and live integration are still required.

### Motion/delay dispatch gate

`original-actor-motion-gate.js` recovers 0x42880a–0x42889c. Zero horizontal speed first clears actor flag 0x40000. A negative signed delay increments on odd phases but retains the negative-delay branch for that update even if it becomes zero; active shots proceed to 0x42bdb5 and others skip the actor. On the other branch, flag 0x80000000 invokes 0x406450, then the refreshed flags are saved before clearing bit 0x8000. Signed stroke byte >=10 invokes 0x426b00 and skips the actor. Both effect bodies remain explicit resolvers.

Two thousand native cases match, with controlled effect bodies and signed delay/stroke cases. Five gate/assembled-check tests pass. Integration must preserve the intervening 0x4285bb–0x42880a terrain/condition work: it includes a cadence of 120 or 160 phases, nearby terrain-kind scans, per-actor condition counters and reaction calls. That section is not yet recovered; the new gate must not be called directly after the earlier checks as a substitute for it. Walking/shot bodies and full browser integration remain pending.

### Periodic terrain-condition update

`original-condition-update.js` recovers 0x4285ff–0x4287ef: signed (phase+37×slot) modulo a 160/120 period (the actor modifier is nonzero, not necessarily positive), initial reaction-63 chance, current/eight-neighbor terrain scan, environment draw, signed condition counter increments/wrap, personality cap and reactions 14/15. Correction to the preceding investigation note: the scan reads metadata byte 7, **shape**, not byte 6, kind. Original shapes 7/8/14 select the alternate counter path. A zero RNG bound still consumes a draw, and the range is truncated to its low word after signed halving.

The verifier matches 2,500 native cases with actual RNG and controlled remark mutation, including negative modifiers, signed counters and zero ranges. Eight condition/gate/check tests pass, including a special tile only in the eight-neighbor ring. Ball-cell sampling at 0x4285bb and actor-cell sampling at 0x4287ef still need assembly with these branches; native remark bodies and later walking/shot dispatch remain required. No production simulation replacement is claimed.

### Continuous actor prefix through motion gate

`original-actor-dispatch.js` now assembles 0x42819c–0x42889c or its early motion/skip exits: earlier actor checks, ball-cell sampling with original map bounds/code-20 behavior, condition updates, actor-cell sampling and motion gate. Ball terrain is sampled before condition callbacks. Actor coordinates for the cell local are captured before condition callbacks, but that cell's terrain is sampled afterward, so callback map changes are seen without incorrectly moving the sampled tile.

`verify-original-actor-dispatch.py` matches 1,000 continuous native prefix executions, including out-of-map ball samples, high-flag cleanup, negative delay, paired/scenery effects and condition work. Ten dispatch/condition/gate/check tests pass; a targeted case changes terrain and actor position during a condition reaction to verify the distinct sample times. This is still a prefix: normal continuation from 0x42889c, full motion/score handling, effect bodies and live saved-world integration remain unfinished.

### Partner and turn-order branch

`original-turn-order.js` recovers 0x428992–0x428ad1. It conditionally refreshes a missing partner through 0x425b50, rereads the resulting partner index, captures the same-hole flag-0x400 readiness difference, and compares cup distances with originalRouteSegment. Equal distances do not set the closer flag. The subsequent actor byte/flag checks choose the native 0x42b3f2 or 0x428ad1 continuation without inventing what those bodies do.

Two thousand native cases match with original distance helpers and a controlled partner-refresh callback; five turn-order/dispatch tests pass. This is not yet appended directly to actor-dispatch: the intervening 0x42889c–0x428992 optional shot-line/projection branch still requires handling, as do both subsequent state-machine branches, partner-refresh body and browser integration.

### Optional shot-line branch

`original-shot-line.js` recovers 0x42889c–0x428992: flag-32/speed/ball-terrain gate, source fixed-point projection, target tile or shifted fixed-point projection according to flag 0x10000000, visible-endpoint draw ordering, and final cup projection. Coordinate arguments are semantic values; pointer results return an explicit point. Projection/drawing resolvers retain state changes and may not be omitted on active paths.

One thousand native dispatch cases match with controlled projection/drawing results; eight shot-line/turn-order/dispatch tests pass. This verifies the caller branch, not the tile projection cache helper 0x42f020 or a live drawing adapter. The branch is now available to bridge the recovered actor prefix to turn-order, while those adapters and subsequent state-machine branches remain work.

### Continuous actor decision assembly

`original-actor-decision.js` joins the actor prefix, optional shot-line branch and
partner/turn-order branch without skipping intervening work. Early motion/skip
exits return immediately. The ball-terrain local sampled before condition effects
is supplied to the line gate; mutations from projection/drawing effects survive
into turn selection. Both later addresses remain explicit continuations, not
invented movement or shot actions.

`verify-original-actor-decision.py` runs the continuous native range beginning at
0x42819c and stops at the real outgoing branch. All 1,500 cases match whole actor
and partner records, tracked position/visual owner state, effect ordering, RNG,
terrain locals and turn flags. Coverage: 215 to 0x428ad1, 171 to 0x42b3f2, 211 to
motion and 903 to skip. Native RNG and distance routines execute; lookup,
reaction, partner refresh and projection/drawing bodies remain controlled test
resolvers. Fifteen focused tests pass, including clipped projections continuing
turn selection and a drawing callback changing the subsequent decision.

Assembly exposed an overly restrictive origin validation in originalRouteSegment:
a ball just outside the map can still enter native distance comparison. Signed
integer origins are now allowed while the existing verified ±51200 component
difference limit remains enforced. Off-map cases occur in the continuous native
comparison; no unverified wide-distance arithmetic is enabled.

This closes the gap between the previously separate prefix and turn-order stages.
The 0x428ad1 and 0x42b3f2 bodies, real resolver implementations, raw actor save/world
integration and live shot switch remain open. No live physics ruleset or deployed
gameplay changed in this step.

### Shot-entry wait and short-putt completion

`original-shot-entry.js` recovers the continuous 0x42b3f2–0x42b55c stage and is
now called by `originalActorDecision` on that continuation. A stationary golfer
closer to the cup defers at 0x42d23c; a moving ball continues at 0x42b825. The
stationary branch clears flags 0x1800, can face/wait for its partner using the
native heading calculation and signed animation byte, or complete a short putt.
The short-putt boundary is strictly less than 256 original units from the cup
centre, and the controlled-golfer class bypasses it. Stroke byte, selected stat
counter and hole total increment with native widths before the explicit 0x426b00
settlement callback. The callback body is still pending, so this is not complete
scoring integration.

`verify-original-shot-entry.py`: 2,500 continuous native cases match, with native
heading/distance routines and controlled settlement. Outgoing coverage is 442
closer-turn deferrals, 622 moving balls, 661 aiming continuations and 775 skips
(partner waits or completed short putts). Inputs include signed partner-animation
bytes, exact 255/256-unit boundaries and byte/word/dword counter wraparound.

The expanded `verify-original-actor-decision.py` also matches all 1,500 continuous
prefix-plus-entry cases: 80 aiming, 83 moving-ball, 208 walking, 89 early motion
and 1,040 skips. Twenty-one focused tests pass. Live browser putting remains
unchanged; the remaining aiming, movement, scoring/resolver bodies and saved
original-world integration must still be completed before the live switch.

### Manual and automatic shot preparation

`original-shot-preparation.js` recovers 0x42b55c–0x42b825. Flag 0x200, the
pre-update terrain local and the native 25-yard distance threshold select manual
aiming. A new manual target initializes the camera tile only for the original
-1 actor coordinate sentinel, then initializes aiming state. First-hole tutorial
conditions return 0x42b647 explicitly; callers may resume at 0x42b6f8 only after
those effects. The tutorial body is not implemented by this helper.

Manual target -1 sets selection mode/actor and waits. Otherwise the planner gets
[id,1,-1,0,0]; automatic shots get [id,0,-1,0,0] only when updateScratch is zero.
After the planner, refreshed heading controls facing. The pre-planner terrain
and ball-cell locals control putt accounting, while the current tile flags and
actor record are reread. This preserves native counter wraparound, the unmarked
putt delay -25, animation 14, shot-origin copying and the final active byte.

`verify-original-shot-preparation.py` matches 2,500 continuous native cases,
including 1,560 actual planner-call sites with controlled planner results and 11
explicit tutorial exits. Both normal entry and post-tutorial resume are covered.
Twelve focused preparation/entry/decision tests pass, including planner mutation
of ball locals versus tile flags and native counter timing.

`original-actor-action.js` now connects decision, entry and preparation.
`verify-original-actor-action.py` matches 1,500 continuous native executions from
0x42819c with whole actor records, effect order, RNG, terrain/turn locals and shot
counters. The combined fixture covers automatic preparation; manual preparation
and tutorial exits are covered by the separate verifier above. Planner, reaction,
projection, partner-refresh and scoring effects are controlled resolvers. Real
resolver wiring, tutorial/walking/moving-ball branches, raw actor persistence and
live original-world adoption remain open. No live physics changed in this step.

### Swing progress and impact effects

`original-swing-progress.js` recovers 0x42bb3b–0x42bdb5 for swing phases 2 and
later. It retains signed byte phase comparisons, phase wrap, phase-2 stance
rotation, animation clamping, the impact frame and effect ordering. Impact sound
selection uses native style/club/terrain precedence; reaction callbacks can change
the club before sound selection. The original once-only impact flag, terrain-2
callback, target callback and selected-golfer effect remain explicit resolver calls.
At phase 32 the original flag can end the swing and place the golfer relative to
the saved shot origin, with half-size stance offsets for putts. Early frames wait
unless the impact flag is already set; eligible frames return motion.

`verify-original-swing-progress.py` executes the continuous native range in 3,000
cases. All match complete actor records, ordered effect calls, seed and exit:
1,951 motion and 1,049 skip, with 518 controlled effect calls. Inputs include
signed-byte edge cases, callback mutations, club/style combinations and both
stance scales. Thirteen swing/preparation/entry checks pass.

The phase-1 clearance gate at 0x42b825–0x42bb3b is still required before this can
join the normal actor path; it scans other golfers and consumes timing RNG.
Effect bodies, complete motion/scoring assembly and live world integration remain
open. This module does not change live browser animations or sound behavior yet.

### Complete pre-swing clearance and assembled swing dispatch

`original-swing-clearance.js` recovers 0x42b825–0x42bb3b, including all 152 actor
slots. It preserves the partner-ready shortcut, zero-range putting RNG draw,
clock subtraction with signed overflow, signed stroke comparison, native tee and
target distance thresholds, angle comparison and persistent blocked-corridor flag.
A blocked automatic golfer receives the original random retry delay; the manual
flag can override that wait. Starting the swing moves the golfer onto the ball,
sets animation 16 and clears the native flag. Phase zero proceeds directly to
motion; later phases proceed to the recovered swing handler.

`verify-original-swing-clearance.py` matches 1,000 continuous native runs without
replacing any helper: native RNG, heading and distance all execute. Deliberate
fixtures cover tee proximity, landing-ball proximity, golfer proximity and shot
corridor alignment, including slot 151. Results: 401 blocked, 299 clear and 300
early exits before scanning. Eighteen clearance/swing/decision/preparation tests
pass.

`originalActorAction` now dispatches clearance and swing progress. Its expanded
native verifier matches 1,500 continuous runs through these stages: 1,230 skips,
153 motion exits and 117 walking continuations. It includes phases 0/1/2/7/31 and
compares actor records, effects, terrain locals, counters and all consumed RNG.
Lookup/reaction/planning/presentation effect bodies remain controlled in this
assembled verifier. The phase-1 gap noted above is closed; full motion/scoring,
walking/tutorial bodies, actual resolver adapters and live saved-world integration
remain unfinished. There is still no live browser physics change from this work.

### Stopped-shot accounting

`original-shot-accounting.js` recovers 0x42ca9d–0x42cc88, after the native stop
predicate has zeroed speed. It resets delay/swing state and impact flags, samples
the final tile, retains the terrain-2 flag exception, and records first-stroke
drive totals, distance/longest drive and nonpositive-scatter fairway hits. The
stroke byte then increments; signed comparison with par minus two determines
the regulation-green counters. Raw 520-byte hole records and 184-byte statistic
records retain the original offsets and integer widths, rather than accumulating
parallel approximate totals. Hazard penalties and reaction processing begin at
the returned continuation and are not silently omitted by this helper.

`verify-original-shot-accounting.py` matches 2,000 continuous native executions
with the actual distance helper. Entire actor, hole and selected statistic records
match, together with the final tile locals. Randomized initial counters cover
signed comparisons and byte/word/dword wraparound. Twelve accounting/entry/
preparation checks pass. Non-stopped inputs reject atomically.

This closes the initial post-motion statistics branch. Raw actor-to-motion
binding, intermediate effects, subsequent hazards/reactions, scoring settlement
and live saved-world integration remain required. No live reports or gameplay
have switched to these recovered records yet.

### Native hazard drop and penalty branch

`original-hazard-drop.js` recovers 0x42ceb2–0x42d110. Invalid terrain without the
centre flag returns to the saved shot origin after reaction 2. Terrain 17 or the
centre flag uses the native half-tile search along the original shot heading:
exclude terrain 17/10, exclude nonzero candidates closer to the cup than the
original endpoint, and select by distance minus four times terrain scatter. The
origin is retained if nothing qualifies. Sound and reaction callbacks precede
the search, and their actor changes are reread. Penalty animation, direction,
delay, flags and signed stroke-limit behavior follow the original byte writes.
The original landed tile locals remain available for later reactions.

`verify-original-hazard-drop.py` matches 800 continuous native runs, 8,993 search
candidates and 615 penalties. Native projection initialization, lookup, heading
and distance routines execute; only sound/reaction bodies are controlled, with
actor mutations included. Eight hazard/accounting checks pass, covering exact
half-tile selection, callback-modified origin, no candidate fallback, no-penalty
ground and stroke edge cases. Current verified distance-domain limits still
apply; this is not evidence for arbitrary corrupted/off-map coordinates.

The intervening 0x42cc88–0x42ceb2 wear/reaction branch and subsequent
0x42d110–0x42d23c reactions must be assembled before invoking this after stopped
shot accounting. Full motion/scoring and live-world adoption remain open. This
records original behavior; it does not replace the live game's user-requested
out-of-bounds drop behavior or claim original rules have been deployed.

### Assembled stopped-ball tail with landing and follow-up reactions

`original-landing-reactions.js` recovers 0x42cc88–0x42ceb2: saturating landed-tile
wear, the pre-reaction mood local, improved-lie recovery, poor-lie and failed
recovery reactions. It rereads terrain/metadata/actor flags after reaction effects.
`verify-original-landing-reactions.py` matches 2,000 native runs and 703 reaction
calls, including callback changes to source terrain, scatter, mood and seed.

`original-post-landing.js` recovers 0x42d110–0x42d23c: final lie/visual flags,
long-drive reaction gating and follow-up reactions. It retains the landed locals
and original mood, while subsequent actor/global reads see earlier effects.
`verify-original-post-landing.py` matches 1,600 native cases with controlled range
and effect callbacks, including changed mood, hole number and reaction flags.

`original-stopped-shot.js` composes accounting, landing reactions, the selected
hazard branch and final reactions. `verify-original-stopped-shot.py` matches 800
continuous native executions from 0x42ca9d to the actor skip exit, including entire
actor/hole/stat records, wear, seed and effect order: 7,096 drop candidates and
509 penalties. Native lookup, distance and projection execute, with controlled
reaction/presentation/range effects. Twelve focused stopped-tail/hazard/accounting
tests pass. This closes the previously documented gaps on either side of the
hazard branch. Motion-to-raw-actor binding, effect implementations, hole settlement,
walking/tutorial branches and live saved-world integration remain open.

### Cup-completion caller and effect ordering

`original-cup-completion.js` recovers 0x42c3f4–0x42c47c after the cup predicate
succeeds. Sound uses the unsnapped ball position, then the ball snaps to the
pre-movement tile centre. Optional visual cleanup precedes the stroke increment
and 0x426b00 settlement callback. Only afterward does the caller zero speed and
clear the impact flag on the refreshed actor. The result exits the actor directly;
it must not also run ordinary stopped-shot accounting.

`verify-original-cup-completion.py` matches 1,000 continuous native cases,
including complete actor/seed output and the actor position/stroke count observed
at every sound/visual/settlement call. Controlled callbacks mutate position,
strokes, speed, flags, hole and seed to verify the timing of native rereads.
Eleven cup/stopped-tail/accounting tests pass. This establishes the caller, not
the 0x426b00 settlement body or its connection to live play. The motion integrator
must expose the pre-snap capture boundary rather than first applying its terminal
ball output and then calling this routine; intermediate flight/impact effects
also remain to be connected at their native positions.

### Hole-settlement score/statistics prefix

`original-hole-settlement.js` recovers 0x426b00–0x426c92. Normal-class golfers
invoke assessment on either side of a clamped signed-stroke histogram update.
The complemented style argument is captured before the first callback, while
hole/style/statistic fields are reread afterward. Per-hole signed stroke totals,
round counts and the actor scorecard are then written. Settlement-value setup
uses the actor's signed word, mode, hole flags, global bonus and the low three
bits of the 44-byte completion record selected by actor offset 0xbe. That value
is retained as a native scratch value, not reinterpreted as browser cash.

`verify-original-hole-settlement.py` matches 1,200 continuous native executions.
It compares full actor records and SHA-256 hashes of all 20 hole records and 32
statistic records, plus effect order and the resulting settlement value. Native
clamping executes; assessment/sound callbacks are controlled and may change
hole, style, record index or settlement value. Eleven settlement/cup/stopped-tail
tests pass, covering the class gate, captured callback argument, signed stroke
histogram/total distinction and overflow. The result presentation and next-hole/
round transition after 0x426c92 remain unfinished; callers must not treat this
prefix as a complete implementation of 0x426b00 or deploy it as live settlement.

### Completion scorecard, notices and timing

`original-hole-completion-state.js` recovers 0x426e6b–0x426f3b after result
presentation. It performs the optional reaction, writes the refreshed score into
the shared completion record, updates all 64 notices with native signed-owner
comparison, clears the active ball-X/stroke state, accumulates elapsed playing
time using signed phase arithmetic and resets the original flags/club. Event
and ordinary completion retain distinct outgoing continuations.

The scorecard accesses establish the 44-byte completion-record base as 0x583432,
with its type at offset 0 and scorecard at offset 0x14. The earlier settlement
adapter's type-only window began 18 bytes earlier; it is corrected to this base
before adding scorecard fields. The updated settlement verifier still matches
all 1,200 native cases. `verify-original-hole-completion-state.py` matches another
1,200 native runs, comparing full actor/score records, hashes of all holes and
notices, flags/phase and effect order. It includes actors 127/128/151, signed phase
wrap and callback changes to score, hole and event mode. Eleven focused tests pass.

The result-presentation/value-use branch 0x426c92–0x426e6b still separates this
from the settlement prefix. Next-hole/match handling from 0x426f3b or 0x427e25,
full effect adapters and live original-world integration remain unfinished. No
native branch is bypassed or replaced with a default next-hole assumption.

### Next-hole entry and event wrap

`original-next-hole-entry.js` recovers 0x427e25–0x427ec4. It advances the raw signed-byte hole index, checks the next original hole record, and branches ordinary rounds to 0x4280e4 when that record is empty or the partner is at hole 0/19. With either original event flag in 0x4200000, an empty next record wraps to hole one; the 16-bit ordering clock receives twice the original course-hole count. An already-filled destination scorecard explicitly dispatches 0x425b50, preserving its returned state. No guessed reset behavior is supplied.

The checksum-pinned verifier matches 1,200 continuous native executions, including 725 reset callbacks and 306 ordinary-round exits. Callback mutations and 16-bit clock wrap are covered. Seven focused next-hole/completion checks pass. This module stops before last-hole dialogue, destination assignment and round-exit behavior; normal result/high-score settlement before this entry also remains incomplete. It is not connected to the live golfers yet and does not close F02/F04/F09 or the putting integration gap.

### Composed next-hole transition and between-hole records

`original-between-hole-state.js` covers 0x427fb0–0x4280e3, retaining signed arithmetic, 16-bit wrap, the two history-byte writes and the real sign-helper behavior that moves byte 0x3e one step toward zero. Class 0x40 follows its separate division-by-160 adjustment; other classes read completion-record word 40 and use the original setting-dependent divisor. Raw field names remain where gameplay meaning is not established.

`original-next-hole-transition.js` now composes entry with that tail and dispatches the explicit round-reset callback on 0x4280e4. Special last-hole visitors stop at their original dialogue branches (0x427f01/0x427efa), rather than silently skipping dialogue or its effects. The original 0x425b50 reset routine itself remains an explicit dependency.

Verification: 2,000 continuous native tail executions match, plus 1,200 continuous composed transitions (1,034 controlled reset calls, 1,114 returns, remaining special dialogue exits). Seven focused tests pass. The composed verifier initializes a following-record sentinel because native lookahead reads one record past the newly selected hole. This remains standalone reconstruction: live golfers, missing normal settlement/high-score presentation and the reset/movement routine are not yet integrated.

### Ordinary round-exit dependency resolved

Inspection of 0x425b50 establishes that this dependency is a round-exit/reward routine, not a generic scorecard reset. Ordinary actor classes bypass three special reward/dialogue branches, clear ball X at 0xdc, set hole byte 0x29 to 19, and set global selection state 0x5a4440 to -1 when actor flags include 0x200. Ball Z and other records remain unchanged. The fourth apparent class branch compares `(class & 0xe0)` against 0x100 and is unreachable in the supplied executable; no invented class is substituted.

`original-round-exit.js` executes ordinary cleanup and exposes the original special-class exits. `original-resolved-next-hole.js` now uses it in the composed transition, removing the ordinary 0x425b50 callback stub. Special classes 0x40, 0x60 and 0x80 still require their reward/dialogue continuation; no ordinary cleanup is applied ahead of those effects.

Verification: 1,024 full native routine-entry cases cover every class byte (640 common exits). Another 1,200 continuous native next-hole transitions execute the real round-exit routine, with 1,022 calls and no substituted reset behavior; all match complete actor records, selection state and call order. Ten focused tests pass. This remains standalone original-engine composition, not live-game integration or full career/reward parity.

### Round totals and original ten-entry score list

`original-round-score-list.js` recovers 0x427a53–0x427bd4. Event mode and courses with a following hole bypass the result list. Finished rounds separately retain played strokes/par, projected 18-hole strokes/relative score and completion-record low-bit totals. Unplayed holes add five projected strokes and one projected over-par point, but list insertion compares the actual played-stroke sum. Equal scores retain their existing order; zero remains the native empty-slot sentinel.

Occupied slots shift from the bottom upward, with the original text clear/copy/store effects at each step. Those effects are synchronous explicit dependencies and may change the list before subsequent reads. Native verification compares 1,500 continuous cases and 4,154 ordered text effects, including callback list/text mutations and signed score bytes. Four focused tests cover ties, insertion order, short-course totals and bypasses. Record announcements, rewards and result presentation following 0x427bd4 remain open; this component is not yet applied to live scorecards.

### Course-record announcement and result prelude

`original-record-announcement.js` recovers 0x427bd4–0x427d38. Eligibility reads the current course-hole count (>2), first-hole score byte, unassigned record holder, current list leader and played-par total. The holder is assigned `actorId | 0x100` before the name/store presentation effects. Text retains the supplied executable's wording and course-count-minus-one formatting; callback changes to the course count are read afterward. Completion-bit accumulation wraps as signed 32-bit arithmetic.

Native verification matches 1,400 continuous cases, including 276 announcements, using the actual native integer-formatting routine. Seven focused announcement/list tests pass. `original-round-result-prelude.js` joins list insertion and announcement in native order. In particular, a score just inserted at the head equals the subsequent comparison value and suppresses this announcement unless presentation effects change that state; no intuitive workaround replaces the observed branch. Later result effects at 0x427d38 onward, special-visitor rewards and live integration remain open.

### Complete record base and end-of-round performance summary

The 0x427d38 section exposes two preceding summary bytes, establishing the full 44-byte completion-record base as **0x583430**, not the earlier type-field window at 0x583432. All recovered consumers now use this complete layout: best-score byte 0, relative-score byte 1, type byte 2, per-hole low-bit fields at 3+hole, recorded strokes at 0x16+hole, and the between-hole signed word at 42. This supersedes earlier base/offset descriptions above. Verifiers initialize/read the complete native record and preserve coverage of nonzero types.

`original-round-performance.js` covers 0x427d38–0x427e25: projected best score, signed relative-score averaging, original performance contributions and actor flag/delay threshold. `original-round-results.js` joins totals, score-list processing, announcement and this summary through the next-hole entry boundary. Meaning of the threshold's later actor behavior is not inferred from the flag alone.

Verification: 1,600 native performance cases match. Revalidated 1,200 settlement-prefix, 1,200 completion-bookkeeping, 2,000 between-hole, 1,500 score-list, 1,200 composed-transition and 1,200 resolved-transition cases after correcting the layout. Twenty-two focused tests pass. Live-engine application, earlier hole-result presentation and special visitor rewards remain incomplete.

### Continuous round finish

`original-round-finish.js` composes the recovered result path with resolved next-hole progression from 0x427a53 through the ordinary return. Ongoing holes bypass result processing; completed courses update the score list and performance record before the actual ordinary exit. Presentation remains an explicit synchronous dependency. Special visitor branches and earlier per-hole settlement/match handling remain outside this recovered continuous path.

The new verifier runs 1,500 complete native sequences without substituting the ordinary round-exit routine. Complete actor/completion records, score list, selection/record-holder state, text and 5,069 ordered calls match. Eight focused finish/performance/exit tests pass. This verifies composition across previous helper boundaries, but remains standalone engine reconstruction; it does not change live rounds or establish the broader original-game parity goal.

### First-hole fee tutorial and paid completion composition

`original-hole-payment.js` recovers 0x426c92–0x426e6b. Ordinary play optionally presents the original first-green-fee tutorial, then updates cash, per-hole income and the 20-byte financial-period record before the positioned payment effect. Event mode bypasses these updates. Tutorial callbacks can change the settlement amount, hole and period before bookkeeping; native signed/word wrapping is preserved. Displayed simoleans use the original amount-times-100 conversion rather than changing internal ledger units.

Native verification matches 1,200 continuous payment paths and 1,504 ordered presentation effects, retaining actual integer formatting. Twelve focused settlement/payment/completion checks pass across the main run and added composition check. `original-paid-hole-completion.js` joins settlement preparation, payment and completion cleanup; it stops at match handling (0x426f3b) or event continuation. The joined path has focused coverage; a full continuous native joined-path comparison and live integration remain open.

### Paid completion verification and match-entry composition

Continuous verification now covers all 1,200 settlement-to-payment-to-completion cases, comparing complete actor/completion records, hole/statistics/period/notice blocks, text, globals and callback order. This replaces the prior joined-path verification gap with native evidence.

`original-match-completion-entry.js` recovers 0x426f3b–0x426ff6: matched actor/partner flags, signed partner-hole comparison, and signed paired score/par totals. Another 1,200 native gate cases match, including 266 paired totals. `original-hole-complete.js` connects paid completion to ordinary round finish, preserves the direct event path, and returns explicitly at missing match-result presentation. Seven focused checks pass. The full newly composed hole-to-return path has focused coverage; its own continuous native verifier and live actor integration remain open. Special match results/rewards are not replaced with ordinary scoring.

### Full ordinary hole completion and resolved cup boundary

`verify-original-hole-complete.py` now verifies 1,200 continuous native executions from 0x426b00 through ordinary return, including real round-exit execution. It compares actor/completion records, all relevant hole/statistical/financial/notice blocks, text, score list, selection and callback effects. This closes the prior continuous-verification gap for ordinary hole completion; it does not cover missing match/special reward branches.

`original-resolved-cup-completion.js` replaces the ordinary 0x426b00 cup dependency with the recovered composed routine and retains nested call order. Sound, snap, optional visual removal, one final stroke, actual scoring/payment/progression and motion cleanup occur in sequence. Missing match continuations fail explicitly. Eight focused cup/hole checks pass. The newly resolved cup wrapper still needs its own continuous native comparison; live ball motion remains separate and must not also run stopped-shot accounting on the cup branch.

### Resolved cup verification and pre-snap motion handoff

`verify-original-resolved-cup-completion.py` now compares 1,200 continuous native cup completions with real ordinary 0x426b00 scoring/payment/round progression. Full records, ledgers, text, list/selection globals and ordered nested effects match. This closes the prior resolved-cup continuous-verification gap for ordinary actors.

The ground and motion helpers now additionally expose `cupEntry` on captured balls, containing the pre-snap ball state after surface response and the original terrain-cell locals. Previously only the snapped/stopped result survived, which could not supply the native sound-before-snap position when connecting scoring. Existing result fields retain their behavior. Ten focused checks pass; the existing 360-trajectory / 14,389-step native motion comparison still passes with 377 mixed-terrain crossings. Complete motion callback integration and live world/actor mapping remain unfinished; a captured ball must bypass ordinary stopped-shot accounting.

### Captured motion-to-actor handoff

`original-motion-cup-handoff.js` consumes an explicitly captured motion result and writes its pre-snap position, height, speed, heading, vertical speed and angular offset into the original actor fields. It carries the original cell locals and RNG state into resolved cup scoring, preserving actor flags until the native completion sequence clears them. Ordinary stops or missing pre-snap entries reject instead of entering cup accounting.

Four focused checks pass, including actual recovered ground capture, sound coordinates, RNG handoff, one paid completion and motion cleanup. Another 1,200 native cup-completion comparisons replace deliberately stale actor ball fields through the new adapter and match full resulting records/ledgers/calls. Earlier motion effects, non-cup landings and integration with the live world format remain separate unfinished work; this is not a live behavior change.

### Actor position/gravity effect ordering

`original-actor-position-step.js` recovers 0x42bdc3–0x42beb0 with explicit height and visual effects. It samples prior terrain height, advances position using the recovered original trig table, applies the near-apex visual before gravity, and applies the phase-modulo-eight visual afterward. Callback-modified velocity/phase are re-read while step deltas retain their native local values. Offscreen motion omits visual effects but retains gravity.

Verification matches 1,500 continuous native executions and 2,677 ordered height/visual effects using native trig and controlled effect mutations. Three focused checks pass. This is the actor-state alternative to the pure motion helper's deferred effects; it is not yet joined through all later contact/bounce/scatter branches or applied to the live simulation.

### Ordered airborne actor effects (2026-09-12)

`original-actor-air-phase.js` wraps the recovered airborne physics at
0x42bf91–0x42c135, continuing to 0x42c527. Terrain sampling precedes drag
and deflection; impact audio sees the updated ball before collision flag 2
is applied. The reaction check rereads actor flags after audio, and the final
flag update preserves reaction callback changes. Original luck is an explicit
snapshot input (the executable reads beyond the 256-byte actor block).

`verify-original-actor-air-phase.py` compares 3,000 executable cases, all 256
actor bytes, RNG state/draw count, and 3,129 ordered effects (72 collisions).
Controlled sound callbacks alter speed or suppress the reaction; reaction
callbacks alter flags. Three focused tests also pass. This bounded adapter
is not connected to the live simulation. Ordered ground/bounce effects and
the full actor-motion integration remain unfinished; live putting remains
the previously documented approximation.

### Ordered actor bounce prefix

`original-actor-bounce.js` recovers 0x42c527–0x42c648. Contact tests precede
sound; the coefficient is captured before sound but vertical velocity is
reread afterward. Clamped rebound and height reset precede the visual effect.
The native negative-rebound tricky-green test is unreachable after the clamp.
Noncontacts continue at 0x42ca6c; contacts continue into impact response.

1,600 native sequences match complete actor bytes and 1,581 ordered effects,
including controlled callback velocity/flag mutations. Two focused tests pass.
This is standalone reconstruction: later impact/scatter effects and full live
motion integration remain open. No live gameplay or deployment changed.

### Ordered actor terrain impact

`original-actor-impact.js` covers 0x42c648–0x42c815: reversal/halving flags,
three ordered slope samples, scatter RNG, current terrain lookup, and the
terrain-17 stop globals at 0x57724c/0x577250/0x4c1e18. The first slope uses a
captured velocity multiplier, the second rereads velocity, and the third
retains its pre-query velocity. Callback state changes are therefore not
interchangeable with the pure helper's final result assignment.

3,000 native comparisons pass for complete actor records, stop globals,
query arguments/order and RNG, with half the cases mutating heading/velocity
inside the slope callbacks. Later landing deflection, continuous composition
and live world integration remain unfinished. No live deployment changed.

### Continuous contact composition

`original-actor-contact.js` joins bounce and terrain impact, bypassing impact
for noncontacts. 1,600 continuous native sequences match complete actor state,
RNG, stop globals and 5,061 ordered effects. The harness explicitly initializes
x87 precision to 0x37f: the emulator default produced a one-unit bounded-RNG
difference on this wider sample. Both earlier impact verifiers now initialize
that precision too, and their 3,000-case comparisons each still pass.

This closes the separate bounce-to-impact composition gap, not later landing
scatter/reactions or live gameplay integration. No release completion is implied.

### Ordered actor landing deflection

`original-actor-landing-deflection.js` covers 0x42c815–0x42c9ea. Rock audio
runs before the subsequent speed/skill/luck check. Luck audio runs before
rereading the actor's current hole, position and heading for correction;
remark 42 with parameter 20 follows the correction. RNG is handed through
callbacks. Hole targets use the 520-byte original records, and luck remains
an explicit input for the native byte beyond the actor record.

3,000 native cases match full actor records, RNG draws/state and 1,198
ordered effects. Controlled audio mutations lower speed or change the
position/heading. Two focused tests pass. Composition into contact, the
nearby-golfer tail and the live engine remain unfinished; this is not a
live gameplay change or a completed fidelity audit.

### Continuous landing composition

`original-actor-landing.js` joins contact and landing deflection through
0x42c9ea. Noncontacts bypass both impact and deflection. Terrain stops feed
zero speed into subsequent eligibility checks; calls and RNG counts accumulate
across the stages. 1,600 continuous native executions match all actor bytes,
stop globals, RNG state and 5,367 ordered calls, including rock surfaces,
skilled actors and controlled sound/visual effects. Two focused tests verify
full effect order and terrain-stop suppression. The nearby-golfer scan at
0x42c9ea, stop decision, and connection to earlier motion/live state remain open.

### Nearby-golfer scan and motion stop decision

`original-actor-motion-tail.js` implements 0x42c9ea–0x42ca9d and direct
noncontact entry at 0x42ca6c. A sufficiently high rebound scans all 152 actors,
excludes inactive/completed/same-hole golfers, checks original scaled distance
against difficulty, and emits remark 9 with parameter 20. Reaction callbacks
can alter later checks and the final stop decision; the scan itself is not
cancelled by a callback reducing vertical speed. Stop requires speed below 64
and both vertical fields exactly zero, then zeros speed before accounting.

500 native cases compare the entire actor arena, difficulty, ordered reactions
and continuation branch. Fixtures mix near and distant golfers and mutate the
shooter's speed/vertical speed and difficulty during reactions. Continuous
landing-to-tail composition and live integration remain unfinished.

### Continuous contact-to-stop decision

`original-post-contact-motion.js` connects landing to the nearby scan and
final stop predicate. Noncontacts enter the stop predicate directly and must
not trigger nearby reactions merely because vertical speed exceeds 200.
The output distinguishes continued motion (0x4295ef) from stopped accounting
entry (0x42ca9d). 1,600 continuous native cases match shooter state, stop
globals, RNG and 11,811 ordered effects. Two focused tests verify reaction
changes reaching the stop predicate and noncontact scan bypass. Full earlier
motion, stopped-accounting record adaptation, and live integration remain open.

### Contact through stopped-shot accounting

`original-contact-resolution.js` joins the contact-to-stop path with the
recovered accounting/reaction/drop/post-landing path. Moving balls return
without accounting. Stopped balls enter accounting exactly once. The adapter
normalizes the older `holeRecords` naming to the motion `holes` table and
rebuilds target coordinates from those original records before accounting;
returned aliases point to the updated table.

800 continuous native executions from 0x42c527 through the ordinary skip exit
match actor/hole/stat records, wear, RNG and ordered effects, including 7,096
drop candidates and 509 penalties. These fixtures exercise low-speed contacts
with zero sampled slopes; prior broader motion verifiers remain relevant but
do not establish the full combined input domain. Earlier flight/ground/cup
integration and live world/actor conversion remain unfinished.

### Continuous airborne branch through contact/stop

`original-airborne-motion.js` joins airborne adjustment/obstacle effects to
contact, landing and the stop decision. RNG state and ordered calls flow
through all stages, with airborne collision reporting retained separately.
3,000 continuous native paths from 0x42bf91 match actor bytes, RNG draws/state,
continuation and 5,811 effects, including 82 airborne obstacle hits. The
fixtures vary terrain-height delta, downward velocity, bounce/scatter values
and audio callback mutations; impact slope samples are zero and current
impact terrain is fixed to grass. This does not replace broader isolated
slope tests or establish the whole live trajectory integration.

Earlier position/gravity and ground/cup branches still need continuous actor
composition; the live engine remains separate.

### Ordered ground-edge reflections

`original-actor-ground-reflection.js` recovers 0x42c47c–0x42c527 for a ball
that did not enter the cup. Edge audio precedes each heading reflection.
The second-axis crossing and edge flags are reread after the first sound,
so callback changes can suppress the second reflection. 2,000 native cases
match complete actor records, edge flags and 954 ordered sounds, including
controlled heading/position/edge mutations. The earlier rolling/contact/cup
branch and continuous actor-motion integration remain unfinished.

### Ordered actor rolling response

`original-actor-ground-response.js` recovers 0x42c13a–0x42c27b with ordered
forward/cross slope queries. Resistance is captured between samples; origin
terrain and the green override are read afterward. Heading/speed updates use
the refreshed actor state, followed by original green curvature and RNG.
2,000 native cases match complete actor bytes, query order and RNG, including
slope callbacks modifying heading, speed and roll coefficient. Ground-contact
centre handling and cup routing still need actor composition; live integration
is unfinished.

### Rolling through cup decision

`original-actor-ground-decision.js` composes rolling response, terrain-centre
slowdown and cup eligibility. It updates speed/centre state but deliberately
leaves captured ball coordinates and flags untouched for the ordered cup
completion routine. The selected branch is 0x42c3f4 for capture or normalized
0x42c47c for edge reflection. Cup validity reads current terrain/flags rather
than substituting the earlier cached terrain type.

2,000 continuous native cases match actor bytes, centre flag, selected branch,
ordered slopes and RNG with varied clubs, cup flags, event mode, terrain and
callback mutations. World-edge neighbor storage remains an explicit unsupported
input; full ground-to-cup scoring/reflection composition and live integration
remain open.

### Ground branch resolution

`original-ground-resolution.js` routes rolling/cup decision to recovered
ordinary cup completion, or edge reflection and contact/stopped accounting.
The cup branch exits directly and never executes ordinary landing accounting.
800 continuous native non-cup paths from 0x42c13a through skip match full
actor/hole/stat records, wear, RNG and effects (8,834 drop candidates, 607
penalties). These retain the prior low-speed/zero-slope fixture limits.
A focused actual rolling-to-cup test verifies one payment and one completion,
with no ordinary landing accounting. The entire newly composed cup branch
still needs its own continuous native comparison. Earlier position/sampling
composition and live-world integration remain open.

### Continuous rolling-to-scored-cup verification

`verify-original-ground-cup-resolution.py` closes the composed ordinary cup
verification gap: 1,200 executions start at 0x42c13a, run real cup eligibility
and real ordinary hole completion, and finish at the actor skip exit. Complete
actor/completion records, hole/stat/financial/notice tables, text, selection,
score list and ordered effects match. Fixtures use a cup-centred low-speed
ball with zero slopes and vary ordinary actor classes, strokes, record data,
event mode, visual slot and callback mutations. Wider eligibility thresholds
remain covered by the preceding decision verifier; this run verifies full
composition for successful captures. Position/sampling and live integration
remain unfinished; no deployment or whole-game parity claim is made.

### Actor ball-motion composition

`original-actor-ball-motion.js` connects position/gravity, post-movement
subcell/edge sampling and the ground/air branches. Original pre-movement
cell/terrain locals remain supplied by the actor loop. Ground captures use
ordinary recovered scoring; air stops share the stopped-accounting handoff
extracted as `originalResolveStoppedMotion` without rerunning contact.

1,200 continuous native executions from 0x42bdc3 through scored-cup exit match
the full earlier scoring comparison, using original trig initialization.
The 800 contact-to-accounting comparisons still pass after the shared handoff
refactor. These successful-cup fixtures do not verify the whole new update's
airborne/mixed-terrain domain; those continuous checks and live integration
remain open. Original map-edge neighbor storage still requires implementation.

### Broader actor movement composition verification

The same `original-actor-ball-motion.js` now passes 3,000 continuous native
airborne cases from position integration to continued motion, including 44
obstacle collisions and 6,079 effects. The airborne fixtures vary rising/falling
velocity and fast/slow horizontal speeds while retaining positive height;
height samples match and terrain is uniform per fixture. This is not yet a
mixed-terrain flight-to-landing trajectory comparison.

A further 800 continuous ground cases start before movement and match stopped
accounting through skip, including 8,831 drop candidates and 607 penalties.
The height sampler is explicitly controlled in both the native harness and JS
resolver. Earlier standalone cup, contact and slope checks remain valid. Full
mixed-terrain trajectories, edge storage and live integration remain open.

### Explicit terrain edge storage

`original-terrain-byte.js` implements the raw column-major byte addressing
used by native neighbor reads, including z-edge aliases into adjacent columns.
Reads before/after the 2,500-byte map use explicit terrainPrefix/terrainSuffix
buffers and fail if the caller has not supplied those bytes. It does not invent
rough/water or clamp coordinates. Actor movement, origin-terrain sampling and
ground centre checks now use it; invalid cup cells bypass capture as native.

4,096 native border-sampling cases pass across all corners/subcells/neighbor
masks; the 2,000 rolling-to-cup comparisons still pass. Populating adjacent
storage in the full world adapter and broader integration remain open. This
change supplies storage semantics, not a completed live map conversion.

### Actor motion context from map state

`original-actor-motion-context.js` captures the pre-movement tile, terrain,
flags and coefficients from one original actor/map snapshot and resets the
per-step centre flag. It requires complete original metadata and derived edge
masks; missing coefficients or out-of-map actors are rejected instead of
receiving invented defaults. Three focused tests pass, including feeding the
context into the composed movement routine. This helper is a wiring step,
not a native parity claim for the outer actor loop or world conversion.

The saved original-world format names metadata byte 2 `shotClass`, while
actor accounting uses `scatterCoefficient`; an explicit full-world adapter
must unify these and keep mutations consistent. Mixed-terrain full actor
trajectories and live integration remain unfinished.

### Saved original-world actor map adapter

`originalWorldActorMap` now builds actor terrain, marks, derived edge masks,
metadata, RNG/phase and global flags alongside the existing exact height/slope
map. Runtime metadata byte 2 (`shotClass` in planning) is supplied as
`scatterCoefficient` for actor motion/accounting too. The existing
`originalWorldMap` API remains unchanged and shares the same build path.

Six world/adapter tests pass. An original-format save now supplies the composed
actor movement directly, and restoring that save produces the same movement
result without mutating the save. Actor/career record persistence, metadata
edit synchronization during callbacks, adjacent memory data, complete mixed
trajectories and live-world conversion remain open. This adapter does not
convert the differently scaled browser course or activate the original engine.

### Full mixed-surface actor trajectories

`verify-original-actor-trajectories.py` now runs 360 continuous trajectories
through `originalActorMotionContext` and `originalActorBallMotion`: 14,389
steps match the original, including 397 mixed-map tile transitions (including
final drop repositioning). Unlike the earlier pure-motion comparison, native
execution continues through actual stopped-shot accounting and drops. Each
step compares the full 256-byte actor record, RNG state, sound sequence and
stop decision. Fixtures include flat/elevated, uniform/mixed surfaces, edge
reflection, rising/falling shots and skills/luck. Height inputs and presentation
are controlled; cup flags are absent and cup completion has separate coverage.

This closes the identified full actor mixed-trajectory verification gap for
these fixtures. Original outer actor-loop integration, persistent actor/career
state, metadata mutation synchronization, and live-game conversion remain open.
The test is not proof of complete original-game or release parity.

### Actor action-to-motion integration

`original-actor-turn.js` connects the existing decision/swing/preparation
sequence to composed ball motion when it returns `motion`. It preserves the
pre-callback tile/terrain locals returned by dispatch rather than resampling
them from possibly changed ball coordinates. The native 0x42bdb5 zero-speed
check skips motion regardless of vertical velocity. Other unrecovered walking,
tutorial and retry continuations remain explicit.

Four focused context/turn tests pass, including a real phase-3 swing path that
advances the ball. The new whole actor-turn composition still needs a continuous
native verifier; component and trajectory checks do not close that gap.
Full outer-loop scheduling, live integration and persistence remain open.

### Continuous actor-turn verification

`verify-original-actor-turn.py` runs 1,500 native paths from 0x42819c through
movement or the existing explicit continuations. It compares actor/partner
records, counters, drawing state, RNG and ordered calls. Coverage: 1,207 skips,
163 actual movement updates, 126 walking continuations, four retry continuations.
Fixtures keep balls in-map and airborne when movement runs; condition/projection
helpers remain controlled, and the original trig initializer executes. Turn-order
locals are captured before motion reuses their native stack slots.

This closes the new action-to-motion handoff verification gap for those cases.
Walking/retry bodies, full world-loop integration, persistence and live conversion
remain unfinished. The test does not imply complete actor behavior or release.

### Angry departure branch

`original-angry-departure.js` recovers 0x428f64–0x429024. Flagged golfers
complain on the original actor-offset phase schedule, apply the animation/RNG
flag, wait -99, decrement the signed value and leave when below -10. Otherwise
the branch supplies the clubhouse-centred destination to movement at 0x429f27.
Unflagged golfers continue explicitly at 0x429024. 1,500 native cases match
actor bytes, RNG, destination and 497 timed complaints, including callback
changes and signed-word wrap. Earlier departure text and later ordinary walking
remain unrecovered; this helper is not yet wired into the complete turn.

### Finished-round departure and assignment cleanup

`original-finished-departure.js` recovers 0x429024–0x4290ca with real
0x425b10 cleanup. Completed golfers depart at the clubhouse or through the
native selection/offscreen conditions; selected pairs wait for the partner's
finished/inactive state. Cleanup resets actor fields and clears matching
entries in the 100×8-byte visitor assignment table at 0x567698. Selection
clearing follows the original paired checks.

1,500 native cases match actor bytes, full assignment table, selection state
and branches, including 647 real cleanup calls. Earlier departure text and
ordinary movement remain unfinished; this has not yet been connected to the
full actor turn or live game.

### Ordinary walking tee queue

`original-walking-queue.js` recovers 0x4290ca–0x429192: inactive hole
fallback to departure hole 19, same-hole zero-stroke queue comparison using
signed arrival clocks, partner exclusion, and selected-group cleanup calls.
The scan preserves its cached clock until paired cleanup calls return, then
refreshes it. It rereads actor records after effects and retains signed overflow
in the waiting count. Cleanup 0x425b50 remains an explicit resolver boundary.

600 native cases match all actor records, waiting counts, clock state and 2,624
ordered cleanup effects. Fixtures exercise all 152 actor slots, closed holes,
selection/world flags, signed clock boundaries, and cleanup mutations. Cleanup
bodies are controlled in this verifier; later distance comparisons, destinations,
walking, full actor integration and live conversion remain open. This is not
full golfer AI or release parity.

### Walking partner comparison

`original-walking-partner.js` recovers 0x429192–0x4294d1. It computes
cup heading and the partner-follow local from same-hole ball ordering,
original route distances, actor/ball proximity, terrain metadata and actor
flags. The native no-ball actor-parity fallback is preserved. Terrain lookup
returns code 20 outside the map; in-map reads use the original byte storage.

1,600 continuous native cases match cup heading and follow decisions (630
follow results), executing the real original heading and distance helpers.
Fixtures cover both partner indices, missing balls, different holes, terrain
classes, flags and clustered positions around the proximity thresholds.
The native routine's discarded partner heading is also evaluated. This check
ends before reaction/walking destinations at 0x4294d1; it does not integrate
movement into the live game or prove full walking behavior.

### Walking watch reaction and preparation composition

`original-walking-watch.js` recovers 0x4294d1–0x4295ef. Nearby actors
watch eligible airborne partner shots according to terrain, partner animation,
flags and original signed angular comparison. It sets the watching animation,
facing and randomized delay. The signed absolute-value overflow is preserved.
2,000 native cases execute real distance, heading and RNG helpers and match
full actor records, seed and branch, including 293 watching reactions.

`original-walking-preparation.js` joins tee queue, partner comparison and watch
reaction from 0x4290ca. Two integration tests prove queue locals survive a
watching reaction and closed-hole changes reach later decisions. These are
focused composition checks, not a continuous native verification of the whole
composition. Destination selection at 0x42960b and full turn/live integration
remain unfinished; no live rules changed.

### Walking ball destinations

`original-walking-ball-destination.js` recovers 0x42960b–0x4297c7,
returning the destination passed to 0x429f27 or the explicit no-ball/override
continuation. It preserves the eight native direction vectors, green stance
offsets, actor-parity partner offsets, signed half-offset arithmetic and water
fallback to the golfer's own ball. The original ball position local is retained.

1,800 native cases match branch, follow local, ball position and destination,
with 972 destinations. The native terrain and heading helpers execute. Fixtures
include mixed green/rough/water, edge positions, both actor parities, missing
balls and overrides. Walking preparation now invokes this branch after watch
checks; both composition tests pass. No-ball/tee destinations, later service
selection and movement at 0x429f27 remain open, as does live integration.

### Tee destination and initial service admission

`original-walking-tee-destination.js` recovers 0x4297c7–0x429947:
class/style selection of tee coordinates, native stance offset, waiting-group
spacing from hole direction and actor parity, and the two signed actor-value
thresholds leading to service search at 0x429947 or continuation at 0x429a84.
The thresholds preserve doubled queue-count overflow and flag adjustments;
this does not assign unverified human-readable meanings to the two counters.

1,800 native cases match tee positions, final destinations and service branches
using real heading calculations. Fixtures cover class/style alternatives,
direction bytes, actor parity, flag combinations, counter values and signed
queue overflow. Walking preparation connects the no-ball/override branch to
this helper. Three focused composition tests pass, including missing-ball tee
selection followed by service admission. Actual facility lookup, later movement,
continuous whole-preparation native verification and live integration remain open.

### Original nearest-facility search

`original-nearest-facility.js` recovers the complete 0x40daa0–0x40db56
search rather than substituting a geometric nearest-building query. It scans
256 sixteen-byte records at 0x58a708, applies signed catalog width/2 to the
origin tile, uses original map distance and retains the first equal-distance
match. For types >=6, a matching record without flag 0x40 terminates the entire
scan, preserving the executable's ordered-table behavior. The global distance
starts at 65535 even when no result is found.

1,200 native searches execute actual distance arithmetic and match result index
and distance; 891 find a result. Fixtures vary types, inactive records, signed
widths and positions. The pure adapter accepts the full original record table.
This closes the search helper needed by walking service selection; it has not
yet been connected to the service branch or live building records. Facility
catalog/persistence mapping and complete golfer movement remain unfinished.

### Walking service search integration

`original-walking-service-search.js` recovers 0x429947–0x4299c0 and
rejection at 0x429a6f, executing `originalNearestFacility` for type 7. The
flag-dependent distance limit is strict: distances equal to the limit reject.
Acceptance sets flag 0x2000 and uses the facility's origin tile centre as the
walking destination; rejection clears that flag, sets service index -1 and
retains the previous tee destination. Search distance still uses the catalog
width-adjusted centre, matching the distinct native calculations.

1,200 continuous native cases execute actual search and distance helpers and
match actor bytes, selected index, distance, destination, call sequence and
branch (456 accepted stops). Walking preparation now invokes the search after
service admission; three composition tests pass, including a real facility
selection. Later service fallback at 0x4299c0, arrival handling at 0x429b53,
full movement and live integration remain open.

### Marked-tile service fallback

`original-nearest-service-tile.js` recovers 0x40db60–0x40dc69: the
nine-by-nine column-major search for tile flag 0x200, strict radius comparison,
first-match tie handling, and unchanged Z output when no tile is found.
`original-walking-service-fallback.js` connects it to 0x4299c0–0x429aae,
including the alternate 0x429a84 entry, signed counter/20 threshold, queued
waiting adjustment, flag-dependent radius, destination and service index -2.

1,200 continuous native cases execute real tile search and distance helpers;
actor bytes, distance, tile outputs, destination, ordered calls and branches
match, with 613 accepted stops. Walking preparation now traverses primary
rejection or skipped admission into fallback. Four composition tests pass,
including a real primary-search miss followed by a marked-tile destination.
Later partner/service checks, arrival execution, movement and live integration
remain unfinished; the full composition still needs continuous native coverage.

### Partner-dependent secondary service

`original-walking-partner-service.js` recovers 0x429aae–0x429b53,
including rejection at 0x429c37. It compares signed elapsed actor/partner
clocks and partner strokes, honors flag 0x4000000, then runs the actual type-3
facility search with a strict 3072-unit cutoff. Success uses the facility's
origin tile; rejection retains the prior destination and clears the service
index. The distinct continuation entries 0x429c40 and 0x429c49 are preserved.

1,200 continuous native cases match actor bytes, service index, distance,
destination, ordered search calls and branches (433 accepted stops). Fixtures
include signed clock boundaries, partner progress, flags and real facility
records. Walking preparation connects this after unsuccessful/unused earlier
service checks; all five focused composition tests pass. Later service/arrival
branches and movement remain open, along with continuous full-composition
verification and live integration.

### Optional type-6 pre-shot service

`original-walking-type6-service.js` recovers 0x429c40–0x429d13,
including successful flag storage through 0x429b70. It preserves existing
service selections, skips golfers with strokes, resets the club before optional
eligibility checks, applies class/style/availability gates, and runs the original
ordered type-6 lookup. Accepted destinations use actor-parity interior offsets;
rejection clears flag 0x40 and proceeds to the next optional service check.

1,200 native cases match actor bytes, index, search distance, destination, calls
and continuation, with 113 new accepted stops. Native success executes the
actual flag write before comparison; no state patch stands in for that write.
Walking preparation connects secondary search results into this branch, and
five composition tests pass. Later optional services, movement, complete native
composition verification and live integration remain open.

### Optional type-8 service and selected-stop flags

`original-walking-type8-service.js` handles entries 0x429b53/b5f/b70/b76
through 0x429d3d or 0x429e0d. It preserves entry-specific flag clearing,
existing selected services, first-stroke/class/style/availability gates, the
type-8 distance limit and parity-based destination. Walking preparation invokes
it for all matching continuations, including previously selected primary stops.

1,200 native cases match actor bytes, index, distance, destination, ordered
calls and continuation; 129 newly select a stop. For the b70 entry, native
verification begins at b67 so its preceding compare supplies the actual branch
flags and flag storage executes normally. Five composition tests pass. Type-8
availability and original facility tables remain explicit state inputs. Remaining
optional service branches, arrival/movement, full composition verification and
live integration remain unfinished.

### Final optional facility check

`original-walking-type10-service.js` recovers 0x429d3d–0x429e24 and
selected-service entry 0x429e0d. It preserves eligibility, flag-dependent
six/nine-tile distance cutoff, actor-parity interior offsets plus 2560 units,
and flag 0x20 updates. Previously selected services reach movement at 0x429f27;
no selection continues to partner spacing at 0x429e24.

1,200 native cases match actor bytes, search calls, index, distance,
destination and continuation, with 111 newly accepted stops. Walking preparation
connects this after type-8 handling; five composition tests pass. The remaining
partner-spacing branch and actual movement/arrival are still unfinished, as
are continuous full-composition verification, persistence and live integration.

### Final partner spacing and destination completion

`original-walking-partner-spacing.js` recovers 0x429e24–0x429f27,
including signed hole ordering, actor ordering, partner flag/animation checks,
and the independent override offset. Both half-tile offsets can accumulate.
Each applied adjustment clears the movement-ready local and sets flag 0x800.

1,600 native cases match full actor records, destination and movement local;
746 apply spacing. Walking preparation now connects the no-service continuation
to movement entry. Six composition tests pass, including cumulative spacing
with a grounded partner (an airborne partner correctly diverts to watching).
Destination selection from 0x4290ca now reaches a watching skip or 0x429f27
through the implemented branches. Continuous native verification of that entire
composition is still required; actual movement/arrival, earlier departure
integration, persistent world actors and live conversion remain unfinished.

### Continuous walking-preparation verification

`verify-original-walking-preparation.py` executes 500 original paths from
0x4290ca continuously through destination preparation. All match full actor
records, queue/follow/heading/movement/service locals, destination, RNG, shared
search outputs, queue clock and ordered effect calls. Coverage: 464 movement
entries, 36 watching skips, 180 cleanup calls, 357 type-7 searches, 119 type-3
searches, 87 marked-tile searches, 28 type-6 searches, 26 type-8 searches and
28 type-10 searches. Native heading, distance, RNG and search bodies execute;
visitor cleanup effects are controlled and mutate actor/clock state on both
sides. Mixed terrain, holes, actor flags, waiting and facility records vary.

This closes the full destination-preparation composition check for these
fixtures, rather than relying only on component tests. It does not cover actual
movement beyond 0x429f27, earlier walking/departure entry, real cleanup bodies,
complete actor scheduling, persistent live-world adaptation or release parity.

### Walking arrival gate

`original-walking-arrival-gate.js` recovers 0x429f27–0x42a019. A
water destination falls back to an existing ball; arrival uses strict 128/512
unit radii depending on service records. The negative service index -2 reads
preceding record storage, which must be supplied explicitly as facilityPrefix.
No invented record type replaces that native read. Arrival sets animation and
partner-facing, then preserves the active-shot, finished-round and service
arrival continuations. Distance/delta and corrected destination are returned.

1,600 native cases execute real terrain, heading and distance helpers and match
actor bytes, distance and branches: 749 walking continuations, 283 service
arrivals, 291 active-shot continuations, 277 finished departures. Fixtures
include 127/128/129 and 511/512/513 boundaries, water correction, missing balls
and preceding record types. Corrected destination/delta have not yet been
compared independently in this verifier. Actual stepping at 0x42a71c, service
arrival bodies and live integration remain open; this gate is not yet composed
with the complete destination sequence.

### Continuous destination-to-arrival integration

`original-walking-approach.js` connects preparation to arrival for movement
entries and preserves waiting skips. `verify-original-walking-approach.py`
executes 500 continuous native paths from 0x4290ca through arrival, comparing
full actor records, locals, corrected destination/delta, distance, RNG, search
outputs and calls. Results: 446 walking continuations, 46 skips (including
finished departures), eight service-arrival continuations. The fixture set has
no active-shot arrival; that branch has separate arrival-gate coverage.

The native corrected destination is captured at 0x429f4c before facing reuses
registers. Native search, distance, heading and RNG execute; visitor cleanup
remains controlled. This closes the destination/delta comparison and composed
arrival handoff for these fixtures. Actual movement starts at 0x42a71c, with
near-target steering followed by golfer avoidance and a separate far-target
route branch at 0x42aa30. Those bodies, service arrivals, earlier entry and live
integration remain unfinished.

### Near-target walking steering

`original-walking-near-steering.js` recovers 0x42a71c–0x42a793 and
the actual octant approximation at 0x466a70. Targets at least 1024 units away
continue to 0x42aa30. Closer targets add half the distance to both deltas before
choosing facing, clear the native word at 0x1c, and optionally pause on a direct
reversal using the original RNG. Signed octant comparisons retain strict 2:1
boundaries and the original zero-vector outcome.

1,600 native cases execute real octant/RNG helpers and match actor bytes,
previous facing, RNG and branches: 1,135 near-target cases, 465 far-target
continuations and 68 reversal pauses. These fixtures verify steering, not actual
position updates. The helper is not yet composed after arrival. Avoidance at
0x42a793, far routing at 0x42aa30, actual walking steps and live integration
remain open.

### Near-target golfer avoidance

`original-walking-avoidance.js` recovers 0x42a793–0x42aa30: ordered
cyclic scanning from the global cursor to the current actor, hole/clock/partner
eligibility, queue counting, ordinary and angry proximity radii, facing-based
yielding, RNG delays and angry-golfer reactions. Congestion preserves the two
continuations at 0x42ad32 and 0x42ad3b, including reaction-before-counter update.
Identity/reaction helpers remain explicit synchronous effects.

700 native cases match all actor records, movement/count/scan locals, RNG,
ordered calls and branches: 520 ordinary continuations, 91 congestion entries
and 89 complaint continuations. Fixtures include dense queues, angry actors,
partner rules, cursor order and reaction mutations; native distance, octant and
RNG execute, while identity/reaction bodies are controlled. The helper remains
separate from the complete approach. Far routing, congestion continuation,
position stepping, service arrivals and live integration remain open.

### Far-target route setup

`original-walking-far-route.js` recovers 0x42aa30–0x42abda: retained
step-budget continuation, marked-water reaction and bit update, pathfinder
request, world flag handling, reversal correction and sub-tile walking budget.
Pathfinding at 0x42def0 remains an explicit synchronous resolver, not an invented
route algorithm. Reactions may mutate actor state before RNG/bit updates;
pathfinding may set flags that shorten the resulting budget.

1,400 native cases match actor bytes, world flags, RNG, ordered calls and
continuations. Native RNG runs; pathfinder/reaction outputs are controlled with
matching mutations. This verifies route setup only, not pathfinding or position
updates. Later budget scaling/congestion, the real pathfinder, walking steps,
service arrivals and live integration remain unfinished.

### Route terrain and steepness reactions

`original-walking-route-reactions.js` recovers 0x42abda–0x42ad32:
scaling the signed route budget, difficulty/stroke/terrain gates, flag 0x40000000
warning state, and steepness reactions. Native code queries slope twice before
its reaction; the adapter preserves both queries and rereads actor state after
effects. The next-terrain local remains explicit and distinct from ball terrain.

1,400 native cases match actor records, ordered calls and continuation. Fixtures
vary budget, difficulty, signed stroke byte, facing, terrain metadata, flags and
previous reactions; reaction effects mutate state on both sides, and slope
outputs remain controlled. This is not verification of the terrain slope helper
or full walking. The module is not yet composed with route setup; remaining
congestion, pathfinder, stepping, service arrivals and live integration remain
unfinished.

### Congestion delays and composed near behavior

`original-walking-congestion.js` recovers 0x42ad32/0x42ad3b–0x42adac:
flag 0x1000 entry, randomized wait, easy-difficulty extra RNG/flag, animation
and signed unhappy-value/class departure gate. 1,600 native cases match actor
bytes, RNG and branches (323 departure entries). Departure text, record updates
and partner removal after 0x42adac remain open.

`original-walking-near-behavior.js` composes near steering, avoidance and
congestion. 700 continuous native runs from 0x42a71c match full actor records,
scan/count/movement locals, RNG, effects and exits: 661 step continuations and
39 unhappy-departure entries. Real direction/distance/RNG execute; reaction and
identity effects are controlled. Fixtures use one near-target vector with
varied crowd/actor state; separate steering tests cover other vectors. Actual
walking steps at 0x42af66, far pathfinding, service arrival bodies, departure
completion and live integration remain unfinished.

### Actual walking position update

`original-walking-position-step.js` recovers 0x42b17c–0x42b2b2:
world-rate adjustment, distance cap, difficulty/fast-walking/diagonal scaling,
slow-step flag, actual actor X/Z update and signed route-budget decrement.
Entering water from a non-water cached tile clears that budget. This uses the
native direction vectors and integer arithmetic rather than elapsed-time lerp.

1,600 native cases match the full actor record and computed step distance,
with real clamp and terrain lookup execution. Fixtures cover all eight facings,
rate/distance bounds, difficulty, fast walking, world slowdown, mixed water and
signed budgets. Earlier rate selection at 0x42af66–0x42b17c and later walking
fatigue/animation remain unfinished; this position helper is not yet connected
to a complete walking tick or live gameplay.

### Walking speed selection and composed position step

`original-walking-rate.js` recovers 0x42af66–0x42b17c: wait/invalid
facing gates, signed terrain walking cost, fatigue cap, selected-golfer/path
rate changes, phased boost, cart flags/upgrades and activation sound. Raw
neighbor path reads require explicit adjacent storage beyond the map, preserving
native memory semantics rather than clamping. Sound is an explicit effect.

1,400 native rate cases match actors, rates, calls and branches, including 74
activation sounds. `original-walking-step.js` connects rate selection to actual
position movement; another 1,400 continuous native cases match actor records,
rate, sound calls and exits from 0x42af66 to 0x42b2b2 or the waiting gate.
This composed set uses uniform non-water terrain and varied path flags;
water-crossing updates have separate position-step coverage. Post-step fatigue,
animation, pathfinder, service arrivals and complete live integration remain open.

### Complete step with fatigue and animation

`original-walking-post-step.js` recovers 0x42b2b2–0x42b408: phased
fatigue accumulation with signed wrapping, path cost, hole contribution,
threshold reactions, special-class cap, world destination override, animation
cycling and shot/retry continuation. 1,400 native cases match actor records,
ordered reaction calls and exits, including signed animation and fatigue edges.

`original-walking-complete-step.js` joins rate, position and post-step behavior,
and executes the paused actor's route-budget reset. 1,400 continuous native
runs from 0x42af66 match actor records, rate, calls and exits (76 sound/reaction
effects). This fixture set uses stationary ball state, uniform non-water
terrain and controlled effect bodies. The separate post-step verifier covers
moving-ball continuations. Complete walking decisions still need connection
to this step, and pathfinder, service/departure bodies and live integration
remain unfinished.

### Continuous near-target walking tick

`original-walking-near-tick.js` connects steering/avoidance/congestion to the
complete walking step when the actor continues at 0x42af66. It preserves
ordered effects and leaves unhappy-departure execution explicit.

700 continuous native cases from 0x42a71c through step completion match the
full actor arena, RNG, ordered calls and exits: 661 completed/skipped ticks,
39 unhappy-departure entries and 396 actual position changes. This set uses a
single near-target vector, next-terrain code 1 and uniform non-water terrain;
crowd, actor state, phase and difficulty vary. Native distance/octant/RNG run,
while reaction/identity/audio effects remain controlled. Separate component
checks cover other terrain, speed and vector cases. The tick is not yet linked
to destination/arrival dispatch; far pathfinding, departure/service bodies,
world persistence and live integration remain unfinished.

### Destination dispatch through actual near walking

`original-walking-dispatch.js` connects destination/arrival processing to the
near-target walking tick and preserves final follow-partner locals. Far-route
and service-arrival continuations remain explicit.

500 continuous native runs from 0x4290ca match full actor records, RNG, ordered
effects and exits: 365 far-route entries, 127 completed/skipped paths, eight
service arrivals, and 59 actual position changes. Fixtures vary mixed terrain,
facility records, actors and queue state; next-terrain input is fixed at 1.
Real search/direction/distance/RNG execute; cleanup, identity, reaction and
sound effects remain controlled. This verifies the new composition for those
cases, not full actor scheduling or pathfinding. Far routing, service arrivals,
unhappy departures, persisted actor/world mapping and live integration remain
unfinished.

### Pathfinder direction selection and bridge centering

`original-pathfinder-selection.js` recovers 0x42e327–0x42e556,
consuming an explicit original 50×50 visited-cost wavefront. It preserves
strict score comparisons, preferred-direction weighting, exclusion of terrain
20, bridge diagonal restrictions, sub-tile bridge centering and the signed
no-route fallback. The real 0x40bc50 helper excludes terrain 20 in addition to
checking map bounds; treating it as bounds-only would be incorrect.

1,800 native comparisons match returned directions and world flags, including
31 new bridge-centering flags and 69 no-direction results. Fixtures vary map
edges, visited costs (including 0 and 255), terrain, bridge flags, preferred
masks and sub-tile positions. The native map helper executes without a stub.
These supplied wavefront fixtures do not verify wavefront generation, complete
pathfinding or live walking. Those integrations remain unfinished.

### Original wavefront generation through route selection

`original-pathfinder.js` recovers setup and wavefront expansion from
0x42def0 through 0x42e25a and connects the recovered direction selector.
It preserves clamped original coordinates, XOR-one partner avoidance,
heading-derived preference masks, signed traversal costs, path discounts,
terrain metadata modifiers, water costs, dynamic origin cost limits and the
1024-slot ring queues. Debug-display mode remains an explicit continuation
at 0x42e25a; its display effects are not implemented here.

160 uninterrupted native searches match returned direction, world flags,
all 2,500 visited-cost bytes and both complete queue arrays. Fixtures include
mixed terrain/path flags, short and long routes, clamped out-of-map endpoints,
same-tile returns, abort requests, hole 19 and alternate world mode. Native
heading, octant and map helpers run without stubs. Traversal costs in this
matrix are positive, metadata codes are nonnegative, and debug display is
disabled. This is complete-search coverage for these fixtures, not evidence
for every possible memory state or live gameplay adoption. The longer-walk
caller still needs connection and continuous verification; service arrivals,
departures and authoritative actor persistence remain open.

### Far-walk caller with actual pathfinding

`original-walking-pathfinder-route.js` replaces the caller's controlled search
response with the recovered pathfinder, while retaining explicit reaction
resolution. Caller coordinates are preserved rather than replaced by the
search's tile locals. Debug rendering still requires its own continuation.

160 uninterrupted native caller cases match actor bytes, RNG, ordered calls,
world flags, visited costs and exits: 121 actual searches and five bridge
reactions. Native search and RNG execute; the reaction body is a controlled
mutation. The original 1,400-case caller matrix and 160-case full-search
matrix also pass. These checks stop before route reactions and subsequent
movement, and do not establish live integration.

During composition verification, the fixture's metadata writes were found to
overlap actor storage for unused high indices. Both search verifiers now write
only the 23 terrain metadata entries their fixtures actually reference. The
corrected complete-search matrix still passes. This was a fixture correction,
not a change to native gameplay semantics.

### Continuous far-target walking tick

`original-walking-far-tick.js` joins actual pathfinding, route reactions,
the shared reversal pause, golfer avoidance/congestion and the complete
movement step. Existing route budgets bypass search and route rescaling,
while still passing through the shared reversal/avoidance logic.

160 uninterrupted native cases from 0x42aa30 match all 152 actor records,
shared RNG, ordered helper calls and exits: 152 completed/skipped ticks,
eight unhappy-departure entries and 100 position changes. Actual native
pathfinding and RNG run; slope, reaction, identity and sound effects remain
controlled. This composition matrix uses uniform terrain 10, traversal cost
2, no path flags and next-terrain input 1, with varied crowds, difficulty,
retained routes and prior facing. The separate 1,400-case route-reaction
matrix also passes. Mixed-world component coverage does not substitute for
full live-world integration. Destination dispatch, unhappy departures,
service arrivals and persistent live actor mapping remain unfinished.

### Destination dispatch through both walking routes

`original-walking-dispatch.js` now routes far-target continuations into the
actual far-walking tick, preserving the prior facing captured by steering.
It also forwards the synchronous effect resolver into near walking; that
callback was previously omitted from the composition.

The extended 500-case uninterrupted native matrix starts at 0x4290ca and
continues through near or far movement: 492 completed/skipped ticks, eight
service-arrival entries and 405 position changes. Full actor storage, RNG,
ordered calls and exits match. Fixtures vary mixed terrain, facilities,
queue state and actors, using traversal cost 2 and next-terrain input 1.
Search/direction/distance/RNG helpers execute natively; cleanup, slope,
identity, reaction and sound effects remain controlled. This supersedes the
previous matrix stopping 365 cases at far-route entry. Service-arrival and
unhappy-departure execution, earlier walking entry, persisted world mapping
and live adoption are still incomplete.

### Facility arrival behavior and income

`original-facility-arrival.js` recovers 0x42a200–0x42a52b for ordinary
facility records. Types 7, 3, 6, 8 and 10 preserve their ordered reactions,
wait/animation/need updates, RNG, tile service flags and cash/period income.
Service levels and ledger period are reread at their native points after
callbacks. Independent type checks preserve potential facility changes during
effects rather than assuming an immutable switch statement.

900 native cases match actor bytes, RNG, cash, signed income ledger, period,
service tile arrays and ordered calls. Fixtures exercise each handled type
plus an unhandled type, level thresholds and ledger wrapping. Reaction,
sound and money-notice bodies are controlled; reactions mutate cash/levels
and the notice changes ledger period to test read ordering. The actual RNG
executes natively. Tile-service arrivals (index -2), partner continuation
(index -1), composed dispatch and authoritative live service integration
remain open; this does not change the deployed economy.

### Walking dispatch completes ordinary facility visits

Destination dispatch now executes the actual facility-arrival module for
nonnegative service indices. Negative tile-service and partner continuations
remain explicit. Shared RNG and ordered effects survive the transition.

The 500-case continuous native dispatch matrix now includes deliberately
nearby type-7 facilities: 90 paid service visits, 326 position changes,
495 completed/skipped ticks and five remaining non-facility arrivals.
Actor storage, RNG, ordered calls, cash and service-income ledger match.
Search and arrival rules execute uninterrupted; reaction/audio/notice bodies
are controlled. This closes composition for the covered ordinary visits,
not the negative-index arrivals, all facility types in a complete round,
live persistence or production integration.

### Partner waiting and resumption after arrival

`original-arrival-partner.js` recovers 0x42a168–0x42a1f7 and
0x42a52b–0x42a71c. It preserves partner/hole ordering, facing and wait RNG,
starting-ball locals, phase setup and movement resets. In the late waiting
branch the executable compares the actor's cup distance with the partner's
Z offset from the cup, not with a second distance calculation; the module
retains this observed behavior.

1,600 native cases match both actor records, RNG and exits: 1,463 shot-setup
continuations, 113 waits/skips and 24 later waiting continuations. Native
heading/distance/RNG execute without effect stubs. Starting-ball coordinates
are explicit fixture locals; their preceding caller preparation and complete
arrival dispatch still need connection. Tile rest arrivals, subsequent shot
execution and authoritative live actor integration remain unfinished.

### Tile rest arrival and standing-position retries

`original-rest-arrival.js` recovers 0x42a026–0x42a168: fatigue-derived
rest delay, decoration-dependent reaction/sound, signed mood adjustment,
shared random cardinal direction retries, standing-position offsets,
fatigue clearing and animation phase reset. It leaves adjacency helper
0x4071d0 as an explicit synchronous effect.

1,200 native cases match actor bytes, RNG and ordered effects, including
signed fatigue boundaries, zero fatigue, retry exhaustion and successful
placement after repeated rejections. Actual native RNG executes; adjacency
results and reaction/audio effects are controlled. The fixture supplies the
cached tile and decoration value directly. Recovering the adjacency helper,
connecting the original decoration map, partner continuation and complete
live arrival integration remain unfinished.

### Rest visits use actual terrain adjacency

`original-rest-adjacency.js` recovers 0x4071d0–0x407267, including
terrain-class gates, excluded rest surfaces, neighboring path/service flags,
and the final bounds/terrain-20 rejection. Raw neighboring reads precede
bounds rejection; out-of-storage reads require explicit prefix/suffix arrays.
`original-rest-visit.js` uses this helper within the arrival retry loop.

1,200 uninterrupted native rest visits match actor state, RNG and ordered
calls with the native adjacency helper running. Fixtures vary terrain codes
1/2/7/17/20/21/22, signed metadata classes, path/service flags and positive
fatigue; the rest tile is interior (23,24). Reaction and sound bodies remain
controlled. Edge-memory behavior and negative-fatigue combined searches are
not covered by this matrix. Decoration-map lookup, partner continuation and
full live dispatch/persistence remain unfinished.

### Service arrival dispatch and rest-to-partner continuation

`original-service-arrival.js` dispatches at 0x42a019: nonnegative facility
indices use facility arrivals, -2 reads the original rest-decoration map and
executes rest placement, and negative-index arrivals continue into partner
waiting/shot preparation. Calls and RNG consumption are accumulated in order.

1,200 uninterrupted native runs from 0x42a019 match resting actor bytes,
RNG, ordered effects and final continuations through partner handling.
Fixtures cover interior rest tiles with mixed terrain/flags, partner hole
and stroke states, and explicit starting-ball locals. Native adjacency,
heading and RNG execute; reactions/audio remain controlled. Earlier walking
must supply verified starting-ball locals before this dispatcher replaces
all negative-index arrival continuations. Live integration, later shot/wait
execution and remaining unhappy departures are still open.

### All arrival branches connected to destination dispatch

Confirmed starting-ball locals are the cached own ball at 0x429639/0x429642,
or the selected tee centre at 0x429842/0x42985d before stance offsets.
Walking approach now carries these locals, current waiting-group count and
movement-ready state into arrival handling. Dispatch executes ordinary,
rest-tile and partner arrivals using the combined service dispatcher.

500 uninterrupted native destination-through-walking/arrival cases match
actor records, RNG, calls, cash and service income: 75 rest visits, 76 paid
facility visits, 307 position changes, 76 shot-setup continuations and 424
completed/skipped ticks. Deliberate rest scenarios supplement mixed random
layouts. Native route/rest helpers execute; selected reaction/audio/notice
and cleanup effects remain controlled. The verifier distinguishes the shared
0x42b3d8 address reached from arrival from movement's own passage through it.
Later shot/wait continuations, unhappy departures, earlier actor entry and
live world/persistence adoption remain unfinished.

### Arrival continuations now reach the actual tick exit

Partner arrival now executes the 0x42badc late-wait body: clear route budget,
consume RNG(4), store its negation as delay, then skip. The shot-preparation
branch reaches 0x42b3d8 with speed already cleared and therefore also skips;
it does not launch a shot in this tick. Both formerly explicit continuations
now complete without treating an intermediate address as an unfinished exit.

All 1,600 partner-arrival cases and 1,200 rest-through-partner cases pass
through the real native tick exit. The 500-case complete walking dispatcher
also passes (75 rest visits, 76 paid visits, 307 position changes), with all
cases exiting the tick. This closes those arrival continuations, not later
actor scheduling/shot execution, unhappy departures or live adoption.

### Congestion-triggered departure

`original-congestion-departure.js` recovers 0x42adac–0x42af66: paired
complaint assembly, notice effects, hole departure counter, completion flags,
partner ball/position clearing, cleanup and the departing actor's status.

800 native cases match both actor records, hole records, completion records,
complaint text, message flag and ordered effects. Names, integer formatting,
notice bodies and partner cleanup are controlled in the oracle; the module
formats the signed hole value directly. Random initial record contents cover
counter wrapping and preservation of unrelated fields. Actual name/notice/
cleanup composition, connection to congestion decisions and authoritative live
departure remain unfinished.

### Congestion gate through departure outcome

`original-congestion-outcome.js` connects difficulty-dependent congestion
waiting and the unhappy-departure gate to complaint/record/partner cleanup.
Non-departing actors retain the movement continuation; departing actors reach
the tick exit. The combined result preserves congestion RNG consumption.

800 uninterrupted native cases from both congestion entries match actor and
hole/completion records, shared RNG, complaint text, message flag, calls and
exit. Difficulty, signed mood, actor class and initial flags vary. Names,
integer-formatting and notice/cleanup effects remain controlled. Walking
avoidance integration and actual effect implementations/live adoption remain
open; this composition is not a production behavior change.

### Walking dispatch completes congestion departures

`original-walking-completed-dispatch.js` executes the departure body when
near/far walking reaches its unhappy-departure continuation, combining calls
while preserving the walking RNG state and locals.

500 uninterrupted native cases from destination preparation through tick
exit match actor/hole/completion records, RNG, complaint/message state,
ordered effects, cash and service income. Deliberate crowded fixtures produce
76 departures; the matrix also contains 49 rest visits, 51 paid facility visits
and 272 position changes. All 500 reach skip. Name/formatting, reaction,
notice/audio and cleanup bodies remain controlled. This verifies the covered
walking flow, not earlier actor entry, actual effects, multi-tick persistence,
shot scheduling or live adoption; those remain unfinished.

### Initial walking state and complaint gate

`original-walking-entry.js` recovers 0x428ad1–0x428b38, carrying the
entry accumulator into queue/follow locals, resetting service index and
applying the world/class mood floor before the new-complaint gate.
The accumulator is explicit; its preceding caller provenance is not assumed.

1,600 native cases match actor bytes, walking locals and branch exits,
including signed threshold boundaries: 49 new-complaint entries and 1,551
continuations at 0x428f64. No native helpers are stubbed in this slice.
New-complaint text/outcome, complete entry composition and live actor
scheduling remain unfinished.

### Initial angry complaint and membership resignation

`original-angry-complaint.js` recovers 0x428b38–0x428f64: reason-table
wording, pronouns, hole/round suffix, membership resignation, notice effects,
completion/hole records and angry departure state. It rereads state after
synchronous callbacks and preserves selection clearing for the native flag.

800 native cases match actor/hole/completion records, complaint text, message
flag, selection and ordered calls. All 256 reason bytes occur, with varying
hole numbers and membership record bits. Names, identity, integer formatting
and notice bodies are controlled. Entry-gate composition, real helper effects,
subsequent departure handling and live scheduling remain unfinished.

### Walking entry through complaint and departure checks

`original-walking-entry-complaint.js` joins entry gating to initial complaints;
`original-walking-prelude.js` continues through angry-departure timing or
clubhouse routing and finished-visitor cleanup.

Both 800-case continuous native matrices pass. The full prelude compares
actor/hole/completion records, assignment cleanup, RNG, text/message state,
selection, walking locals, calls, destination and exit. Fixtures use entry
accumulator zero, varying complaint gates and phases 0/1/100. Name/identity,
formatting, notices and reaction bodies remain controlled; actual RNG and
assignment cleanup execute. Clubhouse globals alias part of the packed hole
storage, so the native and JS fixtures initialise that shared storage
consistently. Joining this prelude to destination/movement dispatch, earlier
scheduler provenance and live persistence remain unfinished.

### Walking entry through destinations, visits and departure

`original-walking-flow.js` joins the prelude to normal destination dispatch
or direct clubhouse arrival/movement, then completes congestion departures.
A shared post-approach dispatch avoids duplicating near/far and arrival logic.

500 uninterrupted native runs from 0x428ad1 through tick exit match actor,
hole/completion and assignment records, RNG, selection, complaints, ordered
effects, cash and service income. Coverage includes 167 departure notices,
201 position changes, 51 paid visits and 49 rest visits. Entry accumulator is
zero; traversal cost is 2 and next-terrain input 1. Names/notices/reactions,
slope/audio and cleanup effects remain controlled. The prior 500-case
completed-dispatch suite also passes after refactoring. Earlier scheduler
locals, real effect implementations, multi-tick authoritative persistence and
live-game adoption remain unfinished; this is not a release-completion claim.

### Native actor-to-walking context

`original-actor-walking-context.js` maps actual actor-decision locals into
walking inputs. The actor terrain cached at 0x428810 supplies both the later
walking-cost terrain and reversal test (stack 0x2c); it is not an independent
boolean. Partner readiness supplies walkingOverride, movementReady starts at
one at 0x4289ab, prior flags come from the motion gate, and EAX is zero at
0x428aab before walking entry.

The 1,500-case continuous actor-decision oracle passes with added native-local
comparisons for all 208 walking entries. Cached flags, terrain, override,
movementReady and entry value match actual registers/stack. Snapshot fields
remain explicit; mapping into live global names and full actor-turn walking
composition are still unfinished.


### Actor decisions continue through walking

`original-actor-walking-decision.js` now composes the actor decision prefix,
verified walking locals and walking flow. It carries ordered effects and RNG
counts across the boundary and reconciles `globalFlags`/`worldFlags`, which
represent the same native word, including callback changes through either name.
Conflicting callback writes are rejected rather than silently choosing a value.

`verify-original-actor-walking-decision.py` passes 1,500 uninterrupted native
cases beginning at 0x42819c. Exits are 1,192 skips, 89 motion continuations,
80 shot-preparation continuations, 131 swing continuations and 8 tutorial
continuations. Comparisons include all 152 actor records, 20 hole records,
visitor assignments, shared flags, avoidance/selection state, visual ownership,
tracking, tile flags, RNG and ordered calls. Controlled slope callbacks also
mutate shared flags through either JS alias and match the native mutation.
The clubhouse fixture follows the native alias with hole 19 tee storage.

This matrix uses uniform terrain 1 and traversal cost 2; lookup/reaction,
projection and slope effects are controlled. It does not verify arbitrary maps,
real effect bodies, subsequent shot execution, multi-tick scheduling or live
adoption. The full actor-turn module still needs this walking continuation
integrated before authoritative live persistence can use the combined flow.


### Walking integrated into the recovered actor turn

`original-actor-turn.js` now executes the combined decision/walking flow,
then shares the existing shot continuation before ball motion. Extracting
`originalActorShotContinuation` avoids executing the decision prefix twice.
Putt accounting updates the packed hole record as well as its separate counter
view when the full snapshot includes both.

The expanded `verify-original-actor-turn.py` passes 1,500 uninterrupted native
turns with 126 walking entries, 99 planner calls, 66 actor-position changes and
182 ball-motion exits. The remaining exits are 1,302 skips and 16 waiting
continuations at 0x42d23c (previously mislabeled as tutorial continuations). All actor and hole bytes, putt counters, visitor assignments,
shared flags, selection/tracking, RNG and calls match. Packed hole bytes are
compared directly, without reconstructing their counters in the assertion.
The prior 1,500 actor-action comparisons and the active-ball-motion Playwright
test also pass.

This verifies one-turn composition on uniform terrain with controlled planner,
reaction, projection and slope helpers. Tutorial/retry continuations, actual
helper effects, arbitrary-world adapters, multi-tick scheduling and production
adoption remain open. No live renderer or hosted rules changed here.


### Actor retry waiting completes within the turn

Native disassembly identifies 0x42d23c–0x42d25f as a random delay in
[0, 7], negated into the signed delay word, followed by phase zero and
animation 11. It is a waiting branch, not a tutorial. `original-actor-turn.js`
now executes it with the shared RNG before returning skip.

The same 1,500-case continuous native turn matrix passes with those 16
branches now completing: 1,318 skips and 182 motion exits. Actor bytes,
shared state, counters, RNG and ordered calls remain equal. The genuine
first-hole tutorial remains at 0x42b647; outer actor-slot scheduling,
real effect implementations, multi-tick persistence and live adoption remain
unfinished.


### Native golfer loop and successive ticks

`original-golfer-loop.js` recovers 0x428100–0x42960a around the actor turn:
it visits 152 slots in order, skips hole byte zero, executes the special
0xff slot's countdown/reposition draws, and runs normal slots through the
recovered actor turn. It returns unresolved turn continuations with their
locals instead of skipping them. First-facility coordinates remain explicit.

`verify-original-golfer-loop.py` compares 300 three-tick sequences (900 full
native scans), carrying actor/world/RNG state between scans while advancing
the phase counter. All sequences reach the native loop return. Fixtures mix
three normal slots with inactive and 0xff waiting slots across the remaining
149 records. All actor and hole bytes, assignments, counters, shared flags,
selection/tracking, RNG and ordered calls match. The matrix includes 55
sequences entering walking, 52 calling the controlled planner and 29 changing
the first actor's position. Prior single-scan comparisons also passed before
the same oracle was extended to successive scans.

Effects including planner, reactions, slope and projection remain controlled;
terrain is uniform and these are short sequences. Full world-tick effects,
long-running real-helper scenarios, tutorial handling, live-state conversion
and hosted adoption remain open. This code is not used by the live game yet.

The prior abstract-record scheduler and its native oracle are retained as
`original-golfer-loop-boundary.js` / `verify-original-golfer-loop-boundary.py`.
Its four Playwright boundary checks plus the actor motion check pass after
updating the import; the integrated loop uses packed records and actual turns.


### Golfer scheduler uses recovered terrain height and slope

`original-actor-terrain-effect.js` dispatches height (0x42f110) and slope
(0x40c140) queries through the existing original shot-map, corner-height and
stored-height implementations. `original-golfer-terrain-loop.js` supplies these
real effects to the integrated scheduler while keeping other effects explicit.
The snapshot carries source heights and derived terrain arrays, not functions.
Phase zero still requires the original generated-height implementation and is
rejected explicitly rather than assuming stored heights.

`verify-original-golfer-terrain-loop.py` passes 300 three-tick native sequences
(900 scans) with real native height/slope routines, nonzero cached corners
with varying elevations and metadata flags zero. No height/slope return values
are stubbed. Full actors/holes, assignments, counters, flags, tracking, RNG and
ordered calls match. This covers cached terrain queries; uncached corner and
vertex fallback are supplied by previously recovered helpers but not exercised
by this combined matrix. Planner, reaction and presentation effects remain
controlled. Arbitrary landscapes, actual remaining effects, long-running
world integration and live adoption remain open.


### Automatic planner packed actor handoff

`original-planner-actor.js` reads the automatic planner's actor fields from
packed records and applies its actor/velocity outputs on a clone. Recovery at
+0x100 reads the following physical slot; the final slot requires an explicit
actor tail. Unrelated bytes are preserved, including adjacent-slot storage.

`verify-original-planner-actor.py` runs the six complete native automatic
planner scenarios (clear/mixed terrain and professional variation), then
compares input actor extraction and application of the recovered planner's
results against all 512 native bytes of the actor and adjacent record. These
comparisons pass alongside the existing full planner result comparisons.

This is the packed actor conversion, not yet a scheduler planner effect.
Shared cache/search scratch/metadata and effect state still require mapping;
normal-turn planner invocation and live adoption remain open. Existing native
planner fixtures retain their documented controlled helper boundaries.


### Automatic planner shared-state commit

`applyOriginalPlannerResult` applies packed actor output together with the
shared RNG, ten-entry strength cache, diagnostics, landing coordinates,
pre-planner hole counter at +0x24 and explicit terrain-class restoration
writes. Terrain byte 2's shotClass/scatterCoefficient aliases are updated
together. Stack-only assessment locals remain on the planner result. All
changes are made on a clone and invalid shared output is rejected.

`verify-original-planner-result.py` runs six full native automatic-planning
scenarios and compares all actor/adjacent-slot bytes, all 20 hole records,
RNG, cache, diagnostics, landing and restored terrain classes after applying
recovered planner output. All six pass. The prior full planner comparison
also runs within this oracle. This establishes output persistence for the
covered planner cases, not input-context construction, real reaction effects,
scheduler invocation or live-game integration; those remain open.


### Planner input reads current packed actor/shared state

`originalPlannerInput` replaces actor, linked-partner class/reaction, ball
coordinates, ability fields, range skills, shared seed/cache/diagnostics/landing
and hole counter with values from the packed scheduler snapshot. Launch
settings and search scratch remain explicit context. The linked partner is
read via signed word +0xaa; it is not assumed to be actorId XOR 1.

`verify-original-planner-input.py` runs six complete native automatic planners,
builds the recovered planner input through this adapter, and applies its
outputs through the earlier result commit. Native actor/adjacent records,
complete hole records and shared outputs all match. The oracle now captures
the native linked partner's class/reaction before planner entry, strengthening
that input boundary beyond the earlier fixed partner fixture.

Remaining integration includes launch-setting/global provenance, search
scratch initialization, genuine reaction effects and invoking this pipeline
from the scheduler's planner effect. This does not change the live game.


### Corrected outer-search flags capture and initialization audit

The native search accesses sample flags at frame offset +0x536c
(0x422e61, 0x42311b, 0x4233df). Four outer-planner oracle scripts had
incorrectly captured +0x736c; those relative offsets are corrected. Existing
absolute 0x10736c references with frame base 0x102000 are correct and unchanged.
The complete packed-input/result oracle passes all six scenarios after the
correction, comparing native output actors, holes and shared state. Earlier
passes used incorrect initial scratch captures and should be read with this
qualification; the corrected run supersedes them for these scenarios.

Initialization at 0x42245e clears the score array; each pass clears distances.
The sample flags and follow-up word do not have equivalent entry clearing.
The follow-up word is written conditionally at 0x422fae and read at 0x422fc0.
A blanket zero-filled replacement for captured search scratch is therefore
not justified by the entry code alone. Deriving the necessary retained scratch
semantics remains open; this audit does not complete scheduler planner input
or live integration.


### Persist search publication for subsequent actors

The planner result commit now also publishes completed search globals:
world/global flags, updateScratch=1, drift mode, candidate skill mask,
corner target, search flag and candidate landing. The final launch's landing
and the candidate landing remain distinct. A non-search launch leaves these
search globals alone. Persisting updateScratch preserves the native automatic
shot-preparation guard for subsequent golfers within the same world update.

`verify-original-planner-search-publication.py` passes all six complete native
planner scenarios. In addition to packed actor/hole and prior shared-state
comparisons it checks 0x59d208, 0x59a188, 0x5a870c, 0x4c1e0c, 0x5a8730,
0x5a872c and candidate landing at 0x5691dc/e0 against the committed result.
No values are substituted for these native output globals. Actual scheduler
planner invocation, scratch input provenance, reactions and live integration
remain unfinished.


### Automatic planner resolver interface

`originalPlannerEffect` now accepts the scheduler's 0x4235c0 event, builds
input from current packed records, runs the actual recovered automatic planner,
and returns committed actor/shared/search state through the resolver interface.
It validates the actor and automatic-target sentinel rather than treating
unsupported exact-target requests as automatic shots. Caller map, scratch and
reaction dependencies remain explicit and must match the snapshot revision.

`verify-original-planner-effect.py` passes six full native planning scenarios
through this complete effect, comparing actor/adjacent bytes, hole records,
cache/RNG, metadata restoration and search publication. The cases use mode-zero
scheduler-shaped events with the automatic-target sentinel and controlled
reaction effects. This proves the effect interface for those cases, not the
complete actor-loop-to-planner native chain, manual targeting, real reactions,
scratch provenance or live-game adoption. Those remain open.


### Continuous shot preparation through the real automatic planner

`originalPlannedShotPreparation` composes native shot preparation with the
recovered planner effect, then completes facing, stance and phase writes after
its return. The actual event emitted by shot preparation supplies planner
arguments. Map/search/reaction dependencies remain caller-owned.

`verify-original-prepared-planner.py` starts the executable at 0x42b55c,
executes the actual nested planner, returns through 0x42b758 and stops at
0x4295ef. Six scenarios match complete actor/adjacent records, hole records
and shared planner/search state against the packaged JS composition. The
caller supplies curve zero, as the native shot-preparation call does; terrain
is code 2 at the origin in these cases. The final packaged version was rerun
successfully after the initial direct composition passed.

This closes the covered shot-preparation/planner boundary. Earlier actor
selection and later swing/motion are not included in this uninterrupted
comparison. Putt accounting, manual targeting, real reaction effects, search
scratch provenance and live adoption remain open at this integration scope.


### Green-origin real planning and putt accounting

`verify-original-prepared-putt.py` extends the continuous shot-preparation
oracle to terrain 1 with a nearby cup, three sub-tile ball positions and
both values of tile flag 0x80. It covers six base scenarios, including a
professional, for 36 native comparisons. The native planner executes fully;
search is not entered on these green-origin cases.

All 36 match packed actor/adjacent records, hole records, putt-stat counters,
cache/RNG, diagnostics, metadata and unchanged search globals. This verifies
the no-search planner path and post-planner putt accounting/delay in the
packaged preparation function. It does not yet verify subsequent ball rolling,
cup capture, full actor scheduling, real reaction bodies or live adoption.


### Animation releases a planned swing

The native phase-2 write is in the animation path at 0x414fe4, not the
actor scheduler. `original-swing-animation.js` recovers 0x414f79–0x41503b
for animation 16: signed club group selection, frame advance/wrap, final-frame
phase release, missing-animation fallback, paused-frame restoration and group
change reset/flag clearing. Animation direction, counts and the pre-update
frame remain explicit caller inputs; browser render timing is not assumed.

`verify-original-swing-animation.py` passes 1,600 native cases without helper
stubs. Full actor bytes and frame/group selection match, with 775 phase-2
transitions from phase 1. Counts include zero/one/multiple frames, all eight
directions, varied signed club values and paused updates. This recovers the
missing phase transition needed between preparation and movement. Animation
caller cadence, asset frame-count provenance and the continuous planned-putt
through animation/swing/motion integration remain open; no live change yet.


### Swing animation through impact and first position update

`originalActorSwingAnimation` applies the verified animation transition to a
packed actor world while preserving other state. The integration oracle runs
animation updates until native phase 2, then swing updates until impact and
the first position update at 0x42beb0. It supplies the phase accumulator that
the real clearance branch loads before 0x42bb3b; phase is not forced to 2.

`verify-original-swing-first-movement.py` passes 500 ordered native sequences,
comparing all actor bytes, animation/swing invocation counts and effect order.
It varies clubs, terrain code 1/2, headings, positive launch speeds, frame
counts and impact-reaction flags. Native trig/position logic executes; height,
sound, visual and reaction effects are controlled. These invocations establish
stage handoffs, not the original full world/render cadence. Ground friction,
continued movement/cup capture, real effects and live adoption remain open.


### Swing release through continued rolling

`verify-original-swing-ground-movement.py` extends the animation/impact
sequence through the full actor ball-motion function and five further updates.
Native and JS retain the ball state and shared RNG, refresh pre-movement tile
locals each update, and advance the supplied phase counter for continued
movement. No velocity is substituted after impact.

All 500 sequences (3,000 motion updates) match actor bytes, final RNG and
ordered effects. Cases cover terrain 1/2, varied headings and positive launch
speeds on uniform terrain with roll coefficient 3; native resistance, ground
contact and motion-tail code execute. Height/slope and presentation/reaction
queries remain controlled. Speeds remain above the stop threshold, and no
cup flags are placed, so stopping/accounting and cup capture are not covered.
Full world/render cadence, real effects and live adoption remain unfinished.


### Swing release through rolling to rest and shot accounting

`verify-original-swing-stopped-shot.py` continues the ordered animation and
impact sequence until native speed reaches zero, without replacing velocities.
All 500 sequences match complete actor, hole and 32 statistic records, all
2,500 wear cells, shared RNG, ordered effects and movement-update counts.
Starting strokes vary from zero to two, exercising first-shot drive statistics
and subsequent-shot accounting on uniform terrain 1/2. Hole 1 has par four;
the cup is distant and no cup flags are placed. Fourteen related tests pass.

The native resistance, stopping predicate, shot accounting and landing tail
execute continuously. Height/slope return zero; presentation/reaction helpers
are controlled and the range helper returns 100. This establishes rolling-to-
accounting handoffs under those boundaries, not cup capture, mixed terrain,
real reaction bodies, render cadence or live browser/server adoption. No
production gameplay change or deployment is included.


### Animation through ordinary scored cup completion

`verify-original-swing-scored-cup.py` extends the retained movement/cup oracle
back to animation 16 in phase 1. Native animation releases phase 2, then actual
swing progression reaches impact and movement, capture and ordinary hole
completion. All 1,200 sequences match actor bytes, completion record, complete
hole/statistic/period/notice arrays, cash and settlement globals, score list,
selection/presentation state, ordered calls and animation/swing counts.
Thirteen related tests pass.

Fixtures use the putting club, eight-frame animation, centred ball positions,
speed 160 and cup flags on every tile to isolate this connection. They vary
hole IDs, strokes, signed happiness, settlement controls and visual slots;
half include controlled effect mutations to verify later reads. Native scoring
and ordinary payment execute, while height/slope and presentation/reaction
helpers remain controlled. This does not establish naturally planned approach
trajectories, matched competition completion, actual reaction bodies, original
render cadence or live integration. No production change or deployment.


### Shared actor motion continuation

`originalActorMotionContinuation` now owns the actor's post-action motion
branch, including the zero-horizontal-speed guard, pre-movement context and
ordered effect composition. `originalActorTurn` delegates to it. Both the
500-sequence swing-to-rest and 1,200-sequence swing-to-cup native oracles now
exercise this shared implementation instead of manually joining swing and
ball motion. Both pass. The real-terrain golfer-loop oracle also retains all
300 three-tick sequence matches; eleven related tests pass.

Animation updates remain explicitly scheduled by the caller; this extraction
does not invent a browser-frame cadence or join planning to animation. Live
world mapping, original effects and natural planned-shot completion remain
open. The current production golfer simulation is unchanged.


### Planned putt through clearance, animation and first movement

`verify-original-prepared-putt-movement.py` retains all 36 native green-origin
preparation comparisons, then uses the resulting packed actors, shared RNG and
world flags as the next stage's input. Native clearance performs the actual
animation-16 transition; no phase, club, heading or launch velocity is forced.
The original eight-frame animation then releases the swing, which executes
through impact and the first position step. All 36 match both actor records,
RNG, effect order and animation/swing invocation counts in JavaScript.

The native stages use separate emulators with an explicit checked preparation
handoff. Additional actor slots are empty; clearance override and round clock
are zero. Animation direction/counts are explicit, height returns zero and
presentation/reaction effects are controlled. This is not an uninterrupted
full native world run. The comparison ends before ground resolution, so it
does not yet prove naturally planned putts rolling into cups. Live adoption,
real effects and render cadence remain open; no deployment.


### Planned putt through rolling termination

`verify-original-prepared-putt-roll.py` extends the preparation/clearance/
animation handoff through repeated native ground updates. The terrain includes
the target cup's green tile and 0x80 cup flag. It retains the actual planner's
launch values, refreshes pre-movement tile locals and advances the explicit
phase counter each update. All 36 cases match both packed actor records,
shared RNG, ordered effects, animation/update counts and terminal branch.

All 36 reach stopped-shot accounting entry (0x42ca9d); none reaches cup capture
(0x42c3f4). This is matching missed-putt behavior under the controlled flat-map
fixture, not proof of a naturally holed putt. Native ground resistance/contact,
reflection and stopping execute; terrain metadata matches the planner fixture
(bounce 3, roll 0), while slope/height and reaction/presentation remain controlled.
The JS comparison composes the existing motion stages and stops at the same
pre-accounting/pre-capture boundary. The explicit two-emulator preparation
handoff and timing limitations above still apply. Full scoring after natural
planning, real terrain/effects and live adoption remain unfinished.

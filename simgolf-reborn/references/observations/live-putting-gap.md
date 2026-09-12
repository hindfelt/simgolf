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

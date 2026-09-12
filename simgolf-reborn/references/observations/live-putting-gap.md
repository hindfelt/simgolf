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

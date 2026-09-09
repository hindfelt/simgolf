# Tricky-green and putting branch — 9 September 2026

Source: the supplied `resources/sim golf/Sid Meier's SimGolf/golf.exe`, SHA-256 `82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf`. Read-only static disassembly with the host's `objdump`; the game was not executed. Addresses below are virtual addresses in that executable, with file offset VA minus `0x400000` for the referenced text/data sections.

## Confirmed construction representation

- `0x41a49b–0x41a4ae`: terrain selection 1 plus the low bit of the variant selector at `0x5a1f3c` selects the label **Tricky Green**, whose string is at `0x4c5070`.
- `0x41fa39–0x41fa65`: with terrain selection 1 and construction mode 1, the selector's low bit becomes either 0 or `0xff` and is written to the selected cell in the 50×50 variant array at `0x5682dc`. Terrain code remains green (1).
- `0x41c12d–0x41c13b` increments the shared variant selector. The supplied regional interface files document Tab for selecting tricky green.

A browser green variant should therefore remain a green tile with additional variant state, preserving hole membership and connected putting-surface behavior. It should not become a separate unrelated terrain category.

## Confirmed putting calculation

- `0x423987–0x4239cb` scales fixed-point coordinate differences by 25/1024, computes their Euclidean length and stores the integer result in stack local `0x10`. This agrees with the original 25-yard tile scale. The browser currently uses its own scale and cannot pass world coordinates into this calculation unchanged.
- `0x4240db–0x424108` reads the current hole's target green coordinates and tests bit `0x80` of that cell's variant byte. When set, it subtracts 10 from the working value in ECX.
- `0x42410b–0x42414a` halves that value when the golfer byte at `0x577f3e + golferStride` is below 2, then halves it again into EDI. One bounded random draw produces the comparison tolerance `4 + EDI + random(EDI)`.
- `0x42429e–0x42438c` is the club-code-13 putter branch. It clears the angular-offset field, optionally doubles the distance under global flag `0x200000`, and compares distance to the tolerance. Above tolerance it draws a side and a magnitude of 150–299, shifted left 18 bits. Distance at most 5 clears the resulting offset **after those draws**. Distances above 15, 25 and 35 each halve the offset.
- `0x45bab0` calls the RNG before applying the unsigned 16-bit bound. Bound zero therefore still advances the RNG, yielding zero.

`scene/src/simulation/original-putting.js` reconstructs this confirmed slice. Its seed is the RNG state immediately before the tolerance draw, not the beginning of the complete shot. `windowBeforeGreen`, `attitude` and `doubleDistanceFlag` are explicit original-field inputs. The earlier skill/facility adjustments and the meaning of the global flag have not been bound to browser fields. The helper is not connected to the playable shot engine yet.

## A branch that must not be generalized into live behavior

At `0x42c5ed–0x42c630`, a green/high-bit check can add roughly ±15 degrees to the heading if another field is below -192. However, the immediately preceding path clamps that same field to 0–9999 and sets values below 128 to zero. No direct branch into the later test was found in this disassembly. Its reachability is unproven and appears contradictory on the observed path. This is not sufficient evidence to add random green bounces or deflections to the browser.

## Validation and remaining integration

Five tests pass: selected instruction bytes/constants against the supplied binary; variant alternation; reduced tolerance; draw accounting including zero bounds and short misses; distance bands and eligibility flags. These tests verify the extracted slice and its boundary behavior, not a complete original shot or retail runtime parity.

Next work: decode the upstream ECX adjustments at `0x424071–0x4240db` and golfer field identities; verify putter-specific heading application and physical units; connect variant editing, save/course-package state, rendering and shot behavior together. Verify ordinary/tricky greens in actual original gameplay before claiming completed fidelity. Multiplayer replay must pin any integrated rules/RNG change.

## Attitude identity and upstream adjustments

The previous name `ability` for byte `0x577f3e` was wrong. The UI at `0x41ae5f–0x41aee5` formats this exact field after the literal **Attitude:** (`0x4c5054`). It clamps the signed byte to -4…4 and uses the jump table at `0x420cbc`: -4 furious, -3 mad, -2 upset, -1 worried, 0 calm, 1 determined, 2 pumped, 3 and 4 invincible. Thus the putting threshold at 2 means pumped or higher. It does not represent Accurate Putter points. The isolated helper now requires `attitude`; it deliberately rejects the old field name rather than silently interpreting it.

The preceding window calculation is now traced arithmetically:

1. `0x424071–0x424090`: low bit of global `0x5a3228` selects an initial window of 10 when set, 20 otherwise. This global also has -1/-2 lifecycle values; it is **not yet justified** to label it tournament speed.
2. `0x424093–0x4240ba`: if golfer byte `0x577f21` has bit 4, global `0x542bc8` is nonzero, and `(golfer[0x577f20] & 0xe0) != 0x20`, add signed-integer `window / (4 - global[0x542bc8])`. These flags/settings still require semantic identification and valid-range checks.
3. `0x4240bc–0x4240d9`: if golfer byte `0x577f1e` has bit `0x10`, add `trunc(window * unsignedByte[0x577ffc] / 8)`. This looks like the fifth skill slot, but its allocation and activation must be traced before connecting browser skill levels.
4. Apply the target green penalty and attitude reduction already reconstructed.

Seven focused tests now pass, including matching all nine attitude UI jump-table entries and strings against the supplied binary and checking the determined/pumped threshold. The browser's continuous happiness scale is not an established mapping to this signed attitude state. These findings remain isolated from live physics until that mapping and the remaining shot pipeline are recovered.

## Upstream window reconstruction and identified inputs

`originalPuttingWindow` now reconstructs `0x424071–0x4240db` without assigning browser state to unresolved flags. Field correspondence:

| Helper input | Original source |
| --- | --- |
| `stateFlags` | global `0x5a3228`, low bit only |
| `adjustmentLevel` | global `0x542bc8`, Putting Green facility table entry |
| `golferFlags` | unsigned byte `0x577f21` |
| `golferType` | unsigned byte `0x577f20` |
| `skillFlags` | unsigned byte `0x577f1e` |
| `puttingSkill` | unsigned byte `0x577ffc`, Accurate Putter |

The facility identity is established by `0x40f916–0x40f920`, which clears twenty entries at `0x542bb0`, and `0x40f940–0x40f997`, which accumulates building records from `0x58a708` at a 16-byte stride. The signed type indexes that table; byte 7 bit `0x40` gates this accumulation, and field 8 plus one supplies its value. `0x542bc8` is index 6. The original 20-byte building catalog at `0x4c16a8` identifies type 6 as **Putting Green**. This is not the menu difficulty at `0x820344`. Meaning of the activation flag and valid upgrade range still require verification.

The skill UI at `0x438652–0x4387bb` iterates ten name pointers from `0x4c1c34` alongside consecutive golfer bytes from `0x577ff8`. Name pointer index 4 resolves to **Accurate Putter**, establishing the identity of `0x577ffc`. Its bit-`0x10` activation flag and point allocation remain separate concerns.

The helper supports adjustment levels 0–3 only, explicitly rejecting other values rather than pretending to establish the complete original facility range. Within that supported domain the largest unsigned-byte skill window is 1315, so the downstream helper's former arbitrary limit of 1024 was corrected. Tests cover each eligibility condition, signed lifecycle sentinel flags, integer rounding and operation ordering, plus direct source-label checks. Twelve focused tests pass. No live physics or course format changes yet; editor, rendering, persistence and replay integration must ship together with the remaining shot mapping.

## Curvature application during ground motion

`0x42c230–0x42c275` is a reachable green branch in the ground-motion path entered from `0x42bf82–0x42bf8b` when field `0x577fe4` is at most 1. It checks the current terrain code for green (1), **not** the tricky-variant bit. It then:

1. Adds `trunc(golfer[0x577ff4] / 2)` to heading `0x577fe8`, with 32-bit wraparound.
2. Tests the low three bits of global phase byte `0x831828`.
3. When those bits are zero, consumes one `random(8)` draw. On zero, negates `0x577ff4` with 32-bit semantics. This occurs after the current turn; the reversed value affects later updates. A zero curvature value still consumes the draw.

The value previously described as `angularOffset` is therefore persistent curvature state, not a one-time launch angle. The public helper name remains unchanged to keep its correspondence with earlier recovered slices; its new comment explicitly identifies this meaning. `originalGreenTurnStep` reconstructs this specific ground branch with the original phase and RNG supplied by the caller. It does not imply that one call equals a browser frame or establish original update timing.

This branch is distinct from the apparently unreachable ±15-degree variant branch discussed above. It applies on ordinary greens too; tricky greens affect its initial value through the earlier putting calculation. Non-putter shots skip neither all curvature nor all other heading adjustments: the launch branch at `0x4245d9` explicitly skips a separate clamped heading adjustment for club 13, and airborne movement at `0x42bfc7` also uses half-curvature. Do not turn the recovered putting result into a one-off rotated target.

Sixteen focused tests pass, including source instructions, signed odd-number rounding, heading wraparound, reversal ordering, zero-curvature draw consumption, leaving green terrain and resumption across multiple updates with preserved phase and RNG. Full movement remains open: position stepping precedes this branch at `0x42bddd`, friction/slope calculations precede it at `0x42c13a`, and later collision/cup handling must be integrated. These are static-source checks, not execution of the original game.

## Ground resistance and stopping

`original-ground-motion.js` now connects the recovered curvature step to the preceding ground-response arithmetic at `0x42c13a–0x42c275`. Inputs still use original units and explicit slope outputs; no browser terrain gradient is substituted.

- `0x576dc1 + terrainCode*48` is signed terrain metadata byte 33 (raw metadata index 1). The startup table is copied from `0x4c0a38` to `0x576da0` at `0x40f2d3`. `originalTerrainMetadata` now exposes this as `rollCoefficient`, while preserving all other metadata. Runtime table changes remain possible.
- Resistance is `clamp(rollCoefficient - forwardSlope, 0, 99)`, raised to 2 when below 2 and the boundary flags are nonzero.
- The origin coordinates `0x577fcc/0x577fd0` are then checked. If that terrain is green (1), resistance is reset to the unadjusted terrain coefficient and cross-slope is zeroed. This differs from the later **current** cell check used by curvature. It does not justify applying arbitrary browser downhill drift to a putt.
- Cross-slope contributes the negated truncated half of its 32-bit value shifted left 26, added to heading with wraparound.
- Below resistance 5, speed becomes `speed - trunc((speed >> resistance)/2)`. At resistance 5 or above, it becomes `speed + trunc((64 - (speed >> 5))/2)`. The latter can accelerate a slow ball; do not replace it with uniform drag.
- After other collision/bounce processing, `0x42ca6c–0x42ca97` stops the ball only if speed is **below** 64 and both height `0x577fe4` and vertical speed `0x577ff0` equal zero. This predicate is exported separately, since evaluating it prematurely would skip bounce handling.

Six new tests plus the sixteen putting and two metadata tests pass (24 total). They check startup bytes, arithmetic boundaries, ordering, current/origin terrain distinctions, gradual flat-green slowdown and deterministic resumption. These do not constitute a full moving-ball simulation: position/trigonometric stepping, actual directional-slope sampling (`0x40c140`, calling `0x40bfe0`/`0x40c090`), bounce, hazards, cup detection and original tick timing remain to be connected before changing live play.

## Position stepping and directional interpolation

`original-ball-position.js` reconstructs the direction wrapper at `0x466b40`, its quarter-turn counterpart at `0x466b80`, and the position block at `0x42bddd–0x42be5b`.

- Horizontal projection uses `trunc(speed/16)`. X adds the sine projection; Z subtracts the quarter-turn projection, so heading zero moves toward decreasing Z. Height adds `trunc(verticalSpeed/32)` independently. All coordinate additions preserve signed 32-bit wrapping.
- The direction wrapper reflects the angle into the first quadrant and negates magnitude for the lower half. It uses `0x7fffffff - angle` for its reflection, not a floating-point rotation.
- At `0x491380`, the original creates 256 table entries using `sin(i * 0.006159985596078431) * 65535`, truncated to integer. Those doubles are stored at `0x4baa50` and `0x4baa48`; the conversion helper at `0x4a57a0` selects truncation. The implementation reconstructs this table using JavaScript sine. Bit-for-bit comparison with original x87-generated runtime samples is still outstanding.
- The interpolation routine at `0x4913e0` uses the upper index bits and a 22-bit fraction, signed 32-bit multiplication and arithmetic shifts. Signed magnitudes below 65535 use a 16-bit result shift; below 16777215 use an 8-bit preshift/result shift; larger values use a 16-bit preshift and no result shift. These branches can overflow; substituting a continuous floating sine loses that behavior.
- The initializer writes 256 entries through `0x8394a8`. Interpolation can also read the following BSS word `0x8394ac`; no direct write to it was found, so the reconstructed startup table supplies zero. The helper accepts a complete replacement table for a future captured runtime comparison rather than asserting that the startup assumption holds for every runtime state.

Five additional tests pass, alongside the existing 22 putting/ground tests rerun in this step. Tests cover executable constants/instructions, cardinal direction and sign conventions, velocity truncation, integer magnitude boundaries and a composed flat-green trajectory from recovered initial curvature through movement and slowdown. That trajectory resumes identically after serialization. It is not a complete original putt: launch speed selection, cup capture, collisions, gravity/bounce, slope sampling and update timing remain open. The production game is unchanged.

## Cup capture after ground response

`original-cup.js` recovers the decision and position snap at `0x42c354–0x42c477`. It takes the cell locals from the original ground update explicitly; it must not infer a later animation-frame cell.

- `0x40bc50` rejects cells outside the 50×50 map and terrain code 20. Capture additionally requires bit `0x80` in the referenced cell's 16-bit flag array at `0x53ba00`.
- Horizontal speed must be strictly below 320 (`0x140`). Passing exactly through the cup at speed 320 does not pass this check.
- Distance is calculated relative to the tile centre (`cell*1024+512`) using `0x40a9f0`. Within the short-distance domain, this truncates the square root of the sum of squared differences. The helper explicitly limits samples to that recovered domain; it does not generalize the function's unusual large-distance scaling.
- The strict radius is `trunc(trunc(1024 / (club==13 ? 1 : 3)) / (flag0x200000 ? 30 : 20))`: putter radii 51 or 34, other-club radii 17 or 11, in original fixed-point units. The meaning of the global flag still needs confirmation; the helper calls it `eventFlag` as a raw input, not an assumed tournament rule.
- On capture, original code snaps X/Z to the centre, increments byte `0x577f2a`, calls `0x426b00`, clears speed and a movement flag, and exits the update. The helper returns only the snap and zero speed. The original scoring transition, animation/audio and caller motion flags are not reconstructed by this return value.

Five tests pass: executable constants, strict radial/speed boundaries, other-club/event-flag differences, map/flag eligibility and a rolling flat-green sequence combining recovered position, resistance and capture. The pipeline still requires original launch speed/timing, slope sampling and other collision/bounce paths before live integration. No deployed gameplay changed.

## Gravity and ground rebound

`original-bounce.js` reconstructs the vertical arithmetic at `0x42be61–0x42be95` and `0x42c527–0x42c5e8`.

After height integration, gravity subtracts 64 from vertical speed if either height or vertical speed is nonzero. A separate near-apex visual-object callback does not alter that arithmetic. The helper omits the callback, not the gravity.

Ground rebound requires height at most zero and negative vertical speed. The signed terrain coefficient is metadata byte 32 (raw index 0, runtime `0x576dc0 + terrainCode*48`), now exposed by `originalTerrainMetadata` as `bounceCoefficient`. A nonzero boundary flag raises coefficients below 2 to 2. The original computes a signed 32-bit coefficient×vertical-speed product, divides by 12 with truncation, subtracts that result from -64, clamps to 0…9999, then discards rebounds below 128. Height resets to zero. The recovered helper reports the impact-effect threshold below -256 without trying to reproduce original effect/audio callbacks.

Five new tests cover constants/table bytes, post-integration gravity, strict rebound/effect boundaries, coefficient adjustment and a repeated flight/rebound sequence that settles to rest and resumes identically after serialization. All 39 focused putting, ground, position, cup, bounce and terrain tests pass together. These checks establish the reconstructed arithmetic and interactions on flat terrain; original runtime execution, terrain-height offsets, launch parameters, obstacles, scoring transitions and timing remain necessary before live integration.

## Putt-strength planning

`original-putt-strength.js` reconstructs the cache-miss, rolling-mode path of `0x4218e0`. Its range estimator at `0x421870` reads the green's signed roll coefficient at `0x576df1`, adds truncated speed/8 to distance, subtracts speed shifted by that coefficient, and repeats while speed remains at least 64. This planning estimate uses full drag and /8 displacement, unlike the live update's half drag and /16 displacement.

The solver starts with `q=trunc(20*yards/25)` and speed `33*q-trunc(q*q/48)+64`. It compares estimated range with `trunc(yards*1024/25)`, adjusts speed up/down by a halving step, and stops once that step is at most 2. It does not search to perfect equality. `0x424c46–0x424c76` requests this rolling-mode solve for distance+2 when the putter's referenced terrain is green. The late branch at `0x4256ec–0x425747` adds truncated speed/12 minus random(truncated speed/8), then sets putter vertical speed to zero.

Limits: the original ten-slot shared cache uses distance and vertical input as keys, without including the rolling/airborne mode in the observed lookup. The new helper explicitly covers a cache miss; no claim is made about the game's historical cache contents. Its seed belongs immediately before the late strength draw, not before the whole shot; intervening shot-planning draws and curvature adjustments still need composition. The supported planning-distance/coefficient range is deliberately bounded and invalid nonconverging raw coefficients reject.

Four strength checks and the existing 39 recovered-physics/metadata checks pass (43 total). Straight flat-green examples at 2, 5, 10 and 20 yards now run from planned launch speed through integer positions, ground response and cup capture. This verifies a composed physics path, not the complete original shot caller or the browser game's live shot. Original cache/RNG/timing integration and course terrain/collision/scoring transitions remain open.

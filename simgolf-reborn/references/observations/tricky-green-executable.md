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

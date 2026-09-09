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

`scene/src/simulation/original-putting.js` reconstructs this confirmed slice. Its seed is the RNG state immediately before the tolerance draw, not the beginning of the complete shot. `windowBeforeGreen`, `ability` and `doubleDistanceFlag` are explicit original-field inputs. The earlier skill/difficulty adjustments and the meaning of the global flag have not been bound to browser fields. The helper is not connected to the playable shot engine yet.

## A branch that must not be generalized into live behavior

At `0x42c5ed–0x42c630`, a green/high-bit check can add roughly ±15 degrees to the heading if another field is below -192. However, the immediately preceding path clamps that same field to 0–9999 and sets values below 128 to zero. No direct branch into the later test was found in this disassembly. Its reachability is unproven and appears contradictory on the observed path. This is not sufficient evidence to add random green bounces or deflections to the browser.

## Validation and remaining integration

Five tests pass: selected instruction bytes/constants against the supplied binary; variant alternation; reduced tolerance; draw accounting including zero bounds and short misses; distance bands and eligibility flags. These tests verify the extracted slice and its boundary behavior, not a complete original shot or retail runtime parity.

Next work: decode the upstream ECX adjustments at `0x424071–0x4240db` and golfer field identities; verify putter-specific heading application and physical units; connect variant editing, save/course-package state, rendering and shot behavior together. Verify ordinary/tricky greens in actual original gameplay before claiming completed fidelity. Multiplayer replay must pin any integrated rules/RNG change.

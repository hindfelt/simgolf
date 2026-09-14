# Original property identities

Extracted from the supplied `golf.exe`, SHA-256 `82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf`. The table begins at byte offset 790152 and contains sixteen 130-byte records. `scene/scripts/import-properties.mjs` verifies the executable hash before regeneration.

Text fields: location bytes 0–23, original property ID byte 24, name bytes 25–57, bonus label bytes 65–129. Bytes 58–64 are retained verbatim. Bytes 58–61 decode map coordinates; bytes 62–64 now decode environment, geography and relief as documented below. The legacy field name `undecodedBytes` retains the original seven source bytes for traceability. The original IDs form a permutation of 0–15; file order is preserved separately through source offsets. Control-valued ID bytes must not be prepended to the names.

| Original ID | Location | Name | Bonus label |
|---|---|---|---|
| 9 | Monterey | Ocean's Edge | Scenic Cypress |
| 4 | San Diego | Dolphin Coast | Dolphins |
| 11 | Rocky Mtns. | Jurassic Springs | Free Hotel |
| 3 | Las Vegas | Ace in the Hole | Fun, Fun, Fun |
| 0 | Phoenix | Coyote Flats | Free Spa |
| 7 | Hawaii | Flamingo Shores | Scenic Waterfall |
| 6 | Oahu | Island Palms | Japanese Garden |
| 8 | Nova Scotia | Windy Point | Scenic Lighthouse |
| 15 | Northeast | Ravenwood Farms | Civil War Battlefield |
| 10 | Carolina | Christmas Pines | Free Putting Green |
| 14 | Ireland | County Kincaide | Leprechauns |
| 12 | Scotland | Harold's Keep | Free Castle |
| 13 | Wales | Thistle Runes | Stonehenge |
| 2 | Spain | Sangria Bay | Scenic Vineyards |
| 5 | Florida | Ocean Grove | Free Pro Shop |
| 1 | Jamaica | Scorpion Cove | Scenic Statues |

Verified extraction and rejection of truncated records, duplicate IDs and malformed text fields in two tests. No prices, starting cash, parcel shapes, terrain geometry, ownership/unlock rules or bonus mechanics are inferred from these labels. In particular, Free Hotel/Free Spa/Free Castle labels do not by themselves prove their placement or unlock behavior.

This supplies original identities for the future World Screen. It does not create playable versions of the sixteen properties or replace Willow Brook with sixteen copies of the same terrain.


## World-map coordinate evidence

The table has virtual address `0x4c0e88` in this executable. At `0x46eb54` and `0x46eb5e`, code reads the words at record offsets 58 and 60. The selection loop beginning at `0x46fba2` loads these same words, subtracts them from pointer coordinates, calls a distance routine and chooses the closest entry within its threshold, advancing by `0x82` bytes per property. Combined with visual alignment on the supplied 800×600 `Interface/WorldBase.pcx`, this supports decoding those words as map x/y coordinates. No original runtime was executed.

`graphics/samples/world-properties.html` is a standalone reference inspector with the original background and sixteen selectable markers. Open it directly as a local HTML file; its PNG background is a format conversion of the supplied PCX for inspection. Three catalog/browser checks pass, including selecting County Kincaide and reproducing the known Scotland/San Diego coordinates. The screenshot was visually inspected. This is not the rebuilt World Screen or a claim that properties are playable.

The code near `0x46eaca` groups entries using offset 62, and offsets 63/64 affect setup fields. Their exact semantics are not yet established; do not infer difficulty, price, terrain or bonus behavior from them without further evidence.

## World purchase-slot generation

Static reconstruction now lives in `scene/src/simulation/world-offers.js`. This is a pure setup module, not yet connected to career saves or the purchase UI. No original runtime was executed.

- Routine `0x46ea60` creates sixteen 46-byte offer records at `0x570a28`. It fills slots 12–15 first, rejecting candidates whose table-byte-62 group already appears among those slots. It then fills slots 0–11 from unused table indices, with slot 0 additionally requiring group code 0. File-table index and original property ID are distinct.
- Each pick uses RNG at `0x45ba70/0x45bab0`: unsigned 32-bit state advances by `state * 0x41c64e6d + 0x3039`; bits 16–30 are scaled by the double at `0x4b9800`, verified as 1/32768, then multiplied by 16 and truncated. Rejected candidates consume draws. The module accepts the RNG state at routine entry; it does not claim to reconstruct the original new-game seed or earlier random draws.
- Offer byte 29 starts at `(slot + 4) * 10`. Table byte 63 equal to 0 adds 10 for slots below 4, otherwise 20; code 2 subtracts the same amount. Flag `0x1000000` at `0x59d208` overrides it to 250. The flag's user-facing meaning remains unverified.
- `0x46f33a` formats that byte and `0x46f373` appends the literal at `0x4e2f04`, verified as “ acres of ”. This establishes the displayed acreage field. The physical meaning of the three property setup codes and their terrain-generation effects remains unresolved.
- Price function `0x46e980`, with the sixteen ordered targets at `0x46ea20`, returns slot costs `500,600,700,800,1200,1500,2000,2500,3000,4000,5000,6000,7000,8000,9000,10000`. Purchase code at `0x46ffe8` calls it and subtracts the result from the reserve at `0x570a24`. These remain **internal cost units**, not asserted displayed dollars. Currency formatting/scaling still requires verification.

Six catalog/setup/browser checks passed. A separately calculated Python integer fixture verifies seed-1 assignments, acreage, 52 draws and final RNG state 2207819405. Additional seeds check all sixteen distinct identities, the starting group restriction, four distinct final-slot groups and deterministic reconstruction. The original acreage override preserves draw order. These tests support the static reconstruction, not full original-runtime parity.

Next: verify currency display and setup-code semantics, reproduce each property's terrain/bonus setup, then connect property ownership and transitions to authoritative career state. Do not present sixteen copies of Willow Brook as completed original properties.

## Property descriptions and currency display decoded

The World Screen loop initializes EBX to `0x4c1667` at `0x46f16d`: the final property record's bonus-label address (record +65). Its reads at EBX-3/-2/-1 therefore select table bytes 62/63/64.

| Byte | Meaning in original description | Code labels |
|---|---|---|
| 62 | Environment | 0 parkland, 1 desert, 2 tropical, 3 links |
| 63 | Geography | 0 inland, 1 coastal, 2 island |
| 64 | Relief | 0 flat, 1 rolling, 2 hilly |

Relief switch `0x46f397` uses strings `0x4e2eec/0x4e2ef4/0x4e2efc`. Geography switch `0x46f40d` uses `0x4e2ec8/0x4e2ed4/0x4e2ee0`. Environment switch `0x46f461` uses the four-entry jump table at `0x47016c`; its ordered targets are `0x46f478,0x46f486,0x46f471,0x46f47f`. These select the strings parkland, desert, tropical, links respectively. The catalog now exposes these three labels and rejects unknown setup codes. This establishes descriptions, not terrain geometry or elevation-generation algorithms.

Price display at `0x46f541` calls the slot-cost routine, multiplies by five twice and shifts left two bits at `0x46f546–0x46f54c`, then calls the integer formatter at `0x42d310`. The independent price display at `0x46f63f–0x46f64e` repeats the same conversion. The formatter groups decimal digits by thousands with commas; it does not divide into fractional currency units. Prefix `0x4e2e90` is “for only ” followed by byte A7 (the Simoleon symbol). Thus `priceSimoleons = costUnits * 100`, ranging from §50,000 to §1,000,000 across the sixteen slots. This supersedes the earlier display-scaling uncertainty; internal reserve accounting remains in the original smaller units.

Eight catalog/setup/browser tests pass, including original terrain labels, invalid-code rejection and the full sixteen-slot displayed price schedule. The inspector now shows decoded property descriptions; its regenerated screenshot was visually inspected. Original game execution, terrain generation, bonus mechanics and live career purchases remain unverified or unimplemented.

## Original final boundary pass

`original-property-boundary.js` reconstructs the final pass at `0x471896–0x4719a6`, independently of the preceding terrain generator. The helper at `0x4701c0` indexes first-argument ×50 + second-argument. The 50×50 dimensions are also explicit in the outer loops. The current playable map remains 45×42 and must be migrated deliberately before original property generation is connected.

The acreage byte is multiplied by 10. Starting with inset=0 and halfWidth=25, a do/while increments inset and decrements halfWidth until `4 * halfWidth² <= acres * 10`. Even 250 acres trims at least one tile. Inland overwrites four edges; coastal omits the first-column edge (argument order verified from the pushes at `0x471967–0x471992`). At 100 acres, inset=10: inland leaves a 30×30 central region untouched, coastal leaves a 30×40 region.

Island uses inset-12 and, for each axis index 0–49, adds `clamp(abs(axis-25),8,50) + random(3)`. The clamp is established by helper `0x466a00`. It writes symmetric edges to that depth; negative depths write nothing but still consume a random draw. Fifty RNG draws occur. The helper writes raw terrain code 17 for islands and 20 otherwise; islands additionally clear flag bits 0x0320. Their complete terrain/ownership semantics remain undecoded, so the module returns raw writes and null for untouched cells. It does not invent an interior heightmap or claim that untouched tiles are playable land.

The original RNG is now a shared pure utility, preserving the verified world-offer fixtures. Ten setup/world/browser checks passed; four boundary checks were rerun after correcting the coastal argument orientation during static review. The independently calculated BigInt RNG sequence validates general bounded draws. Build passed. No original runtime execution or complete terrain parity is claimed.

Next entry point: `0x470210` is the main property-generation function. It reads offer relief at `0x47024a` and sets global `0x4c1f90` to 48/32/16 for flat/rolling/hilly respectively at `0x470265–0x470284`. The numerical parameter's use still needs tracing; do not treat it directly as height amplitude. The function also loads property table index, environment and purchase-year data before the terrain passes.

## Elevation noise and relief settings

`original-elevation.js` reconstructs the noise initializer/interpolator and relief settings, but does not yet apply terrain-specific height overrides.

- `0x466cb0` consumes 18×18 bounded-16 random draws into rows with stride 19. The later writes at `0x466d3e` copy BL (the source sample), despite computing a neighbor sum into ESI that is not stored. Thus no smoothing of that sum is assumed. The first 16×16 samples wrap into row/column 16.
- `0x466d90` subtracts 128 from both coordinates, takes wrapped grid indices from bits 8–11 and interpolation fractions from bits 3–7, forms the four bilinear weights and truncates the sum divided by 32.
- `0x42d2b0` first divides coordinates by four, samples at that scale and twice that scale, combines weights 6 and 4, multiplies by seven, truncates divided by 64 then by two, and clamps to 0–512.
- Relief at `0x47024a` sets divisor bases flat=48, rolling=32, hilly=16. The following slot/4 switch scales the base by 1.5, 1.25, 1 or .75 for slots 0–3, 4–7, 8–11 or 12–15 respectively. Flag 0x1000000 adds 16 afterward.
- Height sampling at `0x40bf41` scales tile coordinates by 128 for hilly and 64 otherwise. `0x40bfb9` divides sampled noise by the relief divisor, adds one and clamps. Earlier branches consult terrain codes and existing heights; the desert adjustment at `0x40bf7e` and the minimum-height global still require full context before implementation.

Ten focused elevation/boundary/offer tests passed. Two elevation tests were rerun with independent Python integer sample fixtures: seed 1 produces 83,91,129,115,140 at (0,0),(64,128),(1024,3200),(3200,1024),(6272,6272). A BigInt reference verifies all 324 RNG advances. This is a static reconstruction, not a comparison against an executed original game. Live generated properties remain unfinished.

## Generated height sampling

`original-generated-height.js` now implements the generated-height branch of `0x40be60` using the reconstructed noise and relief settings. It deliberately does not substitute for the earlier stored-height branch guarded by `0x831828`.

The original flag's low bit or coordinates outside 0–49 return 3. Terrain bytes 17/18/19, or byte 17 in the next row, return 3 before sampling. The next-row byte must be supplied explicitly, including at the last row; no undocumented padding value is assumed.

Environment byte 1 is desert: BL is initialized to 1 at `0x40be66`, then compared at `0x40bf7e`. For column<16, `0x40bf92` uses signed multiplier `0xd5555555` and the high product plus sign correction, giving truncation of `-((16-column)*divisor)/6`. This adjustment precedes signed division by the relief divisor. The quotient plus one is clamped to 3–15, or 4–15 if global `0x820344` is nonzero. Its meaning is not yet established; callers must provide the corresponding boolean explicitly rather than receive an invented default.

Five focused elevation checks pass: terrain/outside/flag overrides, minimum-height behavior, exact desert boundary cases and deterministic 2500-sample maps with distinct relief profiles. The map tests use explicit synthetic terrain bytes; they are not full generated-property parity tests. Build passed. Remaining: original terrain initialization/coast generation, stored-height and special tile behavior, the minimum-height global's lifecycle, source RNG timing, bonus placement and integration into playable property state.

## Initial terrain patch pass

`original-terrain-patches.js` reconstructs terrain bytes and flag modifications from `0x4702eb–0x470571`. Base terrain code is 4; without flag 0x1000000, slots 8–11 use 5 (desert 12) and slots 12–15 use 11 (desert 12). The environment switches were verified through jump tables `0x4719b8` and `0x4719cc`. Unsupported environment code 4 is outside the sixteen-property catalog and is not accepted.

Each walk consumes two bounded-50 picks for its starting tile. Parkland chooses code 13/14 by starting column below/above 25, except table index 9 (Christmas Pines) always chooses 14. Desert alternates 14/12. Tropical uses 14 on even walks and 12/13 on odd walks according to bit 1. Links alternates 5/11.

The walk paints while in bounds and below floor(budget/128), starting budget 5000. Each paint consumes random(64) for flag bit 0x0100 and two random(3)-1 coordinate steps. The 48th paint sets bit 0x2000. Walk budget increases by 2500 until the next budget reaches 45000, or cumulative writes exceed 1250. Repeated writes count toward this budget; distinct tile counts must not be substituted. Returned set/clear masks preserve unrelated flags; companion terrain metadata is not yet reconstructed.

Nine focused patch/height/boundary checks passed. The two patch tests were rerun with an independent Python integer fixture: seed 1, slot 0, parkland/table index 0 gives 12 walks, 1362 writes, 4110 draws, final state 4287422715 and terrain SHA-256 `86b28eea847d8d60ee0b21f6e1174296c2f5ca10ef9be829097cf6e18174161e`. No original execution occurred. Continue at `0x470571`: the subsequent water/scenery passes consume additional RNG and must precede the previously reconstructed final boundary pass.

## Coastal strip pass

`original-coastline.js` reconstructs the coastal-only pass at `0x4707ae–0x470873`, which follows the still-unimplemented river pass. It clones supplied 50×50 terrain/flag arrays, rather than assuming terrain is uniformly empty.

Starting width=5, each row paints columns below width to code 17 unless already 17. Newly painted cells clear flag 0x0100; a newly painted last cell consumes random(16) and sets the bit on zero. Column 0 becomes code 20 even when originally 17, in which case its prior flags remain unchanged. Each row then consumes random(5)-2 to adjust width. Width<=1 becomes 2; width>12 decrements once. This is a soft correction, not a hard clamp: sampled seeds produce widths above 12. The unsupported environment code 4 branch is outside the original sixteen-property catalog.

Independent Python fixture for seed1 on uniform code4: 100 draws, 271 visited cells, next width6, RNG3885567453, terrain SHA-256 `7fb4c0c033f523066415379a3c9da18bc34beadf254f15ad80f5ff76831912f1`. Existing all-code17 terrain consumes only 50 draws. Focused checks also verify unchanged inputs, preserved unrelated flag bits and deterministic output.

The following original pass clears flag 0x1000 globally at `0x470873`, then fills a **51×51 vertex-height array** at `0x47088e`, including outer coordinates which return height3. This distinction from the 50×50 terrain grid must be preserved during live integration. Companion terrain metadata writes, rivers, vertex-array composition and later scenery remain required; this module alone is not a full property generator.

## River routing pass

`original-river.js` reconstructs the catalog-supported branch at `0x470571–0x470792`. Islands skip it without RNG consumption. Other properties start at row `16+random(16)`, column49. Each step paints terrain17 (desert11), clears flag0x0100, sets0x1000, and consumes random(64) to optionally set0x0100 again. A random(2) chooses a bank at row±1,column+1. If its terrain is not17 and its generated height is3, the bank receives the original coordinate-based code8/12, or desert10.

Candidate directions -2,0,2 use neighbor offsets from tables `0x4c1870` and `0x4c1890`: row-1, previous column, row+1. Each is scored using noise at coordinates×128; strict less-than retains the first equal-scoring candidate. An immediate reversal instead decrements the column. The chosen direction is retained even in that case. Entering terrain17 ends routing. Bounds checks occur in the original order.

Memory access callbacks are explicit: column50 in bank operations aliases the next row under the original row×50+column addressing. Tests use a defined synthetic backing map for accesses outside the terrain array; this does not establish the original surrounding memory's values. Companion terrain metadata and the original backing-memory layout remain integration requirements. A 10,000-step diagnostic guard throws rather than claiming successful generation if supplied callbacks cause nontermination.

The noise sampler now supports the necessary one-tile negative probe (-128), with signed shifts retained. Eight river/coastline/elevation checks pass, including original-noise routing, tie handling, forward movement, desert codes, island skipping and RNG counts. Build passes. No runtime-original comparison or complete generated property is claimed.

## Composed stage before scenery

`original-property-stage.js` composes the decoded terrain patches, river, coastal strip (when applicable), global flag0x1000 cleanup and vertex-height pass through `0x4708b8`. It returns 2500 terrain bytes, 2500 flag words and 2601 vertex heights. The final acreage boundary pass is deliberately not moved ahead of scenery.

Inputs require separate entry states for noise initialization and terrain generation; no unverified assumption connects them to the world-shuffle seed. The caller must supply the initial flag array and 50 bytes of surrounding terrain memory on each side of the tile array. The supplied arrays are cloned, and the resulting surrounding-memory writes remain visible in the returned memory buffer. These explicit inputs preserve the current uncertainty rather than making zero-padding a production default.

All sixteen original catalog identities pass through this composition with explicit synthetic memory fixtures, repeatable output, outer vertex heights3, distinct property IDs and no mutation of input arrays. A code17 trailing memory fixture verifies the last terrain row's height dependency. These tests establish composition of the reconstructed modules, not original-runtime parity or finished playable properties. Companion terrain metadata, correct original entry state, stored-height lifecycle, scenery, bonuses, final boundaries and live-world integration remain required.

## Secondary terrain feature patches

The next pass at `0x4708b8–0x470b13` paints additional terrain, rather than placing scenery objects. `original-feature-patches.js` reconstructs it with explicit raw-memory callbacks.

Twenty-four patch origins use `floor((i%4)*50/4)+4+random(4)` and `floor(floor(i/4)*50/4)+4+random(4)`. Indices16 onward therefore start beyond column49. The first write precedes the bounds check, so silently clipping these origins would change original behavior. The callbacks preserve the coordinates without inventing surrounding memory; this pass is not yet composed with the bounded pre-scenery stage.

Environment/height switches choose original codes12/17 for parkland,12/15 for desert,15/17 for tropical and15/12 for links. The first patch forces18. Global `0x820344` values>=2 can also force18 using random(floor(8/(value-1))); its meaning remains unresolved. The module currently accepts only0–9, rejecting unverified higher values. Table index2 (Jurassic Springs) replaces18 with12.

Unprotected tiles (flag0x1000 clear) receive the code and consume random(8), setting0x0100 only when zero and code18. Code17 also writes vertex height3. Every step consumes random(2) for axis and random(2) for sign. After five in-bounds moves, each further continuation requires a nonzero random(16); outside-map movement ends the patch. Protected tiles skip painting and its random draw but still move.

Two focused tests pass for24 origins, deterministic callback output, outside-map origins, the Jurassic Springs override and protected-tile movement. Build passes. These are synthetic-memory tests, not original-runtime verification. Next: establish surrounding-memory effects and the global level's semantics before composition; inspect the following flag/scenery passes at0x470b13 onward.

## Difficulty setting resolved

Global `0x820344` is the original difficulty selection in normal new games. Menu routine `0x439a70` loads TitleSelDiff artwork, draws “Select Difficulty” at `0x439c5a`, then Easy/Moderate/Difficult/Impossible at `0x439cb4/0x439ce8/0x439d1e/0x439d55`. Corresponding hit regions assign EBP=0/1/2/3 at `0x439da5/0x439dce/0x439dfb/0x439e27`; cancel assigns -1. The routine returns EBP in EAX at `0x439f1c`. New-game code calls this routine at `0x4209c6` and stores EAX into `0x820344` at `0x4209ce`.

Thus normal difficulties are Easy0, Moderate1, Difficult2 and Impossible3. Easy uses generated minimum height3; the others use4, except the earlier fixed-height returns. The secondary feature override draws random(8) on Difficult and random(4) on Impossible; Easy/Moderate skip that draw. The first-patch override remains separate.

`original-difficulty.js` exposes these named settings. The composed stage and secondary feature pass now require named difficulty, replacing their unexplained flag/level inputs. This supersedes earlier statements that the setting's normal-game meaning was unresolved. Other code paths write special values5/6; their meaning is not inferred or offered as normal difficulties. The low-level height sampler retains an explicit boolean for isolated branch tests.

Six difficulty/stage/feature checks pass, including unchanged all-property composition, rejection of missing/unknown names and preserved outer height exceptions. Build passed. Original difficulty effects elsewhere in the game, special modes, surrounding-memory behavior, scenery/bonuses and live generation remain incomplete.

## Feature composition and post-patch cleanup

`original-property-feature-stage.js` extends the combined stage through `0x470b84`. Secondary patch origins outside the logical column range still resolve within the supplied arrays using original flat addressing: tile stride50, vertex stride51. For example, logical tile(44,69) is linear2269, not outside the2500-byte array. This resolves the secondary-pass composition concern without clipping or supplying invented extra bytes. The earlier river/last-row surrounding-memory inputs remain explicit.

The wrapper writes feature terrain, flags and vertex changes using these distinct strides. It then reconstructs `0x470b13–0x470b57`: sixteen pairs of random(42), offset by four, set flag0x0100. The immediately following full-map loop clears0x0100 and maps terrain16 to13. Although the flag-setting output is erased, all32 random draws are retained.

Six focused checks pass, covering all16 catalog entries ×4 normal difficulties,24 patch origins, synchronized terrain backing memory, height bounds, cleanup, deterministic continuation and the Jurassic Springs override. Build passes. The result is explicitly labeled before-scenery-scatter; it does not yet include scenery objects, bonus placement, final acreage boundaries or complete companion terrain metadata. Original-runtime parity remains unverified.

## Difficulty-dependent flag scatter

`original-scenery-flags.js` reconstructs `0x470b84–0x470c23`. The pass samples row/column=random(46)+2 and sets flag0x0100 on eligible terrain. The target is (4-difficulty)×9 accepted samples:36/27/18/9. Existing flag state is not tested, so repeated selections count; imposing uniqueness would change RNG continuation.

Eligibility helper `0x40bc50` rejects out-of-bounds coordinates and terrain20. The caller also excludes21,22,4,18; its environment arithmetic excludes11 for desert and10 otherwise. Terrain17 is excluded when column<=6. Other flag bits are retained. The visual meaning of0x0100 is still unverified, so no scenery asset is inferred from these flags.

Two focused checks pass for difficulty counts, a single eligible tile selected repeatedly, terrain exclusions, untouched input flags and composition after secondary patches. Build passes. For malformed synthetic inputs the module reports no eligible tile or a100,000-attempt diagnostic limit instead of hanging; successful original-like inputs retain draw order. Next original pass at0x470c23 shapes neighboring vertex heights around terrain17/18 before further placement. Full scenery/bonus reconstruction and playable integration remain incomplete.

## Sequential vertex-edge shaping

`original-edge-heights.js` reconstructs `0x470c23–0x470d69` from the pinned executable. For terrain17/18, four vertex pairs are visited in order. A neighbor terrain17 suppresses the corresponding adjustment. Equal vertex heights above3 change only the first vertex:4 becomes3 without a draw; higher values add random(2) mapped to -1/+1. Each write is visible to subsequent sides. Byte assignment retains original wrap behavior.

The row/column loops both include50, while terrain addressing still uses stride50 and vertices stride51. Current vertices must be inside0..49; the next vertex has no separate logical bounds check. The raw reader intentionally exposes outside-map terrain reads, including the final(50,50) read at flat index2550. Existing composed-stage memory supplies only50 trailing bytes; this pass needs one more explicit byte before safe composition. Do not silently clamp or invent that byte. Cardinal neighbors were verified against the tables at0x4c1870/0x4c1890.

Three edge tests and two scatter tests pass, covering sequential writes, RNG continuation, unequal heights, neighbor suppression, preserved input/outer vertices and explicit memory requirements. Production build passes with the existing chunk-size advisory. This is static reconstruction, not original-runtime parity evidence or live terrain integration. Continue from0x470d69 for subsequent placement, and resolve backing-memory inputs before composing this pass.


## Composition through edge shaping

`original-property-edge-stage.js` combines the feature stage, difficulty scatter and sequential edge shaping through0x470d69. It requires at least2601 terrain-memory bytes:50 leading,2500 map bytes and51 trailing. Earlier stages now preserve larger explicit backing arrays while retaining support for their2600-byte inputs. No original starting padding values are inferred. The combined output is labeled before-placement and includes aggregate RNG continuation, scatter selections and edge-change count.

Seven focused tests pass, including all16 properties across4 difficulties, equality with separately sequenced passes, unchanged terrain during scatter/edge shaping, preserved inputs and padding, deterministic repetition and rejection of insufficient memory. These composition checks validate wiring, not independent original-runtime equivalence. Build passes with the existing chunk-size advisory. This resolves the technical extra-byte composition requirement; authentic initial memory and seeds remain unresolved.

Next placement evidence:0x470d69 samples row and column independently as random(17)+15. It retries unless terrain matches the earlier base code, then calls0x40d880(row,column,signed byte at0x4c17e4,15); return -1 also retries. Success calls0x40dcf0(row,column,15,0x60), updates coordinate globals and enters a16-way branch at0x470e2c. The placement helpers and branch semantics still need decoding before implementing their effects or labeling the object.


## Placement feasibility and clearance cost

`original-placement-check.js` reconstructs0x40d880–0x40da97 for normal nonnegative footprints and terrain codes. Arguments are row,column,size,type. The original start call reads size4 from0x4c17e4 and passes type15. The helper scans offsets -1 through size inclusive. Border cells only establish whether any terrain is not17; interior cells determine rejection and clearance cost. All-water borders reject types other than0/4.

Nonzero types reject terrain21, terrain0, flags0x8080 and mismatched existing object types when terrain22 or flag0x400 is present. Type12 requires terrain17 in environment0/2. Helper0x40bc50 rejects interior outside0..49 or terrain20. The later flag0x8000 rejection applies even to type0. Cost adds the signed terrain metadata byte at terrain-record offset4 when category byte at offset6 is13, and separately for codes12,17(except type12),18,19. These additions can stack. Terrain records have stride48 at0x576dc0. No metadata cost values are guessed.

Three focused tests pass for the4×4 interior/6×6 scan, border exceptions, rejected flags and codes, existing type matching, stacked costs and type12 environment conditions. Build passes. The explicit metadata and existing-object callbacks remain integration requirements. The generic helper does not yet cover malformed negative size/terrain codes or original-runtime validation. Next decode terrain metadata initialization and placement mutation helper0x40dcf0; type15's identity still needs corroboration before a user-facing label.


## Startup terrain metadata recovered

At0x40f2d3–0x40f2ea the executable copies0x114 dwords (1104 bytes) from0x4c0a38 to0x576da0. This is23 records of48 bytes: a32-byte name followed by16 metadata bytes. The previously observed0x576dc0 field address is the first record's metadata, not the record base. Clearance cost is signed record byte36; category is signed byte38.

The checksum-pinned importer scripts/import-terrain-metadata.mjs extracts all23 records into original-terrain-metadata.json. originalTerrainMetadata exposes startup names/categories/clearance costs without interpreting other fields. Original codes now corroborate17=water,18=wetlands,19=marsh,12=rocks,13=tree,14=pine tree,15=palm tree,16=elm tree. Clearance units per tile: rocks/tree/pine/palm5; elm/water10; wetlands50; marsh100. No displayed currency conversion is inferred.

Five metadata/placement tests pass, including byte-level comparison with the supplied executable and actual-cost placement fixtures. This resolves startup table values; runtime edits to the table still need an audit before assuming these values in all game states. Placement mutation0x40dcf0 has been partially traced: it flattens selected vertices, writes building terrain and companion metadata, clears flag bits0x1300, optionally sets supplied flags, and resets a companion byte to255. Its remainder, size extensions and object registration still need reconstruction; no partial mutation was integrated.


## Starting location selection

original-start-location.js reconstructs0x470d69–0x470dc8. Each attempt draws row then column as random(17)+15, rejects candidates whose terrain differs from the original base code, then runs the4×4 type15 placement check. A -1 result retries. The selected coordinates, clearance cost and exact RNG continuation are returned without mutating the terrain. The earlier stage now retains baseCode for this comparison. Metadata and existing-type lookup remain explicit inputs; startup metadata is used in the tests. A100,000-attempt diagnostic guard replaces an infinite search for malformed input.

Four selection/composition tests pass, covering retries, fixed seed1 candidate(23,17), preserved terrain and selection across16 property identities ×4 difficulties with varied purchase slots. This is not live placement or original-runtime parity proof.

Further mutation evidence0x40df86–0x40e0e7: type15 writes row+1/column+1 into two byte globals. Negative placement flags return before registration. Nonnegative flags OR type+1 into the origin tile and allocate the first record with type=-1 among256 sixteen-byte records. Type,row,column occupy words0/2/4; byte6 receives global0x5a1f3c &3; dwords8/12 clear. Notably0x40e025 clears byte7 using the object TYPE index, not the allocated record index; preserve and corroborate this apparent original quirk. Registration fills companion tile bytes with the allocated index and clears0x100/sets0x400 over base size plus extension. The final0x42ee80 call still needs tracing. No incomplete registration implementation has been substituted for these effects.


## Building registration reconstruction

original-building-registration.js implements0x40dfa0–0x40e0d7 on explicit256×16-byte records,2500 tile flags and2500 ownership bytes. Negative placement flags skip registration; otherwise origin flags first OR type+1, then the first type=-1 record receives type,row,column, masked rotation and cleared counters. The unusual type-indexed byte7 clear remains literal. The registered footprint uses base size plus extension; tiles receive allocated index, clear0x100 and set0x400. Caller arrays are cloned.

Four registration/start-selection tests pass. Cases include slot reuse, extension size, input preservation, original byte-clear indexing, negative flags and full capacity. For a full table the original scans beyond the record array before checking capacity; this module bounds that scan and reports capacityExceeded after retaining the prior origin-flag update. This explicit diagnostic behavior is not claimed as memory-overrun parity.

The following0x42ee80 routine is not a trivial redraw: it clears2500 bytes at0x541f28 and20000 bytes at0x51a680, samples four directions per tile through0x40bcd0, and branches on terrain metadata flags at record offset44 to calculate further map values through0x42eb90/0x42ed10/0x42edc0. More tracing is required. Registration reports needsMapRebuild instead of silently claiming these derived arrays were updated. Earlier terrain painting, full placement composition and live gameplay integration remain unfinished.


## Building footprint painting

original-building-paint.js reconstructs0x40dcf0–0x40dfa0 for explicit normal footprints. Size starts at the supplied original base size, adds1 for placement flags=-2 and adds the supplied extension for types>=6. The footprint copies the origin vertex height except at the last column of its first row, writes terrain21 for type5 or22 otherwise, and applies raw type6/10/12 terrain exceptions. Each tile receives the explicit metadata byte from the original0x5771e5 source, clears flag0x1300, ORs positive placement flags and resets ownership to255.

Type10 additionally makes four interior random writes with codes1,1,1,7, consuming column then row draws each time and retaining duplicate writes. Type15 returns the row+1/column+1 anchor update. Four painting/registration tests pass, including flattening, ownership reset, caller preservation, type-specific patterns, size exceptions,8-draw continuation and composition with record allocation. Final derived-map rebuilding remains outstanding.

A raw inspection of the20-byte table around0x4c16b8 revealed human-readable names that must not yet be treated as stable type labels: startup labels and later runtime rewrites require careful record-layout tracing. Raw type IDs remain in these reconstruction APIs rather than presenting unverified facility identities. The supplied base sizes, extensions and companion metadata remain explicit integration inputs.


## Directional height sampling and first derived-map traversal

original-corner-height.js reconstructs0x40bcd0–0x40be36 with extrema helper0x42eb90–0x42ec0f. Outside logical tiles or even directions return3. Nonzero signed cached values take precedence when requested. Terrain metadata flag2 selects the minimum corner, flag4 the maximum; flag1 with either selects the stored surface byte, and flag8 otherwise returns3. Ordinary odd directions1/3/5/7 select(row+1,col-1)/(row+1,col)/(row,col)/(row,col-1). Height reads remain explicit, preserving the unresolved generated-versus-stored height branch at the caller.

originalDirectionalHeightStage reconstructs the first traversal of0x42ee80 through0x42ef6a. It zero-initializes2500 surface bytes and20000 directional bytes, then samples four directions before updating the current surface height. Consequently terrain with flags1+2 initially gets zero directional values even though its surface is subsequently assigned its minimum. That original ordering is preserved; the later passes have not been implemented.

Two focused tests pass for direction mapping, flags, extrema, signed cache precedence, zero-cache fallback and map traversal ordering. Callback fixtures validate reconstructed logic, not original-runtime equivalence. Continue at0x42ef6a and trace its0x42ed10/0x42edc0 callees before composing the full placement update.


## Surface-height propagation

original-surface-propagation.js reconstructs0x42ef6a–0x42efdd and helpers0x42ed10/0x42edc0. Repeated row-major traversals visit cardinal neighbors in west/south/east/north array order (row,col-1),(row+1,col),(row,col+1),(row-1,col). Metadata flag1 enables propagation; flag2 lowers to same-terrain neighboring minima and flag4 raises to same-terrain maxima. The latter additionally requires matching ownership when metadata byte7 (shape) is16. Out-of-bounds and terrain20 neighbors are excluded. Writes are immediately visible. The loop terminates only after a full pass reports no changes.

Four propagation/corner-height tests pass. Fixtures prove reverse-direction convergence over five scans, disconnected terrain isolation, ownership-separated building maxima and preserved inputs. Changes count helper calls that changed a tile, not individual neighbor writes. Signed byte surface storage matches original reads. A10,000-pass diagnostic rejects malformed nonconvergent metadata rather than hanging.

The remaining0x42efdd traversal calls0x42ec10 per tile to rebuild edge masks, then adjusts the origin mask and clears global flag0x40000. That step remains to implement before composing the full post-placement rebuild.


## Complete derived-map routine composition

original-derived-map.js reconstructs the0x42ec10 edge-mask helper and composes the decoded0x42ee80–0x42f01f routine. For each cardinal neighbor, two corresponding corner heights are compared; either lower local corner sets bit0/2/4/6. Out-of-map and terrain20 neighbors are skipped. The unused extrema call and original direction arguments (including -1 and values above7) remain in order.

The wrapper zero-initializes through the first stage, propagates surfaces to convergence, rebuilds all2500 edge masks, forces origin mask bit3 on/bit1 off, clears original global flag0x40000 and returns invalidatedIndex=-1. Directional cache values remain those from the first pass: the original does not refill them after propagation. Six corner/propagation/derived-map tests pass, covering exact first-side call order, excluded neighbors, bit masks, final flag updates and a connected-water composition fixture.

This completes static composition of this routine, not original-runtime parity or full property generation. Runtime metadata and height sampling remain explicit inputs. Next reconstruct the stored-height branch of0x40be60 and source its caller settings before wiring building painting, registration and recalculation into generated properties.


## Stored-height branch and metadata composition

createOriginalStoredHeight reconstructs the nonzero0x831828 branch of0x40be60. Global flag1 or coordinates outside0..49 return3. On terrain20 it returns3 only when BOTH(row-1,column) and(row,column+1) fail0x40bc50; otherwise it reads an unsigned byte at row*51+column. Water/wetlands do not force height3 in this branch. The outer51st row/column of the supplied array remain inaccessible through this reader, matching the original checks.

The startup metadata accessor now exposes little-endian flags at record44..47 and shape byte39, enabling direct use in the complete derived-map rebuild. Six stored-height/derived-map/metadata tests pass, including unsigned200, exact boundary-neighbor direction exceptions, global override, and startup building metadata propagation over stored vertices. This removes the stored-reader implementation gap; the original caller's stored/generated mode transition and runtime metadata changes still need verification before full property placement integration.


## Full building placement composition

original-building-placement.js composes the decoded0x40dcf0 stages: painting, record registration and derived-map rebuilding. Its height-reader factory receives the post-paint/post-registration state, avoiding stale original arrays. Negative flags retain painting and anchor effects while skipping registration/recalculation; full-capacity diagnostic behavior also retains the earlier stages. RNG state comes from painting, as the decoded subsequent stages consume no random draws. The wrapper returns the rebuilt arrays and cleared global flag state.

Six placement/paint/registration checks pass. An asymmetric height fixture proves the final surface propagation uses the painted vertices and new ownership; negative-flag tests verify no accidental recalculation. Caller arrays remain untouched. Height mode and runtime metadata remain explicit. A search of0x831828 writes did not establish a transition inside the generation block; its broader flag uses and caller initialization require more tracing. Do not claim a verified stored-mode generation transition from this composition test.


## Facility table layout resolved

The actual facility record base is0x4c16a8, sixteen bytes BEFORE the size lookup at0x4c16b8. Each20-byte record contains name[16], signed size byte16, and cost word18. Earlier inspection beginning at the size field paired the next record's name with the current size; those apparent identity ambiguities are superseded. Confirmed types:0Pathway,1Benches,2Flower Bed,3Ball Washer,4Landmark,5Home Site,6Putting Green,7Snack Bar,8Pro Shop,9Swim Club,10Driving Range,11Cart Garage,12Marina,13Resort Hotel,14Airstrip,15Clubhouse. This matches the already decoded green/range/marina terrain exceptions.

A checksum-pinned importer extracts16 records to original-buildings.json; originalBuildingMetadata exposes startup names, base sizes and internal cost units. Starting-location search now reads the clubhouse's4-tile size from that catalog. Three catalog/start-selection tests pass against executable bytes and all-property selection fixtures. Currency scaling, regional names and runtime cost changes are not inferred.

The extension array0x5a7680 is zeroed at0x40f908 AFTER the generation call at0x40f8a7; existing object records then contribute maxima from counter+1. This does not prove the array is zero on entry to generation. Keep extensions explicit until earlier initialization is traced.


## Property pipeline through clubhouse placement

original-property-clubhouse-stage.js composes terrain generation, initial clubhouse search, painting, registration and derived-map recalculation through0x470e26. It synchronizes the backing terrain memory and aggregates RNG draws. Follow-up caller behavior sets record0 byte7 bit0x40 literally, clears origin tile flag0x20 and retains the coordinate-global writes without assigning unverified camera semantics. The output is explicitly before-property-bonuses.

Three focused tests pass, including all16 properties ×4 normal difficulties and placement regressions. Tests provide synthetic zero companion metadata, empty records, no existing-object lookup, extension0 and stored-height mode; these are explicit fixture assumptions, NOT verified original new-game state. Companion metadata lifecycle, authentic entry padding/seeds, runtime height mode and extension initialization still need tracing. The wrapper accepts placement-entry companion state rather than pretending to have reconstructed those earlier writes. Property bonuses, final acreage boundaries and live generation remain incomplete.


## Free-facility property branches

The16-entry jump table at0x4719f4 dispatches property TABLE indices, consistent with index9 Christmas Pines and index14 Ocean Grove. Five branches at0x470e33/3a/41/48/4f set facility types6/8/13/14/9 respectively for table indices9/14/2/11/4. Regional display names remain separate from those raw facility types.

original-free-facility.js implements through0x470ec7. It checks only0x40bc50(clubhouse row,column+5), then places at(row-1,column+4) when available or(row-1,column-5) otherwise, with placement flags0. There is no additional feasibility call in this branch. It sets0x20 at original clubhouse-row columns+2,+3,+4 or-1,-2,-3, respectively. Runtime size extensions remain supplied by the caller. Map memory is synchronized and RNG continuation retained.

Three free-facility/clubhouse-pipeline tests pass, covering all five type mappings, both side choices, tile flags, unchanged inputs and generation regressions. Output explicitly needs the subsequent0x42ea40 update, whose connection semantics require tracing. It does not silently skip unsupported property branches. Further conditionally added landmarks at0x470ede and the remaining bonus cases still need reconstruction.


## Facility connection update composed

original-connections.js reconstructs0x42ea40 and its0x42e820 flood. It clears tile bit0x40, seeds the record0 clubhouse's base footprint, follows cardinal tiles with flag0x420, and stops expansion where signed terrain record byte34 is nonpositive (the tile itself is marked first). Original flat-address neighbor reads remain explicit through padded terrain/flag memory. An iterative depth-first traversal retains recursive neighbor order without exhausting the JavaScript stack.

Facility types6..16 clear/recompute record bit0x40 from their footprints, with the original size-extension-minus-one rule except type7. Easy difficulty or global0x1000000 bypasses this connection requirement; types>=17 get the bit directly. Type<6 records retain their existing byte. The original array-padding inputs are not guessed.

The terrain accessor now exposes signed connectionSpread from metadata byte2. Free-facility placement composes the connection update and returns synchronized flag memory. Six focused checks passed, followed by three free-facility checks including a new integration fixture: each of the five generated clubhouse/free-facility pairs gets record bit0x40 on both allocated records. This supersedes the prior needsConnectionUpdate checkpoint. Further landmark conditions and other property branches remain.

# SGA report arithmetic from the supplied executable

Source: `resources/sim golf/Sid Meier's SimGolf/golf.exe`, SHA256
`82838c7e016de83f2ecfa8023ab05896d2666dd83bf2721b863cf239fcc3b7bf`.
Addresses below are x86 virtual addresses. This is static instruction evidence,
not a claim of runtime parity. Implementation: `scene/src/simulation/original-sga.js`.

## Confirmed report rules

- Category function 0x44f440: up to 5, up to 9, up to 17, exactly 18 holes.
- 0x450985–0x450a12: desired hole counts 5/9/17/18. Quality-hole target
  equals that count except category 2, where it equals actual hole count.
- 0x450b78–0x450ba7: desired length is trunc(100*desiredHoles/18)
  times (57+5*category), giving 1539/3100/6298/7200 yards.
  0x450bdf–0x450c00 supplies displayed minimum: desired minus 1000 for
  18 holes; otherwise desired minus trunc(10*desired/(20+5*category)).
- 0x450d2e–0x450d3c: missing-hole penalty is 4-category (five arguments
  are on the stack here). 0x451963–0x451986 subtracts absolute deviation
  times that penalty from 10.
- 0x451841 onward: length grade is 10-trunc((desired-actual)/100) for
  18 holes; otherwise 10+trunc(5*(actual-desired)*(category+4)/desired).
- 0x451b85: time grade is 10-trunc((minutes-235)/6). A zero becomes one
  when minutes <=300. Hence 240 minutes gives 10, 241 gives 9, 300 gives
  1, and 301 gives zero.
- 0x451cfc: fun grade is 10+trunc((funPercent-109)/10).
- 0x451e3c, 0x451efa onward, 0x45202d onward, 0x452160 onward,
  0x452293 onward: variety/scenic/length/accuracy/imagination grades
  are actual qualifying holes minus quality target plus 10.
- 0x45169f–0x4516ba: ideal facilities are trunc(qualityTarget/2)+1;
  the stored comparison value is one less. 0x4523c6–0x4523e2 counts
  set bits 6 through 19 of global 0x5a4db8 (distinct facility types,
  not individual buildings). 0x452459 grade is 2*(actual-stored)+8.
- Grades clamp to 0..10. Any zero replaces the running sum with -999;
  subsequent additions cannot recover it. The report displays 0/100.
- 0x45274c and jump table 0x452b60: title index is trunc((score-40)/5)-1.
  Indices 0..8 select the nine ascending named events; 9..11 select
  Mini Slam Championship or Grand Slam Championship for 18 holes.
  Other indices select Jr. Qualifying School. A failed report instead
  displays Improvement Required.

Signed integer division truncates toward zero, not toward negative infinity.
The pure module rejects absent measurements instead of treating them as zero.

## Integration still required

Trace the original per-hole aggregation, time conversion, fun denominator,
qualifying-hole classifications, facility-bit identities and prize calculation
before using this report to schedule live SGA tournaments. Browser statistics
currently do not establish all those original measurements. This module is
therefore deliberately not yet connected to invitation or cash state. Invitation
clock trace: 0x417c55 periodically calls 0x44f480 with argument 2 and checks
0x566a14 for a nonzero result; a hole-count-only eligibility gate is insufficient.

Focused tests cover category boundaries, integer targets, each independently
failing criterion, exact time/fun thresholds, facilities and championship titles.

## Hole classification and observation trace (2026-09-11)

Confirmed classification fix: 0x44f486–0x44f499 produces threshold 25 when
original difficulty 0x820344 is zero, otherwise 50. Ratings are in hundredths
of a stroke. The skill branches use >=, not >. They track the minimum rating
starting at 100, updating only on strictly smaller values in length, accuracy,
imagination order. At 0x44fff9–0x45000c the weakest skill bit is cleared when
that minimum is below 100. Table 0x4c1a20 maps masks 0..7 to Breather, Freeway,
Precise, Challenge, Creative, Heroic, Strategic, Classic. Consequently three
ratings of 75 produce Strategic, not an unclassified hole. This decision rule
now drives the browser report and its existing accomplishment consumer.
Browser play currently uses the normal (50) threshold; the pure classifier
also accepts the original difficulty range 0..3.

Further measurement evidence, not yet mapped to browser state:
- 0x44f592–0x44f5b9 seeds eight skill groups with count 8 and total par*8.
  0x44f5ca–0x44f649 adds the per-skill score histogram (scores 1..9).
- Length compares masks 6 vs 7, accuracy 5 vs 7, imagination 3 vs 7,
  each subtracting independently truncated mean scores times 100.
- Global 0x59d208 bit 0x40 adds another contrast: mask 0 vs 1, 0 vs 2,
  and 0 vs 4 respectively. Its mode semantics must be resolved.
- Scenic count at 0x44f658–0x44f67f uses three record fields, with the
  middle contribution halved; sum >=8 qualifies. Field identities remain open.
- Time at 0x44f6e6–0x44f710 divides aggregate by count then by 40 before
  summing per-hole minutes. Browser simulation seconds are not that unit.
- Fun at 0x44f720–0x44f748 divides a signed word times 100 by a denominator
  made from count + half another accumulated field +4. Field meanings remain open.
- Variety at 0x44f985–0x44f993 tests hole-record offset 0x1fc <2.

The classification decision is now source-backed; current broad cohort mean
inputs remain provisional. Do not claim the complete original measurement
pipeline or SGA qualification is integrated from this correction alone.

## Reconstructed score inputs (2026-09-11)

`original-hole-observations.js` now reproduces the eight groups seeded with
8 par scores, per-group signed-integer mean calculations, complementary-mask
comparisons, the explicit optional second contrast, difficulty thresholds and
actual-only course score totals. Input score counts correspond to the original
signed-word bins for scores 1..9; negative/corrupt records are rejected.
Four tests cover seed dilution, unrelated-cohort isolation, optional contrasts,
integer rounding and all final score bins.

New live completions now preserve `scoreCounts` within each existing skill/training
cohort. Restore validates sample and stroke reconciliation. Older groups without
a distribution remain valid; subsequently recorded distributions can cover only
a subset of their historical totals. No historical histogram is reconstructed
from an average. Raw scores are preserved, including scores above nine, pending
verification of the original recording/clamping behavior. The original mode bit,
training-to-mask mapping and scores above nine remain adapter questions before
replacing live broad-mean ratings with the reconstructed calculation.

## Score recording and direct record input (2026-09-11)

Completion function 0x426b00 checks golfer byte +0x18 (absolute 0x577f20)
for zero before the histogram branch. At 0x426b39 it loads the signed score
byte at 0x577f2a, then calls clamp 0x466a00 with limits 0 and 9. At 0x426b4c
it loads the golfer flag byte 0x577f21 and masks with **15**, not 7. Row stride
is 11 signed words, and 0x426b6f increments the selected word at
0x574528 + 520*hole + 22*row + 2*clampedScore.

The report consumes only rows 0..7 and bins 1..9. Hence scores above nine
contribute as nine; bin zero and rows 8..15 do not contribute. The meaning of
flag bit 8 and the admission byte must still be established before mapping
browser training/professional state to these rows. This supersedes the earlier
unknown high-score handling; it does not resolve the remaining flags.

`originalScoreSlot` implements this indexing without guessing flag meanings.
`originalHoleRecordObservations` now reads the confirmed 520-byte record layout
directly, including signed par, signed histogram words and byte-offset views,
and feeds the reconstructed SGA observation calculation. Six focused tests pass.

Global mode bit 0x40 is also read by tee-coordinate editing around 0x41f7e5,
0x41f9b3 and 0x41fdd6. This suggests a relation to tee layouts, but its semantics
are not yet proven; the explicit `combineContrasts` input remains required.

## Browser rating adapter (2026-09-11)

The live course report and course-accomplishment consumer now request the
reconstructed ratings with calculated par, normal difficulty and the optional
second contrast disabled. Score distributions are folded into the eight base
skill masks, preserving raw saved scores but capping them to nine for this
calculation. Training remains separately stored; grouping training by its base
skill is an adapter choice, not a claim that all original training semantics
have been recovered. Existing average-score columns remain broad descriptive
averages; the last column is now labeled Rating and explains the seeded groups.
Legacy score totals without distributions are excluded from rating samples.

Additional source evidence: 0x421142–0x421183 skips masks 0,1,2,4 in the initial
normal-mode selection when global bit 0x40 is clear; when set, all eight can be
considered. Later creation writes at 0x421214 and 0x421244 supply masks within
0..7. These support complementary-mask comparisons for ordinary visitors but
do not yet establish the complete bit-0x40 mode or original training behavior.
The normal-mode adapter is therefore useful live progress, not complete parity.

The pure calculation now permits larger aggregate counts than a signed original
word so long-running browser observations do not fail at 32768; raw record
reading still interprets original signed words and rejects negative counts.
Thirteen evaluation/source-input tests and build pass; twenty evaluation,
classification and accomplishment checks passed before the final adapter test.

## Complete original-record report composition (2026-09-11)

`original-sga-records.js` composes the 18-record loop with the ten-criterion
report. It consumes original records plus the explicit original hole count and
facility bitmask. For each nonzero-par record it reads length at +4, count +0x20,
extra denominator total +0x24, time +0x1ec, fun numerator +0x158, scenery fields
+0xee/+0x104/+0x110 and variety +0x1fc. The middle scenery field is halved with
signed truncation. Time truncates per hole, first by count then by 40; fun
truncates per hole then averages across active records (0x451c51–0x451c58 uses
the active-record counter at the pre-push stack offset 0x20). Facility bits
6..19 count once each, regardless of how many buildings share that type.

Tests now compose synthetic raw records through measurement and grading, reaching
100/100 for a fully qualifying 18-hole fixture and testing time/fun rounding,
inactive records, scenery's inclusive eight-point gate, variety's strict <2 gate,
facility bits and invalid/empty inputs. Seven report/composition checks pass.
This is end-to-end for the decoded record schema, not an original-runtime
comparison: no original saved-course fixture was found by extension search.
Live browser scenery/time/fun/variety still need an authentic measurement adapter;
the report must not receive arbitrary browser mood or elapsed seconds as if
those were original accumulators.

## Fun denominator events identified (2026-09-11)

Original +0x20 is hole **starts**, not completed holes: 0x42cb01–0x42cb09 checks
that the current stroke byte is zero before 0x42cb3a increments it. Original
+0x24 counts **non-putter shots**: 0x4249a6 skips the increment when club byte
0x577f24 is 13 (putter); 0x4249cb–0x4249da increments otherwise. Thus the fun
denominator is starts + trunc(nonPutterShots/2) +4, including unfinished play.
The live simulation now preserves those two actual event counts in optional
`evaluation.activity`, excludes the player-controlled pro as other visitor
observations do, and never reconstructs missing historical activity.

Original +0x158 receives the signed reaction value in BX at 0x467f21. Negative
values can first be suppressed based on prior incidents/difficulty (0x467e4f
onward), and some are transformed with trunc((value-1)/2) at 0x467ecd–0x467ee5.
Current browser positive/negative comment counts therefore are not yet a proven
replacement for this accumulator. They remain descriptive legacy fun values.

Playing time +0x1ec adds half a positive timestamp difference at
0x426ee2–0x426f0a. The prior timestamp is stored on the golfer at 0x577fc8.
Exact timestamp boundaries and browser clock conversion still need tracing;
do not substitute current seconds divided by 60.

## Variety penalty reconstructed (2026-09-11)

`original-hole-variety.js` reproduces 0x42da36–0x42db3c. Hole 1 is assigned zero.
Later holes add one for each condition:

1. Current classification equals previous classification, with at least eight
   current starts (0x42da60–0x42da75).
2. Current/previous record flags +0x200 have identical bits 0x60
   (0x42da7f–0x42da92).
3. Both current signed-word fields +0x132 and +0x134 are zero
   (0x42da98–0x42daac). Their exact feature identities remain unverified.
4. Same par as preceding record (0x42dab2–0x42dac2).
5. Absolute signed heading difference, after arithmetic shift right 24, is
   strictly below 40 (0x42dac8–0x42db22). Heading calls use previous/current
   tee (+8,+12) to green (+24,+28) vectors through 0x466ba0.

A positive penalty loses one on difficulty 0 or 1. SGA's <2 variety test then
uses this result. The direction test wraps signed 32-bit subtraction and shifts
before taking absolute value, so a negative fractional unit behaves differently
from its positive counterpart. Three tests cover those boundaries, all five
contributions, first-hole exemption and difficulty adjustment.

Unresolved integration: identify feature words and flag bits, reproduce original
heading conversion, and connect the original live classification used by this
loop. That classification has an easy-difficulty weakest-skill cutoff of 50 at
0x42d98a–0x42d9ae, whereas the SGA report's separate classification display uses
100. Preserve this distinction rather than using one inferred formula everywhere.
No browser variety rule is claimed from the pure reconstruction yet.

## Variety field identities and dogleg flags (2026-09-11)

The two +0x132/+0x134 fields belong to the per-hole **reaction counter array**,
not terrain/building counts: 0x467fb9–0x467fdb increments
0x5745d8 + 520*hole + 2*incident. Their incident IDs are 45 and 46.
Call sites 0x4252a6–0x42531b compare two height-reader 0x40be60 results and
emit event 46 for one inequality and 45 for the opposite inequality. This
establishes elevation-related observations, but exact shot-point identities,
which event denotes uphill, and admission/suppression still need tracing.
Incident 45's dispatcher has no initial happiness value, whereas 46 sets +1;
the later counter increment is also conditional. Do not equate these counters
with merely finding any elevated tile on a hole.

Flags 0x20/0x40 are opposing dogleg sides. 0x413768–0x4137c2 computes
tee→green heading minus bend→green heading with signed uint32 wrap; if the bend
matches the green coordinates, the difference is forced to zero. The routine
clears only those two flags, then sets 0x20 above 0x071c71c6, or 0x40 below
-0x071c71c6 (strict bounds, approximately ten degrees). `originalDoglegFlags`
now implements that step and has boundary/wrap/flag-preservation tests.

This identifies more of the variety inputs but does not yet recreate the editor's
bend-point selection, exact heading conversion or elevation reaction events.
Four focused variety/dogleg tests pass. Live variety integration remains open.

## Heading routine verified against executed instructions (2026-09-11)

`original-heading.js` reproduces 0x466ba0–0x466cad, including axis/zero cases,
14-bit ratio, constants 0x1333 and 0x2800, signed multiplication/shift rounding,
quadrant selection and the final 16-bit shift. This is an integer approximation,
not a call to atan2. `originalDoglegFromPoints` now composes original headings
with the recovered flags using integer tee/bend/green coordinates.

Independent differential verification executed the original function bytes in
Unicorn x86 emulation, with only code and stack memory mapped and no OS calls.
All 10,033 axis/random/course-range/extreme-int32 vectors exactly matched the JS
result. `scripts/verify-original-heading.py` reproduces the comparison, checking
the source executable SHA256 first (requires Python pefile/unicorn and Node).
A 65-vector oracle subset is retained in the ordinary test fixtures so routine
regressions do not require an emulator. Six heading/variety checks pass.
This verifies this isolated function, not whole-game timing or runtime parity.

## Record-based variety verified and composed (2026-09-11)

`originalHoleVarietyFromRecords` now reads the actual record fields and computes
headings using the verified original function. Independent emulation runs the
unaltered block 0x42da34–0x42db42 plus its original heading callee, with original
records, stack classifications and difficulty memory populated. All 2,000
randomized record pairs matched exactly across starts at 0/7/8/30, all four
difficulties, first/later holes, par/flags and nonzero elevation-event counters.
The repeatable script is `scripts/verify-original-variety.py`; it verifies the
executable hash and requires pefile/unicorn/Node. It executes no OS services.

`originalSgaFromRecords` optionally accepts the current 18 classification masks
and recalculates variety before grading. Without them it continues to report the
stored original values. Inactive holes preserve the prior active classification,
while geometry references the preceding physical record, matching the original
loop's two different sources. The recomputed penalty is included for diagnostics.
Tests demonstrate stale zero penalties cannot qualify eighteen repetitive holes
when fresh classifications are provided. Eleven geometry/variety/report tests
pass. This is original-record integration; browser incident/bend adapters remain.

## Design pass bend selection, facing and elevation (2026-09-11)

The bend used for dogleg flags is **not** the alternate tee coordinate pair at
record +0x10/+0x14. The design pass simulates shots via 0x4235c0 (actor 0x9a)
at 0x413363, reads planned landing globals 0x5a7270/0x5a7278 and shifts them
by ten bits. At 0x4133d2–0x4133dd, first-shot state with outer iteration index
2 selects 0x4135a0 to store the landing in stack locals +0x174/+0x18c.
At 0x413619 these become the bend coordinates used by the subsequent geometry.
The full simulation/planner loop is not yet reconstructed.

`original-design-geometry.js` composes the confirmed later steps:
- 0x413631–0x413657: tee→first-landing heading rounds to one of eight facings.
- 0x413668–0x413738: clear prior elevation flags; set 0x1000 if green height is
  more than one level above tee, 0x2000 if more than one below.
- 0x41373a–0x413761: accumulated route measure below 250 replaces the dogleg
  bend with the tee. Facing was calculated earlier and remains unchanged.
- 0x413768 onward: apply reconstructed dogleg-side flags.

The route measure is accumulated through 0x40c1a0. That helper subtracts tile
center coordinates from fixed-point origins, calls 0x40a9f0, multiplies by 25
and shifts by ten. The design pass later applies another scale to displayed
length. The module therefore requires the original measure explicitly and does
not label it browser yards. Nine focused design/heading/variety checks pass.
Live integration still needs the original planner/landing and measure adapter;
user-requested manual tee rotation remains supported in the browser.

## Route units verified (2026-09-11)

`original-route-distance.js` reconstructs 0x40a9f0 and 0x40c1a0 within the
original map-coordinate domain. The distance helper divides each component
whose absolute value exceeds 16384 by eight (signed truncation), independently
multiplies a result scale by eight for each such component, computes square root
and truncates after scaling. This unusual behavior is retained, not replaced by
hypot. The route helper subtracts the target tile centre (tile*1024+512) from
fixed-point origin coordinates and returns trunc(distance*25/1024).

`verify-original-distance.py` emulates both original functions plus their x87
integer-conversion callee 0x4a57a0 with a known FPU control word. All 10,049
boundary/random distances and 1,000 route segments matched exactly. The ordinary
suite covers component thresholds, signed behavior, tile centres and composition.

`originalDesignGeometryFromSegments` now accumulates measured source segments
and feeds the dogleg cutoff instead of requiring an invented route measure.
Six distance/design tests pass. The full design-pass shot simulation and choice
of segments still need reconstruction; this does not authorize substituting
browser routing distances or change live golf physics.

### Design-pass orchestration and cached redraw (2026-09-11)

Reconstructed `original-design-pass.js` from 0x413230–0x413619. The normal
entry initializes pass index 2; the switch uses skill masks 3 and 7 for the two
active passes. Dummy actor 154 begins at the tee tile centre. Pass 2 records only
its first landing. Pass 3 accumulates route segments, snaps each origin to the
previous landing's tile centre, and stops at five shots, the cup, or terrain whose
signed shot-class byte is greater than 1. An unplayable segment is not counted.
The first landing on terrain code 1 supplies shot index + 3 as suggested par.
The final coordinate comparison independently checks for the cup and, when equal,
stores trunc(routeMeasure / 4) as length, even after a terrain stop.

At 0x413340, global bit 0x40000 selects fresh planner calls versus cached redraw.
Fresh results are shifted by 10 and written to parallel tile-coordinate arrays
0x541d0c / 0x541d34; 0x4133ad consumes the same sequence without calling the
planner. The reconstruction exposes an optional tile landing cache and returns
a copied landing trace, keeping replay independent of caller mutation. Incomplete
caches fail explicitly rather than using invented coordinates.

Seven orchestration tests cover separate skill passes, snapped origins, terrain
stops, the five-shot cap, first-green par, final cup-coordinate handling, and
planner-free cached replay. Together with geometry/distance tests, 13 pass.
This is source-disassembly reconstruction, not independent emulation of the whole
design routine. The original planner at 0x4235c0, screen drawing, and cache
invalidation triggers remain unimplemented here. It is not connected to the live
browser design preview; no heuristic replacement is claimed to be original.

### Planner range input (2026-09-11)

Planner entry 0x4235de calls 0x4219e0. Reconstructed that complete arithmetic
routine through its return at 0x421b47 as `originalShotRange`:

- Skill bit 1 selects base 200 versus 150. Global 0x820344 >= 1 adds
  trunc(50 * signed actor byte +0xc2 / 3); otherwise add 40 versus 25.
- Surface comes from 0x40bc90, except actor IDs >= 152 force surface 0 for
  shot byte +0x2a == 0 and surface 2 otherwise. This includes design actor 154.
- Nonzero professional byte +0x20 permits ability-word +0x1e bonuses: bit 1
  adds 4 * unsigned +0xf8 - 20; bit 2 adds 6 * (unsigned +0xf9 - 5), only
  on effective surface 0.
- Positive signed byte +0x3e adds trunc(min(value,3) * range / 24).
  Length skill then adds 15 * global 0x542bd8.
- Positive signed surface-table byte at 0x576dc2 + 48 * effectiveSurface
  subtracts trunc(min(value,3) * range / 8).
- Nonzero effective surface subtracts a fifth, truncated toward zero.
  Return is capped at 330; no lower clamp is present.

The wrapper uses explicit inputs for the globals and resolved surface class.
`level`, `boost`, and `lengthBonus` are API labels, not proof of the complete
original UI/clock ownership of those fields. The supplied shotClass must describe
the effective surface after the special-actor override. It must not be mapped
from the browser terrain names without validating their original IDs.

`verify-original-shot-range.py` independently runs the original range routine
and original clamp callee in Unicorn. Only the surface lookup returns a supplied
surface ID; all range arithmetic executes original instructions. All 5,000
fixed-seed cases matched. A 40-case original-output fixture runs in regular
Playwright tests, alongside specific special-actor/ability/cap tests. Ten combined
range/design-pass checks pass. This does not emulate the full planner or replace
live shot physics. Landing candidate search, terrain routing and final shot
selection remain before full planner integration.

### Direct approach terrain adjustment (2026-09-11)

Reconstructed 0x4239f7–0x423b66 as `originalShotApproach`. This branch first
writes the target tile centre to landing globals 0x5a7270/0x5a7278. Terrain
code 1 or distance <= 25 skips the surrounding-terrain adjustment.

For other direct approaches, the original eight-way facing selects cardinal
vectors at indices facing & 6 and (facing + 1) & 6 from tables 0x4c1870/0x4c1890.
Even facings therefore sample the same axis twice; odd facings sample adjacent
axes. It sums the two signed shot-class bytes behind the target and subtracts
the two ahead. A balance >= 4 adds clamp(trunc(distance / 4) - deduction, 0, 12),
where deduction is 0 on a positive current shot class and 6 otherwise. A balance
<= -4 subtracts 6. This changes the planned distance while retaining the tile-
centre landing globals. These are terrain shot classes, not elevation values.

`verify-original-shot-approach.py` executes this original instruction block and
its original clamp callee, loading the original direction tables, with supplied
map terrain/class bytes. All 5,000 fixed-seed cases match the JS implementation.
A 40-case oracle fixture and boundary/near-side/far-side tests are committed.
Fourteen combined approach/range/design-pass tests pass.

Preceding branch evidence, not yet integrated: 0x42376c–0x4237a9 bypasses route
search for nonzero second argument or explicit target (third argument != -1).
Otherwise the distance threshold is 25 when actor flags bit 1 or skill bit 4
is set, and 75 otherwise; a strictly greater distance and current terrain code
other than 1 enter the intermediate route search. Reconstructing that search,
its distance units, and subsequent shot selection remains necessary. The current
helper is not a replacement for the complete shot planner or live physics.

### Intermediate-route candidate admission (2026-09-11)

Route search 0x422450 enumerates offsets -10 through +10 around an initial
landing estimate (21-by-21 candidate storage, six score slots each). Reconstructed
its first admission block 0x42290e–0x422af8 as `originalRouteCandidate`:

- Actor flag bit 1 excludes the previous target tile. All actors reject outside
  the 50-by-50 map or terrain code 20 through original helper 0x40bc50.
- Candidate shot distance must be <= current range + 16. With actor flag bit 1
  clear, it cannot be below both trunc(range/3) and trunc(cup distance/3).
- Reject current tile, terrain code 0, and signed terrain shot class > 1.
- Class 1 gets the stronger progress requirement unless at least one cardinal
  neighbor has class <= 0. Other admitted classes use the normal requirement.
- Candidate-to-cup and current-tile-to-cup distances use original 0x40a9f0 with
  tile deltas. Terrain code 1 is rejected when more than three units from cup.
- Require remaining + 1 <= initial for supported candidates, or remaining +
  trunc(initial/2) <= initial for an isolated class-1 candidate.

`verify-original-route-candidate.py` executes the original filter, map-bounds/
terrain-code helper, distance helper and conversion instructions on supplied
terrain bytes. All 5,000 deterministic cases match (319 admitted). Five focused
regressions cover range/short-shot thresholds, neighboring terrain, green distance,
actor override, excluded surfaces and progress. Nineteen combined planner-helper
and design-pass tests pass. This is candidate admission only. Six-way candidate
shot simulation, score comparison, iterative search and winning-target assignment
remain before this constitutes a full original planner. No live adapter is wired.

### Route score pruning and refinement (2026-09-11)

Reconstructed score-only pruning and refinement control from 0x423305–0x423492
as `originalRoutePruning`. Each 21-by-21 candidate holds six scores. A second
slot > 99999 skips the whole candidate; individual scores >= 99999 are excluded.
Scores strictly greater than best + margin become 99999. Equal cutoff scores
survive. Six excluded options mark the second slot 100000.

Margin starts at 128. Tighten by half while survivor count > 4, margin > 16,
and previous work + 3 * survivors * current sample count > 250. Exclusion is
persistent across tighter passes. Refinement doubles sample count from 2 to 4
or 4 to 8 and only continues with more than one survivor. Outer caller checks
at 0x423261/0x42326c bypass pruning entirely at eight samples or design mode 2;
those remain caller responsibilities, not silent assumptions inside the helper.

`verify-original-route-pruning.py` executes the original score scan, exclusion
writes and margin-control instructions for 200 full 441-by-6 score grids at
sample count 2. Its hook skips heading/spread setup when rescanning, resets the
survivor counter and re-enters the original scan. The idle/UI call is stubbed;
no score arithmetic is stubbed. All output grids, survivor counts and final
margins match. Four tests cover cutoff equality, work budgets, minimum margin,
small survivor counts and sentinel behavior. Nine pruning/admission tests pass.

Sample-count-4 heading and remaining-distance spread bookkeeping is not part
of this score-only helper or oracle. Candidate shot simulation, scoring inputs,
spread flags, and complete search orchestration remain open before live use.

### Simulated landing score (2026-09-11)

Reconstructed `originalRouteLandingScore` from 0x422c34–0x422d87 and
0x422e5a–0x422ea4. After a simulated landing, imagination bit 4 samples eight
nearby points: cardinal offsets truncate(1024/3), diagonal offsets 1024/4.
Each sample adds its signed terrain shot class, minus 1 for marker bit 0x80;
outside-map/code-20 points instead add the excluded class at 0x577182.

The landing itself adds eight times an adjusted lie value. Exclusion (bounds,
code 20, or metadata bit 0x400) overrides with excluded class. Otherwise marker
bit 0x80 subtracts 1 when low five bits match the actor's hole, or adds 2 for
another hole. The raw nonpositive landing class increments the good-landing
counter, independently of that adjusted lie. Add trunc(original route distance
to cup / divisor), with divisor 2, 4 or 6 supplied by the outer search setup.
The helper accumulates onto the existing score and good-landing count.

Negative scores are possible: a zero-class same-hole marker at the cup gives
-8 even without imagination. Corrected pruning input validation to admit signed
scores rather than rejecting these valid original results.

`verify-original-route-landing-score.py` executes original sampling, surface and
marker handling, distance and score arithmetic for 1,000 supplied terrain cases.
It skips unrelated heading/target bookkeeping between the two score blocks.
All scores and good-landing counters match. Pruning independently matches 200
complete x86 grids now including negative scores. Nine landing/pruning tests
pass. This does not include the imaginative follow-up shot assessment at
0x422ea4 onward, full shot simulation, or a live planner adapter.

### Follow-up shot selection (2026-09-11)

Reconstructed 0x422e99–0x423098 orchestration as `originalRouteFollowup`.
It runs only at four samples, with mode != 2, imagination bit 4, and the
beyond-two-shots flag clear. Positive adjusted lie adds twice the straight
assessment using unchanged range. Other lies reduce range by trunc(range/5)
on shot zero; compare straight plus enabled shape -1 and +1 assessments,
then add trunc(minimum cost/2).

For the straight assessment, the carried follow-up flag becomes 1 when raw
landing class <= 0, remaining distance >= 50 and
trunc(60 * (range - remaining) / (3 * range)) >= 4. Otherwise it is preserved;
curve assessments receive flag 0. The incoming flag is explicit because its
initialization/lifetime outside this block is not yet established. Shape mask
bits 1/2 come from the search's earlier skill/professional ability gates.

Four tests assert callback arguments, skipped passes, first-shot range handling,
curve choice and threshold/flag persistence. Thirteen combined follow-up,
landing-score and pruning tests pass. These are disassembly-derived tests, not
an independent x86 oracle for this orchestration. The callback explicitly needs
original 0x421450 assessment; browser heuristic costs are not a valid substitute.

Next dependency inspected: 0x421450–0x42186f samples terrain along a curved or
straight prospective route, including endpoint terrain and neighboring tile
penalties. It uses original heading/distance and projection helpers 0x466b40 /
0x466b80. Those delegate to 0x4913e0, which interpolates a runtime table at
0x8390ac. Recover table initialization and fixed-point interpolation before
reconstructing the complete assessment; do not silently use Math.sin/cos.

### Original projection table and components (2026-09-11)

Recovered runtime initializer 0x491380–0x4913bc. It writes 256 integers at
0x8390ac: x87 fsin(index * double at 0x4baa50), multiplied by 65535.0 and
converted through original truncating helper 0x4a57a0. The step constant is
0.006159985596078431. Ran those original instructions to generate the committed
immutable table; did not substitute JavaScript trigonometry. The interpolation
reads an additional adjacent entry at index 256, zero in isolated initialized
storage; no direct write to that address was found in the executable scan.

Reconstructed 0x466b40/0x466b80 and the relevant core paths at 0x4913e0–0x4914ea.
Heading uses the original full-turn uint32 convention. Sign and quadrant folding,
22-bit table interval/fraction, signed 32-bit multiplication and shifts are
preserved. Radius scaling branches at signed 65535 and 16777215, including
negative-radius behavior. Cosine adds a wrapped quarter-turn before projection;
map callers subtract this component from the z origin.

`verify-original-projection.py` initializes the table by original x86 and checks
10,081 vectors against original projection instructions. Includes all quadrant
boundaries, positive/negative radii, scaling boundaries and 10,000 fixed-seed map
vectors. All match; 97 oracle vectors are committed for ordinary regression
runs. Ten projection/follow-up/landing-score tests pass. This verifies isolated
initialized-table behavior, not a full original process snapshot. Next step is
the complete terrain-sampling route assessment using these projections.

### Complete prospective-route assessor and conversion correction (2026-09-11)

Reconstructed 0x421450–0x42186f as `originalRouteAssessment`, using original
heading, distance and projection helpers. It samples straight/draw/fade paths,
near-target terrain, obstacle-kind 13 costs, excluded terrain, adjacent classes
near tile edges, and a separate straight midpoint obstacle count. Green terrain
code 1 has its class temporarily treated as zero without mutating shared metadata.
The assessor now supplies actual costs to the reconstructed follow-up selector
in an integration regression; the browser planner remains unchanged.

`verify-original-route-assessment.py` executes the complete original routine and
all math/bounds callees, with the original initialized projection table and a
supplied terrain map. No part of the assessment is stubbed. All 1,000 randomized
straight/curved assessments match. Forty original outputs plus their map are
committed as a normal regression fixture. Fourteen assessment/design/follow-up
tests pass. Border/padded-map behavior still requires caller-supplied original
terrain data; this is not an adapter for browser terrain IDs.

**Correction to earlier design-pass length notes:** 0x51eb851f high-product with
arithmetic shift 3 implements division by 25, not 100. Thus 0x4135f7 multiplies
routeMeasure by 25 and divides by 25, storing the low signed 16-bit result; it
does NOT divide routeMeasure by four. Corrected the helper and tests (a route
measure of 250 stores length 250). Independently executed that conversion on
10,005 values, including signed-word boundaries. This supersedes the earlier
trunc(routeMeasure / 4) claim. In the assessor, the reachable sample count is
min(rounded tile distance, trunc(range / 25) + 1), also using this divisor.

Full candidate-shot simulator 0x421b50, search orchestration, spread flags and
live original-map adapters remain required before replacing the browser planner.

### Candidate-flight motion and shared projection (2026-09-11)

Candidate simulator 0x421b50 first saves the actor, invokes planner 0x4235c0
with an explicit target, halves angular offset, simulates until stopped, writes
landing globals, then restores the saved actor. The explicit target prevents
recursive route search. The whole simulator is not yet reconstructed.

Implemented its position/gravity and airborne response as `originalCandidateMotion`
using existing `originalBallPositionStep` / `originalGravityStep`: integrate fixed
coordinates with speed/16 and height with vertical speed/32, apply gravity, then
select the airborne branch if integrated height > 1. Only that branch adjusts
height by old ground height minus new ground height, reduces speed by speed >> 5,
and adds angular offset to heading. Branch selection precedes ground correction.
The caller must still handle subsequent collision, ground, bounce and stopping
logic. Terrain height inputs explicitly represent original 0x42f110 outputs.

Found an older duplicate projection implementation in original-ball-position.js.
Consolidated its default table onto the newly x86-generated immutable table and
made originalProjection delegate to its originalSine implementation. Ball and
route consumers now share arithmetic and data; explicit table overrides remain
available for original runtime captures. Eighteen movement/bounce/projection/
assessment tests pass. Re-ran original oracles: 10,081 projections, 1,000 complete
assessments and 10,005 length conversions still match. New candidate integration
has source-derived boundary tests; full candidate-flight x86 oracle remains open.

### Candidate ground response (2026-09-11)

Reconstructed 0x421f48–0x4220f4 as `originalCandidateGround`. Imagination bit 4
uses clamp(roll coefficient - forward slope, 0, 99) and cross-slope heading
adjustment; other candidates use the raw coefficient without slope steering.
A terrain boundary forces resistance to at least 2. Resistance < 5 reduces speed
by trunc((speed >> resistance)/2); higher resistance uses speed - (speed >> 6)
+ 32. Terrain 17 away from boundaries and terrain 10 in the centre subcells
halve speed. Crossing tile boundaries reflects heading only when the old tile's
directional wall bit matches the signed movement component.

These are candidate-simulator rules, kept distinct from the previously recovered
live ball ground routine where source behavior differs. Slopes, terrain and wall
bits are explicit original inputs. The helper does not perform bounce, obstacle
collision or final stopping. `verify-original-candidate-ground.py` runs the
original entire branch and clamp helper, stubbing only the directional slope
helper outputs. All 5,000 randomized speed/heading outputs match. Seven focused
ground/flight tests pass. Full simulator lifecycle and original slope/map adapter
remain before candidate generation can replace live browser planning.

### Candidate rebound coefficient overrides (2026-09-11)

Implemented `originalCandidateBounce` from 0x422110–0x4221c9. Normal mode 0
raises a sub-2 bounce coefficient to 2 at a terrain boundary, then overrides it
to 4 when metadata bit 0x20 and the source centre test hold. The source tests
subX >= 5 && subX < 11 && subZ >= 5, with no subZ upper-bound check. Other
modes retain the original terrain coefficient. Rebound arithmetic matches the
existing originalBounce helper, so the wrapper reuses it with the resolved
coefficient and no further boundary override. Contact requires height <= 0 and
negative vertical speed; it resets height and retains rebounds >= 128 only.

`verify-original-candidate-bounce.py` executes the original coefficient/contact
branch and clamp callee on 5,000 downward-contact cases. Every rebound matches.
Eleven candidate bounce/ground/flight tests pass. Subsequent actor collision flags,
random rebound changes, slope response and final stop/restore lifecycle remain
outside this wrapper and are required for the complete candidate simulator.

### Candidate post-bounce flags, slopes and randomness (2026-09-11)

Reconstructed 0x4221d7–0x4223e4 as `originalCandidateImpact`. Pending bit 0x100
reverses heading, clears itself and randomizes speed; professional golfers scale
that variation by unsigned luck byte +0x101 plus five. Bit 0x80 halves speed,
clears itself and sets 0x100 for the next contact. Imagination adjusts heading
from a cross slope and adjusts horizontal/vertical speed from two clamped forward
samples. Terrain 17 stops motion except at boundaries or its normal-mode marked
centre exception. Terrain 12 at speed > 256 away from boundaries applies a
seeded angular deflection.

The helper uses the existing original RNG and returns its updated state/draw
count explicitly. Zero-bound randomization still advances the LCG. Its currently
validated entering speed domain is 0–32767; broader signed/16-bit-bound cases
must be handled if reached by the complete simulator. Slope inputs are original
helper outputs, not browser gradients.

`verify-original-candidate-impact.py` executes the complete original block,
original clamp, RNG and float conversion instructions with supplied slope-helper
results. All 5,000 speed/heading/vertical/flag outputs and RNG states match.
Nine impact/bounce tests pass. Airborne obstacle detection, launch selection,
map/slope adapters and the full save/simulate/restore lifecycle remain before
integrating complete original candidate simulation.

### Candidate airborne collision response (2026-09-11)

Reconstructed 0x421e53–0x421f43 as `originalCandidateAirCollision`, taking the
result of original obstacle-height test 0x406e80 explicitly. Mode 2 or no obstacle
bypasses collision RNG. Otherwise distance from the old tile centre is compared
with a draw below 768; professional luck ability 0x200 enlarges that distance
by trunc(luck * distance / 4). A hit consumes a direction draw below 128,
turns by (64 + draw) << 24, subtracts a speed draw, and sets actor flag bit 2.

Original RNG masks bounds to 16 bits, including the speed bound. The helper
preserves zero/wrapped-bound draw consumption and returns RNG state. The
verification script executes the original branch, distance helper, RNG and float
conversion without stubbing their arithmetic; obstruction is supplied at entry.
All 5,000 motion/flag/RNG outputs match. Nine air-collision/impact tests pass.
Original obstacle-height detection, launch generation, map/slope adapters and
complete simulation lifecycle remain required before live planner replacement.

### Complete obstacle-height check and airborne composition (2026-09-11)

Reconstructed complete 0x406e80–0x40703f as `originalObstacleHeight`. Terrain
13–16 uses variant-specific lower/upper bands; upper heights consume one original
RNG draw. Terrain 21/22 uses low-five-bit metadata to select the fixed 0–200
band; ordinary terrain defaults to equal bounds. Both bounds are strict. The
signed selector at 0x5a1f30 is exposed as variant, without assuming a browser
landscape-name mapping. All 5,000 original x86 decisions and RNG states match
in the repeatable verifier (whole function and original RNG, no stubs).

Added `originalCandidateAirObstacle` to compose detection with collision response.
The detector is called before the original mode-2 collision bypass, so design
mode still consumes any obstacle-height RNG draw. This ordering is covered by
an integration regression. Eight height/collision tests pass. Launch generation,
terrain/variant adapters and the full candidate lifecycle remain open before
this original simulation replaces browser planning.

### Integrated candidate simulation step (2026-09-11)

Added originalCandidateStart/Step to compose the recovered movement, terrain-edge
checks, ground/air responses, bounce, impact and stopping in source order.
Launch angular offset is halved once; subsequent steps preserve explicit RNG
state and counters. Old-tile terrain/metadata drives response while new-position
subcells determine boundary proximity. Airborne ground-height correction,
pre-response facing, original slope sample order and post-response stop testing
are retained. Steps are pure with respect to the caller's launch/state/map.

`verify-original-candidate-step.py` executes the complete original 0x421b50
candidate loop with supplied launch fields and flat terrain-height/slope helpers.
Original movement, bounce, collision, RNG and terrain routines run unchanged.
All 100 trajectories over uniform terrain 2 or 13 match final position, iteration
count and RNG state; the original actor's saved bytes are restored after each
run. This proves the tested flat-map integration, not arbitrary terrain or launch
selection. Twenty-seven candidate-component/integration tests pass, including
serialized midflight resume and stopped-state behavior.

Remaining before live use: original launch selection, terrain-height/slope and
variant adapters, varied-terrain/boundary trajectory validation, wider intermediate
state domains, and full search orchestration. No live browser routing replacement
or deployment is part of this change.

### Mixed-terrain candidate validation and landing publication (2026-09-11)

Extended full-loop original x86 verification to 150 trajectories across a supplied
mixed map of terrain 2/10/12/13/17, marked cells, directional wall bits, skill and
professional variants, collision flags, three modes and four obstacle variants.
Height/slope helpers remain flat; launch remains supplied. All terminal positions,
step counts, RNG states and landing-publication decisions match.

This exposed a distinction hidden by the earlier uniform-map comparisons:
0x422401 writes landing globals only when speed < 64, height == 0 and vertical
speed == 0. The loop can also exit with speed exactly zero but remaining vertical
motion; that exit does NOT update landing globals. Candidate state now includes
`landing: null` until an actual publication, keeping termination separate from
settling. The original's stale global value must remain an explicit concern when
reconstructing the outer planner; it must not be replaced silently by the current
terminal position. This helper reports the publication event without inventing it.

Committed original-output fixtures for 20 ordinary cases plus the observed
no-publication case. Six mixed/uniform trajectory and serialized-resume checks
pass. Nonflat original height/slope adapters, launch generation and outer search
integration remain unfinished. This validation changes no deployed gameplay.


### Physics terrain height and slope (2026-09-11)

Recovered `0x42f110–0x42f265` height interpolation and `0x40bfe0`,
`0x40c090`, `0x40c140` directional slopes in `original-physics-terrain.js`.
Height uses corners 5/7/1/3 with baseline three, signed 32-bit multiplication
and overflow before two truncating divisions by 1024. Metadata bit 8 flattens;
bits 2/4 select vertex minimum/maximum (bit 2 wins). Slope instead switches
corner pairs strictly after the tile centre, clamps each component for odd
headings, and bypasses terrain 7/9, metadata bits 1–3 and global bit 0.
It must not be replaced with the derivative of bilinear height interpolation.

`verify-original-physics-terrain.py` matched 5,000 seeded height/slope pairs
against the supplied executable, including signed corner values and metadata
branches. Original arithmetic, extrema and clamp instructions execute; corner
and raw vertex reads are supplied callbacks. Forty original-output pairs are
retained as normal regression fixtures. This does not establish correctness
of a live browser map adapter.

An integration regression composes existing `originalCornerHeight` with these
samples and candidate stepping on rising, flat and falling vertex grids. The
trajectories differ and serialize/resume identically. This is an integration
and determinism check, not an original-executable oracle for nonflat complete
trajectories. Twelve terrain/candidate tests pass. Full nonflat trajectory
comparison, launch selection and outer planner integration remain unfinished;
these helpers are not yet connected to the live browser planner.


### Complete nonflat candidate comparison (2026-09-11)

Extended `verify-original-candidate-mixed.py --nonflat` to execute the original
height and directional slope routines inside the complete candidate loop. The
51×51 supplied vertex grid contains stepped rises and falls; original corner
and vertex reads are intercepted, while interpolation, slopes, flight, ground
response, impacts, obstacle detection and RNG execute in x86. All 150 seeded
mixed-surface trajectories match terminal coordinates, published landing (or
absence), step count and RNG. Actor restoration is checked as in the flat run.
The full nonflat set is saved in `original-candidate-nonflat.json`.

This exposed transient negative horizontal speed after slope impact. Candidate
air collision and impact validation incorrectly assumed nonnegative speed.
They now accept signed int32 speed; collision subtraction wraps int32, and
impact RNG bounds use the original low 16 bits (including zero-bound draw).
The trajectory regression explicitly requires encountering negative speed,
serializes/resumes that state, and compares the eventual original outcome.
This is evidence for the encountered trajectories, not exhaustive proof for
arbitrary int32 launch/impact inputs or extreme arithmetic overflow.

Validation: 150 nonflat and 150 flat trajectories match x86; existing 5,000-case
impact and 5,000-case airborne collision comparisons still match. All 22 focused
candidate/terrain tests pass. Original launch selection is still supplied,
metadata flattening combinations are covered by the separate sample oracle,
and live browser map adaptation and outer planner integration remain open.


### Launch club and nominal strength selection (2026-09-11)

Recovered `0x423f48–0x423ff8` into `original-shot-club.js`. Inputs are the
already approach/elevation-adjusted distance, previously calculated shot range,
current terrain code, explicit-target flag, original mode and actor flags.
Strength clamps to [0, range]. Club is trunc(60*(range-strength)/(3*range)),
clamped to [terrainCode != 0, 11]. Explicit target in mode 3 with club < 5
sets club 5 and strength trunc(13*range/18). Afterwards terrain 1 with strength
strictly below 50 and no actor flag 1 selects club 13.

The helper accepts positive ranges up to the recovered range cap 330; it does
not silently supply a range for invalid/zero input. It returns nominal strength,
not horizontal ball speed: conversion begins at 0x423ff8 and remains separate.
No club-name mapping is inferred from numeric indices here.

`verify-original-shot-club.py` executes the complete original block and clamp
helper without instruction stubs, using provided upstream inputs. All 5,000
seeded cases match both club and strength, including mode and terrain branches.
Sixty output pairs are retained as regression fixtures. Four tests also cover
clamp endpoints, special-mode threshold and the strict short-green boundary.
Full upstream terrain assessment/elevation adjustment, velocity conversion,
accuracy/random launch effects and outer planner integration remain unfinished.


### Shared launch-strength search and cache (2026-09-11)

Recovered complete `0x4218e0–0x4219d6` with airborne estimate
`0x4218a0–0x4218df` into `original-strength-search.js`. The airborne estimate
adds speed/8 and verticalSpeed/16 with truncation, subtracts 128 vertical speed,
reduces horizontal speed by speed>>4, and loops while accumulated height > 0.
This is a planning estimate, distinct from live or candidate ball integration.

The search starts from scaled distance trunc(distance*20/25), estimate
scaled*33-trunc(scaled²/48)+64, target trunc(distance*1024/25), and repeatedly
adjusts by halving steps until step <= 2. Nonzero mode uses the previously
recovered putt estimate; zero mode uses the airborne estimate.

The original ten-entry ring cache keys only distance and vertical speed.
Neither mode nor rolling coefficient is part of the key. Hits scan from index
zero, do not advance the replacement index, and may reuse another mode's result.
Initial zeroed entries mean the (0,0) key returns zero immediately. Explicit,
immutable, serializable cache state preserves these behaviors without hidden
module globals, suitable for deterministic sessions and later multiplayer.

`verify-original-strength-search.py` executes both original estimates and the
complete search/cache code with no helper stubs. All 1,000 sequential seeded
queries, including deliberate cross-mode repeated keys and rolling-coefficient
changes, match returned speed and every cache entry/replacement index. Sixty
sequential outputs are retained as fixtures. Eleven strength/club/putt tests pass.
Domain here is distance 0..330 and nonnegative bounded launch inputs; this is
not exhaustive proof for arbitrary signed overflow or nonconvergent terrain.
The old `originalPuttStrength` remains explicitly a cold-cache helper. Live
call sites have not been migrated; initial vertical-velocity construction,
accuracy variation and the remaining launch planner still need composition.


### Composed initial launch velocity (2026-09-11)

`original-launch-base.js` composes club selection with the next original block,
through `0x424083`. From nominal strength s, calculate a=trunc(s*20/25), then
estimate=a*33-trunc(a²/48)+64 and verticalSpeed=trunc(estimate/8)+512. Search
horizontal speed using distance=trunc(s*4/5), this vertical speed and mode zero,
preserving the explicit shared cache. Do not confuse the first nominal strength
with the searched horizontal speed or omit the second distance scaling.

`verify-original-launch-base.py` executes the entire original `0x423f48–0x424083`
block, including both range estimators, strength search and cache code without
stubs. All 1,000 sequential randomized upstream inputs match club, horizontal
speed, vertical speed and the full cache. Sixty sequential output records are
retained. Fourteen combined launch/strength/club/candidate tests pass; an
integration test feeds this base launch through candidate flight/bounce/roll.
That integration is not a full original planner oracle: heading and remaining
launch effects are supplied, and accuracy/random variation and special shots
are not composed yet. In particular club 13 still has nonzero vertical speed
at this original intermediate point; later putt code zeros it. No live planner
migration or deployment is made by this change.


### Initial launch variation budget and draw (2026-09-11)

Recovered `0x424083–0x424131` and the simple `0x42414a` sum in
`original-launch-variation.js`. Inputs explicitly represent original fields:
global bit from 0x5a3228; skill byte actor+0x21; difficulty 0x542bc8;
actor class byte +0x20; ability flag +0x1e bit 0x10/value +0xfc;
target-map flag 0x5682dc bit 0x80; signed attitude field +0x3e.
These are not yet mapped to browser UI properties.

Start budget 10 if global bit 1 else 20; skill 4 adds budget/(4-difficulty)
for difficulty 1..3 unless actor class masked by 0xe0 is 0x20. Ability adds
value*budget/8, target flag subtracts 10, attitude <2 halves the result.
Integer divisions truncate. Random bound is half that budget; variation is
bounded draw + bound + 4. Zero bound still advances the original RNG.
This returns the intermediate variation value, not a final heading deviation.
Later code consumes it alongside further planner effects.

`verify-original-launch-variation.py` executes original branch arithmetic and
RNG with provided actor/target fields; 5,000 bounds, variations and resulting
seeds match. Sixty output records retained; seven variation/base-launch tests
pass, including zero-bound consumption and branch exclusions. Full application
of variation, subsequent RNG/wind/shot-type effects and live composition remain.


### Initial angular drift (2026-09-11)

Recovered `0x424170–0x424283`, including random helper `0x405710`, in
`original-launch-drift.js`. Modes below 2 draw uniform 0..100 minus 50, then
reshape absolute magnitude: below 20 halve, below 40 subtract 10, otherwise
double and subtract 50. Restore sign, multiply by five, shift left 16. Mode 1
divides the result by three; modes 2/3 use zero without consuming RNG.
Negative actor+0x3e amplifies by min(3,-attitude), divided by eight on terrain 1
or three elsewhere. Accuracy reduction applies away from terrain 1 if actor
class masked by 0xe0 is not 0x20 and skill bit 2 or actor flag 1 is present.
Divide by (0x542bd0+2), then for 0x820344<2 subtract that quotient divided by
(0x820344+2). Actor flag 0x4000000 further removes one third unless class-exempt.
All divisions truncate toward zero; wrapped products match original operations.

`verify-original-launch-drift.py` executes original block, random helper, sign/
clamp and RNG code without stubs. 5,000 output offsets and seeds match; sixty
fixtures retained. Eleven drift/variation/base-launch tests pass, including
mode-based draw skipping, signed amplification saturation and class exemptions.
Setting labels remain raw original fields rather than invented browser mappings.
This precedes the club-specific overrides at 0x42429e and later launch effects;
it is not the final angular offset and is not wired into deployed planning yet.


### Non-putter club and shot-shape drift modifiers (2026-09-11)

Recovered `0x4243ad–0x424542` in `original-club-drift.js`. Actor class zero
bypasses this block. Active actor identity takes priority over the class-0x20
branch: active subtracts trunc((3-level)*offset/6), class-0x20 instead adds
trunc((3-level)*offset/3). Other actors initialize local modifier to attitude-3;
otherwise it retains -3. Products wrap signed int32 before division.

Clubs >3 scale offset by 6/(ironValue+4) and add ironValue to the local
modifier. Clubs <=3 do the same using driverValue only when actor shot counter
+0x2a is zero. Curve +1/-1 then scales by 6/(drawValue+3) or 6/(fadeValue+3)
and adds that value. Straight curve zero outside mode 3 scales by 6/7 and
adds three. Other curve values skip this final adjustment.
Raw fields: driver +0xfa, iron +0xfb, draw +0xfd, fade +0xfe; mode here is
0x58dd80, distinct from drift mode 0x5a870c. Browser mappings remain pending.

`verify-original-club-drift.py` executes the original complete block without
stubs: 5,000 offset/modifier pairs match, including full signed-int32 incoming
offsets and resulting overflow. Sixty original-output pairs retained. Eight
club/initial-drift tests pass. Putting has its own previously recovered branch;
this helper intentionally rejects club 13. The local modifier's later use,
long-shot miss adjustment and heading/shot-shape composition remain unfinished.


### Long-shot adjustment and initial heading application (2026-09-11)

Recovered non-putter `0x424542–0x424697`, including shared jumps through
0x42437b/0x42438c, in `original-launch-heading.js`. For distance >75 unless
0x59d208 bit 0x800000 is set, consume speed-bounded uint16 RNG. A draw above
(abs(offset)>>9)+512 sets actor flag 0x400000, adds four to the local modifier,
and clears curvature for the active actor or halves it otherwise. The caller
must perform the earlier flag clear at 0x424283. The helper preserves the
signed INT_MIN absolute-value quirk; zero RNG bound still consumes a draw.

The reference heading (EBX) receives curve ±0x15555554. Separately clamp drift
to ±0x38e38e3, add three times that to the actual actor heading, and remove half
of the clamped value from curvature. In mode zero, class masked by 0xe0 ==0x20
further scales curvature by (distance-100)/256 with int32 product, then adds
trunc((random(0x71c6)-0x38e38e3)/50). The unusual subtraction/bound constants
are transcribed and verified rather than normalized into a symmetric estimate.

`verify-original-launch-heading.py` executes original block, branching paths,
clamp and RNG without stubs. All 5,000 outputs match heading, reference heading,
curvature, local modifier, actor flags and seed. Cases mix full int32 and smaller
incoming offsets to exercise both overflow and misses; sixty fixtures retained.
Twelve heading/drift tests pass, explicitly covering misses, active actor,
strict distance threshold, RNG bypass and reference/actual heading distinction.
This excludes putters and still precedes further planning from 0x424697 onward.
No live migration or deployment; full launch composition remains incomplete.


### Combined non-putter launch core (2026-09-11)

`original-launch-core.js` now composes the recovered stages from
`0x423f48–0x424697`: club/base velocity, variation draw, second strength query,
initial drift, actor miss-flag clear, club modifiers and heading application.
The RNG seed flows in original order, and both strength queries share explicit
cache state. It returns the intermediate reference speed, variation and local
modifier needed by later original stages, as well as heading/curvature/flags.
Mode 0x58dd80 and driftMode 0x5a870c remain distinct inputs; worldFlags 0x59d208
is distinct from the variation global flag 0x5a3228.

The combined oracle caught a stack interpretation mistake during composition:
RNG callee removes its argument, so the second search reads full range from
+0x30, not the earlier assessment span. It queries trunc(range*4/5) with the
same initial vertical velocity. This extra query can change subsequent cache
replacement even when its result is not the current horizontal ball speed.

`verify-original-launch-core.py` runs the complete contiguous block, all RNG,
range estimates, search/cache, sign and clamp code without helper stubs. All
1,000 sequential non-putter cases match club, speed, vertical speed, reference
speed, variation, actual/reference headings, curvature, local modifier, flags,
seed and full cache. Sixty sequential records retained. All 23 focused launch
tests pass, including immutable state/resume, full-range second search and the
old miss-flag clear. Putters are explicitly rejected here; upstream assessment
and later stages from 0x424697 remain outside this composition. This is not yet
a complete shot planner and is not wired into the deployed browser game.


### Putting branch in shared launch core (2026-09-11)

Extended `original-launch-core.js` through the putter branch as well as the
non-putter path. Extracted `originalPuttingDeviation` from the existing
`originalPuttingAim`: the older convenience function still samples tolerance
then calls deviation, while the launch core reuses its already-sampled tolerance
and the seed after intervening initial drift. This avoids redrawing tolerance
or skipping a random draw whose result the putter later overwrites.

For club 13, world flag 0x200000 doubles the distance test. The original
curvature branch replaces initial drift, preserves actual heading, leaves the
local modifier -3, and updates reference heading for curve ±1. Initial vertical
velocity is still nonzero at this intermediate stop; final putt launch remains
later in the original planner. The extracted routine keeps existing public
putting behavior and draw-count reporting intact.

Extended the contiguous original launch-core oracle to 1,000 mixed-club
sequential cases, with every fourth input targeting the putter branch and both
double-distance flag states represented. All fields and full shared caches
match original x86. The normal fixture now includes this mixed sequence;
24 core/putting/putt-strength regressions pass, including both straight and
curving putts. No deployed behavior changes: later launch stages, upstream map
assessment and live composition remain before a complete original planner.


### Nearby-obstacle low-shot branch (2026-09-11)

Recovered gate `0x4246b2–0x4247ae` and response `0x4247ae–0x42487d` in
`original-low-shot.js`. Gate chooses index 1 for actor flag 1 with no explicit
target, otherwise upstream first-water index. Requires skill 4 or actor flag 2,
non-green terrain and index !=1. Explicit target requires mode 4. Otherwise
sample at radii 128 then 1024 along reference heading, using original fixed-point
projection; metadata kind 13 at either position triggers the branch. The gate
currently has disassembly-based tests, not a full original map/projection oracle.
Its callback must provide original metadata rather than visual tree intersections.

Response clamps vertical speed to trunc(speed/12) in [0,256], searches horizontal
speed for trunc(strength*3/4), then if index !=0 searches again using
trunc(index*50/3). Both cache mutations matter even when the first result is
overwritten. Original intermediate polynomial speed is also overwritten without
being read by search. Finally curve becomes zero and shot type word +0xb4 is 4.
Current supported index 0..19 keeps search distance within its verified 0..330
domain; broader original map/runtime domains remain to be established.

`verify-original-low-shot.py` runs original response plus full search/cache
routines without stubs. 1,000 sequential velocity/type/curve/full-cache outputs
match; sixty fixtures retained. Seven low-shot/search tests pass, including
short-circuit gate behavior, projection positions and two-query state. Full gate
oracle, following alternate shot branch and live planner composition remain.


### Alternate approach/backspin branch (2026-09-11)

Recovered full `0x424882–0x424988` in `original-approach-shot.js`. This branch
is considered only when the preceding low-shot branch did not select. Requires
skill bit 4, curve zero, terrain !=1, terrain shot class exactly zero, club >=4,
and nominal strength strictly >25. Automatic target must be terrain 1; explicit
target instead requires original mode 0x58dd80 ==3.

Selection sets actor flag 0x80, raises vertical speed by trunc((strength+50)*
verticalSpeed/400), reruns cached strength search for nominal strength, writes
shot type 3, scales angular offset by 6/(actor byte +0xff +3), and adds that
byte to the local modifier. Products retain signed int32 overflow. A bypass
preserves incoming motion/cache and returns shot type zero, matching the prior
original reset; it must not overwrite a low-shot selection.

`verify-original-approach-shot.py` executes the full original gate/response,
terrain lookup, and strength-search/cache helpers without stubs. All 1,000
sequential outputs and full caches match, including gate bypasses and signed
angular overflow; sixty fixtures retained. Twelve approach/low-shot/core tests
pass, with explicit eligibility boundaries and mode-three override coverage.
The target terrain code remains an explicit original-map input. Composition
with preceding low-shot gate and later 0x424988+ stages, plus live integration,
remain unfinished; no deployed behavior change is claimed.


### Terrain-dependent launch composition (2026-09-11)

`original-launch-terrain.js` extends shared launch core through `0x424988`.
It clears contact flags 0x180 as at 0x424697, evaluates the low-shot gate using
the core's reference heading, and only evaluates the approach branch if that
gate rejects. The selected branch updates speed, lift, curve, shot type and
shared cache; approach retains/updates modifier and backspin flags. Initial
heading and RNG remain those of the preceding core.

`verify-original-launch-terrain.py` now executes the contiguous original
`0x423f48–0x424988`, including original x87 projection-table initialization,
fixed-point projection, mixed nearby terrain metadata, both gates, all strength
queries and RNG. No helper stubs are used. All 1,000 complete output/cache
records match. This closes the earlier low-shot gate's missing executable
comparison for this sampled map/domain. Explicit mode-three approach and
mode-four low-shot cases are injected to guarantee both branches; sixty
sequential fixtures include normal/low/approach selections. Fifteen focused
regressions pass, including branch precedence and contact-flag clearing.

Original metadata/actor/target values remain provided upstream inputs, not a
live browser map adapter. This stops before the later planner effects at
0x424988 and does not prove a complete original shot or live gameplay parity.
Those later stages, upstream assessment and live integration remain open.


### Later draw/fade setup (2026-09-11)

Recovered `0x42536b–0x425582` in `original-shot-shape.js`. This is after a
conditional planning section from 0x424988; it must not be concatenated across
that section without honoring its sentinel/side effects. Clears actor flag 2.
For curve ±1 adds/subtracts 0x15555554 heading, offset back toward the centre
by 0x5555555 when backspin flag 0x80 is set. Active actor halves incoming
curvature only when it has the same sign as the selected curve.

Strength <250 adds trunc((speed<<4)/(330-strength)); strength 250..299 uses
400-strength denominator; strength >=300 uses referenceSpeed plus its shifted
increment/(400-strength). Curved shots get type ±1 and later curvature addition
∓0x239a955, with speed cap 999999. Other curves preserve selected shot type,
set curvature addition zero and cap speed at referenceSpeed. The curvature
addition is returned separately; original applies it later at 0x4256bf.

`verify-original-shot-shape.py` runs the full original block and clamp without
stubs. 5,000 results match heading, curvature, clamped speed, flags, type and
stored curvature addition. Sixty fixtures retained. Seven shape/terrain tests
pass, including exact 250/300 thresholds and active/backspin behavior. Supported
speed/reference domain is 0..100000, strength 0..330. Conditional middle-planner
section and later final lie/velocity effects still remain before live use.


### Final lie dispatch and normalization (2026-09-11)

Recovered `0x4256bf–0x425ab9` in `original-launch-finish.js`, including the
original 24-entry lie dispatch at 0x425af8 and nine branch targets at 0x425ad4.
It adds the stored curve offset, applies lie-specific random speed/curvature/
heading effects (preserving uint16 RNG bounds and zero-bound consumption),
zeros lift for club 13 in the green branch, and applies the final skill/flag,
mode, speed-floor and local-modifier corrections. Curvature clamps to
±0x15555555; actor flag 1 clears. The later original UI dirty-byte writes and
stack epilogue are excluded from this pure state function.

`verify-original-launch-finish.py` executes the original dispatch table and all
reachable response/normalization instructions plus RNG/clamp code without stubs.
5,000 seeded cases match final speed, vertical speed, heading, curvature, flags
and RNG state. They include signed curvature overflow, wrapped uint16 bounds,
all lie table entries plus fallback, and modes 0..3. One hundred fixtures are
retained. Thirteen final-launch/putt-strength/shape regressions pass.

Oracle precision note: explicitly sets x87 control word 0x37f on each call,
consistent with the full candidate/projection harness. Unicorn's default
precision produced a one-unit bounded-RNG discrepancy at a large bound; the
port was not changed to reproduce that harness artifact. Earlier small-bound
comparisons do not establish broad RNG precision behavior on their own.

Inputs remain the original state after the preceding accuracy/recovery stage;
that gap (0x425582–0x4256bf with side branches), conditional middle planning and
upstream assessment still need composition before complete/live planner parity.


### Accuracy/recovery stage before final dispatch (2026-09-11)

Recovered `0x425589–0x4256bf` plus side branch `0x42574c–0x4257a1` in
`original-launch-recovery.js`. Inputs are after the speed clamp in shot-shape
setup. Short strength <75 has level/actor-id/raw-target-argument exceptions:
level zero with matching id divides curvature by three; its alternate odd-id
case doubles curvature. Other non-green short shots alter heading according
to skill mask and level. Identity uses the actual original argument value;
it is not the active-actor comparison used elsewhere.

Nonzero actor class on positive terrain shot class draws class*10; recovery
byte +0x100 >= draw selects effective lie 2 and marks flag 0x400000. Mode zero
non-green shots then draw directional noise and scale curvature using the
effective lie's class. Actor flag 1 with shot counter >6 overrides to lie -1.
The original temporary EDI is restored from the stored lie after a pushed
argument; it matches final stored lie on all verified paths.

`verify-original-launch-recovery.py` executes all original branches/RNG/sign
instructions without stubs, with x87 control word explicitly 0x37f. 5,000
results match heading, curvature, flags, effective lie, speed and RNG. It also
checks dispatch register EDI equals stored lie. One hundred fixtures retained;
ten recovery/final-launch tests pass, including strict short-shot/late-counter
boundaries and skipped reads/draws. Preceding speed is the clamped base speed,
which this block otherwise preserves.

This closes the arithmetic gap immediately before final dispatch. Whole-tail
composition/oracle, the earlier conditional middle-planning section, upstream
assessment and live map integration still remain before full planner parity.


### Complete final launch tail composition (2026-09-11)

`original-launch-tail.js` now composes shot shape, accuracy/recovery and final
lie dispatch/normalization across `0x42536b–0x425ab9`. Clamped shape speed
becomes the baseline retained throughout later corrections; the recovery seed
feeds final variation, and the selected effective lie determines its metadata.
The stored curve addition is applied only in the final stage. Output includes
final ball state, effective lie, shot type and total draw count, with no hidden
session state or mutation of upstream inputs.

`verify-original-launch-tail.py` executes the entire original contiguous tail
and helper routines without stubs, x87 control word 0x37f. All 5,000 mixed input
cases match final speed/lift/heading/curvature, flags, seed, lie and shot type.
Incoming nominal speeds/reference speeds up to 100000 can increase during shape
setup, so final normalization now accepts speeds through the original curved
shot clamp 999999. The combined test exercises values above the former helper
limit. One hundred executable-output fixtures retained; 17 focused tests pass,
including serialized inputs, changed lies and multiple-draw sequences.

This is the complete final arithmetic tail, not the whole original planner.
The conditional middle section `0x424988–0x42536b`, upstream assessment and
live browser mapping remain uncomposed. Original UI dirty flags/epilogue are
outside the pure state implementation. No live deployment change in this step.


### Resolved-target launch composition (2026-09-11)

`original-selected-launch.js` joins terrain-dependent launch with the complete
final tail for the original third planner argument != -1. At 0x424992–0x4249a0
that argument bypasses the conditional middle section and jumps to 0x42536b.
The API requires this argument explicitly and rejects -1; it does not simulate
unresolved planning by silently skipping that branch. Recovered nominal strength,
prepared type/curve/cache and full-range reference speed feed the final tail;
mode 0x5a870c and raw second planner argument remain distinct where required.

`verify-original-selected-launch.py` executes original `0x423f48–0x425ab9`
with this actual branch condition, initialized projection routines/table and
original metadata/actor inputs. No helper stubs are used. All 1,000 sequential
cases match final ball speed/lift/heading/curvature, flags, seed, effective lie,
shot type, club and complete shared cache. Includes putters, normal, low,
approach, draw and fade cases. Sixty sequential fixtures retained; nine
selected/terrain/tail tests pass with immutable serialization and sentinel rejection.

This is full launch composition once the target and upstream terrain assessment
have been supplied. It does not yet choose targets or reconstruct the earlier
0x4235c0–0x423f48 assessment, does not cover third argument -1 middle planning,
and is not connected to live browser shot planning. Original UI dirty writes
are outside pure simulation. Next integration can connect this resolved launch
to candidate flight while preserving shared cache/RNG and actor state semantics.


### Resolved launch through candidate flight (2026-09-11)

`original-selected-candidate.js` bridges recovered selected launch to candidate
initialization, preserving final heading, speed, lift, curvature, actor flags
and seed; the candidate initializer performs the original once-only curvature
halving. Shared launch cache remains explicit alongside candidate state. Physical
actor inputs (professional/abilities/luck/skill mask) are supplied separately;
this does not infer a browser or original actor-class mapping.

`verify-original-selected-candidate.py` chains existing executable harnesses:
original selected launch runs first, then its final values/seed enter the
original candidate loop with mixed surfaces and flat height/slope. Both prior
harnesses rerun their own comparisons. The selected-launch cache is reset to
original zero state before the chained sequence. All sixty launch-to-terminal
cases match terminal x/z, publication/landing, steps, RNG, club/type and full
launch cache. Fixtures contain the mixed flight map and whole sequence. Nine
selected/candidate regressions pass, including serialized midflight resume.

Scope: these are chained original routines, not an unmodified complete game
process or full planner call. Flight harness still supplies launch fields to
the candidate loop; upstream assessment is explicit and the physical map can
differ from launch assessment map. A unified map/actor adapter, target selection,
-1 planner branch and live integration remain. No deployed behavior changes.


### Shared original shot map access (2026-09-11)

Added `original-shot-map.js` to expose one original terrain source to launch
and physics callbacks: terrainAt, kindAt, shotClassAt, heightAt and slopeAt.
Inputs are original 50×50 terrain/marker arrays, rebuilt directional/surface
height caches and edge masks, original raw-height reader, runtime metadata
reader and global flags. The adapter reuses originalCornerHeight with cache
fallback and originalPhysicsHeight/Slope. Outside tile access reports terrain
20; physics position validation remains in the original height helper.
Metadata flags, painted tile flags and derived wall flags are kept separate.

Startup metadata now exposes kind (signed byte +6) and shotClass (signed byte
+2), retaining the existing connectionSpread alias used for that same byte in
map propagation. Tests verify these fields directly against all 23 executable
records. Runtime metadata readers can still supply patched values.

Six map/metadata tests pass: exact metadata bytes, marker/metadata separation,
nonzero cached height/slope oracle samples, zero-cache raw-height fallback and
all 150 saved nonflat original candidate trajectories through the shared map
adapter. Cached-sample comparisons deliberately exclude zero cache values,
whose original semantics are fallback rather than the fixture's stubbed zero.
This is adapter integration evidence, not a newly executed whole-map rebuild
oracle or live course mapping. Callers must rebuild derived arrays for the same
map revision; the adapter does not guess invalidation or mutate course state.

Launch/candidate map callbacks can now share original storage. Converting live
browser courses/actor fields, target assessment, unresolved planner branch and
full shared-map launch-to-flight verification remain before deployed parity.


### Original shot actor record adapter (2026-09-11)

Added `original-shot-actor.js` decoding the 256-byte record copied from
0x577f08+actorId*256 at 0x421b9c. Disassembly offsets are relative to 0x577f00,
so reads subtract eight. Exposes launch skill/ability/attitude/club-skill fields,
position/ball/target data and physical properties. The physical professional
boolean means nonzero class byte here (0x421ea1/0x42220d), not a guessed UI
profession. Ability word retains bit 0x200 and luck reads +0x101.
Candidate skill mask is explicitly supplied from the original separate global
0x4c1e0c; it must not silently be replaced by actor byte +0x21.

Actor decoding also exposed signed counter handling at 0x4256a9–0x4256b0:
byte +0x2a is compared signed to six. Corrected recovery to reinterpret the raw
byte before the late-shot lie override. Extended its 5,000-case executable
oracle to all byte values; all outputs/seeds match. Twelve actor/recovery/tail
tests pass, including complete launch fixtures through decoded actor fields,
full-word abilities, differing masks, buffer subarrays and high counter bytes.

The adapter reads supplied original records; it does not create original actors
from browser guest profiles or claim all actor runtime fields are mapped. Live
profile conversion, target assessment, unresolved middle planning and coherent
full-course launch/motion integration remain before deployment.


### Pre-club elevation distance correction (2026-09-11)

Recovered `0x423ee1–0x423f48` in `original-elevation-distance.js`. If actor
skill bit 4 is unset, skip both height reads. Otherwise read raw target height,
then raw origin tile height via 0x40be60. Signed difference and multiplication
by 25 retain int32 wrap; divide by eight when the difference is positive and
ten otherwise, truncating toward zero, then add to prior adjusted distance.
These are raw tile/vertex heights, not bilinearly interpolated physics heights.
The correction precedes club selection's clamping to range.

`verify-original-elevation-distance.py` executes original correction instructions,
stubbing only the two raw-height reads with provided values. All 5,000 corrected
distances and exact read sequences match, including signed overflow and ordinary
height values. Sixty fixtures retained; eight elevation/club tests pass, including
asymmetric slopes, skipped reads and resulting club changes. Raw-height adapters
were separately recovered; complete upstream assessment and live composition
remain unverified. The helper is not connected to deployed shot planning yet.

### Target neighborhood assessment (2026-09-11)

Recovered 0x423dd7–0x423ee1 in `original-target-neighborhood.js`. After the
preceding ray scan, eight target neighbors add signed terrain-class contributions
(truncated class × (span + 1) / 2) to the accumulator and per-code totals.
Original 0x40bc50 rejects both coordinates outside 50 × 50 and terrain code 20;
these add 4 × (span + 1) without a terrain vote. Strict maximum selection starts
at -1, retains the first tied code and each code's last contributing direction,
and preserves previous dominant fields if every total stays below zero.
Accumulator / (span + 3) receives +4 for at least two obstacles, becomes zero
when the ball starts on terrain 1, and caps at 10 for distances <=40. The actor
stores the low byte; the helper deliberately exposes that byte without assigning
an unverified signed interpretation.

`verify-original-target-neighborhood.py` executes the actual block and original
bounds helper from the SHA-checked executable: 1,000 randomized cases matched,
including edges, unavailable cells, signed classes and negative-only totals.
Thirty fixtures and four focused tests pass, alongside four elevation tests.
Inputs retain the preceding ray scan's totals, directions, obstacle count and
accumulator. That scan, full target selection and live integration remain open;
this isolated block is not a completed or deployed original planner.

### Target ray and combined assessment (2026-09-11)

Recovered 0x423b66–0x423dd7 in `original-target-ray.js` and composed it with the
neighborhood block through 0x423ee1. The scan uses trunc(distance/25) samples,
starting 512 fixed units from the ball and advancing 1024 each iteration.
Heading quantization supplies the reverse direction for terrain votes. Center
samples contribute class × index × 2 to the accumulator and class × (index+1)
× 2 to per-terrain votes. The original unavailable-cell helper ends the scan
before height reads or random consumption. Kind 13 after the first sample adds
an obstacle; height exceeding reference height +1 adds two. The reference is
the origin through the midpoint and the target afterward. Tile mark 0x100
records the latest terrain code. Terrain 17 records the original zero-sentinel
water index, including its first-sample ambiguity.

Each accepted center sample consumes one original bounded RNG draw and samples
a side ray at heading ±0x0aaaaaaa (the actual negative constant is 0xf5555556).
That side contributes class × (index+1) only to the accumulator. Side terrain
reads are raw flattened-map reads without the center sample's bounds check;
callers must preserve this original map behavior. The helper returns the updated
seed explicitly and does not mutate input arrays. `originalTargetAssessment`
composes the ray with the neighborhood vote and rating-byte calculation.

`verify-original-target-ray.py` runs SHA-checked original instructions, including
original projections, initialized x87 sine table, RNG and bounds helper. Only
0x40be60 raw height reads are supplied by the fixture. 1,000 ray outputs and
1,000 continued neighborhood outputs matched, including RNG state, marked cells,
negative classes, short distances and early map-edge termination. Twenty saved
fixtures and twelve ray/neighborhood/elevation tests pass. A test caught JS
negative zero in the sample count; it is now normalized to the original int32.

This closes the previously missing assessment ray, not target selection or full
live integration. Upstream 0x4235c0–0x423b66 is still only partially recovered,
and automatic planner argument -1 still requires its middle branch. Raw map and
height adapters must be integrated coherently before replacing the live planner.

### Assessment through resolved launch (2026-09-11)

`original-assessed-launch.js` composes target ray/neighborhood, raw elevation
distance correction, club selection and all recovered resolved-target launch
stages. This covers contiguous original execution 0x423b66–0x425ab9 for planner
argument != -1. The assessment seed enters launch RNG; its water index enters
low-shot selection. Elevation correction applies before club/range clamping.
Origin lie, metadata class, tile marks and target terrain are read from the same
supplied map rather than trusting stale independently supplied launch fields.
The returned state includes the assessment, adjusted distance, final launch and
updated strength cache; inputs remain unchanged and serialize for replay.

`verify-original-assessed-launch.py` executes that full contiguous original range
for 1,000 mixed-terrain cases, with original RNG, x87 projection and strength
cache carried between cases. Raw height reads are the only substituted helper;
height values are fixture inputs. Compared every returned launch/assessment
field and cache entry. Twenty saved cases and eleven assessment/ray/selected-
launch tests pass. This establishes stage ordering across the previously isolated
helpers, not live-course integration or complete target search. The original
planner still supplies the initial target, heading, range and pre-assessment
distance. The -1 automatic branch is deliberately rejected before map access.
The map callback interface here supplies raw tile codes/classes/marks/heights;
it still needs coherent integration with the existing physics map adapter and
live course representation, including the original side-ray boundary behavior.

### Shared planning/physics map (2026-09-11)

`originalShotMap` now exposes `planning`, the callback interface consumed by
`originalAssessedLaunch`. Planning and physics share terrain, tile marks,
metadata and the raw height provider. Planning uses raw height values; physics
retains original corner caching/interpolation and height scaling. This removes
the need to construct an independent assessment map with potentially different
terrain or flags.

The planner's unchecked side-ray terrain read uses the original flattened
signed int32 index (x × 50 + z). Coordinates outside the rectangle can alias a
valid array entry; this is preserved. An index outside the 2,500-byte terrain
array requires an explicit `readRawTerrain(index)` provider. Missing backing
memory throws rather than inventing a rough/unavailable cell. Normal physics
queries still use their checked rectangle semantics. Caller-owned derived data
must still be rebuilt with course edits; this adapter does not enforce revisions.

Eleven targeted tests pass, including all twenty sequential assessed-launch
fixtures through the shared adapter and the existing 150 original nonflat
candidate trajectories. Additional tests cover raw versus interpolated heights,
shared marks, aliasing and explicit external terrain reads. These establish both
interfaces against their existing oracle fixtures; they do not yet prove one
contiguous original assessment-to-rest trajectory or live-course conversion.

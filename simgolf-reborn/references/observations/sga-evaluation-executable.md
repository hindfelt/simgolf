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

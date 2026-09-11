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

### Original target geometry and exact-point launch (2026-09-11)

Recovered 0x42365d–0x423770 in `original-target-geometry.js`. With no explicit
shot request, target tiles come from the current hole cup. An explicit request
retains the actor target and sets curve to mode when mode <=1, otherwise zero.
The third planner argument is an exact fixed-point x coordinate, NOT an actor
or target identifier; its companion is fixed-point z. Value -1 retains the
selected tile center. Exact coordinates override the selected tile and publish
the containing tile back to the actor. Distance scales each signed component by
25 before arithmetic shift 10, then truncates sqrt of their squared sum. Heading
uses recovered 0x466ba0. Actor flag 0x10000000 is cleared before assessment.

`verify-original-target-geometry.py` executes original target setup, heading and
x87 conversion directly; all 5,000 map-domain cases match. Sixty saved fixtures
cover exact versus tile targets, cup versus explicit selection and curve modes.

`original-resolved-shot.js` composes this setup with assessed launch for exact
coordinates. `verify-original-resolved-shot.py` runs contiguous original code
0x42365d–0x425ab9, following its actual exact-coordinate branches, with shared
strength cache and original RNG. Only raw height reads are substituted. All
1,000 cases match final state, assessment, corrected distance and cache; twenty
fixtures plus geometry/assessment tests pass (ten tests total). Inputs remain
immutable. Initial range lookup and pre-target global side effects remain
caller-owned. The automatic -1 path still requires its target-search and middle
planning branches and is rejected by this composed entry point. No live deploy.

### Planner entry, range and explicit state patches (2026-09-11)

`original-planner-setup.js` recovers entry 0x4235c0–0x42365d, composing the
previously recovered 0x4219e0 range calculation. The range lookup uses effective
lie metadata (special actors >=152 use terrain 0 on shot zero, otherwise 2),
while the planner's later origin terrain remains the actual map terrain.
After range returns, actor flag 1 writes 32 to metadata shot-class bytes for
terrain 17 (0x5770f2) and terrain 20 (0x577182). These are global metadata changes,
not actor fields. The helper returns explicit patches without mutating the map.
They must be applied after range and before subsequent assessment/launch reads.

The entry also resets global 0x4c1fbc to -1, then sets count-1 only if world flag
0x20 is enabled and signed global count 0x53ce64 is positive. Origin tile/index
and actual terrain are returned. Range inputs are nested because range difficulty
comes from 0x820344 and range level from actor +0xc2, unlike similarly named
values used later by launch calculations.

`verify-original-planner-setup.py` executes the actual entry and range routine,
substituting only the range surface lookup. All 5,000 generated cases match,
including original metadata writes, range, origin locals and global index.
Forty fixtures and twelve setup/range/target tests pass. This recovers entry
semantics but still requires composition/persistence of the explicit patches
in the full planner. Automatic target-search branches and live integration remain
open. No deployment or complete original-planner claim follows from this helper.

### Composed exact-point planner entry through launch (2026-09-11)

`original-exact-planner.js` runs entry setup before exact targeting, assessment
and launch. It overlays the returned terrain-class patches for this shot only,
leaving the backing map untouched and returning setup state for persistence by
the owning simulation. Range therefore reads the pre-patch metadata, whereas
assessment, recovery and final lie normalization read the patched values.
Input range estimates are replaced by the original range calculation.

`verify-original-exact-planner.py` starts at the actual function prologue
0x4235c0 and follows exact-coordinate execution through 0x425ab9. It runs the
original range code, heading/projection, RNG and strength cache. Only raw surface
and raw height accessors are supplied. All 1,000 actor-zero cases match final
launch, full assessment, corrected distance, entry setup/patches and cache;
cache persists between cases while map/metadata fixture inputs reset per case.
Special-actor range behavior remains covered separately by the entry oracle.
Twenty saved fixtures and thirteen planner/setup/target tests pass. A two-shot
persistence test verifies that committing class patches after shot one affects
shot two's range (140 becomes 88 for the controlled terrain-17 case).

This closes composition of entry side effects for the exact-coordinate path.
The owning simulation must still persist returned patches and the obstacle index.
The automatic -1 path remains unsupported, as do full live-course/actor mapping
and a unified original planning-to-ball-rest oracle. No live deployment yet.

### Automatic target search request (2026-09-11)

`original-auto-target-request.js` recovers 0x42376c–0x42381a. Explicit requests
or exact-coordinate arguments bypass automatic targeting. Otherwise distance
<=75 takes the approach branch, reduced to <=25 by actor flag 1 or skill bit 4.
Terrain 1 also takes approach. Longer shots start a route search: clamp range-25
to [0,distance], shift by 10 and add 512, divide by 25 with signed truncation,
then use the original heading projection to select a waypoint tile. The helper
returns branch classification and this initial waypoint, not a search result.

`verify-original-auto-target-request.py` executes original branch/clamp/projection
instructions and initializes the original x87 sine table; no helper stubs.
5,000 cases match branch, clamp output, radius and projected tile. Sixty fixtures
and nine automatic-request/exact-target tests pass. The next original operations
measure the route segment and cup distance, then call 0x422450. That search and
its postprocessing, plus the later automatic launch middle branch, remain open.
No live integration or complete automatic targeting claim yet.

### Route-search result aim and score (2026-09-11)

`original-auto-target-result.js` recovers 0x423863–0x4239cf. The search-result
flag at 0x5a8730 selects a tile-corner aim point and sets actor bit 0x10000000;
otherwise the planner adds 512 to both components and clears that bit. Skill
bit 4 enables a signed score-map adjustment: start at the center score and take
the minimum of each cardinal neighbor minus trunc((opposite-center)/4). The
original direction table is stepped by eight bytes, so only four directions
participate. Without the skill the previous score is retained without grid reads.

Afterward each vector component is multiplied by 25 and arithmetic-shifted by
10. BOTH heading and distance use this reduced vector, unlike initial target
setup where heading uses the full fixed-point difference. This truncation can
change aim and is retained. Target selection and the score grid themselves are
inputs from the still-incomplete route-search implementation.

`verify-original-auto-target-result.py` executes the actual block and original
heading/x87 conversion, without helper stubs. All 5,000 map-domain cases match
vectors, flags, adjusted score, heading and distance. Thirty fixtures and eight
request/result tests pass, including read order and heading truncation. The
following observer side effect at 0x4239cf onward, route search, automatic launch
middle branch and live integration remain unfinished. Nothing deployed.

### Route-search mode, curve options and two-shot reach (2026-09-11)

Recovered 0x42252c–0x422688 in `original-route-search-setup.js`. Mode zero
becomes one unless actor flag 1 is set or a nonzero actor class has a positive
terrain shot class. Nonpositive terrain class plus skill bit 4 enables two
curve choices; professional ability bits 0x20/0x40 independently gate them.
The search targets the cup center and computes heading/distance from the reduced
yard vector. It then increments the shot-counter byte (wrapping 255 to zero),
queries next-shot range with the new target/heading/mode, and restores the counter.
A flag records whether cup distance exceeds current plus next-shot range.

`verify-original-route-search-setup.py` executes the original setup, heading and
x87 distance calculation. The next-range helper is supplied and its call-time
actor counter, target, heading and mode are independently captured. All 5,000
cases match outputs and query state. Sixty fixtures and eight search/result tests
pass, including counter wrap and exact two-shot reach boundary. The initial
search globals, range-query integration, candidate loops and live integration
remain open; this is not a complete route search or deployed feature.

### Route candidate preparation and admission composition (2026-09-11)

`original-route-trial.js` recovers 0x4227db–0x422921, stopping at the existing
admission stage. A 21×21 search-grid entry uses its second score as the whole-
candidate sentinel: >99999 skips it; zero marks a fresh candidate and initializes
all six scores to 100000; other values reuse previous scores without admission.
Candidate coordinates add grid offsets to the search anchor. Distance and heading
use the yard-scaled tile-center vector, with the original truncation order.
`originalPreparedRouteCandidate` feeds this geometry to the previously recovered
admission helper only for fresh entries; reused/excluded entries avoid map reads.

`verify-original-route-trial.py` runs original instructions, heading and x87
conversion without helper stubs. It reads every initialized score directly after
the final sentinel write. All 5,000 cases match sentinel branch, geometry and
score arrays. Sixty fixtures and nine trial/admission tests pass. Composition
has focused integration tests; this is not a contiguous oracle for the entire
candidate-search loop. Six-way shot simulation, repeated search passes, winner
selection and live integration remain unfinished.

### Route shot-option gate and admission reset correction (2026-09-11)

Recovered 0x422b65–0x422bb5 in `original-route-option.js`. Existing scores
>=99999 skip without mutation. Curve -1 requires mask bit 1, curve +1 requires
bit 2, and either curve requires distance >75. Disallowed options become 100000;
straight shots need neither curve bit nor the distance threshold.

Corrected `originalPreparedRouteCandidate`: successful fresh admission must clear
all six initialized 100000 scores to zero (0x422abc–0x422af2), otherwise the next
stage skips every shot. Rejected candidates retain their exclusion values.
`verify-original-route-option.py` executes the original reset block and asserts
all six writes, then compares 5,000 original option gates/writes without stubs.
Sixty fixtures and seven option/trial tests pass. The earlier trial oracle covered
pre-admission initialization only; this correction closes its composition gap.
Repeated simulations, option scoring, winner selection and live integration
remain unfinished. These changes are not deployed.

### Route option accumulation and strict winner updates (2026-09-11)

`original-route-best.js` recovers 0x4230a7–0x42313e. A completed batch adds its
sample score to the existing option score with signed int32 overflow. When its
bad-sample counter reaches trunc((level+4)*samples/8), global search flag
0x5a872c is cleared; this block never re-enables it. A strictly lower accumulated
score replaces the winner, copying target tile, curve, center/corner mode,
latest landing coordinates and the option sample flag's low bit. Ties retain
all previous winner fields. The helper returns independent state for replay.

`verify-original-route-best.py` executes the original block without stubs and
compares 5,000 option/winner states, including ties and signed overflow. Sixty
fixtures and seven winner/option tests pass. Inputs are completed batch scores
and counters; their production by repeated shot simulation remains unfinished.
Observer-only rendering after 0x42313e is excluded. Full pass orchestration,
search completion and live integration remain open; no deployment.

### Route completion, fallback and diagnostic state (2026-09-11)

`original-route-finish.js` recovers diagnostics at 0x423496–0x4234db and final
publication at 0x423516–0x4235b7. Only the four-sample pass resets diagnostic
state: distance spread >75 sets 1, otherwise signed heading spread >0x15555555
sets 2, otherwise zero. Other passes preserve the prior diagnostic.

A winner whose target x is not -1 publishes its target and curve, retaining
center/corner mode; its landing flag adds diagnostic bit 4. Missing winners
fall back to the cup, return curve zero and clear corner mode. Both paths clear
world bit 0x800000, preserve search mode only when it equals 2, and set global
candidate skill mask to 7. Returned values represent explicit state changes,
not implicit mutation of the caller's world.

`verify-original-route-finish.py` executes both original blocks without stubs;
5,000 diagnostic and publication states match, including signed spread overflow,
fallbacks and mode reset. Sixty fixtures and eight finish/winner tests pass.
Observer UI calls between these blocks are excluded. Full candidate simulation,
pass orchestration and live state integration remain incomplete. No deployment.

### Trial dispatch and good-landing counter correction (2026-09-11)

`original-route-sample.js` recovers 0x422bcf–0x422c34. Each trial calls candidate
simulation with actor id, exact fixed-point target x/z and curve. Center trials
add 512 to the tile origin and increment work once; corner trials use the tile
vertex and leave that work counter unchanged. The simulator result is passed
back untouched so its state/RNG can feed subsequent scoring.

`verify-original-route-sample.py` executes both original dispatch branches with
candidate simulation supplied, capturing actual arguments and work. All 5,000
cases match; sixty fixtures and six dispatch/winner tests pass. This does not
claim the candidate simulator itself is now fully integrated.

Correction to earlier winner-update notes: stack local +0x28 counts GOOD
landings (0x422d73–0x422d83 increments it when terrain shot class <=0), not bad
or unsuccessful samples. Renamed `badSamples` to `goodLandings` in the original
winner helper, oracle and fixtures. The threshold arithmetic is unchanged;
all 5,000 winner comparisons still pass. Future loop composition must pass the
landing scorer's goodLandings counter. Full simulation/scoring orchestration and
live integration remain unfinished, with no deployment.

### Contiguous landing review and progress flag (2026-09-11)

`original-route-landing-review.js` completes the earlier landing score helper
with 0x422d87–0x422e5a target-distance bookkeeping. The intended target uses a
center or corner fixed-point position according to trial mode. Its distance to
the cup is stored separately from the actual landing's remaining distance.
The heading's low bit is cleared, then set if intended remaining distance exceeds
actual remaining distance by >25 AND exceeds twice actual remaining distance.
This marks unexpectedly strong progress toward the cup; it is not a penalty for
falling short. Scoring recomputes actual remaining distance afterward, so the
comparison's temporary doubled register does not double the distance score.

`verify-original-route-landing-review.py` executes the entire original block
0x422c34–0x422ea4 without the old bookkeeping skip hook or helper stubs. All
1,000 cases match score, good-landings counter, lie, actual/intended remaining
distances and the published sample flags. Forty fixtures and seven landing tests
pass, including strict comparison boundaries and center/corner differences.
Follow-up assessment, sample loop orchestration and live integration remain open;
this does not establish a complete planner or deployed change.

### Landing review through follow-up scoring (2026-09-11)

`original-route-scored-landing.js` composes landing review with the existing
follow-up orchestration. Effective lie, actual remaining distance and cumulative
score feed follow-up selection; raw landing terrain class feeds its separate
eligibility check. Good-landings count, intended distance and trial flags remain
available alongside final score and updated follow-up flag.

`verify-original-route-scored-landing.py` runs contiguous original instructions
0x422c34–0x423098. The original map/distance helpers execute directly; only
0x421450 assessment costs are supplied. Every assessor call's landing, cup,
range, shape and flag is captured independently. All 1,000 score/state outputs
and ordered call lists match. Forty fixtures and six combined-review tests pass.
This validates orchestration and metadata propagation, not complete follow-up
simulation or a full route-search loop. Those and live integration remain open.

### Complete eligible-option trial batch (2026-09-11)

`original-route-batch.js` composes dispatch, landing review, follow-up scoring and
winner updates for one eligible option, 0x422bb5–0x42313e. Each batch starts its
sample score and good-landings count at zero, carries follow-up state between
trials, preserves center-only work increments, and adds the completed batch to
the option's prior score. Winning metadata uses the final trial landing/flags,
as the original block does. Simulation and assessment callbacks execute in order
so their owning RNG/cache state can be propagated deterministically.

`verify-original-route-batch.py` runs this contiguous original loop for 1,000
batches of two/four/eight trials. Candidate simulation supplies varying landings;
follow-up assessment supplies costs. Every simulation/assessment call is captured
in order, and all output scores, winner fields, work, counters, flags and intended
remaining distances match. Forty fixtures and ten batch/scoring/winner tests
pass. This verifies loop orchestration with supplied physics outputs, not a full
original candidate simulation or multi-pass route search. Those, state ownership
and live integration remain unfinished. No deployment.

### Full six-option candidate loop (2026-09-11)

`original-route-options.js` composes one admitted candidate's six shot options,
0x422af8–0x42323d. Evaluation order is center draw/straight/fade, then corner
draw/straight/fade. Positive origin terrain class skips the entire corner group
without overwriting its scores or statistics. Option gates preserve existing
exclusions, and each eligible batch updates score, planned-distance/flag slots,
work, best candidate, search flag and persistent follow-up flag in sequence.
The batch helper now also returns its final sample flags for that option table.

`verify-original-route-options.py` executes the contiguous original loop for
1,000 candidates. Simulation landing positions and follow-up assessment costs
are supplied; both call types are independently captured in order. All six
scores/distances/flag slots and shared state match, including skipped options.
Forty fixtures and six option-loop/batch tests pass. The 1,000-case batch oracle
also passes after exposing its flag output. Full physical candidate simulation,
441-tile passes, pruning/statistics integration and live integration remain open.
No deployment or complete-search claim.

### Full 441-tile search pass (2026-09-11)

`original-route-pass.js` composes trial preparation, admission and all six options
for one full grid, preserving x-outer/z-inner order from -10 through +10. Score,
distance and flag tables are copied; winner, work, search flag and follow-up
state propagate across candidates. Excluded entries skip all further work;
fresh rejected entries retain sentinels and accepted entries enter trial loops.

`verify-original-route-pass.py` executes contiguous original code
0x4227b1–0x423261 for 100 full passes. Candidate physics landings and follow-up
costs remain supplied; their ordered calls and every table/shared-state field
are compared. Cases include a fully untested grid, sparse cached/fresh entries,
uniform terrain and mixed classes/excluded terrain with hole markers. All pass.
Three saved whole-grid fixtures and ten pass/options/trial tests pass; the pass
suite was rerun after adding the dense fixture. Repeated-pass pruning and
statistics, real candidate physics, owning-state persistence and live integration
remain unfinished. This is not yet a deployed complete route planner.

### Survivor spread and pruning integration (2026-09-11)

`original-route-spread.js` recovers 0x42338e–0x423402. For each surviving option,
zero stored distance skips the entire update. Otherwise distance min/max update;
heading min/max update only when the candidate tile center is >100 original yards
from the golfer. Relative heading subtracts cup heading from stored sample flags
with signed int32 wrap, retaining the low flag bit as the original does.

`originalRoutePrunedState` augments existing pruning with final-survivor spread
on the four-sample pass. Each original margin retry resets the extrema, so the
final surviving set determines the returned statistics. Initial extrema retain
the original unusual sentinels (65535/-1000 and 0x0fffffff/-536870912). Cup
heading uses the full fixed-point vector. Other sample counts leave sentinels.

`verify-original-route-spread.py` executes the spread block and original distance
helpers without stubs; all 5,000 cases match. Sixty fixtures and thirteen spread/
pruning/finish tests pass. Pruning composition has targeted integration tests,
not yet a contiguous full retry-loop oracle. Repeated-pass orchestration, physical
candidate integration and live deployment remain unfinished.

### Repeated search passes and contiguous pruning verification (2026-09-11)

`original-route-search-passes.js` composes 0x422799–0x4234eb. Each pass resets
all 441×6 stored distances and the winner score to 99999, while preserving the
other winner fields, cumulative work, scores and shared flags. Eight samples or
mode 2 exits immediately after evaluation. Other passes prune, publish spread
diagnostics when the completed sample count is four, and double the sample count.
A further pass runs only with more than one survivor. Diagnostics retain their
previous value on other sample counts. The returned pass sequence supports
inspection and deterministic replay without browser state.

`verify-original-route-search-passes.py` executes that entire contiguous range
against the original executable. It supplies simulated landings at 0x421b50 and
follow-up assessment costs at 0x421450, records their ordered calls, and stubs
only the UI yield at 0x483330 otherwise. All 30 cases match complete score,
distance and flag grids, work, winner, diagnostics and callback ordering. Saved
fixtures cover distinct pass sequences and mode-2 exits, including 2→4→8.

`verify-original-route-pruned-state.py` separately executes the complete
0x423279–0x423496 retry loop with real heading/distance helpers and the same
UI-yield stub. All 200 cases match pruning retries, final survivors and spread.
This closes the contiguous retry-loop evidence gap described above. Fifteen
search/pass/spread/finish regression tests pass, including input immutability
and serialized replay. These comparisons still supply physics outcomes and
assessment costs; they do not prove complete original planning or live fidelity.
Search entry/final publication, real physical callbacks and live integration
remain unfinished. No deployment was made for this isolated logic.

### Search anchor and complete preparation (2026-09-11)

`original-route-search-anchor.js` recovers 0x422688–0x422799: project the
range-minus-25 distance clamped to [0, cup distance] using the original integer
sine table; convert to a tile anchor; initialize two samples and zero work.
The distance divisor is 2 below 100, 6 above 200, and 4 otherwise. Crucially,
0x422760 passes the origin tile indices to the fixed-point distance helper,
not the actor's full fixed-point position. This apparent original quirk is
preserved, rather than replaced with a conventional golfer-to-cup distance.
The earlier two distance calls in this block have no retained result.

`originalPreparedRouteSearch` composes existing search setup with this block,
preserving the range-query callback and original shot counter. The anchor oracle
executes the complete block and real clamp, projection and distance routines;
all 5,000 cases match. The prepared-search oracle executes 0x42252c–0x422799
contiguously, supplying only the next-range result at 0x4219e0 and checking its
call state. All 5,000 cases match, including mode, curve mask, heading, reach,
anchor and initial pass parameters. Each verifier has its own fixture file.
Eleven setup/anchor/repeated-pass tests pass. A fixture filename collision in
the new verifier was corrected before rerunning and saving both fixture sets.

The actual initial range query and entry flags/table initialization before
0x42252c, final search publication, physical candidate callbacks and live wiring
remain unfinished; this isolated preparation is not a deployed gameplay change.

### Combined route search body (2026-09-11)

`original-route-search.js` connects prepared search, repeated passes and final
publication. Preparation supplies the anchor, curve mask, cup distance, mode,
two-shot reach, sample count, work reset and distance divisor to evaluation.
Publication uses the final winner's corner flag and pre-publication diagnostics.
The interface returns both search tables/state and the published target/result,
without mutating the supplied snapshot. Range, physical candidate outcomes and
follow-up assessment remain explicit callbacks.

`verify-original-route-search.py` executes 0x42252c through 0x423582,
including original result publication and fallback. It captures search state
before publication separately so a fallback's corner reset cannot overwrite the
recorded pre-publication winner. The observer actor ID is -1, so observer UI
branches are skipped; the UI yield is a return stub. Range, candidate and
assessment routines receive supplied results, and their ordered calls are
compared. Thirty cases match complete grids, winner, shared flags, diagnostic
state and published result. They include an excluded grid with no valid winner,
which publishes the cup and clears curve/corner selection. Fourteen targeted
tests pass, covering immutability and serialized replay too.

This starts after the original entry initialization and initial range query;
those responsibilities, actual physics and follow-up assessment callbacks,
automatic planner integration and live use remain unfinished. Nothing in this
change is evidence of deployed full shot-planner fidelity.

### Route entry and first range-query context (2026-09-11)

`original-route-entry.js` recovers 0x42245e–0x42252c after native stack
allocation. It clears all 441×6 candidate scores, enables world flag 0x800000,
copies the actor skill byte to the candidate skill mask, sets globals 0x59a188
and 0x5a872c to one, clears corner selection, initializes winner X to -1 and
curve to zero. The initial range callback sees that context before subsequent
mode/target normalization. The entry then records the previous target and
origin tile, and looks up the raw terrain code. Fields the original leaves
uninitialized are deliberately not claimed as initialized here.

`verify-original-route-entry.py` runs this contiguous original entry with only
the initial range return supplied, using a nonzero-filled stack to verify that
the score table is actually cleared. All 500 cases match entry state and query
context across actor IDs 0–255 and skill bytes 0–255. Eight retained fixtures
and six entry/combined-search tests pass; tests also check callback/terrain-read
order, input immutability and independently allocated score rows.

The helper exposes the initial range callback explicitly. It is not yet
composed into the full search body or connected to real range/physical candidate
callbacks. Original allocation mechanics and incidental register/stack state are
not browser behavior. Live shot-planning integration remains unfinished and
this change has not been deployed.

### Entry-to-publication composition (2026-09-11)

`originalEnteredRouteSearch` connects recovered entry state to the complete
search body. It replaces incoming score grids with fresh zeroed candidates,
sets search flags and initial winner X/curve/corner fields, and derives origin
shot class from terrain for both setup and candidate options. Winner fields
not initialized by entry remain supplied state until replaced by a successful
candidate; they are not claimed as meaningful results when no candidate exists.
Initial and next-shot range callbacks remain distinct because they observe
different original state: search flags/old aim versus temporary shot count/cup
heading and normalized mode.

`verify-original-entered-route-search.py` runs 0x42245e through 0x423582
contiguously, including both range queries. Thirty runs match all retained
search tables/state, published result and ordered initial-range, next-range,
candidate and assessment calls. Fresh grids exercise more work than the prior
seeded-grid oracle; the emulator instruction ceiling was raised from five to
fifty million to allow original execution to finish, with the stop address
still asserted. Fully excluded terrain also matches the cup fallback.
Nine entry/search regression tests pass, including input immutability and replay.

These runs still supply range returns, candidate landings and follow-up costs.
Observer UI is disabled and the UI yield is stubbed as documented for the search
body. Actual range/physical/assessment composition, complete automatic shot
planning and live use remain open. No deployment is included.

### Real range arithmetic in route search (2026-09-11)

`originalRangedRouteSearch` replaces both supplied range results with
`originalShotRange`. It derives surface from the origin tile, resolves effective
lie metadata (including special-actor surface override), and uses the actor
skill mask, professional status and ability flags alongside explicit range
attributes. The next calculation uses the temporary counter from preparation;
subsequent search follow-up logic receives the original counter. Range-specific
level/difficulty inputs remain explicit because the original planner uses
several differently located level/difficulty values.

`verify-original-ranged-route-search.py` executes the original entry-to-result
search with real 0x4219e0 range arithmetic, supplying only its terrain lookup
at 0x40bc90. Candidate outcomes and assessment costs remain supplied. Thirty
whole searches with actor 0 match full tables, final result and ordered candidate/
assessment calls; the first retained fixture starts at shot 255 and exercises
next-shot wrap to zero. Broader actor IDs remain covered by the independent
range oracle rather than this whole-search oracle.

The range validator previously rejected counters above 127 despite the original
unsigned byte usage. It now accepts 0–255. The 5,000-case range oracle was
expanded to that whole domain and its saved fixtures regenerated; all match.
Ten targeted range/search tests pass, and the three integrated tests pass again
after retaining the counter-wrap search case. Physical candidate trajectories,
follow-up cost composition and automatic planner/live gameplay integration
remain unfinished. This work is not deployed.

### Real prospective-route assessment in search (2026-09-11)

`originalAssessedRouteSearch` replaces the supplied follow-up cost callback with
`originalRouteAssessment`, retaining the real range integration. The common
terrain accessor must include original terrain kind as well as code, shot class
and flags, and must support original padded reads for curved assessment rays.
Only the physical candidate outcome callback remains externally supplied within
this search composition. This does not yet connect the original candidate
planner/flight implementation or the surrounding automatic-shot planner.

`verify-original-assessed-route-search.py` executes the entry-to-publication
range with original 0x421450 assessment and 0x4219e0 range code. Metadata includes
kind-13 obstacles on code 3, so costs cover more than uniform clear terrain.
It supplies the range's surface lookup and candidate landings, skips observer
UI and stubs the UI yield as before. All 30 runs match complete search state,
result and ordered candidate calls. A separate counter confirms 5,784 original
assessment invocations actually ran, rather than passing solely through search
branches that bypass assessment. The counter is asserted nonzero.

Nine assessed/ranged-search and standalone-assessor tests pass, including input
immutability, original cost fixtures and serialized replay. Candidate flight
integration, complete automatic planning, and live use remain unfinished.
No deployment accompanies this change.

### Exact-point planner to candidate flight (2026-09-11)

`original-exact-candidate.js` connects originalExactPlanner to candidate start,
including the candidate routine's halving of angular offset. It returns both
complete launch output (cache, range setup patches and assessment metadata) and
resumable flight state. Candidate physical skill mask remains explicit and is
not inferred from actor launch skills. The caller retains ownership of the
original actor and must persist the separately returned shared state.

Inspection of 0x421b9c/0x422431 confirms the native candidate copies and restores
256 bytes starting at actor base +8. Landing globals and RNG/cache are outside
that copy. The new pure bridge does not yet claim a complete native transaction
or implement an owning search-state adapter.

`verify-original-exact-candidate.py` chains the existing full exact-planner oracle
and original mixed-terrain candidate loop. Sixty launches/complete trajectories
match, including final position, landing, RNG, steps and all launch metadata.
The harness also reruns 1,000 original exact launches and 150 mixed trajectories.
Eight planner/candidate tests pass, including serialization during flight.
These are chained executions with separate planner and flight environments;
they do not establish contiguous shared-map equivalence. That verification,
trial snapshot/shared-state handling, search callback integration and live use
remain unfinished. No deployment is included.

### Resumable candidate trial ownership (2026-09-11)

`original-candidate-trial.js` adds an isolated trial record around the exact
candidate bridge. Advance consumes an explicit finite step budget and reports
running/complete from original speed termination; exhausting a work slice does
not manufacture a landing. The previous published landing remains until the
original candidate stopping condition supplies a new one. Launch metadata/cache
and final candidate RNG remain separate from the unchanged caller actor inputs.
The representation is serializable for future workers or multiplayer replay,
not a network protocol or a completed multiplayer integration.

Tests replay all 60 chained original planner/flight fixtures in seven-step slices,
serializing between slices and checking input/prior-state immutability, final
position, landing, steps, launch metadata and RNG. Five candidate/trial tests
pass. The mixed-trajectory verifier now also tests original zero-speed execution:
it runs zero steps, restores the actor, leaves RNG unchanged and retains seeded
landing globals (12345,23456). All 150 trajectory comparisons and this check pass.

The owning search scheduler must still apply shared cache/RNG and metadata
patches across trials. Shared-map contiguous planner/flight evidence and live
search/gameplay integration remain unfinished. No deployment is included.

### Shared flat map for exact planning and flight (2026-09-11)

`verify-original-shared-map-candidate.py` chains the original exact planner and
candidate loop with the same terrain grid and placement marks for both. Planner
raw heights and candidate heights/slopes are flat zero; wall masks are zero.
The browser comparison uses one originalShotMap instance: its planning interface
feeds exact planning and its physics interface feeds every flight step. Original
terrain kinds/classes remain the planner metadata, while bounce/roll coefficients
are 3/0 for each terrain code in both flight implementations.

All 60 chained cases match complete launch output/cache, final position, landing,
RNG and step count. The reused harnesses also pass their 1,000 launch and 150
mixed-flight comparisons plus the zero-speed preservation check. Eleven shared-map,
map-adapter and resumable-trial tests pass, including serialized midflight replay.

This closes the previously documented use of different environments for flat
candidate tests. It remains chained rather than one uninterrupted native candidate
execution, and it does not establish combined nonflat planning/flight behavior.
Original state restoration across the full planner call, shared trial scheduling,
search integration and live gameplay use remain unfinished. No deployment.

### Shared nonflat map for planning and flight (2026-09-11)

The shared-map candidate verifier now accepts `--nonflat`. Both planner raw
height samples and candidate physics use the same 51×51 vertex field, with the
planner's 50×50 raw array extracted from those vertices. The original candidate
harness executes its recovered nonflat height/slope routines. Browser planning
uses raw heights through originalShotMap.planning; flight uses interpolated
height/slope from the same adapter, whose directional corner data is built with
originalDirectionalHeightStage. This retains the original difference between
raw planner samples and physics interpolation without using different terrain.

All 60 nonflat chained cases match full launch/cache and terminal flight state;
flat mode was rerun and all 60 cases still match. Both fixtures retain their
vertex field. Ten map/shared-candidate tests pass, including serialized midflight
replay for each mode. The reused individual planner and flight oracles also pass.

This closes the separate nonflat-map evidence gap. It is still two chained native
executions, not one uninterrupted 0x421b50 call through the planner and flight.
Contiguous actor restoration/global-state verification, search scheduler/state
integration and live gameplay remain unfinished. No deployment is included.

### Uninterrupted original candidate execution (2026-09-11)

`verify-original-contiguous-candidate.py` runs 0x421b50 through return, including
its actual 0x4235c0 planner call, full launch epilogue, flight loop and actor copy
restoration. Candidate arguments enforce the original explicit-target false and
curve argument. The original candidate and browser trial use the same flat map,
placement marks and bounce/roll coefficients. Original metadata/RNG/cache remain
in one emulator throughout each call; cache carries between cases.

All 30 calls match final coordinates, published landing, RNG, step count and
strength cache. The verifier compares all 256 restored actor bytes against their
pre-call snapshot. No rendering record refers to actor 0, so incidental display
updates are bypassed by the original lookup; the verifier does not emulate that
UI. Raw surface/height reads and flat physics height/slope remain supplied.
The previously separate planner and flight helper code now executes together.

Retained cases match browser trial execution in serialized seven-step slices;
caller input and previous trial state remain unchanged. The targeted trial tests
pass. This closes the uninterrupted flat-candidate evidence gap, but nonflat
uninterrupted execution, cross-trial global metadata/state ownership, integration
into the full search and live gameplay remain unfinished. No deployment.

### Completed trial shared-state publication (2026-09-11)

`originalCandidateTrialResult` exposes completed landing, final RNG, strength
cache and terrain-class overrides as an independently owned snapshot. It rejects
a running/nonzero-speed trial. The original planner epilogue at 0x425ab9 and
0x425ac3 sets metadata classes for codes 17 and 20 to 8. Those globals lie outside
the restored actor record. They differ from the temporary class-32 overrides
returned by planner setup, so carrying setup patches forward as final state
would be incorrect.

The uninterrupted candidate verifier now reads both final metadata bytes after
original return and compares them with the published trial result. All 30 cases
match, alongside the existing cache/flight/RNG/restoration checks. Five targeted
tests pass, including input/prior-state preservation and ensuring consumers can
modify a result snapshot without changing a completed trial or later result.

This defines completed cross-trial outputs; the owning search still must apply
them before evaluating its next candidate and refresh metadata access accordingly.
Contiguous nonflat verification, search scheduling/state integration and live
use remain unfinished. No deployment is included.

### Sequential candidate state propagation (2026-09-11)

`originalSharedCandidateTrial` starts a trial from completed shared state. It
uses the shared random seed rather than the caller's stale launch seed, supplies
the shared cache and previous landing, and overlays terrain-class updates for
planner reads without altering the map's metadata source. This ensures the next
range calculation sees the previous planner's final metadata before any new
setup overrides. The golfer inputs remain isolated from speculative movement.

`verify-original-shared-candidate-trials.py` reuses the uninterrupted original
candidate harness for 30 sequential calls. It carries actual returned RNG,
landing, cache and class overrides into each following call while changing the
supplied shot inputs. The original cache remains in emulator memory; the other
shared fields are explicitly restored to their prior returned values during
harness input setup. All shared outputs match. This verifies controlled shared
state propagation, not an uninterrupted whole route-search invocation.

Six targeted trial tests pass, including retained sequential original fixtures
run in serialized seven-step slices with shared state serialized between trials,
input isolation and unchanged map metadata. Integrating this callback with the
complete search, contiguous nonflat verification and live use remain unfinished.
No deployment is included.

### Uninterrupted nonflat candidate execution (2026-09-11)

The contiguous candidate verifier now supports `--nonflat`. It loads original
physics height/slope routines alongside the full planner and candidate loop;
vertex/corner reads use a single nonzero 51×51 height field, with raw planning
samples drawn from that field. Browser comparison uses originalShotMap and its
derived directional heights on the identical vertices and terrain. The original
actor is still restored and byte-compared after the complete call.

All 30 nonflat calls match final position, landing, RNG, step count, cache and
final class overrides. Flat mode was rerun and all 30 cases match too. Retained
fixtures now include vertex heights. Four contiguous/shared-trial regression
tests pass, including serialized seven-step trial advancement on both landscapes
and independent result publication. This closes the uninterrupted nonflat
candidate evidence gap for the supplied height/terrain scenarios.

Surface lookup and vertex/corner reads remain supplied; no actor display record
is present. This does not yet verify the full route-search invocation with actual
candidate callbacks or live browser gameplay. Those integrations remain open;
no deployment is included.

### Search reads current candidate-mutated metadata (2026-09-11)

Landing scoring now resolves class 20 through shotClassAt when provided, instead
of retaining a scalar exclusion class from search entry. Original instructions
0x422c9b and 0x422d55 read that global after candidate execution. Corner option
gating likewise accepts a live originClassAt query, wired to the original origin
tile by entered search. Standalone scalar inputs remain available to the isolated
block harnesses. These changes prevent a candidate planner's class resets from
being ignored by subsequent scoring and option evaluation.

The new live-metadata search oracle executes full original search/range/assessment
code while candidate callbacks publish supplied landings and set classes 17/20
to 8, as the verified planner epilogue does. Thirty cases match complete search
state, result and ordered candidate calls; 5,844 original assessments execute.
The ranged/assessed fixture adapters now explicitly provide class-20 metadata
when their terrain grids contain no such tile, matching original global setup.
Seventeen targeted tests pass, including current-class corner gating.

Candidate outcomes remain supplied in this oracle. Full physical candidate
callback integration, uninterrupted full-search verification and live gameplay
remain unfinished. No deployment is included.

### Physical candidate callback and complete search connection (2026-09-11)

`original-physical-candidates.js` adapts the search simulator request to exact
candidate planning/flight. It owns shared state, carries metadata overrides and
exposes current class/terrain accessors. Candidate arguments use the requested
exact coordinates/curve, while search mode, cup target and world flags arrive as
a separate callback context from originalRouteSample. Trial completion updates
landing, RNG, cache and class overrides before the next search score is computed.
The input actor/map remain unchanged; consumers receive independent shared-state
snapshots. Evaluation currently runs synchronously to original termination.

`originalPhysicalRouteSearch` connects this callback to the real range and
follow-up assessment search. It verifies actor/position alignment and uses the
search candidate skill mask for physics, keeping that distinct from launch
attributes. Sequential callback tests match retained original candidate outputs,
including state and metadata propagation. A full mode-2 search executes physical
candidates and replays deterministically without supplied landings or costs.
Seven callback/sample/live-metadata tests pass.

This is the first connection of those complete modules, not yet a verified
whole-search reproduction. Context/global-state mapping must be checked against
an uninterrupted original route search, including all modes and boundary maps.
The synchronous wrapper also needs integration with the game's execution model
before live use. No deployment accompanies this change.

### Complete physical route-search oracle (2026-09-11)

`verify-original-full-physical-search.py` runs original 0x42245e through search
publication with actual range arithmetic, prospective assessment and nested
0x421b50 candidate calls through their planner and flight loops. Candidate
landings and follow-up costs are no longer supplied. It retains shared RNG,
strength cache and terrain metadata within each original search execution.

Three controlled flat-course searches cover modes 2, 1 and 0 with 388, 1,564 and
1,564 physical candidate calls respectively. The browser composition matches
complete 441×6 score/distance/flag grids, winner, work, diagnostics, selected
result and shared landing/RNG/cache/class state. Four physical-search/callback
tests pass, including serialization replay and input immutability.

The course here is uniform with an explicit original actor-0 launch profile;
raw surface/height lookup and flat physics heights/slopes remain supplied.
Observer/display records are disabled and UI yield is stubbed. Broader actors,
terrain arrangements and boundary behavior are not established by these three
cases. The full comparison takes seconds in the test environment, so the
synchronous integration is not appropriate for the main UI loop without further
scheduling/worker integration. Outer automatic shot planning and live gameplay
use remain unfinished. This is a stronger integration check, not a declaration
of complete game fidelity. No deployment is included.

### Mixed-course and professional full-search coverage (2026-09-11)

The complete physical-search oracle now includes deterministic water bands
(code 17), kind-13 obstacles (code 3), rough terrain (code 4), and a marked cup
area alongside clear terrain. Mixed modes 2 and 1 execute 240 and 840 actual
candidate calls. A professional actor-class case with ability mask 0x63 adds
924 calls, exercising professional range and available curve handling. Its
launch range profile now explicitly derives professional status from actor class.

Together with the existing clear-mode cases, all six searches and 5,520 physical
candidate calls match uninterrupted original execution in complete search tables,
winner, result and shared state. Five full-search/callback tests pass; the fixture
suite asserts that mixed terrain and the professional case remain represented.

All these whole-search cases still use flat height/slope fields and actor ID 0.
Candidate-level uneven terrain has separate evidence, but uninterrupted uneven
whole-search behavior, boundary maps and broader actor IDs remain unverified.
Responsive execution and integration into the surrounding automatic planner/live
game are still required. No deployment is included.

### Off-main-thread original search execution (2026-09-11)

`original-search-job.js` reconstructs the shared original map from a serializable
search/launch/physical/shared-state snapshot plus terrain, marks, vertex heights,
metadata and optional derived data. Missing raw memory outside the map must be
provided explicitly; the job does not invent original terrain. The job invokes
the same physical search verified against the executable.

`original-search.worker.js` executes the job in a module worker. The client owns
one active job, terminates superseded/cancelled workers, rejects cancelled promises,
tags results with the caller's revision, terminates workers on result/error, and
rejects use after disposal. It does not apply a result to course state; the owning
caller must check its current revision and apply outputs atomically.

Three tests pass: all six original full-search fixtures match through the job
snapshot; a real Chrome worker returns the original result while main-thread
animation frames continue; superseded jobs reject and worker failures recover on
a following job. Production build passes (existing large-chunk warning remains).
The live app does not import this client yet, so that build is not evidence that
the final production worker chunk has been wired or exercised. Gameplay caller,
production worker integration and outer automatic planner remain unfinished.
No deployment is included.

### Worker result application guard (2026-09-11)

`original-search-coordinator.js` adds the owning asynchronous boundary around the
worker client. It rejects stale snapshots before dispatch, checks both request
generation and authoritative revision after completion, and synchronously calls
apply only after those checks. Cancellation/disposal invalidates generations so
even an uncooperative late result cannot commit. Worker errors propagate without
applying a partial target or shared-state update.

The caller's revision token must represent all search inputs, including course,
actor/ball and shared RNG/cache, not just the existing game construction revision.
The coordinator deliberately does not guess that token or mutate the live game.
Inspection confirms chooseTarget still calls the provisional planShotWith with
browser-native positions and rules; native original-state mapping remains needed.

Seven tests pass: coordinator cases cover course, ball and RNG token changes,
stale initial input, response tag mismatch, out-of-order cancelled completion,
disposal and errors; real Chrome worker tests retain original results while
animation frames continue and verify cancellation/recovery. Actual live revision
construction, coordinate/actor snapshot adapter, result application and outer
original planner remain unfinished. No deployment is included.

### Automatic short approach: 0x4239f7–0x423b66

`original-auto-approach.js` publishes the target tile centre to the shared
landing pair and clears diagnostics. Terrain code 1 or distance at most 25
skips adjustment. Otherwise, the heading selects two cardinal directions
(the same direction twice for an even facing). The sum of shot classes behind
the target minus those ahead controls adjustment: at least 4 adds a clamped
0–12 yards, at most -4 subtracts 6. The addition uses truncated distance/4,
minus 6 when the origin terrain's current shot class is nonpositive.

The map callback reads current metadata so planner mutations to terrain 17/20
remain observable. This branch does not simulate a landing or finalize a launch.
Raw edge reads are delegated to the map; the native comparison uses interior
targets and makes no claim about unavailable outside-map data.

`verify-original-auto-approach.py` executes the complete original branch and
clamp routine in Unicorn, checks its terminal instruction address, and compares
distance, shared landing and diagnostics in 5,000 seeded cases. The committed
60-case fixture includes increased, decreased and unchanged distance. Eleven
approach/request/result tests pass, including skipped reads and changing metadata.
Automatic outer composition, subsequent launch logic and live integration are
still unfinished; this work is not deployed.

### Automatic launch ground state: 0x424c46–0x424cc3

`original-auto-launch-ground.js` handles the putter branch and following common
elevation update. Club 13 targeting terrain 1 replaces horizontal speed with
the original strength search for distance+2, zero vertical speed and mode 1.
The ten-entry cache remains shared, including the original omission of rolling
coefficient from its key. Other clubs/target terrain retain the incoming speed.
Non-putters enter the original common block at 0x424c7c, after scenery sampling;
this module does not claim to implement or replace that sampling.

The common block reads target height then origin height and adds the absolute
difference to actor byte +0x1b (address 0x577f23 for actor zero), with byte wrap.
Its behavioral interpretation is left open; the implementation calls it
`elevationCounter`, not a calibrated stamina or happiness value. Later code
reads this byte for golfer reactions and can reset it.

`verify-original-auto-launch-ground.py` executes the complete branch and real
0x4218e0 strength routine, supplying controlled signed-byte heights to the
original height-query boundary. It checks the terminal instruction address and
compares speed, counter and all cache entries across 1,000 sequential cases.
Nine targeted tests pass, including original cache reuse after a coefficient
change, unchanged non-putter speed and byte wrap. Scenery sampling, reactions,
later launch adjustments, outer composition and live integration remain open.

### Automatic club history and final remarks: 0x425239–0x425372

`original-auto-launch-history.js` recovers the last automatic-only stage before
the common launch tail. A nonzero actor byte +0x84 invalidates the saved
comparison marker. With unchanged marker, later holes and an unused non-putter
club, the game requests remark 0x36 with the club index. The club bit is then
recorded regardless of whether a remark was requested. Matching marker gates
downhill/uphill remarks 0x2e/0x2d. Both height pairs are read separately, including
after a downhill remark. The final green remark 0x3e requires matching marker,
zero actor class and reaction byte, and the actor/hole/shot sum divisible by four.

The synchronous `emit` boundary returns updated actor state. Later conditions
reread it because 0x4672d0 is not merely UI output. Raw marker/reaction names
avoid claiming fully understood mood semantics. Caller input is cloned before
any effect; events and resulting state can be committed together later.

`verify-original-auto-launch-history.py` executes the complete stage, records
remark arguments and compares actor fields, club-use mask and comparison marker.
It supplies controlled height reads and remark effects (none, marker increment,
reaction activation) in 1,500 cases. The 90 committed fixtures cover all four
remark requests. Six related tests pass, including suppression of later terrain
reads after marker changes. This proves the calling stage with those controlled
effects, not the full original remark routine. Earlier automatic scenery and
reaction stages, actual remark effects and live planner integration remain open.

### Automatic shot reactions: 0x425001–0x425239

`original-auto-shot-reactions.js` clears actor flags 0x60, then preserves the
original marker/reaction gates and ordered remark calls. These include scenery
0x1c, curve requests 0x37/0x38, flag-0x80 long-shot request 0x39, state-code-4
requests 9/0x3c, course-record request 0x3b and the paired 0x30/0x31 exchange.
Longer-than-75 shots set positive/negative curve flags at strict angular-offset
thresholds ±(30 << 16), or ±(30 << 15) with skill bit 2. A successful paired
exchange increments the partner reaction byte after both synchronous effects.

Both actor and partner state are cloned and returned explicitly. The supplied
effect callback may change state before later gates. Original course-record
lookup and pair-score routine 0x46c140 are read boundaries; neither is replaced
with a guessed golf score formula. The active-reaction early exit at 0x425243
is equivalent here because the following history stage handles invalidating
the comparison marker.

`verify-original-auto-shot-reactions.py` executes the full stage for actors 0–5,
compares all modeled state and ordered calls, and checks either original terminal
address. 2,000 cases cover controlled marker/reaction effects, curve thresholds,
course marks and paired score results. Nine related tests pass. Verification
does not establish the implementation of 0x4672d0 or 0x46c140, which are controlled
call boundaries. Earlier scenery/primary reactions, complete composition and
live gameplay integration remain unfinished; no deployment is included.

### Correction: 0x46c140 is profile classification, not score

Direct disassembly shows the routine reads actor signed-word +0xb6, multiplies
that profile index by 560, then reads profile byte +0x21 (base 0x4d5040).
It returns `(~byte >> 7) & 1`. The earlier "pair-score" label above was an
unverified interpretation and is superseded. No golf score is read. The same
actor index used by the nearby 44-byte per-profile/per-hole table is now named
`profileIndex`, and its accessor `profileHoleMarkAt`.

`original-profile-group.js` supplies the actual classification to automatic
reactions. Only original profile indices and raw bytes are supplied by the
caller; a precomputed score/comparison result is no longer accepted. Its visual
or demographic meaning is not inferred here. Equality compares the extracted
binary groups, not equality of complete profile bytes.

The reaction verifier now includes real 0x46c140 machine code rather than a
stub. All 2,000 full-stage cases match with profile records in memory. A further
1,024 direct executions cover every byte value at indices 0, 1, 76 and 83 and
compare against the JavaScript lookup. Eight related tests pass, including equal
groups from different bytes and unequal groups suppressing the paired exchange.
The remark-effect boundary remains controlled and full live integration open.

### Primary automatic reaction: 0x424cc3–0x425001

`original-auto-primary-reaction.js` preserves the original first-match order:
follow-up lie, scanned scenery/reference, flagged-origin eligibility, search
diagnostics, per-hole record conditions, then elevation-counter conditions.
The original RNG is advanced only on reached branches. The elevation counter
is read as a signed byte; later resets to 0, 6, 10 or 20 preserve the original
position relative to synchronous remark effects. An effect may change the
counter or RNG state, and those changes are retained except where original
post-call instructions explicitly overwrite the counter.

`verify-original-auto-primary-reaction.py` runs the full native stage with the
real RNG and float-to-integer helper. Entry starts at 0x424cb6 to establish the
follow-up condition flags and preserve the supplied elevation byte, then stops
at 0x425001. Controlled 0x466ea0 eligibility and 0x4672d0 remark effects supply
unrecovered boundaries. All 3,000 cases match selected calls, actor state,
diagnostics, final seed and draw count. The 180-case fixture covers all fourteen
reaction IDs emitted by this stage; fourteen related tests pass.

This closes the primary selector in isolation. It does not implement the
eligibility or remark routines, preceding automatic scenery sampling, or live
planner integration. Numeric condition/record fields are intentionally retained
without assigning unsupported player-facing meanings. No deployment is included.

### Actor condition classification: 0x466ea0–0x466ec1

`original-condition-class.js` reads the meaning of actor word +0x88 without
assigning a player-facing interpretation. Bit 0x8000 returns class 2, regardless
of bit 0x4000. Otherwise the inverted bit 0x4000 gives class 0 or 1. Primary
reaction selection tests that class for nonzero at an origin with mark 0x800,
unless origin mark 0x4000 suppresses the request.

The primary-stage verifier now executes real 0x466ea0, removing its eligibility
stub. All 3,000 complete stage cases still match. It additionally executes the
routine for all 65,536 possible words, rotating actor addresses, and compares
every result against JavaScript. Sixteen related tests pass, including both
nonzero classes, high-bit precedence and the origin-mark suppression. The
earlier controlled-eligibility limitation is superseded; remark effects remain
controlled, and scenery sampling/composition/live integration remain open.

### Non-putter automatic scenery loop: 0x4249b3–0x424c46

`original-auto-scenery.js` increments the hole counter and samples around the
shot heading, using two original random draws per iteration. The iteration
limit is recomputed from origin height and the condition level. Negative sampled
distance skips projection; projected samples update the facing before map-bound
rejection. In-bounds checks preserve metadata, marker, relative-height and
behind-neighbor exclusions before selecting scenery, scanned or named references.
Reference tiles use z*50+x, distinct from raw terrain's x*50+z indexing.

The object-index lookup remains an explicit map boundary. For terrain 21,
index -1 skips the object read. For the other category-16 branch the original
reads that backing record, so the adapter must supply it explicitly. No fabricated
default is introduced by this module. The putter bypass belongs to the outer
caller and does not enter this non-putter function.

`verify-original-auto-scenery.py` executes the entire loop, including native RNG,
sine projection and bounds checking, with controlled height/object lookup and
explicit terrain/metadata/record memory. 300 cases cover interior and near-edge
positions, no-sample runs, record types 4/5 and index -1. State, sample count and
RNG match. A coverage test exposed a fixture-map correlation that prevented
named references; the lookup pattern was corrected and all native cases rerun.
The committed fixtures now exercise changes to all three reference outputs.
Thirteen related tests pass. Original object lookup, full remark effects and
automatic planner composition/live integration remain unfinished; not deployed.

### Original object lookup: 0x40dc70–0x40dce6

`original-object-index.js` scans exactly 256 records in storage order, skipping
type -1 and returning the first matching square footprint. Origin coordinates
are signed words; base size is a signed metadata byte. Types at least 6 except
7 add expansion-1 to size. Both coordinate intervals include the lower bound
and exclude the upper bound. No sorting or nearest-object heuristic is used.

Automatic scenery sampling now calls this implementation directly. Its native
verifier also executes real 0x40dc70 against a complete object table rather than
returning a controlled index. Object records, base sizes and expansion values
remain explicit data inputs; the special backing record at index -1 is still
supplied where the caller's subsequent code reads it.

`verify-original-object-index.py` compares 1,000 scans, including first-match
overlap, slot 255, no hit, negative coordinates/base sizes, expanded footprints
and the type-7 exception. All 300 complete scenery loops still match native
state and RNG with this lookup included. Ten related tests pass. The previous
object-lookup-boundary limitation is superseded; full live record mapping,
remark effects and automatic planner integration remain unfinished.

### Connected automatic middle: 0x424988–0x425372

`original-auto-launch-middle.js` captures the entry marker and composes the
recovered non-putter scenery loop, common putt/elevation update, primary
reaction selector, shot reactions and club history. The putter bypass skips
scenery and preserves its hole counter. Shared seed/cache, actor/partner effects
and scenery references flow through one cloned snapshot. Remark callbacks act
synchronously on that shared state, including the final history stage.

Scenery's sampled direction (stack +0x44) and the primary reaction's direction
(stack +0x4c) are distinct values. Composition retains both rather than passing
the last random sample's direction into the later reaction selector.

`verify-original-auto-launch-middle.py` initializes controlled map/profile/object
records and executes every original instruction from entry through 0x425372
without replacing intermediate stages. It reuses the scenery verifier's emulator
initialization, but does not execute its fixture loop. Original RNG, projection,
object scan, strength cache search and profile/condition classification all run
natively. Only height values and remark effects are controlled boundaries.

All 240 runs match modeled actor/partner fields, speed, cache, seed, diagnostics,
hole counter, reference values, ordered events, sample count and random draws.
Fixtures include putters, non-putters, active reactions, changed markers and
paired exchanges. Twenty-two related tests pass. This is stronger than chained
isolated oracles but still stops before the common launch tail; target setup,
full original remark effects and live original-state mapping remain unfinished.
No production integration or deployment is claimed.

### Automatic middle through final launch: 0x424988–0x425ab9

`original-auto-launch-finish.js` feeds the connected automatic middle's current
actor flags, angular offset, class, counter, club, reaction state and shared seed
into the original shot-shape/recovery/normalization tail. The resulting velocity,
heading, effective lie, flags, shot type and seed are returned alongside the
middle's cache, actor/partner state and ordered events. Input remains immutable.

`verify-original-auto-launch-middle.py --with-tail` now runs uninterrupted from
the selected-club boundary to 0x425ab9, including the original out-of-line tail
branches. It snapshots scenery references at 0x425372 before the native stack
reuses the named-reference local for curve offset; the output preserves those
earlier semantic references rather than mislabelling reused scratch memory.

All 240 complete runs match across four final variation modes, three curve
arguments, putters/non-putters and reaction effects. The original 240 middle-only
comparisons still pass; eight related tests pass, including deterministic replay.
This ends before metadata restoration and does not recover initial target/club
selection or full remark effects. Those steps and live gameplay mapping remain
unfinished. Nothing is deployed by this change.

### Automatic planner-exit restoration: through 0x425aca

`original-planner-restoration.js` centralizes the two unconditional shared writes:
terrain 17 and 20 shot classes become 8 at 0x425ab9 and 0x425ac3. Automatic launch
finish now publishes those writes, and candidate completion uses the same helper.
They are fresh write lists for the owning simulation to apply, not replacement
terrain tables; unaffected metadata must be retained by the owner.

The automatic verifier now continues through both native writes to 0x425aca.
Each case seeds the two incoming bytes with distinct non-8 values so an omitted
write cannot pass because a previous test left the expected value in memory.
All 240 uninterrupted runs match final state and restoration outputs. Thirteen
automatic/candidate tests pass, including flat and nonflat contiguous candidate
fixtures, serialized shared trials and independent output ownership. The earlier
epilogue omission is closed at this boundary. Initial target/club selection,
complete remark effects and applying the state to live gameplay remain open.

### Shared preparation before automatic/exact split: 0x423b66–0x424988

`original-launch-preparation.js` composes target ray/neighborhood assessment,
elevation distance correction, club selection, launch core and terrain-dependent
low/approach shot selection. It returns the complete prepared launch, cache,
assessment (including rating and dominant terrain/direction), adjusted distance,
clamped strength and actual origin terrain. Unlike the exact-target wrapper,
this stage accepts the automatic -1 sentinel because the paths split afterward.

The existing exact-target assessed launch now shares this preparation and applies
the final tail afterward. Its rejection of the automatic sentinel remains, so
callers cannot silently bypass the automatic-only scenery/reaction stages.

`verify-original-assessed-launch.py --prepared` stops at the actual split point
with planner argument -1. All 1,000 cases match full preparation outputs and
sequential shared caches. Running the default verifier also confirms 1,000
exact-target results remain unchanged. Seventeen related tests pass, including
flat/nonflat native candidate fixtures. The remaining handoff must map assessment
rating and dominant fields into the automatic middle's actor/scratch state; initial
target selection, full remark effects and live gameplay integration remain open.

### Preparation-to-automatic handoff

`original-launch-handoff.js` translates prepared launch results into the automatic
context: clamped strength replaces distance, assessment rating becomes actor byte
+0x1b, and dominant terrain/direction become reaction cue values. Scanned/named
references reset to zero, marked terrain is retained, and the last ray sample x
remains in the local later reused as scenery-facing state. Initial aim direction
is computed from the input heading, independently of the adjusted launch heading.
The strength cache is cloned for output ownership.

`verify-original-assessed-launch.py --handoff` reads these actor/stack values
directly at 0x424988 after native preparation. All 1,000 snapshots match. The
new `original-auto-prepared-launch.js` wrapper applies the update to the existing
context and runs automatic launch through restoration, preserving unrelated
actor and partner fields.

Seven related tests pass. Wrapper tests reconstruct prepared inputs at existing
native final-launch fixture boundaries and demonstrate replacement of stale
seed, speed, counter and reference values. This is boundary-composition evidence,
not yet one uninterrupted oracle from assessment through final launch. That wider
comparison, initial target selection, full remark effects and live gameplay
integration remain unfinished; no deployment is included.

### Uninterrupted assessed automatic launch: 0x423b66–0x425aca

`original-assessed-automatic-launch.js` now composes shared preparation with
the automatic handoff, middle, final tail and metadata restoration. Mutable
actor fields and seed come from the current state rather than duplicated
planning inputs. Exact-coordinate requests are rejected before map access.
The returned `postPreparationDraws` is explicitly scoped instrumentation;
the final seed includes random consumption from all stages.

`verify-original-auto-launch-middle.py --from-assessment` executes the entire
native span without substituting intermediate results. It initializes original
profile, terrain, object and actor data and uses the original assessment,
strength-cache, classifier, scenery, reaction-selection and launch routines.
Height values and remark effects remain controlled external boundaries.

All 240 cases match modeled final actor/partner state, ordered events, velocity,
cache, seed and restoration writes. This broader oracle exposed a composition
bug: the later shot-reaction stage received stale top-level scenery instead of
the updated shared scenery reference. The handoff now supplies current state,
and all 240 fixtures are retained to cover that failure. Seventeen related tests
pass, including stale planning inputs and the exact-coordinate guard. The earlier
assessment-to-final verification gap is closed for these controlled scenarios;
initial target/range search, full remark behavior and live state mapping remain
unfinished. No deployment is included.

### Connected target selection (2026-09-11)

`originalTargetSelection` connects 0x42365d target geometry to branch selection
and the complete short-approach block, without intervening native stubs.
`verify-original-target-selection.py` executes 5,000 cases with the actual
heading/projection helpers, varied ranges and current terrain-class bytes.
Direct and short paths stop at 0x423b66; long paths stop at 0x42381a before
route-search setup. The comparison includes target, heading, curve, flags,
adjusted distance, shared landing/diagnostics and pending search request.

The 240 stored cases cover all three paths, positive/negative/zero approach
adjustments, and projected search waypoints distinct from the cup. Initial
coverage used a range too large to distinguish these; varying range exposed
and closed that test-data gap. Ten related tests pass. No route search is
replaced with an approach, and this stage has not been wired into live play.

### Physical route search to caller aim (2026-09-11)

`originalPhysicalTargetSearch` runs the recovered physical route search and
feeds its selected target/corner flag into 0x423863–0x4239cf aim processing.
It returns the complete search result and shared seed/cache/metadata changes
alongside the recalculated heading, distance, actor flags and approach score.
The spatial score reader remains explicit caller scratch input; it is not
substituted with the route candidate score table.

`verify-original-full-physical-search.py --with-target-result` runs all six
existing native physical-search scenarios (5,520 candidate trials), then
resumes the native caller aim block with the resulting actor/shared memory.
A separate outer stack and deterministic signed-byte score buffer are supplied
at this handoff. This verifies the connected state transfer but is not an
uninterrupted outer-planner oracle: the caller stack setup and intervening
return instructions are not executed. Both skill-bit-four score recalculation
and score preservation are exercised. Full outer preparation, scratch-buffer
provenance, observer effects and live application remain unfinished.

### Direct target selection through automatic restoration (2026-09-11)

`originalDirectAutomaticLaunch` extends the automatic launch boundary to target
geometry (0x42365d). It uses current actor flags, skills and target; calculated
heading, distance and curve replace stale planning copies. Short approaches
publish the shared target landing and reset diagnostics; direct explicit
targets retain those shared values. Long targets are rejected before launch
effects because they require the physical route-search branch.

`verify-original-auto-launch-middle.py --from-target --write-fixture` executes
240 uninterrupted native cases through 0x425aca, with the existing controlled
height and remark-effect boundaries. Final actor/partner state, seed, cache,
landing, diagnostic fields, events and metadata writes match. The first fixture
set inadvertently put every green-origin case far from its target; the putter
coverage assertion caught that. Nearby green targets now exercise putts, while
explicit long targets and non-green short approaches remain covered. Eleven
related regression tests pass. This is not yet a complete outer planner: initial
range/setup, long-shot composition, full remark behavior and live mapping remain.

### Automatic entry range through direct launch (2026-09-11)

`originalDirectAutomaticPlanner` runs `originalPlannerSetup` before target
selection, applying temporary class overrides only after the range query.
The current actor supplies skill mask, shot counter and professional status.
The caller's estimated range is replaced with the native range calculation.
Final restoration patches remain separate from initial setup patches.

The `--from-entry` mode of `verify-original-auto-launch-middle.py` begins at
0x4235c0 with the native caller stack, executes the real range helper, and runs
through 0x425aca. Surface lookup, height and remark effects remain controlled
boundaries; this does not claim complete original observer behavior. All 240
cases match. Flagged terrain-17 origins specifically cover range evaluation
using the incoming class before its temporary change to 32 and final write
to 8. The shared fixture map now exposes incoming classes 17/20 accurately.
Seventeen related tests pass, including prior automatic stages and stale-input
rejection by authoritative actor fields. Long-shot composition and live game
state mapping remain unfinished.

### Search result to automatic launch ownership (2026-09-11)

`originalSearchedAutomaticLaunch` consumes the shape returned by
`originalPhysicalTargetSearch`. The search result owns target, curve, mode,
world flags and diagnostics; aim owns heading, distance and actor corner flags.
`search.searchFlag` supplies the launch reaction gate at native 0x5a872c.
Shared candidate RNG/cache and shot-class overrides feed final assessment,
while the winner landing (0x5a7270/78) is carried separately from the last
candidate landing retained in `searched.shared` (0x5691dc/e0). Caller objects
and course metadata are not mutated.

Tests reconstruct the 240 previously verified native assessment boundaries in
search-result form and deliberately corrupt pre-search copies. Final output
matches those native launch snapshots, with the carried winner landing added.
This proves field ownership and adapter behavior; the synthetic handoff records
are not actual route-search observations. Existing physical-search/aim tests
also pass (ten related tests total). A continuous search-through-launch native
comparison and authoritative live-state application are still required.

### Native physical search through automatic launch (2026-09-11)

`verify-original-search-launch.py` now chains the actual physical route search,
caller aim calculation and final automatic launch in one emulator instance.
The six existing search scenarios execute 5,520 candidate trials; resulting
actor, RNG, cache, course metadata and winner state remain intact for launch.
All six final search/launch results match the JavaScript composition, including
velocities, ordered reaction events, counters and metadata restoration.

The oracle supplies the outer caller stack at the search-return boundary and
initializes its known launch locals after aim calculation. Thus it closes the
previous synthetic-result handoff gap, but does not claim an uninterrupted
outer planner from entry: the original return/prologue wiring and source of
the caller scratch score buffer remain separate. Height is controlled flat,
surface lookup is supplied, and remark emission is recorded without remark
state effects. Native actor/social state is reset between scenarios.

An explicit code hook stops at 0x425aca because candidate executions can leave
translated blocks spanning that checkpoint; relying on the emulator's end
address alone executed past it. The committed fixture records the actual native
outputs. Tests recompute physical search before launch rather than injecting
stored search results, and verify serialized replay and input preservation.

### Unified automatic planner orchestration (2026-09-11)

`originalAutomaticPlanner` owns entry setup, target selection and either direct
launch or real physical target search followed by launch. Its input actor/state
supplies current target, flags, skills, shot counter, recovery value, seed and
cache. Search scratch records cannot override actor identity/position, cup,
hole, condition level or mode. Temporary setup metadata applies to both paths.
Candidate launch receives the global shot flags under its `stateFlags` field.

The direct branch matches all 240 native entry-through-restoration fixtures.
Long-path tests run physical search and launch from fresh initial state on two
native course snapshots and verify deterministic replay, caller preservation,
and rejection of stale actor copies in scratch context. Existing six-scenario
native search/launch chain tests remain intact. This is not yet native proof
of the complete long outer planner: the scratch buffer provenance and original
entry-to-search return wiring still require continuous native coverage.
`searchState.candidateLanding` and the separate spatial `scoreAt` reader are
explicit requirements rather than invented defaults. Live game mapping and
worker integration remain open.

### Uninterrupted outer automatic planner (2026-09-11)

`verify-original-automatic-planner.py` starts at 0x4235c0 and executes the native
outer function, including the real 0x422450 nested-search prologue, stack probe,
return, target result calculation, assessment and final launch through 0x425aca.
All six long-shot scenarios match `originalAutomaticPlanner` final state,
setup, events, cache, seed and terrain restoration. The previous supplied
caller-stack gap is closed for these scenarios.

The search's initial scratch arrays and winner record are observed at native
search entry and supplied as explicit input to the JavaScript counterpart.
No native search target, candidate outcome or intermediate range is injected
into the JavaScript run. The native caller's spatial-score buffer is initialized
with the existing deterministic signed bytes. Surface lookup and flat height
remain controlled; remark calls emit events without native remark state effects.
This remains a bounded conformance oracle, not proof of all gameplay fidelity.

The emulator must stop by outer-frame identity at final restoration. An end
address at 0x425aca alone stops the first nested candidate that reaches that
address. The native search verifier now exposes a default-on `stop_search`
switch so this harness can let the nested search actually return. Existing
standalone behavior remains the default. Broader world/actor scenarios, original
remark effects and browser/authoritative-state integration remain unfinished.

### Serializable automatic planner worker (2026-09-11)

`originalAutomaticJob` reconstructs the course through the shared
`originalJobMap` adapter and runs the complete planner from a serialized
snapshot. Object/social records and spatial scores are explicit indexed input;
missing records fail instead of being silently replaced. The new automatic
worker/client reuse the existing cancellation and revision-tagged transport.

Reaction effects are an explicit replay boundary. An unresolved effect returns
`status: effect`, its ordered index/event and the state at that point. The owner
must supply the resulting state and replay the same snapshot with that reply
appended. Mismatched events and surplus replies fail. A completed calculation
returns `status: done`; a paused calculation must never be applied as a shot.
No default no-op reaction implementation exists. Native fixture tests explicitly
reply with the controlled no-op behavior used by that oracle.

A real browser worker reproduces the native long-planner fixture through these
pauses while animation frames continue. Existing search results, cancellation
and error recovery remain covered. Replay currently recomputes prior search
work for each reaction: this trades additional computation for a deterministic
serializable boundary, and is not a performance-complete resumable engine.
Course/actor revision changes require discarding prior reply history. Real
original reaction effects, live snapshot mapping and authoritative application
remain unfinished; this worker has not been connected to live play.

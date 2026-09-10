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

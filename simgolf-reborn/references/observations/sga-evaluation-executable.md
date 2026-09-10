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

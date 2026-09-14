# Current parity audit

This is an incompleteness audit against [whattobuild.md](../../whattobuild.md)
P01–P20, not certification of a 1:1 replica. Updated after local commit
`882d1cf`. Original routines now have native/emulated comparison evidence, but
the recovered engine is not fully adopted by the playable game. Controlled
native helper comparisons do not prove uninterrupted original gameplay or
complete numerical/visual parity. See [release status](../../RELEASE_STATUS.md)
for publication and hosted-verification limits. No row below certifies completion
of its entire original-game acceptance scenario.

| Requirement | Current evidence | Remaining proof/work |
|---|---|---|
| P01 environments/difficulties | Four environments, seeded landscapes, regional models and extracted original property catalog | Complete original menus/difficulties and property-specific starting/acquisition behavior |
| P02 build/open | game.js, multihole and playable browser tests | Compare original opening and route behavior |
| P03 route strategy | shot-planner.js plus hazard tests; basic guest chooseTarget | Original skill-dependent tactics, multi-shot routes |
| P04 shot types | takeShot and terrain/collision tests | Recovered planner/motion/putting modules have native cases; full live adoption and integrated original comparisons remain |
| P05 walking/congestion | A* routes, shared two-shot tee/admission gates, path stamina, parked/picked-up visitor carts and Rangers | Original cart eligibility/garage return/shared occupancy, congestion/fatigue timing, Marshall and angry-golfer behavior |
| P06 needs | Soda Vendors, Refreshment Consultants, ballwashers, snacks, hotel and Club Pro/Celebrity greetings | Original service/greeting tuning and animation parity; legacy mood versus happiness integration |
| P07 dandelions | weed growth and groundskeeper jobs | Original growth/mood measurements |
| P08 divots/crabgrass | Maintenance tests, six-hole skilled gate, three existing-employee promotion paths and 16-person staff capacity | Original timings/costs and capacity-version verification; Marshall/angry-golfer behavior, staff development |
| P09 connected facilities | Facility inspection/lighting and transport footprint tests; placed models refresh after environment/placement changes | Full original entrance/operation comparison across the complete catalog |
| P10 training | existing-skill facility visits | Original training interaction and quantitative effect |
| P11 special visitors | Recovered naming includes Ivana Richman; this is not a working conditional visit/reward loop | Implement and compare the complete original special-visitor conditions/rewards |
| P12 SimStories | Original Opening Day dialogue, retry/advance state, saved transcript and one-time provisional garden reward | Remaining scripts/pairing rules, returning relationships, membership and original reward catalog/timing |
| P13 membership/housing | Twelve initial identities, traits/appearance/pairing, provisional tier applications and invitation growth, F9 report | Verify membership eligibility and benefits; verify original resignation, return rules, lot valuation and celebrity effects; housing is now implemented locally |
| P14 SGA | Skill/fun observations and provisional classifications | Original threshold verification, accreditation, recognition and fees |
| P15 pro career | Initial profile, portable earned point budgets and seven one-time course/design milestones | Original task selection/order, remaining accomplishments, good-shot skill gains/losses, trophy art, career/course transitions and rewards |
| P16 modes | Practice, local championship and pro-challenge exhibition with replay | Original challenge invitations/settlement, SGA eligibility, prizes and career integration |
| P17 persistence/retirement | Resort/course/golfer/event saves and replay | Retirement and all missing career state |
| P18 reports | Current ledger, scorecards, observed skill cohorts | Reports for missing systems and original presentation |
| P19 dense graphics | Actual-renderer new-game preview, regional buildings/palms, picking and rotation tests | Dense 18-hole performance measurements, full regional composition and final visual review |
| P20 lifecycle/remote | Local browser and phone viewport tests | Physical phone measurements, final hosted revision verification and prolonged lifecycle runs |

Multiplayer extension: authenticated accounts, shared courses and shared clients
now have server implementations and local integration tests. Hosted multi-device
sessions, remaining providers, event completion/capacity and release verification
are still separate open gates. See the release status; this audit does not claim
a fresh hosted run.

Next substantive progression work should start from the supplied manual's pro-challenge rules and original data, without substituting a freely started local championship for SGA-hosted tournament eligibility.

## Historical regression evidence

The following dated protocol results are historical. The newer local ruleset-85
run passed 507 checks with five private-reference skips before the latest
regional/audio additions. The subsequent regional/audio full run passed 518 checks with five explicit
private-reference skips in 5.7 minutes. See [regression record](../release/ruleset-85-live-regression.md).

### Early regression evidence
Full Playwright run: 153 tests, 152 passed, one bridge-removal browser failure (3.1 minutes). The earlier obsolete assertion forbidding starting-bridge removal was corrected to require restored water. The remaining browser test clicked under the expanded All toolbar; selecting the Landscape category exposes the same target. After correcting that UI flow, all eight course-edit/starting-bridge tests passed. Production source was unchanged during this audit. No full second rerun is claimed, and these prototype regressions do not prove original-game parity.

## Happiness-fee regression run
Full suite at protocol 26: 187 tests, 186 passed. The sole failure was an obsolete browser assertion expecting a flat $20 fee. Updated it to compare displayed scorecard amounts against their saved happiness-based fees; the isolated browser flow passed on rerun. No full second run is claimed. Production build passed. These checks cover internal behavior, not original-game parity; comment coverage, original happiness initialization and unification with the legacy mood model remain unfinished.

Protocol 31 validation follow-up: 211-test full run completed with 209 passes and two fixture assumptions invalidated by changed identity/arrival timing. Flower and tennis fixtures now observe actual reactions/arrival identities; a 13-test targeted rerun passed, including the new initial-pool phone roster check. Production build passed. This is regression evidence, not proof of original-game parity.


## Protocol 50 full regression

Full regression at protocol 50: all 287 Playwright tests passed in one uninterrupted run (5.0 minutes), with no production-source edits during the run. Coverage includes browser construction/play, a legally built 18-hole course completing rounds, phone layouts, shot flight/bounce/roll and collisions, staff service/upgrades, visitor persistence, portable course/golfer files, isolated local competitions, authorization and deterministic save/replay. This establishes a regression baseline for implemented systems, not original-game numerical/visual parity or real network multiplayer. The production build passed immediately before this audit; no application source changed afterward.

# Build backlog

## Coastal implementation update — 9 September 2026

The approved coastal concept is preserved in `graphics/samples/coastal-concept-v2.png`. The playable renderer now has slate-blue water, terrain-following rock banks and layered coastal conifers. New coastal properties contain editable island chains continuing into purchased parcels. A lighthouse can be built, removed, saved and shared; its $2,000 cost and 3×3 footprint are provisional. The coastal example verifies island access, bridge requirements and paid rounds. The full approved composition, richer cliff/foliage detail and selectable planted conifers remain unfinished.

Hosting is separate from the original application: `simgolfer.0x4d.in`, Worker `simgolfer`, branch `codex/simgolf-reborn-v1`. This does not close the original fidelity, career, regional world or multiplayer backlog below.

The objective is the complete playable SimGolf recreation described in `whattobuild.md`, using the approved dimensional graphics, stepped terrain, rounded corners and dark-green collars. This backlog tracks delivery; an implemented prototype is not evidence of 1:1 behavior.

## Fidelity and single-player completion

| ID | Work | Acceptance evidence | Status |
|---|---|---|---|
| F01 | Establish original executable version, reference settings and repeatable observation scenarios | Hash/version record and observed first-hole, maintenance, service, career and tournament journeys | Identical supplied executables fingerprinted; no readable fixed-version block or Wine runtime. Original execution/observations still open; see references/observations/executable-baseline.md |
| F02 | Up to 18 independently editable/numbered holes; ordered rounds, routing and scorecards | Build several holes; golfers finish each in order, pay per completed hole, move/close safely, reload mid-round; extend to 18 | Core implemented and tested through 18-hole rounds; hole reordering and archived score preservation implemented; original routing/editing fidelity still open |
| F03 | Full original terrain/construction: elevation, green extension/cup placement, variants, scenery, bridges, demolition, land purchases | Catalog mapped to original resources; placement and original behavior comparisons | Connected green editing plus deep rough, pot/waste bunkers, brush and rocks implemented; facility/painted-terrain demolition and unused-hole removal implemented; planted trees with flight obstruction implemented; editable elevation, stream, bridges, boundaries and tee direction implemented; three adjoining-land purchases implemented; tricky greens and original-runtime comparison open |
| F04 | Original golfer skills, shot choices, lies/collisions, emotions, conversations and congestion | Controlled scenarios against original; complete original pro skill allocation and five shot types | Terrain-dependent recovery, bounce/release and seeded rock deflection implemented; initial ten-point pro allocation plus airborne/rolling tree obstruction implemented; accomplishment points, full putting slopes and original observations remain open |
| F05 | Maintenance, divots/crabgrass, basic/skilled staff, carts and service behaviors/animations | Original staff distinctions, unlocks and measurable maintenance/needs outcomes | All eight basic/skilled staff foundations, upgrade controls, anger/Marshall interruption and maintenance progression implemented; original experience, costs, ranges, unlocks and behavior tuning remain open |
| F06 | Original facilities/upgrades, training, six-hole gates, SGA evaluation and fees | Catalog coverage and observed progression transitions | Pro Shop, Driving Range and Putting Green construction, connected visits and existing-skill training implemented; outcome-based skill cohorts/report, Tennis Court arrival attitude and connected/muddy path feedback implemented; ballwashers, flowerbeds and hotel benefits implemented; remaining facilities, original gates/upgrades and SGA evaluation remain open |
| F07 | Memberships, housing, Picky/Richman, celebrity visits and SimStories | Conditional rewards, relationships, finances and save persistence | Memberships, persistent visitors, building lots/home sales, resident reports and Opening Day with returning-pair resumption implemented; original buyer/visitor/reward rules, celebrity residents and nine other live scripts remain open |
| F08 | World/properties, four environments, difficulties, sandbox, theme packs and menus | All original choices and property-specific starting conditions | Environment selection and seeded landscape prototype live; original property generation/acquisition pipeline, complete menus and regional fidelity remain open |
| F09 | Pro practice/challenges, tournaments, ranking, accomplishments, championship exports/imports and retirement | Original eligibility, scoring, prizes and complete career transitions | Practice, pro-challenge and local championship prototypes plus initial accomplishments; original career/SGA progression incomplete |
| F10 | Original information flows, reports, sound, atmosphere and dense-course visual polish | Screenshot/gameplay comparison at approved style, actual-state animation and audio coverage | Partial |
| F11 | Long sessions, save migrations, browser lifecycle, physical-phone performance and public remote review | End-to-end runs, recovery, measured device matrix and reachable hosted URL | Separate public preview hosted at simgolfer.0x4d.in; save/replay regression coverage exists; long-session/original parity and physical-phone performance matrix remain incomplete |
| F12 | Full parity audit P01–P20 in the specification | Original-versus-browser evidence for each requirement, with unresolved differences listed | Open |

## Multiplayer architecture — required now

The owner explicitly added future multiplayer support. This supersedes the original specification's blanket exclusion of multiplayer. Preserve the original single-player experience; do not add competitive shortcuts to its rules.

| ID | Work | Acceptance evidence | Status |
|---|---|---|---|
| A01 | Separate renderer/input from simulation authority; validated serializable commands; fixed ticks | Browser uses command host; replay matches complete state; duplicate purchases/shots do not repeat; conflicting edits reject | Implemented locally; see architecture.md |
| A02 | Stable course, hole, player, competition and round IDs; migrate single-hole schema to ordered holes | IDs survive edits/saves; no index-based ownership or score attribution | Stable hole/round IDs and schema migration implemented; cross-user course/player/event identities open |
| A03 | Versioned immutable course packages separate from owner's money/career and live visitors | Export/import another player's course; tournament pins a revision; later edits cannot alter an active round | Strict content packages, SHA-256 revisions and isolated locked practice implemented; local championship integration implemented; authenticated authorship and online event integration open |
| A04 | Separate live resort, golfer career, tournament round and competition accounting state | Independent rounds on the same course do not mutate each other or resort earnings | Independent practice and championship rounds, separate browser storage and event export/import implemented/tested; persistent career and original prize accounting remain open |
| A05 | Trusted server host, authentication/ownership, persistence, reconnect and spectators | Two real clients resume the same server state; unauthorized actions reject; no client-submitted balances/scores | Open; no server deployed |
| A06 | Versioned rules/assets/seeds, replay records and migration policy | Match results reproducible on pinned versions; incompatible clients cannot silently diverge | Rules version, local competition replay records and restoration implemented; authenticated server records open |

## Multiplayer features — explicitly requested for later

| ID | Work | Acceptance evidence | Dependencies |
|---|---|---|---|
| M01 | Cooperative course building with owner/editor/spectator roles | Two users edit one course; conflicting placements, funds and permissions resolve through server authority; reconnect preserves accepted edits | A01–A05 |
| M02 | Course-building / earnings competitions | Defined shared starting budget/property/rules/time window, server-derived eligible earnings, ranked standings and tie-breaks; no imported wealth or client cash submissions | F02–F08, A03–A06 |
| M03 | Multiplayer tournaments on courses built by different users | Publish/select player courses; pin immutable revisions; multiple authenticated golfers complete the event, with server-validated shots, scorecards, standings, ties and results | F09, A02–A06 |
| M04 | Tournament lobby, invitations, live/asynchronous scheduling and reconnect/forfeit rules | Multiple-device end-to-end event, disconnect recovery and recorded completion under explicit event rules | M03 |
| M05 | Course discovery/version history and tournament course rotation | Author attribution and permissions; safe course validation; edits create new revisions without rewriting tournament history | A03, A05 |

Live versus asynchronous tournament scheduling and exact competitive earnings metrics remain product decisions for those tickets. They do not block the required separation of course design, resort economy and authoritative round state now. Multiplayer is not an original-game fidelity claim.

### Ballwasher follow-through

Visitor cleaning, a temporary per-hole accuracy benefit, construction and save support are implemented. Verify original visit selection, price, timing and strength; add player-controlled pro use and in-hole visits rather than limiting selection to the pre-tee stage. Preserve the pace cost and expire the benefit at the next hole.

### Landscape controls requested during live review

Implemented initial raise/lower brushes, eight tee directions, white out-of-bounds area stakes with stroke-and-distance penalties, bridge decks on water/path crossings, editable starting stream, illustrated construction icons and a full target line. Follow through with original-runtime elevation/shot measurements, bank-to-bank bridge span shaping, player-removable starting bridge, richer terrain sculpting and original-style asset review. Multiplayer course snapshots must preserve these design fields; current exports and isolated practice do so.

Starting bridge removal is now implemented, including water restoration, route protection and shared-course persistence. This resolves the earlier fixed-bridge limitation; shaped/arched player-built spans and original-runtime bridge fidelity remain pending.

Player-controlled Ballwasher use is implemented through the Play-mode Clean ball command. Remaining Ballwasher fidelity work is original visit selection/timing/strength verification and opportunistic visitor use during holes.

Buildable flowerbeds and a saved, per-hole passerby mood effect are implemented. Original-runtime checks are still needed for attraction radius, benefit strength/frequency, cost and path requirement. Add further original flower varieties and landmark scenery as part of the full build catalog.

Resort Hotel construction, visual model and arrival-based stamina are implemented. Verify original cost/unlock/footprint, stamina and comfort effects, and whether any hotel occupancy or room-income behavior exists before modeling those systems. Marina, Helipad and Airstrip construction is implemented; building-lot benefits and further setting-specific substitutions remain pending.

F09 progress: saved golfer skill profiles now export/import independently of course/resort state, including pre-round use in locked shared-course practice. Manual pp.22–25 were rechecked in references/observations/competition-manual.md. Championship orchestration, SGA invitations/thresholds, pro-challenge settlements, accomplishments, extra skill points and retirement remain required.

A03/A04 and F09/M03 progress: an independent competition host now runs multiple entrants and consecutive rounds on a pinned course, locks golfer allocations, rejects client score submissions and derives final standings from the real simulation. Tested same-round isolation, tied completed events, deterministic tick batching and old-round command rejection. Browser event integration, durable snapshots/reconnect, authentication/earned eligibility, original SGA invitations/prizes and real multi-client tests remain open.

A04/A06/M04 progress: competition save/resume now reconstructs independent rounds and standings through a bounded ruleset-pinned command/tick recording. Mid-flight and completed-event replay, retry receipts and damaged-record rejection are tested. Browser save/reconnect integration, server-owned event records and checkpoint optimisation remain open.

F09/M03 browser progress: local championships now launch from the club menu with 1/2/4 rounds, pinned course/profile, a simulated club professional, derived standings and separate event save/export/import/resume. Original SGA eligibility/prizes, pro challenges and career progression remain open; multiplayer still requires authenticated server hosting and real client/reconnect verification. Opponent now compares sampled landing/roll outcomes around water, boundaries and trees. Add shot shaping and multi-shot route planning; validate tactics against the original.

F04/F05 progress: resort facilities support placement-only quarter-turn orientation with persistent rendering, validated build commands, save/reload and portable layout preservation. Rotating placement preview and Tab interaction are now implemented; replace generic four-sided access with building-specific entrance geometry where original evidence supports it.

Graphics progress: replaced the snack-bar placeholder with a dedicated parkland pavilion model. Verified rendered close-up, quarter-turn placement, preview and save/reload. Other facility models and regional variants still need comparable art work; graphics/samples/snack-bar-detail.png records the current result.

F09 progression: extracted original executable invitation strings confirm distinct per-hole and whole-match wagers. Added a separate replayable pro-challenge host deriving settlements from actual scorecards. Still required: browser invitation/accept/start flow, source-backed stake schedules and settlement confirmation, single-application resort payments, and career accomplishments. Overall winner/tie rules remain provisional until original runtime observation.

F09 browser follow-through: pro challenge exhibitions can now be started, played, inspected per hole and exported/imported/resumed. Resort balance is deliberately unchanged until the invitation/settlement integration is implemented. This does not complete the original challenge lifecycle or establish original stake/tie rules.

F07/F10 atmosphere: actual golfer remarks now appear briefly on the course. Dandelion complaint/cleanup and reload behavior verified. SimStory relationships, paired dialogue progression and rewards are still separate missing systems.

F07 SimStory foundation: parsed and imported all ten supplied Standard stories with author credits, original reply ordering, raw pairing codes and source hashes. Pairing-code semantics, persistent golfer relationships, dialogue timing/branch selection and happy-ending rewards remain required before enabling live story play.

F07 source refinement: Sid Meier's story-authoring chat confirms indentation-based chapters and positive-only advancement. Corrected parser and added tested chapter progression with retrying negative responses. Retail scripts exceed the pre-release stated negative-reply cap, so their complete reply lists are retained. Live matching/timing/mood selection and reward integration remain open.

F07 live progress: first visiting pair now runs Opening Day with mood-based positive/negative reply selection, deferred speech during shots/separation, transcript persistence and a recorded ending. Browser speech and negative-retry/save/positive-completion tests pass. Original timing/thresholds, other story pairings, persistent returning relationships, membership conversion and commemorative rewards remain required.

F07/F10 report follow-through: golfer-story report exposes transcript and status on desktop/phone; restore reconstructs progress from scripted dialogue and validates speaker order/counts. Commemorative rewards, membership conversion and other stories remain open.

F09 original data: imported 95 documented professional roster records (names, appearance selectors, raw/decoded skill caps, unclassified trailing metadata). One malformed Brad Fiction source row is retained for investigation. Use this catalog when implementing original opponent selection; do not substitute caps for actual allocations or invent eligibility from unexplained suffix numbers. Full story pairing-code research remains open.

F07 reward progress: Opening Day now unlocks a free, placeable commemorative garden. Owner commands validate the site and record a single claim across retries, reload and demolition. Browser placement/cancellation and zero-cash/invalid-site tests cover this loop. The garden reuses flowerbed graphics/effects; original reward selection/catalog, memberships and the remaining story pairings remain open.

F03/F09 opponent tactics: local competition professionals now compare draw, fade, backspin and punch against straight shots using the same collision/roll simulation. A bounded shortlist limits added planning work. Tests cover curved flight around trees, low recovery flight and spin on approaches. Remaining: multi-shot route planning, visitor skill-dependent strategy and original-runtime AI comparison.

F07/F10 persistent roster: visiting golfers are retained after departure with round count and best score, independently of the 100 recent scorecards. Reports → Membership roster and F9 work on desktop/phone. Verified 105 completed rounds, deterministic reload, legacy reconstruction and duplicate-name identities. Membership conversion/tier benefits/resignation, returning visits and housing remain unimplemented; source evidence confirms their existence but not numerical eligibility.

F07 return visits: happy departing golfers can return with a new playing partner, preserving ID/name, base skills and learned training. Fresh round IDs keep fees and round totals separate; live-actor exclusion prevents simultaneous duplicates. Return delay (120 simulation seconds), mood cutoff (60) and one-returner/one-newcomer pairing are provisional. Membership tiers, eligibility, resignation, broader relationships and original return cadence remain open.

F03 source correction: Imagination-skilled visitors now select curved, spin and punch shots through a bounded shared planner; unskilled visitors retain straight shots. Real visitor-update tests cover tree clearance and RNG/save determinism. Route-search coefficients remain provisional. New source review also identifies pending corrections to initial visitor population/invitations, happiness-linked fees, membership snap-shot criteria, and terrain elevation cost; see references/observations/sid-design-notes.md.

F04 fidelity correction: raising/lowering land is now free, including with zero or negative cash. Terrain protection, height bounds and bridge/stake costs still apply. Verified brush edits, unchanged ledger, duplicate command receipts after restore and browser terrain/aim behavior. This resolves the elevation-cost item from the Sid design-note review; other economy/population corrections remain open.

F01/F09 course categories: complete tee/green pairs determine Municipal (0–5), Golf Course (6–9), Country Club (10–17) or Championship (18) status. New allocations and new rounds use 60/80/100 percent course caps; 18 holes remove the course cap. Imported higher allocations remain saved while effective round skills are capped. Outstanding: earned points/skills above 100%, original behavior after hole removal and imported-profile cap handling verification.

F06 economy correction: per-hole fees now use saved happiness points at completion ($100 per point), replacing the flat prototype charge. Flowers/services raise points and neglect/waits/penalties lower them; incident keys suppress per-frame repeats. Original initial happiness, full positive shot/scenery feedback, difficulty/personality influences, membership bonuses and final economy tuning remain open. Current 0–100 mood still drives older story/return decisions and needs unification with the original model.

F06 positive-shot feedback: a clean approach of at least 40 yards that holds the golfer’s own green earns one saved happiness reaction per hole. Excludes putts, chips, wrong greens, obstruction and penalty landings; real flight/completion/reload tests verify the fee includes the benefit once. The 40-yard threshold and per-hole limit are provisional, not original snap-shot criteria. Remaining: additional successful-shot/scenery reactions and source-backed membership/accomplishment recognition.

F08/F10 fun-rating foundation: recognized positive/negative reactions now feed per-hole fun observations, averaged from each completed golfer’s net comments divided by actual shots. Course report sums observed hole fun and shows sample counts on phone/desktop. Penalty strokes do not inflate the shot denominator; old observations without complete reaction history remain unmeasured. Remaining: original reaction coverage/timing, aggregation verification, classifications, SGA thresholds and fee/legacy-mood unification.

F08 report classifications: derive Breather/Freeway/Precise/Creative/Challenge/Heroic/Strategic/Classic from measured cohort advantages. Original names and combinations verified in golf.exe tutorial strings. Non-Classic >0.50 cutoffs are provisional fan-source guidance; Classic uses the primary-attributed all-skills >=1.00 target. Missing cohorts and the ambiguous all-skills-between-0.50-and-1.00 case remain unclassified. Pending: original sample gates, boundary rules, recognition events and career/SGA rewards.

F08 shot analysis: Reports → Shot analysis (or `/`) lets the player pick ground and compare All skills / No Length / No Accuracy / No Imagination. Uses actual visitor targeting and physics on disposable copies, three fixed dispersion samples per case; colored lines show one sample per case. No live course, RNG, money or score changes. Tested browser flow, phone layout, cancellation, state isolation and overlay disposal. Remaining: original analysis presentation/sample behavior verification; current targeting/physics remain provisional.

F06 arrivals now depend on first-open-hole progress: both preceding golfers must hit two physical shots or finish that hole. Ballwasher/service time and travel therefore affect admissions; penalty strokes do not count as shots. Removed the recurring 24-second timetable and six-unpaid-visitor gate. The existing save population ceiling is shared with admissions at 12 live visitors (temporary performance safeguard, not a faithful population system). Remaining: initial twelve-person persistent pool, invitation-based growth, original pairing, membership tiers, downstream tee spacing and larger-population performance. Initial unbounded-admission experiment failed the 18-hole save population check and was corrected before delivery.

F06 tee spacing: the active-pair marker now reserves a tee until both golfers have made two physical shots or completed that hole, rather than reserving the entire hole through putting. Following pairs can play the same hole concurrently. This shares the arrival predicate, including conservative handling of legacy saves without shot counters. Verified actual overlapping play, deterministic restore and an 18-hole completion. Still pending: original fairway/green collision avoidance, Ranger/Marshall effects and population/invitation rules; the two-shot rule is generalized from the archived first-hole pacing description and needs original runtime comparison on later holes.

F06 visitor-pool correction: new resorts now prepare twelve persistent identities before opening. Both seats select available golfers from that saved pool, reusing learned skills and round history instead of manufacturing new visitors each arrival. Older courses preserve known profiles and add missing initial slots without discarding historical records. The pool stays fixed until membership-driven invitations are implemented. Provisional return policy: 120 simulation seconds after happy rounds, 240 after unhappy rounds; unhappy visitors no longer disappear forever and exhaust a small pool. Original return selection/delays, personalities, custom imported visitors and invitation expansion remain open.

F06/F12 clubhouse pairing: Reports → Membership roster now lets players choose two visitors as persistent partners and unpair them. Available chosen pairs receive priority; a golfer whose chosen partner is busy waits while unrelated available golfers can still play. Reassigning partners does not alter a booked round. Owner/editor session commands are validated, revision checked and retry safe; saved duplicate/unknown pair identities reject. Original personality compatibility, happiness influence and increased story likelihood remain pending; current pairing priority/return cadence need original-runtime comparison.

F06/F12 personality foundation: saved Neat/Outgoing/Active/Playful/Nice profiles now appear for selected partners in the roster. Similarity changes starting happiness once per arrival, through a documented provisional rule; learned skills and live shot RNG are unchanged. Existing rounds do not receive retroactive changes on load. Remaining: original trait scale/distribution/formula verification, personalized comments, relationship history, manual-pair story likelihood and membership decisions; legacy mood is still separate from happiness.

F09 professional selection: local championship/pro-challenge setup now offers all 95 valid imported roster names and previews their effective exhibition skills. Selected names and profiles survive event save/reload; the generic club professional remains available. Current ten-point allocations are apportioned using original cap weights, not claimed original career strength. Remaining: actual professional allocations/rankings, source appearance models, challenge invitations and resort/career settlement.

F09 graphics: selected named professionals now render with their original roster clothing/skin/color fields. Event snapshots preserve appearance separately from name/skills, supporting future user-owned appearance profiles without name-based lookup. Eight clothing styles are rendered and inspected together; named-opponent browser reload retains the mapped appearance. Remaining: original character proportions/faces/animation fidelity, visitor appearances/customization and exact sprite palette matching.

F06 visitor appearance: initial visitor identities now save body/clothing and palette codes; arriving/returning actors copy that stable appearance. Known skill cues from the archived Sid notes map all-three skills to short sleeves/pants, Length+Imagination to shorts, Length+Accuracy to knickers and Accuracy+Imagination to the defined female styles. Other prototype skill combinations use a neutral long-sleeved style; skills are never rewritten to fit the model. Remaining: appearance customization, original initial body/skill distribution, exact faces/proportions/animations and regional character detail.

F06 visitor customization: roster appearance editor now changes body/clothing style, skin and clothing colors for the selected visitor. Saving updates the live model and persistent identity without altering skills, personality, accounting or ball state. Owner/editor commands validate codes and replay once; renderer disposes/rebuilds only the changed avatar. Remaining: naming, age/portrait import and personal golfer files; original appearance UI/character art fidelity and custom pro appearance.

F06 membership/invitation loop: qualifying completed rounds now offer Basic→Silver→Gold→Platinum applications. Roster decisions accept/decline them; each accepted join/upgrade records its qualifying round and invites exactly one new persistent visitor. Original great-shot coverage, thresholds/chance and tier gates remain provisional (currently >=1 recognized great approach and happiness >=4 on a completed round). Outstanding: source-backed dues/surcharges, housing, carts, resignation, tennis/relationship effects and original limits/timing. Four separately played returning rounds and real arrival of an invited golfer are tested; invitation/history corruption and command duplicates reject.

F05/F06 dandelion feedback: distinct visitor complaints about penalties, fatigue, crabgrass, weeds or waits can seed local patches. Placement uses the separate weed random stream and existing turf/obstacle rules; repeat frames do not reroll an incident or immediately complain about its own generated patch. Probability (25%) and radius (three tiles) are provisional. Remaining: original growth parameters, no-dandelion landmark effects, Gary-specific behavior and complete comment coverage.

F06 visitor naming: Customize first golfer now includes a name field and Save name. Stable IDs retain memberships, chosen partners and returning-round identity; live visitors and roster names update together. Completed scorecards/ledger and an ongoing story's recorded names remain historical snapshots. Owner/editor commands are validated and retry safe. Verified real completion/return, reload, duplicate display names, literal markup text and phone controls. Remaining customization gaps: age, portraits, personal visitor files and original editor/art fidelity.

F09 professional progression: first par-5, nine-hole and eighteen-hole course milestones now grant three assignable points once per resort, with a Professional accomplishments report/F10. Earned budgets travel with exported golfer profiles; milestones stay with the resort. Removing/rebuilding holes cannot repeat an award. Original randomized task selection/order, precise eligibility timing, trophy art, remaining accomplishments, natural skill changes, course transitions and tournament/career settlement remain open. These initial milestone criteria use contemporary secondary-source descriptions; complete closed holes count provisionally.

F08/F09 design progression: first Challenge/Heroic/Strategic/Classic classifications now award three professional points once, based on recorded visitor score comparisons. Reports/F10 includes these awards. Changes in subsequent ratings do not remove past accomplishments or pay twice. Missing and ambiguous comparisons do not qualify. Original sampling/thresholds, changing trophy tasks and SGA recognition remain open; existing classification and secondary accomplishment sources are still provisional evidence.

F04/F06 path fatigue: paths and bridge decks now preserve more energy while golfers walk, beyond their existing routing preference. Waiting/address phases retain normal drain; the existing hotel multiplier combines with the path benefit. Half-rate walking drain is provisional secondary-source-based tuning. Remaining: original stamina coefficients, steep-path complaints, carts and staff congestion effects.

F04/F06 steep paths: uphill walking on steep path segments now produces visible visitor feedback and one negative happiness reaction per hole, feeding existing fees/fun/complaint weeds. It uses interpolated elevation gradient, including mid-segment movement; gentle paths, downhill travel and standing still do not trigger. Original level scale, repeated-slope rules, downhill feedback and carts remain open.

F06 Ranger staff: hire, deploy, rename, dismiss and save a Ranger through existing owner/editor commands. Nearby queueing/addressing visitors receive temporary, non-stacking faster walking/preparation; golfer list marks motivation with !. Staff report counts motivations. Costs/range/duration/pace and stationary area coverage are provisional. Remaining: original Marshal upgrade, staff skill development, coverage visuals, exact affect on congestion/attitudes and original measurements. Mobile staff panel now compacts during destination picking so controls do not cover the course.

F06 staff coverage: selecting an idle Ranger now shows their actual configured range on terrain. Send to area previews that range at a dry destination without mutating the simulation; leaving the mode or dispatching the employee hides inactive coverage. Phone preview, dispatch and cancellation controls were checked. Marshal/staff-development behavior and original range tuning remain open.

F06 staff capacity correction: shared hiring/save limit increased from the arbitrary prototype limit of three to sixteen, following the contemporary strategy guide. Mixed full-size staff teams work and accrue wages; dismissing frees a slot. Phone report shows the selected employee instead of concatenating every employee's details. Later forum evidence reports twenty, so executable/version confirmation is still required. Marshal/other advanced staff remain open.

F06 Cart Garage foundation: place a garage, connect its path, and new visitors receive round-bound carts. Actual travel and 3D seated cart appearance switch on paths/bridge decks/fairways; other surfaces use normal walking. Layout sharing and saves include the facility/availability independently of resort finances. Remaining: original unlock/eligibility and prices, parking/pickup transitions (cart currently appears only during supported travel), shared occupancy, resident-pro carts, exact animation and speed tuning.


F06 cart parking update: carts now remain visible where visitors leave them, persist through shots and reloads, and are collected on the next route when reachable. This supersedes the earlier moving-only cart limitation. Remaining: original garage pickup/return and eligibility rules, shared occupancy, resident-pro usage, parking location optimization, smooth entry/exit animations and handling terrain edits that strand a cart. Current per-visitor ownership and automatic pickup detours are provisional. M01–M05 remain open; this adds replayable cart state, not network multiplayer.


F06 cart routing: walking-only routes now leave the cart parked, so collecting a holed putt does not send the golfer back off the green first. Pickup remains available on subsequent paths/fairways. Verified a cart visitor completing two holes, reloading between them and leaving the course with identical future state. Original parking placement, garage return, shared occupancy and eligibility remain open.


F05 Club Pro: the basic greeting employee is implemented with hiring, area assignment, naming, dismissal, payroll, a distinct shirt and a greeted-golfer count. Nearby unpaid walking/queueing/addressing golfers receive one welcome per booked round through happiness/fun reactions. Remaining: original greeting timing/range/strength and animation, Celebrity upgrade, Marshall/angry-golfer behavior, Refreshment Consultant and staff development. Values and once-per-round deduplication are provisional, not measured original rules.


F05 Celebrity greeter: a skilled hire at six complete holes, with stronger greetings than Club Pro, normal movement/payroll/naming/dismissal, saved reaction deduplication and phone controls. Original costs, range, frequency and strength remain provisional; upgrading existing staff in place, staff development, Marshall/angry-golfer behavior and Refreshment Consultant remain unfinished. Celebrity residents/building lots are a separate missing system.


F05 Refreshment Consultant: implemented as a skilled direct hire at six complete holes. The consultant serves golfers irrespective of thirst for a per-hole attitude benefit, follows them, shares exclusive customer reservations with vendors, and releases customers on dismissal/reposition. Remaining: original service timings, wages/costs and exact benefit frequency/strength, staff upgrades/development, Marshall and angry-player behavior. Current consultant and vendor attitude incidents are separate provisional rewards.


F05 staff upgrade flow: after six complete holes, existing Groundskeepers can become Turf Technicians, Club Pros can become Celebrities, and Soda Vendors can become Refreshment Consultants. Names/history and active work survive. Upgrade price currently equals the difference in provisional hire prices. Original pricing, experience/development and Ranger→Marshall remain unfinished; prior notes saying all existing-employee upgrades are missing are superseded for these three mappings.


F05 Marshall dependency audit: `references/observations/interrupted-rounds.md` records the current accounting, pairing, reservation and visitor-history dependencies. Implement a distinct interrupted-visit outcome before angry-golfer ejection; never route ejection through completed-round accounting or award membership from it. Original anger thresholds/refunds/return policy remain unverified. This is the next substantive staff dependency; anger/ejection remain unimplemented.


F05 interruption foundation implemented: unfinished visitor rounds have separate retained records and roster counts, preserved completed-hole fees, exclusive service cancellation, partner/tee release and a departure route that waits when blocked. First interrupted visitors may return without a fabricated best/completed round. Saved itinerary/prefix validation and migrations are covered. Still needed: anger triggers/movement/reactions and Marshall intervention through this transition. Current unhappy return delay and retaining fees without refund are provisional policies, not verified original behavior.


F05 angry-golfer foundation is now live: at zero happiness plus legacy mood at or below 20, a visitor stops play, walks local routes for 20 simulation seconds, upsets nearby golfers once each, then leaves through interrupted-round accounting. These trigger/timing/radius/patrol choices are provisional; the original manual establishes the behavior but not its numeric rules. Remaining: Marshall travel/intervention, exact original anger/recovery/resignation policy and more expressive character animation. The 18-hole regression now includes real maintenance/service staffing because its previously unmanaged layout produces walkouts.


F05 Marshall foundation implemented: skilled direct hire or Ranger upgrade, local angry-target selection, real travel, ejection through interrupted-visit accounting, exclusive pursuit, reassignment cancellation and Ranger-style motivation. This completes foundational behavior for the eight manual-listed basic/skilled employee roles. Original staff experience/development, names/animation parity, exact unlock/price/range/selection rules and anger policies remain unverified. Current local coverage and one-second pursuit replanning are provisional.


F08/P01 original catalog extraction: all sixteen location/name/bonus-label entries and original IDs are now imported from the supplied executable with a pinned SHA-256, fixed-width parser, retained source offsets and undecoded numeric bytes. Two extraction/corruption tests passed. See `references/observations/property-identities.md`. World Screen behavior, property prices/geometry/bonuses and transitions remain open; no invented map catalog or duplicate-terrain properties were added.


F08 world-map coordinates: static code references plus alignment on the supplied WorldBase artwork now support decoded map positions for all sixteen properties. A standalone source-reference inspector and three passing catalog/browser checks preserve this evidence. World Screen implementation, numeric setup-field semantics and original property terrain/progression remain open.

F08 world-offer setup: reconstructed the original RNG-driven property assignment, purchase-slot costs in explicitly internal units, and displayed acreage calculation from the supplied executable. A pure deterministic module retains entry seed, final RNG state and draw count for future authoritative career generation. Six catalog/setup/browser checks pass. No live career-state integration yet; currency scaling, setup-code meanings, property terrain/bonuses, ownership and transitions remain open. M01–M05 retain their full multiplayer scope.

F08 property description/price decoding: original World Screen string switches establish environment (parkland/desert/tropical/links), geography (inland/coastal/island) and relief (flat/rolling/hilly). Catalog and deterministic offers expose them. Two display call sites establish cost ×100 in Simoleons; displayed slot prices are §50,000–§1,000,000. Eight focused checks pass; the reference inspector now shows these labels. This resolves the preceding currency/setup-label uncertainty, but physical terrain generation, original flag semantics, bonuses and career integration remain open.

F08 World Screen browser integration: Club menu now opens a responsive property preview using the extracted catalog and original deterministic offers, with all sixteen locations, prices, acreage, terrain descriptions and bonus labels. Two desktop/phone UI checks pass alongside eight catalog/setup checks; build passes. Initial checks found and fixed the inherited dialog width cap and missing mobile menu accessible name. This is explicitly a preview world, not career ownership or purchasable/generated properties. Continue with original terrain generation, bonus setup and authoritative career transitions. Multiplayer scope remains M01–M05.

F08 original property boundary pass: added a pure reconstruction of acreage-based edge trimming on the original 50×50 grid, including three-sided coastal trimming, randomized island edges, raw terrain writes and island flag clearing. Extracted the original RNG into a shared utility; world-offer fixtures remain stable. Ten focused checks passed, with four boundary checks rerun after a static-review correction to coastal orientation. Build passed. This is one generation pass, not a complete property generator: trace the earlier height/terrain/bonus stages and migrate the current fixed 45×42 world before live integration.

F08 elevation reconstruction: added original 324-draw noise initialization, wrapped bilinear sampling at two scales, and relief/purchase-slot divisor settings. Ten focused checks passed, plus a rerun with independent integer sample fixtures. Terrain overrides, existing-height handling, desert adjustment and the minimum-height condition still need reconstruction before applying this to playable properties. Current live terrain remains unchanged.

F08 generated-height branch: original noise now feeds a deterministic tile-height sampler with terrain-code overrides, desert column adjustment, original integer division and explicit minimum-height flag. Five focused checks pass, including complete 50×50 sample maps for each relief setting; build passes. Synthetic terrain inputs are not original property generation. Remaining terrain initialization, stored-height behavior, flag lifecycle, bonuses and live integration are still required.

F08 initial terrain patches: reconstructed original base terrain selection and environment-specific random walks, including Christmas Pines' exception, write budgets, RNG order and flag modifications. Nine focused checks passed; the patch tests also use an independent Python map hash and final-RNG fixture. Later water/scenery passes, companion terrain metadata, bonus placement and live property integration remain unfinished.

F08 coastline pass: reconstructed coastal strip painting, its soft width correction, existing-water skip behavior, flag preservation and exact RNG continuation. Independent Python map-hash fixture added. Five coastline/generated-height checks pass; build passes. The preceding river pass and subsequent 51×51 vertex-height array still need composition with terrain metadata and scenery before playable property integration.

F08 river pass: added original candidate scoring, strict tie handling, reversal avoidance, bank painting, desert channel codes, island skip and RNG continuation. Noise accepts the original outside-map probes. Eight river/coastline/elevation checks and build pass. River memory callbacks expose unresolved original surrounding-memory and companion-metadata requirements; generation stages still need composition, scenery/bonus reconstruction and live property integration.

F08 generation composition: connected terrain patches → river → coastal strip → temporary flag cleanup → 51×51 vertex heights in a deterministic pre-scenery stage. All sixteen catalog properties pass composition checks with explicit synthetic memory fixtures. Noise and terrain entry seeds, initial flags and surrounding memory remain explicit inputs; no invented production defaults. Continue at original routine 0x4708b8 for scenery and bonuses, then final boundaries and live integration.

F08 secondary feature patches: reconstructed24 environment/height-dependent terrain patches, Jurassic Springs' override, protected-tile behavior and RNG continuation. Two focused checks and build pass. Static tracing exposed initial patch coordinates beyond the terrain map; callbacks preserve these without guessed memory/clamping. Resolve original surrounding-memory effects and global feature-level semantics before composing this pass. Scenery objects, bonuses and live properties remain unfinished.

F08 difficulty decoding: traced the original menu through its return value to the shared generation global. Easy/Moderate/Difficult/Impossible now drive named generation settings, replacing unexplained minimum-height and feature-level inputs in composed stages. Six checks and build pass. This resolves the normal difficulty interpretation; special internal values and non-generation difficulty effects remain open.

F08 secondary-patch composition: connected original feature patches with correct tile/vertex flat addressing and the subsequent flag/terrain cleanup. The apparent column overflow aliases valid array positions; no clipping or extra-memory guesses are needed for this pass. Six focused checks cover16 properties across4 difficulties; build passes. Continue from0x470b84 for scenery scatter and later bonuses, then final boundaries/live integration.

F08 flag scatter: added original terrain exclusions, difficulty-dependent accepted counts and duplicate-preserving RNG order for flag0x0100. Two focused tests and build pass. Its visual semantics remain undecoded, so no invented scenery objects were added. Continue with neighboring vertex shaping at0x470c23 and later placement/bonus stages.

F08 vertex-edge shaping: reconstructed sequential height adjustments around terrain17/18, including neighbor suppression, byte writes and conditional RNG draws. Five focused edge/scatter tests and build pass. Original loops also read terrain flat index2550: composition must supply this extra explicit backing-memory byte rather than guess it. Later placement begins at0x470d69; complete metadata, bonuses, final boundaries and playable property integration remain open. Multiplayer requirements remain tracked under M01–M05.

F08 edge-stage composition: combined generation now reaches0x470d69 with explicit51-byte trailing terrain memory, aggregate RNG continuation and unchanged caller inputs. Seven focused tests cover all16 properties ×4 difficulties and prior stage regressions; build passes. Padding values and entry seeds still need original-state evidence. Next: decode placement helpers0x40d880/0x40dcf0 and property-specific branches, then metadata/final boundary/live integration.

F08 placement feasibility: reconstructed original footprint/border validation, terrain/flag restrictions, existing-object matching and signed clearance-cost additions from0x40d880. Start footprint is4×4 (type15). Three focused tests and build pass. Terrain metadata values and mutation helper0x40dcf0 remain required before integration; no original costs or object identity were invented.

F08 startup terrain metadata: found original23-record table and initialization copy; added checksum-pinned extraction and explicit startup metadata accessor. Five focused metadata/placement tests pass against executable bytes and original clearance values. Runtime table changes and complete placement mutation remain open before live property integration.

F08 original starting-location search: retained base terrain code and added candidate selection with original row/column RNG order,4×4 feasibility checks and retries. Four selection/composition tests pass across16 property identities ×4 difficulties and varied slots. Placement terrain writes, record allocation, extension sizing and final0x42ee80 update remain to implement before live generated-property integration.

F08 building registration: added first-free record allocation, original field writes, extended footprint ownership and tile flag updates. Four registration/start-selection tests pass. Full-table out-of-array scanning is replaced by an explicit capacity diagnostic. The post-placement0x42ee80 routine rebuilds derived map arrays and still needs decoding, alongside terrain painting and live integration.

F08 building terrain painting: reconstructed footprint sizing, original vertex flattening exception, terrain/metadata/flag writes, special type patterns and type10 RNG order. Four painting/registration checks pass, including their composition. Final derived-map rebuild and authentic size/metadata initialization still need integration before playable property construction.

F08 derived-map first pass: reconstructed directional corner-height selection, terrain extrema/cache rules and the initial2500-tile height-cache traversal. Two focused tests pass. Remaining0x42ee80 traversals and stored-height sampling are still required before complete placement composition and live integration.

F08 surface propagation: reconstructed repeated original neighbor-minimum/maximum passes, matching-terrain restrictions and building ownership boundaries. Four propagation/corner-height checks pass. Final edge-mask traversal0x42ec10 and full placement composition remain open before live integration.

F08 derived-map composition: added final corner-comparison edge masks and combined all decoded0x42ee80 passes with original origin/global flag updates. Six focused tests pass. Stored-height sampling and runtime metadata remain explicit integration requirements; next compose full building placement and generated properties without guessing these inputs.

F08 stored-height integration: reconstructed0x40be60 stored branch and exposed extracted terrain flags/shape for the complete map rebuild. Six focused tests pass, including boundary exceptions and actual startup building metadata composition. Next verify generation's stored-mode transition and runtime table setup, then compose placement into the property pipeline.

F08 complete placement composition: painting, registration and map rebuilding now execute together with post-mutation height readers and preserved negative-flag behavior. Six focused tests pass. Caller height-mode state, runtime object table setup and property-specific follow-up placement remain required before generated-property gameplay integration.

F08 facility identities resolved: corrected record boundary to0x4c16a8, extracted16 startup facility names/sizes/cost units and connected clubhouse size to original starting selection. Three focused tests pass. Type15 is Clubhouse,10 Driving Range,12 Marina; prior ambiguous name inspection is superseded. Regional renames, cost scaling and entry extension state remain open.

F08 clubhouse pipeline: composed reconstructed terrain through clubhouse placement and original caller flag/coordinate writes, with synchronized backing memory and aggregate RNG continuation. Three focused tests pass, including16 identities ×4 difficulties. Synthetic placement-entry state remains explicit; authentic initialization, bonuses, final boundaries and live property integration are still required.

F08 free-facility bonuses: reconstructed five original property branches, their facility types, side selection and connecting flag writes. Three focused tests pass. The0x42ea40 follow-up, regional naming, additional landmark conditions and other property bonus branches remain open before full generation/live integration.


F08 connection integration: connected free-facility placement to the original clubhouse flood and record connection update using extracted signed terrain spread metadata. Focused checks pass, including five generated clubhouse/bonus pairs. Remaining bonus branches and authentic initialization still apply.

Playable property integration prerequisite confirmed in source: simulation/world.js hardcodes45×42 GRID, entrance and blocked clubhouse/scenery coordinates. Grid/world imports also reach game.js, session.js, course-package.js, construction, maintenance, rendering/course.js, hazards, landscape and play.js. Introduce per-course geometry/entrance/scenery definitions, migrate existing saves without changing their layout, and route rendering, pathfinding and portable-course validation through that definition before enabling original50×50 generated properties. Do not crop generated maps or silently relocate their clubhouse to fit the prototype.

## Landscape generation and land expansion — requested September 6

- Implemented initial adjoining-land purchases: three southern parcels, 450 tiles each, authoritative finance command, saved ownership, seeded editable hills/hollows/ponds. Prices ($15k/$22k/$30k) are provisional balancing, not verified original values. Existing course geometry is preserved.
- TODO: generate complete new properties with randomized elevations, rivers, ponds and coastlines, with a seed and preview; retain rounded tile-based shapes and green borders. The starting Willow Brook terrain remains the fixed study; expansion terrain is the first live procedural step.
- TODO: California coast — bluffs, Pacific shoreline, golden rough and coastal vegetation.
- TODO: Ireland coast — green links, dunes, rugged shoreline and exposed rocky terrain.
- TODO: Spain dry landscape — ochre soil, sparse scrub, dry hills and irrigated turf.
- TODO: Colorado dry landscape — red rock, high-desert relief, sparse vegetation and river corridors.
- TODO: matching randomized ground materials/texture variation, regional trees, scenery, water edges and dandelions; no photorealistic styling. Region selection and terrain previews before starting a new property.
- TODO: per-property grid geometry for expansion on every side; initial purchases extend south to preserve existing saved tile IDs.
- Regression follow-up: `guest-roster.spec.js` long-run turnover expects 105 completed rounds within its fixed simulation window; current unchanged-size (42-row) and expanded-size (72-row) runs both reach 65 after preserving owned-area weed sampling. Investigate the existing visitor/anger turnover expectation separately. Land expansion focused checks pass (16/16); broad run passed 371/372 before the weed-sampling correction.

### Generated starting landscapes — live continuation

- New-course setup now offers rolling parkland and river valley, with deterministic seed, reroll and an actual terrain preview. Generated elevations, ponds and streams use ordinary editable tile/elevation state and survive save/load and course exports. The clubhouse approach is reserved and level; the original study remains selectable.
- Starting a course keeps one previous-course backup, with a Restore previous course control. Previewing or cancelling does not replace the current course.
- This generator is a playable prototype, not a claim of original generation parity. The original 50×50 generator, regional building placement and World Screen property acquisition still require integration. Regional textures and California/Ireland coastal and Spain/Colorado dry environments remain unfinished.
- Verified: seven generation/purchase tests, production build, desktop preview/render and phone setup. Manual restore returns to the previous saved terrain.

### Ground-release fidelity continuation

- Fixed crossed-surface resistance for rolls and putts, including bunker-before-water stopping and short releases near shore. Shared deterministic simulation, protocol 55; no client-only physics.
- Verified generated river course through an actual paid round after constructing its required bridge. Sixteen targeted terrain/generation/competition-save tests and production build pass; earlier 26-test terrain/session run passed before the final short-release edge correction.
- Remaining physics fidelity: original-runtime calibration, slope integration along the full rolling trajectory, terrain interception during flight, and region-specific conditions. Current shot presentation still uses its stored endpoint and existing bounce animation.


### Returning story partners (protocol 56)

- Opening Day pauses when either golfer leaves and resumes when both original persistent visitor IDs return together as a pair. Chapter, reply phase and transcript survive; unrelated partners cannot take over the story. Completed stories and the 128-reply safety limit do not restart.
- Reports distinguish waiting for returning partners from an exhausted conversation. Fourteen story/reward/session tests and the production build pass.
- The return timing and same-pair condition are prototype relationship rules, not verified original-runtime behavior. Nine remaining Standard stories, original filename pairing-code rules and the complete original relationship/reward system remain unresolved.

### Swim Club — protocol 57

- Added the original Tropical recreation counterpart through the facility catalog, authoritative construction/finance commands, rotation, overlap checks, connection-dependent starting attitude, reports, save/load and portable courses.
- New pool/terrace/pavilion/seating model and palette icon; checked in the browser. Thirteen facility/palette/rotation tests and production build pass.
- Still required: region-driven facility substitution (Parklands Tennis Court, Links Stable, Desert Spa, Tropical Swim Club), remaining regional models, original prices/footprints and runtime behavior comparison. Current prototype exposes Swim Club alongside Tennis Court.

### Regional recreation catalog — protocol 58

- Added Links Stable and Desert Spa: distinct modeled buildings, construction icons, rotation, reports, placement/overlap validation, connected starting-attitude effect, saves and immutable course exports. These complete the four named recreation variants in the supplied manual (Tennis Court, Stable, Spa, Swim Club).
- Fourteen focused facility/palette tests and production build pass. Browser-rendered Stable and Spa were visually inspected.
- Still incomplete: selecting the appropriate variant from an actual original region, original cost/footprint calibration, regional architecture elsewhere, and any original facility animations. All four are currently exposed as prototype construction options and share a single non-stacking effect.

### Course environment selection — protocol 59

- New-course setup selects Parklands, Links, Desert or Tropical. Recreation substitutions are now enforced by construction commands as well as palette visibility: Tennis Court / Stable / Spa / Swim Club respectively. Saves and immutable course packages carry the environment; malformed IDs and mismatched recreation facilities reject on restore.
- Existing saves with no environment retain their mixed prototype catalog and existing buildings. No environment is silently assigned to them. This compatibility case is explicitly represented by null in exported layouts.
- Eighteen environment/package/generated-course/regional-building checks and build pass. A follow-up environment-only run covers restore rejection for mismatched buildings.
- Still incomplete: regional terrain, textures, trees, clubhouse and other building substitutions; original World Screen property acquisition/identity; property-specific bonuses, pricing and full generation parity. The setup UI states that regional scenery is still to come.

### Marina, helipad and airstrip — user request, protocol 60

- Buildable Marina (7×5 tiles), Helipad (5×5), and small Airstrip (31×7). The runway is nearly six helipad widths long, with an apron, hangar, light aircraft and windsock; marina has a dry building/quay and three water berths. These are deliberate semi-realistic game proportions, not full airport scale or verified original dimensions. Helipad is explicitly user-requested.
- Rectangular, rotated footprints now govern construction, overlap/path blocking, hover outlines, connected entrances, elevation protection, demolition selection and course export. Marina checks dry/wet sides in all four orientations and retains underlying water on removal. Transport sites reject more than half a level of unevenness. Construction costs are provisional: $4,500 / $6,000 / $14,000.
- 27 focused transport/rotation-related editing/environment/bridge/path checks and final build pass. Marina in Parklands/Desert plus runway/helipad were visually inspected in the browser. A previous targeted run passed 21/22; the failure was a test expecting explicit exported rotation 0, which the existing package format omits. Corrected to its defined zero default and reran successfully.
- Marina/Helipad building-lot benefits remain pending. Airstrip fee benefits are now implemented (see protocol 61 below). Arrival/departure animation remains optional visual work; no transport traffic is simulated.
- Regional rough-ground palettes now render Links, Desert and Tropical from saved environment; Parklands/legacy appearance stays the same. Turf surfaces retain their existing separate colors/collars. Regional vegetation, architecture and true coastline generation remain unfinished.

### Airstrip economics — protocol 61

- Verified the original manual's actual functions: Airstrip increases per-hole fees; Marina/Desert Helipad/Links Church improve building-lot profit and International Celebrity residency chance. Arrival-service assumptions are not supported by this passage and are no longer the prerequisite for making these facilities functional.
- Connected Airstrip now adds a provisional 25% to paid hole fees. Shared simulation calculates it, score history stores the bonus, ledger and hole/course totals receive the payment, and save validation verifies the snapshot without consulting today's facility layout. Scorecards identify the included Airstrip bonus. No pro charge or duplicate facility stacking.
- Actual-round payment/save and forged-snapshot checks pass. The prior 18-test batch had 17 passes and one fixture failure caused by an unhappy zero-fee round; the corrected playable fairway fixture passes its positive-payment assertion. Production build passed before the final scorecard text change.
- TODO: measure original Airstrip amount; implement SGA fee bonuses and documented cumulative behavior; implement building lots and Marina/Helipad residency/value effects; add Church/Castle/Casino/Theme Park counterparts. Preserve user's explicitly requested transport construction options.

### Building lots and home sales — protocol 62

- Added 3×3 Building Lots ($500) to Build → Resort, marked vacant plots and compact home models. Connected lots sell to persistent golfers who have completed a round; a golfer buys once, even if that home is later demolished. Sales create one ledger receipt and a saved buyer record; the lot becomes a home.
- Provisional valuation: $3,000 base, $500 nearby water, up to $1,000 planted trees, $500 nearby observed positive-fun hole. Connected Marina or Helipad adds 25% once, without stacking. Original manual pp.19–20 confirms the qualitative scenery/fun/transport relationship, not these amounts, eligibility or timing.
- Shared simulation owns transactions; locked practice does not sell houses. Course packages retain home geometry but omit buyer/payment history. Protocol 61 saves migrate. Sale validation checks buyer identity, uniqueness and matching ledger payment.
- Four housing tests cover a real completed round, persistence, payment tampering, valuation/non-stacking, locked play and browser construction. Related course package, session and transport checks pass; production build passes. Vacant lot and home visuals inspected.
- TODO: original buyer eligibility and timing, measured prices, natural scenery valuation, celebrity residency, resident inspection UI, regional home architecture, and Church counterpart. Housing is an initial playable loop, not full original fidelity.

### Housing inspection

- Reports → Homes and building lots now shows vacant-lot access and estimated value, saved buyer names, sale totals, site value and Marina/Helipad bonus at purchase, and ledger receipt numbers. Historical sales remain visible after demolition. Imported homes explicitly have no imported buyer or income history.
- Read-only UI uses text nodes for saved names and values. Phone-width browser checks cover an actual completed-round sale, historical receipt, unchanged funds, disconnected-lot guidance and imported-home disclosure; phone rendering inspected. Production build passes.
- Remaining housing fidelity: original buyer eligibility/timing/prices, natural scenery and celebrity residents, regional models. The report resolves the basic resident inspection backlog item; selecting a home directly on the map remains a useful follow-up.

### Coastal terrain foundation — protocol 63

- New-course landscape selector adds Coastal course: seeded bays/headlands along the eastern edge, rounded tile water boundaries and inland relief. The same shoreline function continues into purchased southern parcels. Saved landscapeStyle controls future land purchases; previous saves keep prior behavior.
- Fixed protected scenery remains on land outcrops instead of being submerged. Course exports preserve editable shoreline geometry. Original generator parity, ocean rendering beyond the property boundary, coastal vegetation, beaches/cliffs and distinct California/Ireland treatments are still unfinished; this is the terrain foundation, not completed regional art.
- Three focused tests cover repeatable coast/land purchase/save, a real played coastal hole plus shared terrain, and browser selection/preview. Existing generation/purchase checks passed in the broader run. Initial export correctly rejected protected scenery under water; generation now preserves those sites. The subsequent comparison was adjusted to account for intentional omission of live turf wear in shared courses. Final coastal checks and production build pass.

### Offshore coastal presentation — protocol 64

- Coastal courses now draw textured water beyond the eastern build boundary and omit background trees/grass from that offshore area. Water contours continue beyond the editable canvas, removing the artificial grass divider between shoreline water and ocean.
- Course packages now carry landscapeStyle so shared coastal courses retain offshore presentation. Ownership, collision, construction and shot decisions still use simulation geometry; the decorative ocean does not grant buildable land. Protocol 63 saves migrate.
- Seven coast/course-package checks pass, including played course export, isolation and browser flows. Coastal visuals inspected and refined to match water grain at the join; final coastal rerun and production build pass.
- Remaining coastal art: region-specific vegetation/architecture, cliffs/dunes/beaches and shoreline animation. Fixed scenery outcrops and a simplified eastern ocean remain a prototype rather than original World Screen property parity.

### Full regression audit after coastal/housing work

- Full 414-test run: 413 passed; one previously known roster test failed on its fixed throughput window (65 completed rounds instead of 105). A longer real simulation reached 105 rounds at approximately 11,480 seconds with the expected 100 retained scorecards. Visitors continue returning; this is not a deadlock.
- Corrected that history-retention test to allow the slower unhappy-course turnover and distinguish the ended round from a later visit by the same persistent golfer. It retains the 105-round, 100-scorecard, aggregate count, stable-identity and exact-resume assertions. All three roster checks pass in the focused rerun. The full run had already loaded the earlier test; it is not reported as an all-green full rerun.
- Fixed live reports naming residential homes and describing vacant sites instead of displaying undefined or service visits. Visitor fee estimate now includes the same connected-Airstrip calculation as settlement. Focused browser checks cover both UI fixes; fee and housing-report checks plus production build pass.
- This verifies the current prototype's regression coverage, not original-game fidelity or completed multiplayer networking. Remaining original systems and regional presentation remain active backlog work.

### Links Church — protocol 65

- Added the original manual's Links counterpart to the Marina: a 5×5 Church with stone nave, pitched roof, tower and illustrated build icon. Available on Links and legacy mixed-catalog courses; construction authority enforces the environment. The user's Marina and Helipad options remain available.
- A clubhouse-connected Church supplies the same non-stacking home-sale bonus as Marina/Helipad. Housing reports name all three. Cost $4,500, footprint and 25% strength remain provisional; celebrity residency is still pending.
- Twelve Church/environment/housing checks pass. Rotated geometry survives saves and shared courses, connection controls value, and non-Links placement rejects. Browser model inspected; inverted roof panels corrected and focused browser checks rerun successfully.

### Version 1.0.0 release preparation

- Major standalone browser rebuild packaged as a playable preview. Full release test run: 417/417 passed; production build passed. Source and review documentation are committed under simgolf-reborn; original local game binaries and dependencies are excluded.
- Production cutover from the repository-root application remains separate. Full fidelity, cloud saves and multiplayer networking remain unfinished.

### Editable scenery trees — protocol 66

- Removed the fixed-scenery restriction from terrain editing on owned land, retaining the clubhouse footprint. Both original scenery trees and planted trees can be removed; scenery-tree clearing is stored in saves and course packages. Click a visible scenery tree with Remove to select its trunk cell.
- Original scenery instances now update height when the terrain changes and hide when cleared. Their established visual shapes and seed are retained. New construction requires clearing a scenery tree first. Land outside ownership remains unavailable.
- Tests cover every owned original tree, raising/lowering, clearing, save/export persistence, browser selection/removal/reload and rendered trunk height. Related editing, landforming, shared course and session checks plus production build pass.
- Follow-up rendered-height test exposed a dependency on implicit global landscape state. Scenery updates now take terrain height directly from the supplied course; all three tree-specific checks and final build pass after that correction.
- Tree-covered terrain interaction: Raise/Lower now picks visible scenery and planted tree geometry, targeting its ground cell instead of a tile behind the canopy. Removal uses the same nearest-tree picking. Planted tree rendering also takes height directly from course state. Eight tree/rendering/browser checks pass, including raising and lowering both tree types without removal.

### Natural-tree flight obstruction — protocol 69

- Natural scenery trees now obstruct airborne shots through the shared simulation, using their deterministic positions, sizes and trunk heights. Clearing a tree removes its obstruction in live resorts, saved games and shared-course practice. The visual random sequence is unchanged. Planted-tree collision remains supported.
- Collision heights follow edited terrain. Actual strikes drop the ball through the existing obstruction animation and resume identically from a mid-flight save. Protocol 68 saves migrate; competition recordings remain ruleset-pinned.
- Verified all 165 inland and 117 coastal tree positions against the previous committed generator; no scenery moved.
- Flight envelopes and drop behavior remain provisional, not measured original-game physics. Ground-roll trunk collisions, putting slopes, detailed branch response and original-runtime comparison remain open.

Validation: all 432 regression tests passed in 5.1 minutes; production build passed.

### Ground travel and access beside trees — protocol 70

- Ground roll and putts now stop at natural and planted trunk footprints. Segment tests prevent passing through narrow trunks, including backwards release and longer travel after crossing onto faster turf. Clearing trees removes the obstruction from saved and shared courses.
- Golfers can approach a ball beside a trunk through an adjacent walkable tile, rather than receiving an automatic penalty because the whole tree tile was treated as unreachable. Approach and departure routes avoid the trunk. Ordinary routing still does not traverse tree tiles.
- Six focused checks cover natural trunks, near misses, water beyond a trunk, backwards/extended roll, escape from legacy inside-trunk positions, actual planted-tree putts, save resumption, shared-course clearing, protocol 69 migration and safe approach/departure. Related collision, session, competition replay and shot-planning checks pass; production build passes.
- This is a provisional stop response. Original-runtime deflection/bounce measurements, detailed roots and branches, and full putting-slope fidelity remain open.

Validation: full 438-test suite passed in 4.7 minutes; production build passed.

### Automatic-putting controls

The existing automatic-putt eligibility now drives the UI as well as simulation: shot shapes are disabled, manual flight aiming is hidden, and clicks cannot trigger an early putt through the browser controls. Practice headings describe the current activity. Unattended putting and mid-lineup resumption are tested. The existing range/timing/accuracy rules remain unchanged; tricky-green and tournament fast-green behavior remain open. See `references/observations/putting-controls.md` for the source check and its limits.

Validation: putting, skill, trunk-roll and competition-save checks passed (16 tests), browser play-through checks passed (9 tests including the earlier putting checks), and the final four-test putting/control rerun plus production build passed. The latest full-suite baseline remains the preceding 438-test run.

### Original tricky-green calculation recovered

Static inspection of the supplied executable identifies ordinary/tricky green as terrain code 1 with variant byte 0/255. The target green's high bit subtracts 10 from a putting tolerance calculation. A reconstructed, isolated helper preserves bounded random draws, short-putt suppression and distance bands; five tests pass, including selected instruction bytes checked against the supplied executable. See `references/observations/tricky-green-executable.md`.

This is source recovery, not a playable tricky-green feature. Upstream golfer/difficulty mappings, construction/persistence/rendering integration and original-runtime comparison remain open. A separate apparent deflection branch has unproven reachability and must not be used as evidence for arbitrary random bounces. No production rules or deployment changed in this step.

### Original putting attitude correction

Confirmed the raw putting byte is Attitude, using the original UI's signed jump table and labels. Corrected the isolated helper's misleading `ability` name to `attitude`; determined (1) still receives the reduction, pumped (2) does not. Seven focused tests cover the recovered slice, including all attitude labels checked against the executable. The upstream window arithmetic is recorded with unresolved flags explicitly identified. Live tricky greens, original attitude transitions, skill activation and browser integration remain open; no live rules or deployment changed.

### Original putting facility and skill inputs

Recovered the upstream putting window with integer rounding and eligibility masks. Identified the adjustment table entry as the Putting Green facility (type 6), rather than game difficulty, and the fifth golfer skill byte as Accurate Putter through the original skill UI. Twelve focused tests cover the calculation, flags, ordering and executable labels. Remaining: original facility activation/upgrade limits, attitude transitions, heading application and an integrated tricky-green editor/save/replay/physics change. The helper remains isolated; no playable feature or fidelity completion is claimed.

### Original green curvature update

Traced the putting error field into ground movement: the original adds half its signed value to heading each eligible green update, and conditionally reverses it after an RNG draw gated by the shared phase byte. It applies on ordinary greens as well as tricky ones; it must not become a one-off aiming rotation. Added a deterministic recovered step with 32-bit wrapping and saved-state continuation checks. Sixteen focused tests pass. Original movement timing, friction, slope, cup detection and live construction/course-package/physics integration remain unfinished. No production rules or deployment changed.

### Original ground resistance and stop state

Recovered ground resistance/slope response and connected it to the isolated green-curvature update. Identified the startup terrain roll coefficient and the separate origin-green override. Added the exact low-speed/zero-height/zero-vertical-speed stopping predicate for use after bounce handling. Twenty-four focused checks pass, including multi-update decay and saved-state continuation. Still not live: original position stepping, terrain slope sampling, bounce/cup handling and timing remain required before replacing browser physics.

### Original directional position stepping

Reconstructed the original direction wrapper, integer lookup interpolation and coordinate/height update. A flat-green test now combines initial curvature, position movement, ground response and slowdown, preserving the final state across save/resume. Five new checks and 22 existing putting/ground checks pass. Original x87 table samples and adjacent BSS word still need runtime verification. Live replacement still requires launch speed, cup/hazards/bounce, slope sampling and original timing; no deployment change.

### Original cup-capture decision

Recovered the ground-path cup capture: required cell flag, map/terrain eligibility, strict speed limit, club-dependent radius and centre snap. Five focused tests pass, including a rolling sequence using recovered movement and ground response. Original scoring/audio/animation transition is still separate; launch speed, timing, slopes, bounce/hazards and complete live integration remain open. No deployment change.

### Original gravity and ground rebound

Recovered post-integration gravity and the ground rebound calculation, including the terrain bounce coefficient, boundary minimum, signed-product division, maximum rebound and small-bounce cutoff. A vertical flight/landing/rebound test settles and resumes deterministically. All 39 focused recovered-physics/terrain checks pass. Live terrain/collision/scoring/timing integration and original runtime comparison remain open; no deployment change.

### Original putt strength and composed flat-green test

Recovered the original rolling-range estimator, halving strength search, two-yard allowance and late random variation. Straight 2/5/10/20-yard tests now combine planned launch, movement, slowdown and cup capture. All 43 focused checks pass. Shared original cache state, full shot RNG ordering, timing and browser terrain/collision/scoring integration remain open. Updated stale F05/F07/F08/F09/F11 summary rows to reflect already implemented staff, housing, environments, events and public hosting. No production gameplay or deployment change in this step.

### Live-review construction follow-through — 9 September 2026

Play hides hole management; Build retains land purchases and hole controls. Land purchases highlight the new parcel and frame it in the camera; unaffordable purchases display the shortfall without pausing behind a modal. Selecting Tee on an open hole starts/selects the next unfinished hole. Hold Space and drag to pan; right-click in Build invokes existing object-removal confirmation. Shot previews now use a copied simulation for shaped flight, tree interception and ground release without mutating live RNG.

Out-of-bounds has one stake per marked tile and the requested one-stroke nearby playable drop. Dragging marks/clears continuous strips, and exposed tile edges show exactly which area is excluded. This remains area painting: independently placed sparse poles do not define a polygon or the entire far side of a boundary. Polygon/side selection remains unfinished. Core golf slope fidelity, routing and long-session testing remain the next single-player priorities; optional Google/cloud saves and full career progression follow.

### Helicopter visits — 9 September 2026

Connected helipads now receive occasional animated helicopter visits when a course is open. A single craft approaches over the property, lands ($200 credited once), unloads a pair, remains parked through their real rounds and return walk, then boards and departs. First eligibility is five simulation minutes; the following visit is delayed 10–14.5 simulation minutes after departure. Occupied helipad demolition is blocked. Visit phase/passenger IDs/timing persist in saves, with protocol 72 migration. Lifecycle, actual completed rounds, single fee after restore and browser rendering tests pass. This is the user's requested feature, not an original-game fidelity claim.

### Building inspection — 10 September 2026

Build → Inspect / pan now opens a building status panel on a facility footprint. It shows actual clubhouse connectivity, distinguishes passive hotel/recreation/transport benefits from completed service visits, reports home ownership and lot value, and exposes helipad phase, passengers still playing and property-wide landing income. Tested disconnected/connected helipad states and browser hotel inspection/close. This improves F10 information flows; original balance, SGA/career, polygon boundaries and remaining fidelity work stay open.

### Dogleg planning — 10 September 2026

Shot scoring now adds a playable-ground detour cost around water, blocked land and marked out-of-bounds. Straight unobstructed approaches retain their previous distance score; existing punch/draw/fade/backspin regressions pass. Visitors lacking imagination still use only straight shots, but evaluate safe layups when their direct target is water/blocked/out-of-bounds instead of blindly repeating it. This deterministic tactical policy uses fixed independent samples, not the live shot RNG. Added tests for routing around a long barrier and unskilled safe layups; session replay and migration pass under protocol 74. Full original AI fidelity and the user's exact saved dogleg layout remain unverified; pole-defined excluded regions remain a separate open task.

### Outlined excluded regions — 10 September 2026

Build now offers Outline OB region: click 3–32 corners and finish to exclude the entire enclosed area, including interior tiles. Self-intersections/degenerate polygons reject. A single validated command preflights every cell and applies all changes atomically; insufficient funds or protected terrain leaves the course unchanged. Existing tile-area save/package representation is reused, so shared courses, shot penalties and tactical routing consume the same excluded area. Perimeter poles and exposed-edge outlines render the region; interior poles are omitted. The current raster boundary remains tile-aligned and costs $5 per newly marked tile. Existing isolated poles are not automatically reinterpreted as a polygon; use the explicit outline tool. Protocol 75; browser construction, saved interior exclusion, duplicate receipts, protected terrain, shared-course persistence and permission tests cover this flow.

### Regression audit and phone construction controls — 10 September 2026

The 502-test full suite completed with 501 passes and one phone tee-placement failure: the expanded construction header covered the intended canvas point. Phone construction settings now scroll horizontally in a dedicated row beneath the categories, reducing the 390×844 Build panel from 455 to 356 pixels tall. Desktop settings retain their existing layout. The original failing test and all 18 tests across playable, land-purchase and boundary-region suites pass after the fix; production build passes. Visually inspected the phone panel and exercised rotation plus outline/cancel after scrolling. Full original-game parity, career progression and future network authority remain open; this audit establishes regression coverage, not completion of fidelity.

### Pro-challenge ladder source recovery — 10 September 2026

Traced original invitation stakes and the saved challenge counter in golf.exe: displayed offers are §2,000/§4,000 times the next level; acceptance increments the counter and loss/tie rolls it back. Added the pure offer calculation and use it for new exhibition defaults, preserving custom/saved stakes. Documented candidate selection and the remaining eligibility/cash-settlement ambiguity in references/observations/challenge-invitations-executable.md. Next F09 work: map original admission gates and complete the invitation/acceptance/resort-accounting lifecycle; don't substitute exhibition play for career completion. Existing local authoritative event hosts remain the base for future server-owned tournaments.

Validation: challenge settlement/replay and browser default/custom-stake checks pass (2 tests); production build passes. The documented cash discrepancy remains unresolved and was not silently changed in existing exhibitions.

### Full original professional abilities — 10 September 2026

The challenge-start executable loop copies the roster ability bytes directly. Removed the arbitrary ten-point redistribution for named NPC professionals in newly created local events. A validated host-selected professional identifier pins the choice in the event configuration; original roster skills are applied at each round start, while earned player profiles remain separate and unchanged. Existing events without that identifier keep their original allocations. The setup screen now reports the actual professional values, including above-100% skills. Twelve targeted roster, challenge, appearance and competition checks pass, covering real shot/replay, unknown-name rejection, unchanged player allocations, phone selection/reload and old-config behavior; build passes and phone rendering inspected. Original extra skill bytes, invitation cadence, cash discrepancy and full career progression remain open.

### Invited challenge career flow — 11 September 2026

F09 now has saved professional invitations, an envelope indicator, owner-only review/accept/decline, fixed source-backed stakes, resume, independent match play and single-application resort settlement on return. Acceptance captures the actual layout and golfer. Settlement reconstructs the event, rejects mismatched course/profile/professional/stakes/seed, derives the result and records the net payment; wins advance the ladder and ties/losses restore it. The next level requires another completed hole. Existing exhibitions remain independent of resort earnings. Added six focused career tests covering gating/persistence, permissions/retries, real played wins/non-wins, concurrent settlement, mismatched layout, phone acceptance and browser return/reload. Course package, competition, session and prior exhibition/roster checks also pass. A shared-course browser check timed out during two unusually long runs, then passed twice (with tracing and with its unchanged normal timeout); no timeout was relaxed in the test source. Phone invitation reviewed visually.

Original parity still open: full arrival/candidate semantics, extra roster bytes, initial-clock-to-time conversion/repeat cadence, per-hole cash timing and the advertised/internal payout discrepancy. The current adapter's timing and candidate mapping are explicitly provisional; it pays the displayed agreement. SGA-hosted tournaments, prizes, retirement and remaining F01–F13/M01–M05 scope stay open. Online settlement must run under server authority, never trust an uploaded score/payment.

### Live per-hole challenge wagers — 11 September 2026

F09 settlement now pays replay-derived hole wagers as both golfers complete each hole, recording a paid-prefix receipt and individual ledger entries. The match wager and ladder result apply only after completion. Live event screens synchronize those payments into the saved resort; returning mid-match or after an interrupted tab also recovers unpaid results. Concurrent settlement, reload, stale/contradictory replay, partial return/resume and the final remaining balance are tested. Previously settled results and older active invitations without partial receipts remain compatible. Eleven focused career/challenge tests and the production build pass; the six session regressions also passed during this change. Original invitation cadence/candidate semantics and the advertised-versus-internal match-payout discrepancy remain open, as do SGA tournaments and the full multiplayer backlog.

### SGA evaluation arithmetic recovered (2026-09-11)

F09: added the original ten-criterion SGA report calculation, category-specific
length/hole/facility targets, zero-grade disqualification and event recommendation
mapping. Static executable evidence and unresolved integration inputs are in
`references/observations/sga-evaluation-executable.md`. Three focused tests pass.
This is not yet live qualification: original measurement aggregation, facility
identities, prize settlement and tournament lifecycle remain required. Keep
those calculations under the authoritative competition host for future multiplayer.

F09 classification correction (2026-09-11): source confirms inclusive skill
thresholds and removal of the weakest skill below 1.00, including stable ties.
The live report/accomplishment classifier now handles the former all-three
0.5–1.0 gap. Original par-seeded exact-cohort measurements, optional comparison
mode, scenic fields, fun denominator and time units still need integration;
the executable observation notes record the newly traced operations.

F09 observation inputs (2026-09-11): reconstructed par-seeded exact-skill score
comparisons and added saved per-score counts to new live visitor completions.
Legacy observations retain their known totals without fabricated distributions.
Ten focused tests (including real completions, save/restore and phone report)
and production build pass. Original comparison-mode selection, training masks
and scores above nine must be resolved before switching the live rating inputs.

F09 original score-record integration (2026-09-11): verified completion scores
are clamped to nine for SGA histograms. Added exact row/bin selection and a direct
reader for original 520-byte hole records, feeding the reconstructed rating
calculation. Six focused tests pass. Extra golfer flag rows/admission semantics
and the tee-related comparison-mode flag remain to be mapped before replacing
browser rating inputs. No deployment in this step.

F09 live rating adapter (2026-09-11): course report and new classification awards
now use par-seeded exact base-skill score distributions, rather than broad mean
differences. Scores cap at nine; legacy averages remain visible and are not
converted into invented samples. Normal-difficulty/single-contrast selection and
training folded by base skill are explicit adapter assumptions pending complete
original mode/training integration. Report explains the calculation. Evaluation,
classification, accomplishment regressions and production build pass. Full SGA
course measurements, invitation/prizes and other fidelity/multiplayer scope remain.

F09 original-record SGA composition (2026-09-11): all ten report measurements now
flow from decoded original hole records into grading/recommendations, including
per-hole rounding, active-hole fun averaging, scenic/variety tests and distinct
facility bits. Seven focused composition/report tests pass. Fixtures are synthetic
records; original runtime comparison and browser accumulator mappings remain open.
No live qualification/prize claim or deployment in this step.

F09 fun denominator (2026-09-11): verified original inputs count hole starts and
non-putter shots, including unfinished rounds. Live shot handling now saves both
counters with restore validation and no fabricated history. Original signed
reaction accumulation and playing-time timestamp conversion remain open before
switching live fun/time to SGA values.

### Evaluation update published (2026-09-11)

Published tested source through 4619fd2 to the existing simgolfer.0x4d.in Worker
(version e6f05a56-59c2-4083-946f-ff6629a45af7) and pushed the release branch.
All 52 combined evaluation/classification/accomplishment/original-SGA/challenge/
session checks passed. Public HTML references the current entry asset, and the
served game bundle matches the local production output byte-for-byte. Live scope:
corrected classification, original normal-mode skill rating adapter and saved
score/activity inputs. Full SGA tournament qualification is still incomplete.

F09 variety rule (2026-09-11): reconstructed the original preceding-hole penalty
from classification, flags, two feature counters, par and direction, with first-
hole exemption and difficulty adjustment. Three focused tests pass, including
signed angular wrap/rounding and the strict qualification boundary. Feature
identities, heading conversion and live editor integration remain open; findings
are recorded in the executable SGA observation notes.

F09 variety input identification (2026-09-11): the two feature words are elevation-
related reaction counts (incidents 45/46), not terrain-object counts. Recovered
and tested dogleg side flags from original heading differences, including strict
turn thresholds, wrap and bend-at-green behavior. Four focused checks pass.
Bend selection, heading conversion and elevation incident semantics remain needed
before live variety scoring; see executable SGA observation notes.

F09 direction geometry (2026-09-11): original integer heading function now drives
coordinate-based dogleg reconstruction. Independently verified against isolated
original x86 instructions for 10,033 vectors, with a repeatable oracle script and
committed regression subset. Six heading/variety tests pass. Editor bend selection
and elevation reaction admission remain before full live variety integration.

F09 variety composition (2026-09-11): record-based variety exactly matched the
original x86 block across 2,000 independently executed cases. SGA record reports
can now recompute variety from fresh classification masks and geometry instead
of trusting stale stored penalties. Eleven focused tests pass. Browser elevation-
event and bend-selection adapters remain before live course-editor integration.

F09 design geometry (2026-09-11): traced the bend to a simulated first landing,
not the alternate tee fields. Reconstructed eight-direction tee facing, strict
one-level elevation flags and the original route-measure dogleg suppression.
Nine focused checks pass. Full original design simulation and route-unit adapter
remain required before replacing the browser routing inputs.

F09 design route measure (2026-09-11): reconstructed original map distance and
fixed-origin/tile-centre route units, independently matching original x86 for
10,049 distances and 1,000 segments. Segment accumulation now feeds design geometry
and the dogleg cutoff. Six focused checks pass. Original design-pass simulation
and live editor integration remain open.

F09 design-pass orchestration (2026-09-11): reconstructed the two active skill
passes, five-shot limit, terrain stops, snapped landing origins, first-green par,
route-derived length and cached redraw without new planner calls. Thirteen
orchestration/geometry/distance tests pass. The original shot planner and cache
invalidation rules remain required before live preview integration; this helper
does not yet change the deployed game. Future multiplayer requirements remain
tracked under M01–M05 and must share authoritative simulation inputs.

F09 original planner range (2026-09-11): reconstructed the planner's complete
range helper, including skills, special design-actor lies, professional abilities,
surface penalties and upper cap. Independently matched 5,000 original x86 cases
with only map surface lookup supplied; committed a repeatable verifier and
40-case oracle fixture. Ten focused range/design-pass tests pass. Full landing
candidate search and original terrain/input adapters remain before live use.

F09 original direct approach (2026-09-11): recovered target-side terrain sampling
and bounded distance adjustment for short direct shots, independently matching
5,000 executions of the original x86 branch. Fourteen combined planner-helper
and design-pass tests pass. Intermediate route search and final shot selection
remain open before live integration; no deployed behavior changes in this pass.

F09 original route admission (2026-09-11): reconstructed intermediate landing
filters for range, short shots, terrain, adjacent better lies, current/previous
targets, green proximity and required progress toward the cup. Independently
matched 5,000 original x86 cases; 19 combined planner-helper/design-pass tests
pass. Candidate shot simulation, scoring and final selection remain before live
integration. Cooperative building, earnings competition and tournaments across
user-built courses remain tracked under M01–M05.

F09 original route pruning (2026-09-11): reconstructed six-option candidate
score exclusion, tie boundaries, adaptive margin tightening and refinement
continuation. Independently matched 200 complete original x86 score grids;
nine pruning/admission tests pass. Shot simulations and scoring inputs, spread
flags and full orchestration remain needed before live planner integration.

F09 original landing scores (2026-09-11): reconstructed simulated-landing terrain
costs, imagination's eight surrounding samples, hole-marker adjustments and
remaining-distance cost. Matched 1,000 executions of original x86 score blocks.
Corrected pruning to support valid negative scores and reverified 200 score grids.
Nine landing/pruning tests pass. Follow-up-shot assessment and the underlying
shot simulation remain before full planner/live integration.

F09 original follow-up selection (2026-09-11): reconstructed four-sample
imagination gate, lie-dependent weighting, first-shot range reduction and choice
among straight/draw/fade assessments. Thirteen follow-up/landing/pruning checks
pass. The underlying route assessment, its original projection table and incoming
flag lifetime remain open; callback is explicit and no heuristic is substituted.

F09 original projection (2026-09-11): recovered and executed the original trig
table initializer, reconstructed integer projection/interpolation and verified
10,081 original x86 vectors. Ten projection/follow-up/landing tests pass. This
supplies the projection dependency for original route assessment; the complete
assessment and full live planner integration remain unfinished.

F09 complete route assessment (2026-09-11): implemented original straight/curved
terrain sampling and connected it to follow-up selection in regression coverage.
Matched 1,000 complete original x86 assessments. This exposed and corrected the
earlier design-length conversion (/25, not /100); verified 10,005 original length
stores. Fourteen focused checks pass. Candidate-shot simulation and full search/
map integration still remain before changing the deployed planner.

F09 candidate flight (2026-09-11): reused original position/gravity helpers for
candidate airborne motion and consolidated ball/route projection onto one
x86-generated table and arithmetic implementation. Eighteen focused tests pass;
original projection and route-assessment oracles still match. Candidate ground
response, collisions, launch selection and complete simulator lifecycle remain
before connecting full original route selection to live gameplay.

F09 candidate ground response (2026-09-11): reconstructed original rolling
resistance, skill-dependent slope steering, surface slowdowns and directional
wall reflections. Matched 5,000 original x86 cases with supplied slope-helper
outputs; seven ground/flight tests pass. Bounce/collision lifecycle and launch
selection remain before full candidate simulation and live planner integration.

F09 candidate bounce (2026-09-11): reconstructed mode-dependent coefficient
overrides and reused original rebound arithmetic. Matched 5,000 original x86
contact cases; eleven candidate bounce/ground/flight tests pass. Post-contact
flags, random/slope responses and simulator lifecycle remain before full route
planning can use these components in the live game.

F09 candidate post-bounce response (2026-09-11): reconstructed collision-flag
transitions, professional luck scaling, slope effects and terrain stopping/random
turns with explicit original RNG state. Matched 5,000 original x86 outputs and
RNG states; nine impact/bounce checks pass. Full simulator lifecycle, airborne
obstacles and launch/map adapters remain open. Explicit randomness supports the
future authoritative multiplayer/replay architecture tracked under A01–A05.

F09 candidate airborne collision response (2026-09-11): reconstructed luck-aware
collision chance, deflection, speed loss and exact RNG consumption, including
16-bit speed bounds. Matched 5,000 original x86 results/RNG states; nine focused
tests pass. Obstacle-height detection, launch selection and complete candidate
lifecycle/map integration remain open.

F09 obstacle-height detection (2026-09-11): reconstructed complete original
height-band decision and integrated it with airborne collision response, preserving
RNG consumption even before the design-mode bypass. Matched 5,000 original x86
decisions/RNG states; eight focused tests pass. Launch selection, original map/
variant adapters and full candidate lifecycle remain before live integration.

F09 candidate integration (2026-09-11): composed recovered physics into resumable
candidate steps and verified 100 complete original x86 trajectories with supplied
launch and flat-map helpers, including landing, RNG, step count and original actor
restoration. All 27 candidate tests pass. Varied original terrain validation,
launch selection/map adapters and full search integration remain before live use.

F09 mixed candidate trajectories (2026-09-11): matched 150 full original x86
trajectories across mixed surfaces, wall/marker flags, skills and modes with flat
height/slope helpers. Corrected distinction between loop termination and publishing
a settled landing; added original-output and resume regressions. Six trajectory
tests pass. Nonflat adapters, launch selection and outer planner integration remain.

F09 terrain physics (2026-09-11): recovered original height interpolation and
directional slope rules; 5,000 original x86 sample pairs match. Added source
fixtures and rising/flat/falling candidate integration with deterministic resume;
12 focused regressions pass. Full nonflat trajectory oracle, browser map adapters,
launch selection and outer planner integration remain before live use. Multiplayer
requirements A01–A05/M01–M05 remain open; resumable simulation remains independent
of rendering and browser state.

F09 nonflat candidate verification (2026-09-11): 150 full trajectories now match
original x86 with real height/slope routines and supplied nonflat vertices. Fixed
rejection of transient negative speed from slope impacts and preserved uint16
RNG bounds. All 22 focused tests, 150 flat trajectories and both 5,000-case impact/
air-collision oracles pass. Launch selection, live map adaptation and outer
planner integration remain open; no live deployment change in this step.

F09 launch club selection (2026-09-11): recovered club/nominal strength block;
5,000 original executable cases and four regression tests pass. Covers range
clamping, explicit-target mode override and short green shots. Upstream terrain
assessment, velocity conversion, accuracy effects and live planner integration
remain; this helper does not yet alter deployed play.

F09 shared strength search (2026-09-11): recovered airborne range estimate and
complete ten-entry strength cache with exact original cross-mode reuse. All
1,000 sequential original x86 results/full caches match; 11 focused tests pass.
Cache state is explicit and serializable for deterministic multiplayer sessions.
Initial launch velocity, accuracy adjustments and live planner composition remain.

F09 initial launch composition (2026-09-11): connected club/strength selection to
original initial vertical velocity and cached horizontal-speed search. All 1,000
combined x86 outputs/full caches match; 14 focused tests pass, including candidate
flight integration. Remaining launch accuracy/random variation and special shot
adjustments must be composed before live planner replacement.

F09 launch variation (2026-09-11): recovered initial modifier budget and seeded
draw; 5,000 original comparisons and seven focused tests pass, preserving the
zero-bound draw. Raw actor/map inputs remain explicit. Subsequent variation
application, wind/special-shot effects and live planner composition remain open.

F09 initial angular drift (2026-09-11): recovered original reshaped random offset
and mode/actor/terrain reductions. All 5,000 x86 outputs and seeds match; 11
launch tests pass. Club-specific drift overrides, later effects and full live
planner composition remain before this can replace deployed launch behavior.

F09 non-putter drift modifiers (2026-09-11): recovered actor/club/draw/fade
scaling and intermediate local modifier. All 5,000 x86 pairs and eight drift
tests pass, including signed overflow. Later long-shot adjustment and final
heading/shot-shape composition remain before live integration.

F09 long-shot heading (2026-09-11): recovered miss check, reference/actual heading
split, residual curvature and class-specific adjustment. 5,000 full x86 output
comparisons and 12 drift/heading tests pass. Later planner stages and complete
live launch integration remain open.

F09 launch-core composition (2026-09-11): joined non-putter club, velocity,
variation, drift and heading stages with original cache/RNG ordering. Full
1,000-case x86 comparison and 23 regressions pass. Corrected second strength
query to use full range; state stays explicit for reproducible sessions.
Putting integration, upstream assessment and remaining later planner stages
still block full live replacement, not ongoing implementation work.

F09 putting/core integration (2026-09-11): composed club 13 into shared launch
state using extracted existing deviation logic; preserves intervening RNG draws
and avoids resampling tolerance. All 1,000 mixed-club original outputs/caches
match, and 24 putting/core tests pass. Final putt velocity and remaining later
planner stages, upstream assessment and live integration remain unfinished.

F09 low-shot branch (2026-09-11): recovered nearby-obstacle gate and lower launch
override. Response matches 1,000 original x86 outputs/full caches; seven focused
tests pass. Gate currently verified by disassembly/tests only. Complete map gate
oracle, alternate branch and full live planner composition remain open.

F09 alternate approach (2026-09-11): recovered complete gate and higher/backspin
launch override; 1,000 original x86 outputs/full caches and 12 focused tests pass.
Must compose after low-shot rejection, then finish later launch stages and live
map/planner integration. Current deployed play is unchanged.

F09 terrain launch composition (2026-09-11): joined core, original low-shot gate
and alternate approach with exact precedence/contact-flag handling. Complete
1,000-case x86 comparison now includes original projections and both map gates;
15 regressions pass. Later 0x424988+ effects, upstream mapping/assessment and
live planner replacement remain unfinished.

F09 later draw/fade setup (2026-09-11): recovered heading/strength changes,
active-actor curvature handling, shot types and stored curvature additions.
5,000 original outputs and seven focused tests pass. The conditional planner
section before this block and final lie/velocity effects still need composition;
no live integration or deployment in this change.

F09 final lie dispatch (2026-09-11): recovered all final surface/random launch
branches and normalization; 5,000 original outputs/seeds and 13 tests pass.
Oracle now explicitly sets x87 precision for large RNG bounds. Preceding
accuracy/recovery and conditional middle-planning gaps, upstream assessment
and full live integration remain unfinished.

F09 accuracy/recovery stage (2026-09-11): recovered short-shot identity effects,
recovery lie replacement and later directional noise. All 5,000 x86 state/seed
comparisons and ten tests pass. Whole-tail composition, earlier conditional
planning, upstream assessment and live integration remain unfinished.

F09 full final-launch tail (2026-09-11): composed shape, recovery and final lie
normalization with original baseline/seed ordering. All 5,000 complete x86 tail
outputs and 17 tests pass. Serializable input/output preserves deterministic
session architecture. Conditional middle planning, upstream assessment and
live map/planner integration remain before full gameplay parity.

F09 resolved-target launch (2026-09-11): composed original launch from club
selection through final state for its real resolved-argument path. All 1,000
full executable states/caches and nine tests pass; -1 search sentinel explicitly
rejected. Target selection/upstream assessment, unresolved middle branch and
live integration remain unfinished. State stays serializable for later multiplayer.

F09 launch-to-candidate bridge (2026-09-11): connected resolved launch to original
candidate motion with explicit cache/physical inputs. Sixty chained original
launch-to-rest states match, alongside prior 1,000 launch/150 flight comparisons;
nine regressions pass with midflight resume. Unified map/actor adapters, target
selection, unresolved planning and live integration remain unfinished.

F09 shared shot map (2026-09-11): added common launch/physics adapter using
original metadata, directional height caches and edge masks. Six tests pass,
including all 150 stored nonflat original trajectories and exact metadata bytes.
Live browser map conversion, actor mapping, target assessment and unresolved
planning remain open; caller must keep derived map data on the same revision.

F09 original actor adapter (2026-09-11): decoded original shot fields for launch
and motion, preserving independent candidate mask and full ability word. Fixed
signed late-shot counter handling; expanded 5,000-case oracle and 12 tests pass.
Live guest-to-original conversion, target assessment, unresolved planning and
coherent full-course integration remain unfinished.

F09 pre-club elevation correction (2026-09-11): recovered raw-height distance
adjustment with original skill gate/asymmetric divisors. All 5,000 x86 outputs/
read sequences and eight tests pass. Earlier target/terrain assessment, raw
live-course mapping and full deployment integration remain unfinished.

F09 target-neighborhood assessment (2026-09-11): recovered the original eight
neighbor terrain vote, edge/unavailable penalty, dominant code/direction and
rating byte. 1,000 executable comparisons and eight targeted tests pass.
Preceding ray scan, full target selection and live integration remain unfinished.

F09 target ray (2026-09-11): recovered center/side terrain sampling, original RNG
ordering, obstacle heights and marked/water fields; composed with neighborhood
assessment. 1,000 ray and continued assessment comparisons match original x86;
12 targeted tests pass. This supersedes the preceding ray-scan TODO above.
Earlier target selection, automatic planner middle branch and live integration
remain unfinished; no deployment of these isolated original helpers yet.

F09 assessment-to-launch integration (2026-09-11): composed terrain assessment,
elevation correction and resolved-target launch using one raw map and sequential
RNG/cache state. All 1,000 contiguous original-executable cases match; 11 targeted
tests pass. Initial target/range selection, automatic -1 middle branch, shared
live map/physics integration and deployment remain unfinished.

F09 shared planning/physics map (2026-09-11): assessment now consumes a planning
view of the existing physics map adapter. Terrain/marks/metadata/raw heights
share backing data; original side-ray aliases and explicit external memory reads
are preserved. Eleven tests pass, including assessed-launch fixtures and 150
nonflat candidate trajectories. Unified assessment-to-rest oracle, live-course
conversion/revision handling and automatic target planning remain unfinished.

F09 original target setup (2026-09-11): recovered cup/exact-point target geometry,
original heading/distance, curve reset and actor-flag clearing. 5,000 geometry
cases and 1,000 contiguous setup-to-launch cases match the original executable;
ten tests pass. Exact coordinate semantics supersede any interpretation of the
third planner argument as an identifier. Automatic -1 target search/middle
branches, entry global effects, coherent live integration and deployment remain
unfinished.

F09 planner entry (2026-09-11): recovered range-before-metadata-write ordering,
explicit terrain 17/20 class patches, global obstacle index and origin lookup.
All 5,000 original entry/range cases match; twelve targeted tests pass. Compose
and persist entry state patches before later assessment, then finish automatic
target branches and live integration. The full planner remains unfinished.

F09 exact planner composition (2026-09-11): entry state, computed range, ordered
metadata patches, target setup and final launch now compose in one pure entry.
1,000 original prologue-to-launch cases and thirteen tests pass, including patch
persistence affecting the next shot's range. Automatic -1 search, owning-state
persistence, live conversion and planning-to-rest verification remain open.

F09 automatic targeting request (2026-09-11): recovered assessment/approach/search
branch gates and initial range-limited waypoint projection. 5,000 original cases
and nine tests pass. Route search 0x422450, result processing, later automatic
launch branch and live integration remain unfinished.

F09 route-result processing (2026-09-11): recovered tile-center/corner aim flags,
cardinal score adjustment and rounded-vector heading/distance. 5,000 original
cases and eight tests pass. Route-search production of targets/score grids,
observer side effect, automatic launch middle branch and live integration remain
unfinished.

F09 route-search setup (2026-09-11): recovered mode normalization, skill/ability
curve mask, cup aim and temporary next-shot range query. 5,000 original cases
and eight tests pass. Initial search globals, full range-query composition,
candidate loops, automatic launch branch and live integration remain unfinished.

F09 route candidate preparation (2026-09-11): recovered 21×21 trial geometry,
whole-candidate score sentinel and six-score initialization; composed fresh trials
with original admission. 5,000 original cases and nine tests pass. Six-way
simulation, repeated search passes, winner selection and live integration remain
unfinished.

F09 route shot options (2026-09-11): recovered curve-mask/distance gates and score
sentinels. Fixed successful fresh admission to clear all six scores before shot
trials. Original reset instructions and 5,000 gate cases verified; seven tests
pass. Repeated simulations, scoring, winner selection and live integration remain
unfinished.

F09 route winner updates (2026-09-11): recovered score accumulation, unsuccessful
sample threshold and strict best-option replacement with all winner metadata.
5,000 original cases and seven tests pass. Batch simulation, pass orchestration,
search completion and live integration remain unfinished.

F09 route search completion (2026-09-11): recovered pass diagnostics, winning
target publication, cup fallback and cleanup of temporary search state. 5,000
original cases and eight tests pass. Candidate simulation, pass orchestration,
automatic launch branch and live integration remain unfinished.

F09 trial dispatch (2026-09-11): recovered center/corner simulation arguments
and asymmetric work count. 5,000 dispatch cases, 5,000 winner regressions and six
tests pass. Corrected winner threshold input to goodLandings, confirmed by the
original landing increment; previous bad/unsuccessful wording was incorrect.
Full candidate simulation/scoring orchestration and live integration remain open.

F09 contiguous landing review (2026-09-11): integrated intended-target distance
and actual landing progress flag with terrain scoring. 1,000 complete original
block comparisons and seven tests pass. The flag means unexpectedly strong cup
progress, not short-shot penalty. Follow-up/sample orchestration and live
integration remain unfinished.

F09 scored landing composition (2026-09-11): landing review and follow-up
assessment now compose with cumulative score and trial metadata. 1,000 contiguous
original cases including ordered assessor calls and six tests pass. Follow-up
cost simulation, sample/pass orchestration and live integration remain unfinished.

F09 eligible-option batch (2026-09-11): composed repeated trial dispatch, landing
review, follow-up scoring and winner update with ordered state propagation.
1,000 contiguous original batches and ten tests pass. Candidate physics/cost
callbacks, multi-pass search orchestration and live integration remain unfinished.

F09 six-option candidate loop (2026-09-11): composed option gates and batches
in original center/corner and curve order with shared winner/follow-up state.
1,000 candidate loops plus 1,000 batch regressions and six tests pass. Physical
candidate callbacks, full-grid passes/pruning and live integration remain open.

F09 full-grid search pass (2026-09-11): composed all 441 candidates in original
order with admission, six-option evaluation and shared winner/state propagation.
100 original full passes match, including dense fresh and mixed-terrain cases;
ten targeted tests pass. Repeated passes/pruning, real physics callbacks and
live integration remain unfinished.

F09 survivor statistics (2026-09-11): recovered distance/relative-heading extrema
and composed them with final pruning survivors. 5,000 original spread cases and
thirteen tests pass. Full retry-loop verification, repeated-pass orchestration,
physical callbacks and live integration remain unfinished.

F09 repeated route passes (2026-09-11): composed full-grid evaluation, pruning,
survivor diagnostics and original stopping conditions. 30 contiguous original
searches and ordered callbacks match, including 2→4→8 sample progression;
200 complete original pruning retry loops match final scores/survivor spread.
Fifteen targeted tests pass. Actual shot-physics and assessment callbacks,
search entry/publication integration and live gameplay wiring remain open.

F09 search preparation (2026-09-11): recovered projected anchor and initial
sampling/weighting, composed with mode/curve setup and temporary next-shot range
query. 5,000 anchor and 5,000 contiguous prepared-search cases match the original;
11 targeted tests pass. Preserves original tile-index/fixed-point weighting
quirk. Initial entry state, final publication, physical callbacks and live
integration remain open.

F09 combined route search (2026-09-11): connected preparation, repeated passes,
pruning diagnostics and result publication in one pure interface. 30 contiguous
original searches match complete tables, result and callback ordering, including
no-candidate cup fallback. Fourteen targeted tests pass. Initial entry/range
state, actual candidate physics and follow-up cost callbacks, and live wiring
remain unfinished.

F09 actor condition classification (2026-09-11): recovered 0x466ea0 and removed
the supplied feature-eligibility result from primary reaction selection. The
actor condition word's high bits produce classes 0/1/2. All 65,536 words match
the native routine; 3,000 primary stages use the real classifier and sixteen
related tests pass. Scenery sampling, remark effects and live integration remain
unfinished.

F09 automatic scenery sampling (2026-09-11): recovered complete non-putter
loop 0x4249b3–0x424c46, including original random projection, map-edge checks,
scenery/object references and the per-hole counter. 300 native loops and thirteen
related tests pass; fixtures cover each reference output. Original object lookup
and height values remain supplied map boundaries. Full remark effects and
automatic planner composition/live integration remain unfinished.

F09 original object lookup (2026-09-11): recovered 0x40dc70's first-match
256-record footprint scan and integrated it into automatic scenery sampling.
1,000 object scans and 300 scenery loops with the real native lookup match;
ten related tests pass. Supplied object-lookup results are removed. Original
record/metadata mapping, remark effects and live planner integration remain open.

F09 route entry initialization (2026-09-11): recovered cleared score grid,
search flags, first range-query context, previous target and origin tile lookup.
500 contiguous original entries and six targeted tests pass. Entry-to-body
composition, actual range/physics/assessment callbacks and live integration
remain unfinished.

F09 entry-to-publication composition (2026-09-11): originalEnteredRouteSearch
now initializes fresh candidate scores and search flags before preparation,
passes and publication; derives origin class from the supplied terrain.
Thirty full contiguous searches and nine targeted tests pass, including both
range-query contexts and fully excluded terrain. Actual range/physics/assessment
callbacks and live integration remain unfinished.

F09 real range integration (2026-09-11): originalRangedRouteSearch now computes
both current and next-shot ranges with recovered arithmetic and effective lie
metadata. Thirty full original searches match with real range code, including
shot-counter wrap; 5,000 range comparisons cover the full byte domain. Ten tests
pass, with three integrated tests rerun after retaining the wrap fixture.
Candidate flight/assessment callbacks and live planner integration remain open.

F09 real follow-up assessment integration (2026-09-11): originalAssessedRouteSearch
now uses recovered prospective-route costs alongside real range arithmetic.
Thirty complete original searches match, exercising 5,784 real assessments;
nine targeted tests pass. Candidate trajectory callback, automatic planner
composition and live integration remain unfinished.

F09 exact-point candidate bridge (2026-09-11): connected full exact planner
output to resumable candidate flight, preserving launch metadata/cache and
separate physical actor attributes. Sixty chained original planner/flight cases
and eight targeted tests pass. Shared-map contiguous verification, candidate
transaction/search-state integration and live wiring remain unfinished.

F09 resumable candidate trial state (2026-09-11): added isolated trial ownership
with explicit work slices, preserved prior landing until publication, and
returned RNG/cache state. Sixty original chained cases replay in serialized
seven-step slices; five tests pass. Zero-speed landing/RNG preservation verified
against original code. Shared-map contiguous verification, search scheduling/
shared-state integration and live wiring remain unfinished.

F09 shared flat-map candidate evidence (2026-09-11): planner and full flight now
verified through originalShotMap on identical terrain and markings for 60 chained
original cases; 11 shared-map/trial tests pass. This closes separate-environment
evidence for flat courses. Nonflat combined mapping, contiguous original candidate
execution, search shared-state scheduling and live integration remain open.

F09 shared nonflat-map candidate evidence (2026-09-11): extended the common-map
planner/flight oracle to a shared nonzero height field and derived corner data.
Sixty flat plus sixty nonflat original chains match; ten map tests pass, including
midflight replay in both modes. Contiguous original candidate execution, shared
search scheduling/state propagation and live integration remain unfinished.

F09 uninterrupted candidate verification (2026-09-11): 30 original 0x421b50
calls now execute planning, flight and restoration in one emulator run. Final
landing/position, RNG and cache match; the original 256-byte actor record is
verified restored. Sliced browser trials match retained cases. Nonflat contiguous
execution and search shared-state/live integration remain unfinished.

F09 completed candidate shared state (2026-09-11): completed trials now publish
landing, final RNG, independent cache snapshot and original planner epilogue
class changes (17/20 → 8). Thirty uninterrupted original calls verify those
metadata outputs; five targeted tests pass. Applying this state across search
trials and live integration remain unfinished.

F09 sequential candidate shared-state input (2026-09-11): next trials now consume
prior landing, RNG, cache and terrain-class overrides through a nonmutating
planning view. Thirty sequential full original candidate calls match; six tests
pass with serialization between slices/trials. Full search callback integration,
nonflat contiguous execution and live wiring remain unfinished.

F09 uninterrupted nonflat candidate verification (2026-09-11): original candidate
entry, planner, nonflat height/slope physics and restoration now run together.
Thirty flat and thirty uneven-terrain calls match all retained final/shared
state; four targeted tests pass. Full route-search callback integration and
live gameplay wiring remain unfinished.

F09 live search metadata (2026-09-11): landing scoring now resolves current
exclusion class and corner-option gates reread origin class. Thirty original
searches with candidate-induced class changes match, including 5,844 assessments;
17 targeted tests pass. This removes stale metadata assumptions before physical
candidate integration. Full search physics and live wiring remain unfinished.

F09 physical candidate/search connection (2026-09-11): added the physical
candidate callback with shared-state ownership and current metadata access;
connected it to complete range/assessment search. Callback results match retained
original sequences; a complete mode-2 search runs/replays without supplied
landings or costs. Seven tests pass. Whole-search original comparison, broader
mode/map coverage and live integration remain unfinished.

F09 complete physical-search oracle (2026-09-11): full original route search now
executes range, candidate planning/flight, assessment, pruning and publication
without supplied flight/cost results. Modes 2/1/0 match full tables and shared
state over 388/1,564/1,564 candidate calls. Four targeted tests pass. More maps,
boundaries and actors, responsive execution scheduling, outer automatic planner
integration and live gameplay wiring remain unfinished.

F09 mixed-course full-search coverage (2026-09-11): extended uninterrupted
original comparisons to water/obstacle/rough bands and a professional with
range and curve abilities. Six searches covering 5,520 actual candidates match;
five targeted tests pass. Uneven whole-search/boundary coverage, responsive
execution and outer-planner/live integration remain unfinished.

F09 off-main-thread search (2026-09-11): added serializable original-search job,
module worker and single-active-job client with cancellation, revision-tagged
results and disposal. Six original search fixtures survive the snapshot boundary;
Chrome tests verify continued animation frames, cancellation and error recovery.
Three tests and production build pass. Live caller integration and final worker
production-bundle verification remain open; planner is not yet used by gameplay.

F09 worker result application guard (2026-09-11): added coordinator that rejects
stale input/results and cancelled/superseded work before synchronous application.
Seven coordinator/real-worker tests pass, covering course/ball/RNG changes,
late cancelled responses and error recovery. Live game still uses the provisional
planner; original coordinate/actor adapter and authoritative revision/application
wiring remain unfinished.

F09 automatic short approach (2026-09-11): recovered 0x4239f7–0x423b66,
including shared landing publication, diagnostics reset and terrain-class-based
distance adjustment. 5,000 executable comparisons and eleven related tests pass.
This closes the short-approach branch in isolation; full automatic planner
composition, later automatic launch logic and live state mapping remain open.

F09 automatic launch ground state (2026-09-11): recovered putter-on-green
strength recalculation and elevation counter update at 0x424c46–0x424cc3.
1,000 original executions match complete shared caches and resulting state;
nine related tests pass. Scenery sampling before this stage, golfer reactions
and subsequent automatic launch adjustments remain open. Still isolated from
live gameplay; no deployment.

F09 automatic launch history (2026-09-11): recovered 0x425239–0x425372
club-use memory and final remark gates, with synchronous reaction effects
explicitly returned by the caller. 1,500 native comparisons and six related
tests pass. Verification controls the remark routine at its call boundary;
full remark effects, earlier scenery/reaction stages and live integration
remain unfinished.

F09 automatic shot reactions (2026-09-11): recovered 0x425001–0x425239
curve flags, conditional remarks and paired-golfer reaction updates with explicit
state/effect boundaries. 2,000 executable comparisons and nine related tests
pass. Original remark and pair-score routines remain supplied boundaries; earlier
scenery/primary reactions and live automatic planner integration remain open.

F09 paired profile classification (2026-09-11): inspection of 0x46c140 corrects
the previous pair-score interpretation. It returns the inverted high bit of
profile byte +0x21, selected by actor profile index +0xb6. Reactions now call
the recovered lookup directly; profile/hole naming replaces course naming.
2,000 reaction stages now run with the real native lookup, and all 256 byte
values at four profile indices match (1,024 cases). Eight related tests pass.
Remark effects, earlier automatic stages and live integration remain open.

F09 primary automatic reaction (2026-09-11): recovered 0x424cc3–0x425001
priority selection, conditional original RNG draws, diagnostic masking and
post-remark counter changes. 3,000 native comparisons and fourteen related
tests pass. Full remark effects and feature eligibility remain controlled call
boundaries; preceding scenery sampling and live automatic planner composition
remain unfinished.

F09 connected automatic launch middle (2026-09-11): scenery, putt/elevation
updates, primary reactions, shot reactions and club history now compose from
one explicit state snapshot. 240 uninterrupted native runs (0x424988–0x425372)
match complete modeled state, events, cache and RNG; twenty-two related tests
pass. Target-selection/launch-tail composition, original remark effects and live
state mapping remain unfinished. No deployment.

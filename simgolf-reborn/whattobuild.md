# What to build — Sid Meier’s SimGolf, in a browser

**Status:** overarching specification, v0.1. Research-backed requirements; not a claim of implemented parity.<br>
**Project:** `simgolf-reborn/`, a new implementation with no dependency on the previous game.<br>
**Current stage:** the owner approved the refined rendered style, including rounded terrain corners and green collars. A playable course now supports up to 18 holes, ordered rounds, per-hole scorecards and save migration; full-game construction and fidelity verification continue. The owner also requires architecture for future multiplayer; see [backlog](backlog.md) and [architecture](architecture.md).<br>
**Target:** the 2002 **Sid Meier’s SimGolf**, not the different 1996 Maxis SimGolf.

## 1. The product promise

Recreate the original game’s decisions, progression, people, course-building tools, golf, resort management, information, humour and atmosphere. It must feel like playing SimGolf in a browser, not a generic golf tycoon with a few familiar names.

The approved platform change is Windows → browser. On 5 September 2026, the owner explicitly approved **concept B: dimensional graphics with the original isometric viewpoint and lavender interface direction**. The original screenshots continue to govern gameplay fidelity; B governs the updated art target. The subsequently refined rendered appearance was accepted; later requested rounded corners and green collars govern editable terrain. See [graphics approval](graphics/README.md).

“1:1” means observable parity. Equivalent situations should offer the same choices and produce equivalent behavior, feedback and consequences. It does not mean pretending we possess the original source code, copying the previous implementation’s invented formulas, or declaring exactness from a feature checklist.

### Fresh-start boundary

- All new source, dependencies, assets, tests and documentation live in this folder.
- Do not import or copy the previous engine, UI, sprites, generated trees, map generator, economics or save schema into the new game.
- Original manuals, game files, screenshots and researched observations remain evidence. Existing implementation notes are historical leads, not authorities.
- The old project stays outside this folder as an archive. No deletion is needed to start cleanly.
- A future importer for old web saves is a separate decision; it must not constrain the new model.

## 2. Evidence and confidence

Use these labels in implementation tickets and content tables:

| Label | Meaning | Treatment |
|---|---|---|
| **M** | Explicitly described in the supplied original manual | Required behavior; verify edge cases in play |
| **R** | Visible in the owner’s screenshots or supplied original resources | Required visual/content reference; a still image does not prove timing or rules |
| **S** | Reported by a secondary source | Useful corroboration or a test hypothesis |
| **V** | Still needs original-game verification | Record the unknown; never silently invent a “faithful” value |
| **B** | Browser implementation requirement | Engineering adaptation, not an original feature claim |

### Source register

| ID | Source | Scope and status |
|---|---|---|
| M1 | [Supplied English manual](../resources/SidMeiersSimGolf-Manual%20%281%29.pdf) | Primary behavioral reference. All 18 scanned spreads were read in this task history; gameplay pages 3–25 rechecked for this specification. Page numbers below are printed page numbers. |
| R1–R6 | [Owner screenshot index](references/README.md) | Six original-game screenshots: tropical play, Gary Golf skills, developed parkland resort, construction tools, worn course, tropical facilities. |
| D1 | [Original installation readme](../resources/sim%20golf/Sid%20Meier%27s%20SimGolf/Docs/readme.txt) | Local original documentation, labeled version 1.0. Includes custom-head workflow. This does not establish the installed executable’s patch version. |
| D2 | [Original Parklands terrain descriptions](../resources/sim%20golf/Sid%20Meier%27s%20SimGolf/Interface/parkland.txt) | Original terrain names, behavior and variant controls; other regional descriptions are alongside it. |
| D3 | Supplied original `Flics/Flowers/dandelion_01.flc` through `dandelion_04.flc`, plus separate shadow files | Confirms dandelion artwork and multiple resources. Does **not** by itself establish four growth stages. |
| S1 | [Wikipedia overview](https://en.wikipedia.org/wiki/Sid_Meier%27s_SimGolf) | Orientation and broad systems; not authority for exact tuning. |
| S2 | [SimuLord strategy guide, version 1.01](https://gamefaqs.gamespot.com/pc/480860-sid-meiers-simgolf/faqs/16147) | Course-design and progression corroboration. Retrieved through indexed web access after direct/Jina fetches failed. Strategy advice is not a rule specification. |
| S3 | [Krusher’s retrospective](https://blog.krusher.net/en/2018/07/sid-meiers-simgolf-retroview/) | Feel, sound and interaction corroboration. Its broad claim that customization is impossible conflicts with the manual and original readme; use the primary sources. |
| S4 | [Contemporary interview with Sid Meier](https://www.simsnetwork.com/news/2002/01/30/interview-with-sid-meier) | Primary design perspective reproduced by SimsNetwork: course architecture and watching golfers are central. |
| V1 | [Game Destroyer: first part of an 18-hole build](https://www.youtube.com/watch?v=FRbSx98K7go) | Located for subsequent timestamped observation; not yet watched or used to assert timing. |
| V2 | [Longplays Land gameplay sample](https://www.youtube.com/watch?v=-MJzyHR6fpo) | Located for subsequent observation; not yet watched or treated as measured evidence. |

The Windows executable has been located but has not yet been run in this work. Before numerical parity is claimed, establish one reference installation and record its executable hash, patch version, language, difficulty, theme pack and display settings. Keep demo behavior and retail behavior separate.

## 3. Purpose, feeling and the player’s loop

The player inherits money from Great Uncle Harry and develops bare properties into successful golf resorts. They are both the course architect/owner and a resident golfer. Building a profitable course, pleasing individual golfers and improving the resident pro reinforce each other. The player may pursue tournament success, a beautiful resort or a satisfying smaller course rather than being forced through a linear campaign. **M1 pp.3, 5–7, 14–25.**

The recurring loop is:

1. Inspect land and budget; plan an enjoyable hole.
2. Place its tee and green, shape the route and decide how hazards test golfers.
3. Open the hole; watch actual golfers negotiate it.
4. Read reactions, scores, needs, traffic and income.
5. Improve the design and supply amenities, paths and staff.
6. Earn memberships, expansion opportunities, rewards and SGA recognition.
7. Play the course as the resident pro; improve skills and compete.
8. Reinvest, expand toward 18 holes, develop other properties and export a championship course/pro.

The mood is gently comic, busy and inviting. The course is a living place: conversations, cheers, frustration, waiting, resting, maintenance and little visual incidents matter. The challenge comes from choices and consequences, not reflex timing. A route can look intimidating while offering a satisfying safe way through. **M1 pp.14–25; S3 corroborates the accessible aim-and-click character of play.**

**Reject:** empty demonstration lawns, generic economy sliders, decorative golfers, toy-ball tree canopies, an interface unrelated to the original, or difficulty that merely scales all costs.

## 4. Starting, modes and the world

**M1 pp.5–7; V for exact property data.**

- Main menu: new game, continue/load, championship play, sandbox, theme selection and exit/back-to-menu equivalent.
- Four difficulties: Easy, Moderate, Difficult and Impossible. The manual explicitly describes increasingly volatile golfer attitudes. Inventory every other difficulty-dependent rule from the reference game.
- Sixteen properties on the World Screen. Original identity/bonus labels are now inventoried in `references/observations/property-identities.md` and the reproducible `scene/src/content/original-properties.json` extraction. Reproduce original regions, prices, land shapes, initial buildings, terrain and availability; do not reuse the previous project’s invented property catalog.
- Four course environments: Parklands, Links, Desert and Tropical, including regional terrain, vegetation, architecture and facility substitutions.
- Show affordable, unavailable and already-purchased property states with the original legend and meanings. Preserve the world/course transition and warnings about leaving a course.
- Sandbox offers construction without financial pressure. Precisely record which original restrictions it removes.
- Championship mode accepts saved courses and golfers and supports the original tournament experience.
- Theme Packs can customize people, dialogue and course content. Inventory supplied packs and their actual replacement/fallback rules; do not make up new packs and call them original content.
- Persist difficulty, property, theme, date, money and career information. **V:** exact starting balances, property-release logic and transfer rules.

## 5. Course construction and editing

**M1 pp.8–9, 14–19; D2.**

### The first hole

Start with undeveloped land and its original clubhouse, not a prebuilt operating hole. Select Tee and place it. Select Green and place the cup/green. Show the white likely-play route. Lay fairway and hazards around that route. Press **H** or left-click the flag to open the hole for business. Golfers then arrive and pay after completing holes. Continue editing open holes where the original allows it.

### Required tools and rules

- Tee placement, green placement/extension, cup positioning, hole numbering and routing.
- Fairway and firm fairway, rough and deep rough, tricky greens and original terrain variants.
- Sand traps, pot bunkers, waste bunkers, streams, water, brush and rocks.
- Trees, pines, palms where available, scenic trees, size/shape variants and regional substitutions.
- Terrain elevation tools: grid, raising/lowering, original selection footprints and valid adjacency/placement rules.
- Demolition and original right-click removal confirmation behavior.
- Transparent facility previews, invalid-placement feedback, costs and 90-degree pre-placement rotation.
- Land ownership and purchases; construction must respect boundaries and valid terrain.
- Path painting, connectivity, water crossings and scenic bridges.
- Building lots, flowerbeds, benches, ballwashers and landmarks.
- Display-tree toggle, golfer-name toggle, zoom and navigation so dense planting remains manageable.

Terrain must affect the ball and route selection, not merely change its color. Fairway gives useful carry/roll conditions; firm fairway increases bounce/roll. Poor lies constrain recovery. Trees obstruct, deflect or trap shots; high and low trajectories must interact differently. Water loses balls; streams have the documented penalty; rocks deflect unpredictably. Green slope and backspin affect final position. **V:** exact distances, lie multipliers, penalty/drop edge cases, footprints and elevation limits.

Regional substitutions must be real content data. Examples from the manual: Links streams are burns and brush is gorse; Desert streams are ravines, and the rough/deep-rough equivalents differ. Never infer identical ball behavior solely from a shared toolbar slot.

**Acceptance:** build, open, extend, reshape and reorder a small course entirely through the visible controls; golfers react to the changed design. Test editing around occupied terrain and active rounds against the original before choosing a rule.

## 6. Golfers, simulation and observable behavior

**M1 pp.10–16, 20–24.**

Each golfer is an individual with identity, appearance, skill profile, attitude, physical needs, relationships/story state and a history on the course. Preserve the original recognizable character proportions and varied appearance, subject to the graphics gate.

Required simulation:

- Arrival, pairing, walking, waiting at tees, shot selection, aiming, swinging, ball travel, putting, finishing and departure.
- Golfers play the actual layout. Their shots must not follow a fixed tee-to-cup animation independent of terrain.
- Length, Accuracy and Imagination are separate capabilities, with golfers differing in which they possess.
- Hunger, thirst and fatigue drive appropriate service/rest behavior and visible reactions.
- Attitudes use the original red/yellow/green meanings. Repeated good/bad experiences accumulate rather than reset every shot.
- Comments explain relevant experiences; individual complaints contribute to useful reports.
- Queues, pace of play and walking distance matter. Carts and staff have observable consequences.
- Money, stories, services, skills and course statistics update from completed simulation events, not arbitrary timers unrelated to play.
- Inspect a golfer’s data; find, customize or reposition/eject characters where the original permits. Keep the distinction between hiring a Club Pro employee and playing as the resident pro.
- Preserve reactions to scenery, hazards, houses, celebrities and maintenance issues, including dandelions.

**V:** population caps, arrival intervals, movement speeds, pairing rules, sight ranges, decision scoring, queuing priorities, emotional thresholds and exact membership eligibility. Record these in measured content tables, not unexplained constants.

## 7. Dandelions, wear and groundskeeping — mandatory

**M1 pp.20–21; D3; explicit owner requirement.**

Dandelions are not optional polish and must appear in the first playable slice.

| Item | Required behavior | Verification still needed |
|---|---|---|
| Dandelions | Naturally occurring, individually visible weeds; damage golfer attitudes; groundskeepers remove them | Eligible surfaces, spawn/recurrence rate, density, player removal interaction, task duration and exact penalty |
| Divots | Arise from player traffic; turf technicians repair them | Which events/surfaces produce them, rate and exact play/mood effects |
| Crabgrass | Develops in heavily divoted areas; turf technicians remove it | Thresholds, spread, visual states and exact effects |
| Groundskeeper | Travels to dandelions and performs visible work | Job prioritization, range, reachability and workload |
| Turf Technician | Handles dandelions plus divots and crabgrass | Unlock, efficiency and prioritization relative to the basic employee |

Required visual sample: tended turf beside a neglected patch, yellow flowers and pale seed heads at readable game scale, divots distinct from flowers, and a worker removing a weed. The exact use of bloom/seed-head appearances is a visual proposal until compared with the original animation files.

Required simulation test: leave an eligible area untreated; show weeds appearing; observe a negative golfer response; hire and position a groundskeeper; observe travel and removal. Compare the result with untreated control terrain. Save/reload must preserve weed/wear state and pending work. A basic groundskeeper must not silently perform every skilled maintenance task.

## 8. Paths, amenities and resort buildings

**M1 pp.18–21.**

Connected paths lead back to the clubhouse. Disconnected paths have the original unfinished/muddy appearance. Most facilities need a valid connection before functioning. Benches support rest; ballwashers improve accuracy for the remaining hole but can slow play; flowers and landmarks improve the experience. Building lots generate income based on their desirability and support the original residence/celebrity progression.

| Facility | Original role | Environment-specific counterpart |
|---|---|---|
| Clubhouse | Resort anchor; initial building; paid relocation/rebuild | Inventory original architectural sets |
| Putting Green | Improves Imagination for golfers who already possess it | Preserve themed appearance |
| Snack Bar | Feeds hungry golfers | Pub on Links |
| Pro Shop | Improves existing Accuracy | Preserve themed appearance |
| Driving Range | Improves existing Length | Preserve themed appearance |
| Cart Garage | Reduces waiting/travel time and speeds rounds | Preserve cart/path behavior |
| Tennis Court | Floors starting attitude at yellow (manual p.19); numeric mapping needs observation | Stable / Spa / Swim Club for Links / Desert / Tropical |
| Marina | Improves lot value and celebrity-residence prospects | Church on Links; Helipad on Desert |
| Resort Hotel | Improves stamina/readiness for longer rounds | Preserve themed appearance |
| Airstrip | Increases hole fees, alongside SGA fee benefits | Castle / Casino / Theme Park for Links / Desert / Tropical |

Inventory all original upgrades, prices, footprints, prerequisites, entrances, animations and regional names. An upgrade must implement its original effect and appearance; no invented “service/prestige” tree. Decorations and special facilities shown in R3/R5/R6 must be identified and cataloged rather than approximated as generic boxes.

**Acceptance:** disconnect and reconnect a facility; verify visual and functional changes. Compare golfers with/without the relevant existing skill when using a training facility. Observe carts, rest, food, drinks and queues.

## 9. Employees

**M1 pp.12–13, 20–21.**

| Basic employee | Role | Skilled employee | Additional role |
|---|---|---|---|
| Club Pro | Welcomes golfers and improves fun | Celebrity | Stronger welcome/fun effect |
| Ranger | Hurries golfers in congested areas | Marshall | Pace control plus removal of disruptive golfers |
| Groundskeeper | Removes dandelions | Turf Technician | Also handles divots and crabgrass |
| Soda Vendor | Serves thirsty golfers | Refreshment Consultant | Improves attitudes through refreshments beyond strict thirst relief |

The manual gates skilled employees behind a daily-fee course of six or more holes. Reproduce hiring, firing, renaming, repositioning, employee statistics, wages, work and movement. **V:** wages, upgrade/replacement interaction and task rates. Staff must visibly do the jobs their statistics claim.

## 10. Economy, memberships, visitors and progression

**M1 pp.13–25; V for thresholds and timing.**

- Hole-completion green fees are central income. Fun, recognition and appropriate facilities influence earnings. Do not replace this with a single global fee slider unless demonstrated in the original.
- Track construction, demolition, land, wages, facility income and other original cash flows. Annual financial history must reconcile with the cash ledger.
- Reproduce bankruptcy/failure behavior and its warning period after measuring it.
- Repeat visitors and memberships feed the resort’s longer-term success. Inventory membership levels, costs, renewal/upgrade/loss conditions and their relationship to housing.
- **I.M. Picky:** visiting county commissioner; enjoyment can lead to offers of additional parcels. Success is earned through his visit, not a periodic unconditional land unlock.
- **Ivana Richman:** enjoyment can lead to a donated landmark; subsequent landmark availability follows the original progression.
- **J.P. Bigdome / SGA events:** reproduce the character and evaluation/event role from the reference installation. **V:** visit timing and exact eligibility/effects.
- Regular residences and celebrity homes require their original rules, appearance changes and golfer responses.
- The course plaque records celebrity homes, tournaments, top-rated holes, building-lot demand and completed SimStories as described by the manual. The top-right displays **Funds, Fun and Skill**.

### SimStories

Compatible pairs can enter story dialogue rather than ordinary banter. Their course experience influences the outcome. Positive conclusions add the original heart recognition; successful love stories produce a commemorative love bench. Preserve story progress, participants and outcomes across saves. Inventory original story/theme content and triggers; do not generate arbitrary conversations and count them as SimStories. **M1 p.16.**

## 11. SGA evaluation and hole character

**M1 p.24.**

Keep three independent questions: is the hole enjoyable, what skills does it exercise, and does the overall course satisfy SGA accreditation? Scenery alone must not manufacture skill scores.

| Classification | Skills rewarded according to the manual |
|---|---|
| Breather | No particular skill required |
| Freeway | Length |
| Precise | Accuracy |
| Creative | Imagination |
| Challenge | Length + Accuracy |
| Heroic | Length + Imagination |
| Strategic | Accuracy + Imagination |
| Classic | All three |

The evaluation considers course length, hole count, completion time, minimum fun, variety, scenic holes, skill-testing holes and facilities. Show requirements and current progress. Top 100 recognition increases a hole’s fees; Top 18 is a further recognition/benefit. Preserve automatic names, titles and presentation once cataloged.

**S1 hypothesis to verify:** skill ratings reflect score differences between golfers with and without Length, Accuracy or Imagination. Implement sample collection and inspectable cohorts; do not substitute a distance-only score. **V:** reference cohorts, sample windows, minimum sample size, caps, classification thresholds and accreditation tables. The previous engine is not evidence for these numbers.

**S2 cautions for verification:** the guide describes Classic thresholds above 1.00 in each skill, non-carrying per-hole stakes in challenges, automated putting, harder tournament setup options, and paths being incompatible with manicured turf. Confirm each against the chosen retail build before locking rules. Conflicting informal classification examples must not override the manual’s table.

## 12. Play as the resident pro

**M1 pp.10–12, 21–22; R1/R2/R5.**

- Gary Golf is the default resident pro. Reproduce naming and appearance customization, including the original portrait/body presentation and saved-pro transfer.
- Start with ten allocatable skill points; each is a ten-percentage-point increase. Reproduce allocation/removal rules and accomplishment-earned points.
- Ten skills: Power Hitter, Long Driver, Accurate Driver, Accurate Irons, Accurate Putter, Draw Shot, Fade Shot, High Backspin Shot, Recovery Skill and Luck.
- Distinguish pro skill percentages from the three broad visitor skill categories.
- Practice rounds, invited tournaments and pro-challenges use the actual course.
- The original interaction is **select shot type → move the target/trajectory with the pointer → click to execute**. No drag-to-power replacement and no reflex swing meter.
- Five techniques: Straight, Fade (left to right), Draw (right to left), High Backspin and Low Punch.
- Backspin can roll the ball back after landing depending on elevation. Punch must meaningfully travel under cover. Fade/draw must curve in world space, including after camera changes.
- Display attitude, club, distance, lie and skills in the original play panel. Include analysis/trajectory feedback and original automatic transitions.
- **V:** manual versus automatic putting, club-selection rules, gimme/hole-out logic, accuracy dispersion, wind, recovery, skill gains/losses, and simultaneous edit/play mode behavior. The auto-putting report in S2 must be checked before implementing a putting control.

**Acceptance:** play the same reference hole with contrasting skills and shot types. Compare trajectory, landing, recovery, roll and score. A rendered curved line without corresponding ball behavior fails.

## 13. Tournaments, challenges, championships and retirement

**M1 pp.22–25.**

- SGA invitations depend on qualifying fun/skill/course requirements; the tournament action is unavailable until invited.
- Hosting affects the resort and offers prize opportunities; it is not just a generic leaderboard modal.
- Reproduce tournament setup, entrants, order, rounds, results, prizes and original course-condition options after inventory/observation.
- Pro-challenges are one round against another professional on the owner’s course, with per-hole financial stakes and the original overall settlement rules.
- Preserve distinct practice, local challenge, hosted tournament and saved-course championship modes.
- Professional Accomplishments: the manual promises over twenty; inventory the exact original set rather than copying the previous project’s invented list. Award points once per qualifying achievement and grow the trophy display.
- Save/export a resident pro and save a course for championship use. Support selection of those files from the main-menu championship experience.
- Retiring/exporting a course and continuing a career must follow the original transition behavior.

**V:** complete accreditation thresholds; prizes and million-dollar progression; qualifying hole counts; event cadence; ties; disqualification/abandonment; tournament terrain settings and persistent par changes; export eligibility. Do not use the demo’s three-hole tournament limit as a retail rule without verification.

## 14. Reports and feedback

**M1 pp.13, 23–24.**

| Surface | Required information and interaction |
|---|---|
| Course Report | Per-hole size, par, average actual score/par, completion time, fun, skill usage, classification, average fees, total revenue and profit; course totals |
| Player Comments | Actual comments and occurrence frequencies; relevant complaints remain actionable |
| Routing Map | Hole order, swapping/reordering, employee locations/ranges, mood aura and home-value layers |
| Histograph | Funds, fun and skill over time, with notable events |
| SGA Evaluation | Accreditation requirements, measured status, classifications and recognition |
| Financial Report | Annual income, expenditure and profits |
| Membership Roster | Golfers who visited and membership status/details |
| Professional Accomplishments | Goals, completed milestones, trophy and skill-point consequences |
| Golfer/Employee inspectors | Identity, status and the original context actions |
| Snapshots | Automatic notable moments and user-requested golfer snapshots |

Reports are readouts of the same underlying simulation. Opening a report must not fabricate samples, awards or money. State an insufficient-data condition where the reference does.

## 15. Controls and original screen language

**M1 pp.3–10; R1–R6.**

The original compact bottom controls and expansive course view are the baseline. Preserve the recognizable sculpted lavender/blue shell, circular mode controls, contextual construction/play panels, course crest and top-right three-gauge hierarchy unless a shown alternative is approved. Avoid crowding the course with permanent instruction cards and dashboards.

| Original action | Key |
|---|---|
| Save / load menu | Shift+S / Shift+L |
| Repeat message | Shift+? |
| Zoom in / out | Z / X |
| Pause | Shift+P |
| Tree visibility / golfer names | Shift+T / Shift+N |
| Elevation grid | E |
| Fairway / green-tee / tree | F / G / T |
| Path / rough / sand / water | P / R / S / W |
| Lower / raise elevation | − / = |
| Rotate building or cycle applicable variant | Tab |
| Bench / open hole / analyze shot | B / H / / |
| Course / comments / histograph / finance | F1 / F2 / F3 / F4 |
| Routing / world / SGA / keyboard help | F5 / F6 / F7 / F8 |
| Members / accomplishments | F9 / F10 |
| Exit/menu behavior | Esc; browser-safe equivalent |

**B:** browsers reserve some function keys, fullscreen actions and system shortcuts. Supply visible equivalents and a clear shortcut legend. Do not hijack keys while typing. Browser zoom and focus behavior must remain usable. Touch needs equivalent select/place/confirm actions; it must not silently change simulation rules. The owner tracking progress on a phone does not imply redesigning desktop play as a mobile casual game.

## 16. Graphics approval before production rendering

**Owner refinement, 5 September 2026:** preserve the original game's stylized construction vocabulary. Fairways, greens and tees should read as joined tile-shaped areas, with straight edges, stepped outlines and modest corner rounding. Dimensional lighting and buildings remain useful, but photorealistic landscaping is not the target. Pathways must remain outside teeing surfaces and meet bridges along their centreline. Original screenshots take priority over the generated concept wherever these shape decisions conflict.


### What the supplied references actually show

- Fine-grained turf and readable mowing stripes; organic bunker/green outlines shaped by construction.
- Detailed, irregular trees with foliage silhouettes, trunks, undergrowth and shaded ground, not repeated glossy spheres.
- Recognizable multi-part buildings: roofs, windows, entrances, paths, planting and regional architecture at a consistent scale.
- Dense but legible resorts: tennis courts, hotels, bridges, streams, housing, flowers, rocks and animated small incidents.
- Small golfers with distinctive heads and poses, names/conversations over the course, and larger expressive portraits in character panels.
- Different regional identities, including the tropical sand/palms/turquoise water in R1/R6 and temperate landscaping in R3/R5.
- Wear and wild growth interrupt maintained turf. Dandelions must remain readable without becoming oversized ornaments.

### Required sample package

1. **A — faithful original-style scene:** preserve original composition, scale, texture density and lavender UI; improve only the clarity needed to assess it.
2. **B — dimensional interpretation for comparison:** the same kind of course and original UI hierarchy, with more dimensional lighting/materials. This is a proposal for an exception, not the default specification.
3. Each sample must contain a tee, playable-looking fairway, green/flag, bunker, stream/bridge, clubhouse, varied vegetation, golfers and a visible neglected/dandelion area.
4. Include a close inspection of foliage, turf, dandelions, water and building materials before final asset approval; avoid hiding quality behind distance or blur.
5. Clearly label generated concept images as **concepts, not running game screenshots**.
6. After concept approval, implement an in-browser art test of the chosen look, with pan/zoom, actual camera scale and animation. Obtain approval of that real render before mass-producing assets or building the full resort.

Approval must identify the sample/revision and any accepted departures from the original. Silence is not approval. Do not build a whole game behind an unapproved look, and do not swap to the old renderer when the new one proves difficult.

## 17. New engine and browser architecture

**B — proposed implementation requirements, not claims about the original engine.**

The implementation language, rendering library and data architecture can change; player-visible rules cannot drift unnoticed. A native browser renderer is intended, not streaming the Windows executable.

- Fresh TypeScript simulation with a fixed simulation clock, explicit command/event boundaries and reproducible random seeds for testing.
- Separate world/course state, golf simulation, visitors, maintenance, economy, progression, content and persistence from presentation.
- One authoritative terrain representation for surface, height, holes, ownership, buildings and navigation. Render geometry and picking must agree with shot collision and movement.
- Separate ball flight/ground roll from golfer locomotion. Human and AI golfers use compatible golf rules.
- Distinct random streams for simulation and visual decoration, so prettier grass cannot change tournament results.
- A data catalog with source IDs for costs, effects, thresholds, upgrades, text, character definitions and theme variations.
- Event-driven reports and accounting. Expose why a fee, attitude change, award or maintenance task occurred for parity testing.
- A renderer replaceable without rewriting the simulation. Evaluate a WebGL/3D renderer for approved dimensional art, or high-resolution layered rendering for strict original-style approval. Final library selection follows the approved sample and a performance test.
- Camera/projection and animation must match the chosen reference. True 3D geometry is not a license to invent an orbit-camera simulator or alter terrain rules.
- Versioned local saves, explicit export/import, recovery from failed writes, and validation of imported content. Use browser storage/file controls instead of Windows dialogs.
- Browser tabs must not create runaway income while suspended. Preserve the original pause/time semantics as closely as the platform permits; document the background-tab adaptation.
- Audio starts after the browser’s required user gesture; volume/mute and pause work consistently.
- WebGL/context-loss or unsupported-browser states must explain recovery rather than silently render a broken course.

Suggested fresh layout after visual approval:

```text
simgolf-reborn/
  whattobuild.md
  references/          owner screenshots and evidence index
  research/            observations, unknowns, parity scenarios
  graphics/            approved concepts and art specifications
  src/
    simulation/        course, golf, visitors, maintenance, economy, progression
    content/           independently cataloged original rules and themes
    rendering/         approved renderer, camera, assets and animation
    interface/         menus, construction, play controls and reports
    persistence/       versioned saves and import/export
  tests/               behavior, replay, integration and approved visual scenes
```

This is a proposed layout. No production game implementation is authorized to bypass the current graphics-approval gate.

## 18. Sound, animation and atmosphere

**M1’s described events; R screenshots; S3 corroboration.**

Inventory music, interface sounds, building placement, swings, impacts, splashes, cups, celebrations, disappointment, service interactions, staff work and ambient nature. Reproduce the relationship between action and feedback, with the relaxed/comic tone of the original. Avoid generic constant reward chimes or a silent resort.

Required animation coverage includes walking and waiting; addressing, swinging and putting; ball flight/bounce/roll; emotional reactions; food/drink/rest; groundskeeping and turf repair; carts and verified facility activity. Idle decoration must be distinguishable from a golfer’s actual state. No full day/night cycle, weather system or cinematic effects are added just because the old web prototype had them; confirm original behavior first.

## 19. Delivery phases and gates

| Phase | Deliverable | Exit condition |
|---|---|---|
| 0 — specification | This document, evidence index and unresolved-observation list | Scope is explicit; unknowns are not disguised as completed research |
| 1 — visual approval | A/B concepts, detail crops and an approval record | Owner selects/revises a direction explicitly |
| 2 — actual art test | New browser renderer, one reference scene, pan/zoom and representative animation | Owner approves the real rendered look; performance and picking work |
| 3 — first playable hole | Empty property → construction → opening → paired golfers → fees/needs → dandelions → groundskeeper → save/reload → resident-pro round | Complete observed loop, not a scripted demonstration |
| 4 — small operating course | Three/six-hole operation, paths, core facilities, staff, reports and progression | Cross-system outcomes reconcile; skilled staff unlock matches reference |
| 5 — complete resort | Up to 18 holes, world/properties, themes, full facilities/upgrades, memberships, visitors, housing and stories | Catalog coverage and long-session behavior verified |
| 6 — complete golf career | SGA, rankings, challenges, tournaments, accomplishments, saved-course/pro championship play and retirement | Reproducible comparisons across career transitions |
| 7 — parity and delivery | Original-versus-browser scenarios, approved visuals/audio, performance, persistence and hosted preview | Owner can review remotely; no open critical parity failures |

These phases organize work; they do not reduce the final scope to one hole. Each milestone must have a playable or reviewable artifact and a short account of what is complete, changed and still uncertain.

## 20. Acceptance scenarios

| ID | Scenario | Pass condition |
|---|---|---|
| P01 | New game at each difficulty/environment | Original choices, starting state and property behavior |
| P02 | Build/open first hole | Tee/green/route/paint/H or flag flow; no premature golfer income |
| P03 | Safe route versus hazardous shortcut | AI decisions and results depend on skills and real terrain |
| P04 | High shot, punch, draw, fade, backspin | Distinct trajectories, collisions and release behavior |
| P05 | Long walk and congestion | Waiting/fatigue appear; paths/carts/staff improve measured outcomes |
| P06 | Hunger/thirst/rest | Relevant services and animations resolve relevant needs |
| P07 | Dandelion neglect and cleanup | Visible growth, mood effect and actual groundskeeper removal |
| P08 | Divots → crabgrass; basic versus skilled staff | Original maintenance distinction, progression and persistence |
| P09 | Disconnect/reconnect a facility | Appearance, accessibility and operation agree |
| P10 | Skill-training facilities | Existing skill improves; absent skill is not granted improperly |
| P11 | Picky/Richman visits | Visit quality drives the appropriate conditional reward |
| P12 | Compatible SimStory pair | Dialogue progress and happy-ending/love-bench consequences persist |
| P13 | Membership and housing | Original conversion, lot valuation and celebrity effects |
| P14 | SGA classification and recognition | Measured play supports classifications and fee consequences |
| P15 | Pro customization and accomplishments | Correct skills, allocation and non-duplicated rewards |
| P16 | Challenge/tournament/practice distinction | Correct eligibility, rules, scores, prizes and completion/exit behavior |
| P17 | Save/export/import/retirement | Resume without lost state, duplicated rewards or accidental resets |
| P18 | Reports versus simulation | Cash, fees, statistics and comments match real events |
| P19 | Dense course at approved scale | Clear picking, readable golfers/dandelions, no occlusion or depth errors |
| P20 | Browser lifecycle and remote review | Resize, focus, suspension, recovery and reachable preview all behave predictably |

**B performance targets to measure, not promises:** smooth 60 fps on the agreed desktop reference device and at least 30 fps on the agreed phone/tablet art-test device; responsive terrain painting on a populated 18-hole map; no unbounded memory growth. Set the exact device matrix and load budget at the real-render gate. Do not claim performance from a still image.

## 21. Outstanding research before numerical parity

1. Identify and run the supplied retail executable; record patch/language and reference settings.
2. Capture timestamped first-hole, maintenance, practice-round, evaluation and tournament journeys. Identify automatic putting and edit/play interactions explicitly.
3. Inventory all sixteen original property entries and every content/upgrade/achievement table.
4. Measure costs, fees, income timing, wages, bankruptcy grace, memberships and special-visitor conditions.
5. Measure ball/lie/skill behavior, AI shot selection, walking/queue timing and stat aggregation.
6. Measure dandelion appearance/removal, divots and crabgrass, including player-click behavior.
7. Resolve secondary-source disagreements through original behavior, keeping the evidence trail.
8. Inventory original Theme Pack, golfer customization and championship file behavior; distinguish native browser equivalents from binary-file compatibility.

## 22. Scope protection

Social feeds, daily challenges, seasons, quests, invented currencies, facility skill trees, monetization and obligatory modern dashboards do not belong in the fidelity baseline. The owner has explicitly authorized future multiplayer: cooperative course building, course/earnings competitions and multiplayer tournaments on courses authored by different users. Architect for those now; track their delivery separately from original single-player parity in [backlog.md](backlog.md). Authentication, ownership and event standings are required parts of that multiplayer extension. Browser save/export and a reachable review URL are necessary adaptations; extra product systems require a separate decision.

The release cannot be called a 1:1 recreation while major original loops are absent or numeric rules remain unverified. Passing tests against our own assumptions proves consistency, not original-game fidelity. **Current milestone:** after the owner accepted the refined tile-based render and said “Good. Continue”, the first playable hole now connects construction, visitors, fees, needs, maintenance, saves and practice. See [playable.md](playable.md) for implemented behavior, provisional rules and remaining gaps. Full-game and numerical parity remain outstanding.

**Owner extension to the style direction:** tile-based shapes apply to bunkers and water too. Bunkers use stepped rectangular footprints with modest corner rounding; water uses straight reaches and stepped bends. This supersedes the earlier exception allowing organic bunker and stream outlines.

**Paths follow the same style:** all walking routes use grid-aligned straight segments, right-angle turns and square ends. The main route steps around the playing surfaces; bridge approaches and the tee grass buffer are preserved. Animated walkers follow the revised route.

**Rounded edges and green collars:** the owner supplied a further original-game close-up and requested rounded corners and a green border. Editable terrain now rounds the exposed perimeter of connected tile regions and adds a continuous dark-green collar around fairways, tees, greens, bunkers and painted water. Shared tile edges remain seamless; the underlying stepped construction grid is retained. Paths receive a smaller corner radius and a narrower edging.

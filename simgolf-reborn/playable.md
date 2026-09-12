# First playable hole — 5 September 2026

The owner accepted the refined render and authorized continuing after the tile-based course, bunker, water and path changes. This milestone connects that rendering direction to a live simulation. It is not a claim of original-game numerical parity or completion of the whole specification.

## What works

A new property contains a clubhouse, stream, bridge, short access paths and dandelion patches. No tee, green or fairway is prebuilt. Construction places a tee and green, paints fairway/firm fairway, bunkers, water, paths and rough, and adds benches or snack bars. Painting follows the square grid; fast drags fill adjoining cells. Failed placements do not spend money or partially alter the brush footprint. The natural stream/bridge and scenery are fixed for this first property.

Opening checks tee-to-green distance and walkable access from the clubhouse. The flag and H/button open or close the hole. Closing stops new arrivals while current guests finish. Moving a tee/green requires those rounds and any active practice to finish.

Guests arrive in pairs, queue, walk, choose shots, follow their balls, putt, finish and pay a green fee once. Length, accuracy and imagination affect provisional shot choice/results. Ball travel includes flight, curved shots, two diminishing bounces, release by landing surface, decelerating roll, and rest. Water or unreachable landings cause a penalty/drop. The same shot state survives reload. Guests accumulate fatigue, hunger and thirst, react to nearby weeds, use connected amenities after playing, and leave through the clubhouse. Reports and cash derive from actual events and transactions.

Dandelions grow as persistent patches. Groundskeepers walk to reachable patches and spend time clearing them; distant weeds do not disappear immediately on hire. Wages are charged. Shots from fairway/firm fairway leave visible wear. Basic groundskeepers remove weeds, **not divots**. Turf Technicians and crabgrass progression are now implemented as described below.

Gary can practise the player's layout, choose straight/draw/fade/backspin/punch and click a landing target. Putting on the green is automatic in this prototype. Practice never earns visitor green fees. His initial skill allocation is now available (see below); career and tournaments remain incomplete.

Autosave runs every five seconds and on normal page exit. Manual save, JSON export/import and confirmed new-course replacement are in the club menu. Invalid saved state is kept intact rather than silently overwritten. A save stores the seeded random streams, people, shots, maintenance targets, needs, tiles, finances and progression through the current round. No offline simulation runs while the page is hidden or a menu is open.

## Provisional tuning — not verified original values

The values are centralized in `scene/src/simulation/rules.js` for later comparison against the supplied executable.

| Rule | Current prototype |
|---|---|
| Starting cash / green fee | $50,000 / $100 per happiness point at hole completion |
| Tee / green | $150 / $250, footprints 3×3 / 5×5 cells |
| Fairway / firm / sand / water / path | $10 / $15 / $20 / $30 / $12 per changed cell |
| Bench / snack bar | $80 / $600 |
| Groundskeeper | $150 hire, $12 wages per simulated minute, maximum three |
| Visitor arrivals | A pair every 24 simulated seconds, up to six unpaid guests |
| Weed growth | One patch per 10 simulated seconds, maximum 180 |
| Carry and scale | Base 27 world units; four yards per unit; two-unit cells |
| Par | Distance bands below 180 yards / below 400 / otherwise: 3 / 4 / 5 |
| Maximum strokes | Pick up after 12, counted as a completed visitor hole |
| Services | Connected adjacent path required; three-second visit; $3 snack sale |

These timings deliberately make the complete loop reviewable in a short session. Tests prove internal consistency, not that these numbers match SimGolf. The developed-resort clubhouse asset is temporarily scaled down for the starting property. Its original starting-building counterpart, service animations and all theme catalogs still need work. Painted water currently uses a flat terrain overlay; the natural stream has modeled banks and animated water. Shots do not yet collide with tree canopies or model full terrain-dependent physics.

## Verification

- Fourteen existing art/layout/trajectory regressions remain available through `?mode=art`.
- Seven simulation scenarios verify rejected construction, fees only on completion, deterministic save/resume, traveling groundskeepers, connected services, flight/roll, water penalties/bridge routing, and invalid saves.
- Two browser journeys build and open an actual hole through canvas controls, finish a round, save/reload, hire staff, and place a tee/open the save menu at a 390×844 touch viewport.
- Desktop and phone-emulated screenshots are in `graphics/samples/playable-*.png`. `playable-example.json` imports the pictured playable layout.
- A production build succeeds. The shared Three.js scene bundle still produces Vite's advisory above 500 kB before compression. A physical phone performance benchmark and public remote hosting remain outstanding.

## Next implementation stage

Extend the same model to several holes, ordered rounds, hole editing/reports, additional original facilities and progression. Verify original prices, timing and skill/career behavior before calling these rules faithful. Continue toward the complete resort and tournament scope in `whattobuild.md`; this first hole does not replace that scope.

## Ordered course rounds — current extension

The playable model now supports **1–18 holes**, each with a stable ID, tee/green ownership, opening state, independent pair queue and per-hole totals. The hole selector and Add hole control build further holes; numbered flags remain visible for each. Selecting a hole changes editing context, not the hole a golfer is playing. Clicking any flag opens/closes that hole.

Arriving pairs book the ordered set of open holes at arrival. Closing a hole excludes it from new bookings while existing booked rounds finish; tees and greens cannot be relocated underneath booked rounds. A visitor pays once at each completed hole. `holesCompleted` counts paid hole completions and `rounds` counts finished itineraries. Per-player scorecards retain hole ID, display number, par, strokes, fee and completion time. The most recent 100 completed rounds remain in Reports/Scorecards. Reports reconcile hole and course totals.

Golfers walk to the cup, then to the next tee; needed connected amenities can be visited between holes. A blocked next-tee route waits for repair. Gary practises the ordered completed holes starting at the selected hole, with per-hole and total scores and no visitor fees. Original hole-order editing, green extension/cup relocation and richer tournament scorecards remain further work.

Save schema 2 migrates actual schema-1 saves, retaining cash, terrain, people, ball/shot state and paid outcomes. Old single-hole terrain receives `hole-1`; visitors receive round IDs and itineraries. Protocol/rules version 2 requires explicit hole IDs on construction/opening/practice commands. Version-1 receipts are validated then retired during migration; old-version commands reject rather than replaying against the new rules. New-version retries retain their existing guarantees.

Verification includes legally constructing and opening 18 holes through the construction API, completing 18-hole rounds, rejecting a nineteenth hole, two-hole browser construction/selection/scorecards, closure during booked rounds, per-hole fee reconciliation, a genuine version-1 fixture, deterministic reload between holes, independent tee/green ownership, and a complete multi-hole practice round. These demonstrate working course rounds; original-game tuning and the remaining resort/career systems are still incomplete.

## Putting-surface editing

**Green** now places the initial green and thereafter extends the selected hole's existing surface with the selected brush. It no longer replaces the entire green on each click. **Move cup** relocates the flag to a tile on that surface; **Trim green** restores selected edge tiles to rough. The operation rejects detached additions, cuts that split the green, removal of the cup, another hole's turf, or changes while the hole is open/booked. The rounded perimeter and green collar follow the resulting connected shape.

New turf uses provisional `$10/tile` tuning; cup moves and trimming are currently free. These prices and the conservative closed/unbooked editing restriction have not been measured in the original game. Arbitrary new tee placement still moves its footprint; full terrain elevation, demolition, variants, scenery and original editing interactions remain unfinished.

The cup stays the target used by golf simulation, white route and flag placement. Save validation checks that each cup lies on one connected putting surface. Protocol 3 pins the changed green-command behavior; known protocol-1/2 saves migrate while old command envelopes reject. Green edits use the same validated/retry-safe command host as all other construction.

## Original terrain families and landing response

Deep rough, pot bunkers, waste bunkers, brush and rocks are now selectable construction tools. `simulation/terrain.js` centralizes their names, colors, walking costs, recovery carry, release, bounce and AI preference. These qualitative differences follow the supplied Parklands terrain descriptions (D2). All numerical tuning remains provisional.

Firm fairway releases farther and bounces higher than ordinary fairway. Deep rough reduces recovery more than ordinary rough; pot/waste bunkers and brush constrain recovery differently. Sand absorbs impact; rocks cause seeded sideways deflections on landing. Both release and putting sample crossed water cells so a ball cannot skip a narrow water strip and evade the penalty. Save/replay retains shot landing behavior, bounce and hazard state. The UI reports the golfer's actual current lie.

Deep rough has raised grass, brush and waste bunkers have low vegetation, and rock tiles have modeled outcrops. These are batched instances with presentation-only variation; rendering never consumes simulation randomness. Pot bunkers have a shaded lip; excavated geometry and full elevation remain future work. Tree-canopy collision, full surface transitions during roll and tricky-green slope/putting behavior are not yet implemented. This remains terrain-dependent prototype physics rather than original-runtime parity.

Protocol 4 pins this behavior; known protocol-1/2/3 saves migrate, while their retired command envelopes cannot execute under new rules. New tests cover recovery comparisons, release/bounce, deterministic rock deflection across reload, terrain persistence, protected tees, rolling/putting water crossings and browser construction of every added hazard.

## Course order and removal

Edit holes changes the order used by new bookings. Existing visitors retain their booked route and display numbers. Removing a closed, unused hole retires its stable ID and preserves historical scores, paid fees and aggregate statistics. Its tee and green disappear; shared fairways and hazards remain. Removing the last hole creates a fresh empty hole with a new ID.

The Remove tool previews and confirms removal of player-built facilities or painted terrain. Tee/green removal instead reviews removal of their whole hole. Booked holes, amenities being used, and fixed clubhouse/stream/bridge scenery are protected. Cancellation changes nothing. Removal currently gives no refund; this is provisional rather than measured original behavior.

All edits use validated commands. A removal confirmation retains its reviewed revision, so intervening construction causes a conflict instead of removing a changed target. The renderer removes retired flags and facilities and updates flag numbers after reordering. Save validation includes archived hole totals and migrates older saves with booked display numbers. Five model tests and a browser journey cover ordering, historical accounting, last-hole replacement, protected demolition, stale confirmations and cancellation.

## Resident pro skill allocation

Play → Pro skills offers the ten original named skills and ten starting points, in 10% steps. Points can be returned and reassigned between rounds; this timing restriction is provisional. Practice snapshots the allocation, so mid-round edits cannot change shots. Existing saves receive an unallocated profile; an already-running legacy round retains its previous behavior until completed.

Power and Long Driver influence carry, Accurate Driver/Irons influence dispersion by lie, Accurate Putter influences automatic putting error, Draw/Fade influence flight curvature, High Backspin influences release, Recovery mitigates poor-lie carry loss, and Luck reduces dispersion. These response coefficients are prototype tuning, not measurements of original numerical behavior. Accomplishment-earned points, appearance/name customization, club selection and the full career remain open.

Protocol 5 pins the new shot behavior. The resident profile is separate from the live practice golfer, validated on import, and changed only by owner commands; it still needs a separate authenticated career store for future multiplayer. Skill allocation cannot exceed the available budget, and retrying a command cannot spend twice. A phone screenshot is at graphics/samples/pro-skills-phone.png.

## Turf Technicians and neglected turf

Repeated shots leave divots on fairway and firm fairway. At four accumulated divots, sixty simulated seconds of neglect produce visible dark-green crabgrass rosettes. Walking over crabgrass reduces golfer mood. The threshold, delay and mood rate are provisional, not measured original constants.

The original six-hole daily-fee gate is represented by six completed tee/green layouts in the current daily-fee-only prototype. Turf Technicians then become available in Staff. They perform ordinary weed removal and also walk to worn turf, work for four seconds, repair divots and clear crabgrass. Basic groundskeepers cannot claim turf jobs. Technicians wear blue shirts and animate while repairing; statistics count the actual divots and crabgrass removed. Competing workers reserve separate jobs, and replacing/removing a target does not award repairs for missing turf.

Prototype technician pricing is $300 hire / $24 per simulated minute, versus $150 / $12 for a groundskeeper. The existing three-worker cap remains provisional. Staff naming, dismissal and repositioning are now implemented below; other employee classes and original wage/work-rate comparisons remain unfinished.

Protocol 6 pins maintenance growth and skilled staff behavior. Saves preserve role, reserved job, repair progress, statistics and neglect timestamps; older staff migrate as groundskeepers. Tests cover the six-hole gate, command retries, neglected control turf, basic-versus-skilled work, travel and repair delay, exact mid-work reload, wages, contested/removed jobs, and the browser hiring/report flow.

The maintenance browser journey also exposed and fixed page-exit autosave overwriting a newly imported or reset course. Replacement now suppresses the old game’s final save; browser checks cover import and confirmed reset across navigation.

## Managing individual employees

Staff now has an employee selector, Find employee, Send to area, Rename and confirmed Dismiss controls. Clicking a worker also selects them. Names are treated as plain text, have a forty-character limit and survive reload. Send to area enters a canvas destination mode; a valid request releases the current job, preserves completed-work statistics and walks to reachable ground before automatic work resumes. Invalid destinations leave the current job intact. Cancel destination or Escape exits destination selection. This walking relocation is provisional until original employee placement interaction is observed.

Dismissal releases any job reservation and removes the employee from future wage batches. There is currently no severance cost or hire refund; those values are unverified. Completed global dandelion totals and already-paid wage transactions remain. Individual statistics belong to the current employee and are not yet retained in a historical staff report.

Owner/editor commands manage employees; spectator/golfer roles cannot. Command retries cannot repeat a dismissal against a replacement hire. Browser controls use stable employee IDs, and imported names are rendered as text rather than markup. Tests cover job interruption, invalid destinations, deterministic relocation reload, future wages, permission checks and a phone journey through rename/move/cancel/dismiss.

## Original training facilities

Construction now includes a Pro Shop (Accuracy), Driving Range (Length) and Putting Green (Imagination). Their original purposes follow the manual catalog in the specification. Each has a distinct dimensional model: a storefront, striped range with hitting bays/netting, and rounded practice turf with several cups. Footprints protect construction and use an entrance on a cardinal side connected by path to the clubhouse. Reports show connection status.

Visitors can train before their first tee and between holes. A completed three-second visit improves an existing skill once per round; it does not grant an absent skill or stack by repeatedly visiting duplicate buildings. Length increases available carry, Accuracy reduces seeded dispersion and Imagination widens the alternative landing positions considered by the golfer. The golfer panel shows completed training. Training does not generate snack-sale income. Disconnecting a facility before completion cancels the benefit. Save/reload preserves training and in-progress visits.

Prices ($1,200 / $1,600 / $1,000), footprints (3×3 / 5×5 / 5×5), visit duration, round-duration benefits and effect strengths are provisional. Regional counterparts, original unlocks/upgrades, animations inside the facilities and observed numerical fidelity remain unfinished. The current service model permits concurrent visits rather than a modeled facility queue.

Protocol 7 pins training behavior and migrates previous protocol receipts. A shared facility catalog defines placement, entrances and skill purpose independently of rendering. Training outcomes are computed by the simulation, not accepted as client-submitted skill increases. Tests cover all three facility placements, visits and disconnection, eligibility, non-stacking, reload and browser construction.

## Share a layout and practise it separately

Club menu → Export course layout exports a complete, reachable course with its title. Club menu → Practise an exported course imports that JSON into a separate practice mode. Build/staff controls are unavailable there; each layout has separate practice progress, and Return to my resort restores the original resort save. Completed original tournament eligibility is not yet required or implemented, so this feature is labelled practice.

The package includes geometry/facilities and a content digest, not the designer's money, employees, visitors, pro skills or scores. Wear and weeds are excluded as resort maintenance state. Package rules/property versions must match; changed or unsupported data rejects. Practice has no visitor income or running resort upkeep. The currently supported property remains Willow Brook. Tournament invitation/scoring/prizes, career transfer and network multiplayer remain unfinished.

## Outcome-based course report

Reports → Course report now shows each hole's paid completions, average strokes and fees, plus observations collected from the first shot to completion. The observation records the visitor's initial Length/Accuracy/Imagination and completed training flags, then aggregates strokes, elapsed play time and finishing mood by that profile. Practice rounds are excluded, and the existing completion guard prevents duplicate samples.

Each skill row shows sample counts and average scores with and without that skill. The displayed difference is the latter minus the former; it is an observed comparison, not yet an original SimGolf rating or a causal estimate. Inspect golfer groups expands the underlying skill/training cohorts. No Breather/Classic classification, SGA approval or fee award is fabricated from these provisional comparisons.

These are lifetime observations for the hole, including earlier layouts if it is edited. Original sample windows, reset behavior, skill classifications, fun formulas and accreditation thresholds remain to be verified. Average finishing mood is labelled as mood, not original Fun. Play time excludes arrival/tee waiting before the first shot.

Older saves keep existing scores/fees but start with empty observation cohorts; already-started legacy holes are omitted rather than inventing a missing start time. Pending new observations survive reload. Cohorts remain attached to stable hole statistics through reordering and retirement. Imported shared layouts exclude owner observations and practice cannot add to them. Tests cover reconciliation, mixed training profiles, absent cohorts, migration, mid-round persistence and the phone report.

## Planted trees and shot obstruction

Build → Tree plants editable trees on the terrain grid, with the current brush size. They use the existing foliage texture, branching trunks and batched leaf geometry. Restore rough or Remove clears them; protected tees/greens and fixed scenery cannot be overwritten. Tree cells are obstacles to walking. Layout exports include planted trees.

Airborne shots sample their curved flight against a simplified trunk/canopy volume. A collision retains the actual impact position, interrupts the flight and drops the ball to the ground; it does not let the ball finish its original path. High trajectories, low punches below the canopy and curved flights can avoid an obstruction when their path is clear. Impact state survives reload. Ordinary unobstructed shots retain their bounce and roll. Ground-roll/trunk collisions and richer ricochet/recovery remain unfinished.

This applies to newly planted trees. Existing decorative background trees still have only the property's fixed walking restrictions; their full shot collision integration is pending. Tree species, growth, original prices and collision coefficients are unverified. The current $75 placement cost and simple impact/drop response are provisional. Protocol 8 pins planted-tree behavior; older saves migrate, and older exported packages require their original supported rules rather than silently changing.

## Soda Vendors

Staff now offers the original basic Soda Vendor role, with the same naming, locating, relocation and dismissal controls. Vendors walk toward thirsty guests, reserve different customers, and provide a visible two-second refreshment interaction when a golfer stops to queue or address the ball. The golfer pauses during service and resumes afterwards. The vendor wears a gold shirt and carries a cooler.

Only completion clears thirst and increments drinks served. Interrupted service has no effect; dismissing or relocating the employee immediately releases the customer. Reservations, travel, service progress and counters survive save/reload. Vendors do not clear dandelions or repair turf, and the basic role does not provide the skilled Refreshment Consultant's additional attitude effect.

The $150 hire / $12-per-minute wage, thirst threshold 50, two-second duration, three-employee cap and no separate drink-sale charge are provisional. Original vendor motion/service animation, prices and skilled upgrade remain to be compared with the reference game. Protocol 9 pins vendor behavior. Older staff receive a zero service counter on migration. Tests cover travel/service, exact reload, customer reservation, interrupted/dismissed work, retry-safe hiring and phone controls.

## Tennis Court and arrival attitude

Build now includes a Tennis Court with two green courts, red surround, white markings, nets and perimeter fencing. The four cardinal entry gaps align with the supported path entrances. Construction, blocking footprint, removal and layout sharing use the shared facility catalog. Static geometry is merged by material to avoid one draw call per fence strand.

A connected court applies a minimum mood to incoming visitors, preserving higher starting moods and leaving existing golfers unchanged. This follows the manual's yellow minimum starting-attitude description on p.19; it does not add an unsupported tennis visit. The prototype's yellow mapping (60/100), deterministic arrival mood range (35–85), $2,200 price and 7×7 footprint remain provisional. Multiple courts do not stack the floor. Original difficulty-dependent attitude behavior, unlocks and regional variants remain unfinished.

Protocol 10 pins the starting-condition change. Tests cover direct floor behavior, actual paired arrivals, disconnection, save persistence, protected footprints, shared layouts and browser construction/report status. See references/observations/facilities-manual.md for the primary-source recheck and the distinction between verified purpose and provisional mechanics.

## Connected and disconnected path appearance

Path appearance now follows the clubhouse-connected path component: joined paths have the finished pale surface, while detached branches show brown tracks. Connecting or removing a link updates the whole affected component. Tile-aligned runs, rounded perimeter corners and green edging remain intact. This implements the original manual's visual distinction on printed p.18; the exact mud texture is the current art interpretation.

Facility entrances use the same derived network as rendering. Diagonal contact does not count, a removed clubhouse entry disconnects the network, and the fixed bridge carries connected paths to the opposite bank. Detached paths remain walkable terrain, but cannot supply a functioning clubhouse connection. Connectivity is recomputed from geometry after reload; it is not trusted as a saved client flag. Protocol 11 pins the corrected entry/network rule and migrates prior receipts.

Tests cover branch reconnection/removal, diagonals, entry removal, bridge continuity, facility access, save/reload and browser before/after screenshots in graphics/samples/paths-*.png.

## Ballwashers

Ballwashers are buildable, path-connected single-tile facilities with a post, cleaning reservoir, handle and towel. Visitors stop before each tee to clean their ball; a completed visit reduces shot dispersion for that hole only. Changing holes clears the benefit, and disconnecting the facility before cleaning finishes grants nothing. Cleaning does not award a permanent skill, mood bonus or sale. Mid-visit saves retain deterministic progress. Protocol 12 separates this behavior from previous rulesets; existing saves migrate.

The original manual (printed p.18) establishes a stop, improved accuracy for the remainder of the hole, and a possible pace penalty. The $100 price, three-second service, 25% dispersion reduction and automatic pre-tee selection are provisional. Manual use by the player-controlled pro and opportunistic visits during a hole remain unfinished. No original executable comparison has verified these constants.

## Landscape construction and aiming

The build palette now uses illustrated isometric SVG tiles instead of generic text symbols. Raise/Lower land brushes edit heights by 0.5 units, up to ±6; terrain geometry, walking costs, uphill carry and downhill release respond. Prices and slope coefficients are provisional. The eight-position Rotate tee tool turns the selected tee markers and direction arrow in 45° steps while the hole is closed and unused. Manual shot aiming remains free.

White out-of-bounds stakes follow the perimeter of painted out-of-bounds areas. A ball finishing there incurs one penalty stroke and returns to its previous shot position (stroke and distance); Clear stakes removes markings. Bridge decks can be placed on water, and paths crossing water automatically build decks. Join decks to paths on each bank. The original bridge remains a fixed structure for now.

The original stream now migrates into ordinary editable water tiles: Restore rough fills it and Water widens or reroutes it. The separate channel texture, water mesh and fixed bank rocks are disabled in the playable scene; the art-reference scene retains its original presentation. Course packages include elevations, bridges, boundaries and tee directions, with ruleset 13 compatibility separation. All travel and construction still pass through the authoritative command host.

The full ground aiming line extends to the pointer even beyond reachable carry, while the raised arc shows the reachable shot. Hole guides render above terrain to avoid disappearing into slopes. Exact original elevation/trajectory physics, shaped bridge spans, and original asset fidelity remain unfinished.

### Connected bridge decks

Bridge tiles now share open edges, with railings only against exposed water or the property boundary. Adjacent decks form straight runs, corners or wider platforms without internal rails. Dry-bank entrances remain open. Remove deletes just the selected deck and keeps its underlying water; Restore rough intentionally fills the water as well. Both operations protect decks reserved by existing golfer/staff walking routes. Ruleset 14 records the changed removal behavior. The initial fixed bridge and shaped/arched player-built spans remain outstanding.

### Starting bridge removal

The starting bridge is no longer fixed. Remove selects the whole original structure and asks for confirmation. Removal restores the water cells beneath the span while keeping the dry approach paths. Crossing routes and facility connections respond immediately; new bridge decks can replace the old crossing. Occupants, balls and reserved walking routes protect the original span from removal while in use. Existing saves retain the starting bridge unless removed. Save state and published course snapshots preserve removal explicitly under ruleset 15.

### Player-controlled ball cleaning

Play mode now has **Clean ball**. When Gary is ready for a shot, this chooses the nearest reachable, clubhouse-connected Ballwasher, walks there, completes the service, then returns him to the unchanged ball position. It works after earlier shots on the current hole, adds no stroke and grants the same temporary accuracy benefit as visitor cleaning. Disconnecting the washer cancels the benefit; an unavailable return route waits for repair. Facilities cannot be demolished while Gary is using or approaching them. The controlling player alone can submit the command, including isolated published-course practice; repeated network commands do not restart the visit. Ruleset 16 separates this behavior. Selection, timing and strength remain provisional, and visitor in-hole selection remains outstanding.

## Flowerbeds

Flowerbeds are buildable single-tile scenery with a raised bed and mixed-colour flowers. Golfers walking within four world units receive +4 mood, capped at 100, once per hole across all flowerbeds. Paid/departing golfers do not receive the benefit, and stationary golfers cannot repeatedly collect it. The per-hole memory survives reload and resets at the next hole. Flowerbeds are included in shared-course snapshots and Reports identify them as scenery rather than disconnected service buildings. They need no connected path in this implementation.

The original specification/manual establishes that flowers improve the golfer experience; the $75 price, four-unit range, +4 mood, once-per-hole cap and no-path rule are provisional pending original-runtime observation. This is separate from dandelion weeds, which remain undesirable and groundskeeper-removable. Ruleset 17 records the new scenery effect.

## Resort Hotel

The Resort Hotel is buildable with a protected 5×5 footprint, a multi-storey rendered building, roof, windows and verandas. A clubhouse-connected hotel makes new visitors arrive with 100 energy rather than 90 and reduces their energy drain from 0.18 to 0.12 per simulation second. The benefit is a saved arrival condition; later disconnection affects future arrivals, not people already rested. Multiple hotels do not stack, and Gary's practice round receives no hotel benefit. Tired golfers below 30 energy now gradually lose mood, making stamina relevant to comfort as well as the existing low-energy shot penalty.

The manual's printed p.20 confirms well-rested golfers able to play longer courses and stay happier. The $5,000 price, footprint, energy values, fatigue rates and mood loss are provisional. Hotel room bookings, occupancy and room income are not represented, and should not be inferred from the service counter. Exports include the building and fresh practice instances do not inherit resort visitor rest state. Ruleset 18 records these changes.

### Construction palette categories

All / Course / Landscape / Resort filters organise the illustrated construction tray. Inspect and Remove remain available in each category. Changing to a category that excludes the active tool returns to Inspect, preventing an invisible tool from continuing to paint. Brush size remains outside the scrolling tool list and is preserved while switching categories. The All view retains access to the complete current catalog. These are browser UI preferences, not simulation or multiplayer rules.

## Saved golfers for championship preparation

The Pro skills panel now includes Save golfer and Load golfer. A versioned golfer JSON contains only the validated professional skill allocation; it cannot carry resort funds, visitors, receipts or scores. Loading uses an owner-only, retry-safe command and is rejected during an active round. It is available before practice on imported courses. File size and exact schema are bounded, and profile state is cloned to avoid shared mutable objects.

This fulfils the portable-skill-profile prerequisite described on manual p.25. It does not yet implement championship events, SGA invitations, retirement, profile appearance/name or accomplishment-earned points. The existing ten-point allowance remains the supported profile format until earned progression is implemented.

### Local championships in the browser
Open **Club menu → Local championship** on a course with completed holes. Choose one, two or four rounds. The event pins the course layout and current golfer skills and runs Gary against a simulated club professional using the same shot simulation. Standings show completed-hole progress, with final places assigned when both entrants finish. The opponent compares carry distances and directions using independent sample shots, accounting for rollout, water, marked boundaries and planted trees. This is a provisional tactical policy; shot shaping and multi-shot route planning remain unfinished.

Event saves are separate from the resort. The club menu provides export/import, a resume link, and a return-to-resort link. Imported event records are replayed by the competition host. This is local championship play, not network multiplayer or the original SGA invitation/prize progression.

### Building direction
Choose **Building direction** in the construction tray before placing a resort facility. Four quarter-turn orientations are available and preserved in resort saves and portable course layouts. Placed buildings cannot be rotated in place. This matches the manual's placement-only rotation principle; a translucent model preview now follows the pointer, with red feedback for invalid placement. Tab rotates while hovering over the course; the direction selector remains available for touch users. Current square clearance areas and four-sided path access do not yet model building-specific entrances.

### Snack bar art pass
The snack bar now has a dedicated timber-and-clapboard refreshment pavilion model with a serving counter, striped awning, stools, menu board, side window and roof detailing. Placement previews use the same model. Its three-tile clearance and simulation behavior are unchanged. This is original-inspired procedural artwork; region-specific retail variants still need reconstruction.

### Play a pro challenge exhibition
Club menu → Pro challenge exhibition starts one round against the club professional. Choose separate per-hole and whole-match stakes; completed scorecards determine the displayed amounts. Results show each completed hole and the match/net amounts. Event saves, exports/imports and reload use the competition replay system. This is an exhibition: no resort money is credited or deducted. Original invitations, stake schedules, real resort settlement and career rewards remain unfinished. Overall match settlement currently uses total strokes with ties paying zero, pending original-runtime verification.

### Visible event opponents
Championships and pro challenge exhibitions display the opponent's independently simulated golfer and ball alongside Gary. The opponent wears blue and uses a yellow ball. Find opponent focuses the camera without changing the golfer you control. These are simultaneous independent rounds; shared turn-taking, collision/etiquette rules and network spectators remain unfinished.

### Golfer remarks on the course
Brief labels now show existing simulation comments above golfers, including reactions to neglected dandelions. Labels expire after six simulation seconds, avoid one another and the bottom controls, and never intercept clicks. This presents actual state; it does not yet implement original SimStory conversations. Verified that the dandelion mood penalty applies once per patch, persists through reload, and groundskeeper work removes the patch.

### First live SimStory
The first visiting pair starts the original Opening Day script. Positive replies advance chapters; unhappy replies retry them. Dialogue appears above the speaker and progress/transcript survive resort saves. A completed story is recorded once and unlocks a free commemorative garden through Reports → Golfer stories. Membership is not yet implemented. Only Opening Day is enabled, pending the remaining pairing-code definitions. Current 60-mood cutoff, seven-unit proximity and 3/9-second pacing are provisional, not original measured values. Departing golfers leave an unfinished story record.

### Review a golfer story
Reports → Golfer stories shows the recorded Opening Day conversation, participants, chapter/reply counts and active, unfinished or happy-ending status. The transcript remains available after speech fades or the golfers leave. Phone layout and save/reload are verified. Saved progress must match the actual script lines and speaker order; inconsistent chapters or invented dialogue reject during load.

### Place the Opening Day reward
Reports → Golfer stories → Place commemorative garden selects a free garden for placement on clear ground. Invalid sites preserve the reward; Escape or another construction tool cancels placement without claiming it. Claiming is saved and cannot be repeated after removing the garden. The model and passerby effect reuse flowerbeds. This reward choice is provisional: the original scenic/landmark reward catalog still needs verification.

### Opponent shot selection
The simulated championship and exhibition opponent can choose draw, fade, backspin and punch shots. It compares tree collisions, water, boundaries, final distance and terrain using the existing flight and roll simulation. Original AI fidelity and planning several shots ahead remain unfinished.

### Membership roster
Open Reports → Membership roster, or press F9. The roster retains visitors after departure, showing completed rounds, best score with hole count and whether they are on the course or have left. Records survive saves even after their detailed scorecards leave the recent-100 list. Existing saves recover the visitors still represented in their saved rounds/current guests. All currently remain visitors: membership upgrades and housing are not implemented yet. Repeat visits are described below. Desktop and phone report flows are verified.

### Returning visitors
Happy golfers can now come back with a new playing partner. Names, identities and learned training persist; each return starts a new round on the currently open holes. The roster accumulates their round totals and best score. Current returns use a provisional 60-mood cutoff and 120-second delay. Membership upgrades, resignation and housing remain unfinished; the return policy is not yet verified against the original.

### Imaginative visitors
Visitors with the Imagination skill can choose draw, fade, backspin or punch shots when those produce a better evaluated result. Visitors without that skill keep straight shots. This makes obstacles affect the two groups differently in actual play and therefore in the recorded skill ratings. The planner is still provisional, not an exact recreation of retail tactics.

### Free terrain shaping
Raise land and Lower land cost nothing, matching the archived original design notes. You can reshape eligible dry land even when funds are exhausted. Tool hints identify the actions as free. Bridges and boundary stakes retain their construction costs; water, occupied areas and height limits still constrain terrain edits.

### Course status and Gary’s skill limits
The clubhouse heading and skill dialog now reflect the course category. Completed holes count even while closed: 0–5 is Municipal, 6–9 Golf Course, 10–17 Country Club and 18 Championship. The skill limits are 60%, 80%, 100%, then no course cap. An imported golfer keeps the saved allocation; the dialog shows any lower effective value used for the next round. Earning additional career points and skills above 100% remains unfinished.

### Happiness and green fees
A visitor pays $100 per happiness point when finishing a hole. Flowers and completed services can raise points; weeds, poor turf, long waits, fatigue and penalty shots can lower them. Repeated per-frame complaints count once per incident, and saves preserve that memory. Select a golfer to see their current happiness and green fee. Past fees in older saves are preserved. Starting happiness, reaction frequency and missing shot/scenery reactions still need original-game tuning; membership fee bonuses remain unfinished.

### Positive approach feedback
A clean approach of at least 40 yards that stays on the golfer’s own green earns one happiness point, once per hole. That point contributes to the hole’s green fee. Putts, short chips, wrong greens and obstructed or penalty shots do not qualify. The golfer can comment on the successful approach. This is provisional recognition while the original great-shot criteria are still being researched.

### Course fun rating
Reports → Course report now shows fun for each observed hole and a course total. Each completed visitor contributes positive comments minus negative comments, divided by actual shots; the hole displays the average contribution as a percentage. The course total sums observed holes. Sample counts distinguish new measurements from older scores without comment history. Negative fun is possible on an unpleasant hole. Practice is excluded. Original reaction coverage and SGA recognition remain unfinished.

### Hole classifications
Course report headings now include an estimated hole classification when all three skill comparisons are available. Labels use observed scoring differences rather than painted terrain. Missing comparisons and ambiguous three-skill results stay Unclassified. These are provisional report labels; SGA recognition, career awards and final threshold verification remain unfinished.

### Compare a shot

Choose Reports → Shot analysis, or press `/`, then click playable ground on a hole with a tee and green. Four comparisons show mean carry, distance remaining and water/tree outcomes across three samples. Close the report to view colored sample flight lines. Escape cancels selection and clears lines; selecting another mode/tool clears them too. Analysis spends no money or strokes and does not advance the live random sequence. Distances are estimates under the current provisional physics, not exact original-game predictions.

Validation: five shot-analysis/visitor-shot-shape checks passed, including whole-state equality around browser analysis, repeatability across live RNG states, line endpoint/disposal checks and 390px phone layout. Phone screenshot: `graphics/samples/shot-analysis-phone.png`.

### Opening-hole pace

Visitor arrivals now respond to the first open hole: both golfers ahead need to take two shots or complete it before another pair is admitted. A ballwasher before that tee can slow arrivals. Penalty strokes do not substitute for physical shots. This replaces the fixed 24-second arrival timer. A temporary limit of twelve live visitors remains until the original membership/invitation population system is implemented.

Verified 19 admission, multihole, returning-visitor and session tests, including completing and restoring a legal 18-hole course. Old saves migrate without rewriting guest state or ledger entries.

### Several pairs on a hole

The next pair can now leave the tee queue after both golfers ahead have taken their second shots or completed the hole. Earlier pairs keep playing toward the green. This also applies to later holes, so one pair putting does not reserve an entire hole. Fine-grained golfer collision avoidance and original Ranger/Marshall behavior remain unfinished.

Verification: 20 tee-spacing, admission, multi-hole and session checks passed, including actual overlapping play and identical simulation after save/reload.

### Twelve familiar visitors

A new resort now starts with twelve persistent golfers. Arrival pairs come from this pool, so familiar names return with their learned skills and accumulated results. The roster distinguishes the pool size from the number who have visited. Happy golfers currently return sooner than unhappy golfers; exact return timing is provisional. Membership invitations, which expand the population in the original, are not yet implemented.

The phone roster now lists initial golfers as “Yet to visit,” before their first round. Validation: full 211-test run had 209 passes and two obsolete fixture assumptions (fixed eight-second flower timing; expecting the first golfer to need a tennis attitude boost). Corrected those fixtures to observe actual reactions and compare matching arriving identities. All 13 targeted flower/tennis/roster/pool checks then passed, including the new initial-roster phone check; production build passed. No second full-suite run was performed. Phone screenshot: `graphics/samples/initial-visitors-phone.png`.

### Choose playing partners

Open Reports → Membership roster (or F9), select two names and press Pair golfers. They will wait for each other before starting a future round; existing rounds keep their current partners. Unpair returns them to automatic selection. Choices survive save/reload. This is the partner-selection foundation; personality compatibility and its original happiness/story effects remain unfinished.

Verified 18 pairing, visitor-pool, returning-golfer, session and story tests, including actual selected arrivals, live-round preservation, duplicate retries, saved preferences, permission rejection and phone pairing/unpairing. Phone screenshot: `graphics/samples/visitor-pairing-phone.png`.

### Personality when pairing

The roster shows each selected golfer’s Neat, Outgoing, Active, Playful and Nice traits and previews whether they start happier together. Profiles persist across visits. Similarity affects starting happiness and therefore can affect later green fees. Trait scale and compatibility tuning are provisional; personality-specific conversation and membership effects are not yet implemented.

Personality validation: 17 personality, pairing, pool, return, happiness/fee and story checks passed. Verified actual arrival happiness differences, unchanged skills/live RNG, deterministic mid-round restore, legacy preservation and phone preview updates. Production build passed. Phone layout capture: `graphics/samples/personalities-phone.png`.

### Choose a professional opponent

In Local championship or Pro challenge setup, use Opponent to choose one of the 95 imported original professionals. The preview shows their effective skills on this course. These are ten-point exhibition allocations guided by the original skill limits; original career rankings and strengths are not yet reconstructed. The name and skills remain fixed when you save and resume the event.

Opponent-selection verification: six roster/competition-save/browser checks passed. These include validation of all 95 allocations, completed default championship/challenge flows, and selecting Joe Pro on a phone with name preservation after reload. Production build passed. Phone capture: `graphics/samples/roster-opponent-phone.png`.

Named exhibition opponents now wear the clothing and color families recorded in the original professional roster. Their look persists after event reload. Eight clothing/body categories have a production-model inspection sheet at `graphics/samples/professional-body-styles.png`; colors and proportions remain stylized approximations.

Validation: 12 appearance, art/browser and event-save checks passed, plus the production-model inspection render. Production build passed. Tests cover all eight garment mappings, invalid codes, immutable entrant metadata and named-opponent rendering after browser reload.

Regular golfers now keep their own clothing, skin and colors when they return. Known original skill combinations use the associated clothing styles; other combinations retain a neutral style. Appearance customization and exact original character proportions remain unfinished.

Verified 22 appearance, visitor, multihole and session checks, including a returning golfer's unchanged look, legacy saves, rendered visitor metadata, 18-hole completion and deterministic restore. Production build passed. Course screenshot: `graphics/samples/visitor-appearances.png`.

### Customize a visitor

Open Membership roster, choose the visitor in First golfer, and expand Customize first golfer. Choose clothing style, skin, hat, shirt and trousers, then Save appearance. Unsaved field changes do not affect the course. The selected golfer updates immediately and keeps the look on later visits; skills and personality are unchanged.

Verified 15 customization, visitor, pairing and session checks, including live renderer replacement, unchanged actor gameplay state/cash/RNG, duplicate retry after reload and phone editor persistence. Production build passed. Phone capture: `graphics/samples/appearance-editor-phone.png`.

### Membership and invitations

After a qualifying completed round, review applications in Membership roster. Accepting a Basic, Silver, Gold or Platinum application invites one new golfer; declining keeps the current membership. Visitors progress one tier per accepted application. Current eligibility—one recognized great approach and at least four happiness points—is provisional. Membership dues, tier fee bonuses, homes, carts and resignation are not implemented yet.

Validation: 26 distinct targeted membership, roster, pool, fee, session and multihole checks passed across two runs. The stronger upgrade test plays four separate returning rounds through all tiers and restores the resulting save. Other checks cover an invited golfer actually arriving, decline, invalid eligibility, authorization, repeated commands and phone acceptance/reload. Production build passed. Screenshot: `graphics/samples/membership-phone.png`.

Unhappy visitor comments can now create nearby dandelions, adding to normal growth. The same complaint does not generate another patch every frame. Groundskeepers clear these patches normally. The chance/radius are provisional; no-dandelion landmarks are still unfinished.

Verified 17 complaint, golfer-remark, core simulation, approach and membership checks; repeated incidents, unsuitable water, unchanged shot RNG, exact save/reload and groundskeeper cleanup are covered. Production build passed.

Visitor naming: Reports → Membership roster → Customize first golfer → Name → Save name. Names allow up to 80 characters, trim surrounding whitespace and reject control characters; duplicate names are allowed because identities use IDs. Current visitors update immediately and returning visitors keep the new name. Past scorecards/ledger and ongoing SimStory name snapshots keep their recorded names. Thirteen targeted appearance, renaming, story and pairing checks passed, including phone save/reload and an actual completed/returning round. The updated phone customization screenshot was inspected. Production build passed with the existing large shared-chunk advisory.

Professional progression: Reports → Professional accomplishments (F10) shows the first par-5, nine-hole and eighteen-hole milestones. Each grants three extra points once, spendable through Play → Pro skills and included in Save golfer. Original task ordering and completion gates remain provisional; other accomplishments and trophy visuals are still incomplete. Milestones persist when holes are removed and rebuilt. Checked 32 distinct tests across accomplishments, pro skills, portable golfers, course caps, event restore, session replay and multi-hole play; two initial fixture mistakes were corrected and rerun. Phone report screenshot inspected at `graphics/samples/accomplishments-phone.png`. Production build passed with the existing shared-chunk size advisory.

Design rewards: F10/Reports now includes first Challenge, Heroic, Strategic and Classic holes. Each earns three points when recorded visitor comparisons produce that classification; no award is inferred from an empty/unclassified hole. Later rating changes retain prior awards without repeating points. Original task ordering and classification boundaries/sample behavior remain provisional. Full regression run: 244/246 passed; the two failures were new controlled-cohort fixtures missing matching global score totals. Corrected those fixtures and reran all four design-accomplishment tests successfully. No application code changed during or after the full run. Phone report screenshot inspected; production build passed with the existing shared-chunk advisory. This verification covers implemented behavior, not full original-game parity.

Path stamina: walking on paths and bridge decks now drains less energy than walking over grass, without changing travel speed. Waiting on a path does not receive the discount. The half-rate multiplier remains provisional. Verification covered 21 distinct tests across stamina, hotel rest, dandelion complaints, design rewards and full multi-hole play. Twenty passed in the initial run; the bridge fixture was corrected to create water before placing a bridge, then all three stamina checks passed. Equal-distance walking, rested golfers, bridge-underlying-water handling and deterministic mid-walk restore were verified. Production build passed with the existing shared-chunk advisory.

Steep paths: visitors now react visibly when climbing path gradients above the provisional one-editor-level-per-tile threshold. The complaint changes happiness once per hole and survives mid-climb reload without duplication. Gentle paths, downhill travel, non-path ground and stationary golfers do not trigger this uphill-path reaction. Seventeen distinct checks passed across steep feedback, path stamina, elevation/bridges/aiming and happiness-linked fees, including the browser remark. Inspected `graphics/samples/steep-path-remark.png`. Production build passed with the existing shared-chunk advisory. The original elevation scale/repeat rules still need runtime comparison.

Rangers: Staff → Hire Ranger, then Send to area near a busy tee. They motivate nearby waiting/addressing golfers to move and prepare shots faster for a short time. The golfer list uses ! while motivated; the staff report counts motivations. Rename/dismiss/save work through existing controls. Range, cost, duration and pace are provisional; Marshal upgrades/staff development remain unfinished. Twenty-five distinct targeted tests passed across Ranger behavior, maintenance, staff management, tee spacing, vendors and session commands, after fixing a phone panel overlap found in the initial run. Staff panel compacts while selecting a destination. Phone hire/reload screenshot inspected; production build passed with the existing shared-chunk size advisory.

Ranger coverage: select a Ranger in Staff to see a gold range ring while idle. Send to area previews the destination range in cyan; clicking dispatches them, and coverage stays hidden while they walk. The radius matches actual motivation range. Ten staff/coverage tests passed, including unchanged simulation during preview and phone placement. Inspected `graphics/samples/ranger-coverage-phone.png`. Production build passed with the existing shared-chunk advisory.

Staff capacity: the course now supports sixteen employees, replacing the unsupported three-person prototype restriction. Staff panel shows used/available capacity and details for the selected employee. Contemporary and later sources disagree between sixteen and twenty, so original-version verification remains open. Twenty distinct targeted checks passed across full staffing, payroll/work, capacity rejection/retry, dismissal/replacement, legacy migration, phone controls, Rangers, vendors and technicians. Inspected `graphics/samples/staff-capacity-phone.png`. Production build passed with the existing shared-chunk advisory.

Cart Garage: Build → Resort → Cart Garage ($2,000 provisional). Connect it to the clubhouse paths; new visitors receive carts for their round. Paths, bridge decks and fairways permit faster cart travel; rough/greens use walking. The garage and moving carts render in 3D and the layout exports with the course. Cart models currently appear only while riding; realistic pickup/parking, shared occupancy and resident-pro carts remain unfinished, as do original eligibility/speed/price measurements. Twenty-two distinct targeted checks passed across carts, arrivals, hotel, palette, building rotation and shared-course isolation. Actual browser construction and rendered carts inspected in `graphics/samples/cart-garage.png`. Production build passed with the existing shared-chunk advisory.


Cart parking: visitors now leave a visible cart behind when walking off paths/fairways, take their shot, and return to the parked cart on a subsequent reachable route. Its position survives save/reload. Cart and golfer heights follow bridge decks independently. This supersedes the previous moving-only cart display. Garage pickup/return, shared occupancy, original eligibility and polished entry/exit animation remain unfinished. Revalidated eleven cart/parking/bridge checks, including actual shot playback, deterministic restore, legacy migration, browser reload, garage construction and multi-tile bridges. Inspected `graphics/samples/cart-parking.png`; production build passed with the existing shared-chunk size advisory.


Cart routing correction: golfers stay on the green to collect a holed putt instead of detouring to their parked cart. Routes back onto paths/fairways still support pickup. Twenty-four distinct targeted cart, multi-hole and session checks passed across runs, including a full two-hole cart visit and departure after mid-round reload. Initial test fixtures were corrected: the visitor holed the putt, and the garage had overlapped a green. Production build passed with the existing shared-chunk advisory. Original cart AI and garage return are still unfinished.


Club Pro: Staff → Hire Club Pro, then Send to area to welcome nearby golfers. The welcome adds a positive happiness/fun reaction once per visitor round; multiple Club Pros do not repeatedly grant it. Rename, Find employee, dismissal and saves use the normal staff controls. Greeting range/frequency, $150 cost and $12/min wage remain provisional. Twenty-two targeted checks passed across greetings, movement, duplicate commands, phone persistence, staff capacity/payroll, happiness-linked fees, Rangers and cart migration. Phone screenshot inspected at `graphics/samples/club-pro-phone.png`.


Celebrity: build six complete holes, then Staff → Hire Celebrity. Send to area positions this stronger greeter. Club Pro and Celebrity welcomes share a base reward, preventing repeated visits or multiple greeters from endlessly stacking happiness. Sixteen targeted tests passed across the unlock, permissions, retry/reload, mixed greeting order, normal staff management, technicians and phone controls. Inspected `graphics/samples/celebrity-phone.png`. Production build passed with the existing shared-chunk advisory. Costs/timing remain provisional and upgrading an existing employee is unfinished.


Refreshment Consultant: at six complete holes, Staff → Hire Refreshment Consultant. They seek golfers and offer drinks that improve attitudes even when the golfer is not thirsty. Dismiss or Send to area cancels an ongoing service and frees the golfer. Fifteen targeted checks passed across consultant service, mid-service reload, cancellation, unlocks/permissions/retries, normal vendors, Celebrity and staff controls. Inspected `graphics/samples/consultant-phone.png`; production build passed with the existing shared-chunk advisory. Original tuning and staff upgrade flow remain unfinished.


Staff upgrades: after six complete holes, select a Groundskeeper, Club Pro or Soda Vendor in Staff and use Upgrade to promote them. The button shows the role and cost. Names, work history and current assignments remain intact; repeated commands cannot charge twice. Twelve targeted greeting, consultant and upgrade checks passed, including promotion during service, exact reload, permission/funds gates and phone controls. Inspected `graphics/samples/staff-upgrade-phone.png`; production build passed with the existing shared-chunk advisory. Upgrade prices remain provisional; Ranger→Marshall is not implemented yet.


Full regression at protocol 50: all 287 Playwright tests passed in one uninterrupted run (5.0 minutes), with no production-source edits during the run. Coverage includes browser construction/play, a legally built 18-hole course completing rounds, phone layouts, shot flight/bounce/roll and collisions, staff service/upgrades, visitor persistence, portable course/golfer files, isolated local competitions, authorization and deterministic save/replay. This establishes a regression baseline for implemented systems, not original-game numerical/visual parity or real network multiplayer. The production build passed immediately before this audit; no application source changed afterward.


Interrupted visitor accounting is now available to the simulation, with a separate Interrupted count and recent outcome details in F9/Membership roster. Anger and Marshall triggers are not connected yet, so normal play does not spontaneously interrupt visitors in this build. Twenty-eight distinct targeted checks passed across interruption, roster/returns, pairing, full-course play and session replay; the five interruption checks passed again after tightening retained itinerary validation. Covered partial fees, partner completion, blocked-exit repair, service cancellation, actual return after interruption, old saves and phone reporting. Inspected `graphics/samples/interrupted-round-phone.png`. Production build passed with the existing shared-chunk advisory.


Angry golfers now react visibly to severe dissatisfaction, move around and upset nearby visitors before abandoning the round. Their unfinished visit appears separately in F9. The current trigger requires both zero happiness and legacy mood <=20; 20-second duration, six-unit effect radius and local movement are provisional. Twenty-seven distinct targeted checks passed across anger, interruptions, vendors/consultants, multi-hole play and returning visitors after adding real staffing to the formerly unmanaged 18-hole completion fixture. Inspected `graphics/samples/angry-golfer.png`. Marshall intervention remains unfinished.


Marshall: after six complete holes, hire one in Staff or upgrade a selected Ranger. Send them near busy areas: they motivate golfers and pursue nearby angry visitors to eject them. Staff details show motivations and ejections; F9 retains interrupted outcomes. Thirteen targeted checks passed across pursuit/reload, one ejection with two Marshalls, promotion, manual reassignment, authority/retries, anger, staff upgrades and coverage. Inspected `graphics/samples/marshall-phone.png`; production build passed with the existing shared-chunk advisory. $300 hiring, $24/min wages, coverage, pursuit timing and original anger thresholds remain provisional.

World properties preview: open **Club menu → World properties** to browse the sixteen original locations with decoded environment/geography/relief, bonuses, acreage and purchase prices. This uses a fixed deterministic preview world (entry seed 1), independently of your resort state. Purchases, travel, property-specific generated terrain and ownership remain unavailable. The screen loads on demand; desktop and 390px phone browsing, selection, reopening and Escape/close checks pass. Screenshots `graphics/samples/world-screen-1440.png` and `world-screen-390.png` were visually inspected.

### Adjoining land purchases (protocol 54)

Use **Buy land** beside Edit holes. The dialog shows funds, price and owned area. Three purchases add ten rows (450 tiles) each to the south; the camera moves to the purchased area. Current property and saved tile IDs stay unchanged. Generated half-level hills, hollows and a rounded pond are editable using the normal tools. New-course seeds vary; a saved course retains the same expansion terrain. Coastal/regional generation and randomized regional textures remain in the backlog.

Purchase commands are owner-only, use host-calculated prices, retain retry receipts, and are rejected on locked competition/practice courses. Ownership survives saves and course exports. Protocol 53 saves migrate to 54 with the original land retained. Prices are prototype values.

### Choose a generated starting landscape

Open Club menu → Start a new course. Choose Rolling parkland or River valley, change the seed or press New terrain, and inspect the preview. Starting applies that exact terrain; cancelling preserves the current property. The old Willow Brook study is also available. One previous course is kept locally and can be restored from this dialog. Use Export save for durable separate copies.

The hills, ponds and river are editable using the ordinary terrain tools. Generated maps support building/opening holes and course export into isolated practice. Regional coast/desert art and the original property's full generation pipeline are not yet integrated.

### Ground release across terrain (protocol 55)

Ball roll and putts now consume travel according to the surfaces crossed, rather than carrying the landing lie's roll distance through every later surface. Bunkers and deep rough absorb release, firmer turf retains more, and a bunker can stop a ball before water farther along. The ground solver is deterministic and uses simulation terrain; saved in-flight shots retain their resolved endpoints. Numerical resistance and the existing slope bias remain provisional pending original-runtime measurements.

A generated river-valley hole has been verified through construction, rejection before a bridge exists, opening after a bridge is built, a completed paid visitor round and save restoration. Focused terrain, generated-property and competition-save checks pass.


### Returning story partners

Opening Day retains its conversation when its golfers leave. If the same two golfers return together, it continues from the saved chapter and reply phase. Reports shows the waiting state; completed stories cannot grant their garden reward again. This is the first persistent returning-story behavior; the other Standard stories are not yet live.

### Swim Club

Build → Resort now includes Swim Club. Connect an adjacent path to the clubhouse for the same starting-attitude protection as Tennis Court. The benefit does not stack with other recreation facilities. Its rotation and connection survive saves and course sharing. This is the Tropical variant; automatic regional catalog substitution is still pending.

### Stable and Spa

Build → Resort includes Stable (Links counterpart) and Spa (Desert counterpart), alongside Tennis Court and Swim Club. Connect them to the clubhouse path for the shared recreation starting-attitude benefit. They support quarter-turn rotation and course export. Automatic region-based substitution remains pending; these options are currently exposed together.

### Environment selection

Club menu → Start a new course now includes Environment. It selects the original regional recreation building: Parklands Tennis Court, Links Stable, Desert Spa or Tropical Swim Club. Other-region recreation tools are hidden and rejected by construction commands. The environment survives saves and course exports. Existing mixed-theme saves retain their original options. Regional landscape art and the other regional buildings remain unfinished.

### Marina, Helipad and Airstrip

Build → Resort contains Marina, Helipad and Airstrip. Use Building direction or Tab before placement. Marina needs two rows of dry shore beneath its building and three rows of water beneath the docks (rotate to suit the bank). Paint a sufficiently wide water area first if necessary. Its footprint is 7×5 tiles; Helipad uses 5×5 and Airstrip uses 31×7. Grade the site if its elevation varies by more than half a level. Paths connect at the middle of facility edges; use the marina's landward side.

All three save/export with their rotation; removal preserves marina water. Aircraft/boat transport services and related economic benefits are not implemented yet. The long runway is a small airfield, not an international airport.

Environment ground palettes are now visible: muted Links turf, sandy Desert rough, richer Tropical grass. Regional trees and other scenery remain to be built.

### Airstrip fee benefit

A connected Airstrip now increases visitor green fees by a provisional 25%. The scorecard identifies the included bonus, and completed payments remain unchanged if the Airstrip is later removed. Professional practice remains free. The original manual confirms a fee increase but does not specify the amount. Marina and Helipad housing-value benefits remain pending the building-lot system.

Building lots: choose **Build → Resort → Building Lot**, place a 3×3 plot and connect its edge to the clubhouse path. Once a golfer has completed a round, an available plot can sell and turn into a home. Sales appear in the event feed and ledger. Water, planted trees and nearby fun holes increase the provisional price; a connected Marina or Helipad adds a non-stacking 25% bonus. Celebrity residents and original price calibration remain pending.

Use **Reports → Homes and building lots** to see vacant-site estimates, missing path connections, buyer names and historical sale receipts. Sold-home figures retain the price and transport bonus from the actual sale, even after demolition. Imported course homes do not carry another resort's buyer records or earnings.

New course → Landscape → **Coastal course** generates an editable stepped shoreline with rolling inland terrain. Its shoreline continues when you buy adjoining land. Pair it with Links for a muted ground palette. Ocean scenery outside the property and California/Ireland-specific vegetation and cliffs are still in development.

Coastal courses now show open water beyond the eastern property edge. This is scenery, not additional owned land. Shared course files preserve the coastal appearance.

On a Links course, **Build → Resort → Church** offers the Marina-family home-sale benefit. Connect it to the clubhouse path; its provisional 25% bonus does not stack with a Marina or Helipad.

### Airstrip fee correction (ruleset 78)

A connected base-level Airstrip now adds $100 to each visitor's completed-hole fee, replacing the prototype 25% bonus. Multiple Airstrips do not stack; professional practice remains free. The visitor panel and facility descriptions show the new amount. Old completed payments retain their original amounts after loading, including former percentage bonuses. Facility upgrades and the full original happiness/fee system remain unfinished.

# Simulation architecture and future multiplayer

## Transport visits

Protocol 77 stores marina phases, hull offsets, passenger IDs, cooldowns and channel blocking on the facility. Rendering samples saved state. Passengers have a saved transport exit and return before their boat departs. Connected airstrips schedule visitor transfers; helicopter landing state and its $200 fee remain authoritative. Separate persistent visitor pairs per transport type increase the roster without consuming walk-in candidates or growing it on each trip. Capacity and first-tee checks apply at admission. Post-round practice has a saved facility reservation and duration; tennis retains shared pair reservations.

Course exports omit transient resort activity. Golf-only packages and replays from protocols 75 and 76 remain compatible, with explicit command-version translation and unchanged result verification. Arrival frequencies and practice selection are provisional browser rules.

## Post-round recreation

Protocol 76 adds authoritative per-golfer tennis reservations and session times. The renderer samples the simulation clock for player and ball poses; it never awards a visit or changes finances. Session state survives resort saves. Disconnecting a court, removing it or losing a partner releases reservations without credit. One pair occupies a facility at a time.

Golf physics are unchanged from protocol 75. Its course packages remain accepted with their original content digest. Its tournament saves replay with valid protocol-75 commands translated to 76, while formerly invalid future versions remain invalid. Replayed results must still match every recorded receipt; unknown rulesets remain rejected. Resort receipts migrate through the existing explicit protocol migration.

## Current executable boundary

`scene/src/simulation/` is independent of the DOM, Three.js, storage, wall-clock time and network transport. `game.js` implements the currently available game rules, with seeded random streams. `session.js` is the command host used by the playable browser. `protocol.js` defines its version, fixed 50 ms tick and persisted receipt state. `rendering/` reads simulation state; `play.js` owns presentation, camera and the local host adapter.

All current player mutations—construction, opening/closing, hiring, practice and shots—go through `session.execute(command, principal)`. The trusted adapter supplies a principal separately from the command. Commands cannot set cash, scores, arbitrary state, RNG or elapsed time. The local adapter currently supplies one local owner; **there is no authentication service, multiplayer transport or deployed authoritative server yet**.

A command contains protocol version, actor ID, monotonic per-actor sequence, expected command revision, action type and bounded payload. The host checks permission and payload before invoking game rules. An accepted command advances the shared command revision. A stale edit rejects without spending money; the client must resynchronize and submit a fresh command. Sequential execution is synchronous in one host, so simultaneous clients can be ordered at that boundary.

The latest result/fingerprint per actor is persisted, including rule rejections. Retrying that exact command returns the cached result, even across save/reload. Reusing its sequence for a different action rejects. Older or skipped sequences reject rather than replaying. Receipt storage is bounded to 64 actors; a real network adapter must provide stable authenticated IDs and ordered delivery, not create a new ID per action. This is deliberately a single-outstanding-command protocol, not a distributed multi-writer database.

Only the host advances fixed simulation ticks. Pause and speed are local single-player controls; they must not grant remote players control of a competitive clock. Existing saves without protocol state migrate when attached to a session. Unknown protocol/rules versions and malformed receipts reject. The current ruleset is explicitly **prototype tuning**, not verified original constants.

Tests exercise purchase/shot retry, two-editor conflict, permissions/identity, another player's pro, old saves and exact command/tick replay through visitor income and weed cleanup. These establish local mechanics and portability, not network readiness, cross-engine floating-point determinism or anti-cheat certification. A server remains authoritative over outcomes even if clients predict them.

## Required state separation as the game expands

1. **Course definition:** stable course/owner ID, property/theme, terrain/elevation, facilities, ordered stable hole IDs, tees/cups/routes and published revision. Publishing produces immutable, validated content with a content digest. Local resort edits create a new revision; they cannot change tournament courses already in use.
2. **Resort simulation:** one course instance, operating cash/ledger, visitors, staff, maintenance, date, memberships and progression. Earnings competitions use server-derived eligible transactions over a defined competition window, with a pinned starting state and ruleset. Importing another owner's save cannot import eligible competitive money.
3. **Golfer career:** owned golfer ID, original skills, achievements, rank and career funds. Tournament entry copies an eligible, verified golfer version; user-supplied JSON is not proof of earned skills.
4. **Round/event:** event ID, course revision(s), entrants, seed, rules version, shot/turn state, per-hole scorecards, penalties, tie-breaks and final results. Each round is isolated from other visitors and the course owner's live maintenance/economy. The server computes results from legal actions, never submitted final scores.
5. **Transport/persistence:** authenticated sessions, ownership/roles, ordered command processing, durable snapshots plus append-only event/command records, reconnect snapshots, rate limits and read-only spectator updates. Server selection and hosting are still open; keep the core runnable without a vendor-specific runtime.

`game.holes` now stores up to 18 stable hole IDs. Golfers carry round IDs, booked itineraries, current hole IDs and per-hole scorecards; fees and queues resolve the golfer’s hole independently of the UI selection. Version-2 commands explicitly identify the edited/opened/practised hole. The single resident `game.pro` remains a limitation: tournament entrants still need independently owned round instances. Cross-user course IDs and authenticated player/event IDs remain open. Course packages must exclude another owner's finances, visitors and mutable practice state. Future server imports must validate course geometry/content and publish a new server-owned revision; an export hash alone is not authentication.

## Rollout and completion evidence

First complete the single-player catalog and observed progression while preserving these boundaries. Implement course packages and independent round state alongside championship mode. Then run the same host behind an authenticated server adapter, implement course collaboration/earnings competitions and multiplayer tournaments, and verify two real browser clients plus reconnect/conflict scenarios. See `backlog.md` for the complete requested multiplayer backlog and `whattobuild.md` for original-game fidelity.

Schema 2 migrates the former single-hole state; protocol 2 pins the multi-hole rules version. Legacy command receipts are validated and retired rather than replayed under changed rules. Same-version command/tick replay remains tested. The frontend hole selector is presentation state, not shared authority.

Protocol 3 now pins connected green editing. Construction keeps the cup coordinate separate from the green’s owned tile extent; the renderer traces that extent and gameplay resolves the cup. Known protocol-1/2 receipts are validated and retired on migration, with old envelopes rejected. New-version retry/conflict semantics remain unchanged.

Protocol 4 pins terrain-dependent bounce, recovery, rock deflection and water crossings. Terrain parameters reside in a renderer-independent catalog; batched grass/brush/rock variation uses a separate presentation seed. New shot fields persist physical outcomes across reload.

Protocol 5 pins professional skill response. `proProfile` stores the resident allocation separately from the live round’s `proSkills` snapshot. Owner-only allocation commands validate the budget and lock during practice. Known protocol 1–4 saves migrate and retire receipts; existing legacy rounds without a snapshot retain legacy shot behavior. Multiplayer career identities, reward authority and independent entrant rounds remain open.

Protocol 6 adds deterministic neglected-turf growth and technician job reservations. The host derives wages and completed repair counts; the client can request hiring but cannot submit work completion. Role/job/progress/timestamps survive saves. Earlier protocol receipts migrate and retire; physical multiplayer staff ownership and editing policies remain future work.

Protocol 7 adds visitor training through connected facilities. A shared facility catalog defines protected dimensions and skill purposes. Round-local training flags are simulation-derived, validated against existing skills and persist independently of the resident pro allocation. Training/placement/timing constants remain provisional pending original-game observations.

## Course packages and isolated practice

`course-package.js` exports only title, property identifier, ruleset, ordered hole IDs/tee/cup cells, terrain and facilities. Owner cash, ledger, visitors, staff, resident skills, command receipts, upkeep and scores are excluded. Exported layouts contain clean turf: wear and weeds are resort maintenance state. Schema 1 packages are strict JSON with a canonical SHA-256 content digest; nested content returned by import/export is frozen. New edits produce a different digest. This digest proves content consistency, **not authorship or permission**. Authenticated course/author identities and signed publication remain future server work.

Imports reject extra fields, unknown rules/property versions, inconsistent hashes, invalid or overlapping protected footprints, incomplete/unreachable holes, illegal property cells and dangling terrain ownership. They construct fresh game state with empty economic history and validate it before use. A currently supported complete course is required; this is not yet original championship-export eligibility.

`coursePractice` creates separate simulation state for each entrant. The trusted session adapter enables `courseLocked`, permitting only practice, shots and between-round skill allocation. It suppresses resort arrivals, maintenance growth and wages; clients cannot unlock a layout by changing a command payload. The published package itself never changes. Practice ball state/wear is local to that session. Same-seed independent instances and save/resume are tested without resort mutation. A future competition host must fix seeds and entrants' career snapshots itself.

The browser stores imported packages by digest and practice saves under separate per-digest keys. `?practice=<digest>` looks up local package storage; this is a local review mode, not a public sharing URL. To share, send the exported JSON and import it in another browser. Reload checks the saved practice design against its package before resuming. Returning to the resort uses its separate original save. These boundaries support later tournament instances, but there is still no authenticated multiplayer server, event lifecycle, ranking or competitive validation.

## Competition host implementation

`simulation/competition.js` now orchestrates independent authoritative round sessions for 2–64 entrants on a validated immutable course package. The trusted adapter provides entrant identities, eligible saved golfer profiles, event ID, seed and configured round count (currently bounded to 1–4). Each entrant gets a separate simulation; same-round seeds match across entrants. Live resort state never enters the event. The adapter advances fixed ticks and passes authenticated principals separately from requests.

Only shot and Ballwasher commands are accepted during an event. Envelopes include event and round identity in addition to the existing per-session sequence/revision receipts. Commands from a previous round cannot be applied after rollover. Course edits, restart, skill allocation/loading and submitted scores are excluded. The host takes results from completed simulated scorecards, starts subsequent rounds and provides detached snapshots. Final equal totals share a rank; partial play reports progress without assigning final ranks. That tie display and the current setup bounds are implementation choices, not verified original tournament rules.

This is a tested core module, not a browser championship screen or network service. Remaining integration: event setup/play/standings UI, durable event save/reconnect, explicit abandonment/forfeit rules, authenticated career eligibility, original invitation/setup/prizes, and actual multi-client verification. Course-package hashes prove content, not ownership; golfer files prove allocation validity, not earned career eligibility.

### Competition recording and resume

The competition host exposes `save()` and `restoreCompetition(raw)`. A versioned, ruleset-pinned record stores validated course/golfer setup, command requests with trusted adapter principal IDs/roles and their receipts, and coalesced fixed-tick counts. Restore replays those inputs through the same host, reconstructing in-flight balls, round transitions, command receipts and standings instead of trusting imported score totals. Replay rejects changed receipts and unsupported rulesets. Recording/replay is bounded to 10,000 entries, 1,000,000 global ticks and a 64 MB input envelope.

This is local/trusted-host persistence, not authentication or proof that an imported event was officially played. A future server must own records, validate entrant career eligibility, and keep untrusted users from replacing event history. Long-event checkpoint optimisation and network reconnect UI remain open. Tests cover mid-flight replay, exact future completion, completed-event reload, duplicate command receipts and corrupted records.


### Local opponent shot planning
The browser championship opponent uses the pure shot-planner module to compare target distances and bearings. It runs the existing shot calculation on detached state with three fixed independent random seeds, then scores remaining distance, lie quality and hazards. It neither consumes nor reads the live random outcome. Selected targets enter the same validated competition command stream as human shots, so event replay records decisions rather than rerunning the policy. No rule/protocol migration is needed for this client decision policy. Original AI fidelity, multi-shot planning and shaped-shot tactics remain unverified.

### Facility orientation
Facility records optionally contain rotation 0–3 (quarter turns); omitted values render as zero. Build commands accept this optional field only for facilities, with integer bounds enforced. Course packages preserve nonzero orientations and retain the old zero-orientation canonical representation. This additive presentation field does not change footprint, access, prices or shot rules, so the ruleset is unchanged. Invalid orientations are rejected on command input and resort/course restore.

### Pro challenge host
pro-challenge.js wraps a two-entrant, one-round competition with separate per-hole and match stakes. Both completed scorecards must be present before a hole contributes to the derived zero-sum settlement. A completed match adds its separate wager. Current match calculation uses total strokes and ties pay zero; these are explicit provisional decisions pending original-runtime confirmation. Challenge records wrap the underlying replay, and restoration derives standings and money instead of accepting submitted winnings. The browser supports exhibition challenge start, results and event export/import/reload. The host does not yet credit resort cash, issue invitations or award career accomplishments. Stake amounts are supplied by a future trusted invitation adapter; the numeric bound is a technical validation limit, not a retail stake schedule.

### Opponent presentation
The course renderer accepts optional opponent actor snapshots alongside the authoritative local game. Presentation IDs are namespaced so identical golfer IDs from separate rounds cannot replace one another in the avatar map. Opponent color and ball color are view properties only. The browser caches the rival snapshot after competition ticks; it never inserts rival actors into local guest, accounting or command state. Read-only rendered actor diagnostics verify that both avatars exist, and browser tests verify camera focus leaves event state unchanged.

### Opening Day simulation — protocol 19
Ruleset prototype-stories-2026-09-05 adds openingStory to resort state: partner IDs/names, chapter progress, pending prompt/reply, next eligible time and bounded transcript. Narrative advances only on resort ticks; isolated practice and event rounds do not create stories. No shot RNG is consumed. Story state is validated on restore and is excluded from course-layout exports. Older resort protocols migrate; pinned course/event exports from older rulesets remain incompatible rather than silently replaying different rules. Current dialogue timing/mood selection is provisional. Relationships, original rewards, the remaining scripts and full pairing semantics are incomplete.

### Story reward — protocol 20
Ruleset prototype-story-reward-2026-09-05 adds owner-only place-story-reward commands with validated grid coordinates. Placement reuses facility construction constraints but is free; the story records rewardFacilityId even after demolition, preventing repeat claims. Session receipts deduplicate retries. Prior resort saves migrate, while prior ruleset-pinned event/course exports remain incompatible. The first reward reuses the flowerbed model/effect and remains provisional pending original reward-catalog verification.

### Opponent shot shapes
The planner first scores straight-shot targets with independent dispersion samples, then evaluates four alternative techniques at the six best targets plus the cup. It submits the selected technique through the existing shot command; replay records that decision. No simulation rules or save protocol changed. Candidate evaluation uses detached state and never consumes the live random stream. This is provisional tactical behavior; shortlist search is not exhaustive and original AI decisions are unverified.

### Persistent visitors — protocol 21
Ruleset prototype-guest-roster-2026-09-06 stores guestRoster separately from active guest actors and bounded recent scorecards. Arrival registers the unique golfer ID; completing a round updates counts/best score once per round ID. Display names do not identify golfers. Practice/event pros are excluded. Restore validates records and active-guest correspondence; prior saves reconstruct only retained rounds and current guests, since older discarded history cannot be recovered. The read-only roster report cannot grant memberships or alter financial state. Original membership tiers and return scheduling remain separate unfinished rules. Prior resort protocols migrate; older ruleset-pinned course/event packages remain incompatible.

### Returning golfers — protocol 22
Ruleset prototype-returning-guests-2026-09-06 adds a saved skills/training profile and nullable nextVisitAt to roster records. Completing a happy round schedules a return; arrivals choose the earliest eligible absent identity for the first seat and create a new partner for the second. The returning actor keeps its identity while receiving a fresh round ID, itinerary and needs. Registration clears its return slot; live IDs are excluded before selection. This policy consumes no additional random draws beyond normal actor creation. Legacy departed records without skill evidence are not given fabricated profiles; active legacy golfers can seed their own profiles. Save/replay rulesets migrate for resorts as before. Cutoff, cadence and pairing policy are provisional and require original-game measurement.

### Visitor shot shapes — protocol 23
Ruleset prototype-visitor-shot-shapes-2026-09-06 changes autonomous visitor decisions. The shared shot-planning-core receives the shot/lie/hole API as function arguments, avoiding a circular dependency with game.js. Imaginative visitors evaluate a smaller candidate set with one independent sample and a two-target shortlist; competition opponents keep their broader search. Both submit the chosen technique to the same takeShot physics. All probes are detached; live RNG advances only for the actual shot. Resort protocol migration is supported, while older pinned exports remain incompatible. Long-sequence and multiplayer-host replay tests cover deterministic execution; exact retail tactics are still unverified.

### Free elevation — protocol 24
Ruleset prototype-free-elevation-2026-09-06 removes the provisional $15-per-tile elevation charge. Free edits do not require a nonnegative balance and produce no ledger entry. Existing terrain validation and command revision/receipt handling remain authoritative. Old resort saves migrate without refunding historical transactions; their financial history remains intact. Older pinned course/event rulesets remain incompatible.

### Course skill caps — protocol 25
Ruleset prototype-course-skill-caps-2026-09-06 derives category from complete tee/green pairs, including closed holes. New allocation commands enforce category caps; startPractice snapshots effective skills for the course, covering local practice and competition rounds. Portable profiles retain their full valid allocation, avoiding loss when visiting a smaller course. Existing in-flight saved rounds keep their snapshot; new rounds use the cap. Category is derived, not separately mutable state. Current profiles still have ten points and a ten-point per-skill validation ceiling; removing the eighteen-hole course cap does not yet implement career skills above 100%. Prior resort protocols migrate, but prior pinned course/event rulesets remain incompatible.

### Happiness-based fees — protocol 26
Ruleset prototype-happiness-fees-2026-09-06 adds integer happiness points and saved incident keys to visiting golfers. Recognized positive/negative reactions change points by one, floored at zero. Repeated tick-driven complaints are deduplicated per incident (mostly per hole; weeds per patch and penalties per shot). Completion stores happiness and fee together; ledger/hole/resort totals use that immutable fee once. Practice remains free. Restore validates new fee snapshots; old scorecards without happiness retain their recorded amounts. Prior resort saves initialize points from existing mood without changing past financial history. Older pinned exports remain incompatible. The initial mood mapping and incident scopes are provisional; the older mood-dependent story/return model is not yet unified with these points.

### Approach reactions — protocol 27
Ruleset prototype-approach-reactions-2026-09-06 applies positive feedback after the actual ball settles safely and before hole completion records its fee. The happiness module checks distance and shot flags; game.js supplies ownership of the final green after penalty checks. A saved great-shot:hole-ID incident prevents duplicate credit on reload or repeated approaches. No extra random draws or new mutable command surface are added. Resort saves migrate; earlier pinned event/course rulesets remain incompatible. Recognition is provisional and does not yet award membership or career points.

### Comment-based fun — protocol 28
Ruleset prototype-comment-fun-2026-09-06 records per-hole positive/negative reactions and actual shots on new golfers and hole transitions. Happiness reaction deduplication also prevents repeated fun credit. takeShot counts one actual shot; penalties only affect score. Completion adds net-comments/shots to a cohort sum with its own sample count. Reports average these contributions per hole and sum observed holes for course fun. Optional fields preserve old cohort history without inventing comment totals; legacy in-progress holes remain unmeasured until the next hole. Practice does not contribute. Numeric grouping/round weighting and recognition timing remain subject to original-runtime comparison. Resort protocols migrate; prior pinned course/event rulesets remain incompatible.

### Observed hole classifications
Pure hole-classification.js consumes evaluationReport skill advantages; it does not mutate or persist a classification. Reports recompute labels as observations change. Missing comparisons produce no label. Skill masks map to the seven lower classifications using the provisional >0.50 cutoff; Classic requires all three >=1.00. The ambiguous remaining three-skill case stays unclassified. This presentation addition does not alter simulation/replay rules or protocol. No honors, fees, career points or SGA invitations are awarded from these estimates.

### Read-only shot analysis

`simulation/shot-analysis.js` reuses visitor `chooseTarget` and `takeShot`, cloning state for each fixed sample. It returns serializable observations rather than issuing session commands or changing authoritative random state. `rendering/shot-analysis.js` owns and disposes its Three.js lines. This diagnostic can remain client-side in future multiplayer; it produces no authoritative scores or course mutations. No protocol change is needed.

### First-hole admission pacing — protocol 29

The simulation derives admission eligibility from authoritative hole order, booked itineraries, completed scorecards and physical-shot counters. It requires no client timer or new mutable admission marker. Old in-progress golfers without shot counters release on first-hole completion; existing receipts and financial history survive migration from protocol 28. Ruleset `prototype-first-hole-arrivals-2026-09-06` prevents silently replaying pinned old events with changed simulation behavior. Admissions and restore share a 12-live-visitor ceiling pending the original roster/invitation implementation; retries for an inaccessible entrance are delayed one second.

### Tee reservations — protocol 30

`hasClearedTee` is shared by admission and tee-reservation release. `hole.activePair` identifies the pair currently entitled to leave its queue, not exclusive ownership of every shot on that hole. Earlier pairs retain their booked itinerary and continue independently after release. Complete scorecards release even a one-shot hole, while penalty strokes never satisfy the physical-shot condition. Protocol 29 resorts migrate retaining existing reservations/receipts; the new ruleset is pinned for future session and event replay. Targeted tests cover overlapping pairs, full-course completion, financial consistency and exact restore/replay.

### Persistent initial visitors — protocol 31

`visitor-pool.js` creates twelve identity/profile records from an independent seed before opening. `guestRoster` remains a history of actual visits. Admission chooses two eligible, absent identities; learned profiles come from recorded visits, with pool profiles supplying the initial skills. No identity can occupy two live actors. Known old profiles migrate into the pool; additional slots bring smaller pools to twelve, while larger legacy populations are retained. Historical records without recoverable profiles stay in the history and are not invented as active people.

The ruleset `prototype-visitor-pool-2026-09-06` pins this changed visitor selection and provisional return policy. Pool validation rejects duplicate IDs, invalid skill profiles and missing live identities. Finances and completed records remain unchanged on migration. Membership invitations will expand this same authoritative pool; clients must not append identities directly.

### Visitor pairing — protocol 32

`visitorPairs` stores disjoint pairs of stable pool IDs. `set-visitor-pair` replaces conflicting preferences; `clear-visitor-pair` restores automatic selection. Both run through owner/editor session authorization and the standard revision/receipt checks. Read-only `nextVisitorPair` chooses ready preferred pairs first, otherwise two unreserved eligible golfers. It never reassigns actors already playing. Old saves migrate to no preferences. The versioned ruleset prevents replaying previous event recordings against changed pairing behavior. Personality scores and relationship history are not inferred from this preference alone.

### Personalities — protocol 33

Each visitor-pool identity stores five validated integer traits. Generation uses a local seed and does not advance the live simulation RNG. The read-only compatibility function feeds both roster preview and arrival happiness adjustment, once before registering the visitor. Profiles persist across visits; migration assigns previously missing traits without rewriting live actor happiness, financial records or shot state. Ruleset `prototype-personalities-2026-09-06` records the behavior change. These are provisional compatibility rules, not observed original numerical mechanics; legacy mood and story decisions remain separate.

### Named exhibition opponents

`roster-opponent.js` derives an isolated valid golfer package from an imported original roster record. It never turns cap totals into extra player points. Setup passes the selected name/package into the existing immutable entrant snapshot; no command schema or ruleset change is required. Existing generic events resume unchanged. Allocation is deterministic and capped, and preview uses course-effective skills. Original professional progression/appearance remain separate work.

### Entrant appearance metadata

Competition entrants optionally include validated `{body, skin, hat, shirt, pants}` codes. The host clones them before asynchronous setup, persists them in event configuration and applies them to every round’s pro. Renderer `person` maps these fields to materials and clothing geometry while retaining the old defaults when absent. Resort restore validates optional pro appearance as well. This additive cosmetic field leaves shot physics and command rules unchanged; earlier event files without the field retain their old configuration. Unlike deriving looks from display names, the metadata can later support separately authenticated user profiles.

### Visitor appearance — protocol 34

Visitor-pool entries now carry validated appearance codes. Generation is deterministic and independent of live shot RNG; active actors receive copies on arrival. Migration fills previously missing pool/actor appearances without changing current balls, strokes, finances or RNG. Both saved identity and actor appearance are validated. The renderer uses the same garment/material mapping as named professionals. The versioned save schema requires these fields for new saves; original skill/body cues are used where known without changing the underlying skill distribution.

### Visitor appearance editing — protocol 35

`set-visitor-appearance` uses the standard owner/editor command, revision and receipt boundary. It deep-copies validated appearance into the persistent pool and matching live visitor. No gameplay fields or RNG change. Rendering compares the saved appearance signature and disposes/recreates the affected avatar/ball visual while simulation position and shot state remain authoritative. The roster editor keeps the chosen visitor selected after a save. Pinned practice/competition layouts continue to reject resort-management commands.

### Membership applications — protocol 36

Completed visitor rounds feed `considerMembership`; it records at most one pending application per golfer and remembers the reviewed round. `decide-membership` is an owner/editor command with normal revision/receipt enforcement. Acceptance increments one tier and records the qualifying round plus a unique invited identity; decline clears the offer without changing membership. New visitors use independent generation and enter the existing availability/pairing system. Saved histories must have distinct qualifying rounds, consecutive tiers, sufficient completed rounds and matching invitation metadata. Old saves migrate with no invented historical memberships. Eligibility constants are provisional; fees and property/career benefits remain separate pending evidence.

### Complaint-generated weeds — protocol 37

Negative visitor reactions in the simulation pass through `complain`. Only a newly recorded happiness incident can attempt weed generation. Local placement reuses `spawnWeed` with a bounded neighborhood and the independent weed RNG; normal scheduled spreading retains its full-map search. Newly generated patches use ordinary IDs, revision updates and groundskeeper jobs. No queued transient effect needs to survive a save; current state fully captures the result and deduplication. The new ruleset pins the extra random draws and resulting ecology changes.

Visitor renaming is an additive owner/editor session command (`rename-visitor`, golferId/name). It changes display names in the pool, live visitors and persistent roster while retaining identity keys. Historical rounds/accounting and story name snapshots are immutable. Story generation now uses its captured names consistently with transcript replay validation, including when a visitor is renamed midway through a story. No save-shape migration is needed.

Protocol 38 (`prototype-course-accomplishments-2026-09-06`) adds resort accomplishment records `{id, at}` with duplicate/catalog/time validation. Milestones are derived by authoritative resort updates, not claimed via client commands. The portable pro profile supports the ten starting points plus three-point rewards; allocations remain subject to existing skill/course caps. Resort awards and portable budgets have separate lifetimes: importing another golfer does not clear earned course awards. Legacy resorts migrate with an empty history; pinned old event/course rulesets retain their existing rejection policy. Locked shared practice cannot earn construction rewards. Online career integrity still needs authenticated server-owned profiles; local editable files are not proof of legitimate online earnings.

Protocol 39 (`prototype-design-accomplishments-2026-09-06`) expands the catalog with four design milestones. Protocol-38 migration preserves the existing accomplishment history and skill budget; qualification uses the shared `evaluationReport`/`classifyHole` functions over recorded scores. New rewards still arise only in resort simulation updates, never a client claim. Former classifications remain earned history even after redesign or changing observations. No new transport shape is required; pinned old course/event rulesets retain strict rejection.

Protocol 40 (`prototype-path-stamina-2026-09-06`) changes walking fatigue using the effective tile lookup, so both original and built bridge decks qualify as paths. It adds no saved fields and preserves prior visitor energy during migration; only future walking receives the benefit. Fixed simulation ticks still determine energy changes and authoritative saves retain exact future replay. Pinned prior course/event rulesets keep their existing rejection behavior.

Protocol 41 (`prototype-steep-paths-2026-09-06`) adds uphill-path complaints during authoritative visitor walking. Gradient reads existing elevation and effective path surfaces; the existing saved happiness incident key suppresses repeat frames and repeat payment effects after reload. No new save fields are required. Staff, the playable professional and departing paid visitors are excluded from this visitor reaction. Old resort saves migrate preserving their state; pinned old course/event rulesets retain rejection.

Protocol 42 (`prototype-rangers-2026-09-06`) adds the Ranger role and optional visitor `motivatedUntil` deadline. Authority owns hiring and simulation-based motivation; no client command grants a boost. Save validation bounds deadlines and Ranger phases/targets; old saves need no fabricated active effect. Shared movement accepts a pace factor, while tee reservation and concurrent-shot rules remain unchanged. Motivation expires independently of the issuing Ranger, so dismissal/reposition does not require dangling staff references. Original Marshal progression and authenticated online hosting remain separate work.

Ranger coverage is a rendering-only overlay using the same radius as the simulation. It reads the selected staff member and optional tile-snapped pointer preview, follows terrain heights and exposes read-only diagnostic state. It neither edits state nor adds transport fields. Geometry is retained between updates and disposed with the overlay; moving/other-role staff do not advertise an active Ranger range.

Protocol 43 (`prototype-staff-capacity-2026-09-06`) replaces the prototype three-person limit with shared `RULES.staffLimit = 16` for both hiring and save validation. Existing records migrate unchanged. Full-capacity rejection remains transactional and retry safe; payroll derives from actual employed roles and dismissal releases capacity. Pinned older course/event rulesets retain rejection. The numerical limit follows a contemporary secondary source and remains subject to original-version verification.

Protocol 44 (`prototype-golf-carts-2026-09-06`) adds Cart Garage facilities and optional boolean `hasCart` on round visitors. Availability is captured on real arrival from connected facilities; legacy active rounds remain unchanged. A shared pure surface predicate drives simulation pace and cart rendering, preventing visual-only speed behavior. Current cart travel multiplies existing Ranger pace without changing shot accuracy or tee reservations. Course packages include the garage geometry while round availability remains separate; old pinned rulesets retain rejection. Pickup/parking and shared cart entities remain future work.


Protocol 45 (`prototype-cart-parking-2026-09-06`) persists each visitor's cart position and heading separately from the golfer. Walking routes include a return to a reachable parked cart before continuing. Riding requires proximity to that cart and an eligible surface; leaving the surface keeps the cart at its last driveable position. The renderer uses separate scene objects for golfer and cart, with shared bridge-height handling and independent disposal. Protocol-44 available carts migrate at their golfer's current position; current saves require a valid position and finite heading. These are simulation-owned state transitions, suitable for later authoritative replay rather than client-only animation. Shared occupancy and server hosting remain unfinished.


Protocol 46 (`prototype-cart-pickup-routing-2026-09-06`) avoids cart pickup detours when the direct route contains no driveable surface. Surface eligibility is shared by pickup, riding and cart movement. Protocol-45 resort saves migrate without moving their parked carts; ruleset-pinned competition behavior remains isolated. This is a routing correction, not a claim that original cart AI has been reproduced.


Protocol 47 (`prototype-club-pro-2026-09-06`) adds the Club Pro staff role and owner/editor `hire-club-pro` command. Hiring uses shared staff capacity, cash and retry receipts; movement, naming, dismissal and payroll retain existing authority. Greeting runs during simulation ticks, with an existing saved happiness incident preventing duplicate round rewards across multiple greeters or reloads. Protocol-46 resort saves migrate; prior event rulesets remain incompatible rather than silently changing results. Rendering does not own greeting eligibility or rewards.


Protocol 48 (`prototype-celebrity-2026-09-06`) adds the Celebrity staff role and owner/editor `hire-celebrity` command, gated by the same six-complete-hole predicate as Turf Technicians. Both greeter roles share simulation-owned greeting logic. Saved base-welcome and celebrity-bonus incidents cap the total at two positive reactions per round regardless of employee order or repeated encounters. Existing protocol-47 resort saves migrate without removing prior welcome incidents. Direct hiring is implemented; converting an existing employee remains future work.


Protocol 49 (`prototype-refreshment-consultant-2026-09-06`) adds the consultant role and owner/editor hire-consultant command behind the shared six-hole gate. Soda Vendors and Refreshment Consultants share movement, customer reservations, service timing, cancellation and reservation validation. A consultant can also select a golfer who is not thirsty and has not received its per-hole attitude benefit. Benefits are saved happiness incidents; interrupted service grants none. Protocol-48 resort saves migrate, while old ruleset-pinned events remain isolated.


Protocol 50 (`prototype-staff-upgrades-2026-09-06`) adds owner/editor upgrade-staff with a validated employee ID. Upgrade mappings are shared with the UI. A successful promotion changes role and charges the cost difference while preserving identity, name, position, job/reservation and work history. Current jobs are valid in their successor roles. Renderer appearance keys now include role so promotion updates clothing. Protocol-49 resort saves migrate; pinned older event rules remain isolated.


Protocol 51 (`prototype-interrupted-rounds-2026-09-06`) adds simulation-owned interruptVisitor and separate interruptedRounds history. It preserves the booked itinerary, completed-hole prefix and current-hole strokes while leaving completed-round totals, best scores and membership awards unchanged. It cancels refreshment reservations, releases pair/tee progression and walks the visitor to the exit, retrying a blocked route. The roster counts interrupted visits separately; return delay currently reuses the provisional unhappy-visitor delay. The last 100 interruption records are retained with active departures protected from pruning. Protocol-50 resorts migrate with empty history. Anger/Marshall triggers and authenticated authority remain future work; no manual ejection command was added.


Protocol 52 (`prototype-angry-golfers-2026-09-06`) connects severe dissatisfaction to a saved angry phase before interrupted departure. Anger stores a deadline, origin and deterministic patrol-leg counter; local route selection does not consume shot RNG. Neighbour reactions are deduplicated by the angry visitor’s round ID. Service reservations cancel, tee/partner gates release, and expired anger calls interruptVisitor. Professionals and locked-course play do not start visitor anger. Protocol-51 resorts migrate; old event rules remain pinned/incompatible.


Protocol 53 (`prototype-marshalls-2026-09-06`) adds Marshall hiring and Ranger promotion at the skilled-staff gate. Saved marshallTarget identifies a pursued angry visitor; path refreshes happen during simulation ticks. Other Marshalls skip claimed targets, ejection runs through interruptVisitor, and a separate ejected counter records success. Repositioning cancels pursuit; vanished/non-angry targets release it on the next tick. Otherwise the employee uses Ranger motivation. Range visualization uses the same shared radius. Protocol-52 resort saves migrate; pinned event rules remain isolated.

### Initial land expansion

The Willow Brook grid keeps its 45-column stride and original origin; maximum height is now 72 rows. Saves without `landParcels` own the original 42 rows. `ownsLand` gates construction, landscape tools, routing through `tile`, and ball out-of-bounds; purchases unlock ten rows at a time. The ownership count is included in immutable course packages. `buy-land` is an owner-only protocol 54 command with authoritative prices and existing transaction/retry protection. Terrain generation uses a separate saved seed so purchases do not consume shot randomness. Per-property geometry and expansion in other directions remain separate work.

### Generated starting terrain

`generateLandscape(seed, style)` is a pure producer of ordinary terrain/elevation state, with an independent random stream. The new-course preview calls the same generator as course creation. Saved courses and immutable course packages carry resulting geometry; multiplayer clients will not need to rerun a potentially different generator to reproduce a course. No existing course is regenerated on load. This is a prototype generator alongside, not a replacement for, the original binary-derived pipeline awaiting per-property geometry integration.

### Environment authority

A new course can pin one of four environment IDs. The simulation validates that ID and gates recreation construction through the same mapping used by the palette. Environment is canonical course-package content, so it participates in the immutable digest used for practice/competition. Saved-state validation rejects recreation buildings incompatible with a pinned environment. Legacy null/absent environments preserve mixed prototype catalogs; clients cannot add an environment override to a build command.

### Rectangular transport footprints

`facilityExtents(type, rotation)` and `facilityContains` represent non-square facilities without treating a runway as a giant square. Placement and exported-layout validation use rotated `footprint` cells, routing blocks those cells, terrain tools protect the full building, and demolition hits any part of it. The same extents drive hover outlines and path-connection offsets. Marina wet-side classification transforms the clicked cell into local orientation; its underlying water is preserved. The rendering models use the corresponding dimensions, with no separate client-only ownership or collision rules.

### Invited challenge ownership and settlement

`challenge-career.js` owns the resort's saved ladder, scheduled offer, active invitation and bounded result history. Offer generation uses an isolated deterministic random stream. Owner-only accept/decline commands use normal revision/sequence receipts; locked shared courses and spectator/editor roles cannot accept or decline. Acceptance captures a canonical course-layout snapshot and golfer profile, as well as the event ID, digest, professional and fixed stakes. The event host uses independent rounds, preserving the resort while the match runs.

The asynchronous host settlement adapter reconstructs the saved pro challenge and derives its scorecards. It checks the captured course content (not merely a caller-supplied digest), golfer, professional, event ID, seed and stakes before applying the net result. No client command accepts a payment amount or final score. Rechecking the active offer after replay makes concurrent/retried settlement pay once. Settlement advances the resort command revision, and its result/ledger survive reload. Published course content excludes this career state.

The browser currently hosts and stores both sides locally. For online play, the authenticated server must own the resort, accepted invitation and event journal and call settlement itself; uploaded JSON is not proof of earned winnings. The new flow does not fulfill server persistence, reconnect or adversarial multi-client testing in M01–M05. Existing course/event rulesets are retained because published-round mechanics did not change; the new career state is optional in older resort snapshots.

### Incremental challenge receipts

Active invitations retain the exact replay-derived prefix of paid hole results. A replay must reproduce that prefix before it can pay any additional holes; shorter or contradictory replays reject without changing the account. Each new completed hole receives a separate ledger entry, including tied zero-value outcomes. Only a completed match receives its match-wager entry and career advancement. The result history retains the whole match net, while the settlement response reports only the amount newly paid. Optional absent receipts preserve compatibility with previously accepted invitations.

The browser event adapter saves the replay before attempting account settlement, runs at most one settlement at a time, and skips already handled hole/status cursors. It rereads the resort snapshot after asynchronous replay and retries from newer saved data instead of overwriting an observed concurrent save. This is local recovery, not an atomic distributed transaction; online shared resorts still require server-owned storage and transactions. Returning to the resort remains a second recovery path if a match tab closes before its asynchronous save finishes.

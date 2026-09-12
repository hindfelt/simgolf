# Shared construction host — 11 September 2026

Implemented locally, not yet deployed. This is the shared construction portion of A05/M01, not completion of multiplayer tournaments or of the original-game recreation.

The account Worker now has authenticated shared-course endpoints. Creating a course accepts only its name; the server generates its seed, initial budget and game state. No imported save, submitted money balance, score or golfer package can become authoritative shared state. The original local game remains separate.

- `GET /api/courses`: list courses owned by or shared with the signed-in player.
- `POST /api/courses`: create a course from `{name}` under the signed-in owner.
- `GET /api/courses/:id`: read a permitted snapshot.
- `PUT /api/courses/:id/members`: owner grants editor/spectator access to an existing player UUID; `role:null` removes access.
- `POST /api/courses/:id/commands`: submit a versioned construction command to the existing simulation command host.

All mutations retain account-session, Origin and CSRF checks. The session supplies the actor identity; owner/member records supply course permissions. Administratively suspended accounts cannot access courses. Account deletion also removes owned courses and memberships.

The outer snapshot `revision` is the D1 storage revision. The command envelope’s `expectedRevision` is the simulation’s `state.protocol.revision`. Keep these separate: membership changes increment the storage revision without pretending a construction command occurred. A D1 compare-and-swap retry reloads both state and current permissions. Membership changes are committed with a storage revision increment so an edit cannot commit against superseded membership.

Persisted command receipts enforce sequence ordering and replay the last result without repeating its economic effect. A stale simultaneous edit receives a conflict; the client must resynchronize before issuing its next sequence. The host never interprets client-supplied tick, balance, score or replacement-state commands.

Server-time advancement is implemented in migration `0003_shared_clock.sql`. Reads and commands calculate elapsed 50 ms ticks from a persisted server-clock cursor, advancing at most 120 ticks per request. Fractional ticks remain in the cursor. Compare-and-swap prevents concurrent readers or command requests from advancing time twice. A backward clock does not reverse simulation time. All unprocessed downtime remains pending; commands return `catching-up` without consuming their sequence until the host reaches the present. Clients must retry that same command after catch-up. Membership changes cannot reset the clock. Snapshots expose `pendingTicks` for honest catch-up feedback.

`CourseScheduler` adds one SQLite-backed Durable Object alarm per course. Creation and authorized reads start or repair its schedule. The normal cadence is five seconds; remaining backlog schedules another bounded batch after 100 ms. It persists a 30-second retry before accessing D1 so a long database outage does not exhaust the platform's finite automatic retries. Deleted courses remove scheduler data and the alarm. Suspended owners stop advancement and are checked again after 60 seconds. No client-provided time reaches this scheduler. D1's persisted cursor protects against repeated alarm delivery. See [Cloudflare alarm semantics](https://developers.cloudflare.com/durable-objects/api/alarms/).

All 28 backend tests pass, including real Durable Object alarm execution, earlier-alarm preservation, refusal to reassign a scheduler, deletion, suspension and a simulated database outage. Deployment dry run succeeds with the new binding/class migration. This is local verification; hosted lifecycle and populated-course resource measurements remain required.

## Browser integration — 12 September

Account → Shared courses now creates and lists shared clubs. Owners grant editor/spectator access using the other registered player's ID, displayed in that player's account panel. Opening a shared club uses `?shared=<course UUID>`. The browser submits versioned commands, retains the exact pending envelope after a lost response or catch-up reply, and updates from server snapshots every second. It does not run local simulation ticks or overwrite local resort saves. Shared mode excludes local practice/tournament/import controls; shared tournament play is still pending.

The integration suite runs two independent Chrome contexts against a real local Worker, D1 database and Durable Object scheduler. Only authentication fixture sessions are seeded locally; course creation, access grants, edits, spending, snapshots and persistence use the real HTTP routes and simulation. It verifies owner/editor editing, reconnect, downgrade to spectator and preservation of local saves. A second test checks the phone lobby; its image was reviewed and form/link contrast improved. Separate transport tests cover lost-response retries, catch-up and terminal rejection. The backend/transport suite now has 31 passing tests.

Run `npm run test:shared-integration` from `scene/`. Its fixture reset is confined to `.wrangler/shared-integration`; it never targets production or the normal local development DB. `npm run benchmark:shared` measures a local Node CPU proxy, excluding D1/network. The two-hole, 20-minute fixture measured a 1.56 ms median and 2.28 ms p95 for restore + 120 ticks + serialization across 30 samples, with a 53,707-byte snapshot. It had only one active visitor at sampling time: this is not evidence for busy 18-hole performance or hosted CPU limits.

Verification uses actual Workerd/D1 with the real simulation: simultaneous purchases, reconnect/retry, owner/editor/spectator permissions, revoked memberships, suspended accounts, forged actors, rejected imports, route-level CSRF and identity, and account deletion cleanup. These tests do not substitute for two real browsers editing a hosted course.

Next required work:

1. Measure the background scheduler on populated courses and verify hosted lifecycle/recovery and resource limits before production use.
2. Refine shared-mode spectator controls and render-only movement interpolation between snapshots. No local simulation authority should be added.
3. Verify the deployed flow with real registered accounts, including hosted scheduler recovery and useful error reporting under load.
4. Migrations `0002_shared_courses.sql` and `0003_shared_clock.sql` were applied remotely on 12 September. Deploy the browser/Worker changes only after the above integration and resource-limit checks.
5. Build server-validated earnings competitions and independent tournament round hosts on immutable course revisions. The shared construction service is not a trusted tournament scoring host.

Regression follow-up: the full game run reported 951/952 passing, with the maintenance browser test unable to find its staff details panel. The complete five-test maintenance file passed on an isolated rerun; the failing case was then repeated separately. No simulation defect has yet been reproduced, and this is not recorded as a clean full-suite pass. Backend/transport tests (31) and the real two-browser integration tests (2) passed again after the final testing-mode link correction.

## Populated-course assessment and RPC host — 12 September

The repeat full game suite passed all 952 tests in 5.9 minutes. The earlier isolated maintenance-panel failure did not recur, including three focused repeats. No game simulation changes were made during that rerun.

The expanded benchmark builds 18 legal holes and hires 16 employees, then samples each minute through 25 simulated minutes. It reaches 12 live visitors, 24 completed rounds at minute 21, and a largest snapshot of 222,218 bytes. The worst median restore + 120 ticks + serialization sample was 83.01 ms; the highest p95 was 92.46 ms. These are local Node elapsed-time measurements taken alongside browser tests, not hosted CPU accounting. The saved measurements are in `shared-large-course-2026-09-12.json`. Reproduce with `npm run benchmark:shared -- --large` from `scene/`.

A separate 14-minute breakdown puts restoration near 1.5 ms and serialization near 0.4 ms; advancing 120 ticks averaged 78.1 ms. Five ticks can already include a roughly 23 ms simulation burst, so simply shrinking the fixed batch is insufficient evidence of safety.

Shared read/command routes now authenticate and rate-limit in the HTTP Worker, then invoke the existing per-course Durable Object using RPC. The Durable Object performs permission lookup, simulation, persistence and receipt replay. This places simulation alongside the background alarm, under the [Durable Object execution limits](https://developers.cloudflare.com/durable-objects/platform/limits/), rather than executing course catch-up in the ordinary HTTP handler. No client clock or authority was introduced; D1 compare-and-swap still protects concurrent work. RPC errors preserve intended permission statuses and hide runtime/database details.

All 33 backend/transport tests and both real two-browser integration tests pass with the RPC path. Hosted latency, daily storage/request consumption and multi-course capacity still need measurement before deploying shared construction. The existing account-only production release remains unchanged.

## Spectator controls and browser history — 12 September

Spectator snapshots now hide construction/staff tabs and hole editing controls. A live downgrade closes pending land/removal/hole dialogs and returns to golfer viewing; a later editor grant restores the controls without reloading. Spectators loading a shared link start in golfer viewing. Server permission checks remain authoritative.

Returning to a cached page restarts shared polling. Polling generations prevent a poll from the previous page lifecycle from creating a second refresh loop after resumption; retained edits still retry their exact original command. The transport test exercises stop/resume while a poll and edit are pending and verifies a single subsequent loop.

Verification: 34 backend/transport tests, two real Worker/D1 browser tests (including live downgrade, reload, upgrade and Back navigation), and 15 local gameplay/maintenance tests pass. The first navigation test reversed direction before account loading completed and observed its aborted fetch; it now waits for the destination Account button before navigating Back, retaining the no-JavaScript-errors assertion. This check does not claim that rapid interrupted page initialization has been hardened. Shared construction remains undeployed pending hosted capacity work.

## Published course versions — 12 September

Owners can explicitly publish a playable layout to all registered players from Account → Shared courses → Manage access. The server creates the package from persisted shared state, checks the expected design revision and fences concurrent changes with the D1 storage revision. Repeated publication of the same course/content returns the same version. Editors cannot publish; incomplete/unwalkable courses reject. Clients cannot submit package geometry, wealth or scores. The immutable package includes its ruleset and content hash; live finances, staff, visitors and golfer career are omitted.

Account → Shared courses → Published courses lists author names and version hashes. Any signed-in player can open one in the existing locked local practice mode. Subsequent live edits do not change that version. This is course discovery and practice, not online tournament scoring. Tournament event creation, immutable event/course pins, authoritative rounds and standings remain required. Publication currently follows account deletion (versions are deleted), and suspension hides the author's publications; future event snapshots need their own retention rules.

Migration `0004_published_courses.sql` is local only and must be applied before deploying this Worker. Routes: `POST /api/courses/:id/publish` accepts only `expectedRevision`; `GET /api/published-courses` lists up to 100 versions; `GET /api/published-courses/:id` returns metadata and the package. Requests remain session protected; publishing also requires CSRF and is rate limited.

Verification: all 38 backend/transport tests and three real Worker/D1 browser tests pass. The browser publishes a one-hole version, later adds another live hole, then a different account opens the published version and still sees exactly one locked practice hole. Unit coverage checks package validation, omitted private data, stable repeated publication, changed-version isolation, ownership, suspension, stale design rejection, session/CSRF checks, submitted-package rejection and account deletion cleanup. The previously verified 952 game regressions remain the baseline; this change does not modify simulation rules.

## Online tournament registration — 12 September

Account → Tournament registration creates an event from a published version, with 1–4 rounds and 2–64 places. This is explicitly a registration preview: the UI does not offer online rounds or claim scores. The authenticated creator joins as organizer. Server-generated event IDs and seeds and copied course packages are stored separately from live resorts/publications. Removing a publication or changing the original course cannot change the event layout.

Joining uses one atomic capacity-checked insert and a unique event/player key. Duplicate joins do not duplicate players. Only active accounts can join, and a suspended organizer blocks further joins. The organizer can close registration with at least two active entrants and no suspended entrants, or cancel. Closed registration cannot accept joins/leaves; cancelled events cannot reopen. Online round hosting, profile/skill rules, standings, scheduling/forfeits and earnings competitions remain unimplemented.

Migration `0005_tournament_lobbies.sql` is local only. Routes: `GET/POST /api/tournaments`, `GET /api/tournaments/:id`, and `POST /api/tournaments/:id/join|leave|lock|cancel`. HTTP actions accept no player IDs or scores; creation accepts only title/publication/rounds/capacity. Session, CSRF and rate limits apply. Account deletion removes entries, cancels owned events and anonymizes course-author attribution while retaining the event's fixed layout. The privacy page states this retention behavior.

The phone browser test uses two independently authenticated accounts to create a two-place event, join, see the roster and close registration. The rendered phone form and roster were inspected. Backend tests cover pin retention, idempotent joining, concurrent last-place contention, ownership, closure, cancellation, suspension, forged seed/identity input, CSRF and account deletion. Published-course practice remains local and separate from these event registrations.

Final lobby checks: 43 backend/transport tests, four real Worker/D1 multiplayer browser tests, five account browser tests, production build and deployment dry run pass. Neither pending migration nor this release was deployed.

## Server-owned online rounds — 12 September

Entrants in a closed event can now open Play / resume round from its registration panel. The existing 3D Play controls send only shots and ball-washing commands to an isolated per-event/player/round Durable Object. The browser never advances authoritative tournament state. Construction and skill imports are unavailable and rejected by the server. Profiles start from identical server defaults; seeds derive from the event and round number. Each round retains independent state, command receipts, persisted server-clock position and verified completion results in D1.

This is asynchronous stroke play: manual thinking time pauses; ball flight, walking, services and automatic putting advance with elapsed server time in bounded batches. Unprocessed active time survives disconnects, and pending commands wait for catch-up. No-op idle/completed reads do not rewrite the round. Later rounds require the preceding saved result. Completed scorecards must match the pinned hole order and have no resort fees. Standings count completed rounds; ranks appear when every non-withdrawn entrant completes, with shared places for equal totals.

Account deletion removes private round states. A non-organizer entrant in a closed event becomes a withdrawn “Former player” with an opaque ID, rather than cancelling everyone else's results. Organizer deletion still cancels its event. Suspension prevents playing. Event-finalization/appeal policy, manual forfeits, scheduled deadlines and prize/earnings settlement remain open; this is not a claim of completed competition governance.

Migration `0006_tournament_rounds.sql` and new `TOURNAMENT_ROUNDS` / `TournamentRoundHost` binding are local only. Routes: `GET /api/tournaments/:id/rounds/:number`, `POST /api/tournaments/:id/rounds/:number/commands`, and `GET /api/tournaments/:id/standings`. Player identity comes exclusively from the authenticated HTTP session. D1 commits recheck event status, entrant status and account permissions. The host uses a fixed per-round identity and compare-and-swap revisions; retries do not spend another stroke.

Verification: 48 backend/transport tests pass, including refusal of direct commands that bypass automatic putting. Two entrants complete two successive actual simulated rounds each under controlled server time with matching scorecards/tied ranks and no resort income. The browser suite uses two independent authenticated Chrome contexts against real local Worker/D1/DO: one entrant submits an actual canvas shot, the other stays unchanged, reload preserves the shot, and the standings screen loads. All five multiplayer browser cases pass. Sixteen existing local championship/gameplay checks passed after integration. At this checkpoint full real-time browser tournament completion was still required; see the two-round follow-up below. Hosted lifecycle/capacity, movement interpolation and final event sealing remain required. The earlier 952-test game run remains the full-suite baseline; these changes do not modify golf simulation rules.

Final round-host checks: production build, generated Worker binding types and deployment dry run pass. Migration 0006 and all newer online features remain undeployed.


## Two-round browser completion — 12 September

Two independent authenticated Chrome contexts now each finish two rounds on a published one-hole course against the real local Worker, D1 and Durable Objects. The test clicks actual canvas targets and waits for real elapsed time; it does not inject scores, advance a fake clock or mutate browser game state. Reload preserves an accepted shot while the other entrant remains unaffected. Standings stay provisional after the first round, the Next tournament round button starts a fresh second round, and final server totals equal each player's two saved scorecards. Both players finished with six strokes and shared first place in the verified run.

All five shared-browser integration cases pass (1.3 minutes), including this 53.4-second event. The first expanded attempt used the wrong selector for the Rounds dropdown and timed out before creating the event; selecting its accessible combobox corrected the test. A premature rerun encountered the still-running test server; the successful run began after that process exited. No game timeout or simulation rule was relaxed.

The final phone standings were inspected at 390×844. Headings no longer split inside words; the play instruction uses the authenticated golfer's name. This establishes two-round browser completion on a one-hole course, not hosted 18-hole capacity or complete multiplayer delivery. Provider activation, hosting measurements, event sealing/deadlines/forfeits, earnings competitions and original-game fidelity remain open. Production was not deployed in this step.


## Explicit tournament withdrawal — 12 September

Entrants can permanently withdraw from an unfinished locked event through the account lobby, with an inline explanation and Confirm withdrawal / Keep playing choice. Their roster name and completed scorecards remain; withdrawn entrants have no placing and cannot resume a round. The organizer can withdraw as a golfer while retaining event management. Registration-time leaving and whole-event cancellation remain distinct.

The new authenticated `/api/tournaments/:id/withdraw` action accepts no target identity or scores, requires the session's CSRF token, and updates only that entrant. A single conditional D1 update checks active membership, locked event and unfinished rounds. It races safely against final score writes: final completion prevents withdrawal, while withdrawal makes the existing round commit guard reject. Repeated withdrawal requests are idempotent. If everyone withdraws, the event has no winner. Deadline-based forfeits and sealed final results remain separate open work.

Validation: all 51 backend tests and six actual Worker/D1/DO browser tests pass, including two-round completion and a phone flow that cancels the confirmation, then withdraws, reloads and verifies the other entrant can still play. A test cleanup initially left session foreign keys from the previous case; cleanup now deletes those sessions before players. No production schema migration is added: this uses migration 0006's existing withdrawal field. Production deployment and provider activation remain pending.


## Permanent final tournament results — 12 September

Migration 0007 adds a separate final-result record. One D1 statement checks that every entrant has finished or withdrawn and captures all scorecards, totals, equal-score ranks and the completion timestamp from that same database snapshot. Concurrent finalization attempts preserve the first record. Round completion, withdrawal and standings reads trigger finalization. Cancellation runs finalization and its guarded status update together in a database batch, so a completed event cannot be cancelled between its last score write and result capture.

Account deletion finalizes eligible events before deleting private round state, then anonymizes only the deleted entrant's display name. Sealed scores, cards, opaque IDs and placings survive; completed organizer-owned events survive too. Unfinished events retain the previous cancellation/withdrawal behavior. Round commits and withdrawals cannot alter sealed events. The lobby lists completed events separately and hides cancellation controls; the privacy notice and account guide explain final-result retention.

Backend verification plays two actual simulated rounds per entrant, checks ordered scorecards and shared ranks, repeats finalization, rejects cancellation, deletes each account through the authenticated HTTP route and verifies unchanged scores, ranks and completion timestamp. All-withdrawn events finish without a winner. The original test expected deletion to withdraw a finished entrant; it was updated for the new retained-results requirement. Migration 0007 remains local, and shared/tournament production deployment still awaits hosting verification. Deadline-driven forfeits, scheduling, awards, earnings competitions and the full original-game fidelity backlog remain open.

Final verification: 51 backend/transport tests and all seven real Worker/D1/DO browser integration cases pass (1.3 minutes). The additional phone check opens the completed event, displays final standings and verifies cancellation/withdrawal controls are absent. The rendered phone result was inspected. Production build passes as part of that run; no deployment was performed.


## Playing windows and deadline forfeits — 12 September

Migration 0008 adds a fixed playing window, cutoff timestamp and withdrawal reason. The lobby offers 1/3/7/14 days (default seven); the authenticated creation API validates 1–720 integer hours and does not accept a client cutoff. Closing registration sets the deadline once. Repeated closure cannot extend it. The cutoff and requirement to finish/save every round are displayed to entrants.

At or after the server cutoff, unfinished entries become “deadline missed”, retaining already-completed cards but receiving no place. Finished entrants retain their results and rank normally. Round creation and commits check the deadline independently of the UI. A disconnected in-flight round cannot advance or accept a stale shot past the cutoff. Event/standings access, the bounded lobby list, organizer actions and deletion settle expiry and final results through database batches. Finalization is lazy on server access; no alarm or always-open browser is required for enforcement. Future notifications and scheduled registration/start times remain open.

The migration gives pre-existing unfinished locked events a full seven days from migration time, excluding sealed results. The original-game simulation is unchanged. This is a new multiplayer event rule, not a claim about original SimGolf tournament timing. No production migration or deployment was performed.

Verification covers validation, one-time deadline assignment, exact-cutoff expiry through the lobby list, cancelled-action rejection after expiry, stale in-flight command rejection without changing stored state, finished-versus-unfinished ranking and stable final results on later reads. All 54 backend/transport tests pass. The browser registration flow chooses three days, sees its cutoff, and still completes the two-round event normally; phone withdrawal and final results remain covered.

Final deadline verification: all seven real Worker/D1/DO browser integration cases pass in 1.4 minutes on a clean run, alongside the 54 backend tests. The phone result view was inspected with the deadline displayed. Build passes; no deployment was performed.


## Invitation-aware registration — 12 September

Previously, the hosted gate and successful provider callbacks always returned to `/`, losing the shared course or tournament URL. Migration 0009 stores a canonical return destination with each OAuth transaction/email challenge. The shared validator accepts only known root game modes and bounded IDs/rounds; external addresses, action paths and ambiguous modes fall back to `/`. Callback query parameters and email verification payloads cannot replace the stored destination. Verified provider cancellation can retain the invitation on the retry screen. Session expiry and explicit provider linking preserve the current game destination.

The tournament lobby now exposes a copyable invitation URL, with a selectable fallback when clipboard access is unavailable. Visiting it opens the account/event panel, including a direct lookup for older events absent from the latest 100. It does not automatically enroll the recipient, create a shared-course permission grant or bypass server registration rules. No invitations are sent externally by the application in this change.

Verification covers canonical/hostile destinations; protected deep-link redirects; GitHub success, cancellation and callback replacement attempts; Google/Microsoft/Apple signed-JWT callbacks; explicit provider linking; and browser-bound email return values. These provider tests mock upstream services and do not claim production activation. All 58 backend tests and six account browser tests pass. The new account browser journey follows an invitation through mocked email sign-in and verifies that joining remains explicit. The real two-account Worker/D1 integration obtains an invitation link, navigates the other browser to it and joins through the normal controls. Production provider configuration and multiplayer deployment remain open.

Final invitation checks: all seven real multiplayer browser tests pass in 1.4 minutes; the phone invitation field and copy control were inspected. The production build passes. Migration 0009 and this release have not been deployed.


## Course-building and earnings competitions — 12 September

Migration 0010 introduces independent earnings events and entries. Registration creates no playable competition course. The organizer starts all active entrants together; a single D1 batch copies the same server-created initial state, seed, $50,000 budget and clock into separate shared courses. Retrying start does not reset courses or extend time. Windows are 10–120 minutes, with 2–16 entrants. Registration may be left/cancelled; running events cannot be cancelled. Invitations preserve sign-in context using the earnings game destination.

The existing authoritative course host enforces sole-entrant editing, allows explicit spectators, and caps simulation at the common end time. Elapsed time is retained through bounded catch-up. After the cutoff new edits reject; accepted command receipts still replay without charging twice. Each final course records income, spending, net cash change, completed paid play and open holes from its reconciled server ledger. An open tee/green hole and completed paid visitor play are required for a placing. Eligible entries rank by net cash change; ties share a place. Initial wealth, seeds, clocks and score submissions are rejected by the HTTP API. Course simulations and personal cloud saves remain separate.

Background hosts stop scheduling finished courses. Deleted entrants retain completed aggregate results under Former player or otherwise withdraw; a running event survives organizer deletion. Suspended unfinished entrants are disqualified at the cutoff, so they do not hold an event open forever. This is a new multiplayer competition rule, not a claim of original SimGolf event parity. Regional course choices, prizes, balancing and hosted capacity remain open.

Verification includes atomic capacity, identical starts, private budgets, editor rejection, simultaneous start retry, an actual ten-minute simulation with a constructed/opened hole and real visitor fees, an idle non-qualifier, clock capping and frozen results, receipt replay after expiry, deletion retention, suspended entrants and a real Durable Object finish alarm. All 64 backend/transport tests pass. The two-browser test registers via invitation, starts independent resorts with equal land/funds, and verifies one player's purchase does not debit the other. It does not run a whole ten-minute event in real browser wall time. The phone lobby was inspected. Production deployment and physical-device capacity verification remain open.

Final earnings checks: all 64 backend/transport tests, six account browser checks and eight real Worker/D1/DO multiplayer browser checks pass; the multiplayer suite takes 1.5 minutes. The final production build passes. Migration 0010 and the multiplayer build remain undeployed.


## Real-clock earnings finish — 12 September

`npm run test:earnings-soak` runs an opt-in ten-minute event in two isolated Chrome contexts against the local Worker/D1/Durable Object stack. It uses real elapsed time and builds/opens both holes through the canvas controls. The run passed in 10.2 minutes: both courses finished at exactly 12,000 ticks, with net earnings of $4,420 and $3,700 and 31/22 completed visitor holes. Server results matched course balances and completed-hole counts; both qualified for placement. Reload preserved final cash and read-only state. No browser page errors occurred. The phone final-results view was inspected. Samples and verification scope are recorded in `earnings-realtime-2026-09-12.json`.

Competition courses now omit Editor from Manage access, matching the existing server restriction, while cooperative resorts retain it and competition spectators remain available. Course-list metadata exposes the associated earnings event to support that distinction. All 64 backend checks, seven account browser checks, and the production build pass. The real-clock run began before this access-label change; the dedicated backend/browser checks cover the updated access behavior. No hosted deployment was performed. Larger courses, concurrent-event capacity and provider activation remain open.

## Archived round access — 12 September

Finished-round reads previously joined the organizer's live account, so organizer deletion prevented other entrants from reopening their own completed rounds even though final standings survived. Reads now allow an active non-withdrawn entrant to access an existing completed round when the tournament has a sealed final result. This does not relax authorization for unfinished events. Archived state does not advance or accept new commands; an exact accepted-command retry replays the original receipt. Deleted entrants still lose their private simulation, and suspended entrants remain denied.

A regression completes a real simulated round, seals the event, deletes the organizer through the authenticated account endpoint, advances beyond the deadline, and verifies identical saved review state, receipt replay, new-shot rejection and suspension enforcement. All 65 backend checks and eight real Worker/D1/Durable Object browser integration tests pass (1.4 minutes); build passes. No migration or production deployment was performed.

## Regional earnings properties — 12 September

Organizers can choose existing landscape generators (classic, rolling, river, coast) and environments (parklands, links, desert, tropical, or the compatible mixed default). The lobby explains the distinction and displays both choices before registration. Creation validates supported names and keeps seeds, starting cash and generated terrain server-owned. One initial state is copied identically to all entrants; settings are extracted from that stored state, requiring no new migration and preserving existing events.

Verification covers equal initial state/funds for two entrants across all four landscapes and regional environments, rejection of unsupported settings before event creation, and authenticated HTTP acceptance of coastal/desert settings while rejecting injected identities/finances. The phone browser journey selects coastal/desert, submits the configuration and displays it in registration; its rendered view was inspected. All 74 backend tests, eight account browser tests and production build pass. This enables competition selection of existing generators; it does not establish original regional-art fidelity, balance, or hosted capacity. No production deployment was performed.


## Concurrent populated hosts — 12 September

Added opt-in `npm run test:host-capacity`. It builds a legal 18-hole, 16-staff fixture, simulates fourteen minutes to populate it with twelve visitors, and seeds sixteen independent local D1 courses with the same 168,820-byte state. Three concurrent batches call the actual Durable Object `read` RPC with six seconds pending per course. Each batch must advance every course exactly 120 ticks, leave no catch-up backlog, and produce equal complete simulation states. The test removes host alarms on exit and only touches isolated test storage. Default account tests skip this heavier experiment.

Measured aggregate local batch times were 1,086 / 1,575 / 851 ms. Individual-call p95 values were 1,080 / 1,575 / 851 ms. This exercises local Workerd, D1 and Durable Object RPC, unlike the earlier pure-Node proxy. It remains neither hosted CPU accounting nor a capacity/billing guarantee; the measured window is three six-second batches, not a sustained multi-hour load. Structured evidence is in `concurrent-hosts-2026-09-12.json`.

Repeated scheduler starts now avoid rewriting the unchanged course identity; existing-alarm preservation and mismatch rejection remain covered. The dedicated load check passes, and the normal suite passes all 74 checks with the load check intentionally skipped. The Cloudflare dashboard session is expired; the sign-in tab was left for the owner so hosted plan/email activation checks can continue. No billing change, migration or deployment was performed.

# Feature List — Fairway Mogul

Everything implemented as of this session. Grouped by system. See `design-and-architecture.md` for how it's built, `TODO.md` for what's left, `handover.md` for a fresh-session briefing.

## Core building loop

- Isometric terrain painting: Rough, Fairway, Firm Fairway, Deep Rough, Green, Tee, Sandtrap, Waste Bunker, Pot Bunker, Water, Stream, Brush, Rocks, Trees, Flowers, Pathway — distinct procedural materials and per-tile costs.
- Water/stream crossings automatically become separately priced wooden bridge tiles when Pathway is painted across them. Bridges join the same orthogonal route network, preserve the visible and economic character of the underlying channel, align consecutive deck spans to their neighbors, and bulldoze back to Water or Stream.
- Manual-faithful hazard play: Streams and water lose the ball with a stroke penalty and safe drop, Rocks kick the ball in a random direction, Pot Bunkers severely restrict recovery distance, and Deep Rough/Brush/Waste Bunkers each have distinct accuracy, carry and roll penalties.
- Corner-heightfield terraforming (raise/lower), ≤1-step adjacency enforced, pinned-corner protection (buildings/water/holes never tilt).
- Hole creation (tee → green drag), auto par from distance, green growing/shrinking, flag move by tapping an existing green, bulldozer.
- Land parcels (4×3 grid), ownership dimming and manual-faithful expansion: county commissioner I.M. Picky periodically plays the course and, only after an enjoyable completed round, marks a selection of adjoining plots FOR SALE for a limited time.
- Hole reordering: ↑/↓ per hole, "renumber by proximity" (greedy nearest-neighbor from clubhouse).
- Per-hole green fee override (stepper in Reports panel hole card).

## Course themes

- 4 selectable themes (Parklands/Links/Desert/Tropical), manual-confirmed: distinct ground palette per theme (`THEME_TINFO`), tree species mix shift (round/pine/blossom weighting per theme), picked in the welcome modal, recolors live, round-trips through save.
- Sixteen-property World Screen: four original deeds per terrain region, each with a distinct price, starting-parcel footprint, relief, water, woodland and deterministic terrain profile. Six starter deeds are immediately available; the remaining ten use enforced, non-spendable career requirements spanning best rating, hosted tournaments, SGA Top 100/18 recognition, resident-pro fame and championship results. The responsive atlas/deed UI exposes cash, rating, fame, deed count, purchase/current/selection state and an accessible per-deed checklist; normal play prevents redeveloping a purchased deed while Sandbox Mode intentionally permits it.
- Property replacement persists the new course before recording profile ownership, migrates legacy saves to a matching starter deed, carries purchase history across courses, and never converts a Sandbox treasury into normal purchase funds.
- Transactional resort portfolio: the legacy localStorage autosave migrates once into IndexedDB, each career or Sandbox resort keeps a UUID and independent full course snapshot, source/target/manifest/active-pointer writes commit together, the local autosave remains a timestamped emergency mirror, and successful slot/file/cloud loads immediately update the active resort. Career expansion transfers all available operating capital to the new project after paying the deed, preventing money duplication; World Screen portfolio deeds expose course name, cash, rating, hole count and one-click travel.
- Terrain substitutions from the manual: Stream→Burn and Brush→Gorse on Links; Stream→Ravine and the Rough/Desert ground pair on Desert courses. Construction labels and terrain art both change with the theme.
- Theme-based building reskin: Snack Bar→Pub, Tennis Court→Stable/Spa/Swim Club, Marina→Church/Helipad, Airstrip→Castle/Casino/Theme Park — name/blurb swap at every display site (build panel, placement hint, refund floater, ticker, in-world label).

## Theme Packs

- Manual-faithful modular content packs, deliberately separate from Parklands/Links/Desert/Tropical course terrain. A pack can independently provide players, stories, celebrities, pro golfers and/or bundled courses; every omitted section falls back to Standard.
- New-resort setup exposes four packs: Standard, story-only Storybook Club, and complete original Neighborhood Nine and Backlot Legends packs. Coverage labels make partial-pack fallback explicit before starting.
- Complete packs ship 24 styled regulars, two celebrities, contextual rivalry/couple/milestone/arrival dialogue, six touring pros and a validated three-hole starter course. Their touring cast drives both issued Pro Challenges and deterministic Championship fields.
- Theme Pack id and bundled-course provenance persist in course saves, survive file/slot round-trips, appear on the course plaque, and never overwrite the cross-course resident-pro profile.

## Buildings & facilities

- Catalog: Pro Shop, Snack Bar, Driving Range, Putting Green, Cart Garage, Resort Hotel, Tennis Court, Marina, Airstrip, Building Lot, Bench, Flower Bed, Landmark, Ballwasher, Scenic Bridge. The compact responsive catalog uses five columns at wide widths, then three/two/one columns, with Resort/Travel/Property/Scenery filters and aligned price, footprint, description and availability fields.
- Locked and unaffordable catalog entries remain legible and explain their unlock or funding shortfall; staff cards likewise expose employment/unlock status and keep Hire/Fire actions aligned.
- Path connectivity (orthogonal-edge BFS from clubhouse); benches/flowerbeds/landmark/ballwasher/scenicbridge are always-open scenery.
- Facility-proximity need satisfaction (snack bar radius-based hunger/thirst relief, not a flat global buff).
- Building lots develop over time (empty → cottage → estate); actual income scales with the site's Routing Map Home Value (nearby water, trees, scenery and fun holes), then receives facility multipliers.
- Ivana Richman visits as a named heiress/patron. If she completes and enjoys the course she donates the first Landmark; the donated placement is free and unlocks later Landmark purchases.
- Facility activity animation: airstrip plane arrivals/departures, marina boat loops.
- Building rotation: identity features (hitting bays, boathouse, hangar) mirror to stay on the near side at every view rotation.
- Resort progression: nine operating facilities upgrade from level I→III through a permanent Service or Prestige branch. Projects require course/reputation milestones, consume cash, take visible construction time, temporarily close the facility, add upkeep, and strengthen real movement/needs/mood/income/fee effects.
- Facility management UI: the Resort panel opens directly to Build/Manage tabs with connection state, construction progress, prerequisites, branch effect copy, costs, maintenance, and maximum-level status.
- On-course upgrade art: scaffolding and warning planks during construction; completed Service facilities gain cool operational architecture while Prestige facilities gain gold entrance arches, pennants and level-III roof crests.

## Staff

- 8 employees from the manual: Club Pro, Ranger, Groundskeeper, Soda Vendor (basic) + Marshall, Turf Technician, Refreshment Consultant, Celebrity (skilled, unlocked at 6+ holes on a fee course).
- Hire/fire, wages, course sprites for on-map staff (ranger/groundskeeper/turftech), wildlife/mood/speed effects.

## Golfer simulation

- State machine: toTee → preshot → watch → toBall → (prePutt) → … → finishHole → next hole | leave.
- A* pathfinding (`pathfind.ts`) for every golfer walk, terrain-cost-aware, falls back to a direct line.
- 24 named regulars (`S.regulars`), persistent roster with individual length/accuracy/imagination skill traits driving shot behavior.
- Sim-stories: 2 rivalry + 2 couple pairs, ticker surfaced when both halves are on course; visit-count milestones; celebrity arrival fanfare + pay bonus.
- Needs meters (hunger/thirst/energy) draining per hole, unmet needs → mood decay + early departure.
- Four course-start difficulty levels from the manual (Easy/Moderate/Difficult/Impossible). Higher modes scale only negative attitude changes, leaving praise and shot skill untouched.
- Per-hole fun/interest rating (risk/reward: hazards in play, doglegs, elevation change, green size) feeding an excitement pay multiplier (0.75x–1.35x).
- Anchored complaints naming the specific dull hole and why.
- Exact manual SGA hole classification: Breather, Freeway, Precise, Creative, Challenge, Heroic, Strategic and Classic are derived from continuous Length/Accuracy/Imagination demand. The Course Report exposes all three meters and explains each archetype.
- Relative SGA Top 100 and Top 18 recognition is visually distinct and now increases actual per-hole fee revenue by 1.15× and 1.35× respectively.

## Resident golf pro & Championship Mode

- Manual-faithful resident pro profile: editable name and original procedural appearance, separately persisted from course saves, plus JSON Save Pro / Load Pro transfer.
- All ten manual skills with ten starting allocation points: Power Hitter, Long Driver, Accurate Driver, Accurate Irons, Accurate Putter, Draw, Fade, High Backspin, Recovery and Luck. Points change real carry, driver distance, aim dispersion, putting, shaped-shot control and bad-lie recovery; the aim guide uses the same adjusted math.
- Twenty-three Professional Accomplishments spanning course construction, guests, reputation, facilities, special visitors, owner rounds and pro-circuit results; each newly completed accomplishment grants another allocatable skill point.
- Courses can be retired into an eight-course Championship library independently of normal save slots, updated by course fingerprint and restored safely after event play.
- Championship setup selects Easy/Moderate/Difficult/Impossible opposition and either the saved resident pro or balanced default Gary Golf.
- Deterministic 12-pro stroke-play fields, progressive Club Open / Regional Classic / National Invitational / World Championship titles, final rank, difficulty-weighted purses, fame, career starts/wins/podiums/earnings and persistent result history.
- Full championship result presentation combines the 12-player final leaderboard with the permanent detailed round scorecard.
- Manual Pro Challenges: qualifying 3-hole/2.8★ courses periodically receive a limited-time offer from one of six named touring pros with distinct Length/Accuracy/Imagination strengths and original procedural appearance.
- Accepting a challenge reserves enough cash for worst-case exposure, plays the resident pro on the current course, simulates the opponent against each hole's real SGA demand, transfers the stated wager for every hole won/lost, awards fame and presents a complete W-L-T/cash comparison alongside the permanent scorecard.
- Pro Challenge offers/cooldowns persist with the course; the last 30 outcomes persist with the local pro profile and appear in the Pro Circuit workspace.

## Player's own round

- Drag-to-swing input, putts allow tap-ins.
- Club selection: Driver/Iron/Wedge, with distinct carry, accuracy, launch height and ground release.
- Shot-shape techniques: Straight/Fade/Draw/Hook/High Backspin/Low Punch — shaped shots genuinely curve around cover using shared fired-shot/preview math, backspin skips roll-out, and Punch gives up carry to pass below open round-tree branches while trunks and low pine tiers remain solid.
- Per-hole randomized wind pushes player flight shots only (not putts or AI); pointer and keyboard use the same ideal-flight forecast, including the curved aim path, landing dispersion, dashed roll-out, deterministic first obstruction on the ideal line and compact HUD/caddie risk warning. Actual dispersion can still miss the marked cover.
- Hole-in-one / eagle celebrations: confetti, staggered fireworks, camera shake, named ticker line.
- Every player stroke is recorded with club, shot shape, starting/result lie, power, intended and actual distance, hazards, penalties and holed state; each hole also tracks wind, putts, fairway hit and green in regulation.
- Completed rounds become immutable versioned scorecards with a deterministic course fingerprint, source (exhibition/tournament/future competition), duration, hole card, scoring splits and aggregate performance statistics.

## Events & goals

- Weekend tournaments (gated at 3★ rep + 3 holes + $1,500 purse): entry crowd, temporary cap/spawn boost, purse-based payout, fame bump.
- Explicit 23-item Professional Accomplishments checklist, permanent once achieved, with ticker/confetti celebration and one resident-pro skill point per new trophy.
- Sandbox Mode: unlimited funds (spend() no-ops), every parcel pre-owned at start, gold "SANDBOX" badge.

## Reports & UI panels

- Course Report: per-hole stats, fun/beauty/SGA classification.
- Financial Report: a reconciled signed journal for every cash mutation, five-minute simulated financial years, income/expense/capital category breakdowns, annual profit statements and a readable general ledger. Repeated operating entries aggregate by category/detail/year instead of flooding the report.
- Membership Roster: happy repeat golfers purchase annual dues after three completed visits, renew in later financial years, and can upgrade to lifetime status after exceptional long-term play. Active members receive a 10% green-fee discount and 3× arrival weight; visits, holes, dues and lifetime spend persist with the course.
- Player Comments log (persistent, capped at 60).
- Histograph: cash/rep/golfer-count SVG sparkline, sampled every 20s.
- Regulars roster panel: sorted by visits, skill bars, membership/spending status, on-course indicator, rivalry/couple badges.
- Routing Map: click-to-pan route view with hole order/facilities/offered land plus manual-faithful Aura (mood-altering scenery and live trouble spots) and Home Value (black impossible sites → bright-green high-income sites) layers.
- Save & Load modal: 3 named slots (save/load/delete), export-to-file / import-from-file.
- Editable course name (click the plaque title).
- Player Scorecards workspace: permanent history independent of course save slots, current-course and competition filters, course-record/personal-best badges, traditional golf notation, per-hole shot logs, profile archive import/export, and individual JSON/CSV exports.

## Wildlife

- 5 species: ducks, deer, rabbits, birds, squirrels — seeded from habitat (water/woodland/rough), density influenced by ranger/marshall staffing.

## Graphics & audio

- Hand-rolled isometric Canvas 2D renderer, chunky pixel-art aesthetic (`imageSmoothingEnabled = false`), no ripped assets anywhere.
- Day/night tint cycle (480s cosine curve, warm dawn/dusk, deep-blue night).
- Golfer rear-view sprites (no face/brim) when walking away from camera; contrast sock band matching the original's convention.
- Procedural WebAudio: swing whoosh, club clink, cup rattle, crowd applause, ambient bird chirps.
- Performance: ortho-paint vs ground-composite cache split so raise/lower and view rotation skip the expensive full-map repaint.

## Persistence

- IndexedDB transactional per-resort autosave (10s interval) with timestamped localStorage compatibility/emergency mirror, course format v2: tiles, elevC, owned, holes, buildings (including upgrade branch/progress), employees, golfers, regulars/memberships, financial time/ledger, Theme Pack/course provenance, World Screen property/deed ownership, comments, history, terrain theme, difficulty, special-visitor progression, sandbox flag, course name.
- Incompatible/old-format saves surface a ticker message instead of failing silently.
- 3 named save slots + file export/import (JSON).
- Separate local player profile (`fairway-mogul-profile-v1`, backward-compatible v2 payload) preserves up to 200 detailed rounds, the resident pro, eight retired championship courses, 30 championship results and 30 local Pro Challenge results across new courses and save-slot changes; signed-in players can merge scorecards bidirectionally with the capped D1 profile archive.

## Clubhouse Online foundation

- Google OpenID Connect server flow (identity-only `openid email profile` scope): state, nonce and PKCE; signed short-lived login transaction; Google ID-token issuer/audience/nonce verification; no Google access/refresh tokens retained.
- Thirty-day HttpOnly sessions with cryptographically random bearer tokens, SHA-256-only D1 storage, separate CSRF token/hash, exact-origin write checks, Secure `__Host-` cookies on HTTPS and explicit sign-out.
- Account lifecycle: signed-in browser inventory/revocation, profile name/bio/discoverability controls, transactional PII anonymization/account deletion, and five-at-a-time local scorecard upload plus paginated cloud-profile merge (200-card cap).
- Cloud locker: three in-game named slots backed by a five-slot API limit, bounded/validated current-format snapshots, per-slot revisions and optimistic conflict detection so stale browsers cannot silently overwrite a newer course.
- Course publication: server recomputes the exact browser course fingerprint, validates map dimensions/theme/hole count/par, and stores immutable public or unlisted published layouts.
- Daily/weekly UTC competition rotation selected deterministically from public courses, with live windows, isolated event play that restores the owner's home course, detailed score submission, stable tie-breakers, top-100 leaderboards and completed-event history.
- Online Club Championship: deterministic weekly course, one official card enforced by a partial unique D1 index, qualification/prize metadata, leaderboard and archived results.
- Quarterly club seasons: cron finalization awards rank/kind-weighted points exactly once, current global standings show rank/points/events/wins/podiums, and competition boards can switch between global and followed-player scopes.
- Social multiplayer: discoverable player directory, profile search, follows, course selection and direct one-card challenges with accept/decline/cancel/expiry states, single-attempt locking, winner/tie resolution and compact hole-by-hole scorecard comparison.
- Competition submissions are deliberately labeled `provisional`; structural scorecard validation is live, while authoritative server-side shot replay remains future anti-tamper work.
- Cloudflare Worker + D1 implementation under `worker/`: prepared statements, strict migration schema, scheduled rotation/session cleanup, structured request logs, observability config and generated binding/runtime types.

## Testing

- Vitest: 219 browser-game tests plus 7 Workers-runtime/D1 integration tests — course footprints, connectivity, wildlife, facilities, difficulty, special visitors, Routing Map values/economy, bridge conversion/pricing/restoration/direction, the sixteen-property catalog, career gates, transactional portfolio migration/switching/capital conservation and purchase lifecycle, exact SGA classes/fees, financial-year accounting, membership eligibility/renewal, modular Theme Pack fallback/course/pro integration, resident-pro skills, deterministic championships and local Pro Challenges, profile persistence, scorecards, hazards, isolated course restoration, golfer transitions, dedicated staff identities, direct shot-shape behavior and deterministic tree-canopy flight; plus OAuth transactions, authentication/CSRF, account lifecycle/profile migration, conflict-safe saves, publishing, scheduled tournaments, follows, online challenges, head-to-head cards, idempotent season awards and global/friends ranking.
- `window.__sim = { S, P, PE, screenToWorld }` exposed in dev builds for Playwright-driven manual verification.

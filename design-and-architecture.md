# Fairway Mogul — Design & Architecture

A browser course-tycoon in the spirit of Sid Meier's SimGolf (2002). Vite + React 18 + TypeScript + zustand; all rendering is a hand-rolled isometric Canvas 2D engine. **All art and audio are original and procedural** — the original game's asset rip in `resources/` is reference material only and must never be copied into the build (keeps the planned Cloudflare Pages deploy clean).

## Top-level layout

```
src/
  game/                     framework-free simulation + renderer (never imports React)
    types.ts                domain types; enums are persisted in saves — keep values stable
    constants.ts            grid dims, tile palette, lie/roll tables, parcel + cost constants
    state.ts                S — the single mutable sim state + `caches` (derived geometry)
    rng.ts                  hashes, clamp/lerp, tile/corner accessors, land ownership
    course.ts               pure footprint helpers for tee/green placement (+ tests)
    camera.ts               iso projection, view rotation, zoom/pan/fit, picking
    engine.ts               map gen, terraforming, holes, economy, golfer AI, ball physics,
                            land purchase, save/load, facility activities, per-frame update()
    buildings.ts            facility catalog, placement rules, path connectivity, effects
    difficulty.ts           manual difficulty definitions + negative-attitude scaling
    specialGuests.ts        pure Picky/Ivana offer and enjoyment rules
    routing.ts              Aura/Home Value calculations shared by UI and lot economy
    proCircuit.ts           resident-pro skills, profile sanitization, deterministic tour fields
    sga.ts                  exact eight-class skill demand + Top 100/18 fee premiums
    employees.ts            staff catalog + effect aggregates
    facilityActivity.ts     deterministic poses for animated planes/boats (+ tests)
    sprites.ts              baked pixel-art sprites (golfers, trees, buildings, props, wildlife)
    render.ts               ground cache pipeline + depth-sorted scene draw()
    input.ts                pointer/wheel/keyboard → engine calls
    audio.ts                WebAudio blips
  ui/                       React chrome
    store.ts                zustand store; `ui` bridge the engine drives imperatively
    GameCanvas.tsx          owns the rAF loop, resize, input binding, boot/load
    TopBar.tsx              plaque, gauge capsules, orb control cluster (speed/rotate/panels)
    Toolbar.tsx             grouped tool dock (Course / Terrain / Resort / Play)
    Icon.tsx                inline SVG icon set used across the chrome
    BuildPanel / StaffPanel / ReportsPanel / ProCircuitPanel / Modals / MiniMap / Ticker / PlayHud
    AccountPanel.tsx        account, cloud locker, publishing, competitions
  online/
    api.ts                  credentialed browser client + online DTOs
  shared/
    courseFingerprint.ts    identical browser/Worker layout fingerprint
worker/
  src/                      Hono Worker routes, OIDC/session security, D1 services
  migrations/               strict relational D1 schema
  tests/                    Workers-runtime + isolated D1 integration tests
wrangler.jsonc              bindings, required secrets, cron, observability
```

**Data flow:** the engine mutates `S` every frame and pushes UI-facing values (cash, rep, hint, tickers, modals) through the `ui` bridge in `ui/store.ts`. React components read the store; the canvas renderer reads `S` directly. React never touches simulation logic.

## World model

- Grid: `W×H = 64×48` tiles. Tile terrain in `S.tiles` (Uint8Array of `Tile` enum values).
- **Land parcels:** the map is a `PW×PH = 4×3` grid of 16×16-tile parcels (`S.owned`). The player starts owning the NW quarter. I.M. Picky must complete and enjoy a periodic inspection round before up to three edge-adjacent parcels become purchasable ($3,500) for a limited time. Unowned land renders dimmed; only a live selection gets FOR SALE signs.
- **Elevation is a corner heightfield:** `S.elevC` is `(W+1)×(H+1)` integer corner heights (0..`MAXE`, `EH` screen px per step). Tiles render as sloped quads; `elevAt()` (rng.ts) is bilinear, so entities move smoothly over slopes. Invariant: **adjacent corners differ by ≤1** — enforced by BFS propagation.
- Holes: `S.holes[]` with `tee`, `cup`, `par` (derived from tee→cup distance), `teeTiles`, `greenTiles`, `beauty`. Golfers play holes **in array (creation) order**.
- Buildings: `S.buildings[]`; building lots develop over time (`stage` 0→2 = construction → cottage → estate) with income multiplied by their live `homeValueAt()` result. The first Landmark is a free Ivana Richman donation and unlocks later purchases. Operating resort facilities separately progress through `level` I→III and a permanent Service/Prestige `branch`; `upgrade` stores timed construction work. Facilities need a pathway connection to the clubhouse (`recomputeConnectivity`, orthogonal-edge contact only) except scenery.
- Facility activities: `S.facilityActivities[]` — periodic animated plane arrivals/departures (airstrip) and boat loops (marina). Pure pose math lives in `facilityActivity.ts`; rendering converts poses through the active camera rotation.
- Wildlife: `caches.wildlife` — ducks/deer/rabbits/squirrels/birds seeded from habitat (water/woodland/rough), influenced by ranger/marshall staffing.

## Rendering pipeline (`render.ts`)

The signature trick, in two stages:

1. **Ortho paint** (`drawOrtho`): the whole map is painted in flat grid space onto an offscreen canvas at `RES` px/tile. This is where the SimGolf look happens cheaply: rounded "blob" autotiles via per-corner `roundRect` radii (fairway/green/sand/water/path merge into organic shapes), fairway mowing stripes, green fringe + mow checker, beach rims, speckle noise, flower rosettes, plus distinct deep grass, waste cuts, pot craters, connected streams/burns/ravines, brush/gorse and faceted rocks.
2. **Sloped-quad composite** (`buildGround`): each tile is texture-mapped from the ortho canvas onto its iso quad as two clipped affine triangles positioned by the four corner heights (`mapTri`), then tinted by slope shading (`triShade` — sun fixed at the screen's upper-left; both triangle shades are averaged per tile so straight slopes read as one face). Flat tiles take a no-shading fast path. Output goes to the ground-cache canvas `gc`, rebuilt only when `caches.groundDirty`.

`draw()` per frame: backdrop, blit `gc`, water glints, editor overlays (terrain-following tile outlines, parcel hover, hole draft), then a **depth-sorted display list** — trees, flags/tee signs, clubhouse/buildings, wildlife, staff, golfers, balls — sorted by view-space depth (`viewXY(x,y)` sum), then aim UI, particles, floaters.

### Sprites (`sprites.ts`)

Everything animate/decorative is baked once into small offscreen canvases (1 unit = 1 px), stamped with a 4-way dark outline, and drawn upscaled with `imageSmoothingEnabled = false` — the chunky-pixel look is deliberate and a hard style requirement. Golfers: parameterized colors, walk/address/backswing/follow-through/putt frames, golf bag, left/right facing via `scale(face,1)`. Buildings: an iso-box builder with striped awnings/roofs/windows plus per-kind props (tennis net, windsock, sailboat, roller door…); anchored at the footprint centre; **fixed facade across view rotations** (accepted cheat). Trees, wildlife, and props follow the same bake pattern.

## Camera & rotation (`camera.ts`)

- `viewXY(wx,wy)` remaps world→view for the current quarter-turn rotation `S.rot` (0..3); `isoOf` projects view coords; `screenToWorld` inverts both. **Every** spatial computation that touches the screen must go through these (ground corners, depth sort, golfer facing, slope light — see `worldLight()` in render).
- `P()` = world→screen; `PE()` = same, lifted by terrain height. All entity drawing uses `PE`.
- `screenToWorldT` iterates picking against terrain height so clicks land on the right tile on hills.
- `rotateView(±1)` keeps the screen-centre world point fixed and marks the ground dirty. Keys `r`/`R`, orbs in the control cluster.
- `fitCamera` frames the owned-parcel bounding box, not the whole map.
- Camera glide: `S.camTarget` is eased toward in `update()` (used to follow the player's ball / next tee); any manual pan/zoom cancels it.

## Terraforming (`engine.ts`)

- `terraform(x,y,±1)` builds a **plan** first (`planTerraform`): seed corners get targets, the ≤1-step constraint ripples outward via BFS; if the ripple would move a **pinned** corner (buildings, clubhouse, water, other holes' pads) the whole edit is rejected with a hint. Cost = `ELEV_COST` per corner actually moved, so big reshapes cost more.
- Tees and greens are flat slabs: terraforming one lifts/lowers the entire feature one step as a unit.
- `forceLevel(tiles,h)` is the unconditional variant used by hole creation and water painting (water digs itself a level basin).
- Input supports press-and-hold repeat for raise/lower (see `input.ts` elevation-hold timers).

## Golfer simulation

State machine per golfer: `toTee → preshot → watch → toBall → (prePutt) → … → finishHole → next hole | leave`. Shots use `aimShot` (lie tables in `constants.ts`, skill noise, uphill shots land short) then a ball entity flies/rolls (`rollFrom` curves downhill via the elevation gradient, with a step guard). Moods react to hazards, scenery (`beauty`), amenities, and staff; manual difficulty scales negative changes only. I.M. Picky and Ivana Richman are real special golfers whose completed mood determines their unlock event. Payment on hole completion = fee × mood multiplier × par premium × facility fee multiplier. Reputation is a running blend of departing golfers' star ratings. Spawner cap scales with hole count (up to 36). The player round shares the same ball physics with drag-to-swing input; putts allow tap-ins (lower minimum distance/power on green lies). `PlayerRound` captures every live shot and `scorecards.ts` collapses completed play into an immutable versioned `RoundRecord` for history and future competition submission.

## Persistence

Course state uses localStorage key `fairway-mogul-save-v1`, format `v:2`: tiles, `elevC`, `owned`, holes, buildings, employees, difficulty, special-visitor progression, and **golfers** (restored mid-round; anyone who was mid-swing is coerced back to walking since balls in flight aren't saved). The separate `fairway-mogul-profile-v1` key now stores a backward-compatible v2 payload: 200 versioned rounds, the transferable resident pro, eight retired course snapshots and 30 championship results. Autosave runs every 10s but is suspended behind mandatory first-course setup. `newCourse()` regenerates course state while preserving the profile.

## Resident pro and Championship Mode

`proCircuit.ts` owns the ten manual skill definitions, resident/default profile factories, defensive profile reads and deterministic opponent-field/result reduction. The engine's `playerIntendedDistance()` and `playerShotSkill()` are shared with `render.ts`, keeping actual ball physics and the live aim guide synchronized as skill points change. Professional Accomplishments reuse `GOAL_DEFS`; first completion is profile-global and grants one skill point.

`retireCourseForChampionship()` captures a static, golfer-free course snapshot into the profile rather than a normal save slot. `startChampionshipRound()` uses the same `isolatedReturnSave` invariant as online events, then `endRound()` reduces the permanent scorecard into a ranked 12-player result and updates resident-pro money/fame/career totals before restoring the working course.

The local Pro Challenge scheduler lives in `engine.ts`, but offer creation/sanitization and deterministic hole resolution live in `proCircuit.ts`. Opponent scoring consumes `Hole.skillDemand` from `sga.ts`; the match result is therefore coupled to the real Length/Accuracy/Imagination test of each hole. Worst-case wager exposure is checked before acceptance. Offers/cooldowns serialize in the course save, while the 30-result archive belongs to the local profile.

## Financial years and membership

`finance.ts` defines five-minute financial years, category metadata, defensive ledger reads and pure annual statement reduction. `engine.ts` is the only bank mutator: `earn()`/`spend()` journal signed entries, direct refunds/event settlements record their exact delta, and property income, wages and upkeep keep separate integer accruals. Repeated entries aggregate by category/detail/year to preserve a useful full-year ledger. Capital is reported separately from operating profit.

`memberships.ts` owns dues pricing, active-year rules, return weighting and deterministic eligibility. A regular must complete a happy third visit to join, expired annual members renew after another good complete round, and exceptional ten-visit members can upgrade for life. The golfer engine applies the active-member fee discount and 3× arrival draw; the Financial and Membership report tabs read the same persistent course state.

## Theme Pack content boundary

`themePacks.ts` models the manual's Theme Packs as optional player, story, touring-pro and bundled-course sections. Accessors always perform per-section fallback to Standard; a story-only pack therefore keeps the default cast and professionals without duplicating their data. All bundled copy, names and palettes are original even though the installed game's `resources/.../Themes` directory was used to verify the file-category structure.

`newCourse()` stores `themePackId`/`themeCourseId` before `initMap()`. The map generator either lays the default starter hole or validates/builds each hole in the selected blueprint, then seeds the pack cast. Engine story moments expand safe named tokens. Pro Challenge creation and Championship field construction consume the same active touring list. A pack never mutates `S.proProfile`, because that belongs to the separate player profile boundary.

## Online boundary

`worker/src/index.ts` is a standalone Cloudflare Worker rather than React server code. D1 is accessed only through its Worker binding and prepared statements. Google OIDC completes entirely on the Worker; the browser receives only a hashed-server-session-backed cookie and a readable CSRF cookie. State-changing routes require both the CSRF header/cookie pair and the configured exact Origin. Google tokens are discarded after ID-token verification.

Course snapshots are bounded to 750 KB and must pass the same `courseFingerprint()` implementation used by the game. Cloud saves use optimistic revisions. Published courses are immutable per owner/fingerprint. Cron and public reads call the same deterministic competition generator, so a missed scheduled trigger repairs itself on the next request. Score submissions validate route/competition/course identity and all card totals before entering a leaderboard, but remain explicitly provisional until the simulation can be replayed authoritatively on the server.

`0002_social_multiplayer.sql` adds discoverable profiles, directed follows, durable two-player challenges, one-score-per-player challenge submissions, single-attempt tournament enforcement and the capped cloud scorecard profile. Challenge and competition course endpoints read their immutable D1 snapshot directly, so an owner archiving or deleting a profile cannot invalidate an already scheduled match. Account deletion is a D1 batch: private/profile data and submissions are removed, public course content is archived, open matches are cancelled, and the user row is anonymized to preserve relational integrity.

`0003_season_progression.sql` adds idempotent competition finalization and awards. Cron selects only ended/unfinalized competitions, reduces each player's attempts to their best card, writes one award per competition/player, then records finalization in the same D1 batch. Season standings are derived from awards rather than a mutable counter, so retries cannot double points and deletion can remove a player's progression cleanly. A friends board is the same deterministic ranking restricted to the current player plus followed users.

Online competition/challenge play is isolated in `engine.ts`: `onlineReturnSave` captures the home save, the published layout is loaded, and completion/abandonment restores the home course. Autosave keeps writing the captured home course during event play, so a reload cannot replace it. Only the detailed scorecard persists; online rounds do not award local cash or reputation.

## Input map

Drag = paint (per-stroke dedupe via `beginPaintStroke`), tap = tool action, **hold Space = pan with any tool**, wheel/pinch = zoom, `P` pause, `r`/`R` rotate, Escape cancels aim/hole draft. Play mode: drag back from the ball to swing.

## Tests & tooling

Browser: `npm run dev | build | typecheck | test`. Worker: `npm run dev:api | build:api | typecheck:api | test:api`, plus `npm run db:migrate:local`. The browser suite has 86 tests; the Worker suite runs 7 end-to-end route tests against isolated Miniflare D1 storage. Dev builds expose `window.__sim = { S, P, PE, screenToWorld }` for browser-driven UI testing.

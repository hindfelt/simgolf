# Fairway Mogul handoff

Use this file to continue the project on another computer. The canonical continuation branch is `agent/handoff-world-screen-bridges`, based on `main` at `a1fc834`.

## Goal

Build a fully fledged browser game inspired by *Sid Meier's SimGolf*: a charming, deep course-building and resort-management game with an isometric pixel-art presentation. It should feel coherent and alive, not like a collection of prototype systems.

The immediate quality bar is especially important:

- Facilities, aircraft, boats, tees and UI must have convincing proportions and readable original pixel art.
- A built airstrip and marina should create visible traffic and ambience: aircraft fly over and land; boats use the marina.
- The course needs wildlife and grounds activity so rangers, groundskeepers and gardeners feel connected to the simulation.
- Elevation tools must support several height steps, not a single raise/lower operation.
- Clicking Resort must expose build options directly.
- Paths crossing water or streams must automatically become connected bridge tiles.
- The Resort & facilities catalog must be compact, aligned and visually intentional at desktop and responsive sizes.
- Keep expanding the tycoon layer: properties, staff, finances, memberships, pro play, competitions, scorecards, upgrades and online multiplayer should reinforce one another.

This is an original homage. Do not ship copied game assets, names, stories, audio or pixels.

## Start on the other computer

```bash
git clone https://github.com/hindfelt/simgolf.git
cd simgolf
git fetch origin
git switch agent/handoff-world-screen-bridges
npm ci
npm run typecheck
npm test
npm run typecheck:api
npm run test:api
```

Then read, in this order:

1. `handoff.md` — current task and exact stopping point.
2. `handover.md` — architecture, invariants and reference-material rules.
3. `design-and-architecture.md` — system design.
4. `featurelist.md` — implemented feature inventory.
5. `TODO.md` — longer-term gaps.
6. `ONLINE_SETUP.md` — Worker, D1, OAuth and production operations.

## Technology and layout

- Vite, React 18 and TypeScript.
- Framework-free simulation and Canvas 2D isometric renderer in `src/game/`.
- React UI in `src/ui/`, connected through the zustand bridge in `src/ui/store.ts`.
- Cloudflare Worker API in `worker/`, D1 migrations in `worker/migrations/`.
- Production configuration in `wrangler.jsonc`; custom domain is `simgolf.0x4d.in`.
- Original-game material under `resources/` is ignored by Git and is reference-only.

## Non-negotiable rules

1. Never copy or ship the original game's assets. All production art and audio must be original or procedural.
2. Preserve the chunky pixel aesthetic. Canvas sprites use dark outlines and `imageSmoothingEnabled = false`.
3. `Tile` enum values are persisted in saves. Append new values; never renumber existing values.
4. Route world/screen transforms through the camera helpers. Respect `S.rot`.
5. Terrain edits must invalidate the correct ground caches. See `handover.md` for the two-cache invariant.
6. Every course-bank mutation must be journaled through the finance helpers.
7. Preserve online-round and championship save isolation.
8. Never commit `.env`, `.dev.vars`, secrets, build output, Wrangler state or `resources/`.
9. Visually inspect UI and canvas changes in a real browser. Typecheck cannot catch proportions, overlap or ugly composition.
10. Survey `git status`, `git log` and the current diff before editing; the owner may modify the repository between sessions.

## What is implemented in this snapshot

- Playable course construction, golfer AI, scoring, economy, save/load and player rounds.
- Four course themes and difficulties, modular Theme Packs and bundled starter courses.
- Facilities, upgrades, staff, finances, memberships, scorecards, SGA evaluation, resident pro, Pro Challenges and Championship Mode.
- Multi-step terrain elevations and course wildlife/grounds ambience.
- Improved original facility sprites plus aircraft, marina traffic and course flyovers.
- Google OIDC, secure sessions, cloud slots, published courses, profiles/follows, asynchronous challenges, daily/weekly competitions, Club Championship, leaderboards and season points.
- A new sixteen-property World Screen data model and mostly wired new-course flow.
- Bridge terrain values and most simulation-side path conversion behavior.

The snapshot is intentionally a continuation point, not a finished release. The items below are the active work.

## Active work: finish this first

### 1. Complete water-crossing bridges

Already present:

- `Tile.BRIDGE_WATER = 16` and `Tile.BRIDGE_STREAM = 17` are appended in `src/game/types.ts`.
- Tile metadata, costs, lie/roll behavior and minimap colors exist.
- Painting a path on water/stream converts the tile to the appropriate bridge type.
- Bulldozing restores the underlying water/stream.
- Path connectivity and pathfinding accept bridge tiles.
- Water beauty/wildlife caches treat a water bridge as water.

Still missing:

- `src/game/render.ts` does not draw bridge tiles yet. Keep water visible under `BRIDGE_WATER`; treat `BRIDGE_STREAM` as a stream-backed tile; add an original low-resolution wooden deck overlay with rails, plank rhythm and proper isometric depth.
- Determine bridge direction from orthogonal path/bridge neighbors. Consecutive bridge tiles must read as one continuous span rather than separate platforms.
- Extend stream-neighbor rendering so stream joins remain continuous beneath `BRIDGE_STREAM`.
- Update `src/game/routing.ts`: bridges should add the underlying water scenery/home-value benefit without being blocked or trouble terrain. Replace the hard-coded parcel height there with `PH` (`12`).
- Update the Pathway tool copy in `src/ui/Toolbar.tsx` to explain the land price versus bridge price.
- Add regression tests for water conversion, stream conversion, costs, connectivity and bulldoze restoration.

Audit all terrain switches after the change:

```bash
rg -n "Tile\.(PATH|WATER|STREAM)|switch \(.*tile|switch \(t\)" src/game src/ui
```

### 2. Finish and style the sixteen-property World Screen

`src/game/properties.ts` defines sixteen original properties across Parklands, Links, Desert and Tropical regions. Prices, starting parcel deeds, relief, water, woodland and seeds vary. State/save/profile integration and procedural map generation are substantially wired through `src/game/engine.ts`, `src/game/state.ts`, `src/game/types.ts`, `src/ui/store.ts`, `src/ui/TopBar.tsx` and `src/ui/Modals.tsx`.

Still missing:

- Add the CSS for `worldScreenHead`, `worldMap`, `worldRegion`, `worldProperty`, `propertyPin`, `propertyInspector`, `propertyFacts`, `parcelDeed` and `propertyMeter` in `src/styles.css`.
- Verify affordable, unaffordable, selected and already-purchased states are visually distinct and accessible.
- Add property-focused tests: affordability, starter property fallback, persistence/migration, deed ownership and generation differences.
- Verify new-course replacement semantics and profile purchase history in a browser.
- Update `README.md`, `featurelist.md`, `TODO.md` and the older `handover.md` once this is complete; some still call the World Screen a gap.

### 3. Redesign the Resort & facilities catalog

The last supplied screenshot showed an oversized four-column modal with loose spacing, uneven hierarchy and a dead empty area in the final row. The current implementation is `src/ui/BuildPanel.tsx`; relevant CSS begins near `.buildPanel`, `.bpGrid` and `.bpItem` in `src/styles.css`.

Target:

- A denser, balanced catalog with consistent card height, aligned icon/name/cost/footprint and no dead final-row void.
- Consider five equal columns at wide desktop widths so all fifteen facilities form three complete rows; use three, two and one column at narrower breakpoints.
- Keep descriptions to two readable lines and separate the price from the footprint chip.
- Add compact category filters or grouping only if they improve scanning: Resort, Travel, Property and Scenery.
- Do not fade locked facilities into illegibility; show the lock reason clearly.
- Preserve the immediate Resort click behavior already wired in `src/ui/Toolbar.tsx`.
- Check staff-card button baselines as well; a previous screenshot showed Hire/Fire misalignment.

### 4. Visual QA of moving traffic and facility art

The current aircraft/boats/facilities were revised after repeated proportion complaints, but they still need browser QA at several zoom levels and rotations. Check that:

- Aircraft are proportionate to the 8x3 airstrip, look like small prop planes rather than missiles, approach the runway, land/taxi and depart without clipping buildings.
- Marina boats are recognizable, correctly scaled to the dock and not hidden by trees or labels.
- Tees resemble a classic SimGolf teeing ground while remaining original art.
- Wildlife is visible without becoming noisy and staff effects remain meaningful.
- Facility cards and on-course labels do not obscure sprites.

The in-app Browser/Chrome surface was unavailable during the final session, so do not treat the current snapshot as visually approved.

## Verification state at handoff

These were run immediately before the handoff commit:

- `npm run typecheck` — passes after restoring the missing theme metadata used by the Help modal.
- `npm run typecheck:api` — passes.
- `npm run test:api` — 7/7 passes.
- `npm test` — 86/86 passes after updating an obsolete expected course name from `Fairway Mogul` to the selected property name `Donegal Point`.
- `npm run build` — passes.
- `npm run build:api` — Wrangler production dry-run passes.
- `npm audit` and `snyk test` — no vulnerable dependency paths.
- `snyk code test` — zero issues after moving Worker test bindings out of literal source values.
- `git diff --check` — passes.

Before considering the active work releasable, run:

```bash
npm run typecheck
npm test
npm run build
npm run typecheck:api
npm run test:api
npm run build:api
npm audit
snyk test
snyk code test
git diff --check
```

Also run the UI locally and inspect real screenshots at desktop and mobile sizes.

## Production deployment safety

The repository is production-shaped, but source configuration does not prove remote state. Do not blindly recreate or overwrite infrastructure.

1. Authenticate the intended Cloudflare account with Wrangler and confirm `wrangler whoami`.
2. Confirm the `fairway-mogul-db` database ID in `wrangler.jsonc` is the correct production D1 database.
3. Inspect remote migrations before applying anything; export a backup first if migrations are pending.
4. Confirm production Google OAuth includes `https://simgolf.0x4d.in/api/auth/google/callback`.
5. Keep secrets in Wrangler, never source or shell history.
6. Build the browser, dry-run the Worker bundle, then deploy.
7. Smoke-test the homepage, static assets, anonymous API responses and authenticated flows with a test account.

Useful commands:

```bash
npx wrangler whoami
npx wrangler d1 migrations list fairway-mogul-db --remote
npm run build
npm run build:api
npx wrangler deploy
curl -I https://simgolf.0x4d.in/
```

## Definition of done for the next milestone

- Water/stream path crossings render as continuous bridges and have regression coverage.
- World Screen and Resort catalog are visually polished and responsive.
- Aircraft, marina traffic, facilities, tees and wildlife pass screenshot QA in all four camera rotations.
- Frontend and Worker typechecks, tests, builds, dependency/security scans and diff checks pass.
- Documentation reflects actual behavior.
- The reviewed commit is pushed, remote D1 state is verified, and the same commit is safely deployed to `simgolf.0x4d.in`.

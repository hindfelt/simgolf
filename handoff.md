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
- A sixteen-property World Screen with distinct terrain/deed profiles, six starter deeds, ten enforced career-gated locations, purchase-history persistence and guarded new-course replacement.
- Connected water/stream bridge tiles with automatic Pathway conversion, wooden-deck rendering, routing value and bulldoze restoration.
- A responsive fifteen-item Resort catalog with category filters, explicit availability and aligned staff actions.

The snapshot is intentionally a continuation point, not a finished release. The items below are the active work.

## Active work: finish this first

### 1. Verify water-crossing bridges

Implemented in the current continuation work:

- `BRIDGE_WATER` remains part of the water blob and `BRIDGE_STREAM` remains part of the connected stream channel, so the original procedural terrain stays visible beneath each deck.
- `src/game/bridges.ts` determines the deck axis from orthogonal path/bridge neighbors, with channel-aware fallback for isolated stream crossings.
- `src/game/render.ts` draws raised original wooden decks with continuous long edges, plank rhythm, rails, posts and isometric depth. Adjacent bridge tiles share their deck and rail edges instead of reading as separate platforms.
- Routing Map Aura and Home Value preserve the underlying water/stream benefit while bridge sites remain buildable. Parcel ownership now uses `PARCEL_W`, `PARCEL_H` and `PW` rather than stale hard-coded dimensions.
- Pathway tool pricing explains land, water-bridge and stream-bridge costs.
- Regression coverage now includes persisted tile ids, conversion prices, connectivity, bulldoze restoration, pinned water elevation, deck direction and routing behavior.

Still required before calling this milestone complete:

- Inspect bridge spans in a real browser at multiple zoom levels and all four rotations, including wide ponds, one-tile streams and sloped approaches.
- Run the remaining typecheck/build matrix.
- Run the required Snyk Code and dependency scans after explicitly approving source upload/folder trust, then commit and push.

Audit all terrain switches after the change:

```bash
rg -n "Tile\.(PATH|WATER|STREAM)|switch \(.*tile|switch \(t\)" src/game src/ui
```

### 2. Verify the sixteen-property World Screen

Implemented in the current continuation work:

- A responsive atlas-and-deed layout now styles all sixteen Parklands, Links, Desert and Tropical opportunities with original travel-poster scenery, brass pins, property cards, themed inspectors, deed cells and terrain meters.
- Affordable, short-of-funds, purchased, current and selected states use distinct color, border, pattern and copy treatments. Every card remains selectable for comparison and announces its status; deed and terrain visuals expose accessible values.
- The setup modal now traps keyboard focus, restores prior focus on close, labels selection buttons and uses a truthful Sandbox replacement confirmation.
- `newCourse()` now rejects an already-developed property even if a caller bypasses the panel, while Sandbox Mode deliberately remains available on purchased properties.
- Property replacement now writes the new autosave before profile ownership is relied upon, backfills legacy/current deeds into purchase history, prevents Sandbox treasury leakage and awards the Picky land accomplishment only after a real county purchase.
- Property regressions cover the sixteen-entry catalog, affordability, starter fallback, history sanitization, deed ownership, price deduction, profile persistence, repurchase protection, Sandbox behavior, old-save migration and terrain-generation differences.

Still required before calling this milestone complete:

- Verify the initial and replacement flows in a real browser at desktop, tablet and phone widths, including keyboard-only navigation and every property state.
- Run the remaining typecheck/build matrix.

### 3. Verify the Resort & facilities catalog

Implemented in the current continuation work:

- The fifteen build choices use a balanced five-column desktop grid and three/two/one-column responsive breakpoints, with Resort, Travel, Property and Scenery filters.
- Cards align icon, name, category, two-line description, price, footprint and availability. Locked and unaffordable entries remain legible and explain the blocker instead of being disabled into obscurity.
- The Resort button still opens the Build catalog directly; Build/Manage tabs retain existing facility-upgrade behavior.
- Staff cards now expose employment or unlock status, accessible Hire/Fire labels and consistently aligned actions.

Still required before calling this milestone complete:

- Inspect all breakpoints in a real browser, including long themed names, insufficient cash, the locked Landmark, keyboard focus, and Hire/Fire baselines.

### 4. Visual QA of moving traffic and facility art

The current aircraft/boats/facilities were revised after repeated proportion complaints, but they still need browser QA at several zoom levels and rotations. Check that:

- Aircraft are proportionate to the 8x3 airstrip, look like small prop planes rather than missiles, approach the runway, land/taxi and depart without clipping buildings.
- Marina boats are recognizable, correctly scaled to the dock and not hidden by trees or labels.
- Tees resemble a classic SimGolf teeing ground while remaining original art.
- Wildlife is visible without becoming noisy and staff effects remain meaningful.
- Facility cards and on-course labels do not obscure sprites.

The in-app Browser/Chrome surface was unavailable during the final session, so do not treat the current snapshot as visually approved.

## Verification state at handoff

Current continuation checks:

- `npm test` — 146/146 browser-game tests pass across 22 files, including bridge/property regressions, career unlock boundaries, transactional portfolio switching, dedicated staff art, and direct shot-shape behavior.
- `npm run test:api` — 7/7 Worker/D1 integration tests pass.
- Browser screenshots, the remaining typecheck/build matrix and Snyk scans are still pending; no visual QA is claimed for this round.

These were run immediately before the handoff commit:

- `npm run typecheck` — passes after restoring the missing theme metadata used by the Help modal.
- `npm run typecheck:api` — passes.
- `npm run test:api` — 7/7 passed at the earlier handoff and again in the current continuation.
- `npm test` — the earlier handoff passed 86/86; the expanded current suite now passes 146/146.
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

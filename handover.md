# Handover — Fairway Mogul (SimGolf clone)

Read this first in a fresh context. Companion docs: `design-and-architecture.md` (how it works), `featurelist.md` (what's built), `TODO.md` (what's left), `README.md` (run instructions).

## What this is

Browser clone of Sid Meier's SimGolf at `/Users/mathin/Code/SimGolf`. Owner's favorite game; goal is a faithful-feeling, fun tycoon — "in the spirit of" the original, not a pixel-identical rip. Vite + React 18 + TS, hand-rolled Canvas 2D iso engine (`src/game/`, no React imports), React chrome (`src/ui/`), zustand bridge (`ui/store.ts`).

Feature-complete against most audited local manual systems: 4 course themes/difficulties, modular Theme Packs, the full hazard family, Routing Map layers, earned land/Landmarks, three-level resort upgrades, exact eight-class SGA evaluation with fee premiums, year-sorted financial accounting, purchased memberships, detailed scorecards, a skilled resident pro, issued local Pro Challenges and Championship Mode on retired courses. The remaining manual fidelity work is the sixteen-property World Screen and complete hotkey parity. The authenticated online layer includes secure Google OIDC/session management, account deletion/profile migration, D1 cloud slots/course publishing, player discovery/follows, asynchronous challenges, daily/weekly events, a scheduled online Club Championship, friends boards and quarterly season points. See `featurelist.md` and `TODO.md` for the exact remaining scope.

## Commands

```bash
npm run dev         # localhost:5173
npm run build       # tsc -b + vite build
npm run typecheck
npm run test        # vitest, 86 tests
npm run dev:api     # Worker API at localhost:8787
npm run typecheck:api
npm run test:api    # Workers runtime + D1, 7 tests
npm run db:migrate:local
```

## Hard rules / owner preferences

1. **No ripped assets in the build.** The original game's files live under `resources/Sid Meier's SimGolf_RIP/` (PCX/FLC/BMP; audio mostly missing) plus the manual PDF. Reference only — all shipped art/audio is original + procedural. This keeps the planned Cloudflare Pages deploy clean. Converting reference art to compare hue/silhouette (never pixels) is fine and has been done repeatedly this session — see the PCX conversion recipe below.
2. **Keep the chunky pixel aesthetic.** Owner explicitly rejected smooth "SVG-looking" canvas art. All sprites are baked low-res with dark outlines and drawn with `imageSmoothingEnabled = false` (`src/game/sprites.ts`). Don't chase photorealistic proportions even when reference art suggests them — this is a deliberate style choice, confirmed after comparing the original's semi-realistic golfer figures.
3. Owner edits the codebase between sessions. **Always survey `git log` + changed files before assuming the code matches prior session notes.**
4. Only commit when explicitly asked. Run Snyk scans before any commit per the owner's global rule.

## Load-bearing invariants (break these and things get weird)

- **Rotation:** `S.rot` (0–3). All world→screen math must route through `viewXY()` / `isoOf()` / `screenToWorld()` in `camera.ts`.
- **Elevation:** corner heightfield `S.elevC`, adjacent corners differ ≤1. Edits go through `planTerraform` (respects pinned corners) or `forceLevel` (unconditional — use sparingly).
- **Tees/greens are flat slabs** that raise/lower as one unit; buildings require a flat, owned footprint.
- **Ground cache:** two dirty flags — `caches.orthoDirty` (tile/ownership/theme-color-dependent, repaints the flat blob layer) and `caches.groundDirty` (elevation-dependent, drives the sloped-quad composite that consumes the ortho layer). Set both after any tile/ownership/theme change; `groundDirty` alone after a pure elevation edit.
- **Tile enum values are persisted** in saves — never renumber `Tile`. The original 0–10 values remain fixed; the complete manual hazard family was appended at 11–15. New terrain must always add `TINFO`/`LIE`/`ROLL`, minimap, render, pathfinding and placement handling together.
- Save: localStorage `fairway-mogul-save-v1`, format v2. Golfers restored mid-round; mid-swing states coerced to walking (balls in flight aren't saved). Map-dimension changes silently invalidate old saves.
- Course theme (`S.theme`) and sandbox flag (`S.sandbox`) are cosmetic/economic overlays, not tile data — safe to change live without touching the map. Difficulty (`S.difficulty`) is persisted and scales only negative mood deltas through `attitudeDelta()`.
- Special visitor progression is persisted in `S.specialVisitors`. Land can only be purchased from a live Picky selection; Landmarks remain locked until Ivana donates the first, free placement.
- Facility levels live on each `Building` as `level`/`branch`; active timed work is `upgrade`. Construction keeps path connectivity but `facilityOperational()` disables effects and traffic until completion. Building-lot `stage` remains a separate automatic housing lifecycle.
- Completed `RoundRecord` scorecards are not course-save state: they live in the separate local profile key `fairway-mogul-profile-v1`, survive new courses/slot loads, cap at 200, and use a versioned schema plus deterministic `courseHash`. The same backward-compatible v2 profile payload owns the resident pro, retired championship courses and pro-circuit history; course export and scorecard archive export remain intentionally separate.
- Championship play is isolated like online event play: `isolatedReturnSave` captures the working course, loads a retired layout, applies the chosen pro/difficulty, then restores the working course on finish or quit. Career money/fame belong to `S.proProfile`, not the resort bank.
- Local Pro Challenges are deliberately not isolated: the resident pro plays the current course and `resolveProChallenge()` settles each hole against its saved SGA skill demand. Offers/cooldowns are course state; result history is profile state; the net wager changes the resort bank.
- Financial years are five real-time minutes (`finance.ts`). Every course-bank mutation must call `recordFinance()` through `earn()`/`spend()` or record its exact manual delta; never add a new naked `S.cash +=` without a journal entry. Memberships and their visit/hole/spend history live on `Regular` inside the course save, not the cross-course player profile.
- Theme Packs (`themePacks.ts`) are content bundles, not aliases for `CourseTheme`. Per the manual, missing players/stories/celebrities/pros/courses inherit Standard. The selected pack and optional bundled course are course-save state; a new course reseeds the roster, while the resident pro remains profile state. Keep all shipped pack content original—resource Theme files are structural reference only.
- The browser and Worker share `src/shared/courseFingerprint.ts`; never fork this algorithm. D1 snapshots are rejected if the server-recomputed hash differs.
- Online event play is temporary. `onlineReturnSave` restores the home course after finish/quit, autosave protects that captured home state throughout the round, and online rounds award no local cash/rep. Preserve that isolation for every new event source.
- Worker secrets are declared in `wrangler.jsonc` and belong in `.dev.vars`/`wrangler secret put`, never source. See `ONLINE_SETUP.md` before touching live infrastructure.

## Testing workflow (headless, no user needed)

Dev builds expose `window.__sim = { S, P, PE, screenToWorld }` (set in `GameCanvas.tsx`). For anything not reachable through that object, dynamic-import the relevant module inside `page.evaluate` (e.g. `await import('/src/game/engine.ts')` to call `rebuildStatics()`, or `/src/game/state.ts` for `caches`) — this pattern was used throughout the session and works reliably.

```js
// world→screen: const p = await page.evaluate(([x,y]) => window.__sim.PE(x,y), [tx,ty])
// click tiles to build; drag from ball opposite the cup to swing (power = worldDragLen/9)
// localStorage.clear() + reload for a fresh course; wait ≥10s for autosave
```

Playwright is installed standalone in the session scratchpad (`node_modules/playwright`), not a project dependency — recreate with `npm install playwright` there if missing. Chromium executable path used throughout: `/Users/mathin/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`. Screenshot and *look* at results — several bugs (checkerboard water, harsh slope shading, giant speech bubbles, mislabeled UI buttons) were only visible, not typecheckable.

## Reference material & how to use it

`resources/Sid Meier's SimGolf_RIP/` holds the original game rip: terrain textures under `Data/Textures/` (BMP), UI icon atlases under `Interface/` (PCX, magenta chroma-key sprite sheets — not literal panel screenshots), character art under `Bodies/`/`Heads/` (PCX), FLC animations under `Flics/`. Plus the full manual at `resources/SidMeiersSimGolf-Manual (1).pdf` — read it page-by-page via the Read tool's PDF image support for the most reliable source of "what's a real missing mechanic vs a nitpick"; grepping filenames alone misses things laid out as prose (the theme-based building reskin was only found this way).

Conversion recipes:
```bash
# BMP → PNG (built into macOS)
sips -s format png in.bmp --out out.png
# PCX → PNG (sips can't read PCX)
python3 -m venv /tmp/pcxvenv && source /tmp/pcxvenv/bin/activate && pip install Pillow
python3 -c "from PIL import Image; Image.open('in.pcx').convert('RGB').save('out.png')"
```

Use converted reference only to compare hue/tone/silhouette against the clone's own procedural values — never trace or copy pixels.

## Known sharp edges

- `wrangler.jsonc` is production-shaped (custom domain, static assets and a real D1 binding), but the file does not prove which migrations/version are currently live. Inspect remote state before any migration or deploy.
- Competition and challenge scorecards are structurally validated and labeled provisional; there is no server-side deterministic shot replay yet.
- Building 3D art doesn't change per course theme, only the name/blurb does (a full per-theme sprite redesign — 8 extra building shapes — was ruled out of scope).
- Browser screenshots still require an available Browser/Chrome surface; do not claim visual QA from typecheck alone.

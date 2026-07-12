# Fairway Mogul

A SimGolf-style course-tycoon game for the browser — an original homage to
*Sid Meier's SimGolf* (2002). Design an isometric golf course tile by tile,
keep golfers happy, charge green fees, grow your reputation, and tee off on your
own course.

Built with **Vite + React + TypeScript**. Rendering is a hand-rolled isometric
canvas engine; React drives the UI chrome (topbar, toolbar, HUD, modals).

## Run

```bash
npm install
npm run dev        # dev server at http://localhost:5173/
npm test           # deterministic placement/connectivity regression tests
npm run build      # typecheck (tsc -b) + production bundle to dist/ (base /simgolf/)
npm run preview    # preview the production build
npm run dev:api    # Cloudflare Worker API at http://localhost:8787/
npm run test:api   # Worker + isolated D1 integration suite
```

> Note: `vite preview` applies the `/simgolf/` base and its SPA fallback can
> mask hashed assets locally. Static hosts (Cloudflare Pages) serve the files
> directly, so this only affects `preview`, not the deployed build or `dev`.

The online layer is optional for local play. To enable Google sign-in, cloud saves,
published courses and competitions, follow [ONLINE_SETUP.md](ONLINE_SETUP.md).

## Architecture

```
src/
  game/                 # framework-free simulation + canvas renderer
    types.ts            # domain types (POC + reserved shapes for clone features)
    constants.ts        # grid, tile info, lie/roll tables, names, chatter
    properties.ts       # sixteen-property World Screen catalog + terrain profiles
    bridges.ts          # water/stream bridge helpers and deck-axis selection
    state.ts            # S — the single mutable sim state + geometry caches
    rng.ts              # helpers: hashes, clamp/lerp, lie lookup
    camera.ts           # isometric projection, zoom, pan, fit
    audio.ts            # WebAudio blips
    engine.ts           # map gen, holes, ball physics, golfer AI, economy,
                        #   player round, tools/speed/fee, per-frame update()
    render.ts           # ground cache + depth-sorted scene draw()
    input.ts            # pointer/wheel/keyboard -> engine
  ui/                   # React
    store.ts            # zustand store; `ui` bridge the engine drives
    GameCanvas.tsx      # owns the rAF loop, resize, input binding, boot
    TopBar / Toolbar / PlayHud / Ticker / Modals
  App.tsx  main.tsx  styles.css
```

The engine never imports React. It mutates `S` each frame and pushes
UI-facing values (cash, rep, hint, tickers, modals) through the `ui` bridge in
`ui/store.ts`. The render loop reads `S` directly.

## Status

**Done**
- Full port of the playable prototype — course editor (holes, fairway, sand,
  water, trees, flowers, bulldoze), golfer AI with moods/comments/scoring,
  green-fee economy, reputation, play-your-own-round, audio, mobile touch.
- **Strategic manual play** — Driver, Iron, and Wedge have distinct lie
  availability, recovery carry, launch, control, and rollout. Straight, Fade,
  Draw, Hook, Backspin, and Punch share one guide/physics forecast, with
  pointer and keyboard aiming. The live guide and HUD flag where the ideal line
  risks round-tree canopy, solid trunks, and low pine tiers; actual dispersion
  can still miss that cover. Shaped shots can route around it, Wedge can clear
  it, and Punch trades carry for a route beneath open branches without phasing
  through wood. Named golfers use deterministic pixel archetypes
  with varied builds, headwear, hair, outfits, faces, and pants.
- **Buildings & facilities** (`buildings.ts`) — pro shop, snack bar, driving
  range, putting green, cart garage, hotel, tennis, marina, airstrip, building
  lots, benches, flower beds, landmark, ballwasher, and scenic bridge. The
  responsive Resort catalog groups all fifteen choices into Resort, Travel,
  Property, and Scenery filters with aligned price, footprint, and unlock status.
  Pathway painting + connect-to-clubhouse rule (unconnected renders as mud),
  placement ghost, costs, bulldoze/refund. Effects: green-fee multiplier, spawn
  mood, walk speed, per-hole amenity mood, passive lot income.
- **World Screen property market** — sixteen original properties across
  Parklands, Links, Desert, and Tropical regions, each with its own deed price,
  starting parcels, relief, water/woodland profile, and terrain seed. The setup
  flow distinguishes available, cash-short, career-locked, purchased, current,
  and selected properties. Six starter deeds are open immediately; the remaining
  locations require sticky rating, tournament, SGA, pro-fame, and championship
  milestones. Purchase history and career prestige survive new courses, while
  an IndexedDB-backed resort portfolio keeps each developed course intact and
  makes owned locations switchable from the World Screen. Sandbox resorts remain
  distinct copies and career purchases transfer, rather than duplicate, capital.
- **Water-crossing bridges** — painting Pathway over water or a stream converts
  it to a priced, connected wooden bridge; continuous deck direction follows the
  neighboring path network, the underlying channel remains visible, and
  bulldozing restores the original water or stream.
- **Employees** (`employees.ts`) — club pro, ranger, groundskeeper, soda vendor,
  and skilled tier (celebrity, marshall, turf tech, refreshment) gated behind a
  6-hole course. Per-second wages net against income; effects on mood/pace.

- **Elevation** — raise/lower land tools ($30/step, 0–6), terraced cliff faces
  with grass lips, sun-lit highland tint, auto-flattened tees/greens, flat-ground
  rule for buildings, downhill ball roll + uphill shots landing short.
- **Blob terrain renderer** — terrain painted in flat grid space (rounded
  autotile edges, fairway mowing stripes, green fringe + mow check, beach rims
  on water, sand speckles, grass tufts) and composited into the isometric
  ground cache per elevation layer with an affine transform.
- **True iso buildings** — prism walls with windows/doors, gable or slab roofs,
  clubhouse with flag; building lots develop over time (construction → cottage
  → estate) with rising passive income.
- **Save/load** — autosave to localStorage every 10s, resume on boot,
  “Start a new course” in the help modal.
- **Management UI** — categorized build palettes, accessible original SVG
  controls, four-way camera rotation, and a live report for cash flow,
  facilities, guest conversion, alerts, and per-hole scenery.
- **Resident pro & Championship Mode** — customize and save Gary Golf, allocate
  ten manual skills, earn more points from 23 professional accomplishments,
  retire courses to a separate pro-circuit library, then play deterministic
  12-pro championships for rank, money and fame on four difficulty levels.
- **SGA evaluation & Pro Challenges** — all eight original skill-demand hole
  classes, real Top 100/Top 18 fee premiums, and issued one-on-one matches
  against named touring pros with a wager settled independently on every hole.
- **Financial Report & Membership Roster** — every bank mutation is journaled
  into year-sorted income, expense and capital statements. Happy repeat guests
  buy/renew annual memberships or upgrade for life; members return more often,
  receive a small fee discount, and retain visits, holes, dues and lifetime spend.
- **Theme Packs** — separate from terrain themes, packs can independently swap
  players, stories, celebrities, touring professionals and bundled starter
  courses while omitted sections inherit Standard. Includes Standard, a
  story-only fallback demonstration, and two complete original content packs.
- **Regression coverage** — 219 browser-game tests covering course construction,
  simulation, persistence, the World Screen/property lifecycle, bridge pricing,
  restoration and connectivity, plus 7 Worker/D1 integration tests.
- **Clubhouse Online** — Google OIDC accounts, cloud saves, published courses,
  player discovery/follows, asynchronous one-card challenges with hole-by-hole
  cards, daily/weekly leaderboards, a scheduled Club Championship, event history,
  friends boards, quarterly season points, profile scorecard sync, session
  management and account deletion.

**Roadmap**
1. Complete manual hotkey parity and browser-verify the World Screen, bridges,
   and responsive facility catalog across target sizes and camera rotations
2. Server-replayed score validation and multi-stage online tournaments
3. Invite links, notifications, match chat and real-time synchronized golfers
4. Past-season rewards and in-game unlocks
5. Production backup, rate-limit, thumbnail and alerting hardening

# Development guide

## Active application

The browser rebuild is in `simgolf-reborn/scene`. It uses JavaScript modules, Three.js and Vite. The repository-root React application, Worker and deployment workflow are the earlier implementation; do not use their commands to build this version.

Use Node.js 22 and npm:

```sh
cd simgolf-reborn/scene
npm ci
npm run dev
```

The server listens on port 4176. To test from a phone on the same network, use the computer's LAN address and that port. `localhost` on the phone refers to the phone, not the development computer.

## Test and build

```sh
# Install the browser used by the test configuration if needed.
npx playwright install chrome
npm test
npm run build
npm run preview
```

Playwright uses Google Chrome, one worker and a Vite server. Outside CI it can reuse an existing server on port 4176. Stop an unrelated process on that port before testing.

The 1.0.0 release passed 417 local tests. Some fidelity tests compare against locally supplied original game files in the repository-root `resources/` directory. Those inputs are excluded from GitHub and release downloads. A clean checkout can build the browser game without them, but cannot run every original-source comparison without supplying the referenced files. Check the relevant test's input path when running a source-fidelity test.

`npm run build` writes `scene/dist/` with relative asset URLs. A static host should serve the contents of that directory. The release ZIP contains those same production files. The current root deployment workflow does not deploy this output; production cutover remains separate work.

## Where to work

| Area | Location |
| --- | --- |
| Application controls and orchestration | `scene/src/play.js` |
| Simulation, economy, rules and save validation | `scene/src/simulation/` |
| Course and facility rendering | `scene/src/rendering/` |
| Reports and construction presentation | `scene/src/ui/` |
| Story integration | `scene/src/stories/` |
| Browser and simulation regression tests | `scene/tests/` |
| Original-game observations | `references/observations/` |

## Simulation and future multiplayer

Course changes and gameplay actions use a shared command host. Permissions, revisions and retry receipts are designed to prevent conflicting or duplicate actions. The simulation computes payments and shot outcomes; the renderer presents them.

Course packages contain geometry and settings, with a canonical content digest. Resort money and visitor history are excluded. Competition and practice sessions can use fixed course snapshots without altering the source resort. A digest identifies content consistency; it does not authenticate a player or prove authorship.

Keep economy, score and ownership decisions in the simulation. Keep visual randomness separate from gameplay randomness. When changing persisted behavior, inspect protocol migrations and save/package validation, and test resumed outcomes as well as fresh games.

The intended online modes are cooperative course editing, earnings competitions and multiplayer tournaments on courses built by different users. Authenticated networking, server persistence, publication permissions and cloud saves remain to be implemented. See [architecture](architecture.md) and [backlog](backlog.md).

## Fidelity and contributions

Use [whattobuild.md](whattobuild.md) for the full target and [backlog.md](backlog.md) for outstanding work. Distinguish verified original behavior from provisional tuning. A passing prototype test does not prove numerical parity with the original game.

For changes, document what is implemented, what remains provisional and what was checked. Include a visual review for rendering or layout changes, and meaningful regression checks for money, saves, course editing or competition outcomes.

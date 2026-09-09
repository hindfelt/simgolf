# SimGolf Reborn 1.0.0 — major browser rebuild

## Hosted preview update — 9 September 2026

- Coastal maps now generate editable offshore islands and continue them into purchased parcels.
- Slate-blue water, layered coastal conifers and terrain-following stone banks begin implementing the approved coastal concept.
- Build includes a removable, shareable lighthouse with a provisional $2,000 cost and 3×3 footprint.
- Protocol 68 migrates older resort saves without regenerating their terrain. New islands appear on newly generated coastal maps; existing courses retain their edits.
- Published at [simgolfer.0x4d.in](https://simgolfer.0x4d.in/); the live course renderer and Lighthouse construction tool were checked in the browser.
- Full regression suite: **429 passed in 5.0 minutes**. Production build passed. This remains a preview; the coastal art target and original-game fidelity are not complete.

This release introduces the new standalone implementation in `simgolf-reborn/scene`. It is a playable preview of the larger recreation effort, not a claim of complete original-game parity.

## Included

- Dimensional Three.js course presentation with rounded tile terrain and illustrated construction controls.
- Up to 18 holes, course editing, elevations, tee directions, paths, bridges, water and out-of-bounds areas.
- Visitors, persistent identities, memberships, staff, maintenance, dandelions, course fees and home sales.
- Practice, pro skills, local championships, course/golfer sharing and saved competition state.
- Land purchases, seeded terrain, coastal water, regional recreation, Marina, Helipad, Airstrip and Links Church.
- Shared command authority and deterministic simulation boundaries intended for future cooperative editing and multiplayer tournaments.

## Known limits

- Multiplayer networking, accounts and cross-device cloud saves are not implemented in this rebuild. Saves are local to each browser.
- Many costs, timings and benefits remain provisional. Original progression, full story/celebrity systems and regional scenery remain incomplete; see `backlog.md`.
- The older repository-root application and its automatic deployment workflow remain separate. This release does not replace the live site.
- Original Windows binaries and other local research inputs are excluded. Tests that compare against those files require them locally.

## Run and host

From `simgolf-reborn/scene`: run `npm ci`, then `npm run dev` for development or `npm run build` to produce `dist/`.

The release ZIP contains the production static site. Extract it and serve its contents over HTTP(S), with `index.html` at the hosting root. Do not open it directly using a `file://` URL. Export an existing browser save before changing devices or hosting origins.

## Release validation

- Full local Playwright suite: **417 passed** in 4.1 minutes.
- Production build: passed; the existing large shared Three.js chunk warning remains.
- Release ZIP contains the static production site, without development dependencies or original Windows game files.

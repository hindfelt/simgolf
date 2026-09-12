# SimGolf Reborn 1.0.0 — major browser rebuild

## Transport visitors — 11 September 2026

- Helipads, marinas and airstrips now recruit additional visitor pairs independently of walk-in guests. Each transport type reuses its visitors rather than growing the roster on every trip. Existing capacity and tee safety checks remain.
- A visiting boat approaches a connected marina, unloads golfers, stays until both return from golf/recreation, then departs. Hull clearance respects terrain, bridges and buildings. Occupied marinas cannot be demolished; blocked channels wait for repair.
- Airports deliver occasional visitor transfers. Helicopters retain the $200 landing fee and one-helicopter limit. Airport plane-flight animation is not included.
- Some golfers choose extra range or putting practice after golf, alongside paired tennis visits. Facility counts and saved visit state track actual use, with no extra golf round or new fee.
- Protocol 77 migrates resort saves and retains compatible protocol-75/76 golf packages and tournament records. Transport frequency and recreation selection are browser adaptations requested by the user.

## Tennis activity — 11 September 2026

- Golfing partners can reserve a connected tennis court after completing their round, walk over, wait for each other, play and depart. One pair uses a facility at a time.
- Actual visitors appear on court with rackets and an animated ball. Animation follows the saved simulation clock, including pause and reload. The inspector reports approaching players and completed visits.
- Disconnection, demolition, unreachable access and lost partners cancel visits without awarding completion credit. Tennis does not invent additional fees or alter completed golf scores.
- Protocol 76 migrates resort saves. Pre-tennis course packages retain their content hashes, and existing tournament records replay under compatible golf rules.
- The 24-second session and post-round selection are browser adaptations. This closes the static-tennis limitation, not the original-engine or full resort-fidelity backlog.
- Validation: **944 tests passed in 5.8 minutes** on a clean run; production build and deployment dry run passed. The long-session check completed 25 rounds and 9 helicopter visits across 12 exact save/reload cycles. The initial broad run had a staff-panel UI failure while source was changing; its focused rerun and the complete frozen-source rerun passed.

## Tree physics update — 9 September 2026

- Airborne shots now collide with natural scenery trees as well as planted trees; tree removal and terrain edits affect the result.
- Putts and ground release stop at trunk footprints. Golfers can reach a ball beside a tree without an automatic unplayable penalty or a route through the trunk.
- Protocol 70 migrates earlier resort saves. Existing tree positions remain unchanged; shared-course play uses the same simulation rules.
- Full regression suite: **438 passed in 4.7 minutes**; production build passed. Trunk response is a provisional stop, with original-game deflection and detailed putting-slope fidelity still pending.

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

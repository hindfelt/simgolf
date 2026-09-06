# SimGolf Reborn 1.0.0

The approved dimensional art direction and subsequent tile-based course/path refinements now support the **playable course with up to 18 holes**. This is an independent browser game in the new subfolder, not a completed 1:1 recreation. The full target remains in [whattobuild.md](whattobuild.md).

- [Build backlog](backlog.md): full-game completion and the requested future multiplayer features.
- [Architecture](architecture.md): command authority, deterministic simulation and multiplayer boundaries.
- [First playable milestone](playable.md): implemented behavior, controls, provisional rules and remaining work.
- [Graphics approval](graphics/README.md): concept approval and subsequent render reviews.
- [Desktop preview](graphics/samples/playable-overview.png) and [phone preview](graphics/samples/playable-phone.png).
- [Example course save](graphics/samples/playable-example.json): import through the club menu to try the pictured layout. A new game otherwise starts with an empty property.
- [Concept comparison](concepts.html), [art-test notes](graphics/art-test.md), and [original references](references/README.md).

## Release status

Version 1.0.0 marks the major browser rebuild and is published as a **playable preview**. It is not a completed replica or a production multiplayer release. See [release notes](RELEASE_NOTES.md) for scope and limits. The repository-root application and deployment workflow are the earlier implementation; build this release from `simgolf-reborn/scene`.

## Run

```sh
cd scene
npm ci
npm run dev
```

Open `http://127.0.0.1:4176/`. Place a tee and green, paint the fairway, then **Open hole** or press **H**. Golfers arrive in pairs and pay after finishing. After placing a green, paint with **Green** to extend it; **Move cup** relocates the flag and **Trim green** cuts back its edges. Use **Add hole** and the hole selector to expand the course. **Scorecards** shows per-hole results and completed rounds. The Staff tab hires groundskeepers and, after six completed holes, Turf Technicians who repair divots and crabgrass. Select an employee to rename, locate, reposition or dismiss them; Play starts Gary’s practice round from the selected hole; **Pro skills** allocates ten starting points before play. The club menu saves, exports and imports courses.

Choose **Inspect / pan** to drag the view. In construction mode, right-drag pans; two fingers pan/zoom on touch. Scroll/pinch zooms. Space pauses. Construction tools paint a square grid and reject overlaps with tees, greens, buildings and protected course features. Water and player-built bridges can be edited. The old art study remains at `http://127.0.0.1:4176/?mode=art` with its own review controls.

The server listens on the local network for phone review on the same Wi-Fi. Use the computer's LAN address and port 4176, not `127.0.0.1` on the phone. **A public remote URL has not been deployed.** Saves live in each browser; export/import transfers a course between devices.

## Validate and build

```sh
cd scene
npm test
npm run build
```

Tests use installed Google Chrome through Playwright. Source-fidelity tests additionally require the original game files under the repository-root `resources/` folder; those files are deliberately not distributed in GitHub or the release archive. The production output is `scene/dist/`, with relative asset URLs for ordinary static hosting. The gallery server on port 4175 from this folder opens that production build through `index.html`.

With the dev server running, `node scene/scripts/capture-playable.mjs` creates the review screenshots and example save by building through the real UI in an isolated browser. It does not alter the user's browser save.

Code, textures and geometry are newly authored in this subfolder. Packages and lockfile are independent of the parent project. No previous renderer, simulation or compiled original-game assets are imported.

Training facilities are available in Build: Pro Shop, Driving Range and Putting Green. Connect a path from the clubhouse to a side entrance. Eligible visitors train before play; Reports shows connections and the golfer panel shows completed training.

To share a playable layout, use **Club menu → Export course layout**. Another browser can open the JSON using **Practise an exported course**. Practice uses a fixed layout and separate save; **Return to my resort** returns to the existing resort. Files are shareable; the local practice URL is not a hosted sharing link.

**Reports → Course report** shows per-hole scores, fees, play time and observed score comparisons for the three visitor skills, including sample counts and expandable training groups. Original classifications and SGA accreditation are still pending.

**Build → Tree** adds editable trees that obstruct walking and can intercept airborne shots. Planted trees are included in shared layouts; full background-tree collision and original tuning remain pending.

Staff also hires **Soda Vendors**, who walk to thirsty visitors and stop with them briefly to serve a drink. The staff panel counts completed drinks; service and reservations survive reload.

A connected **Tennis Court** improves incoming visitors’ starting attitude. Its floor follows the manual’s yellow-baseline description; the numerical tuning and original unlock remain provisional.

Disconnected paths appear as muddy tracks. Joining them to the clubhouse finishes the whole connected branch and enables facilities reached by that network.

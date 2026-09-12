# Browser art test — 5 September 2026

## Scope

This is phase 2 of the fresh project: a real, inspectable scene based on approved concept B. It contains a country clubhouse, striped fairway, tee, green and bunkers, a brook and raised stone bridge, benches, trees, flower borders, dandelions, golfers and a groundskeeper.

The scene uses Three.js 0.180.0 with an orthographic camera, modeled architecture, instanced transparent leaf sprays, individually modeled flowers, terrain geometry, canvas-generated surface maps, shadow mapping and animated water. Architectural details are merged by material to reduce draw calls. No original compiled game assets, previous project code, remote asset service or generated background image supplies the rendered scene.

The approved concept remains an art target. This first implemented scene has simpler architecture, vegetation, character models and material detail. It must not be presented as a pixel match to B, or as a completed game.

## Review

- Start the scene using the [project README](../README.md).
- Drag to pan; scroll or pinch to zoom. Use the detail tabs for clubhouse, stream, dandelions and green.
- Tap an object to select it independently of the tabs.
- Compare concept opens the approved generated mockup. Return to live scene preserves the camera.
- Pause freezes the representative animations. Home returns to the overview. Hide interface provides an unobstructed scene.
- [Desktop overview](samples/browser-overview.png), [clubhouse detail](samples/browser-clubhouse.png), [dandelion detail](samples/browser-garden.png), [phone-sized browser](samples/browser-phone.png).

## Verification

`npm test` exercises five browser scenarios in Google Chrome:

1. Load and render without script, shader, console or asset-response errors; verify a populated geometry scene and bounded draw calls.
2. Drag/pan, zoom, focus and return home; verify the actual camera changes.
3. Pause/resume animation and compare the concept without losing the camera.
4. Pick a clubhouse feature through the rendered canvas.
5. Use a 390 × 844 mobile viewport, tap every detail tab, exercise a two-finger pinch through browser touch events, and return home without horizontal UI overflow.

The desktop preview was visually inspected at 1440 × 1000, including close views. During local Chrome runs, the scene measured approximately 56–60 fps. These are development observations on this computer, not a physical-phone benchmark or a guarantee for an 18-hole simulation.

`npm run build` creates a static production bundle. Vite reports an advisory for the roughly 545 kB JavaScript bundle before gzip (about 142 kB compressed). Asset and loading budgets remain to be established for the full game.

## Deliberate limits

- The golfer's shot is a looping animation, not golf physics or shot selection.
- The gardener's motion is an art demonstration. Weed growth, cleanup, golfer mood and maintenance persistence are not implemented here.
- The displayed course has no economy, construction tools, tournaments, saves or original-game simulation.
- Review tabs and comparison controls are art-test controls, not a claim of final original-interface parity.
- Mobile input was checked in browser emulation. A real phone and a public remote preview still need separate verification/setup.
- The next milestone starts only after the owner approves or revises this actual render.

## First review corrections

The owner’s first rendered-scene review was positive and requested connected bridge approaches, clean paths at the clubhouse and tee, and ball roll after landing. Both bridge approaches now use the bridge’s shared endpoints, with flush deck heights and clear entries. The clubhouse path meets the steps; tee access ends at the turf edge. Path strokes share a single outline/fill pass and vegetation respects the walking surface. The shot demonstration now includes two diminishing bounces, a decelerating ground roll and a visible resting ball. Two trajectory regressions supplement the five browser checks. This remains an art-test motion model rather than the full game's physics.

## Second review — original-game shapes

After comparing supplied construction and resort screenshots, fairways now use stepped, straight tile runs; tees and greens use softly rounded rectangles. Bunkers and water retain softer contours. The tee spur is removed entirely, with a grass buffer. Bridge approaches are straight and centred on the deck, using its clear width. The owner specifically prefers the original game's stylization over photorealism; this refinement governs future course rendering.

Additional checks cover the tee buffer, bridge alignment, tile-aligned contours and the actual painted terrain colors. Visual inspection also caught the grass-grain brush inheriting path width; the brush is now reset before the texture grain is painted.

**Owner extension to the style direction:** tile-based shapes apply to bunkers and water too. Bunkers use stepped rectangular footprints with modest corner rounding; water uses straight reaches and stepped bends. This supersedes the earlier exception allowing organic bunker and stream outlines.

**Paths follow the same style:** all walking routes use grid-aligned straight segments, right-angle turns and square ends. The main route steps around the playing surfaces; bridge approaches and the tee grass buffer are preserved. Animated walkers follow the revised route.

## Accepted render and first playable hole

After the tile-based path refinements, the owner said “Good. Continue”. The art study is preserved at `?mode=art`; its deliberate limits above describe that study. The default app is now the [first playable hole](../playable.md), with editable terrain and real visitor/groundskeeper state. The new terrain palette and grain follow the accepted study. Live paths are square tiles with continuous drag painting and connected bridge approaches.

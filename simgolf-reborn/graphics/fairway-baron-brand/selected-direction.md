# Fairway Baron — selected visual direction

The owner supplied `selected-owner-reference.jpg` and said “Like this” on 12 September 2026. This supersedes the pending choice among the ten earlier concepts as the direction for the splash and start screen.

## Visual requirements

- Illustrated isometric resort diorama with clear outlines, warm colours and playful small golfers.
- Bold gold FAIRWAY and green BARON lettering, dark outline and cream/gold edging; golf ball and club motifs.
- Rounded tile-derived fairways, dark green collars, bunkers, water, complete bridges and paths.
- A lively golf empire: clubhouse, hotel, pool, shops and recreation, readable at a glance.
- Emerald and gold ornamental frame, blue sky and inviting daylight.
- Tagline from the reference: “Build Your Golfing Empire!”

## Screen adaptation

Use the reference composition for the loading splash, with real loading status rendered as accessible interface text. Adapt the same identity for the start menu with readable real buttons and the required sign-in flow. Produce separate logo/background assets and phone layouts so controls are not baked into an image or cropped away.

This selection governs branding and opening-screen illustration. It does not by itself request replacing the playable renderer. The supplied picture is a visual reference, not evidence that its depicted facilities or animations are implemented. Production assets and screen implementation remain to do.

## Implementation checkpoint

The sign-in page now uses the separate generated logo and illustrated background with green/gold accessible controls. The browser title is Fairway Baron. Production build passed; headless Chrome layout checks at 1440×1000 and 390×844 verified loaded logo, provider controls and no horizontal overflow using mocked provider availability. This does not verify external OAuth or activate providers. Opening splash and authenticated start-menu integration remain unfinished; changes are local and not deployed. Exact asset prompts: `production-prompts.md`.

The loading splash is now integrated with account verification and the game module startup. It survives the live game's body replacement, disappears after initialization, and offers keyboard-focused retry after a failure. Startup error messages use textContent. Three browser checks passed (normal startup, failed startup/phone retry, existing new-game/save-backup flow), and the production build passed. A separate authenticated start menu remains to implement; these changes are not deployed.

The authenticated hosted home now opens the branded start menu before loading the simulation. Continue restores the account-local save; New Game opens the existing setup/backup flow; Multiplayer opens the account/lobby interface; Club & saves opens the existing club controls. Game deep links bypass this menu. Local development previews it via `?start=1`. Six startup/new-game browser checks passed and the build passed. A built-app browser check with mocked account responses verified Multiplayer reaches the account dialog and shared-course section. External OAuth and live hosting remain separate release gates.

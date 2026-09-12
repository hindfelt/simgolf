# Worlds and polish — 12 September 2026

## Playable changes

Tropical new games default to **Island resort**, a seeded starting island with smaller lagoon-side land and two larger outer landforms, rather than the repeated islands beside a mainland. Land purchases reveal the same terrain and palms as the preview. Island palms form dense, staggered groves with heavier shore planting and buildable clearings, following the owner’s request for lusher and denser planting. They are ordinary removable tree tiles. The starting clubhouse and path remain protected, while obsolete fixed scenery plots no longer leave artificial islets in the ocean. Low island banks retain the stepped game geometry. Links defaults to the existing coastal layout. Every landscape remains selectable independently of environment.

The ocean continues around island maps. Grass is hidden on water; future parcel trees render with future parcel terrain. These display changes never grant ownership. Older coastal saves retain their original terrain and coast generator. Protocol 86 migrates version 85; island tournament replay requires the new ruleset. Older coastal tournament compatibility is retained.

Regional architecture now includes the existing Tropical timber/thatch/veranda range, Links masonry hotels, and Desert adobe clubhouse, hotel, homes, snack bar, pro shop and cart garage. Entrances and building footprints are retained. The regional recreation types remain swim club, stable and spa respectively.

## Sound

Tropical daytime birds and Links/Desert grass wind join coastal surf, shot contact, putting, cup, helicopter and applause. Regional ambience has at most one loop alongside the shore loop, follows the saved ambience volume, stops on silence/hidden tab/disposal, and tropical birds stop at night. Effects volume remains separate.

New source recordings are credited in `scene/public/audio/credits.html`: dubminister's Tropical Birds (Freesound 214676) and the_very_Real_Horst's Juist reed wind (250815), both CC0. The public HQ previews were trimmed to seconds 10–42, high-pass filtered, reduced in volume, faded for one second at either end and re-encoded. These are regional atmosphere, not authentic Tonga location recordings. Final subjective listening remains an owner review item. Boat and aircraft engines now use credited CC0 recordings (XiiiSamples 382002 and clif_creates 251971), filtered and crossfaded into ten-second loops. At most one engine of each kind plays, following the camera and saved visit phases; parked, blocked or offscreen vehicles are silent. Engines share the four-voice effects limit. Spoken muttering and additional recreation sounds remain open.

## Visual review

Actual renderer captures are in `graphics/reviews/worlds-2026-09-12/`:

- `tropical-island.png`: new-game terrain with removable palms and outer island preview.
- `tropical-buildings.png`: clubhouse, hotel, snack bar and pro shop.
- `links-buildings.png`: corresponding Links architecture.
- `desert-buildings.png`: adobe and parapet roof treatment.

These are playable renderer captures, not new concept images. The owner selected lusher, denser planting; the island capture reflects that direction. This pass does not claim all original property/theme assets are complete or original-game visual parity.

## Verification

Island, generated landscape and purchase checks: 12 passed, including three seeds, preview/purchase equality, save round-trip and old coast migration. Final targeted suite: 46 passed, covering island saves/purchases, all ten decoded sounds, transport phases and mute, regional appearance, recreation, new-game startup and maintenance. Production build and git diff whitespace checks pass. An earlier broad live run returned 527 passed, five skipped and one maintenance UI failure while source edits triggered reloads; that maintenance test subsequently passed in the final targeted suite. The full broad run has not been repeated on this final revision. This work is local; it is not a hosted release confirmation.

## Terrain variation follow-up

New properties use terrain generator 2: hashed seeds vary coast width, headlands, bays, island count, island proportions and spacing; tropical island sizes and positions also vary. Inland river bends and relief vary more strongly. The clubhouse approach remains dry. New terrain samples up to 16 candidates, preferring at least 22% difference in water/land or substantial elevation; if none meets that threshold it uses the most different candidate. Classic Willow Brook remains the fixed study layout.

Generator revision is stored in saves; absent revision retains the previous coastal continuation and purchase geometry. Protocol 87 identifies the new generation rules. Visual comparisons are saved as coast-seed-11.png and coast-seed-999.png in the review directory.

Verification: 20 targeted tests passed (terrain variation, save migration, preview/purchase agreement, playable generated holes and new-game UI). Production build passed.

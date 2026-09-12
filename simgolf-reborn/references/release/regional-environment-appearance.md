# Distinct Tropical and Links environments

Both the isolated new-game preview and playable course now use regional
clubhouse geometry and natural/planted vegetation. Tropical replaces broadleaf
and coastal conifer crowns with feathered palm fronds, adds a timber pavilion
with pale pitched roofs, and uses turquoise water and pale water-edge collars.
Links uses open ochre grass, low scrub/gorse, taller dry grass blades and a
stone/slate clubhouse. Parklands retains its existing clubhouse and broadleaf
canopies. Landscape and seed still determine the terrain layout; selecting
Coast adds coastal landforms independently of the environment.

Scenery identities and removal/elevation keys are retained. Links collision
sizes follow its reduced visible shrubs. Protocol 84 preserves importable old
course layouts but rejects older Links tournament replays whose collision
behavior would change. Other existing environment compatibility gates remain.

Sixteen focused browser/simulation checks passed, covering rendered preview
changes and camera controls, environment creation/export, phone Tropical
selection, regional planted trees, collision dimensions and replay boundaries.
Production build passed. Actual Tropical and Links screenshots were visually
inspected. This does not complete all regional resort architecture or the full
approved Tonga island composition. Local implementation; not deployed or pushed.

## Palm collision follow-through

Protocol 85 aligns Tropical collision volumes with the shallow visible palm
crown and bare trunk, instead of retaining the broadleaf canopy. Low offset
shots can pass below fronds, crown-height shots collide, high shots clear the
palm and the trunk continues blocking ground rolls. Previous Tropical course
layouts remain importable, while old tournament replay is rejected explicitly;
version-84 saves migrate without resetting time. Links version-84 replay remains
compatible.

Twelve focused checks pass, including actual-renderer palm selection, raised
terrain movement and removal, regional collision cases, preview differences,
old replay boundaries and protocol migration. The production build passes.
This is local work, with no deployment or push.

## Tropical coast and hotel

Offshore and course water now share the Tropical turquoise palette directly,
including unowned coast continuation. Switching the environment rebuilds the
water texture and bank colors without changing simulation data. Tropical banks
use warm coral tones; other environments retain the previous slate palette.

The Tropical hotel is a lower two-storey timber lodge with an upper wraparound
veranda, pale roof and no chimney. It keeps the existing footprint, cardinal
entrances and hotel operation rules. Other environments retain their hotel.

Actual coast and lodge renders were inspected. Four environment/palette/lodge
checks and twelve existing coastline/hotel regressions passed, along with the
production build. The palette check covers environment switching with the same
revision and verifies simulation data stays intact. This remains local work;
full regional building coverage and broader island composition are still open.

## False shoreline at map edge removed

The water contour previously extended beyond the east canvas edge only. Its
north/south edges therefore drew a sand or grass collar across continuous sea.
The contour now includes the seeded exterior water rows as well, retaining
actual island shores while moving the artificial contour outside the canvas.
This is presentation-only and does not add water or land to saved courses.

Four targeted tests pass, including three seeds with no horizontal contour
through continuous sea, input isolation, preview/purchase agreement and the
Tropical coast render. The updated render was inspected: the straight pale line
across the top bay is removed. Production build passed. No push or deployment.

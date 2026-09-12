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

# Coastal scenery collision visibility — 2026-09-12

Coastal scenery rendering, scenery tile lookup and shot/roll collision now use
one visibility predicate. Owned tiles use their current water/removal edits.
Unpurchased parcels use the same seeded coast and blocked-cell exceptions as
land purchase. Off-map scenery uses the seeded coast without indexing tile keys
outside the map. The preview and live simulation therefore agree before purchase.
Draining an owned tile restores an uncleared tree; clearing it remains persistent.

Ruleset 83 migrates ordinary saved games. Older coastal tournament records are
preserved but explicitly rejected for replay under changed tree physics; their
course layouts remain importable. Desert replay still requires ruleset 82 or
newer. Existing non-coastal replay compatibility is retained, including its old
off-map removal-key behavior; removing that remaining alias requires a separate
physics compatibility change.

Validation: 30 Playwright checks passed across coastal-tree-collisions,
regional-tree-collisions, competition-save, scenery-trees, coastal-banks and
session. This includes a Chrome instance-matrix check that flooding hides the
actual rendered tree and draining restores its scale. Production build passed
with the existing large-bundle advisory. No production deployment performed.

This closes a visible-versus-collidable coastal scenery mismatch, not the wider
original-game physics fidelity or regional-art work.

# Sid Meier design notes — source follow-up

Source: [Backswing: SimGolf In Depth](https://jztemple.tripod.com/backswing/sgid.htm), sections attributed to Sid Meier. Retrieved through the search index; direct page fetch returned 502. Attribution is preserved by a fan archive, not independently authenticated.

- Imagination enables shaped shots; unskilled golfers hit straight.
- Membership depends on great shots and finishing attitude.
- Twelve initial visitors are followed by invitations on membership joins/upgrades.
- Happiness changes with comments and determines per-hole fees at $100 per point.
- Elevation changes are free.

These findings require further corrections to the prototype's economy/population. Do not map its current 0–100 mood directly to original happiness points. Exact membership thresholds remain unknown.

Implemented this pass: shared bounded shot planner for imaginative visitors, with tests exercising live visitor updates and deterministic restore. Other listed corrections remain backlog work.

Elevation-cost follow-through: removed the provisional charge. Targeted tests cover zero/debt balance, brush edits, untouched ledger, protected water and command retry/restore. Historical charges in old saves are retained; no retroactive financial mutation is applied.

Fee follow-through: the current build charges the stated happiness unit and stores the completion snapshot for reconciliation. Reaction coverage, initial values and the retained legacy mood model remain provisional. New charges do not rewrite old fees.

Arrival follow-through (2026-09-06): the archived “Speeding up and slowing down play” section attributes arrival pace to the first hole, normally releasing another pair after both earlier golfers hit their second shots. Admissions now check physical shots, so penalties cannot release them; a completed first hole also releases its golfer. Pre-tee services hold the gate. A one-second retry delay and 12-live-visitor ceiling are implementation limits, not measured original constants. The twelve-person initial roster and membership-driven invitations are still missing.

Dandelion follow-through: the archived landmark notes distinguish normal spreading from patches caused by negative comments. Distinct visitor complaints now have a provisional 25% chance to place a nearby patch, sampled within three tiles on eligible rough/fairway/firm turf. Duplicate incidents do not reroll; the complaining golfer marks its generated patch seen to avoid immediate self-recursion. Existing separate weed RNG, facility exclusions, population bound and groundskeeper cleanup remain in use. Original probability/radius, Gary’s comments and landmark suppression still need verification/implementation.

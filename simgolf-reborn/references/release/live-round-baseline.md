# Live round baseline — 2026-09-12

The current browser simulation passes a complete two-hole visitor round with a save taken during an airborne shot. The uninterrupted and restored simulations produce identical serialized state at round completion. The completed scorecard contains each booked hole once, and its stroke total equals the sum of its holes. A 390×844 browser loads the save and displays both hole scores and fees correctly.

Evidence: `scene/tests/live-round-release.spec.js` (one passing end-to-end test). Sixteen related live tests also pass: interrupted rounds, happiness/fees, Airstrip fees, pairing and phone happiness summaries.

This is a baseline of the current playable rules, not proof of original-game fidelity, long-session stability, production hosting capacity or deployed multiplayer. The packed original completion implementation is not called by live `game.js`. Live happiness initialization and incident deduplication remain provisional. Replacing those requires authoritative actor/profile/hole field mapping, versioned saves and competitive replay handling. The original completion branches after 0x426f30 and caller eligibility remain incomplete.

Next integration gate: run this same end-to-end test against the versioned live rules replacement, plus authenticated shared-course completion and historical save/replay tests. Do not report the reconstructed helpers as a live gameplay change before that connection exists.

## Ruleset 79 integration update

Live happiness now uses the recovered signed −10…10 bounds. A negative-happiness completion posts its signed fee exactly once; global/hole totals and mid-shot restored state reconcile. Historical fee snapshots remain unchanged under their original validation rules. Version-78 golf-only replays migrate; old live happiness above 10 is capped. Initial happiness and reaction selection/deduplication are still provisional, so this is a bounded rule correction rather than full happiness fidelity.

The original two-hole phone/restore baseline passes under ruleset 79. Eighteen selected live/competition/session tests, four signed-payment tests and fourteen compatibility/interruption/pairing tests pass (overlapping suites). The build passes. All 75 backend tests pass, with the capacity test skipped; an additional signed-fee qualification regression checks that later negative fees do not erase an earlier paid visit. Authenticated browser multiplayer integration and long-session checks must be rerun for this ruleset before release. Not deployed.

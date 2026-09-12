# Live round baseline — 2026-09-12

The current browser simulation passes a complete two-hole visitor round with a save taken during an airborne shot. The uninterrupted and restored simulations produce identical serialized state at round completion. The completed scorecard contains each booked hole once, and its stroke total equals the sum of its holes. A 390×844 browser loads the save and displays both hole scores and fees correctly.

Evidence: `scene/tests/live-round-release.spec.js` (one passing end-to-end test). Sixteen related live tests also pass: interrupted rounds, happiness/fees, Airstrip fees, pairing and phone happiness summaries.

This is a baseline of the current playable rules, not proof of original-game fidelity, long-session stability, production hosting capacity or deployed multiplayer. The packed original completion implementation is not called by live `game.js`. Live happiness initialization and incident deduplication remain provisional. Replacing those requires authoritative actor/profile/hole field mapping, versioned saves and competitive replay handling. The original completion branches after 0x426f30 and caller eligibility remain incomplete.

Next integration gate: run this same end-to-end test against the versioned live rules replacement, plus authenticated shared-course completion and historical save/replay tests. Do not report the reconstructed helpers as a live gameplay change before that connection exists.

# Ruleset 79 local multiplayer verification

On 2026-09-12, the fresh build and all eight authenticated Chrome/local Worker/D1 integration tests passed in 1.4 minutes with the signed-happiness gameplay rules.

Verified:
- Two accounts share course edits, reconnect and enforce spectator permissions.
- Shared-course and tournament registration controls work on a phone.
- A different player practises an immutable published course.
- Tournament registration, roster and registration closure behave correctly.
- Two players complete two tournament rounds, resume after reload and receive matching server standings (52.6 seconds).
- Withdrawal survives reload without preventing the other player from continuing.
- Final standings persist and inappropriate cancellation controls disappear.
- Earnings entrants receive equal starting land/cash and spend independently.

Command: `npm --prefix simgolf-reborn/scene run test:shared-integration`.

The tests use seeded authenticated accounts and real local server/storage paths; they do not verify an external OAuth provider. No production deployment occurred. This suite does not run the ten-minute earnings competition to completion, establish hosting capacity, or prove full original-game fidelity. Signed fees have separate real visitor round/save and server earnings qualification coverage. A new full earnings soak and production capacity verification remain release requirements.

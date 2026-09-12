# Ruleset 78 local integration verification

The local Worker, D1 and browser integration suite passed all eight tests after the Airstrip fee correction:

- Two authenticated browsers share edits, reconnect and enforce spectator access.
- Shared-course lobby works on a phone.
- Another player can practise an immutable published course.
- Registration is once per account; roster and close-registration controls work on a phone.
- Two entrants finish a tournament, resume shots and receive server standings.
- Withdrawal survives reload without blocking the remaining entrant.
- Finished standings remain visible and cancellation controls disappear.
- Earnings entrants start equal private courses and spend independently.

Command: `npm --prefix simgolf-reborn/scene run test:shared-integration`.
Result: 8 passed in 1.4 minutes. Includes a fresh production build and local infrastructure preparation.

Scope: these tests exercise ruleset 78 integration, but do not specifically construct an Airstrip inside a shared course. The Airstrip amount itself has separate real-round/browser and save/replay tests. This run does not repeat the full ten-minute earnings soak, prove hosting capacity, activate sign-in providers or deploy multiplayer infrastructure to production.

## Authoritative Airstrip payment follow-up

Added a D1-backed shared-course regression that seeds a server-owned playable course with a connected Airstrip, then advances it exclusively through `getSharedCourse` and the production server clock/session path until a visitor completes a round. It verifies the explicit flat-fee rule, $100 bonus, actual recorded fee, unchanged cash/state when owner and editor reload concurrently at the same server time, and scorecard restoration. No client-submitted completion or fee is used.

The backend suite now passes 75 tests, with one capacity test skipped. This closes the authoritative-host payment coverage gap noted above; browser-driven shared Airstrip construction and production deployment are still separate checks. The isolated original happiness/fee pipeline remains only partially integrated into live gameplay.

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

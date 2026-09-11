# Shared construction host — 11 September 2026

Implemented locally, not yet deployed or exposed in the game UI. This is the persistent construction portion of A05/M01, not completion of multiplayer or of the original-game recreation.

The account Worker now has authenticated shared-course endpoints. Creating a course accepts only its name; the server generates its seed, initial budget and game state. No imported save, submitted money balance, score or golfer package can become authoritative shared state. The original local game remains separate.

- `GET /api/courses`: list courses owned by or shared with the signed-in player.
- `POST /api/courses`: create a course from `{name}` under the signed-in owner.
- `GET /api/courses/:id`: read a permitted snapshot.
- `PUT /api/courses/:id/members`: owner grants editor/spectator access to an existing player UUID; `role:null` removes access.
- `POST /api/courses/:id/commands`: submit a versioned construction command to the existing simulation command host.

All mutations retain account-session, Origin and CSRF checks. The session supplies the actor identity; owner/member records supply course permissions. Administratively suspended accounts cannot access courses. Account deletion also removes owned courses and memberships.

The outer snapshot `revision` is the D1 storage revision. The command envelope’s `expectedRevision` is the simulation’s `state.protocol.revision`. Keep these separate: membership changes increment the storage revision without pretending a construction command occurred. A D1 compare-and-swap retry reloads both state and current permissions. Membership changes are committed with a storage revision increment so an edit cannot commit against superseded membership.

Persisted command receipts enforce sequence ordering and replay the last result without repeating its economic effect. A stale simultaneous edit receives a conflict; the client must resynchronize before issuing its next sequence. The host never interprets client-supplied tick, balance, score or replacement-state commands.

Server-time advancement is implemented in migration `0003_shared_clock.sql`. Reads and commands calculate elapsed 50 ms ticks from a persisted server-clock cursor, advancing at most 120 ticks per request. Fractional ticks remain in the cursor. Compare-and-swap prevents concurrent readers or command requests from advancing time twice. A backward clock does not reverse simulation time. All unprocessed downtime remains pending; commands return `catching-up` without consuming their sequence until the host reaches the present. Clients must retry that same command after catch-up. Membership changes cannot reset the clock. Snapshots expose `pendingTicks` for honest catch-up feedback. This is not yet a background scheduler: long absences would require too many reads, so deployment remains gated on lifecycle scheduling.

Verification uses actual Workerd/D1 with the real simulation: simultaneous purchases, reconnect/retry, owner/editor/spectator permissions, revoked memberships, suspended accounts, forged actors, rejected imports, route-level CSRF and identity, and account deletion cleanup. These tests do not substitute for two real browsers editing a hosted course.

Next required work:

1. Add background lifecycle scheduling to the tested server-clock advancement. Long downtime must drain without requiring repeated user requests; measure runtime/resource limits on populated courses.
2. Browser shared-course lobby, member management and renderer/input adapter. Shared mode must not run a second authoritative local simulation.
3. Snapshot updates, reconnect, conflict feedback and spectator controls; verify from two independently authenticated browsers.
4. Apply `0002_shared_courses.sql` and `0003_shared_clock.sql` and deploy only with the above integration and resource-limit checks.
5. Build server-validated earnings competitions and independent tournament round hosts on immutable course revisions. The shared construction service is not a trusted tournament scoring host.

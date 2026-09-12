# Multiplayer scheduling, awards and invitations

## Behaviour

Tournament organizers may choose a start in their local timezone, from one minute to 90 days ahead, or retain manual registration closure. The server stores UTC milliseconds. Scheduled events close registration automatically; their playing deadline is measured from the advertised start even when delivery is late. At least two active entrants and an active organizer are required; otherwise the event is cancelled. Early manual starts and late new entries reject.

A dedicated TournamentScheduler Durable Object persists the next start/deadline alarm. It writes a retry alarm before database work. Atomic D1 transitions and existing immutable result sealing tolerate repeat delivery. Event reads also reconcile due transitions. The database migration adds starts_at and an index; the Worker migration adds the scheduler binding. No cron trigger is required: the review account's available cron quota was exhausted, so the implementation uses alarms.

Gold, Silver and Bronze medals derive from server-sealed tournament placements. Equal totals share the same placing and medal. Withdrawn entrants and missed deadlines receive none. Account medals are read-only, repeatable and cannot be claimed or paid twice. These are recognition awards, not invented resort-cash payouts. The trophy list currently shows the most recent 100 medals.

Invitation links survive the existing authentication destination flow, open the selected event and require an explicit Join. Copying a link does not send a message. The calendar download contains UTC start/deadline, escaped title and the invitation URL. Tournaments remain discoverable to registered players; invitations do not make an event private.

## Verification and deployment

The separate review Worker is https://fairway-baron-multiplayer-review.hindfelt.workers.dev, backed by its own fairway-baron-multiplayer-review D1 database. Production simgolfer.0x4d.in and its player database were not changed. Review sessions are temporary synthetic accounts; this is not an external identity-provider acceptance test.

Local checks: 81 backend/calendar tests passed (one optional capacity test skipped), then 12 tournament tests passed including the added persistent-alarm start/deadline test. All eight real Worker/D1 browser integration scenarios passed: shared editing, reconnect, spectator controls, phone layout, publication practice, tournament invitations, full rounds/results, withdrawal, and independent earnings competitors. Production build passed.

The hosted harness is scene/server/verify-hosted-multiplayer.mjs. It reads private fixture credentials from the ignored .wrangler/hosted-review directory; credentials and raw fixture SQL must never be committed. It exercises independent desktop and phone-sized Chrome contexts on the remote service. Physical phones, Safari, external provider sign-in and larger hosted capacity remain separate acceptance checks. Hosted results are recorded alongside this report after completion.

Hosted pass completed at 20:11 UTC: both accounts played a complete round, reloaded after a shot and finished with five strokes. Both tied first and received stable Gold medals across repeated reads. Invitation acceptance/calendar download passed on the phone viewport; no browser errors. See multiplayer-hosted-2026-09-12.json. The one-hour playing-window label found in visual review was corrected to show hours instead of fractional days.

The reproducible review deployment configuration is scene/wrangler.review.jsonc. Apply migrations with `wrangler d1 migrations apply fairway-baron-multiplayer-review --remote --config wrangler.review.jsonc`, then build and deploy using that same configuration. It intentionally has no production custom-domain route. Do not substitute the production config for review fixtures.

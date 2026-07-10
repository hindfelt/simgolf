# TODO — Fairway Mogul

Everything shipped so far is in `featurelist.md`. This file is remaining work only.

## Confirmed manual gaps

- [ ] **World Screen property market** (manual p.7) — the original offers sixteen worldwide properties with different location, size and cost, shows affordable/unaffordable/already-purchased pins, and permanently leaves the current course after a purchase. The clone has four terrain themes and buyable expansion parcels, but only one new-course property footprint/generation profile.
- [ ] **Complete keyboard/report hotkey parity** (manual p.3–4) — core pan/pause/rotate shortcuts exist, but the F1–F10 report map, terrain shortcuts and open-hole/name toggles are not complete.

Theme Packs are implemented as modular player/story/celebrity/pro/course bundles with per-section Standard fallback. Further fidelity gaps should be added here only after verifying them against the manual or original behavior.

## Online play and long-term progression

The owner has explicitly authorized building these systems. Production deployment still requires credential, domain and Cloudflare account decisions before touching live infrastructure.

- [ ] **Account polish.** Google OIDC, hashed sessions, session listing/revocation, privacy-preserving account deletion and local↔cloud scorecard migration are implemented. Device labels, downloadable account-data export and re-authentication before destructive actions remain.
- [ ] **Finish cloud publishing.** Conflict-safe versioned cloud slots, validated course publication and public/unlisted visibility are implemented; private sharing, thumbnails, course-version history and restore UI remain.
- [ ] **Expand multiplayer beyond asynchronous matches.** Discoverable profiles, follows, direct one-card challenges, acceptance/expiry/cancellation, isolated course play, provisional result submission and hole-by-hole comparison are implemented. Invite URLs, friends-only course visibility, notifications, match chat and real-time synchronized golfers remain.
- [ ] **Expand daily and weekly competitions.** Deterministic UTC rotations, entry windows, validation, global/friends tie-breaker boards, completed-event archives, quarterly season standings and idempotent point awards are implemented. Past-season UI, in-game unlocks driven by points and server-side shot replay remain.
- [ ] **Expand online tournaments.** A scheduled one-card Club Championship has a qualification-cut/prize ruleset, database-enforced one-attempt entry, global/friends boards, isolated play, history and finalized season-point prizes. Multi-stage qualification rounds and bracketed finals remain.
- [ ] **Production operations.** The repository now has a custom-domain/static-assets Worker configuration, real D1 binding, migrations, cron definitions, tests and observability. Confirm remote migration/deployment state before changes; R2 thumbnails, backups, edge abuse rate limits and alerting remain.

## Notes for whoever picks this up

- No ripped assets, ever — `resources/` is reference-only (see `handover.md` hard rules).
- Run `npm run typecheck && npm run typecheck:api && npm run test && npm run test:api` after every online-layer change; all must stay clean.
- Verify UI changes live (dev server + Playwright screenshot), not just by reading the diff — several past bugs were visual-only.

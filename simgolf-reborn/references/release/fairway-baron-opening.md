# Fairway Baron opening-flow checkpoint

12 September 2026. Owner-selected illustrated brand reference applied to sign-in, loading and start-menu assets. Hosted home requires the existing account check before presenting the menu. Explicit game deep links retain direct entry. Storage and account identifiers remain unchanged.

Validation:
- Production build passed.
- Six startup/new-game browser checks passed, including failed startup and retry, fresh-course creation, saved-course continuation, phone layout and backup preservation.
- Eight account browser checks passed (mocked provider/backend responses; not external provider activation).
- Eight authenticated integration checks against local Worker/D1 passed in 1.4 minutes: cooperative editing, reconnect, spectators, phone lobby, published practice, registration, completed two-player tournament with resumed shots/final standings, explicit withdrawal, persistent results and separate earnings courses.

The first integration run found two obsolete test navigation assumptions about returning/reloading the home page. Tests now use the real Multiplayer start-menu button. The complete rerun passed. Log: `/tmp/fairway-baron-shared-integration-final.log`.

No deployment or provider activation is claimed. Original-game fidelity, career, full visual implementation and hosting/provider release gates remain open in the backlog.

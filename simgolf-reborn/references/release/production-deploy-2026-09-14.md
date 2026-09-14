# Production deployment — 2026-09-14

- Game source: `51e1eb7e184d578f6abaac848f3ce84fa85dcc9a`, pushed to `codex/simgolf-reborn-v1`.
- Production: https://simgolfer.0x4d.in/
- Worker: `simgolfer`.
- Cloudflare version: `568499c6-9e31-4d8b-bf32-586e3aae60a2`.
- Complete CI: https://github.com/hindfelt/simgolf/actions/runs/34778700640 — all six jobs passed.
- CI counts: 573 live checks, 82 account unit checks, 13 account browser checks and eight shared-course integration scenarios passed. Five private-reference checks and one optional capacity test were skipped by configuration.
- Production build and Wrangler dry run passed. No pending D1 migrations.
- Deployment preserved configured remote variables. Six changed assets uploaded, 41 already present.
- All 25 deployed JavaScript/CSS assets matched the local production build byte for byte.
- Headless Chrome loaded the sign-in page without JavaScript errors; unauthenticated game requests redirected to login and the account API returned 401.
- Google remains the enabled sign-in provider.

The release includes the software-rendering fallback and shared simulation tick refactoring. The development-only manual clock is excluded from the production build. CI uses Mesa, isolated browser processes for multiplayer devices, and explicit scene-readiness waits.

Authenticated production play, physical-device acceptance and prolonged hosted sessions remain separate checks. Unrelated root application edits and generated screenshots were not included. This documentation-only follow-up records the already tested and deployed game revision.

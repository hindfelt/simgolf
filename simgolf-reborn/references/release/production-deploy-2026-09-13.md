# Production deployment — 2026-09-13

- Game commit: `c9ad46e` on `codex/simgolf-reborn-v1`.
- Production: https://simgolfer.0x4d.in/
- Worker: `simgolfer`.
- Cloudflare version: `e6a699e2-49b9-4a3d-9486-48928624dd61`.
- Build and Wrangler deployment dry run passed before publication.
- D1 Time Travel bookmark captured before applying additive migrations 0004–0011.
  All applied successfully; the subsequent remote migration list was empty.
- Wrangler uploaded 41 assets and deployed the Worker with its three Durable Object bindings.
- Headless Chrome loaded the production sign-in page without JavaScript errors.
  Unauthenticated game navigation correctly redirected to `/login`.
- Every deployed JavaScript/CSS asset (25 files) matched local `dist/assets` bytes.
- Production currently advertises Google sign-in only.

## Local regression

The full live run reported all 559 individual test cases passing. Its worker
remained alive after the final case and the runner did not print a completion
summary; it was interrupted during shutdown. This is not a clean process-exit
pass. Investigate worker teardown before claiming full CI completion. Build,
deployment dry run and production smoke checks completed successfully.

## Repository publication

The game is committed locally. Push was rejected twice: the active
`trihack_admin` account lacks repository access, and the `hindfelt` OAuth token
lacks `workflow` scope needed to publish the committed CI changes. Authorization
refresh has been requested. Remote CI has not run for this revision. The older
root application's main-only deployment workflow was not dispatched.

## Limits

This verifies deployment, schema application and unauthenticated loading, not
full authenticated production play, provider activation, physical-device
performance or production multiplayer acceptance. Unrelated root application
edits and generated visual-test images were not included in the release.

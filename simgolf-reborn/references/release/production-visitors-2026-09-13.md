# Live gameplay production deployment — 13 September 2026

- Game commit: `e856c65` on `codex/simgolf-reborn-v1`.
- Production: https://simgolfer.0x4d.in/
- Cloudflare version: `d6c3f467-fd48-40ad-9368-ceb889196246`.
- Fresh production build and Wrangler dry run passed.
- Remote D1 migration check passed on retry: no migrations to apply.
- Worker deployed with existing variables preserved and all three Durable Object bindings.
- All 25 JavaScript/CSS assets match local release bytes.
- Headless Google Chrome reached the production login page with no page errors.
  Unauthenticated navigation correctly redirects to `/login`.
- Existing saves retain their previous rules; fresh games enable protocol-91 visitor behavior.

GitHub publication remains blocked. An explicit GitHub CLI credential helper
selected `hindfelt` correctly, but the push was rejected because the OAuth token
lacks `workflow` scope for `.github/workflows/ci.yml`. The original active account
was restored. Remote CI has not run for this commit. No workflow was removed or
rewritten to bypass this restriction.

This check verifies deployed assets and unauthenticated loading. It does not
claim authenticated production multiplayer or physical-device acceptance.

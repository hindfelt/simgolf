# Clubhouse Online setup

The browser game remains fully playable offline. The optional online service is a standalone Cloudflare Worker with D1 storage and Google OpenID Connect. `wrangler.jsonc` is currently configured for a custom domain, same-origin static assets and a real D1 binding; that source configuration alone does not prove which Worker version or migrations are live.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars` and fill in a Google OAuth web client ID/secret plus a long random session secret. `.dev.vars` is ignored by Git.
2. In Google Cloud Console, add this exact authorized redirect URI:

   `http://localhost:8787/api/auth/google/callback`

3. Initialize local D1 and run both processes:

```bash
npm install
npm run db:migrate:local
npm run dev:api
# second terminal
npm run dev
```

Vite proxies `/api` to the Worker during development. `npm run dev:api` explicitly overrides the production origin/return URL with localhost values, so credentialed local writes still pass Origin and CSRF checks.

## Verification

```bash
npm run typecheck
npm run typecheck:api
npm test
npm run test:api
npm run build
npm run build:api
npm run cf:types -- --check
```

The API integration suite runs inside the current Cloudflare Workers runtime and applies the real D1 migrations to isolated local storage.

## Production checklist

The repository already contains a production hostname and D1 binding. Before any remote mutation, confirm the selected Cloudflare profile, inspect applied migrations and compare the live Worker version; do not create a replacement database or domain blindly.

1. Confirm the existing `fairway-mogul-db` binding is the intended production database and back it up before applying new migrations.
2. Confirm `APP_ORIGIN`, `APP_RETURN_URL`, the custom domain and static-assets directory still match the intended deployment.
3. Configure the production Google OAuth web client with the exact Worker callback URL: `https://<worker-host>/api/auth/google/callback`.
4. Set secrets interactively; never put values on a command line or in Git:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

5. Apply D1 migrations remotely, dry-run the bundle, then deploy the Worker:

```bash
npx wrangler d1 migrations apply fairway-mogul-db --remote
npm run build:api
npx wrangler deploy
```

6. Put the browser and API on the same site (for example `game.example.com` and `api.example.com`, or proxy `/api` on the game origin). Build the browser with `VITE_API_ORIGIN=https://api.example.com` when using a sibling API origin. Do not pair a GitHub Pages hostname with an unrelated `workers.dev` hostname: modern third-party-cookie controls make that session design unreliable.
7. Confirm sign-in/out, session revocation, account deletion in a test account, scorecard sync, CSRF rejection, cloud revision conflicts, publication, player discovery/follows, challenge completion, event entry, global/friends boards, cron finalization and season standings on the deployed origin.
8. Add rate limiting/abuse controls, D1 backup procedures and alerting before advertising public competitions.

## Security model and current limits

- Google scopes are identity-only: `openid email profile`. The app never requests Gmail access.
- OAuth state is signed and short-lived; nonce and PKCE bind the callback. Google ID tokens are verified for signature, issuer, audience, expiry and nonce. Google access/refresh tokens are discarded.
- Session bearer tokens are random and only their SHA-256 hashes are stored. HTTPS uses Secure `__Host-` cookies. Writes require an exact allowed Origin and a matching CSRF cookie/header whose hash is stored with the session.
- JSON bodies and stored snapshots are bounded. Published layouts are fingerprinted independently by the Worker.
- Competition and challenge results are structurally validated but marked `provisional`. Authoritative deterministic shot replay, edge rate limits and friends-only course visibility are not implemented yet. Season points are awarded, but do not yet unlock local-game rewards.

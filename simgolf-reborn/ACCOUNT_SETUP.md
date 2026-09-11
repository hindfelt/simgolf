# Player accounts

SimGolfer requires a server-verified session before serving the hosted game, including `?testing=1`. A player's first successful sign-in creates their account. Local courses are namespaced by player ID; cloud saves belong to the authenticated player and use revisions to reject stale overwrites. Playtesting uses a separate cloud slot as well as separate local storage. Account → Import this browser’s old course copies a pre-account save without deleting the original.

## Providers

Only configured providers appear on the sign-in screen. Supported adapters and exact production callbacks:

| Provider | Callback | Server secrets |
| --- | --- | --- |
| Google | `https://simgolfer.0x4d.in/api/auth/google/callback` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub | `https://simgolfer.0x4d.in/api/auth/github/callback` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Microsoft | `https://simgolfer.0x4d.in/api/auth/microsoft/callback` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |
| Apple | `https://simgolfer.0x4d.in/api/auth/apple/callback` | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` |

Google uses a dedicated SimGolfer web client in project `simgolfer`; its credentials are stored in Worker secrets. GitHub OAuth app `3852522`, owned by `hindfelt`, is registered but its secret requires owner verification. Apple needs an enabled Services ID and Sign in with Apple private key. Microsoft needs an application registration supporting the intended personal/work/school account audience. Those adapters being implemented does not mean their provider configuration is complete.

Proton Mail works through an eight-digit email code, as do other permanent email providers. No unverified Proton OAuth service is advertised. Email codes expire after ten minutes, are bound to the requesting browser, allow five attempts and can be consumed once. Production email sending requires a verified Cloudflare sending domain, an `EMAIL` sending binding and `EMAIL_FROM`. The current Cloudflare account returned Unauthorized (2036) for email-sending setup; email sign-in remains disabled until that is resolved and delivery is tested.

Use `wrangler secret put NAME` from `scene/` for credentials. Never put secrets in source control, client JavaScript, issue descriptions or logs. Link additional providers from Account while signed in. Matching email addresses never merge separate provider accounts automatically. Provider identity IDs, not editable email metadata, establish ownership.

## Database and administration

The dedicated D1 database is `simgolfer-accounts` (`c75a5302-f11d-4786-9221-1debc7991753`). It is separate from the legacy game database. Migration `scene/server/migrations/0001_accounts.sql` creates players, identities, hashed sessions, one-use sign-in transactions, email challenges, rate limits, private saves and administration audit records.

From `scene/`, apply migrations with:

```sh
../../node_modules/.bin/wrangler d1 migrations apply simgolfer-accounts --remote
```

After the owner signs in, a trusted database operator must verify the owner's stable player UUID and provider identity before assigning `role='admin'` to that UUID. Do not bootstrap administrators from an email claim or expose role changes as a public endpoint. Administrators can search players, suspend/restore accounts and revoke sessions from Account. Every action is checked server-side and audited. Suspension immediately prevents server access and revokes sessions. The UI will not suspend or revoke its own administrator account.

Sessions last 30 days and use Secure, HttpOnly, host-only cookies. Mutations require the exact origin and a session-bound CSRF token. A changed signed-in account is rejected for requests from an older tab. Expired sessions and sign-in records are cleaned on account activity, at most once daily under a D1 lease. Expiration is checked on every use, even before cleanup runs. This avoids consuming a cron slot; the account currently has all five free cron slots in use. Deleting an account removes its identities, sessions and cloud saves; opaque administration audit records remain.

## Disposable email policy

Registration and federated sign-in reject known disposable domains, including subdomains, case variants and trailing dots. Ordinary Proton, Gmail, Outlook and Apple private-relay addresses remain allowed. This reduces abuse; it does not prove one person per account. Multiplayer money, commands and tournament results still need server validation.

`scene/server/disposable-domains.js` contains 8,771 domains pinned from [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains), revision `dd6fc0d6fb4265b2d058b075ccc6f1916c5f2531`, under CC0 1.0. Update from a reviewed pinned revision, retain provenance, and rerun the permanent-provider and disposable-domain tests. The maintained list is supplemented by explicit temporary-mail aliases in `email-policy.js`.

## Development and verification

Copy `scene/.dev.vars.example` to `scene/.dev.vars` for local secrets; the latter is ignored. Run `npm run dev:accounts` alongside Vite with `VITE_AUTH_REQUIRED=true` to exercise accounts locally. Default Vite development bypasses authentication for the existing simulation test suite; production builds always require it. Provider callbacks must match the chosen local or hosted origin; use a dedicated development client rather than changing the production callback.

From `scene/`:

```sh
npm run test:accounts
npm run test:account-browser
npm test
npm run build
```

Verified on 11 September 2026: 15 Worker/D1 account tests, five account browser tests and all 952 game regression tests passed. Provider tests use mocked upstream responses and real signed JWT verification. They do not replace a real hosted provider sign-in test. The phone sign-in layout was visually checked.

Account-owned cloud saves are storage, not trusted competitive scores. Cooperative editing, server-authoritative competition and tournaments on other players' courses remain in [the multiplayer backlog](backlog.md).

Shared-building preview: Account → Shared courses lists separately stored cooperative resorts. Owners grant editor/spectator access to existing player IDs; the server supplies ownership, starting funds, simulation time and command validation. Shared resorts continue running when browsers close. Creating or entering one does not replace the player's local resort or ordinary cloud-save slot. Shared golf rounds and competitive standings remain incomplete.

Hosted rollout: Google sign-in is enabled for external users. Google currently displays the verified domain `0x4d.in` on its chooser; the dedicated project has SimGolfer branding and its own privacy URL. Real owner sign-in, sign-out and account-owned cloud saving were exercised in Chrome. The owner’s verified Google identity was provisioned as administrator. GitHub, Apple, Microsoft and email activation remain incomplete.

Published-course support requires migration `0004_published_courses.sql` (not yet applied remotely). Owners explicitly publish from Manage access. The library is visible to registered players and contains fixed course packages plus author display names. It excludes resort financial and career state. Account deletion removes authored publications; suspension hides them. Tournament-specific retention and scoring remain unfinished.

Tournament registration requires migration `0005_tournament_lobbies.sql` (local only). Registered players can create/join events; ownership and entrant identity are server-derived. Events retain fixed course copies independently of publications. Account deletion removes entries, cancels owned events and anonymizes author attribution while retaining those copies. Online round execution and scoring are not yet implemented.

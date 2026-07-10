import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import { ApiError } from './http';
import { cookieNames, isAllowedOrigin, pkceChallenge, randomToken, safeReturnTo, sha256, signTransaction, verifyTransaction } from './security';
import type { AppEnvironment, AuthSession, PublicUser, SessionUserRow } from './types';

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

const googleTokenSchema = z.object({
  id_token: z.string().min(1),
}).passthrough();

function callbackUrl(requestUrl: string): string {
  return new URL('/api/auth/google/callback', requestUrl).toString();
}

function baseCookieOptions(requestUrl: string, maxAge: number) {
  const { secure } = cookieNames(requestUrl);
  return { path: '/', secure, sameSite: 'Lax' as const, maxAge };
}

export function clearAuthCookies(c: Parameters<typeof deleteCookie>[0]) {
  const names = cookieNames(c.req.url);
  const options = baseCookieOptions(c.req.url, 0);
  deleteCookie(c, names.oauth, options);
  deleteCookie(c, names.session, options);
  deleteCookie(c, names.csrf, options);
}

export async function startGoogleAuth(c: Parameters<MiddlewareHandler<AppEnvironment>>[0]) {
  const now = Date.now();
  const verifier = randomToken(64);
  const transaction = {
    state: randomToken(),
    nonce: randomToken(),
    verifier,
    returnTo: safeReturnTo(c.req.query('returnTo'), c.env.APP_RETURN_URL),
    expiresAt: now + 10 * 60 * 1000,
  };
  const signed = await signTransaction(transaction, c.env.SESSION_SECRET);
  const names = cookieNames(c.req.url);
  setCookie(c, names.oauth, signed, { ...baseCookieOptions(c.req.url, 10 * 60), httpOnly: true });

  const authorize = new URL(GOOGLE_AUTHORIZE_URL);
  authorize.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl(c.req.url),
    response_type: 'code',
    scope: 'openid email profile',
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return c.redirect(authorize.toString(), 302);
}

async function exchangeGoogleCode(code: string, verifier: string, c: Parameters<MiddlewareHandler<AppEnvironment>>[0]) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callbackUrl(c.req.url),
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    console.warn(JSON.stringify({ level: 'warn', event: 'google_token_exchange_failed', requestId: c.get('requestId'), status: response.status }));
    throw new ApiError(502, 'identity_provider_error', 'Google sign-in could not be completed.');
  }
  return googleTokenSchema.parse(await response.json());
}

function redirectWithAuthStatus(c: Parameters<MiddlewareHandler<AppEnvironment>>[0], returnTo: string, status: 'signed-in' | 'error', reason?: string) {
  const target = new URL(returnTo);
  target.searchParams.set('auth', status);
  if (reason) target.searchParams.set('reason', reason);
  return c.redirect(target.toString(), 303);
}

export async function finishGoogleAuth(c: Parameters<MiddlewareHandler<AppEnvironment>>[0]) {
  const names = cookieNames(c.req.url);
  const transaction = await verifyTransaction(getCookie(c, names.oauth), c.env.SESSION_SECRET);
  deleteCookie(c, names.oauth, baseCookieOptions(c.req.url, 0));
  const state = c.req.query('state');
  const code = c.req.query('code');
  if (!transaction || !state || state !== transaction.state || !code) {
    return redirectWithAuthStatus(c, c.env.APP_RETURN_URL, 'error', 'invalid-state');
  }

  try {
    const token = await exchangeGoogleCode(code, transaction.verifier, c);
    const { payload } = await jwtVerify(token.id_token, GOOGLE_JWKS, {
      audience: c.env.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    if (payload.nonce !== transaction.nonce || typeof payload.sub !== 'string' || typeof payload.email !== 'string' || payload.email_verified !== true) {
      throw new ApiError(401, 'invalid_identity', 'Google did not return a verified identity.');
    }

    const now = Date.now();
    const userId = crypto.randomUUID();
    const user = await c.env.DB.prepare(`
      INSERT INTO users (id, google_sub, email, display_name, avatar_url, profile_slug, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(google_sub) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = excluded.updated_at,
        last_login_at = excluded.last_login_at,
        deleted_at = NULL
      RETURNING id
    `).bind(
      userId,
      payload.sub,
      payload.email.slice(0, 254),
      (typeof payload.name === 'string' ? payload.name : payload.email.split('@')[0]).slice(0, 80),
      typeof payload.picture === 'string' ? payload.picture.slice(0, 500) : null,
      `player-${userId.replaceAll('-', '').slice(0, 12)}`,
      now,
      now,
      now,
    ).first<{ id: string }>();
    if (!user) throw new ApiError(500, 'account_create_failed', 'Your account could not be created.');

    const sessionToken = randomToken();
    const csrfToken = randomToken();
    await c.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, csrf_hash, created_at, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      user.id,
      await sha256(sessionToken),
      await sha256(csrfToken),
      now,
      now + SESSION_TTL_SECONDS * 1000,
      now,
    ).run();

    setCookie(c, names.session, sessionToken, { ...baseCookieOptions(c.req.url, SESSION_TTL_SECONDS), httpOnly: true });
    setCookie(c, names.csrf, csrfToken, { ...baseCookieOptions(c.req.url, SESSION_TTL_SECONDS), httpOnly: false });
    return redirectWithAuthStatus(c, transaction.returnTo, 'signed-in');
  } catch (error) {
    console.warn(JSON.stringify({ level: 'warn', event: 'google_sign_in_rejected', requestId: c.get('requestId'), message: error instanceof Error ? error.message : 'Unknown error' }));
    return redirectWithAuthStatus(c, transaction.returnTo, 'error', 'sign-in-failed');
  }
}

export async function readSession(c: Parameters<MiddlewareHandler<AppEnvironment>>[0]): Promise<{ user: PublicUser; session: AuthSession } | null> {
  const token = getCookie(c, cookieNames(c.req.url).session);
  if (!token) return null;
  const row = await c.env.DB.prepare(`
    SELECT s.id AS session_id, s.user_id, s.csrf_hash, s.expires_at, s.last_seen_at,
           u.email, u.display_name, u.avatar_url,
           COALESCE(u.profile_slug, 'player-' || lower(substr(replace(u.id, '-', ''), 1, 12))) AS profile_slug,
           u.bio, u.discoverable
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL
  `).bind(await sha256(token), Date.now()).first<SessionUserRow>();
  if (!row) return null;
  return {
    user: {
      id: row.user_id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      profileSlug: row.profile_slug,
      bio: row.bio,
      discoverable: row.discoverable === 1,
    },
    session: { id: row.session_id, userId: row.user_id, csrfHash: row.csrf_hash, expiresAt: row.expires_at, lastSeenAt: row.last_seen_at },
  };
}

export const requireAuth: MiddlewareHandler<AppEnvironment> = async (c, next) => {
  const auth = await readSession(c);
  if (!auth) throw new ApiError(401, 'authentication_required', 'Sign in to use this feature.');
  c.set('user', auth.user);
  c.set('session', auth.session);
  if (auth.session.lastSeenAt < Date.now() - 5 * 60_000) {
    const now = Date.now();
    await c.env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').bind(now, auth.session.id).run();
    c.set('session', { ...auth.session, lastSeenAt: now });
  }
  await next();
};

export const requireCsrf: MiddlewareHandler<AppEnvironment> = async (c, next) => {
  if (!isAllowedOrigin(c.req.header('origin'), c.env.APP_ORIGIN)) throw new ApiError(403, 'origin_rejected', 'Request origin is not allowed.');
  const names = cookieNames(c.req.url);
  const cookieToken = getCookie(c, names.csrf);
  const headerToken = c.req.header('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken || await sha256(headerToken) !== c.get('session').csrfHash) {
    throw new ApiError(403, 'csrf_rejected', 'Security token is missing or invalid.');
  }
  await next();
};

export async function getCurrentUser(c: Parameters<MiddlewareHandler<AppEnvironment>>[0]) {
  const auth = await readSession(c);
  if (!auth) return c.json({ user: null });
  return c.json({
    user: auth.user,
    sessionExpiresAt: auth.session.expiresAt,
    // CSRF tokens are not authentication credentials. Echoing the caller's cookie
    // lets a same-site frontend on a sibling subdomain send the required header.
    csrfToken: getCookie(c, cookieNames(c.req.url).csrf) ?? null,
  });
}

export async function logout(c: Parameters<MiddlewareHandler<AppEnvironment>>[0]) {
  await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(c.get('session').id).run();
  clearAuthCookies(c);
  return c.json({ ok: true });
}

export async function deleteExpiredSessions(db: D1Database, now = Date.now()) {
  return db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run();
}

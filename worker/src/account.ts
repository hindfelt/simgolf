import type { Context } from 'hono';
import { clearAuthCookies } from './auth';
import { ApiError, parseJson } from './http';
import { deleteAccountSchema } from './schemas';
import type { AppEnvironment } from './types';

interface SessionRow {
  id: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
}

export async function listAccountSessions(c: Context<AppEnvironment>) {
  const rows = await c.env.DB.prepare(`
    SELECT id, created_at, last_seen_at, expires_at
    FROM sessions WHERE user_id = ? AND expires_at > ?
    ORDER BY last_seen_at DESC
  `).bind(c.get('user').id, Date.now()).all<SessionRow>();
  return c.json({
    sessions: rows.results.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      current: row.id === c.get('session').id,
    })),
  });
}

export async function revokeAccountSession(c: Context<AppEnvironment>) {
  const sessionId = c.req.param('id');
  if (!sessionId) throw new ApiError(404, 'session_not_found', 'That session was not found.');
  const result = await c.env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?')
    .bind(sessionId, c.get('user').id).run();
  if (result.meta.changes !== 1) throw new ApiError(404, 'session_not_found', 'That session was not found.');
  const current = sessionId === c.get('session').id;
  if (current) clearAuthCookies(c);
  return c.json({ ok: true, currentSessionRevoked: current });
}

export async function deleteAccount(c: Context<AppEnvironment>) {
  await parseJson(c, deleteAccountSchema, 1_000);
  const userId = c.get('user').id;
  const now = Date.now();
  const anonymousSuffix = userId.replaceAll('-', '').slice(0, 20);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM cloud_saves WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? OR followed_id = ?').bind(userId, userId),
    c.env.DB.prepare('DELETE FROM round_submissions WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM competition_awards WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM challenge_submissions WHERE user_id = ?').bind(userId),
    c.env.DB.prepare('DELETE FROM profile_rounds WHERE user_id = ?').bind(userId),
    c.env.DB.prepare(`
      UPDATE challenges SET status = 'cancelled', completed_at = ?
      WHERE (creator_id = ? OR opponent_id = ?) AND status IN ('pending', 'active')
    `).bind(now, userId, userId),
    c.env.DB.prepare('UPDATE published_courses SET archived_at = COALESCE(archived_at, ?), updated_at = ? WHERE owner_id = ?').bind(now, now, userId),
    c.env.DB.prepare(`
      UPDATE users SET
        google_sub = ?, email = ?, display_name = 'Deleted Player', avatar_url = NULL,
        profile_slug = NULL, bio = '', discoverable = 0, updated_at = ?, deleted_at = ?
      WHERE id = ?
    `).bind(`deleted:${userId}`, `deleted-${anonymousSuffix}@invalid.local`, now, now, userId),
  ]);
  clearAuthCookies(c);
  return c.json({ ok: true });
}

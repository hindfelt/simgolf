import type { Context } from 'hono';
import { ApiError, parseJson } from './http';
import { profileUpdateSchema } from './schemas';
import type { AppEnvironment } from './types';

interface PlayerRow {
  id: string;
  profile_slug: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  followers: number;
  following: number;
  courses: number;
  is_following: number;
}

function publicPlayer(row: PlayerRow) {
  return {
    id: row.id,
    profileSlug: row.profile_slug,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    followers: row.followers,
    following: row.following,
    publishedCourses: row.courses,
    isFollowing: row.is_following === 1,
  };
}

const PLAYER_SELECT = `
  SELECT u.id,
         COALESCE(u.profile_slug, 'player-' || lower(substr(replace(u.id, '-', ''), 1, 12))) AS profile_slug,
         u.display_name, u.avatar_url, u.bio,
         (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS followers,
         (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following,
         (SELECT COUNT(*) FROM published_courses pc WHERE pc.owner_id = u.id AND pc.visibility = 'public' AND pc.archived_at IS NULL) AS courses,
         EXISTS(SELECT 1 FROM follows mine WHERE mine.follower_id = ? AND mine.followed_id = u.id) AS is_following
  FROM users u
`;

export async function listPlayers(c: Context<AppEnvironment>) {
  const userId = c.get('user').id;
  const query = (c.req.query('query') ?? '').trim().slice(0, 40);
  const followingOnly = c.req.query('following') === '1';
  const limit = Math.min(40, Math.max(1, Number(c.req.query('limit')) || 20));
  const escapedQuery = query.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
  const search = `%${escapedQuery}%`;
  const followingClause = followingOnly ? 'AND EXISTS(SELECT 1 FROM follows scoped WHERE scoped.follower_id = ? AND scoped.followed_id = u.id)' : '';
  const statement = c.env.DB.prepare(`${PLAYER_SELECT}
    WHERE u.id != ? AND u.deleted_at IS NULL AND u.discoverable = 1
      AND (? = '' OR u.display_name LIKE ? ESCAPE '\\' COLLATE NOCASE OR u.profile_slug LIKE ? ESCAPE '\\' COLLATE NOCASE)
      ${followingClause}
    ORDER BY is_following DESC, followers DESC, u.display_name COLLATE NOCASE
    LIMIT ?
  `);
  const bindings: Array<string | number> = [userId, userId, query, search, search];
  if (followingOnly) bindings.push(userId);
  bindings.push(limit);
  const rows = await statement.bind(...bindings).all<PlayerRow>();
  return c.json({ players: rows.results.map(publicPlayer) });
}

export async function getPlayer(c: Context<AppEnvironment>) {
  const row = await c.env.DB.prepare(`${PLAYER_SELECT}
    WHERE u.profile_slug = ? AND u.deleted_at IS NULL
      AND (u.discoverable = 1 OR u.id = ?)
  `).bind(c.get('user').id, c.req.param('slug'), c.get('user').id).first<PlayerRow>();
  if (!row) throw new ApiError(404, 'player_not_found', 'That player profile was not found.');
  return c.json({ player: publicPlayer(row) });
}

export async function updateProfile(c: Context<AppEnvironment>) {
  const input = await parseJson(c, profileUpdateSchema, 2_000);
  const now = Date.now();
  await c.env.DB.prepare(`
    UPDATE users SET display_name = ?, bio = ?, discoverable = ?, updated_at = ?
    WHERE id = ? AND deleted_at IS NULL
  `).bind(input.displayName, input.bio, input.discoverable ? 1 : 0, now, c.get('user').id).run();
  return c.json({
    user: {
      ...c.get('user'),
      displayName: input.displayName,
      bio: input.bio,
      discoverable: input.discoverable,
    },
  });
}

async function ensureFollowTarget(c: Context<AppEnvironment>, targetId: string) {
  if (targetId === c.get('user').id) throw new ApiError(422, 'cannot_follow_self', 'You cannot follow your own profile.');
  const target = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND discoverable = 1')
    .bind(targetId).first<{ id: string }>();
  if (!target) throw new ApiError(404, 'player_not_found', 'That player profile was not found.');
}

export async function followPlayer(c: Context<AppEnvironment>) {
  const targetId = c.req.param('id');
  if (!targetId) throw new ApiError(404, 'player_not_found', 'That player profile was not found.');
  await ensureFollowTarget(c, targetId);
  await c.env.DB.prepare('INSERT OR IGNORE INTO follows (follower_id, followed_id, created_at) VALUES (?, ?, ?)')
    .bind(c.get('user').id, targetId, Date.now()).run();
  return c.json({ following: true });
}

export async function unfollowPlayer(c: Context<AppEnvironment>) {
  const targetId = c.req.param('id');
  if (!targetId) throw new ApiError(404, 'player_not_found', 'That player profile was not found.');
  await c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?')
    .bind(c.get('user').id, targetId).run();
  return c.json({ following: false });
}

import type { Context } from 'hono';
import { ApiError } from './http';
import type { AppEnvironment } from './types';

type CompetitionKind = 'daily' | 'weekly' | 'tournament';

interface EndedCompetitionRow {
  id: string;
  kind: CompetitionKind;
  ends_at: number;
}

interface RankedUserRow {
  user_id: string;
  rank: number;
}

interface SeasonStandingRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  events: number;
  wins: number;
  podiums: number;
  is_following: number;
}

export function seasonId(timestamp = Date.now()): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-S${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function seasonWindow(id: string): { startsAt: number; endsAt: number } {
  const match = /^(\d{4})-S([1-4])$/u.exec(id);
  if (!match) throw new ApiError(422, 'invalid_season', 'Season IDs use the form 2026-S3.');
  const year = Number(match[1]);
  const quarter = Number(match[2]) - 1;
  return { startsAt: Date.UTC(year, quarter * 3, 1), endsAt: Date.UTC(year, quarter * 3 + 3, 1) };
}

function pointsFor(kind: CompetitionKind, rank: number): number {
  if (kind === 'tournament') {
    if (rank === 1) return 500;
    if (rank === 2) return 300;
    if (rank === 3) return 200;
    if (rank <= 10) return 100;
    if (rank <= 64) return 25;
    return 5;
  }
  if (kind === 'weekly') {
    if (rank === 1) return 200;
    if (rank === 2) return 120;
    if (rank === 3) return 80;
    if (rank <= 10) return 40;
    if (rank <= 50) return 10;
    return 2;
  }
  if (rank === 1) return 50;
  if (rank === 2) return 30;
  if (rank === 3) return 20;
  if (rank <= 10) return 10;
  if (rank <= 50) return 3;
  return 1;
}

async function rankedUsers(db: D1Database, competitionId: string): Promise<RankedUserRow[]> {
  const rows = await db.prepare(`
    WITH attempts AS (
      SELECT rs.*,
             ROW_NUMBER() OVER (
               PARTITION BY rs.user_id
               ORDER BY rs.score_to_par, rs.strokes, rs.penalties, rs.duration_seconds, rs.submitted_at
             ) AS attempt_rank
      FROM round_submissions rs
      WHERE rs.competition_id = ? AND rs.verification_status != 'rejected'
    )
    SELECT user_id,
           ROW_NUMBER() OVER (ORDER BY score_to_par, strokes, penalties, duration_seconds, submitted_at) AS rank
    FROM attempts WHERE attempt_rank = 1
    ORDER BY rank LIMIT 100
  `).bind(competitionId).all<RankedUserRow>();
  return rows.results;
}

export async function finalizeEndedCompetitions(db: D1Database, now = Date.now()) {
  const competitions = await db.prepare(`
    SELECT c.id, c.kind, c.ends_at FROM competitions c
    LEFT JOIN competition_finalizations done ON done.competition_id = c.id
    WHERE c.ends_at <= ? AND done.competition_id IS NULL
    ORDER BY c.ends_at LIMIT 20
  `).bind(now).all<EndedCompetitionRow>();
  let finalized = 0;
  let awards = 0;
  for (const competition of competitions.results) {
    const season = seasonId(competition.ends_at - 1);
    const ranked = await rankedUsers(db, competition.id);
    const statements = ranked.map((entry) => db.prepare(`
      INSERT OR IGNORE INTO competition_awards
        (competition_id, user_id, season_id, competition_kind, rank, points, awarded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(competition.id, entry.user_id, season, competition.kind, entry.rank, pointsFor(competition.kind, entry.rank), now));
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO competition_finalizations (competition_id, season_id, finalized_at)
      VALUES (?, ?, ?)
    `).bind(competition.id, season, now));
    const results = await db.batch(statements);
    finalized += results.at(-1)?.meta.changes ?? 0;
    awards += results.slice(0, -1).reduce((total, result) => total + result.meta.changes, 0);
  }
  return { finalized, awards };
}

function standingJson(row: SeasonStandingRow, rank: number) {
  return {
    rank,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    points: row.points,
    events: row.events,
    wins: row.wins,
    podiums: row.podiums,
    isFollowing: row.is_following === 1,
  };
}

export async function getSeasonStandings(c: Context<AppEnvironment>) {
  const requested = c.req.param('id');
  const id = !requested || requested === 'current' ? seasonId() : requested;
  const window = seasonWindow(id);
  const userId = c.get('user').id;
  const friendsOnly = c.req.query('scope') === 'friends';
  const rows = await c.env.DB.prepare(`
    SELECT u.id AS user_id, u.display_name, u.avatar_url,
           SUM(a.points) AS points, COUNT(*) AS events,
           SUM(CASE WHEN a.rank = 1 THEN 1 ELSE 0 END) AS wins,
           SUM(CASE WHEN a.rank <= 3 THEN 1 ELSE 0 END) AS podiums,
           EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followed_id = u.id) AS is_following
    FROM competition_awards a JOIN users u ON u.id = a.user_id
    WHERE a.season_id = ? AND u.deleted_at IS NULL
      AND (? = 0 OR u.id = ? OR EXISTS(SELECT 1 FROM follows scoped WHERE scoped.follower_id = ? AND scoped.followed_id = u.id))
    GROUP BY u.id
    ORDER BY points DESC, wins DESC, podiums DESC, events DESC, u.display_name COLLATE NOCASE
    LIMIT 100
  `).bind(userId, id, friendsOnly ? 1 : 0, userId, userId).all<SeasonStandingRow>();
  const standings = rows.results.map((row, index) => standingJson(row, index + 1));
  const me = standings.find((standing) => standing.userId === userId) ?? null;
  return c.json({ season: { id, ...window }, scope: friendsOnly ? 'friends' : 'global', standings, me });
}

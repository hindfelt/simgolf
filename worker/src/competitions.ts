import type { Context } from 'hono';
import { ApiError, MAX_ROUND_BYTES, parseJson } from './http';
import { submitRoundSchema } from './schemas';
import { validateRoundTotals } from './roundValidation';
import type { AppEnvironment } from './types';

type CompetitionKind = 'daily' | 'weekly' | 'tournament';

interface CompetitionRow {
  id: string;
  kind: CompetitionKind;
  title: string;
  starts_at: number;
  ends_at: number;
  rules_json: string;
  course_id: string;
  slug: string;
  course_name: string;
  course_hash: string;
  theme: string;
  holes: number;
  par: number;
  owner_name: string;
  snapshot_json?: string;
}

interface LeaderboardRow {
  rank: number;
  submission_id: string;
  display_name: string;
  avatar_url: string | null;
  score_to_par: number;
  strokes: number;
  penalties: number;
  duration_seconds: number;
  submitted_at: number;
  verification_status: string;
}

function utcDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcWeekStart(timestamp: number): number {
  const day = utcDayStart(timestamp);
  const weekday = new Date(day).getUTCDay();
  return day - ((weekday + 6) % 7) * 86_400_000;
}

function dateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function pickIndex(seed: string, length: number): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % length;
}

async function createCompetition(db: D1Database, kind: CompetitionKind, startsAt: number, endsAt: number) {
  const id = `${kind}-${dateKey(startsAt)}`;
  const exists = await db.prepare('SELECT id FROM competitions WHERE id = ?').bind(id).first<{ id: string }>();
  if (exists) return;

  const courses = await db.prepare(`
    SELECT id, name FROM published_courses
    WHERE visibility = 'public' AND archived_at IS NULL
    ORDER BY course_hash, id
  `).all<{ id: string; name: string }>();
  if (!courses.results.length) return;
  const course = courses.results[pickIndex(id, courses.results.length)];
  const title = kind === 'daily'
    ? `Daily Open · ${dateKey(startsAt)}`
    : kind === 'weekly'
      ? `Weekly Classic · ${dateKey(startsAt)}`
      : `Club Championship · ${dateKey(startsAt)}`;
  const rules = kind === 'tournament'
    ? { attempts: 1, qualificationCut: 64, prizes: [500, 300, 150], ranking: ['scoreToPar', 'strokes', 'penalties', 'duration'], verification: 'provisional' }
    : { attempts: 'unlimited', ranking: ['scoreToPar', 'strokes', 'penalties', 'duration'], verification: 'provisional' };
  await db.prepare(`
    INSERT OR IGNORE INTO competitions (id, kind, course_id, title, starts_at, ends_at, rules_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, kind, course.id, title, startsAt, endsAt, JSON.stringify(rules), Date.now()).run();
}

export async function ensureCurrentCompetitions(db: D1Database, now = Date.now()) {
  const day = utcDayStart(now);
  const week = utcWeekStart(now);
  await createCompetition(db, 'daily', day, day + 86_400_000);
  await createCompetition(db, 'weekly', week, week + 7 * 86_400_000);
  await createCompetition(db, 'tournament', week, week + 7 * 86_400_000);
}

function competitionJson(row: CompetitionRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    rules: JSON.parse(row.rules_json),
    course: {
      id: row.course_id,
      slug: row.slug,
      name: row.course_name,
      courseHash: row.course_hash,
      theme: row.theme,
      holes: row.holes,
      par: row.par,
      owner: row.owner_name,
    },
  };
}

const COMPETITION_SELECT = `
  SELECT c.id, c.kind, c.title, c.starts_at, c.ends_at, c.rules_json,
         pc.id AS course_id, pc.slug, pc.name AS course_name, pc.course_hash, pc.theme, pc.holes, pc.par,
         u.display_name AS owner_name
  FROM competitions c
  JOIN published_courses pc ON pc.id = c.course_id
  JOIN users u ON u.id = pc.owner_id
`;

export async function listCompetitions(c: Context<AppEnvironment>) {
  const now = Date.now();
  const archive = c.req.query('status') === 'archive';
  if (!archive) await ensureCurrentCompetitions(c.env.DB, now);
  const rows = archive
    ? await c.env.DB.prepare(`${COMPETITION_SELECT}
        WHERE c.ends_at <= ? ORDER BY c.ends_at DESC, c.kind LIMIT 24
      `).bind(now).all<CompetitionRow>()
    : await c.env.DB.prepare(`${COMPETITION_SELECT}
        WHERE c.starts_at <= ? AND c.ends_at > ?
        ORDER BY CASE c.kind WHEN 'tournament' THEN 0 WHEN 'daily' THEN 1 ELSE 2 END, c.ends_at
      `).bind(now, now).all<CompetitionRow>();
  return c.json({ competitions: rows.results.map(competitionJson), serverTime: now });
}

export async function getCompetitionCourse(c: Context<AppEnvironment>) {
  const competition = await c.env.DB.prepare(`${COMPETITION_SELECT.replace('pc.id AS course_id', 'pc.snapshot_json, pc.id AS course_id')} WHERE c.id = ?`)
    .bind(c.req.param('id')).first<CompetitionRow>();
  if (!competition?.snapshot_json) throw new ApiError(404, 'competition_not_found', 'That competition course does not exist.');
  const now = Date.now();
  if (now < competition.starts_at || now >= competition.ends_at) throw new ApiError(409, 'competition_closed', 'That competition is not accepting rounds.');
  return c.json({ course: { ...competitionJson(competition).course, snapshot: JSON.parse(competition.snapshot_json) } });
}

async function leaderboardRows(db: D1Database, competitionId: string, friendsOf: string | null) {
  return db.prepare(`
    WITH ranked_attempts AS (
      SELECT rs.*,
             ROW_NUMBER() OVER (
               PARTITION BY rs.user_id
               ORDER BY rs.score_to_par, rs.strokes, rs.penalties, rs.duration_seconds, rs.submitted_at
             ) AS attempt_rank
      FROM round_submissions rs
      WHERE rs.competition_id = ? AND rs.verification_status != 'rejected'
    ), scoped AS (
      SELECT ra.* FROM ranked_attempts ra
      WHERE ra.attempt_rank = 1 AND (
        ? IS NULL OR ra.user_id = ? OR EXISTS(
          SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followed_id = ra.user_id
        )
      )
    )
    SELECT ROW_NUMBER() OVER (
             ORDER BY scoped.score_to_par, scoped.strokes, scoped.penalties, scoped.duration_seconds, scoped.submitted_at
           ) AS rank,
           scoped.id AS submission_id, u.display_name, u.avatar_url, scoped.score_to_par, scoped.strokes,
           scoped.penalties, scoped.duration_seconds, scoped.submitted_at, scoped.verification_status
    FROM scoped JOIN users u ON u.id = scoped.user_id
    ORDER BY rank LIMIT 100
  `).bind(competitionId, friendsOf, friendsOf, friendsOf).all<LeaderboardRow>();
}

async function leaderboardResponse(c: Context<AppEnvironment>, friendsOf: string | null) {
  const competitionId = c.req.param('id');
  const competition = await c.env.DB.prepare(`${COMPETITION_SELECT} WHERE c.id = ?`).bind(competitionId).first<CompetitionRow>();
  if (!competition) throw new ApiError(404, 'competition_not_found', 'That competition does not exist.');
  const rows = await leaderboardRows(c.env.DB, competitionId ?? '', friendsOf);
  return c.json({
    competition: competitionJson(competition),
    scope: friendsOf ? 'friends' : 'global',
    leaderboard: rows.results.map((row) => ({
      rank: row.rank,
      submissionId: row.submission_id,
      player: { displayName: row.display_name, avatarUrl: row.avatar_url },
      scoreToPar: row.score_to_par,
      strokes: row.strokes,
      penalties: row.penalties,
      durationSeconds: row.duration_seconds,
      submittedAt: row.submitted_at,
      verificationStatus: row.verification_status,
    })),
  });
}

export function getLeaderboard(c: Context<AppEnvironment>) {
  return leaderboardResponse(c, null);
}

export function getFriendsLeaderboard(c: Context<AppEnvironment>) {
  return leaderboardResponse(c, c.get('user').id);
}

export async function submitCompetitionRound(c: Context<AppEnvironment>) {
  const input = await parseJson(c, submitRoundSchema, MAX_ROUND_BYTES);
  if (input.competitionId !== c.req.param('id')) throw new ApiError(422, 'competition_mismatch', 'Route and scorecard competition IDs do not match.');
  const now = Date.now();
  const competition = await c.env.DB.prepare(`${COMPETITION_SELECT} WHERE c.id = ?`).bind(input.competitionId).first<CompetitionRow>();
  if (!competition) throw new ApiError(404, 'competition_not_found', 'That competition does not exist.');
  if (now < competition.starts_at || now >= competition.ends_at) throw new ApiError(409, 'competition_closed', 'That competition is not accepting scores.');
  if (input.round.competitionId !== competition.id) throw new ApiError(422, 'competition_mismatch', 'The scorecard is attached to another competition.');
  validateRoundTotals(input.round, { source: competition.kind, courseHash: competition.course_hash, holes: competition.holes, par: competition.par });

  const rules = JSON.parse(competition.rules_json) as { attempts?: number | string };
  const attemptPolicy = rules.attempts === 1 ? 'single' : 'unlimited';
  if (attemptPolicy === 'single') {
    const prior = await c.env.DB.prepare('SELECT id FROM round_submissions WHERE competition_id = ? AND user_id = ? LIMIT 1')
      .bind(competition.id, c.get('user').id).first<{ id: string }>();
    if (prior) throw new ApiError(409, 'attempt_already_used', 'This tournament allows one official scorecard.');
  }

  const cardJson = JSON.stringify(input.round);
  const id = crypto.randomUUID();
  const result = await c.env.DB.prepare(`
    INSERT OR IGNORE INTO round_submissions
      (id, competition_id, user_id, round_id, course_hash, holes, par, strokes, score_to_par,
       penalties, duration_seconds, card_json, verification_status, submitted_at, attempt_policy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisional', ?, ?)
  `).bind(
    id,
    competition.id,
    c.get('user').id,
    input.round.id,
    input.round.courseHash,
    input.round.holesPlayed,
    input.round.par,
    input.round.strokes,
    input.round.scoreToPar,
    input.round.penalties,
    input.round.durationSeconds,
    cardJson,
    now,
    attemptPolicy,
  ).run();

  if (result.meta.changes === 0) {
    if (attemptPolicy === 'single') throw new ApiError(409, 'attempt_already_used', 'This tournament allows one official scorecard.');
    const existing = await c.env.DB.prepare(`
      SELECT id, verification_status FROM round_submissions
      WHERE competition_id = ? AND user_id = ? AND round_id = ?
    `).bind(competition.id, c.get('user').id, input.round.id).first<{ id: string; verification_status: string }>();
    return c.json({ submission: { id: existing?.id, verificationStatus: existing?.verification_status ?? 'provisional' }, duplicate: true });
  }
  return c.json({ submission: { id, verificationStatus: 'provisional' }, duplicate: false }, 201);
}

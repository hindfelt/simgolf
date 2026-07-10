import type { Context } from 'hono';
import { ApiError, MAX_ROUND_BYTES, parseJson } from './http';
import { validateRoundTotals } from './roundValidation';
import { createChallengeSchema, submitChallengeRoundSchema } from './schemas';
import { randomToken } from './security';
import type { AppEnvironment } from './types';

type ChallengeStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'expired';

interface ChallengeRow {
  id: string;
  invite_code: string;
  status: ChallengeStatus;
  title: string;
  created_at: number;
  accepted_at: number | null;
  expires_at: number;
  completed_at: number | null;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  creator_slug: string;
  opponent_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  opponent_slug: string;
  course_id: string;
  course_slug: string;
  course_name: string;
  course_hash: string;
  theme: string;
  holes: number;
  par: number;
  snapshot_json?: string;
  creator_submission_id: string | null;
  creator_score: number | null;
  creator_strokes: number | null;
  creator_penalties: number | null;
  creator_duration: number | null;
  creator_verification: string | null;
  opponent_submission_id: string | null;
  opponent_score: number | null;
  opponent_strokes: number | null;
  opponent_penalties: number | null;
  opponent_duration: number | null;
  opponent_verification: string | null;
}

const CHALLENGE_SELECT = `
  SELECT ch.id, ch.invite_code, ch.status, ch.title, ch.created_at, ch.accepted_at, ch.expires_at, ch.completed_at,
         creator.id AS creator_id, creator.display_name AS creator_name, creator.avatar_url AS creator_avatar,
         COALESCE(creator.profile_slug, 'player-' || lower(substr(replace(creator.id, '-', ''), 1, 12))) AS creator_slug,
         opponent.id AS opponent_id, opponent.display_name AS opponent_name, opponent.avatar_url AS opponent_avatar,
         COALESCE(opponent.profile_slug, 'player-' || lower(substr(replace(opponent.id, '-', ''), 1, 12))) AS opponent_slug,
         pc.id AS course_id, pc.slug AS course_slug, pc.name AS course_name, pc.course_hash, pc.theme, pc.holes, pc.par,
         creator_score.id AS creator_submission_id, creator_score.score_to_par AS creator_score,
         creator_score.strokes AS creator_strokes, creator_score.penalties AS creator_penalties,
         creator_score.duration_seconds AS creator_duration, creator_score.verification_status AS creator_verification,
         opponent_score.id AS opponent_submission_id, opponent_score.score_to_par AS opponent_score,
         opponent_score.strokes AS opponent_strokes, opponent_score.penalties AS opponent_penalties,
         opponent_score.duration_seconds AS opponent_duration, opponent_score.verification_status AS opponent_verification
  FROM challenges ch
  JOIN users creator ON creator.id = ch.creator_id
  JOIN users opponent ON opponent.id = ch.opponent_id
  JOIN published_courses pc ON pc.id = ch.course_id
  LEFT JOIN challenge_submissions creator_score ON creator_score.challenge_id = ch.id AND creator_score.user_id = ch.creator_id
  LEFT JOIN challenge_submissions opponent_score ON opponent_score.challenge_id = ch.id AND opponent_score.user_id = ch.opponent_id
`;

function scoreJson(row: ChallengeRow, side: 'creator' | 'opponent') {
  const id = row[`${side}_submission_id`];
  if (!id) return null;
  return {
    submissionId: id,
    scoreToPar: row[`${side}_score`],
    strokes: row[`${side}_strokes`],
    penalties: row[`${side}_penalties`],
    durationSeconds: row[`${side}_duration`],
    verificationStatus: row[`${side}_verification`],
  };
}

function compareSides(row: ChallengeRow): -1 | 0 | 1 | null {
  if (row.creator_score === null || row.opponent_score === null) return null;
  const creator = [row.creator_score, row.creator_strokes ?? 0, row.creator_penalties ?? 0, row.creator_duration ?? 0];
  const opponent = [row.opponent_score, row.opponent_strokes ?? 0, row.opponent_penalties ?? 0, row.opponent_duration ?? 0];
  for (let index = 0; index < creator.length; index++) {
    if (creator[index] < opponent[index]) return -1;
    if (creator[index] > opponent[index]) return 1;
  }
  return 0;
}

function challengeJson(row: ChallengeRow, userId: string, now = Date.now()) {
  const status: ChallengeStatus = row.expires_at <= now && (row.status === 'pending' || row.status === 'active') ? 'expired' : row.status;
  const comparison = compareSides(row);
  const role = row.creator_id === userId ? 'creator' : 'opponent';
  const mySubmission = role === 'creator' ? row.creator_submission_id : row.opponent_submission_id;
  return {
    id: row.id,
    inviteCode: row.invite_code,
    title: row.title,
    status,
    role,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    canPlay: status === 'active' && !mySubmission,
    winnerUserId: comparison === null || comparison === 0 ? null : comparison < 0 ? row.creator_id : row.opponent_id,
    tied: comparison === 0,
    creator: {
      id: row.creator_id,
      displayName: row.creator_name,
      avatarUrl: row.creator_avatar,
      profileSlug: row.creator_slug,
      score: scoreJson(row, 'creator'),
    },
    opponent: {
      id: row.opponent_id,
      displayName: row.opponent_name,
      avatarUrl: row.opponent_avatar,
      profileSlug: row.opponent_slug,
      score: scoreJson(row, 'opponent'),
    },
    course: {
      id: row.course_id,
      slug: row.course_slug,
      name: row.course_name,
      courseHash: row.course_hash,
      theme: row.theme,
      holes: row.holes,
      par: row.par,
    },
  };
}

async function loadChallenge(db: D1Database, id: string): Promise<ChallengeRow | null> {
  return db.prepare(`${CHALLENGE_SELECT} WHERE ch.id = ?`).bind(id).first<ChallengeRow>();
}

function requireParticipant(row: ChallengeRow, userId: string) {
  if (row.creator_id !== userId && row.opponent_id !== userId) throw new ApiError(404, 'challenge_not_found', 'That challenge was not found.');
}

export async function listChallenges(c: Context<AppEnvironment>) {
  const userId = c.get('user').id;
  const rows = await c.env.DB.prepare(`${CHALLENGE_SELECT}
    WHERE ch.creator_id = ? OR ch.opponent_id = ?
    ORDER BY CASE ch.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, ch.created_at DESC
    LIMIT 50
  `).bind(userId, userId).all<ChallengeRow>();
  return c.json({ challenges: rows.results.map((row) => challengeJson(row, userId)) });
}

export async function getChallenge(c: Context<AppEnvironment>) {
  const row = await loadChallenge(c.env.DB, c.req.param('id') ?? '');
  if (!row) throw new ApiError(404, 'challenge_not_found', 'That challenge was not found.');
  requireParticipant(row, c.get('user').id);
  return c.json({ challenge: challengeJson(row, c.get('user').id) });
}

export async function getChallengeScorecards(c: Context<AppEnvironment>) {
  const row = await loadChallenge(c.env.DB, c.req.param('id') ?? '');
  if (!row) throw new ApiError(404, 'challenge_not_found', 'That challenge was not found.');
  requireParticipant(row, c.get('user').id);
  const submissions = await c.env.DB.prepare(`
    SELECT user_id, card_json FROM challenge_submissions
    WHERE challenge_id = ? AND verification_status != 'rejected'
    ORDER BY submitted_at, user_id
  `).bind(row.id).all<{ user_id: string; card_json: string }>();
  const names = new Map([[row.creator_id, row.creator_name], [row.opponent_id, row.opponent_name]]);
  const scorecards = submissions.results.map((submission) => {
    const card = JSON.parse(submission.card_json) as {
      strokes: number;
      par: number;
      scoreToPar: number;
      penalties: number;
      card: Array<{ hole: number; par: number; strokes: number; relative: number; putts: number; penalties: number }>;
    };
    return {
      userId: submission.user_id,
      displayName: names.get(submission.user_id) ?? 'Player',
      strokes: card.strokes,
      par: card.par,
      scoreToPar: card.scoreToPar,
      penalties: card.penalties,
      holes: card.card.map((hole) => ({
        hole: hole.hole,
        par: hole.par,
        strokes: hole.strokes,
        scoreToPar: hole.relative,
        putts: hole.putts,
        penalties: hole.penalties,
      })),
    };
  });
  return c.json({ challenge: challengeJson(row, c.get('user').id), scorecards });
}

export async function createChallenge(c: Context<AppEnvironment>) {
  const input = await parseJson(c, createChallengeSchema, 3_000);
  const creatorId = c.get('user').id;
  if (input.opponentId === creatorId) throw new ApiError(422, 'cannot_challenge_self', 'Choose another club member.');
  const opponent = await c.env.DB.prepare('SELECT id, display_name FROM users WHERE id = ? AND deleted_at IS NULL AND discoverable = 1')
    .bind(input.opponentId).first<{ id: string; display_name: string }>();
  if (!opponent) throw new ApiError(404, 'player_not_found', 'That club member is not available for challenges.');
  const course = await c.env.DB.prepare(`
    SELECT id, name FROM published_courses
    WHERE slug = ? AND archived_at IS NULL AND (visibility = 'public' OR owner_id = ?)
  `).bind(input.courseSlug, creatorId).first<{ id: string; name: string }>();
  if (!course) throw new ApiError(404, 'course_not_found', 'Choose a published course that is still available.');
  const active = await c.env.DB.prepare(`
    SELECT COUNT(*) AS total FROM challenges
    WHERE (creator_id = ? OR opponent_id = ?) AND status IN ('pending', 'active') AND expires_at > ?
  `).bind(creatorId, creatorId, Date.now()).first<{ total: number }>();
  if ((active?.total ?? 0) >= 20) throw new ApiError(429, 'challenge_limit_reached', 'Finish or cancel an open challenge before creating another.');

  const id = crypto.randomUUID();
  const now = Date.now();
  const title = input.title ?? `${c.get('user').displayName} vs ${opponent.display_name}`;
  await c.env.DB.prepare(`
    INSERT INTO challenges
      (id, invite_code, creator_id, opponent_id, course_id, title, status, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).bind(id, randomToken(9), creatorId, opponent.id, course.id, title, now, now + 7 * 86_400_000).run();
  const row = await loadChallenge(c.env.DB, id);
  if (!row) throw new ApiError(500, 'challenge_create_failed', 'The challenge could not be read after creation.');
  return c.json({ challenge: challengeJson(row, creatorId) }, 201);
}

export async function acceptChallenge(c: Context<AppEnvironment>) {
  const now = Date.now();
  const result = await c.env.DB.prepare(`
    UPDATE challenges SET status = 'active', accepted_at = ?
    WHERE id = ? AND opponent_id = ? AND status = 'pending' AND expires_at > ?
  `).bind(now, c.req.param('id'), c.get('user').id, now).run();
  if (result.meta.changes !== 1) throw new ApiError(409, 'challenge_not_pending', 'This challenge can no longer be accepted.');
  const row = await loadChallenge(c.env.DB, c.req.param('id') ?? '');
  return c.json({ challenge: challengeJson(row!, c.get('user').id) });
}

export async function declineChallenge(c: Context<AppEnvironment>) {
  const result = await c.env.DB.prepare(`
    UPDATE challenges SET status = 'declined', completed_at = ?
    WHERE id = ? AND opponent_id = ? AND status = 'pending'
  `).bind(Date.now(), c.req.param('id'), c.get('user').id).run();
  if (result.meta.changes !== 1) throw new ApiError(409, 'challenge_not_pending', 'This challenge can no longer be declined.');
  return c.json({ ok: true });
}

export async function cancelChallenge(c: Context<AppEnvironment>) {
  const userId = c.get('user').id;
  const result = await c.env.DB.prepare(`
    UPDATE challenges SET status = 'cancelled', completed_at = ?
    WHERE id = ? AND (creator_id = ? OR opponent_id = ?) AND status IN ('pending', 'active')
  `).bind(Date.now(), c.req.param('id'), userId, userId).run();
  if (result.meta.changes !== 1) throw new ApiError(409, 'challenge_not_open', 'This challenge can no longer be cancelled.');
  return c.json({ ok: true });
}

export async function getChallengeCourse(c: Context<AppEnvironment>) {
  const row = await c.env.DB.prepare(`${CHALLENGE_SELECT.replace('pc.id AS course_id', 'pc.snapshot_json, pc.id AS course_id')} WHERE ch.id = ?`)
    .bind(c.req.param('id')).first<ChallengeRow>();
  if (!row) throw new ApiError(404, 'challenge_not_found', 'That challenge was not found.');
  requireParticipant(row, c.get('user').id);
  const status = challengeJson(row, c.get('user').id).status;
  if (status !== 'active') throw new ApiError(409, 'challenge_not_active', 'Accept the challenge before playing it.');
  const alreadyPlayed = row.creator_id === c.get('user').id ? row.creator_submission_id : row.opponent_submission_id;
  if (alreadyPlayed) throw new ApiError(409, 'attempt_already_used', 'Your challenge score is already locked in.');
  if (!row.snapshot_json) throw new ApiError(500, 'course_snapshot_missing', 'The challenge course is unavailable.');
  return c.json({ course: { ...challengeJson(row, c.get('user').id).course, snapshot: JSON.parse(row.snapshot_json) } });
}

export async function submitChallengeRound(c: Context<AppEnvironment>) {
  const input = await parseJson(c, submitChallengeRoundSchema, MAX_ROUND_BYTES);
  if (input.challengeId !== c.req.param('id') || input.round.challengeId !== input.challengeId || input.round.competitionId) {
    throw new ApiError(422, 'challenge_mismatch', 'The scorecard is attached to another event.');
  }
  const row = await loadChallenge(c.env.DB, input.challengeId);
  if (!row) throw new ApiError(404, 'challenge_not_found', 'That challenge was not found.');
  const userId = c.get('user').id;
  requireParticipant(row, userId);
  if (row.status !== 'active' || row.expires_at <= Date.now()) throw new ApiError(409, 'challenge_not_active', 'That challenge is not accepting scores.');
  validateRoundTotals(input.round, { source: 'challenge', courseHash: row.course_hash, holes: row.holes, par: row.par });

  const id = crypto.randomUUID();
  const now = Date.now();
  const result = await c.env.DB.prepare(`
    INSERT OR IGNORE INTO challenge_submissions
      (id, challenge_id, user_id, round_id, course_hash, holes, par, strokes, score_to_par,
       penalties, duration_seconds, card_json, verification_status, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisional', ?)
  `).bind(
    id,
    row.id,
    userId,
    input.round.id,
    input.round.courseHash,
    input.round.holesPlayed,
    input.round.par,
    input.round.strokes,
    input.round.scoreToPar,
    input.round.penalties,
    input.round.durationSeconds,
    JSON.stringify(input.round),
    now,
  ).run();
  if (result.meta.changes !== 1) throw new ApiError(409, 'attempt_already_used', 'Your challenge score is already locked in.');

  const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM challenge_submissions WHERE challenge_id = ? AND verification_status != ?')
    .bind(row.id, 'rejected').first<{ total: number }>();
  if ((count?.total ?? 0) >= 2) {
    await c.env.DB.prepare(`UPDATE challenges SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'active'`)
      .bind(now, row.id).run();
  }
  const updated = await loadChallenge(c.env.DB, row.id);
  return c.json({ submission: { id, verificationStatus: 'provisional' }, challenge: challengeJson(updated!, userId) }, 201);
}

export async function expireChallenges(db: D1Database, now = Date.now()) {
  return db.prepare(`
    UPDATE challenges SET status = 'expired', completed_at = ?
    WHERE status IN ('pending', 'active') AND expires_at <= ?
  `).bind(now, now).run();
}

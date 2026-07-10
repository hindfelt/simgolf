import type { Context } from 'hono';
import { ApiError, parseJson } from './http';
import { importProfileRoundsSchema } from './schemas';
import type { AppEnvironment } from './types';

const PROFILE_ROUND_BYTES = 120_000;
const PROFILE_LIMIT = 200;
const PAGE_SIZE = 5;

interface ProfileRoundRow {
  record_json: string;
}

export async function importProfileRounds(c: Context<AppEnvironment>) {
  const input = await parseJson(c, importProfileRoundsSchema, 650_000);
  const userId = c.get('user').id;
  const now = Date.now();
  const statements: D1PreparedStatement[] = [];
  for (const round of input.rounds) {
    const recordJson = JSON.stringify(round);
    const sizeBytes = new TextEncoder().encode(recordJson).byteLength;
    if (sizeBytes > PROFILE_ROUND_BYTES) throw new ApiError(413, 'scorecard_too_large', `Scorecard ${round.id} exceeds the profile archive limit.`);
    statements.push(c.env.DB.prepare(`
      INSERT OR IGNORE INTO profile_rounds
        (id, user_id, round_id, course_hash, source, completed_at, score_to_par, strokes, record_json, size_bytes, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), userId, round.id, round.courseHash, round.source, round.completedAt, round.scoreToPar, round.strokes, recordJson, sizeBytes, now));
  }
  const results = await c.env.DB.batch(statements);
  await c.env.DB.prepare(`
    DELETE FROM profile_rounds WHERE id IN (
      SELECT id FROM profile_rounds WHERE user_id = ?
      ORDER BY completed_at DESC, id LIMIT -1 OFFSET ?
    )
  `).bind(userId, PROFILE_LIMIT).run();
  return c.json({ imported: results.reduce((total, result) => total + result.meta.changes, 0) });
}

export async function listProfileRounds(c: Context<AppEnvironment>) {
  const offset = Math.min(PROFILE_LIMIT, Math.max(0, Number(c.req.query('offset')) || 0));
  const rows = await c.env.DB.prepare(`
    SELECT record_json FROM profile_rounds
    WHERE user_id = ? ORDER BY completed_at DESC, id LIMIT ? OFFSET ?
  `).bind(c.get('user').id, PAGE_SIZE, offset).all<ProfileRoundRow>();
  const rounds = rows.results.map((row) => JSON.parse(row.record_json));
  return c.json({ rounds, nextOffset: rounds.length === PAGE_SIZE && offset + PAGE_SIZE < PROFILE_LIMIT ? offset + PAGE_SIZE : null });
}

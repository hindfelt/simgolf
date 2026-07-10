import type { Context } from 'hono';
import { ApiError, MAX_SAVE_BYTES, parseJson } from './http';
import { saveSchema } from './schemas';
import { validateCourseSnapshot } from './courseValidation';
import type { AppEnvironment } from './types';

interface SaveMetadataRow {
  id: string;
  slot: string;
  name: string;
  revision: number;
  course_hash: string;
  size_bytes: number;
  created_at: number;
  updated_at: number;
}

interface SaveRow extends SaveMetadataRow {
  snapshot_json: string;
}

function validSlot(value: string | undefined): string {
  if (!value || !/^[a-zA-Z0-9_-]{1,24}$/u.test(value)) throw new ApiError(422, 'invalid_slot', 'Save slot names may only use letters, numbers, dashes, and underscores.');
  return value;
}

function metadata(row: SaveMetadataRow) {
  return {
    id: row.id,
    slot: row.slot,
    name: row.name,
    revision: row.revision,
    courseHash: row.course_hash,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCloudSaves(c: Context<AppEnvironment>) {
  const rows = await c.env.DB.prepare(`
    SELECT id, slot, name, revision, course_hash, size_bytes, created_at, updated_at
    FROM cloud_saves WHERE user_id = ? ORDER BY updated_at DESC
  `).bind(c.get('user').id).all<SaveMetadataRow>();
  return c.json({ saves: rows.results.map(metadata), limit: 5 });
}

export async function getCloudSave(c: Context<AppEnvironment>) {
  const slot = validSlot(c.req.param('slot'));
  const row = await c.env.DB.prepare(`
    SELECT id, slot, name, revision, course_hash, snapshot_json, size_bytes, created_at, updated_at
    FROM cloud_saves WHERE user_id = ? AND slot = ?
  `).bind(c.get('user').id, slot).first<SaveRow>();
  if (!row) throw new ApiError(404, 'save_not_found', 'That cloud save does not exist.');
  return c.json({ save: { ...metadata(row), snapshot: JSON.parse(row.snapshot_json) } });
}

export async function putCloudSave(c: Context<AppEnvironment>) {
  const slot = validSlot(c.req.param('slot'));
  const input = await parseJson(c, saveSchema, MAX_SAVE_BYTES);
  validateCourseSnapshot(input.snapshot, input.courseHash);
  const snapshotJson = JSON.stringify(input.snapshot);
  const sizeBytes = new TextEncoder().encode(snapshotJson).byteLength;
  if (sizeBytes > MAX_SAVE_BYTES) throw new ApiError(413, 'save_too_large', 'The course snapshot is too large for cloud storage.');

  const userId = c.get('user').id;
  const current = await c.env.DB.prepare('SELECT revision FROM cloud_saves WHERE user_id = ? AND slot = ?')
    .bind(userId, slot).first<{ revision: number }>();
  if (current && current.revision !== input.expectedRevision) {
    throw new ApiError(409, 'save_conflict', 'This cloud save changed on another device.', { currentRevision: current.revision });
  }
  if (!current && input.expectedRevision !== 0) {
    throw new ApiError(409, 'save_conflict', 'This cloud save no longer exists.', { currentRevision: 0 });
  }
  if (!current) {
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM cloud_saves WHERE user_id = ?').bind(userId).first<{ total: number }>();
    if ((count?.total ?? 0) >= 5) throw new ApiError(409, 'save_limit_reached', 'Cloud storage has five saves already.');
  }

  const now = Date.now();
  const result = await c.env.DB.prepare(`
    INSERT INTO cloud_saves (id, user_id, slot, name, revision, course_hash, snapshot_json, size_bytes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, slot) DO UPDATE SET
      name = excluded.name,
      revision = cloud_saves.revision + 1,
      course_hash = excluded.course_hash,
      snapshot_json = excluded.snapshot_json,
      size_bytes = excluded.size_bytes,
      updated_at = excluded.updated_at
    WHERE cloud_saves.revision = ?
  `).bind(crypto.randomUUID(), userId, slot, input.name, input.courseHash, snapshotJson, sizeBytes, now, now, input.expectedRevision).run();
  if (result.meta.changes !== 1) {
    const latest = await c.env.DB.prepare('SELECT revision FROM cloud_saves WHERE user_id = ? AND slot = ?').bind(userId, slot).first<{ revision: number }>();
    throw new ApiError(409, 'save_conflict', 'This cloud save changed while it was uploading.', { currentRevision: latest?.revision ?? 0 });
  }

  const saved = await c.env.DB.prepare(`
    SELECT id, slot, name, revision, course_hash, size_bytes, created_at, updated_at
    FROM cloud_saves WHERE user_id = ? AND slot = ?
  `).bind(userId, slot).first<SaveMetadataRow>();
  if (!saved) throw new ApiError(500, 'save_failed', 'The cloud save could not be read after upload.');
  return c.json({ save: metadata(saved) }, current ? 200 : 201);
}

export async function deleteCloudSave(c: Context<AppEnvironment>) {
  const slot = validSlot(c.req.param('slot'));
  const expected = Number(c.req.header('if-match')?.replaceAll('"', ''));
  if (!Number.isInteger(expected) || expected < 1) throw new ApiError(422, 'revision_required', 'Send the current revision in the If-Match header.');
  const result = await c.env.DB.prepare('DELETE FROM cloud_saves WHERE user_id = ? AND slot = ? AND revision = ?')
    .bind(c.get('user').id, slot, expected).run();
  if (result.meta.changes !== 1) throw new ApiError(409, 'save_conflict', 'The cloud save changed or no longer exists.');
  return c.body(null, 204);
}

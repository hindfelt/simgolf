import type { Context } from 'hono';
import { ApiError, MAX_SAVE_BYTES, parseJson } from './http';
import { publishCourseSchema } from './schemas';
import { sanitizePublishedSnapshot, validateCourseSnapshot } from './courseValidation';
import type { AppEnvironment } from './types';

export interface CourseRow {
  id: string;
  owner_id: string;
  owner_name: string;
  slug: string;
  name: string;
  theme: string;
  course_hash: string;
  version: number;
  holes: number;
  par: number;
  visibility: 'public' | 'unlisted';
  published_at: number;
  snapshot_json?: string;
}

function publicCourse(row: CourseRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    owner: { id: row.owner_id, displayName: row.owner_name },
    theme: row.theme,
    courseHash: row.course_hash,
    version: row.version,
    holes: row.holes,
    par: row.par,
    visibility: row.visibility,
    publishedAt: row.published_at,
  };
}

function slugBase(name: string): string {
  return name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 36) || 'course';
}

export async function publishCourse(c: Context<AppEnvironment>) {
  const input = await parseJson(c, publishCourseSchema, MAX_SAVE_BYTES);
  const snapshot = validateCourseSnapshot(input.snapshot, input.courseHash);
  if (snapshot.theme !== input.theme || snapshot.holes.length !== input.holes) {
    throw new ApiError(422, 'course_summary_mismatch', 'Course theme or hole count does not match the snapshot.');
  }
  const actualPar = snapshot.holes.reduce((sum, hole) => sum + hole.par, 0);
  if (actualPar !== input.par) throw new ApiError(422, 'course_summary_mismatch', 'Course par does not match the snapshot.');

  const ownerId = c.get('user').id;
  const existing = await c.env.DB.prepare(`
    SELECT pc.*, u.display_name AS owner_name FROM published_courses pc JOIN users u ON u.id = pc.owner_id
    WHERE pc.owner_id = ? AND pc.course_hash = ?
  `).bind(ownerId, input.courseHash).first<CourseRow>();
  if (existing) {
    const now = Date.now();
    await c.env.DB.prepare(`
      UPDATE published_courses SET name = ?, visibility = ?, archived_at = NULL, updated_at = ?
      WHERE id = ? AND owner_id = ?
    `).bind(input.name, input.visibility, now, existing.id, ownerId).run();
    return c.json({ course: publicCourse({ ...existing, name: input.name, visibility: input.visibility }), existing: true });
  }

  const id = crypto.randomUUID();
  const slug = `${slugBase(input.name)}-${id.replaceAll('-', '').slice(0, 8)}`;
  const snapshotJson = JSON.stringify(sanitizePublishedSnapshot(snapshot, input.name));
  const sizeBytes = new TextEncoder().encode(snapshotJson).byteLength;
  const now = Date.now();
  await c.env.DB.prepare(`
    INSERT INTO published_courses
      (id, owner_id, slug, name, theme, course_hash, version, holes, par, snapshot_json, size_bytes, visibility, created_at, updated_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, ownerId, slug, input.name, input.theme, input.courseHash, input.holes, input.par, snapshotJson, sizeBytes, input.visibility, now, now, now).run();

  return c.json({
    course: publicCourse({ id, owner_id: ownerId, owner_name: c.get('user').displayName, slug, name: input.name, theme: input.theme, course_hash: input.courseHash, version: 1, holes: input.holes, par: input.par, visibility: input.visibility, published_at: now }),
    existing: false,
  }, 201);
}

export async function listCourses(c: Context<AppEnvironment>) {
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 24));
  const rows = await c.env.DB.prepare(`
    SELECT pc.id, pc.owner_id, u.display_name AS owner_name, pc.slug, pc.name, pc.theme, pc.course_hash,
           pc.version, pc.holes, pc.par, pc.visibility, pc.published_at
    FROM published_courses pc JOIN users u ON u.id = pc.owner_id
    WHERE pc.visibility = 'public' AND pc.archived_at IS NULL
    ORDER BY pc.published_at DESC LIMIT ?
  `).bind(limit).all<CourseRow>();
  return c.json({ courses: rows.results.map(publicCourse) });
}

export async function listMyCourses(c: Context<AppEnvironment>) {
  const rows = await c.env.DB.prepare(`
    SELECT pc.id, pc.owner_id, u.display_name AS owner_name, pc.slug, pc.name, pc.theme, pc.course_hash,
           pc.version, pc.holes, pc.par, pc.visibility, pc.published_at
    FROM published_courses pc JOIN users u ON u.id = pc.owner_id
    WHERE pc.owner_id = ? AND pc.archived_at IS NULL
    ORDER BY pc.updated_at DESC LIMIT 50
  `).bind(c.get('user').id).all<CourseRow>();
  return c.json({ courses: rows.results.map(publicCourse) });
}

export async function getCourse(c: Context<AppEnvironment>) {
  const row = await c.env.DB.prepare(`
    SELECT pc.*, u.display_name AS owner_name FROM published_courses pc JOIN users u ON u.id = pc.owner_id
    WHERE pc.slug = ? AND pc.archived_at IS NULL
  `).bind(c.req.param('slug')).first<CourseRow>();
  if (!row?.snapshot_json) throw new ApiError(404, 'course_not_found', 'That published course does not exist.');
  return c.json({ course: { ...publicCourse(row), snapshot: JSON.parse(row.snapshot_json) } });
}

export async function archiveCourse(c: Context<AppEnvironment>) {
  const result = await c.env.DB.prepare(`
    UPDATE published_courses SET archived_at = ?, updated_at = ?
    WHERE slug = ? AND owner_id = ? AND archived_at IS NULL
  `).bind(Date.now(), Date.now(), c.req.param('slug'), c.get('user').id).run();
  if (result.meta.changes !== 1) throw new ApiError(404, 'course_not_found', 'That published course was not found in your account.');
  return c.body(null, 204);
}

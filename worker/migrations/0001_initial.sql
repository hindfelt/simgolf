PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  deleted_at INTEGER
) STRICT;

CREATE INDEX users_email_idx ON users(email COLLATE NOCASE);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
) STRICT;

CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE cloud_saves (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot TEXT NOT NULL CHECK(length(slot) BETWEEN 1 AND 24),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 50),
  revision INTEGER NOT NULL CHECK(revision >= 1),
  course_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 750000),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, slot)
) STRICT;

CREATE INDEX cloud_saves_user_updated_idx ON cloud_saves(user_id, updated_at DESC);

CREATE TABLE published_courses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 50),
  theme TEXT NOT NULL CHECK(theme IN ('parklands', 'links', 'desert', 'tropical')),
  course_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  holes INTEGER NOT NULL CHECK(holes BETWEEN 1 AND 18),
  par INTEGER NOT NULL CHECK(par BETWEEN 1 AND 120),
  snapshot_json TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 750000),
  visibility TEXT NOT NULL CHECK(visibility IN ('public', 'unlisted')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  archived_at INTEGER,
  UNIQUE(owner_id, course_hash)
) STRICT;

CREATE INDEX published_courses_public_idx
  ON published_courses(visibility, archived_at, published_at DESC);
CREATE INDEX published_courses_owner_idx
  ON published_courses(owner_id, updated_at DESC);

CREATE TABLE competitions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('daily', 'weekly', 'tournament')),
  course_id TEXT NOT NULL REFERENCES published_courses(id),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  rules_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK(ends_at > starts_at)
) STRICT;

CREATE INDEX competitions_window_idx ON competitions(starts_at, ends_at, kind);

CREATE TABLE round_submissions (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  course_hash TEXT NOT NULL,
  holes INTEGER NOT NULL CHECK(holes BETWEEN 1 AND 18),
  par INTEGER NOT NULL CHECK(par BETWEEN 1 AND 120),
  strokes INTEGER NOT NULL CHECK(strokes BETWEEN 1 AND 400),
  score_to_par INTEGER NOT NULL,
  penalties INTEGER NOT NULL CHECK(penalties BETWEEN 0 AND 200),
  duration_seconds INTEGER NOT NULL CHECK(duration_seconds BETWEEN 1 AND 86400),
  card_json TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK(verification_status IN ('provisional', 'verified', 'rejected')),
  submitted_at INTEGER NOT NULL,
  UNIQUE(competition_id, user_id, round_id)
) STRICT;

CREATE INDEX round_submissions_rank_idx
  ON round_submissions(competition_id, verification_status, score_to_par, strokes, penalties, duration_seconds, submitted_at);
CREATE INDEX round_submissions_user_idx
  ON round_submissions(user_id, submitted_at DESC);

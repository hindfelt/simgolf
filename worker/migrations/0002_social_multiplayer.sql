ALTER TABLE users ADD COLUMN profile_slug TEXT;
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN discoverable INTEGER NOT NULL DEFAULT 1 CHECK(discoverable IN (0, 1));

UPDATE users
SET profile_slug = 'player-' || lower(substr(replace(id, '-', ''), 1, 12))
WHERE profile_slug IS NULL;

CREATE UNIQUE INDEX users_profile_slug_idx ON users(profile_slug) WHERE profile_slug IS NOT NULL;
CREATE INDEX users_discovery_idx ON users(discoverable, display_name COLLATE NOCASE);

ALTER TABLE round_submissions ADD COLUMN attempt_policy TEXT NOT NULL DEFAULT 'unlimited'
  CHECK(attempt_policy IN ('unlimited', 'single'));
CREATE UNIQUE INDEX round_submissions_single_attempt_idx
  ON round_submissions(competition_id, user_id) WHERE attempt_policy = 'single';

CREATE TABLE follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(follower_id, followed_id),
  CHECK(follower_id != followed_id)
) STRICT;

CREATE INDEX follows_followed_idx ON follows(followed_id, created_at DESC);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  invite_code TEXT NOT NULL UNIQUE,
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES published_courses(id),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 80),
  status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'completed', 'declined', 'cancelled', 'expired')),
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER,
  CHECK(creator_id != opponent_id),
  CHECK(expires_at > created_at)
) STRICT;

CREATE INDEX challenges_creator_idx ON challenges(creator_id, created_at DESC);
CREATE INDEX challenges_opponent_idx ON challenges(opponent_id, created_at DESC);
CREATE INDEX challenges_status_expiry_idx ON challenges(status, expires_at);

CREATE TABLE challenge_submissions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
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
  UNIQUE(challenge_id, user_id),
  UNIQUE(challenge_id, user_id, round_id)
) STRICT;

CREATE INDEX challenge_submissions_result_idx
  ON challenge_submissions(challenge_id, verification_status, score_to_par, strokes, penalties, duration_seconds, submitted_at);

CREATE TABLE profile_rounds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id TEXT NOT NULL,
  course_hash TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('exhibition', 'tournament', 'daily', 'weekly', 'challenge')),
  completed_at INTEGER NOT NULL,
  score_to_par INTEGER NOT NULL,
  strokes INTEGER NOT NULL,
  record_json TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 120000),
  imported_at INTEGER NOT NULL,
  UNIQUE(user_id, round_id)
) STRICT;

CREATE INDEX profile_rounds_user_completed_idx ON profile_rounds(user_id, completed_at DESC, id);

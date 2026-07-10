CREATE TABLE competition_finalizations (
  competition_id TEXT PRIMARY KEY REFERENCES competitions(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL,
  finalized_at INTEGER NOT NULL
) STRICT;

CREATE TABLE competition_awards (
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL,
  competition_kind TEXT NOT NULL CHECK(competition_kind IN ('daily', 'weekly', 'tournament')),
  rank INTEGER NOT NULL CHECK(rank BETWEEN 1 AND 100),
  points INTEGER NOT NULL CHECK(points > 0),
  awarded_at INTEGER NOT NULL,
  PRIMARY KEY(competition_id, user_id)
) STRICT;

CREATE INDEX competition_awards_season_rank_idx
  ON competition_awards(season_id, points DESC, rank, awarded_at);
CREATE INDEX competition_awards_user_idx
  ON competition_awards(user_id, season_id, awarded_at DESC);

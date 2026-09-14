CREATE TABLE earnings_competitions (
 id TEXT PRIMARY KEY, owner_id TEXT, title TEXT NOT NULL, initial_state TEXT NOT NULL,
 duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 10 AND 120),
 capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 16),
 status TEXT NOT NULL CHECK(status IN ('registration','running','complete','cancelled')),
 starts_at INTEGER, ends_at INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE earnings_entries (
 competition_id TEXT NOT NULL, player_id TEXT NOT NULL, player_name TEXT NOT NULL,
 course_id TEXT NOT NULL UNIQUE, joined_at INTEGER NOT NULL,
 withdrawn INTEGER NOT NULL DEFAULT 0 CHECK(withdrawn IN (0,1)), result TEXT,
 PRIMARY KEY(competition_id,player_id)
);
CREATE INDEX earnings_entries_player ON earnings_entries(player_id);

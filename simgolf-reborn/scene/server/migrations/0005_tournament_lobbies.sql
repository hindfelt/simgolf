CREATE TABLE tournaments (
 id TEXT PRIMARY KEY,
 owner_id TEXT,
 title TEXT NOT NULL,
 publication_id TEXT NOT NULL,
 course_digest TEXT NOT NULL,
 course_author_id TEXT,
 course_author_name TEXT NOT NULL,
 course_package TEXT NOT NULL,
 rounds INTEGER NOT NULL CHECK(rounds BETWEEN 1 AND 4),
 capacity INTEGER NOT NULL CHECK(capacity BETWEEN 2 AND 64),
 seed INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('registration','locked','cancelled')),
 created_at INTEGER NOT NULL
);
CREATE INDEX tournaments_created ON tournaments(created_at DESC,id);
CREATE TABLE tournament_entries (
 tournament_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 player_name TEXT NOT NULL,
 joined_at INTEGER NOT NULL,
 PRIMARY KEY(tournament_id,player_id)
);
CREATE INDEX tournament_entries_player ON tournament_entries(player_id);

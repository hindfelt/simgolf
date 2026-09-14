ALTER TABLE tournament_entries ADD COLUMN withdrawn INTEGER NOT NULL DEFAULT 0 CHECK(withdrawn IN (0,1));
CREATE TABLE tournament_rounds (
 tournament_id TEXT NOT NULL,
 player_id TEXT NOT NULL,
 round_number INTEGER NOT NULL CHECK(round_number BETWEEN 1 AND 4),
 state TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 0,
 clock_ms INTEGER NOT NULL,
 result TEXT,
 PRIMARY KEY(tournament_id,player_id,round_number)
);
CREATE INDEX tournament_rounds_player ON tournament_rounds(player_id);

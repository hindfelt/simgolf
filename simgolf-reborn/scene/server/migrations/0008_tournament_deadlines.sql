ALTER TABLE tournaments ADD COLUMN duration_hours INTEGER NOT NULL DEFAULT 168 CHECK(duration_hours BETWEEN 1 AND 720);
ALTER TABLE tournaments ADD COLUMN ends_at INTEGER;
ALTER TABLE tournament_entries ADD COLUMN withdrawal_reason TEXT CHECK(withdrawal_reason IN ('withdrawn','deadline','account-deleted'));
UPDATE tournament_entries SET withdrawal_reason=CASE WHEN player_name='Former player' THEN 'account-deleted' ELSE 'withdrawn' END WHERE withdrawn=1;
-- Existing unfinished events get a full week from migration, not a retroactive cutoff.
UPDATE tournaments SET ends_at=unixepoch()*1000+604800000 WHERE status='locked' AND NOT EXISTS(SELECT 1 FROM tournament_results f WHERE f.tournament_id=tournaments.id);
CREATE INDEX tournaments_deadline ON tournaments(status,ends_at);

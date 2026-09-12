ALTER TABLE tournaments ADD COLUMN starts_at INTEGER;
CREATE INDEX tournaments_scheduled ON tournaments(status,starts_at);

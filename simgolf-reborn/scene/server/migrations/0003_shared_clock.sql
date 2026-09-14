ALTER TABLE shared_courses ADD COLUMN clock_ms INTEGER NOT NULL DEFAULT 0;
UPDATE shared_courses SET clock_ms=created_at;

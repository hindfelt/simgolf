CREATE TABLE shared_courses(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX shared_courses_owner ON shared_courses(owner_id);
CREATE TABLE course_members(course_id TEXT NOT NULL, player_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('editor','spectator')), PRIMARY KEY(course_id,player_id));
CREATE INDEX course_members_player ON course_members(player_id);

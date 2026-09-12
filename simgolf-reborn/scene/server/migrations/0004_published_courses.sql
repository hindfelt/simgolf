CREATE TABLE published_courses (
 id TEXT PRIMARY KEY,
 course_id TEXT NOT NULL,
 author_id TEXT NOT NULL,
 title TEXT NOT NULL,
 digest TEXT NOT NULL,
 ruleset TEXT NOT NULL,
 design_revision INTEGER NOT NULL,
 package TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 UNIQUE(course_id,digest)
);
CREATE INDEX published_courses_created ON published_courses(created_at DESC,id);
CREATE INDEX published_courses_author ON published_courses(author_id);

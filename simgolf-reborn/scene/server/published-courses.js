import {restore} from '../src/simulation/game.js';
import {exportCourse} from '../src/simulation/course-package.js';
import {fail} from './security.js';
const fields='v.id,v.course_id AS courseId,v.author_id AS authorId,v.title,v.digest,v.ruleset,v.design_revision AS designRevision,v.created_at AS createdAt';
export async function publishCourse(db,courseId,playerId,expectedRevision){
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw fail(400,'A design revision is required.');
 for(let attempt=0;attempt<5;attempt++){
  const row=await db.prepare('SELECT c.* FROM shared_courses c JOIN players p ON p.id=c.owner_id WHERE c.id=? AND c.owner_id=? AND p.disabled_at IS NULL').bind(courseId,playerId).first();
  if(!row)throw fail(403,'Only the active course owner can publish it.');
  const game=restore(row.state);
  if(game.protocol.revision!==expectedRevision)throw fail(409,'The course changed. Review it before publishing.');
  let pkg;try{pkg=await exportCourse(game,row.name);}catch{throw fail(400,'Complete every hole and its walkable routes before publishing.');}
  const old=await db.prepare('SELECT id FROM published_courses WHERE course_id=? AND digest=?').bind(courseId,pkg.digest).first();
  if(old)return getPublishedCourse(db,old.id);
  const id=crypto.randomUUID();
  // Publication fences concurrent edits and account deletion/suspension. The
  // server creates the package; no submitted geometry, money or scores enter it.
  const result=await db.prepare('INSERT OR IGNORE INTO published_courses(id,course_id,author_id,title,digest,ruleset,design_revision,package,created_at) SELECT ?,c.id,c.owner_id,?,?,?,?,?,? FROM shared_courses c JOIN players p ON p.id=c.owner_id WHERE c.id=? AND c.revision=? AND c.owner_id=? AND p.disabled_at IS NULL RETURNING id').bind(id,pkg.content.title,pkg.digest,pkg.content.ruleset,expectedRevision,JSON.stringify(pkg),Date.now(),courseId,row.revision,playerId).first();
  if(result)return getPublishedCourse(db,id);
 }
 throw fail(409,'The course is busy. Review and retry publication.');
}
export async function listPublishedCourses(db){
 return (await pagePublishedCourses(db)).courses;
}
export async function pagePublishedCourses(db,cursor=null,courseId=null){
 if(courseId!==null&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(courseId))throw fail(400,'Invalid course history ID.');
 let after=null;
 if(cursor!==null){
  const match=/^(\d{1,16}):([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.exec(cursor);
  if(!match||!Number.isSafeInteger(Number(match[1])))throw fail(400,'Invalid course page cursor.');
  after={time:Number(match[1]),id:match[2]};
 }
 const query=db.prepare(`SELECT ${fields},p.name AS authorName FROM published_courses v JOIN players p ON p.id=v.author_id WHERE p.disabled_at IS NULL ${courseId?'AND v.course_id = ?':''} ${after?'AND (v.created_at < ? OR (v.created_at = ? AND v.id > ?))':''} ORDER BY v.created_at DESC,v.id LIMIT 101`);
 const args=[...(courseId?[courseId]:[]),...(after?[after.time,after.time,after.id]:[])];
 const rows=(await (args.length?query.bind(...args):query).all()).results;
 const courses=rows.slice(0,100),last=courses.at(-1);
 return {courses,nextCursor:rows.length>100?`${last.createdAt}:${last.id}`:null};
}
export async function getPublishedCourse(db,id){
 const row=await db.prepare(`SELECT ${fields},p.name AS authorName,v.package FROM published_courses v JOIN players p ON p.id=v.author_id WHERE v.id=? AND p.disabled_at IS NULL`).bind(id).first();
 if(!row)throw fail(404,'Published course not found.');
 return {...row,package:JSON.parse(row.package)};
}

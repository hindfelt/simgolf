import {beforeEach,test,expect} from 'vitest';
import {env} from 'cloudflare:workers';
import {createSharedCourse,setCourseMember} from './shared-courses.js';
import {publishCourse,getPublishedCourse,listPublishedCourses,pagePublishedCourses} from './published-courses.js';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {restore,serialize} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';
import {importCourse} from '../src/simulation/course-package.js';
import worker from './worker.js';
import {hash,names} from './security.js';
const owner='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',editor='ffffffff-ffff-4fff-8fff-ffffffffffff';
beforeEach(async()=>{
 for(const table of ['published_courses','course_members','shared_courses','sessions','players','rate_limits'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 for(const id of [owner,editor])await env.DB.prepare('INSERT INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(id,'Course author',id+'@proton.me',Date.now()).run();
});
async function ready(){
 const course=await createSharedCourse(env.DB,owner,'Tournament links'),game=createPlaytestCourse();createSession(game);
 await env.DB.prepare('UPDATE shared_courses SET state=?,revision=revision+1 WHERE id=?').bind(serialize(game),course.id).run();
 return {course,game};
}
test('course pages retain tied timestamps and stay stable after new publications',async()=>{
 const {course,game}=await ready(),source=await publishCourse(env.DB,course.id,owner,game.protocol.revision);
 const ids=Array.from({length:104},()=>crypto.randomUUID()).sort();
 await env.DB.batch(ids.map((id,i)=>env.DB.prepare('INSERT INTO published_courses(id,course_id,author_id,title,digest,ruleset,design_revision,package,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,course.id,owner,'Archive '+i,'archive-'+i,source.ruleset,0,JSON.stringify(source.package),1000)));
 const first=await pagePublishedCourses(env.DB);expect(first.courses).toHaveLength(100);expect(first.nextCursor).toBeTruthy();
 const seen=first.courses.map(c=>c.id);
 // Removing the cursor row must not invalidate the next page, and a new
 // publication above the cursor must not duplicate or displace older rows.
 await env.DB.prepare('DELETE FROM published_courses WHERE id=?').bind(seen.at(-1)).run();
 await env.DB.prepare('INSERT INTO published_courses(id,course_id,author_id,title,digest,ruleset,design_revision,package,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),course.id,owner,'Newest','newest',source.ruleset,0,JSON.stringify(source.package),Date.now()+1000).run();
 const second=await pagePublishedCourses(env.DB,first.nextCursor);
 expect(second.courses).toHaveLength(5);expect(second.nextCursor).toBeNull();
 expect(new Set([...seen,...second.courses.map(c=>c.id)]).size).toBe(105);
 expect([...seen,...second.courses.map(c=>c.id)].sort()).toEqual([source.id,...ids].sort());
 await expect(pagePublishedCourses(env.DB,'broken')).rejects.toMatchObject({status:400});
});
test('publication is playable, server-authored, idempotent and excludes private resort state',async()=>{
 const {course,game}=await ready();const version=await publishCourse(env.DB,course.id,owner,game.protocol.revision);
 expect(version.authorId).toBe(owner);expect(version.title).toBe('Tournament links');
 expect(await importCourse(JSON.stringify(version.package))).toEqual(version.package);
 for(const key of ['cash','staff','guests','pro','ledger','protocol'])expect(version.package.content).not.toHaveProperty(key);
 expect((await publishCourse(env.DB,course.id,owner,game.protocol.revision)).id).toBe(version.id);
 expect(await listPublishedCourses(env.DB)).toHaveLength(1);
});
test('later design edits create a new version and cannot rewrite the published layout',async()=>{
 const {course,game}=await ready(),first=await publishCourse(env.DB,course.id,owner,game.protocol.revision);
 const host=createSession(game);expect(host.execute(host.nextCommand(owner,'build',{tool:'bench',c:20,r:20,brush:1,holeId:'hole-1'}),{id:owner,role:'owner'}).ok).toBe(true);
 await env.DB.prepare('UPDATE shared_courses SET state=?,revision=revision+1 WHERE id=?').bind(serialize(game),course.id).run();
 await expect(publishCourse(env.DB,course.id,owner,0)).rejects.toMatchObject({status:409});
 const next=await publishCourse(env.DB,course.id,owner,game.protocol.revision);
 expect(next.digest).not.toBe(first.digest);expect(next.id).not.toBe(first.id);
 expect((await getPublishedCourse(env.DB,first.id)).package).toEqual(first.package);
});
test('editors cannot publish; incomplete layouts and suspended authors are rejected',async()=>{
 const initial=await createSharedCourse(env.DB,owner,'Unfinished');await setCourseMember(env.DB,initial.id,owner,editor,'editor');
 await expect(publishCourse(env.DB,initial.id,editor,0)).rejects.toMatchObject({status:403});
 await expect(publishCourse(env.DB,initial.id,owner,0)).rejects.toMatchObject({status:400});
 const {course,game}=await ready(),version=await publishCourse(env.DB,course.id,owner,game.protocol.revision);
 await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),owner).run();
 expect(await listPublishedCourses(env.DB)).toEqual([]);await expect(getPublishedCourse(env.DB,version.id)).rejects.toMatchObject({status:404});
});
test('HTTP publication requires a session and CSRF, rejects supplied packages, and account deletion removes publications',async()=>{
 const {course,game}=await ready(),origin='https://simgolfer.example',token=crypto.randomUUID(),csrf=crypto.randomUUID();
 await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(token),owner,csrf,Date.now()+60000).run();
 const headers={origin,cookie:`${names.session}=${token}`,'x-csrf-token':csrf,'content-type':'application/json'};
 const call=(path,options={})=>worker.fetch(new Request(origin+path,options),env);
 expect((await call('/api/published-courses')).status).toBe(401);
 const path=`/api/courses/${course.id}/publish`,body=JSON.stringify({expectedRevision:game.protocol.revision});
 expect((await call(path,{method:'POST',headers:{...headers,'x-csrf-token':'wrong'},body})).status).toBe(403);
 expect((await call(path,{method:'POST',headers,body:JSON.stringify({expectedRevision:0,package:{cash:999999}})})).status).toBe(400);
 const result=await call(path,{method:'POST',headers,body});expect(result.status).toBe(201);const version=await result.json();
 expect((await call('/api/published-courses/'+version.id,{headers})).status).toBe(200);
 expect((await call('/api/account',{method:'DELETE',headers,body:JSON.stringify({confirm:'DELETE'})})).status).toBe(200);
 expect(await env.DB.prepare('SELECT id FROM published_courses WHERE id=?').bind(version.id).first()).toBeNull();
});

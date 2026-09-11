import {beforeEach,expect,test} from 'vitest';
import {env} from 'cloudflare:workers';
import {createSession} from '../src/simulation/session.js';
import {restore} from '../src/simulation/game.js';
import {createSharedCourse,getSharedCourse,listSharedCourses,setCourseMember,executeSharedCommand} from './shared-courses.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',editor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',spectator='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const command=(course,actor,type='build',payload={tool:'bench',c:12,r:12,brush:1,holeId:'hole-1'})=>createSession(restore(JSON.stringify(course.state))).nextCommand(actor,type,payload);
beforeEach(async()=>{
 for(const table of ['course_members','shared_courses','players'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 for(const id of [owner,editor,spectator])await env.DB.prepare('INSERT INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(id,'Golfer',id+'@proton.me',Date.now()).run();
});
test('shared courses start with server funds and are private until explicitly shared',async()=>{
 const course=await createSharedCourse(env.DB,owner,'Shared links');
 expect(course.state.cash).toBe(50000);expect(course.role).toBe('owner');
 await expect(getSharedCourse(env.DB,course.id,editor)).rejects.toMatchObject({status:404});
 expect(await listSharedCourses(env.DB,editor)).toEqual([]);
 await setCourseMember(env.DB,course.id,owner,editor,'editor');
 expect((await getSharedCourse(env.DB,course.id,editor)).role).toBe('editor');
 expect((await listSharedCourses(env.DB,editor))[0].id).toBe(course.id);
 await expect(setCourseMember(env.DB,course.id,editor,spectator,'editor')).rejects.toMatchObject({status:403});
});
test('simultaneous purchases resolve against one server state and receipts survive reconnect',async()=>{
 const initial=await createSharedCourse(env.DB,owner,'Race');await setCourseMember(env.DB,initial.id,owner,editor,'editor');
 const a=command(initial,owner),b=command(initial,editor,'build',{tool:'bench',c:13,r:12,brush:1,holeId:'hole-1'});
 const outcomes=await Promise.all([executeSharedCommand(env.DB,initial.id,owner,a),executeSharedCommand(env.DB,initial.id,editor,b)]);
 expect(outcomes.filter(x=>x.result.ok)).toHaveLength(1);expect(outcomes.filter(x=>x.result.code==='conflict')).toHaveLength(1);
 const loaded=await getSharedCourse(env.DB,initial.id,owner),cash=loaded.state.cash;
 expect(cash).toBeLessThan(initial.state.cash);
 const repeated=await executeSharedCommand(env.DB,initial.id,owner,a);expect(repeated.result).toEqual(outcomes[0].result);
 expect((await getSharedCourse(env.DB,initial.id,owner)).state.cash).toBe(cash);
 const retry=command(await getSharedCourse(env.DB,initial.id,editor),editor,'build',{tool:'bench',c:14,r:12,brush:1,holeId:'hole-1'});
 expect((await executeSharedCommand(env.DB,initial.id,editor,retry)).result.ok).toBe(true);
});
test('spectators, forged actors, state imports and revoked editors cannot change the course',async()=>{
 const course=await createSharedCourse(env.DB,owner,'Permissions');await setCourseMember(env.DB,course.id,owner,spectator,'spectator');
 expect((await executeSharedCommand(env.DB,course.id,spectator,command(course,spectator))).result.code).toBe('forbidden');
 expect((await executeSharedCommand(env.DB,course.id,spectator,command(course,owner))).result.code).toBe('invalid-command');
 await expect(executeSharedCommand(env.DB,course.id,owner,{type:'load-golfer',payload:{cash:999999}})).rejects.toMatchObject({status:400});
 await setCourseMember(env.DB,course.id,owner,editor,'editor');const prepared=command(course,editor);await setCourseMember(env.DB,course.id,owner,editor,null);
 await expect(executeSharedCommand(env.DB,course.id,editor,prepared)).rejects.toMatchObject({status:404});
 expect((await getSharedCourse(env.DB,course.id,owner)).state.cash).toBe(course.state.cash);
});
test('suspension blocks shared access and command execution',async()=>{
 const course=await createSharedCourse(env.DB,owner,'Suspension');await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),owner).run();
 await expect(getSharedCourse(env.DB,course.id,owner)).rejects.toMatchObject({status:403});
 await expect(executeSharedCommand(env.DB,course.id,owner,command(course,owner))).rejects.toMatchObject({status:403});
});

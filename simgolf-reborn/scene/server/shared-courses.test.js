import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {env} from 'cloudflare:workers';
import {createSession} from '../src/simulation/session.js';
import {createGame,build,openHole,restore,serialize} from '../src/simulation/game.js';
import {createSharedCourse,getSharedCourse,listSharedCourses,setCourseMember,executeSharedCommand} from './shared-courses.js';
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',editor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',spectator='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const command=(course,actor,type='build',payload={tool:'bench',c:12,r:12,brush:1,holeId:'hole-1'})=>createSession(restore(JSON.stringify(course.state))).nextCommand(actor,type,payload);
beforeEach(async()=>{
 for(const table of ['course_members','shared_courses','players'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 for(const id of [owner,editor,spectator])await env.DB.prepare('INSERT INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(id,'Golfer',id+'@proton.me',Date.now()).run();
});
afterEach(()=>vi.restoreAllMocks());
test('concurrent readers advance server time once and reproduce exact simulation state',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const initial=await createSharedCourse(env.DB,owner,'Clock');
 const expected=restore(JSON.stringify(initial.state));createSession(expected).stepTicks(20);
 now+=1000;
 await Promise.all([getSharedCourse(env.DB,initial.id,owner),getSharedCourse(env.DB,initial.id,owner)]);
 const result=await getSharedCourse(env.DB,initial.id,owner);
 expect(result.state.protocol.tick).toBe(20);expect(result.pendingTicks).toBe(0);
 expect(result.state).toEqual(JSON.parse(serialize(expected)));
});
test('bounded catch-up retains downtime and defers commands until the server reaches the present',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const initial=await createSharedCourse(env.DB,owner,'Catch up'),purchase=command(initial,owner);
 now+=20000;
 const first=await executeSharedCommand(env.DB,initial.id,owner,purchase);
 expect(first.result.code).toBe('catching-up');expect(first.course.pendingTicks).toBe(280);expect(first.course.state.protocol.clients).toHaveLength(0);
 await getSharedCourse(env.DB,initial.id,owner);await getSharedCourse(env.DB,initial.id,owner);
 const completed=await executeSharedCommand(env.DB,initial.id,owner,purchase);
 expect(completed.result.ok).toBe(true);expect(completed.course.pendingTicks).toBe(0);expect(completed.course.state.protocol.tick).toBe(400);
 const expected=restore(JSON.stringify(initial.state)),host=createSession(expected);host.stepTicks(400);host.execute(purchase,{id:owner,role:'owner'});
 expect(completed.course.state).toEqual(JSON.parse(serialize(expected)));
});
test('fractional ticks survive membership changes and a backward wall clock never reverses time',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const initial=await createSharedCourse(env.DB,owner,'Remainder');now+=43;
 await setCourseMember(env.DB,initial.id,owner,editor,'editor');expect((await getSharedCourse(env.DB,initial.id,owner)).state.protocol.tick).toBe(0);
 now+=57;expect((await getSharedCourse(env.DB,initial.id,editor)).state.protocol.tick).toBe(2);
 now-=5000;expect((await getSharedCourse(env.DB,initial.id,owner)).state.protocol.tick).toBe(2);
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

// Course layout is a server-side fixture; all play and payment happens through
// the production D1-backed clock/host path, without client-submitted results.
test('shared host books the flat Airstrip fee once and preserves it for both members',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const course=await createSharedCourse(env.DB,owner,'Airstrip fees');await setCourseMember(env.DB,course.id,owner,editor,'editor');
 const game=createGame();game.cash=50000;
 expect(build(game,'tee',7,20).ok).toBe(true);expect(build(game,'green',36,22).ok).toBe(true);
 for(let c=11;c<=31;c++)expect(build(game,'fairway',c,21,3).ok).toBe(true);
 expect(build(game,'airstrip',22,15).ok).toBe(true);
 for(let c=7;c<=22;c++)expect(build(game,'path',c,11).ok).toBe(true);
 expect(openHole(game).ok).toBe(true);createSession(game);
 await env.DB.prepare('UPDATE shared_courses SET state=? WHERE id=?').bind(serialize(game),course.id).run();
 let current;
 for(let i=0;i<134;i++){
  now+=6000;current=await getSharedCourse(env.DB,course.id,owner);
  if(current.state.rounds.length)break;
 }
 expect(current.state.rounds.length).toBeGreaterThan(0);
 const score=current.state.rounds[0].scorecard[0];
 expect(score.feeRule).toBe('signed-happiness-v1');expect(score.airstripBonus).toBe(100);expect(score.fee).toBe(score.happiness*100+100);
 const paid=current.state.ledger.filter(r=>r.amount===score.fee&&r.reason.includes('green fee'));
 expect(paid.length).toBeGreaterThan(0);
 const [a,b]=await Promise.all([getSharedCourse(env.DB,course.id,owner),getSharedCourse(env.DB,course.id,editor)]);
 expect(a.state).toEqual(current.state);expect(b.state).toEqual(current.state);
 expect(restore(serialize(a.state)).rounds[0].scorecard[0]).toEqual(score);
},20000);

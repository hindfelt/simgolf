import {test,expect,beforeEach,afterEach,vi} from 'vitest';
import {env} from 'cloudflare:workers';
import {runInDurableObject,runDurableObjectAlarm} from 'cloudflare:test';
import {createEarningsCompetition,joinEarningsCompetition,startEarningsCompetition,getEarningsCompetition,leaveEarningsCompetition,cancelEarningsCompetition} from './earnings-competitions.js';
import {getSharedCourse,executeSharedCommand,setCourseMember,listSharedCourses} from './shared-courses.js';
import {createSession} from '../src/simulation/session.js';
import {restore} from '../src/simulation/game.js';
import {cellAt} from '../src/simulation/world.js';
import worker from './worker.js';import {hash,names} from './security.js';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
beforeEach(async()=>{for(const table of ['sessions','earnings_entries','earnings_competitions','course_members','shared_courses','players'])await env.DB.prepare(`DELETE FROM ${table}`).run();for(const id of [a,b,c])await env.DB.prepare('INSERT INTO players(id,name,created_at) VALUES (?,?,?)').bind(id,id===a?'Alice':id===b?'Bob':'Carol',Date.now()).run();});
afterEach(()=>vi.restoreAllMocks());
const command=(s,id,type,payload)=>createSession(restore(JSON.stringify(s.state))).nextCommand(id,type,payload);
async function setup(){const e=await createEarningsCompetition(env.DB,a,{title:'Builders cup',durationMinutes:10,capacity:2});await joinEarningsCompetition(env.DB,e.id,b);return startEarningsCompetition(env.DB,e.id,a);}
test('competition capacity is atomic and every entrant starts with identical server land and funds',async()=>{
 vi.spyOn(Date,'now').mockReturnValue(1800000000000);
 const e=await createEarningsCompetition(env.DB,a,{title:'Equal start',durationMinutes:10,capacity:2});
 const joins=await Promise.allSettled([b,c].map(id=>joinEarningsCompetition(env.DB,e.id,id)));expect(joins.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const event=await startEarningsCompetition(env.DB,e.id,a),first=await getSharedCourse(env.DB,event.entries[0].courseId,event.entries[0].id),second=await getSharedCourse(env.DB,event.entries[1].courseId,event.entries[1].id);
 expect((await listSharedCourses(env.DB,a)).find(c=>c.id===first.id)).toMatchObject({earningsId:event.id,role:'owner'});
 expect(first.state.cash).toBe(50000);expect(first.state).toEqual(second.state);expect(first.id).not.toBe(second.id);
 const retry=await startEarningsCompetition(env.DB,e.id,a);expect(retry.startsAt).toBe(event.startsAt);expect(retry.endsAt).toBe(event.endsAt);
 await expect(setCourseMember(env.DB,first.id,a,event.entries[1].id,'editor')).rejects.toMatchObject({status:403});
 await setCourseMember(env.DB,first.id,a,event.entries[1].id,'spectator');expect((await getSharedCourse(env.DB,first.id,event.entries[1].id)).role).toBe('spectator');
});
test('server competition stops at its deadline, records real fees, and idle properties cannot win',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);const event=await setup(),owned=event.entries.find(e=>e.id===a).courseId;let state=await getSharedCourse(env.DB,owned,a);
 for(const [tool,x,z] of [['tee',-29,7],['green',1,-13]]){const {c,r}=cellAt(x,z),reply=await executeSharedCommand(env.DB,owned,a,command(state,a,'build',{tool,c,r,brush:1,holeId:'hole-1'}));expect(reply.result.ok).toBe(true);state=reply.course;}
 const openCommand=command(state,a,'open-hole',{holeId:'hole-1'}),opened=await executeSharedCommand(env.DB,owned,a,openCommand);expect(opened.result.ok).toBe(true);
 now=event.endsAt+3600000;
 for(const entry of event.entries){let snapshot;for(let i=0;i<110;i++){snapshot=await getSharedCourse(env.DB,entry.courseId,entry.id);if(!snapshot.pendingTicks)break;}expect(snapshot.earnings.finished).toBe(true);expect(snapshot.state.protocol.tick).toBe(12000);expect(snapshot.role).toBe('spectator');}
 const final=await getEarningsCompetition(env.DB,event.id),winner=final.entries.find(e=>e.id===a),idle=final.entries.find(e=>e.id===b);
 expect(final.status).toBe('complete');expect(winner.rank).toBe(1);expect(winner.result.eligible).toBe(true);expect(winner.result.completedHoles).toBeGreaterThan(0);expect(winner.result.netCash).toBe(winner.result.income-winner.result.spending);expect(idle.rank).toBeNull();expect(idle.result.eligible).toBe(false);
 const before=await getSharedCourse(env.DB,owned,a);now+=86400000;expect((await executeSharedCommand(env.DB,owned,a,openCommand)).result).toEqual(opened.result);
 const denied=await executeSharedCommand(env.DB,owned,a,command(before,a,'build',{tool:'bench',c:12,r:12,brush:1,holeId:'hole-1'}));expect(denied.result.code).toBe('competition-closed');expect(denied.course.state).toEqual(before.state);expect(await getEarningsCompetition(env.DB,event.id)).toEqual(final);
 const token=crypto.randomUUID(),csrf=crypto.randomUUID(),origin='https://simgolfer.example';await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(token),a,csrf,now+60000).run();
 const deleted=await worker.fetch(new Request(origin+'/api/account',{method:'DELETE',headers:{origin,cookie:`${names.session}=${token}`,'x-csrf-token':csrf,'content-type':'application/json'},body:JSON.stringify({confirm:'DELETE'})}),env);expect(deleted.status).toBe(200);
 const retained=await getEarningsCompetition(env.DB,event.id);expect(retained.status).toBe('complete');expect(retained.entries.find(e=>e.id===a)).toMatchObject({name:'Former player',rank:1,result:winner.result,withdrawn:false});

},30000);
test('competition HTTP actions reject imported cash, identities and scores',async()=>{
 const token=crypto.randomUUID(),csrf=crypto.randomUUID(),origin='https://simgolfer.example';await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(token),a,csrf,Date.now()+60000).run();
 const post=(path,body)=>worker.fetch(new Request(origin+path,{method:'POST',headers:{origin,cookie:`${names.session}=${token}`,'x-csrf-token':csrf,'content-type':'application/json'},body:JSON.stringify(body)}),env);
 expect((await post('/api/earnings-competitions',{title:'Cheat',cash:1000000})).status).toBe(400);
 const event=await (await post('/api/earnings-competitions',{title:'Real',durationMinutes:10,capacity:2})).json();
 expect((await post(`/api/earnings-competitions/${event.id}/join`,{playerId:b})).status).toBe(400);
 expect((await post(`/api/earnings-competitions/${event.id}/start`,{score:9999})).status).toBe(400);
});

test('registration can be left or cancelled, while started events cannot be cancelled',async()=>{
 const event=await createEarningsCompetition(env.DB,a,{title:'Registration',durationMinutes:10,capacity:2});await joinEarningsCompetition(env.DB,event.id,b);
 await expect(startEarningsCompetition(env.DB,event.id,b)).rejects.toMatchObject({status:403});
 await leaveEarningsCompetition(env.DB,event.id,b);expect((await getEarningsCompetition(env.DB,event.id)).entries).toHaveLength(1);
 await expect(startEarningsCompetition(env.DB,event.id,a)).rejects.toMatchObject({status:409});await joinEarningsCompetition(env.DB,event.id,b);await startEarningsCompetition(env.DB,event.id,a);
 await expect(cancelEarningsCompetition(env.DB,event.id,a)).rejects.toMatchObject({status:409});await expect(leaveEarningsCompetition(env.DB,event.id,b)).rejects.toMatchObject({status:409});
 const other=await createEarningsCompetition(env.DB,a,{title:'Cancelled'});expect((await cancelEarningsCompetition(env.DB,other.id,a)).status).toBe('cancelled');await expect(startEarningsCompetition(env.DB,other.id,a)).rejects.toMatchObject({status:409});
});
test('suspended entrants are disqualified at the cutoff and cannot stall final standings',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);const event=await setup();await env.DB.prepare('UPDATE players SET disabled_at=?').bind(now).run();
 expect((await getEarningsCompetition(env.DB,event.id)).status).toBe('running');now=event.endsAt;
 const result=await getEarningsCompetition(env.DB,event.id);expect(result.status).toBe('complete');expect(result.entries.every(e=>e.withdrawn&&e.rank===null)).toBe(true);
});

test('background course host records the finish and stops scheduling after the cutoff',async()=>{
 const event=await setup(),entry=event.entries.find(e=>e.id===a),end=Date.now()-100;
 await env.DB.prepare('UPDATE earnings_competitions SET ends_at=? WHERE id=?').bind(end,event.id).run();await env.DB.prepare('UPDATE shared_courses SET clock_ms=? WHERE id=?').bind(end-50,entry.courseId).run();
 const stub=env.COURSE_SCHEDULERS.getByName(entry.courseId);await stub.start(entry.courseId);await runDurableObjectAlarm(stub);
 expect(await runInDurableObject(stub,async(_instance,state)=>state.storage.getAlarm())).toBeNull();
 const read=await stub.read(entry.courseId,a);expect(read.value.earnings.finished).toBe(true);expect(read.value.pendingTicks).toBe(0);expect(await runInDurableObject(stub,async(_instance,state)=>state.storage.getAlarm())).toBeNull();
 expect((await getEarningsCompetition(env.DB,event.id)).entries.find(e=>e.id===a).result).not.toBeNull();
});

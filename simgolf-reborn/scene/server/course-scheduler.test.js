import {beforeEach,expect,test} from 'vitest';
import {env} from 'cloudflare:workers';
import {runInDurableObject,runDurableObjectAlarm} from 'cloudflare:test';
import {createSharedCourse} from './shared-courses.js';
import {createSession} from '../src/simulation/session.js';
import {restore} from '../src/simulation/game.js';
const owner='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
beforeEach(async()=>{
 await env.DB.prepare('INSERT OR IGNORE INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(owner,'Scheduler owner','scheduler@proton.me',Date.now()).run();
 await env.DB.prepare('UPDATE players SET disabled_at=NULL WHERE id=?').bind(owner).run();
});
async function make(){
 const course=await createSharedCourse(env.DB,owner,'Background club'),stub=env.COURSE_SCHEDULERS.getByName(course.id);
 await stub.start(course.id);return {course,stub};
}
test('course RPC executes and retries one purchase without repeating its charge',async()=>{
 const {course,stub}=await make();
 const command=createSession(restore(JSON.stringify(course.state))).nextCommand(owner,'build',{tool:'bench',c:12,r:12,brush:1,holeId:'hole-1'});
 const first=await stub.command(course.id,owner,command);
 expect(first.ok).toBe(true);expect(first.value.result.ok).toBe(true);
 const retry=await stub.command(course.id,owner,command),loaded=await stub.read(course.id,owner);
 expect(retry.value.result).toEqual(first.value.result);
 expect(loaded.value.state.cash).toBe(first.value.course.state.cash);
 expect(loaded.value.state.cash).toBeLessThan(course.state.cash);
 await runInDurableObject(stub,async(_instance,state)=>state.storage.deleteAlarm());
});
test('course RPC rejects another course and suspended players and hides runtime errors',async()=>{
 const {course,stub}=await make();
 expect(await stub.read(crypto.randomUUID(),owner)).toMatchObject({ok:false,status:400});
 await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),owner).run();
 expect(await stub.read(course.id,owner)).toMatchObject({ok:false,status:403});
 const reply=await runInDurableObject(stub,async(instance,state)=>{
  const db=instance.env.DB;instance.env.DB={prepare(){throw Error('private database details');}};
  try{return await instance.read(course.id,owner);}finally{instance.env.DB=db;await state.storage.deleteAlarm();}
 });
 expect(reply).toMatchObject({ok:false,status:503});expect(reply.error).not.toContain('private database');
});
test('durable alarm advances an unattended course and schedules remaining catch-up',async()=>{
 const {course,stub}=await make();
 await env.DB.prepare('UPDATE shared_courses SET clock_ms=? WHERE id=?').bind(Date.now()-20000,course.id).run();
 expect(await runDurableObjectAlarm(stub)).toBe(true);
 const alarm=await runInDurableObject(stub,async(_instance,state)=>{const next=await state.storage.getAlarm();await state.storage.deleteAlarm();return next;});
 const row=await env.DB.prepare('SELECT state,clock_ms FROM shared_courses WHERE id=?').bind(course.id).first();
 expect(JSON.parse(row.state).protocol.tick).toBe(120);expect(alarm).not.toBeNull();expect(alarm-Date.now()).toBeLessThan(1000);
 expect(Date.now()-row.clock_ms).toBeGreaterThan(13000);
});
test('repeated starts preserve the earlier alarm and cannot reassign its course',async()=>{
 const {course,stub}=await make();
 const first=await runInDurableObject(stub,async(_instance,state)=>state.storage.getAlarm());await stub.start(course.id);
 const next=await runInDurableObject(stub,async(_instance,state)=>{const alarm=await state.storage.getAlarm();await state.storage.deleteAlarm();return alarm;});
 expect(next).toBe(first);expect(await stub.start(crypto.randomUUID())).toEqual({ok:false,error:'Scheduler already belongs to a different course.'});
});
test('deleted courses cancel their alarm and persistent scheduler identity',async()=>{
 const {course,stub}=await make();await env.DB.prepare('DELETE FROM shared_courses WHERE id=?').bind(course.id).run();
 await runDurableObjectAlarm(stub);
 const result=await runInDurableObject(stub,async(_instance,state)=>({alarm:await state.storage.getAlarm(),course:await state.storage.get('courseId')}));
 expect(result).toEqual({alarm:null,course:undefined});
});
test('suspended owners stop background progression while retaining a later check',async()=>{
 const {course,stub}=await make();await env.DB.prepare('UPDATE shared_courses SET clock_ms=? WHERE id=?').bind(Date.now()-20000,course.id).run();
 await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),owner).run();await runDurableObjectAlarm(stub);
 const next=await runInDurableObject(stub,async(_instance,state)=>{const alarm=await state.storage.getAlarm();await state.storage.deleteAlarm();return alarm;});
 const row=await env.DB.prepare('SELECT state FROM shared_courses WHERE id=?').bind(course.id).first();expect(JSON.parse(row.state).protocol.tick).toBe(0);expect(next-Date.now()).toBeGreaterThan(50000);
});
test('a database outage leaves a durable retry rather than exhausting alarm retries',async()=>{
 const {stub}=await make();
 const next=await runInDurableObject(stub,async(instance,state)=>{
  const db=instance.env.DB;instance.env.DB={prepare(){throw Error('Simulated unavailable database');}};
  try{await instance.alarm();return await state.storage.getAlarm();}finally{instance.env.DB=db;await state.storage.deleteAlarm();}
 });
 expect(next-Date.now()).toBeGreaterThan(20000);
});

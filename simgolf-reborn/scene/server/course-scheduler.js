import {settleEarningsCompetition} from './earnings-competitions.js';
import {DurableObject} from 'cloudflare:workers';
import {getSharedCourse,executeSharedCommand} from './shared-courses.js';
import {publishCourse} from './published-courses.js';

// One persistent alarm per course; no global timer or client-supplied clock.
export class CourseScheduler extends DurableObject {
 async read(courseId,playerId){return this.#request(courseId,playerId,'read');}
 async command(courseId,playerId,command){return this.#request(courseId,playerId,'command',command);}
 async publish(courseId,playerId,revision){return this.#request(courseId,playerId,'publish',revision);}
 async #request(courseId,playerId,operation,payload){
  try{
   const current=await this.ctx.storage.get('courseId');
   if(current&&current!==courseId)return {ok:false,status:400,error:'Course host mismatch.'};
   // The HTTP Worker supplies the authenticated player. The shared host still
   // reloads permissions and persisted state before any simulation or edit.
   const value=operation==='read'
    ? await getSharedCourse(this.env.DB,courseId,playerId)
    : operation==='publish'?await publishCourse(this.env.DB,courseId,playerId,payload)
    : await executeSharedCommand(this.env.DB,courseId,playerId,payload);
   const snapshot=operation==='command'?value.course:value;
   if(!snapshot.earnings?.finished&&!(await this.start(courseId)).ok)return {ok:false,status:503,error:'Course scheduling is unavailable.'};
   return {ok:true,value};
  }catch(error){
   // Explicit errors survive RPC without exposing database/runtime internals.
   const status=Number.isInteger(error.status)&&error.status>=400&&error.status<500?error.status:503;
   return {ok:false,status,error:status===503?'The shared course is temporarily unavailable. Retry the same edit.':error.message};
  }
 }
 async start(courseId){
  if(typeof courseId!=='string'||!/^[-a-f0-9]{36}$/.test(courseId))return {ok:false,error:'Invalid course ID.'};
  const accepted=await this.ctx.storage.transaction(async storage=>{
   const current=await storage.get('courseId');
   if(current&&current!==courseId)return false;
   await storage.put('courseId',courseId);
   if(await storage.getAlarm()===null)await storage.setAlarm(Date.now()+1000);
   return true;
  });
  return accepted?{ok:true}:{ok:false,error:'Scheduler already belongs to a different course.'};
 }
 async alarm(){
  const id=await this.ctx.storage.get('courseId');
  if(!id)return;
  // Retain a future attempt even if D1 is unavailable longer than the platform's
  // automatic alarm retries. Persisting time in D1 makes delivery idempotent.
  await this.ctx.storage.setAlarm(Date.now()+30000);
  try{
   const owner=await this.env.DB.prepare('SELECT c.owner_id,p.disabled_at,e.competition_id AS earnings_id,e.withdrawn,x.ends_at FROM shared_courses c JOIN players p ON p.id=c.owner_id LEFT JOIN earnings_entries e ON e.course_id=c.id LEFT JOIN earnings_competitions x ON x.id=e.competition_id WHERE c.id=?').bind(id).first();
   if(!owner){await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();return;}
   if(owner.withdrawn){await this.ctx.storage.deleteAlarm();return;}
   if(owner.disabled_at!==null&&owner.earnings_id&&Date.now()>=owner.ends_at){await settleEarningsCompetition(this.env.DB,owner.earnings_id);await this.ctx.storage.deleteAlarm();return;}
   if(owner.disabled_at!==null){await this.ctx.storage.setAlarm(Date.now()+60000);return;}
   const state=await getSharedCourse(this.env.DB,id,owner.owner_id);
   if(state.earnings?.finished){await this.ctx.storage.deleteAlarm();return;}
   await this.ctx.storage.setAlarm(Date.now()+(state.pendingTicks>0?100:5000));
  }catch{
   // No credentials or player data in logs. A later alarm reloads persisted time.
   console.error('Shared-course background advancement failed; retry scheduled.');
  }
 }
}

import {DurableObject} from 'cloudflare:workers';
import {getSharedCourse} from './shared-courses.js';

// One persistent alarm per course; no global timer or client-supplied clock.
export class CourseScheduler extends DurableObject {
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
   const owner=await this.env.DB.prepare('SELECT c.owner_id,p.disabled_at FROM shared_courses c JOIN players p ON p.id=c.owner_id WHERE c.id=?').bind(id).first();
   if(!owner){await this.ctx.storage.deleteAlarm();await this.ctx.storage.deleteAll();return;}
   if(owner.disabled_at!==null){await this.ctx.storage.setAlarm(Date.now()+60000);return;}
   const state=await getSharedCourse(this.env.DB,id,owner.owner_id);
   await this.ctx.storage.setAlarm(Date.now()+(state.pendingTicks>0?100:5000));
  }catch{
   // No credentials or player data in logs. A later alarm reloads persisted time.
   console.error('Shared-course background advancement failed; retry scheduled.');
  }
 }
}

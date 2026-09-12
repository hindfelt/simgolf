import {DurableObject} from 'cloudflare:workers';
import {advanceTournament} from './tournament-schedule.js';
import {sealTournament} from './tournament-results.js';
export class TournamentScheduler extends DurableObject {
 async start(id){
  if(!/^[-a-f0-9]{36}$/.test(id))throw Error('Invalid tournament ID.');
  const current=await this.ctx.storage.get('eventId');
  if(current&&current!==id)throw Error('Tournament scheduler mismatch.');
  await this.ctx.storage.put('eventId',id);
  await this.alarm();
 }
 async alarm(){
  const id=await this.ctx.storage.get('eventId');if(!id)return;
  // Leave a persistent retry before D1 work so extended outages cannot strand it.
  await this.ctx.storage.setAlarm(Date.now()+30000);
  await advanceTournament(this.env.DB,id);await sealTournament(this.env.DB,id);
  const event=await this.env.DB.prepare('SELECT t.*,r.tournament_id AS sealed FROM tournaments t LEFT JOIN tournament_results r ON r.tournament_id=t.id WHERE t.id=?').bind(id).first();
  if(!event||event.status==='cancelled'||event.sealed){await this.ctx.storage.deleteAlarm();return;}
  const next=event.status==='registration'?event.starts_at:event.ends_at;
  if(next)await this.ctx.storage.setAlarm(Math.max(Date.now()+1000,next));
  else await this.ctx.storage.deleteAlarm();
 }
}

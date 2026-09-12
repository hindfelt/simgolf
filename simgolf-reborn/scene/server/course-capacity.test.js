import {test,expect,vi} from 'vitest';
import {env} from 'cloudflare:workers';
import {runInDurableObject} from 'cloudflare:test';
import {createSharedCourse} from './shared-courses.js';
import {createGame,build,addHole,openHole,hire,serialize} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';

test.skipIf(!env.TEST_CAPACITY)('sixteen populated courses advance concurrently through real local hosts',async({annotate})=>{
 const game=createGame(),ok=r=>expect(r.ok,r.message).toBe(true);
 const layout=[[13,2,20,2],[24,2,24,9],[27,2,34,2],[30,2,30,9],[38,2,38,9],[16,4,16,11],[15,7,10,12],[34,7,34,14],[42,7,42,14],[20,9,20,16],[3,10,3,17],[34,10,29,15],[20,12,15,17],[3,13,8,18],[25,13,25,20],[38,15,33,20],[25,16,20,21],[37,18,37,25]];
 for(const [i,[tc,tr,gc,gr]] of layout.entries()){if(i)ok(addHole(game));const id=game.holes[i].id;ok(build(game,'tee',tc,tr,1,id));ok(build(game,'green',gc,gr,1,id));ok(openHole(game,id));}
 for(let i=0;i<16;i++)ok(hire(game,i<12?'technician':'consultant'));
 const simulation=createSession(game);for(let minute=0;minute<14;minute++)simulation.stepTicks(1200);const initial=serialize(game),courses=[],samples=[];let now=1800000000000;const clock=vi.spyOn(Date,'now').mockImplementation(()=>now);
 try{
  for(let i=0;i<16;i++){const player=crypto.randomUUID();await env.DB.prepare('INSERT INTO players(id,name,created_at) VALUES (?,?,?)').bind(player,'Capacity fixture '+i,now).run();const c=await createSharedCourse(env.DB,player,'Capacity fixture');await env.DB.prepare('UPDATE shared_courses SET state=?,clock_ms=? WHERE id=?').bind(initial,now,c.id).run();courses.push({id:c.id,player,stub:env.COURSE_SCHEDULERS.getByName(c.id)});}
  for(let batch=0;batch<3;batch++){
   now+=6000;const started=performance.now();const replies=await Promise.all(courses.map(async c=>{const start=performance.now(),reply=await c.stub.read(c.id,c.player);return {reply,elapsedMs:performance.now()-start};}));
   const wallMs=performance.now()-started;
   for(const {reply} of replies){expect(reply.ok).toBe(true);expect(reply.value.state.protocol.tick).toBe(16800+120*(batch+1));expect(reply.value.pendingTicks).toBe(0);}
   const states=replies.map(r=>r.reply.value.state);for(const state of states)expect(state).toEqual(states[0]);
   const times=replies.map(r=>r.elapsedMs).sort((a,b)=>a-b);samples.push({batch,wallMs,medianMs:times[8],p95Ms:times[15],visitorsPerCourse:states[0].guests.length});
  }
  await annotate('CAPACITY_RESULT '+JSON.stringify({scope:'Local Workerd/D1/DO elapsed time; not hosted CPU, billing or capacity guarantee',courses:16,holesPerCourse:18,staffPerCourse:16,initialVisitorsPerCourse:game.guests.length,initialSnapshotBytes:new TextEncoder().encode(initial).length,batchTicks:120,samples}));
 }finally{clock.mockRestore();await Promise.all(courses.map(c=>runInDurableObject(c.stub,async(_instance,state)=>state.storage.deleteAlarm())));}
},120000);

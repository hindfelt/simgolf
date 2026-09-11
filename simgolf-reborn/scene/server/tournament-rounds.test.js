import {beforeEach,afterEach,test,expect,vi} from 'vitest';
import {env} from 'cloudflare:workers';
import {createSharedCourse} from './shared-courses.js';import {publishCourse} from './published-courses.js';
import {getTournament,listTournaments,createTournament,joinTournament,withdrawTournament,setTournamentStatus} from './tournaments.js';
import {tournamentRound,tournamentStandings} from './tournament-rounds.js';
import {createGame,build,serialize,restore,isPutting} from '../src/simulation/game.js';import {createSession} from '../src/simulation/session.js';
import worker from './worker.js';import {hash,names} from './security.js';
const owner='77777777-7777-4777-8777-777777777777',other='88888888-8888-4888-8888-888888888888';
beforeEach(async()=>{
 for(const table of ['sessions','tournament_results','tournament_rounds','tournament_entries','tournaments','published_courses','course_members','shared_courses','players'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 for(const id of [owner,other])await env.DB.prepare('INSERT INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(id,id===owner?'Alice':'Bob',id+'@proton.me',Date.now()).run();
});
afterEach(()=>vi.restoreAllMocks());
async function setup(rounds=1){
 const course=await createSharedCourse(env.DB,owner,'Round test'),game=createGame();
 expect(build(game,'tee',7,20).ok).toBe(true);expect(build(game,'green',36,5).ok).toBe(true);createSession(game);
 await env.DB.prepare('UPDATE shared_courses SET state=? WHERE id=?').bind(serialize(game),course.id).run();
 const version=await publishCourse(env.DB,course.id,owner,0),event=await createTournament(env.DB,owner,{title:'Server cup',publicationId:version.id,rounds,capacity:2});
 await joinTournament(env.DB,event.id,other);await setTournamentStatus(env.DB,event.id,owner,'locked');
 await env.DB.prepare('UPDATE tournaments SET seed=20 WHERE id=?').bind(event.id).run();return event;
}
function shot(snapshot,player){const game=restore(JSON.stringify(snapshot.state)),green=game.holes.find(h=>h.id===game.pro.holeId).green;return createSession(game,{courseLocked:true}).nextCommand(player,'shot',{x:green.x,z:green.z,technique:'straight'});}
test('server rounds isolate players, reject imports and forgery, and replay a shot once',async()=>{
 const event=await setup(),a=(await tournamentRound(env.DB,event.id,owner,1)).course,b=(await tournamentRound(env.DB,event.id,other,1)).course;
 expect(a.state.pro.proSkills).toEqual(b.state.pro.proSkills);
 await expect(tournamentRound(env.DB,event.id,owner,1,{type:'submit-score',payload:{strokes:1}})).rejects.toMatchObject({status:400});
 await expect(tournamentRound(env.DB,event.id,owner,2)).rejects.toMatchObject({status:400});
 expect((await tournamentRound(env.DB,event.id,owner,1,shot(a,other))).result.code).toBe('invalid-command');
 const command=shot(a,owner),first=await tournamentRound(env.DB,event.id,owner,1,command),again=await tournamentRound(env.DB,event.id,owner,1,command);
 expect(first.result.ok).toBe(true);expect(again.result).toEqual(first.result);expect(again.course.state.pro.strokes).toBe(first.course.state.pro.strokes);
 const unchanged=(await tournamentRound(env.DB,event.id,other,1)).course;expect(unchanged.state).toEqual(b.state);
});
test('manual thinking time pauses, in-flight downtime is retained, and the next round cannot start early',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const event=await setup(2),initial=(await tournamentRound(env.DB,event.id,owner,1)).course;
 now+=86400000;const waiting=(await tournamentRound(env.DB,event.id,owner,1)).course;expect(waiting.state).toEqual(initial.state);expect(waiting.pendingTicks).toBe(0);expect(waiting.revision).toBe(initial.revision);
 await expect(tournamentRound(env.DB,event.id,owner,2)).rejects.toMatchObject({status:409});
 await tournamentRound(env.DB,event.id,owner,1,shot(waiting,owner));now+=20000;
 const flight=(await tournamentRound(env.DB,event.id,owner,1)).course;expect(flight.state.protocol.tick).toBe(120);expect(flight.pendingTicks).toBeGreaterThan(0);
});
test('direct API shot commands cannot bypass automatic putting',async()=>{
 const event=await setup(),initial=(await tournamentRound(env.DB,event.id,owner,1)).course,game=restore(JSON.stringify(initial.state)),green=game.holes[0].green;
 game.pro.ball={x:green.x+1,z:green.z};game.pro.pos={...game.pro.ball};game.pro.wait=0;
 await env.DB.prepare('UPDATE tournament_rounds SET state=?,clock_ms=? WHERE tournament_id=? AND player_id=?').bind(serialize(game),Date.now(),event.id,owner).run();
 const command=shot({...initial,state:game},owner),reply=await tournamentRound(env.DB,event.id,owner,1,command);
 expect(reply.result.code).toBe('automatic-putting');expect(reply.course.state.pro.strokes).toBe(0);
});
test('two real simulated rounds produce server scorecards and tied rankings without resort fees',async()=>{
 let now=1800000000000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const event=await setup(2),snapshots=new Map();
 for(let round=1;round<=2;round++){
  for(const id of [owner,other])snapshots.set(id,(await tournamentRound(env.DB,event.id,id,round)).course);
  for(let i=0;i<500&&[...snapshots.values()].some(s=>!s.result);i++){
   for(const id of [owner,other]){const s=snapshots.get(id),g=restore(JSON.stringify(s.state));if(!s.result&&g.pro.phase==='address'&&!isPutting(g,g.pro))snapshots.set(id,(await tournamentRound(env.DB,event.id,id,round,shot(s,id))).course);}
   now+=6000;for(const id of [owner,other])snapshots.set(id,(await tournamentRound(env.DB,event.id,id,round)).course);
  }
  if(round===1)expect((await tournamentStandings(env.DB,event.id)).status).toBe('playing');
 }
 await expect(withdrawTournament(env.DB,event.id,other)).rejects.toMatchObject({status:409});
 const standings=await tournamentStandings(env.DB,event.id);expect(standings.status).toBe('complete');expect(standings.standings.map(p=>p.rank)).toEqual([1,1]);
 expect(standings.standings.every(p=>p.results.map(r=>r.round).join(',')==='1,2')).toBe(true);
 const repeated=await Promise.all([tournamentStandings(env.DB,event.id),tournamentStandings(env.DB,event.id)]);expect(repeated).toEqual([standings,standings]);
 for(const s of snapshots.values()){expect(s.result.scorecard).toHaveLength(1);expect(s.state.stats.fees).toBe(0);expect(s.result.strokes).toBe(s.result.scorecard[0].strokes);}
 const token=crypto.randomUUID(),csrf=crypto.randomUUID(),origin='https://simgolfer.example';
 await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(token),other,csrf,now+60000).run();
 const deleted=await worker.fetch(new Request(origin+'/api/account',{method:'DELETE',headers:{origin,cookie:`${names.session}=${token}`,'x-csrf-token':csrf,'content-type':'application/json'},body:JSON.stringify({confirm:'DELETE'})}),env);expect(deleted.status).toBe(200);
 const after=await tournamentStandings(env.DB,event.id);expect(after.status).toBe('complete');expect(after.standings.find(p=>p.id===owner).rank).toBe(1);expect(after.standings.find(p=>p.id===other)).toMatchObject({withdrawn:false,name:'Former player',rank:1});
 expect(await env.DB.prepare('SELECT 1 FROM tournament_rounds WHERE player_id=?').bind(other).first()).toBeNull();
 expect(after.standings.find(p=>p.id===other).results).toEqual(standings.standings.find(p=>p.id===other).results);
 await expect(setTournamentStatus(env.DB,event.id,owner,'cancelled')).rejects.toMatchObject({status:409});
 expect((await getTournament(env.DB,event.id)).status).toBe('complete');expect((await listTournaments(env.DB)).find(e=>e.id===event.id).status).toBe('complete');
 const ownerToken=crypto.randomUUID(),ownerCsrf=crypto.randomUUID();await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(ownerToken),owner,ownerCsrf,now+60000).run();
 expect((await worker.fetch(new Request(origin+'/api/account',{method:'DELETE',headers:{origin,cookie:`${names.session}=${ownerToken}`,'x-csrf-token':ownerCsrf,'content-type':'application/json'},body:JSON.stringify({confirm:'DELETE'})}),env)).status).toBe(200);
 const retained=await tournamentStandings(env.DB,event.id);expect(retained.standings.every(p=>p.name==='Former player'&&p.rank===1)).toBe(true);expect(retained.completedAt).toBe(standings.completedAt);expect((await getTournament(env.DB,event.id)).status).toBe('complete');

},30000);
test('the real Durable Object host preserves round identity and denies suspended entrants',async()=>{
 const event=await setup(),stub=env.TOURNAMENT_ROUNDS.getByName(`${event.id}:${owner}:1`);
 const first=await stub.read(event.id,owner,1);expect(first.ok).toBe(true);
 expect(await stub.read(event.id,other,1)).toMatchObject({ok:false,status:400});
 await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),owner).run();expect(await stub.read(event.id,owner,1)).toMatchObject({ok:false,status:403});
});

test('withdrawal stops round commands and all-withdrawn events have no winner',async()=>{
 const event=await setup(),a=(await tournamentRound(env.DB,event.id,owner,1)).course;
 await withdrawTournament(env.DB,event.id,owner);
 await expect(tournamentRound(env.DB,event.id,owner,1,shot(a,owner))).rejects.toMatchObject({status:403});
 expect((await tournamentRound(env.DB,event.id,other,1)).course.state.pro.strokes).toBe(0);
 expect((await tournamentStandings(env.DB,event.id)).status).toBe('playing');
 await withdrawTournament(env.DB,event.id,other);
 const standings=await tournamentStandings(env.DB,event.id);expect(standings.status).toBe('complete');expect(standings.standings.every(p=>p.withdrawn&&p.rank===null)).toBe(true);
});

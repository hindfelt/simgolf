import {beforeEach,test,expect} from 'vitest';
import {env} from 'cloudflare:workers';
import {createSharedCourse} from './shared-courses.js';
import {publishCourse} from './published-courses.js';
import {createTournament,getTournament,joinTournament,leaveTournament,setTournamentStatus} from './tournaments.js';
import {createPlaytestCourse} from '../src/simulation/playtest-course.js';
import {serialize} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';
import worker from './worker.js';
import {hash,names} from './security.js';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
beforeEach(async()=>{
 for(const table of ['tournament_entries','tournaments','published_courses','course_members','shared_courses','players'])await env.DB.prepare(`DELETE FROM ${table}`).run();
 for(const id of ids)await env.DB.prepare('INSERT INTO players(id,name,email,created_at) VALUES (?,?,?,?)').bind(id,'Player '+id[0],id+'@proton.me',Date.now()).run();
});
async function event(){
 const course=await createSharedCourse(env.DB,ids[0],'Links'),game=createPlaytestCourse();createSession(game);
 await env.DB.prepare('UPDATE shared_courses SET state=? WHERE id=?').bind(serialize(game),course.id).run();
 const version=await publishCourse(env.DB,course.id,ids[0],0);
 return createTournament(env.DB,ids[0],{title:'Players cup',publicationId:version.id,rounds:2,capacity:2});
}
test('event pins the published course independently and enters its authenticated organizer once',async()=>{
 const cup=await event();expect(cup.entrants.map(p=>p.playerId)).toEqual([ids[0]]);expect(cup.rounds).toBe(2);
 await env.DB.prepare('DELETE FROM published_courses WHERE id=?').bind(cup.publicationId).run();await env.DB.prepare('DELETE FROM shared_courses').run();
 const loaded=await getTournament(env.DB,cup.id);expect(loaded.course).toEqual(cup.course);expect(loaded.courseDigest).toBe(cup.course.digest);
 await joinTournament(env.DB,cup.id,ids[0]);expect((await getTournament(env.DB,cup.id)).entrants).toHaveLength(1);
});
test('simultaneous joins cannot exceed capacity and retries do not duplicate entrants',async()=>{
 const cup=await event(),results=await Promise.allSettled(ids.slice(1).map(id=>joinTournament(env.DB,cup.id,id)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 const loaded=await getTournament(env.DB,cup.id);expect(loaded.entrants).toHaveLength(2);
 const winner=loaded.entrants.find(p=>p.playerId!==ids[0]).playerId;await joinTournament(env.DB,cup.id,winner);expect((await getTournament(env.DB,cup.id)).entrants).toHaveLength(2);
 await leaveTournament(env.DB,cup.id,winner);expect((await getTournament(env.DB,cup.id)).entrants).toHaveLength(1);
});
test('only organizer locks a populated active roster and locked registration cannot change',async()=>{
 const cup=await event();await expect(setTournamentStatus(env.DB,cup.id,ids[0],'locked')).rejects.toMatchObject({status:409});
 await joinTournament(env.DB,cup.id,ids[1]);await expect(setTournamentStatus(env.DB,cup.id,ids[1],'locked')).rejects.toMatchObject({status:403});
 expect((await setTournamentStatus(env.DB,cup.id,ids[0],'locked')).status).toBe('locked');
 await expect(leaveTournament(env.DB,cup.id,ids[1])).rejects.toMatchObject({status:409});await expect(joinTournament(env.DB,cup.id,ids[2])).rejects.toMatchObject({status:409});
 expect((await setTournamentStatus(env.DB,cup.id,ids[0],'cancelled')).status).toBe('cancelled');await expect(setTournamentStatus(env.DB,cup.id,ids[0],'locked')).rejects.toMatchObject({status:409});
});
test('suspended players cannot enter and a suspended entrant prevents locking',async()=>{
 const cup=await event();await joinTournament(env.DB,cup.id,ids[1]);await env.DB.prepare('UPDATE players SET disabled_at=? WHERE id=?').bind(Date.now(),ids[1]).run();
 await expect(joinTournament(env.DB,cup.id,ids[1])).rejects.toMatchObject({status:403});await expect(setTournamentStatus(env.DB,cup.id,ids[0],'locked')).rejects.toMatchObject({status:409});
});
test('HTTP lobby rejects forged identities and seeds; organizer deletion cancels but preserves the anonymous course pin',async()=>{
 const cup=await event(),origin='https://simgolfer.example';
 async function credentials(id){const token=crypto.randomUUID(),csrf=crypto.randomUUID();await env.DB.prepare('INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES (?,?,?,?)').bind(await hash(token),id,csrf,Date.now()+60000).run();return {origin,cookie:`${names.session}=${token}`,'x-csrf-token':csrf,'content-type':'application/json'};}
 const owner=await credentials(ids[0]),entrant=await credentials(ids[1]);
 const request=(path,options={})=>worker.fetch(new Request(origin+path,options),env);
 const post=(headers,body)=>({method:'POST',headers,body:JSON.stringify(body)});
 expect((await request('/api/tournaments')).status).toBe(401);
 expect((await request('/api/tournaments',post(owner,{title:'Forged',publicationId:cup.publicationId,seed:7}))).status).toBe(400);
 const path=`/api/tournaments/${cup.id}/join`;
 expect((await request(path,post({...entrant,'x-csrf-token':'wrong'},{}))).status).toBe(403);
 expect((await request(path,post(entrant,{playerId:ids[0]}))).status).toBe(400);
 expect((await request(path,post(entrant,{}))).status).toBe(200);
 expect((await request('/api/account',{method:'DELETE',headers:owner,body:JSON.stringify({confirm:'DELETE'})})).status).toBe(200);
 const retained=await getTournament(env.DB,cup.id);expect(retained.status).toBe('cancelled');expect(retained.ownerId).toBeNull();expect(retained.courseAuthorId).toBeNull();expect(retained.courseAuthorName).toBe('Former player');expect(retained.course).toEqual(cup.course);expect(retained.entrants.map(p=>p.playerId)).toEqual([ids[1]]);
});

import {importCourse,coursePractice} from '../src/simulation/course-package.js';
import {createSession} from '../src/simulation/session.js';
import {restore,serialize,startPractice,isPutting} from '../src/simulation/game.js';
import {TICK_SECONDS} from '../src/simulation/protocol.js';
import {fail} from './security.js';
const TICK_MS=TICK_SECONDS*1000,MAX_TICKS=120;
const idle=game=>game.pro.phase==='finished'||(game.pro.phase==='address'&&!isPutting(game,game.pro));
async function access(db,eventId,playerId,round){
 if(!Number.isInteger(round)||round<1||round>4)throw fail(400,'Invalid tournament round.');
 const event=await db.prepare("SELECT t.*,e.player_name FROM tournaments t JOIN tournament_entries e ON e.tournament_id=t.id JOIN players p ON p.id=e.player_id JOIN players owner ON owner.id=t.owner_id WHERE t.id=? AND e.player_id=? AND p.disabled_at IS NULL AND owner.disabled_at IS NULL AND e.withdrawn=0 AND t.status='locked'").bind(eventId,playerId).first();
 if(!event)throw fail(403,'An active entrant and closed registration are required.');
 if(round>event.rounds)throw fail(400,'This round is not part of the event.');
 if(round>1&&!await db.prepare('SELECT 1 FROM tournament_rounds WHERE tournament_id=? AND player_id=? AND round_number=? AND result IS NOT NULL').bind(eventId,playerId,round-1).first())throw fail(409,'Finish the preceding round first.');
 return event;
}
const commitGuard="EXISTS(SELECT 1 FROM tournaments t JOIN tournament_entries e ON e.tournament_id=t.id JOIN players p ON p.id=e.player_id JOIN players owner ON owner.id=t.owner_id WHERE t.id=? AND e.player_id=? AND t.status='locked' AND e.withdrawn=0 AND p.disabled_at IS NULL AND owner.disabled_at IS NULL)";
function snapshot(row,event,playerId){
 const state=JSON.parse(row.state);
 return {id:`${event.id}:${playerId}:${row.round_number}`,eventId:event.id,name:event.title,round:row.round_number,totalRounds:event.rounds,role:'golfer',revision:row.revision,pendingTicks:idle(state)?0:Math.max(0,Math.floor((Date.now()-row.clock_ms)/TICK_MS)),state,course:JSON.parse(event.course_package),result:row.result?JSON.parse(row.result):null};
}
export async function tournamentRound(db,eventId,playerId,round,command){
 if(command!==undefined&&!['shot','use-ballwasher'].includes(command?.type))throw fail(400,'Only shots and ball washing are allowed in tournament rounds.');
 const now=Date.now();
 for(let attempt=0;attempt<5;attempt++){
  const event=await access(db,eventId,playerId,round);
  let row=await db.prepare('SELECT * FROM tournament_rounds WHERE tournament_id=? AND player_id=? AND round_number=?').bind(eventId,playerId,round).first();
  if(!row){
   const pkg=await importCourse(event.course_package),game=coursePractice(pkg,(event.seed+Math.imul(round-1,2654435761))>>>0);
   // Standard server-created profile for every entrant; imported local career
   // skills are not evidence of competitive eligibility.
   const started=startPractice(game,game.holes[0].id);if(!started.ok)throw fail(409,started.message);
   game.pro.ownerId=playerId;game.pro.name=event.player_name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,40)||'Golfer';createSession(game,{courseLocked:true});
   await db.prepare(`INSERT OR IGNORE INTO tournament_rounds(tournament_id,player_id,round_number,state,clock_ms) SELECT ?,?,?,?,? WHERE ${commitGuard}`).bind(eventId,playerId,round,serialize(game),now,eventId,playerId).run();
   row=await db.prepare('SELECT * FROM tournament_rounds WHERE tournament_id=? AND player_id=? AND round_number=?').bind(eventId,playerId,round).first();if(!row)throw fail(409,'Tournament access changed.');
  }
  const game=restore(row.state),host=createSession(game,{courseLocked:true}),wasIdle=idle(game);let clock=row.clock_ms;
  // Asynchronous tournament turns pause while waiting for a manual shot. Ball
  // flight, walking, services and automatic putting use elapsed server time.
  let ticks=Math.min(MAX_TICKS,Math.max(0,Math.floor((now-clock)/TICK_MS)));
  while(ticks-- >0&&!idle(game)){host.stepTicks();clock+=TICK_MS;}
  if(idle(game)&&!row.result&&(!wasIdle||command!==undefined))clock=now;
  const catchingUp=!idle(game)&&Math.floor((now-clock)/TICK_MS)>0;
  let result=null;
  if(command!==undefined){
   const receipt=game.protocol.clients.find(p=>p.id===playerId);
   result=catchingUp?{ok:false,code:'catching-up',message:'The server is finishing your shot. Retry the same command.'}
    :game.pro.phase==='finished'&&command.sequence!==receipt?.sequence?{ok:false,code:'round-complete',message:'This round is complete.'}
    :command.type==='shot'&&isPutting(game,game.pro)&&command.sequence!==receipt?.sequence?{ok:false,code:'automatic-putting',message:'Putting is automatic. Wait for the server to finish the putt.'}
    :host.execute(command,{id:playerId,role:'golfer'});
  }
  let score=row.result;
  if(!score&&game.pro.phase==='finished'){
   const cards=game.pro.scorecard;
   if(cards.length!==game.holes.length||cards.some((card,i)=>card.holeId!==game.holes[i].id||card.fee!==0))throw fail(503,'Tournament scorecard could not be verified.');
   score=JSON.stringify({round,scorecard:cards,strokes:cards.reduce((sum,c)=>sum+c.strokes,0),relativeToPar:cards.reduce((sum,c)=>sum+c.strokes-c.par,0)});
  }
  const state=serialize(game);
  if(state===row.state&&score===row.result&&clock===row.clock_ms)return {result,course:snapshot(row,event,playerId)};
  const changed=await db.prepare(`UPDATE tournament_rounds SET state=?,clock_ms=?,result=?,revision=revision+1 WHERE tournament_id=? AND player_id=? AND round_number=? AND revision=? AND ${commitGuard} RETURNING revision`).bind(state,clock,score,eventId,playerId,round,row.revision,eventId,playerId).first();
  if(changed)return {result,course:snapshot({...row,state,clock_ms:clock,result:score,revision:changed.revision},event,playerId)};
 }
 throw fail(409,'The round is busy. Retry the same command.');
}
export async function tournamentStandings(db,id){
 const event=await db.prepare('SELECT rounds,status FROM tournaments WHERE id=?').bind(id).first();if(!event)throw fail(404,'Tournament not found.');
 const entries=(await db.prepare('SELECT player_id AS id,player_name AS name,withdrawn FROM tournament_entries WHERE tournament_id=? ORDER BY player_id').bind(id).all()).results;
 const rows=(await db.prepare('SELECT player_id,result FROM tournament_rounds WHERE tournament_id=? AND result IS NOT NULL ORDER BY round_number').bind(id).all()).results;
 const standings=entries.map(player=>{const results=rows.filter(r=>r.player_id===player.id).map(r=>JSON.parse(r.result));return {...player,withdrawn:!!player.withdrawn,roundsCompleted:results.length,holesCompleted:results.reduce((n,r)=>n+r.scorecard.length,0),strokes:results.reduce((n,r)=>n+r.strokes,0),relativeToPar:results.reduce((n,r)=>n+r.relativeToPar,0),results,rank:null};});
 const complete=event.status==='locked'&&standings.length>=2&&standings.every(p=>p.withdrawn||p.roundsCompleted===event.rounds);
 if(complete){standings.sort((a,b)=>Number(a.withdrawn)-Number(b.withdrawn)||a.strokes-b.strokes||a.id.localeCompare(b.id));const eligible=standings.filter(p=>!p.withdrawn);eligible.forEach((p,i)=>p.rank=i&&p.strokes===eligible[i-1].strokes?eligible[i-1].rank:i+1);}
 return {id,status:event.status==='cancelled'?'cancelled':complete?'complete':event.status==='registration'?'registration':'playing',rounds:event.rounds,standings};
}

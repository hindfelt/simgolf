import {createGame,serialize} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';
import {RULES} from '../src/simulation/rules.js';
import {fail} from './security.js';
async function active(db,id){const player=await db.prepare('SELECT id,name FROM players WHERE id=? AND disabled_at IS NULL').bind(id).first();if(!player)throw fail(403,'Active player account required.');return player;}
export function earningsResult(game){
 const income=game.ledger.reduce((sum,e)=>sum+Math.max(0,e.amount),0),spending=game.ledger.reduce((sum,e)=>sum-Math.min(0,e.amount),0);
 const netCash=game.cash-RULES.startingCash,openHoles=game.holes.filter(h=>h.open&&h.tee&&h.green).length;
 if(netCash!==income-spending)throw fail(503,'Competition finances do not reconcile.');
 return {netCash,income,spending,completedHoles:game.stats.holesCompleted,openHoles,eligible:openHoles>0&&game.stats.holesCompleted>0&&game.stats.fees>0};
}
export async function createEarningsCompetition(db,playerId,{title,durationMinutes=30,capacity=8}){
 const player=await active(db,playerId);
 if(typeof title!=='string'||!title.trim()||title.length>80||!Number.isInteger(durationMinutes)||durationMinutes<10||durationMinutes>120||!Number.isInteger(capacity)||capacity<2||capacity>16)throw fail(400,'Enter a title, 10–120 minutes and 2–16 places.');
 const id=crypto.randomUUID(),now=Date.now(),game=createGame(crypto.getRandomValues(new Uint32Array(1))[0]);createSession(game);
 await db.batch([
  db.prepare("INSERT INTO earnings_competitions(id,owner_id,title,initial_state,duration_minutes,capacity,status,created_at) SELECT ?,id,?,?,?,?,'registration',? FROM players WHERE id=? AND disabled_at IS NULL").bind(id,title.trim(),serialize(game),durationMinutes,capacity,now,playerId),
  db.prepare('INSERT INTO earnings_entries(competition_id,player_id,player_name,course_id,joined_at) SELECT id,owner_id,?,?,? FROM earnings_competitions WHERE id=?').bind(player.name,crypto.randomUUID(),now,id)
 ]);return getEarningsCompetition(db,id);
}
export async function settleEarningsCompetition(db,id){
 await db.batch([
  db.prepare("UPDATE earnings_entries SET withdrawn=1 WHERE competition_id=? AND result IS NULL AND EXISTS(SELECT 1 FROM earnings_competitions c WHERE c.id=? AND c.status='running' AND c.ends_at<=?) AND NOT EXISTS(SELECT 1 FROM players p WHERE p.id=earnings_entries.player_id AND p.disabled_at IS NULL)").bind(id,id,Date.now()),
  db.prepare("UPDATE earnings_competitions SET status='complete' WHERE id=? AND status='running' AND NOT EXISTS(SELECT 1 FROM earnings_entries e WHERE e.competition_id=? AND e.result IS NULL AND e.withdrawn=0)").bind(id,id)
 ]);
}
export async function getEarningsCompetition(db,id){
 await settleEarningsCompetition(db,id);
 const row=await db.prepare('SELECT id,owner_id AS ownerId,title,duration_minutes AS durationMinutes,capacity,status,starts_at AS startsAt,ends_at AS endsAt FROM earnings_competitions WHERE id=?').bind(id).first();if(!row)throw fail(404,'Earnings competition not found.');
 const entries=(await db.prepare('SELECT player_id AS id,player_name AS name,course_id AS courseId,withdrawn,result FROM earnings_entries WHERE competition_id=? ORDER BY joined_at,player_id').bind(id).all()).results.map(e=>({...e,withdrawn:!!e.withdrawn,result:e.result?JSON.parse(e.result):null,rank:null}));
 if(row.status==='complete'){
  entries.sort((a,b)=>Number(!!b.result?.eligible&&!b.withdrawn)-Number(!!a.result?.eligible&&!a.withdrawn)||(b.result?.netCash??0)-(a.result?.netCash??0)||a.id.localeCompare(b.id));
  const eligible=entries.filter(e=>e.result?.eligible&&!e.withdrawn);eligible.forEach((e,i)=>e.rank=i&&e.result.netCash===eligible[i-1].result.netCash?eligible[i-1].rank:i+1);
 }
 return {...row,entries};
}
export async function joinEarningsCompetition(db,id,playerId){
 const player=await active(db,playerId);
 const joined=await db.prepare("INSERT OR IGNORE INTO earnings_entries(competition_id,player_id,player_name,course_id,joined_at) SELECT c.id,?,?,?,? FROM earnings_competitions c JOIN players p ON p.id=c.owner_id WHERE c.id=? AND c.status='registration' AND p.disabled_at IS NULL AND EXISTS(SELECT 1 FROM players WHERE id=? AND disabled_at IS NULL) AND (SELECT count(*) FROM earnings_entries WHERE competition_id=c.id)<c.capacity RETURNING player_id").bind(playerId,player.name,crypto.randomUUID(),Date.now(),id,playerId).first();
 if(!joined&&!await db.prepare('SELECT 1 FROM earnings_entries WHERE competition_id=? AND player_id=?').bind(id,playerId).first())throw fail(409,'Registration is closed or full.');return getEarningsCompetition(db,id);
}
export async function startEarningsCompetition(db,id,playerId){
 await active(db,playerId);const event=await getEarningsCompetition(db,id);if(event.ownerId!==playerId)throw fail(403,'Only the organizer can start this competition.');
 if(event.status!=='registration'&&event.status!=='running')throw fail(409,'This competition cannot start.');
 const now=Date.now();
 await db.batch([
  db.prepare("UPDATE earnings_competitions SET status='running',starts_at=?,ends_at=?+duration_minutes*60000 WHERE id=? AND status='registration' AND owner_id=? AND (SELECT count(*) FROM earnings_entries WHERE competition_id=?)>=2 AND NOT EXISTS(SELECT 1 FROM earnings_entries e LEFT JOIN players p ON p.id=e.player_id WHERE e.competition_id=? AND (p.id IS NULL OR p.disabled_at IS NOT NULL))").bind(now,now,id,playerId,id,id),
  db.prepare("INSERT OR IGNORE INTO shared_courses(id,owner_id,name,state,created_at,updated_at,clock_ms) SELECT e.course_id,e.player_id,c.title||' · '||e.player_name,c.initial_state,c.starts_at,c.starts_at,c.starts_at FROM earnings_entries e JOIN earnings_competitions c ON c.id=e.competition_id WHERE c.id=? AND c.status='running' AND e.withdrawn=0 AND EXISTS(SELECT 1 FROM players p WHERE p.id=e.player_id AND p.disabled_at IS NULL)").bind(id)
 ]);
 const current=await getEarningsCompetition(db,id);if(current.status!=='running')throw fail(409,'At least two active entrants are required.');return current;
}
export async function recordEarningsResult(db,courseId,game,revision){
 const result=earningsResult(game);
 const entry=await db.prepare("UPDATE earnings_entries SET result=? WHERE course_id=? AND withdrawn=0 AND result IS NULL AND EXISTS(SELECT 1 FROM shared_courses s JOIN earnings_competitions c ON c.id=earnings_entries.competition_id WHERE s.id=course_id AND s.revision=? AND c.status='running' AND s.clock_ms>=c.ends_at) AND EXISTS(SELECT 1 FROM players p WHERE p.id=earnings_entries.player_id AND p.disabled_at IS NULL) RETURNING competition_id").bind(JSON.stringify(result),courseId,revision).first();
 if(entry)await settleEarningsCompetition(db,entry.competition_id);
}
export async function leaveEarningsCompetition(db,id,playerId){
 await active(db,playerId);const event=await getEarningsCompetition(db,id);if(event.ownerId===playerId)throw fail(400,'The organizer can cancel registration instead.');
 if(event.status!=='registration')throw fail(409,'This competition has started.');
 await db.prepare("DELETE FROM earnings_entries WHERE competition_id=? AND player_id=? AND EXISTS(SELECT 1 FROM earnings_competitions WHERE id=? AND status='registration')").bind(id,playerId,id).run();
 const current=await getEarningsCompetition(db,id);if(current.entries.some(e=>e.id===playerId))throw fail(409,'The competition started before you could leave.');return current;
}
export async function cancelEarningsCompetition(db,id,playerId){
 await active(db,playerId);const event=await getEarningsCompetition(db,id);if(event.ownerId!==playerId)throw fail(403,'Only the organizer can cancel registration.');if(event.status==='cancelled')return event;
 const changed=await db.prepare("UPDATE earnings_competitions SET status='cancelled' WHERE id=? AND owner_id=? AND status='registration' RETURNING id").bind(id,playerId).first();if(!changed)throw fail(409,'A started earnings competition cannot be cancelled.');return getEarningsCompetition(db,id);
}

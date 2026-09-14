import {recordEarningsResult} from './earnings-competitions.js';
import {createGame,restore,serialize} from '../src/simulation/game.js';
import {createSession} from '../src/simulation/session.js';
import {fail} from './security.js';
import {TICK_SECONDS} from '../src/simulation/protocol.js';
const TICK_MS=TICK_SECONDS*1000;
const MAX_ADVANCE_TICKS=120;

// Construction commands only. Personal golfer imports and client state are never
// accepted by the shared host. Golf rounds will have their own trusted host.
const construction = new Set(['build','demolish','build-boundary-region','buy-land',
 'add-hole','remove-hole','reorder-holes','open-hole','close-hole','hire',
 'hire-marshall','hire-consultant','hire-celebrity','hire-club-pro','hire-ranger',
 'hire-vendor','hire-technician','upgrade-staff','rename-staff','dismiss-staff','reposition-staff']);

async function active(db,playerId){
 if(!await db.prepare('SELECT id FROM players WHERE id=? AND disabled_at IS NULL').bind(playerId).first())throw fail(403,'Active player account required.');
}
async function access(db,id,playerId){
 await active(db,playerId);
 const row=await db.prepare("SELECT c.*,e.competition_id AS earnings_id,e.withdrawn AS earnings_withdrawn,x.ends_at AS earnings_ends_at,CASE WHEN c.owner_id=? THEN 'owner' ELSE m.role END AS role FROM shared_courses c LEFT JOIN course_members m ON m.course_id=c.id AND m.player_id=? LEFT JOIN earnings_entries e ON e.course_id=c.id LEFT JOIN earnings_competitions x ON x.id=e.competition_id WHERE c.id=? AND (c.owner_id=? OR m.player_id IS NOT NULL)").bind(playerId,playerId,id,playerId).first();
 if(!row)throw fail(404,'Shared course not found.');
 return row;
}
const ceiling=row=>row.earnings_id?(row.earnings_withdrawn?row.clock_ms:Math.min(Date.now(),row.earnings_ends_at)):Date.now();
const readOnly=row=>row.earnings_id&&(row.earnings_withdrawn||Date.now()>=row.earnings_ends_at);
function snapshot(row){return {id:row.id,name:row.name,ownerId:row.owner_id,role:readOnly(row)?'spectator':row.role,earnings:row.earnings_id?{id:row.earnings_id,endsAt:row.earnings_ends_at,finished:!!row.earnings_withdrawn||row.clock_ms>=row.earnings_ends_at}:null,revision:row.revision,pendingTicks:Math.max(0,Math.floor((ceiling(row)-row.clock_ms)/TICK_MS)),state:JSON.parse(row.state)};}
export async function createSharedCourse(db,playerId,name){
 await active(db,playerId);
 if(typeof name!=='string'||!name.trim()||name.length>80)throw fail(400,'Enter a course name of 1–80 characters.');
 const id=crypto.randomUUID(),now=Date.now(),game=createGame(crypto.getRandomValues(new Uint32Array(1))[0]);
 createSession(game);
 // Initial funds, seed and state come from the server, never an imported save.
 const state=serialize(game);
 await db.prepare('INSERT INTO shared_courses(id,owner_id,name,state,created_at,updated_at,clock_ms) VALUES (?,?,?,?,?,?,?)').bind(id,playerId,name.trim(),state,now,now,now).run();
 return snapshot({id,name:name.trim(),owner_id:playerId,role:'owner',state,revision:0,clock_ms:now});
}
export async function getSharedCourse(db,id,playerId){return (await mutateSharedCourse(db,id,playerId)).course;}
export async function listSharedCourses(db,playerId){
 await active(db,playerId);
 const rows=await db.prepare("SELECT c.id,c.name,c.owner_id AS ownerId,c.revision,e.competition_id AS earningsId,CASE WHEN c.owner_id=? THEN 'owner' ELSE m.role END AS role FROM shared_courses c LEFT JOIN course_members m ON m.course_id=c.id AND m.player_id=? LEFT JOIN earnings_entries e ON e.course_id=c.id WHERE c.owner_id=? OR m.player_id IS NOT NULL ORDER BY c.created_at DESC,c.id LIMIT 100").bind(playerId,playerId,playerId).all();
 return rows.results;
}
export async function setCourseMember(db,id,ownerId,playerId,role){
 const row=await access(db,id,ownerId);
 if(row.earnings_id&&role==='editor')throw fail(403,'Earnings entrants must build their own course. Spectators are allowed.');
 if(row.role!=='owner')throw fail(403,'Only the course owner can change access.');
 if(playerId===ownerId)throw fail(400,'The owner keeps ownership.');
 if(!['editor','spectator',null].includes(role))throw fail(400,'Unknown course role.');
 if(role!==null)await active(db,playerId);
 // D1 batch commits these together. Bumping the storage revision fences out
 // commands which read permissions before this membership change committed.
 await db.batch([
  role===null?db.prepare('DELETE FROM course_members WHERE course_id=? AND player_id=?').bind(id,playerId):db.prepare('INSERT INTO course_members(course_id,player_id,role) VALUES (?,?,?) ON CONFLICT(course_id,player_id) DO UPDATE SET role=excluded.role').bind(id,playerId,role),
  db.prepare('UPDATE shared_courses SET revision=revision+1,updated_at=? WHERE id=?').bind(Date.now(),id)
 ]);
}
export async function executeSharedCommand(db,id,playerId,command){
 if(!command||!construction.has(command.type))throw fail(400,'Unsupported shared construction command.');
 return mutateSharedCourse(db,id,playerId,command);
}
async function mutateSharedCourse(db,id,playerId,command){
 // Compare-and-swap retries reload both state and membership. Session receipts
 // make a retransmitted action idempotent, including rule-rejected purchases.
 for(let attempt=0;attempt<5;attempt++){
  const now=Date.now(),row=await access(db,id,playerId);
  const game=restore(row.state),host=createSession(game);
  const due=Math.max(0,Math.floor((ceiling(row)-row.clock_ms)/TICK_MS)),ticks=Math.min(due,MAX_ADVANCE_TICKS);
  host.stepTicks(ticks);
  // Persist all elapsed time in bounded pieces; never discard downtime or let
  // a command run in the past ahead of overdue earnings/visitor simulation.
  const closed=readOnly(row);
  const result=command?(closed?(command.sequence===game.protocol.clients.find(p=>p.id===playerId)?.sequence?host.execute(command,{id:playerId,role:row.role}):{ok:false,code:'competition-closed',message:'The earnings competition has ended. This course is read only.'}):due>MAX_ADVANCE_TICKS
   ? {ok:false,code:'catching-up',message:'The server is catching up. Retry this same command.',revision:game.protocol.revision}
   : host.execute(command,{id:playerId,role:row.role})):null;
  const state=serialize(game);
  if(!ticks&&state===row.state){if(row.earnings_id&&!row.earnings_withdrawn&&row.clock_ms>=row.earnings_ends_at)await recordEarningsResult(db,id,game,row.revision);return {result,course:snapshot(row)};}
  const clock=row.clock_ms+ticks*TICK_MS;
  const changed=await db.prepare('UPDATE shared_courses SET state=?,clock_ms=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM players WHERE id=? AND disabled_at IS NULL) AND NOT EXISTS(SELECT 1 FROM earnings_entries e WHERE e.course_id=shared_courses.id AND e.withdrawn=1) AND (?=0 OR NOT EXISTS(SELECT 1 FROM earnings_entries e JOIN earnings_competitions c ON c.id=e.competition_id WHERE e.course_id=shared_courses.id AND c.ends_at<=?)) RETURNING revision').bind(state,clock,now,id,row.revision,playerId,Number(!!command&&!closed&&due<=MAX_ADVANCE_TICKS),Date.now()).first();
  if(changed){if(row.earnings_id&&clock>=row.earnings_ends_at)await recordEarningsResult(db,id,game,changed.revision);return {result,course:snapshot({...row,state,clock_ms:clock,revision:changed.revision})};}
 }
 throw fail(409,'The course is busy. Reload and retry the same command.');
}

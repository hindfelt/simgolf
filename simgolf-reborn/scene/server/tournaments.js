import {getPublishedCourse} from './published-courses.js';
import {fail} from './security.js';
async function active(db,id){
 const player=await db.prepare('SELECT id,name FROM players WHERE id=? AND disabled_at IS NULL').bind(id).first();
 if(!player)throw fail(403,'Active player account required.');return player;
}
export async function createTournament(db,ownerId,{title,publicationId,rounds=1,capacity=16}){
 const owner=await active(db,ownerId);
 if(typeof title!=='string'||!title.trim()||title.length>80||typeof publicationId!=='string'||!Number.isInteger(rounds)||rounds<1||rounds>4||!Number.isInteger(capacity)||capacity<2||capacity>64)throw fail(400,'Enter a title, published course, 1–4 rounds and 2–64 places.');
 const course=await getPublishedCourse(db,publicationId),id=crypto.randomUUID(),now=Date.now(),seed=crypto.getRandomValues(new Uint32Array(1))[0];
 // The event owns its course copy; removing/replacing the publication cannot
 // change a future round. Seed, owner and entrant identity are never submitted.
 await db.batch([
  db.prepare("INSERT INTO tournaments(id,owner_id,title,publication_id,course_digest,course_author_id,course_author_name,course_package,rounds,capacity,seed,status,created_at) SELECT ?,p.id,?,?,?,?,?,?,?,?,?,'registration',? FROM players p WHERE p.id=? AND p.disabled_at IS NULL").bind(id,title.trim(),publicationId,course.digest,course.authorId,course.authorName,JSON.stringify(course.package),rounds,capacity,seed,now,ownerId),
  db.prepare('INSERT INTO tournament_entries(tournament_id,player_id,player_name,joined_at) SELECT id,owner_id,?,? FROM tournaments WHERE id=?').bind(owner.name,now,id)
 ]);
 return getTournament(db,id);
}
export async function getTournament(db,id){
 const row=await db.prepare('SELECT * FROM tournaments WHERE id=?').bind(id).first();
 if(!row)throw fail(404,'Tournament not found.');
 const entries=await db.prepare('SELECT e.player_id AS playerId,e.player_name AS name,e.joined_at AS joinedAt,e.withdrawn,p.disabled_at IS NOT NULL AS suspended FROM tournament_entries e LEFT JOIN players p ON p.id=e.player_id WHERE e.tournament_id=? ORDER BY e.joined_at,e.player_id').bind(id).all();
 return {id:row.id,ownerId:row.owner_id,title:row.title,publicationId:row.publication_id,courseDigest:row.course_digest,courseAuthorId:row.course_author_id,courseAuthorName:row.course_author_name,course:JSON.parse(row.course_package),rounds:row.rounds,capacity:row.capacity,status:row.status,createdAt:row.created_at,entrants:entries.results.map(e=>({...e,suspended:!!e.suspended,withdrawn:!!e.withdrawn}))};
}
export async function listTournaments(db){
 return (await db.prepare('SELECT t.id,t.title,t.owner_id AS ownerId,t.course_digest AS courseDigest,t.rounds,t.capacity,t.status,t.created_at AS createdAt,(SELECT count(*) FROM tournament_entries e WHERE e.tournament_id=t.id) AS entrants FROM tournaments t ORDER BY t.created_at DESC,t.id LIMIT 100').all()).results;
}
export async function joinTournament(db,id,playerId){
 const player=await active(db,playerId);
 const joined=await db.prepare("INSERT OR IGNORE INTO tournament_entries(tournament_id,player_id,player_name,joined_at) SELECT t.id,p.id,?,? FROM tournaments t JOIN players owner ON owner.id=t.owner_id JOIN players p ON p.id=? WHERE t.id=? AND t.status='registration' AND p.disabled_at IS NULL AND owner.disabled_at IS NULL AND (SELECT count(*) FROM tournament_entries WHERE tournament_id=t.id)<t.capacity RETURNING player_id").bind(player.name,Date.now(),playerId,id).first();
 if(!joined&&!await db.prepare('SELECT 1 FROM tournament_entries WHERE tournament_id=? AND player_id=?').bind(id,playerId).first())throw fail(409,'Registration is closed or the tournament is full.');
 return getTournament(db,id);
}
export async function leaveTournament(db,id,playerId){
 await active(db,playerId);const event=await getTournament(db,id);
 if(event.ownerId===playerId)throw fail(400,'The organizer must cancel the tournament instead of leaving.');
 if(event.status!=='registration')throw fail(409,'Registration is closed.');
 const removed=await db.prepare("DELETE FROM tournament_entries WHERE tournament_id=? AND player_id=? AND EXISTS(SELECT 1 FROM tournaments WHERE id=? AND status='registration') RETURNING player_id").bind(id,playerId,id).first();
 const current=await getTournament(db,id);
 if(!removed&&current.entrants.some(entry=>entry.playerId===playerId))throw fail(409,'Registration closed before you could leave.');
 return current;
}
export async function setTournamentStatus(db,id,playerId,status){
 await active(db,playerId);
 if(!['locked','cancelled'].includes(status))throw fail(400,'Unknown tournament action.');
 const event=await getTournament(db,id);if(event.ownerId!==playerId)throw fail(403,'Only the organizer can change registration.');
 if(event.status===status)return event;
 const changed=await db.prepare("UPDATE tournaments SET status=? WHERE id=? AND owner_id=? AND EXISTS(SELECT 1 FROM players WHERE id=? AND disabled_at IS NULL) AND status!='cancelled' AND (?='cancelled' OR (status='registration' AND (SELECT count(*) FROM tournament_entries e JOIN players p ON p.id=e.player_id WHERE e.tournament_id=? AND p.disabled_at IS NULL)>=2 AND NOT EXISTS(SELECT 1 FROM tournament_entries e JOIN players p ON p.id=e.player_id WHERE e.tournament_id=? AND p.disabled_at IS NOT NULL))) RETURNING id").bind(status,id,playerId,playerId,status,id,id).first();
 if(!changed)throw fail(409,'At least two active entrants are needed. Cancelled events cannot reopen.');
 return getTournament(db,id);
}

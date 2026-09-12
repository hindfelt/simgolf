import {sealTournament} from './tournament-results.js';
// Atomic transition: registration and due-start requests race in D1, never in a
// browser clock. Late delivery retains the originally advertised playing window.
export async function advanceTournament(db,id){
 await db.prepare(`UPDATE tournaments SET
 status=CASE WHEN EXISTS(SELECT 1 FROM players WHERE id=owner_id AND disabled_at IS NULL)
 AND (SELECT count(*) FROM tournament_entries e JOIN players p ON p.id=e.player_id WHERE e.tournament_id=tournaments.id AND p.disabled_at IS NULL)>=2
 AND NOT EXISTS(SELECT 1 FROM tournament_entries e JOIN players p ON p.id=e.player_id WHERE e.tournament_id=tournaments.id AND p.disabled_at IS NOT NULL)
 THEN 'locked' ELSE 'cancelled' END,
 ends_at=starts_at+duration_hours*3600000
 WHERE id=? AND status='registration' AND starts_at IS NOT NULL AND starts_at<=?`).bind(id,Date.now()).run();
}
export async function runTournamentSchedule(db){
 const due=await db.prepare(`SELECT id FROM tournaments t WHERE
 (status='registration' AND starts_at<=?) OR
 (status='locked' AND ends_at<=? AND NOT EXISTS(SELECT 1 FROM tournament_results r WHERE r.tournament_id=t.id))
 ORDER BY coalesce(starts_at,ends_at),id LIMIT 100`).bind(Date.now(),Date.now()).all();
 for(const {id} of due.results){await advanceTournament(db,id);await sealTournament(db,id);}
 return due.results.length;
}

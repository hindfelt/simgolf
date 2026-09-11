// One SQL statement checks completion and captures every score from the same
// database snapshot. INSERT OR IGNORE makes competing finish/read requests safe.
const sealSql=`WITH candidates AS (
 SELECT t.id,t.rounds FROM tournaments t WHERE t.status='locked'
 AND (t.id=? OR EXISTS(SELECT 1 FROM tournament_entries e WHERE e.tournament_id=t.id AND e.player_id=?))
 AND NOT EXISTS(SELECT 1 FROM tournament_results f WHERE f.tournament_id=t.id)
), totals AS (
 SELECT e.tournament_id,e.player_id AS id,e.player_name AS name,e.withdrawn,
 count(r.result) AS roundsCompleted,
 coalesce(sum(json_array_length(r.result,'$.scorecard')),0) AS holesCompleted,
 coalesce(sum(json_extract(r.result,'$.strokes')),0) AS strokes,
 coalesce(sum(json_extract(r.result,'$.relativeToPar')),0) AS relativeToPar,
 (SELECT json_group_array(json(result)) FROM (SELECT result FROM tournament_rounds rr WHERE rr.tournament_id=e.tournament_id AND rr.player_id=e.player_id AND rr.result IS NOT NULL ORDER BY round_number)) AS results
 FROM tournament_entries e JOIN candidates c ON c.id=e.tournament_id
 LEFT JOIN tournament_rounds r ON r.tournament_id=e.tournament_id AND r.player_id=e.player_id
 GROUP BY e.tournament_id,e.player_id
), ranked AS (
 SELECT *,CASE WHEN withdrawn=0 THEN rank() OVER(PARTITION BY tournament_id ORDER BY withdrawn,strokes) ELSE NULL END AS place FROM totals
)
INSERT OR IGNORE INTO tournament_results(tournament_id,completed_at,body)
SELECT c.id,?,json_object('id',c.id,'status','complete','rounds',c.rounds,'standings',json(
 (SELECT json_group_array(json_object('id',id,'name',name,'withdrawn',json(CASE WHEN withdrawn=1 THEN 'true' ELSE 'false' END),'roundsCompleted',roundsCompleted,'holesCompleted',holesCompleted,'strokes',strokes,'relativeToPar',relativeToPar,'results',json(results),'rank',place))
 FROM (SELECT * FROM ranked WHERE tournament_id=c.id ORDER BY withdrawn,strokes,id))
)) FROM candidates c
WHERE (SELECT count(*) FROM totals WHERE tournament_id=c.id)>=2
AND NOT EXISTS(SELECT 1 FROM totals WHERE tournament_id=c.id AND withdrawn=0 AND roundsCompleted!=c.rounds)`;
export function sealStatement(db,{eventId=null,playerId=null}={}){
 return db.prepare(sealSql).bind(eventId,playerId,Date.now());
}
export async function sealTournament(db,id){await sealStatement(db,{eventId:id}).run();}
export async function finalTournamentResults(db,id){
 const row=await db.prepare('SELECT body,completed_at FROM tournament_results WHERE tournament_id=?').bind(id).first();
 return row?{...JSON.parse(row.body),completedAt:row.completed_at}:null;
}
export function anonymizeFinalResults(db,playerId){
 // Preserve scores and places while removing the deleted account's display name.
 return db.prepare("UPDATE tournament_results SET body=json_set(body,'$.standings',json((SELECT json_group_array(json(CASE WHEN json_extract(value,'$.id')=? THEN json_set(value,'$.name','Former player') ELSE value END)) FROM json_each(body,'$.standings')))) WHERE EXISTS(SELECT 1 FROM json_each(body,'$.standings') WHERE json_extract(value,'$.id')=?)").bind(playerId,playerId);
}

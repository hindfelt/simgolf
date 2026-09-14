// Awards derive only from immutable server-sealed standings. No client claims,
// cash mutations or repeated payouts; tied ranks receive the same medal.
export async function playerTournamentAwards(db,playerId){
 const rows=await db.prepare(`SELECT t.id,t.title,r.completed_at AS awardedAt,
 json_extract(s.value,'$.rank') AS rank
 FROM tournament_results r JOIN tournaments t ON t.id=r.tournament_id,json_each(r.body,'$.standings') s
 WHERE json_extract(s.value,'$.id')=? AND json_extract(s.value,'$.withdrawn')=0
 AND json_extract(s.value,'$.rank') BETWEEN 1 AND 3
 ORDER BY r.completed_at DESC,t.id LIMIT 100`).bind(playerId).all();
 return rows.results.map(r=>({...r,medal:['Gold','Silver','Bronze'][r.rank-1]}));
}

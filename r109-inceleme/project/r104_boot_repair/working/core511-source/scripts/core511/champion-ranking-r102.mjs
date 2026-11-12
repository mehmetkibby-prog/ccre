// Read-only ranking over existing player columns; no schema change or background job.
// Keep the general leaderboard's 10 second cache and each board's legacy ordering.
export function createChampionRankingR102(db,{now=Date.now,rankOnly=false}={}){
 const eligible=`SELECT p.id,p.name,p.role,p.level,p.xp,p.created_at,
  CASE WHEN p.level>=65 THEN p.rank_tier ELSE 0 END AS rankTier,
  CASE WHEN p.level>=65 AND p.rank_tier>0 THEN p.rank_xp ELSE 0 END AS rankXp,
  CASE WHEN p.level>=65 AND p.rank_tier>=18 THEN p.champion_level_r102 ELSE 0 END AS championLevel,
  CASE WHEN p.level>=65 AND p.rank_tier>=18 AND p.champion_level_r102>0 THEN p.champion_xp_r102 ELSE 0 END AS championXp
  FROM players p ${rankOnly?'':'JOIN accounts a ON a.id=p.account_id'}
  WHERE p.is_gm=0 AND p.loadlab_run_id='' ${rankOnly?'AND p.level>=65 AND p.rank_tier>0':'AND a.permanently_banned=0'}`;
 const order=rankOnly?'championLevel DESC,championXp DESC,rankTier DESC,rankXp DESC,id':'championLevel DESC,championXp DESC,level DESC,rankTier DESC,rankXp DESC,CASE WHEN rankTier=0 THEN xp ELSE 0 END DESC,created_at,id';
 const sql=`SELECT *,ROW_NUMBER() OVER (ORDER BY ${order}) AS rank FROM (${eligible})`;
 let top,ownQuery,snapshot,expires=0;
 return {read(playerId){
  const timestamp=now();
  if(!snapshot||timestamp>=expires){
   top??=db.prepare(`SELECT * FROM (${sql}) ORDER BY rank LIMIT 20`);
   snapshot={rows:top.all(),updatedAt:timestamp};expires=timestamp+10000;
  }
  let own=snapshot.rows.find(row=>row.id===playerId)??null;
  if(!own&&playerId){ownQuery??=db.prepare(`SELECT * FROM (${sql}) WHERE id=?`);own=ownQuery.get(playerId)??null;}
  return {...snapshot,own};
 }};
}

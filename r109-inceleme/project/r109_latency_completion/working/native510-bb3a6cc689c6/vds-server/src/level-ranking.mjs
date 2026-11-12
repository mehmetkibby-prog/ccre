export function ensureLevelRankingSchema(db){
 db.exec('CREATE INDEX IF NOT EXISTS idx_players_level_ranking ON players(level DESC,xp DESC,created_at,id) WHERE is_gm=0');
}
export function createLevelRanking(db,{now=Date.now}={}){
 let snapshot=null,expires=0;
 const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(row=>row.name));
 const hasRanks=columns.has('rank_tier')&&columns.has('rank_xp');
 const tier=hasRanks?'CASE WHEN p.level>=65 THEN p.rank_tier ELSE 0 END':'0';
 const xp=hasRanks?'CASE WHEN p.level>=65 AND p.rank_tier>0 THEN p.rank_xp ELSE 0 END':'0';
 const eligible=`SELECT p.id,p.name,p.role,p.level,p.xp,p.created_at,${tier} AS rankTier,${xp} AS rankXp FROM players p JOIN accounts a ON a.id=p.account_id WHERE p.is_gm=0 AND p.loadlab_run_id='' AND a.permanently_banned=0`;
 // Rank XP replaces capped normal XP after the quest. Keep the original
 // level/XP ordering for everyone who has not unlocked ranks yet.
 const sql=`SELECT id,name,role,level,xp,rankTier,rankXp,ROW_NUMBER() OVER (ORDER BY level DESC,rankTier DESC,rankXp DESC,CASE WHEN rankTier=0 THEN xp ELSE 0 END DESC,created_at,id) AS rank FROM (${eligible})`;
 return {read(playerId){
  if(!snapshot||now()>=expires){
   snapshot={rows:db.prepare(`SELECT * FROM (${sql}) ORDER BY rank LIMIT 20`).all(),updatedAt:now()};expires=now()+10000;
  }
  const own=snapshot.rows.find(p=>p.id===playerId)??db.prepare(`SELECT * FROM (${sql}) WHERE id=?`).get(playerId)??null;
  return {...snapshot,own};
 }};
}

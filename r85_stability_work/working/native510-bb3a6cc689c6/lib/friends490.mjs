// Consent belongs to the recipient. Accept writes both rows in one atomic SQL
// statement, through the existing durable writer; never changes player economy.
export function ensureFriendsConsent490(db) {
 const columns=db.prepare('PRAGMA table_info(player_friends487)').all();
 if(!columns.some(c=>c.name==='state490')){
  db.exec('SAVEPOINT friends_consent490');
  try{
   db.exec("ALTER TABLE player_friends487 ADD COLUMN state490 TEXT NOT NULL DEFAULT 'pending' CHECK(state490 IN ('pending','accepted'))");
   // A legacy mutual pair already represents two separate add actions. A
   // unilateral legacy contact becomes an outgoing request, not consent.
   db.exec(`UPDATE player_friends487 AS f SET state490='accepted' WHERE EXISTS(
    SELECT 1 FROM player_friends487 reverse WHERE reverse.owner_id=f.friend_id AND reverse.friend_id=f.owner_id)`);
   db.exec('RELEASE friends_consent490');
  }catch(error){db.exec('ROLLBACK TO friends_consent490');db.exec('RELEASE friends_consent490');throw error;}
 }
 db.exec(`CREATE INDEX IF NOT EXISTS friend_owner_state490 ON player_friends487(owner_id,state490,created_at,friend_id);
 CREATE INDEX IF NOT EXISTS friend_recipient_state490 ON player_friends487(friend_id,state490,created_at,owner_id);`);
}
export async function readFriendRequests490(database,playerId){
 const {results}=await database.prepare(`SELECT p.id,p.name,'incoming' AS direction FROM player_friends487 f
 JOIN players p ON p.id=f.owner_id WHERE f.friend_id=? AND f.state490='pending'
 UNION ALL SELECT p.id,p.name,'outgoing' AS direction FROM player_friends487 f
 JOIN players p ON p.id=f.friend_id WHERE f.owner_id=? AND f.state490='pending' LIMIT 200`).bind(playerId,playerId).all();
 return {incoming:results.filter(r=>r.direction==='incoming').map(({id,name})=>({id,name})),outgoing:results.filter(r=>r.direction==='outgoing').map(({id,name})=>({id,name}))};
}
const acceptedCount=id=>`(SELECT COUNT(*) FROM player_friends487 WHERE owner_id=${id} AND state490='accepted')`;
export async function friendAction490(database,{playerId,accountId,action,targetPlayerId,now}){
 if(!['friend_add','friend_accept','friend_reject','friend_cancel','friend_remove'].includes(action))return {status:400,error:'Arkadaş işlemi geçersiz.'};
 if(typeof targetPlayerId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(targetPlayerId)||targetPlayerId===playerId)return {status:400,error:'Başka bir oyuncu seçmelisin.'};
 if(action==='friend_add'){
  const row=await database.prepare(`INSERT INTO player_friends487(owner_id,friend_id,created_at,state490)
   SELECT me.id,peer.id,?,'pending' FROM players me JOIN players peer ON peer.id=?
   WHERE me.id=? AND me.account_id=? AND ${acceptedCount('me.id')}<100 AND ${acceptedCount('peer.id')}<100
    AND (SELECT COUNT(*) FROM player_friends487 WHERE owner_id=me.id AND state490='pending')<100
    AND (SELECT COUNT(*) FROM player_friends487 WHERE friend_id=peer.id AND state490='pending')<100
    AND NOT EXISTS(SELECT 1 FROM player_friends487 WHERE owner_id=peer.id AND friend_id=me.id)
   ON CONFLICT(owner_id,friend_id) DO NOTHING RETURNING friend_id`).bind(now,targetPlayerId,playerId,accountId).first();
  if(row)return {status:200,ok:true,message:'Arkadaşlık isteği gönderildi.'};
  const existing=await database.prepare(`SELECT f.owner_id,f.state490 FROM player_friends487 f
   WHERE ((owner_id=? AND friend_id=?) OR (owner_id=? AND friend_id=?))
   AND EXISTS(SELECT 1 FROM players WHERE id=? AND account_id=?) LIMIT 2`).bind(playerId,targetPlayerId,targetPlayerId,playerId,playerId,accountId).all();
  if(existing.results.some(r=>r.state490==='accepted'))return {status:200,ok:true,message:'Zaten arkadaşsınız.'};
  if(existing.results.some(r=>r.owner_id===playerId))return {status:200,ok:true,message:'Arkadaşlık isteğin zaten bekliyor.'};
  if(existing.results.length)return {status:409,error:'Bu oyuncudan gelen istek var. Arkadaşlar bölümünden kabul edebilirsin.'};
  return {status:409,error:'Oyuncu bulunamadı veya arkadaş/istek sınırına ulaşıldı.'};
 }
 if(action==='friend_accept'){
  const row=await database.prepare(`WITH eligible AS MATERIALIZED (
   SELECT me.id AS receiver,peer.id AS sender FROM players me JOIN players peer ON peer.id=?
   WHERE me.id=? AND me.account_id=? AND ${acceptedCount('me.id')}<100 AND ${acceptedCount('peer.id')}<100
    AND EXISTS(SELECT 1 FROM player_friends487 WHERE owner_id=peer.id AND friend_id=me.id AND state490='pending'))
   INSERT INTO player_friends487(owner_id,friend_id,created_at,state490)
   SELECT receiver,sender,?,'accepted' FROM eligible WHERE true
   UNION ALL SELECT sender,receiver,?,'accepted' FROM eligible WHERE true
   ON CONFLICT(owner_id,friend_id) DO UPDATE SET state490='accepted'
   RETURNING friend_id`).bind(targetPlayerId,playerId,accountId,now,now).all();
  if(row.results.length===2)return {status:200,ok:true,message:'Arkadaşlık isteği kabul edildi.'};
  const already=await database.prepare(`SELECT 1 FROM player_friends487 f WHERE owner_id=? AND friend_id=? AND state490='accepted'
   AND EXISTS(SELECT 1 FROM player_friends487 WHERE owner_id=f.friend_id AND friend_id=f.owner_id AND state490='accepted')
   AND EXISTS(SELECT 1 FROM players WHERE id=? AND account_id=?)`).bind(playerId,targetPlayerId,playerId,accountId).first();
  if(already)return {status:200,ok:true,message:'Zaten arkadaşsınız.'};
  return {status:409,error:'İstek artık geçerli değil veya arkadaş listelerinden biri dolu.'};
 }
 const pair=action==='friend_reject'?"owner_id=? AND friend_id=? AND state490='pending'":action==='friend_cancel'?"owner_id=? AND friend_id=? AND state490='pending'":"((owner_id=? AND friend_id=?) OR (owner_id=? AND friend_id=?))";
 const ids=action==='friend_reject'?[targetPlayerId,playerId]:action==='friend_cancel'?[playerId,targetPlayerId]:[playerId,targetPlayerId,targetPlayerId,playerId];
 await database.prepare(`DELETE FROM player_friends487 WHERE (${pair}) AND EXISTS(SELECT 1 FROM players WHERE id=? AND account_id=?)`).bind(...ids,playerId,accountId).run();
 return {status:200,ok:true,message:action==='friend_reject'?'Arkadaşlık isteği reddedildi.':action==='friend_cancel'?'Arkadaşlık isteği geri çekildi.':'Arkadaşlık sona erdi.'};
}

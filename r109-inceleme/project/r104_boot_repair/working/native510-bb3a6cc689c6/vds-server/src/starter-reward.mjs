// Account ledger survives reconnects and world resets; rewards cannot be claimed twice.
export function createStarterReward(db,{now=Date.now,initialize=true}={}){
 if(initialize)db.exec(`CREATE TABLE IF NOT EXISTS prereg_rewards(account_id TEXT PRIMARY KEY,player_id TEXT NOT NULL,granted_at_ms INTEGER NOT NULL,opened_at_ms INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS starter_admin_grants(request_id TEXT PRIMARY KEY,account_id TEXT NOT NULL,player_id TEXT NOT NULL,admin_id TEXT NOT NULL,granted_at_ms INTEGER NOT NULL,opened_at_ms INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS starter_admin_pending ON starter_admin_grants(account_id,player_id,opened_at_ms)`);
 // Full world polls inspect the durable ledger first. Reuse compiled queries,
 // never cached results: eligibility and manual gifts can change between polls.
 const ledger=db.prepare('SELECT player_id,opened_at_ms FROM prereg_rewards WHERE account_id=?');
 let eligible,insertGrant;
 const eligibilitySql=`SELECT 1 FROM accounts a JOIN players p ON p.account_id=a.id CROSS JOIN launch_settings s
   WHERE a.id=? AND p.id=? AND s.id=1 AND a.created_at*1000>=s.registration_at AND a.created_at*1000<s.opens_at`;
 const insertGrantSql=`INSERT OR IGNORE INTO prereg_rewards(account_id,player_id,granted_at_ms)
   SELECT a.id,p.id,? FROM accounts a JOIN players p ON p.account_id=a.id CROSS JOIN launch_settings s
   WHERE a.id=? AND p.id=? AND s.id=1 AND a.created_at*1000>=s.registration_at AND a.created_at*1000<s.opens_at`;
 const pendingGrants=db.prepare('SELECT COUNT(*) n FROM starter_admin_grants WHERE account_id=? AND player_id=? AND opened_at_ms=0');
 function status(accountGrant,accountId,playerId){
  const row=accountGrant?.player_id===playerId?accountGrant:undefined;
  const pending=pendingGrants.get(accountId,playerId).n;
  const count=pending+(row&&!row.opened_at_ms?1:0);
  return {available:count>0,count,opened:!!row?.opened_at_ms};
 }
 // Read-only channel inspection. A null result requires the existing writer
 // operation, which rechecks eligibility and the winning account ledger row.
 // No result is cached: manual gifts and launch eligibility stay fresh.
 function inspect(accountId,playerId){
  const accountGrant=ledger.get(accountId);
  if(!accountGrant&&(eligible??=db.prepare(eligibilitySql)).get(accountId,playerId))return null;
  return status(accountGrant,accountId,playerId);
 }
 function grant(accountId,playerId){
  let accountGrant=ledger.get(accountId);
  if(!accountGrant&&(eligible??=db.prepare(eligibilitySql)).get(accountId,playerId)){
   // Retain the guarded INSERT and reread the winning ledger row: another
   // connection may change eligibility or claim this account after our read.
   (insertGrant??=db.prepare(insertGrantSql)).run(now(),accountId,playerId);
   accountGrant=ledger.get(accountId);
  }
  return status(accountGrant,accountId,playerId);
 }
 return {inspect,grant,send(adminId,playerId,requestId){
  if(typeof requestId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(requestId))throw new Error('Gönderim kimliği geçersiz.');
  const old=db.prepare('SELECT player_id,admin_id FROM starter_admin_grants WHERE request_id=?').get(requestId);
  if(old){if(old.player_id!==playerId||old.admin_id!==adminId)throw new Error('Gönderim kimliği başka işleme ait.');return;}
  const p=db.prepare('SELECT account_id FROM players WHERE id=?').get(playerId);
  if(!p)throw new Error('Oyuncu bulunamadı.');
  db.prepare('INSERT INTO starter_admin_grants(request_id,account_id,player_id,admin_id,granted_at_ms) VALUES(?,?,?,?,?)').run(requestId,p.account_id,playerId,adminId,now());
 },open(accountId,playerId){
  db.exec('BEGIN IMMEDIATE');try{
   grant(accountId,playerId);
   const changed=db.prepare('UPDATE prereg_rewards SET opened_at_ms=? WHERE account_id=? AND player_id=? AND opened_at_ms=0 RETURNING account_id').get(now(),accountId,playerId);
   const manual=changed?null:db.prepare('UPDATE starter_admin_grants SET opened_at_ms=? WHERE request_id=(SELECT request_id FROM starter_admin_grants WHERE account_id=? AND player_id=? AND opened_at_ms=0 ORDER BY granted_at_ms,request_id LIMIT 1) AND opened_at_ms=0 RETURNING request_id').get(now(),accountId,playerId);
   if(!changed&&!manual)throw new Error('Başlangıç Sandığı bulunamadı veya zaten açılmış.');
   const p=db.prepare('UPDATE players SET gems=gems+50,potions=potions+10 WHERE id=? AND account_id=? RETURNING id').get(playerId,accountId);
   if(!p)throw new Error('Karakter bulunamadı.');
   db.prepare("INSERT INTO player_pets(player_id,kind,name,equipped,acquired_at) VALUES(?,'starter','',0,?) ON CONFLICT(player_id,kind) DO UPDATE SET acquired_at=MAX(excluded.acquired_at,player_pets.acquired_at+259200)").run(playerId,Math.floor(now()/1000));
   db.exec('COMMIT');return {ok:true,message:'Başlangıç Sandığı açıldı: 50 Mücevher, 10 Kırmızı İksir ve 3 günlük Başlangıç Tilkisi! Petini Çanta bölümünden çağırabilirsin.'};
  }catch(e){db.exec('ROLLBACK');throw e;}
 }};
}

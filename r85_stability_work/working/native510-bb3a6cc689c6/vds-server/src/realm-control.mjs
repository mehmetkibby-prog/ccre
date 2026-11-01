// Durable configuration in the accounts authority. Never grants cross-realm
// gameplay ownership. Secondary realms cannot open in the 416a package.
export class RealmControl {
 constructor(db,manifest){
  this.db=db;this.manifest=manifest;
  db.exec(`CREATE TABLE IF NOT EXISTS realm_controls(id TEXT PRIMARY KEY,status TEXT NOT NULL,registration_open INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS realm_admin_receipts(request_id TEXT PRIMARY KEY,actor TEXT NOT NULL,input TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS realm_admin_receipts_date ON realm_admin_receipts(created_at_ms);`);
  const insert=db.prepare('INSERT OR IGNORE INTO realm_controls VALUES(?,?,?)');
  for(const r of manifest.realms)insert.run(r.id,r.status,r.registrationOpen?1:0);
 }
 cleanup(now=Date.now()){
  // Admin idempotency receipts are not reward/economy records. Keep 30 days,
  // bounded to 64 expired receipts per existing central cleanup turn.
  return this.db.prepare('DELETE FROM realm_admin_receipts WHERE request_id IN (SELECT request_id FROM realm_admin_receipts WHERE created_at_ms<? ORDER BY created_at_ms LIMIT 64)').run(now-30*86400000).changes;
 }
 realms(){const rows=new Map(this.db.prepare('SELECT * FROM realm_controls').all().map(r=>[r.id,r]));return this.manifest.realms.map(r=>({...r,status:rows.get(r.id)?.status??'closed',registrationOpen:!!rows.get(r.id)?.registration_open}));}
 saveRealm({realmId,status,registrationOpen}){
  if(!this.manifest.realms.some(r=>r.id===realmId)||!['open','closed','maintenance'].includes(status)||typeof registrationOpen!=='boolean')throw new Error('Invalid realm settings');
  if(this.manifest.phase==='416a'&&realmId!==this.manifest.primaryRealmId&&status==='open')throw new Error('Sunucu 2, 416b kabul testi ve ayrı onaydan önce açılamaz.');
  this.db.prepare('UPDATE realm_controls SET status=?,registration_open=? WHERE id=?').run(status,registrationOpen?1:0,realmId);
 }
 sanction(actor,input){
  if(!/^[a-f0-9-]{36}$/.test(input.requestId)||!['ban','unban','suspend'].includes(input.action)||typeof input.accountId!=='string'||input.accountId.length>100)throw new Error('Invalid account operation');
  if(input.accountId===actor)throw new Error('Kendi yönetici hesabını engelleyemezsin.');
  const data={accountId:input.accountId,action:input.action,untilMs:input.action==='suspend'?Number(input.untilMs):0,reason:String(input.reason??'').slice(0,240)};
  if(input.action==='suspend'&&(!Number.isSafeInteger(data.untilMs)||data.untilMs<=Date.now()||data.untilMs>Date.now()+365*86400000))throw new Error('Invalid suspension deadline');
  const fingerprint=JSON.stringify(data);this.db.exec('BEGIN IMMEDIATE');
  try{
   const receipt=this.db.prepare('SELECT * FROM realm_admin_receipts WHERE request_id=?').get(input.requestId);
   if(receipt){if(receipt.actor!==actor||receipt.input!==fingerprint)throw new Error('Request already used');this.db.exec('COMMIT');return JSON.parse(receipt.result);}
   const row=this.db.prepare('UPDATE accounts SET security_version=security_version+1,permanently_banned=?,suspended_until_ms=?,ban_reason=?,updated_at=? WHERE id=? RETURNING security_version').get(input.action==='ban'?1:0,data.untilMs,data.reason,Math.floor(Date.now()/1000),data.accountId);
   if(!row)throw new Error('Hesap bulunamadı.');
   this.db.prepare('DELETE FROM auth_sessions WHERE account_id=?').run(data.accountId);
   const result={ok:true,securityVersion:row.security_version};
   this.db.prepare('INSERT INTO realm_admin_receipts VALUES(?,?,?,?,?)').run(input.requestId,actor,fingerprint,JSON.stringify(result),Date.now());
   this.db.exec('COMMIT');return result;
  }catch(error){this.db.exec('ROLLBACK');throw error;}
 }
}

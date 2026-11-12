import {randomUUID} from 'node:crypto';

export const EPIN_PRODUCTS_R101=Object.freeze({'core-coins-200-v1':200,'core-coins-500-v1':500,'core-coins-1000-v1':1000,'core-coins-3000-v1':3000,'destek-paketi-100-v1':0});
const fail=message=>{throw Object.assign(Error(message),{status:400});};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=160;
// Native SHA256 is base64url. Hex is accepted for older imported metadata too.
const hash=v=>typeof v==='string'&&(/^[A-Za-z0-9_-]{43}$/.test(v)||/^[a-f0-9]{64}$/.test(v));
export class SharedEpinAuthorityR101 {
 constructor(db,{now=()=>Math.floor(Date.now()/1000)}={}) {
  this.db=db;this.now=now;
  db.exec(`CREATE TABLE IF NOT EXISTS shared_epin_batches_r101(id TEXT PRIMARY KEY,name TEXT NOT NULL,product_code TEXT NOT NULL,code_count INTEGER NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,created_realm TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS shared_epin_codes_r101(code_hash TEXT PRIMARY KEY,code_hint TEXT NOT NULL,batch_id TEXT NOT NULL REFERENCES shared_epin_batches_r101(id),product_code TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('active','redeemed','revoked')),created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,redeemed_at INTEGER NOT NULL DEFAULT 0,realm_id TEXT,account_id TEXT,player_id TEXT,grant_id TEXT UNIQUE);
   CREATE INDEX IF NOT EXISTS shared_epin_batch_r101 ON shared_epin_codes_r101(batch_id);
   CREATE TABLE IF NOT EXISTS shared_epin_import_r101(source_realm TEXT PRIMARY KEY,completed_at INTEGER NOT NULL);`);
 }
 atomic(fn) {this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 // Called only during a stopped, verified migration. Copy code metadata, never
 // the world, character table or a second independent spendable registry.
 importPrimary(source) {
  return this.atomic(()=>{
   if(this.db.prepare("SELECT 1 FROM shared_epin_import_r101 WHERE source_realm='r1'").get())return false;
   const batch=this.db.prepare('INSERT INTO shared_epin_batches_r101 VALUES(?,?,?,?,?,?,?)');
   for(const b of source.prepare('SELECT id,name,product_code,code_count,created_at,expires_at FROM epin_batches').iterate())batch.run(b.id,b.name,b.product_code,b.code_count,b.created_at,b.expires_at,'r1');
   const insert=this.db.prepare('INSERT INTO shared_epin_codes_r101(code_hash,code_hint,batch_id,product_code,status,created_at,expires_at,redeemed_at,realm_id,account_id,player_id,grant_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
   for(const c of source.prepare('SELECT * FROM epin_codes').iterate())insert.run(c.code_hash,c.code_hint,c.batch_id,c.product_code,c.status,c.created_at,c.expires_at,c.redeemed_at,'r1',c.redeemed_by_account_id??null,c.redeemed_by_player_id??null,null);
   this.db.prepare("INSERT INTO shared_epin_import_r101 VALUES('r1',?)").run(this.now());return true;
  });
 }
 create(realmId,data) {
  if(!['r1','r2'].includes(realmId)||!id(data.batchId)||!Object.hasOwn(EPIN_PRODUCTS_R101,data.productCode)||!Array.isArray(data.codes)||data.codes.length<1||data.codes.length>100||!Number.isSafeInteger(data.expiresAt)||data.expiresAt<0||data.expiresAt>this.now()+3650*86400)fail('Geçersiz ÇP kod paketi.');
  if(data.codes.some(c=>!hash(c.h)||typeof c.hint!=='string'||c.hint.length>40)||new Set(data.codes.map(c=>c.h)).size!==data.codes.length)fail('Geçersiz ÇP kodu.');
  return this.atomic(()=>{
   this.db.prepare('INSERT INTO shared_epin_batches_r101 VALUES(?,?,?,?,?,?,?)').run(data.batchId,String(data.name??'').slice(0,80),data.productCode,data.codes.length,this.now(),data.expiresAt,realmId);
   const insert=this.db.prepare("INSERT INTO shared_epin_codes_r101(code_hash,code_hint,batch_id,product_code,status,created_at,expires_at) VALUES(?,?,?,?,'active',?,?)");
   for(const c of data.codes)insert.run(c.h,c.hint,data.batchId,data.productCode,this.now(),data.expiresAt);
   return {ok:true};
  });
 }
 revoke(batchId){if(!id(batchId))fail('Geçersiz paket.');return {revoked:this.db.prepare("UPDATE shared_epin_codes_r101 SET status='revoked' WHERE batch_id=? AND status='active'").run(batchId).changes};}
 summary(){
  const count=this.db.prepare("SELECT COUNT(*) total,SUM(status='active') active,SUM(status='redeemed') redeemed,SUM(status='revoked') revoked FROM shared_epin_codes_r101").get();
  const batches=this.db.prepare(`SELECT b.*,SUM(c.status='active') active,SUM(c.status='redeemed') redeemed,SUM(c.status='revoked') revoked FROM shared_epin_batches_r101 b LEFT JOIN shared_epin_codes_r101 c ON c.batch_id=b.id GROUP BY b.id ORDER BY b.created_at DESC,b.id DESC LIMIT 100`).all();
  return {...Object.fromEntries(Object.entries(count).map(([k,v])=>[k,v??0])),batches,sharedAcrossRealms:true};
 }
 claim(realmId,{codeHash,accountId,playerId}) {
  if(!['r1','r2'].includes(realmId)||!hash(codeHash)||!id(accountId)||!id(playerId))fail('Geçersiz ÇP isteği.');
  return this.atomic(()=>{
   let c=this.db.prepare('SELECT * FROM shared_epin_codes_r101 WHERE code_hash=?').get(codeHash);
   if(!c)fail('E-PIN bulunamadı.');
   if(c.status==='revoked')fail('Bu E-PIN iptal edilmiş.');
   if(c.status==='redeemed'){
    // Imported historical spends have no new grant and can NEVER be credited again.
    if(!c.grant_id||c.realm_id!==realmId||c.account_id!==accountId||c.player_id!==playerId)fail('Bu E-PIN daha önce kullanılmış.');
   }else{
    if(c.expires_at>0&&c.expires_at<this.now())fail('Bu E-PIN’in kullanım süresi dolmuş.');
    if(!Object.hasOwn(EPIN_PRODUCTS_R101,c.product_code))fail('E-PIN ürünü artık desteklenmiyor.');
    c={...c,grant_id:randomUUID(),redeemed_at:this.now()};
    this.db.prepare("UPDATE shared_epin_codes_r101 SET status='redeemed',redeemed_at=?,realm_id=?,account_id=?,player_id=?,grant_id=? WHERE code_hash=? AND status='active'").run(c.redeemed_at,realmId,accountId,playerId,c.grant_id,codeHash);
   }
   return {grantId:c.grant_id,realmId,accountId,playerId,productCode:c.product_code,grantedAt:c.redeemed_at};
  });
 }
}
export function createEpinReceiptSchemaR101(db){db.exec(`CREATE TABLE IF NOT EXISTS epin_grants_r101(grant_id TEXT PRIMARY KEY,realm_id TEXT NOT NULL,account_id TEXT NOT NULL,player_id TEXT NOT NULL,product_code TEXT NOT NULL,credit_token TEXT NOT NULL,credited_at INTEGER NOT NULL);`);}

// Called inside the existing authenticated player economy barrier. The native
// batch is atomic and durable; its receipt and credit commit together. A lost
// accounts reply, retry, or process restart cannot duplicate the credit.
export async function creditSharedEpinR101(database,runtime,{accountId,playerId,codeHash,securityVersion}) {
 const grant=await runtime.call('/internal/epin/claim',{accountId,playerId,codeHash,securityVersion});
 if(grant.realmId!==runtime.id||grant.accountId!==accountId||grant.playerId!==playerId||!id(grant.grantId)||!Object.hasOwn(EPIN_PRODUCTS_R101,grant.productCode)||!Number.isSafeInteger(grant.grantedAt))throw Error('ÇP teslimatı doğrulanamadı.');
 const product=grant.productCode,coins=EPIN_PRODUCTS_R101[product],token=randomUUID(),now=grant.grantedAt;
 const prior=await database.prepare('SELECT * FROM epin_grants_r101 WHERE grant_id=?').bind(grant.grantId).first();
 if(prior&&(prior.account_id!==accountId||prior.player_id!==playerId||prior.realm_id!==runtime.id||prior.product_code!==product))throw Error('ÇP teslimat kaydı uyuşmuyor.');
 const exists='EXISTS(SELECT 1 FROM epin_grants_r101 WHERE grant_id=? AND credit_token=?)';
 await database.batch([
  database.prepare('INSERT OR IGNORE INTO epin_grants_r101 SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM players WHERE id=? AND account_id=?)').bind(grant.grantId,runtime.id,accountId,playerId,product,token,now,playerId,accountId),
  coins?database.prepare(`UPDATE players SET core_coins=core_coins+? WHERE id=? AND account_id=? AND ${exists}`).bind(coins,playerId,accountId,grant.grantId,token):database.prepare(`UPDATE players SET xp_ring_until=MAX(xp_ring_until,?)+432000,drop_charm_until=MAX(drop_charm_until,?)+432000,wings_expires_at_ms=MAX(wings_expires_at_ms,?)+1209600000,has_wings=1,wings_equipped=1 WHERE id=? AND account_id=? AND ${exists}`).bind(now,now,now*1000,playerId,accountId,grant.grantId,token)
 ]);
 const credited=await database.prepare('SELECT 1 AS ok FROM epin_grants_r101 WHERE grant_id=? AND account_id=? AND player_id=?').bind(grant.grantId,accountId,playerId).first();
 if(!credited)throw Error('ÇP teslimatı bekliyor. Aynı kodla yeniden dene.');
 return {...await database.prepare('SELECT xp_ring_until,drop_charm_until,has_wings,wings_equipped,core_coins FROM players WHERE id=? AND account_id=?').bind(playerId,accountId).first(),productCode:product,grantedCoins:coins};
}

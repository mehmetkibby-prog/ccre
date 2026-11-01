// Private gem custody. Kept as additive tables so V484 code rollback cannot
// refund, reset or consume banked value. No triggers, clocks or background jobs.
export const BANK_CAP485=9000000000000;
export const BANK_TRANSFER_CAP485=1000000000;
const fail=message=>{throw Object.assign(Error(message),{bankExpected485:true});};
export function ensureGemBank485(db){
 db.exec(`CREATE TABLE IF NOT EXISTS gem_bank485 (
  player_id TEXT PRIMARY KEY NOT NULL, account_id TEXT NOT NULL,
  gems INTEGER NOT NULL DEFAULT 0 CHECK(typeof(gems)='integer' AND gems BETWEEN 0 AND 9000000000000),
  paid_gems INTEGER NOT NULL DEFAULT 0 CHECK(typeof(paid_gems)='integer' AND paid_gems BETWEEN 0 AND gems)
 );
 CREATE TABLE IF NOT EXISTS gem_bank_receipts485 (
  player_id TEXT NOT NULL, request_id TEXT NOT NULL, account_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, result TEXT NOT NULL, created_at_ms INTEGER NOT NULL,
  PRIMARY KEY(player_id,request_id)
 );`);
}
function actor(db,p,accountId){
 if(!p||typeof accountId!=='string'||!accountId||p.account_id!==accountId)fail('Banka hesap doğrulaması başarısız.');
 if(p.loadlab_run_id||db.prepare('SELECT 1 FROM loadlab_entities_v1 WHERE id=? OR account_id=? LIMIT 1').get(p.id,p.account_id)||db.prepare('SELECT 1 FROM loadlab_admissions_v1 WHERE account_id=? LIMIT 1').get(p.account_id))fail('Test hesapları mücevher bankasını kullanamaz.');
}
function bankRow(db,p){
 const row=db.prepare('SELECT account_id,gems,paid_gems FROM gem_bank485 WHERE player_id=?').get(p.id);
 if(row&&row.account_id!==p.account_id)fail('Banka hesap kaydı doğrulanamadı.');
 const value=row??{gems:0,paid_gems:0};
 if(!Number.isSafeInteger(value.gems)||value.gems<0||value.gems>BANK_CAP485||!Number.isSafeInteger(value.paid_gems)||value.paid_gems<0||value.paid_gems>value.gems)fail('Banka bakiye kaydı doğrulanamadı.');
 return value;
}
export function gemBankSnapshot485(db,p){
 const bank=bankRow(db,p);
 return {playerId:p.id,wallet:p.gems,balance:bank.gems,capacity:BANK_CAP485,transferLimit:BANK_TRANSFER_CAP485};
}
export function gemBankAct485(db,id,input,accountId,{now=Date.now,nearby}={}){
 if(!input||!['gem_bank_deposit','gem_bank_withdraw'].includes(input.action)||!Number.isSafeInteger(input.amount)||input.amount<1||input.amount>BANK_TRANSFER_CAP485||typeof input.requestId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(input.requestId))fail('Geçerli bir mücevher tutarı seç (1–1.000.000.000).');
 const {action,amount,requestId}=input,fingerprint=JSON.stringify([action,amount]);
 let authenticated=false,mutated=false;
 const receipt=result=>{db.prepare('INSERT INTO gem_bank_receipts485(player_id,request_id,account_id,fingerprint,result,created_at_ms) VALUES(?,?,?,?,?,?)').run(id,requestId,accountId,fingerprint,JSON.stringify(result),now());db.exec('COMMIT');return result;};
 db.exec('BEGIN IMMEDIATE');
 try{
  const p=db.prepare('SELECT * FROM players WHERE id=?').get(id);actor(db,p,accountId);
  authenticated=true;const bank=bankRow(db,p);
  // An acknowledged old request remains a receipt after travel, death, restart
  // and code rollback. Replays never run a new debit, even after 24 hours.
  const old=db.prepare('SELECT * FROM gem_bank_receipts485 WHERE player_id=? AND request_id=?').get(id,requestId);
  if(old){if(old.account_id!==accountId||old.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir banka işlemi için kullanıldı.');const result=JSON.parse(old.result);db.exec('COMMIT');return result;}
  try{nearby(p);}catch(error){error.bankExpected485=true;throw error;}
  if(db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(id)||db.prepare('SELECT 1 FROM player_trade_locks WHERE player_id=?').get(id))fail('Banka için zindandan veya takastan çıkmalısın.');
  if(!Number.isSafeInteger(p.gems)||p.gems<0||!Number.isSafeInteger(p.wheel_paid_gems)||p.wheel_paid_gems<0||p.wheel_paid_gems>p.gems)fail('Mücevher bakiye kaydı doğrulanamadı.');
  const deposit=action==='gem_bank_deposit',paid=deposit?Math.max(0,amount-(p.gems-p.wheel_paid_gems)):Math.min(bank.paid_gems,amount);
  const wallet=p.gems+(deposit?-amount:amount),balance=bank.gems+(deposit?amount:-amount),walletPaid=p.wheel_paid_gems+(deposit?-paid:paid),bankPaid=bank.paid_gems+(deposit?paid:-paid);
  if(deposit&&p.gems<amount)fail('Üzerinde yeterli mücevher yok.');
  if(!deposit&&bank.gems<amount)fail('Bankada yeterli mücevher yok.');
  if(balance>BANK_CAP485)fail('Banka mücevher sınırına ulaştın.');
  if(!deposit&&wallet>BANK_CAP485)fail('Üzerindeki mücevher sınırına ulaştın.');
  if(!Number.isSafeInteger(wallet)||!Number.isSafeInteger(balance)||wallet<0||balance<0||walletPaid<0||walletPaid>wallet||bankPaid<0||bankPaid>balance)fail('Mücevher tutarı geçersiz.');
  mutated=true;
  if(db.prepare('UPDATE players SET gems=?,wheel_paid_gems=? WHERE id=? AND account_id=? AND gems=? AND wheel_paid_gems=?').run(wallet,walletPaid,id,accountId,p.gems,p.wheel_paid_gems).changes!==1)fail('Mücevher bakiyesi değişti; tekrar dene.');
  db.prepare('INSERT INTO gem_bank485(player_id,account_id,gems,paid_gems) VALUES(?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET gems=excluded.gems,paid_gems=excluded.paid_gems WHERE account_id=excluded.account_id').run(id,accountId,balance,bankPaid);
  return receipt({ok:true,message:deposit?'Mücevher bankaya yatırıldı.':'Mücevher bankadan çekildi.',gemBank:{playerId:id,wallet,balance,capacity:BANK_CAP485,transferLimit:BANK_TRANSFER_CAP485}});
 }catch(error){
  // A business rejection is also a stable terminal receipt. An uncertain SQL /
  // COMMIT failure is rolled back and thrown, so the client keeps the same ID.
  if(authenticated&&!mutated&&error.bankExpected485){try{return receipt({ok:false,bankRejected485:true,message:error.message});}catch(recordError){db.exec('ROLLBACK');throw recordError;}}
  db.exec('ROLLBACK');throw error;
 }
}

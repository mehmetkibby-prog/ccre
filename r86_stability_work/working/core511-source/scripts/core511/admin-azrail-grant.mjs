import {createHash} from 'node:crypto';
import {TOWER_CHEST} from './tower-config.mjs';

const reject=(message,status=422)=>{throw Object.assign(new Error(message),{status});};
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=160&&!/[\u0000-\u001f]/u.test(value);
const receiptKind='admin_azrail_grant_r31';
// The admin identity comes only from the existing native requireAdmin route.
// No callback, identity, owner, epoch or SQL may be supplied by the HTTP body.
export class AdminAzrailGrant {
 constructor(database,getCore){this.database=database;this.getCore=getCore;}
 async grant(input,{adminId,reauthorize}={}){
  if(!identifier(adminId)||typeof reauthorize!=='function')reject('Yönetici kimliği doğrulanamadı.',403);
  if(!input||typeof input!=='object'||Array.isArray(input)||input.action!=='grant_azrail_chests')reject('Geçersiz sandık gönderme isteği.');
  if(!identifier(input.playerId))reject('Geçerli bir oyuncu seç.');
  if(!Number.isSafeInteger(input.amount)||input.amount<1)reject('Sandık adedi pozitif bir tam sayı olmalı.');
  if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/u.test(input.requestId))reject('Geçerli bir işlem kimliği gerekiyor.');
  const request=Object.freeze({playerId:input.playerId,amount:input.amount,requestId:input.requestId});
  const core=this.getCore?.();
  if(!core||core.database!==this.database||core.closed||core.stopping||typeof core.serial!=='function'||typeof core.permanent?.permanentPlayers!=='function')reject('Çekirdek sandık gönderimine hazır değil. Biraz sonra tekrar dene.',503);
  return core.serial(async()=>{
   if(await reauthorize()!==adminId)reject('Yönetici oturumu değişti. Paneli yenileyip tekrar dene.',403);
   if(core.closed||core.stopping||core.recoveringWorld)reject('Çekirdek şu anda meşgul. Aynı işlemi biraz sonra tekrar dene.',503);
   // Expected transfer/recovery races are user-visible retries, never demand().
   if(core.transitions?.has(request.playerId)||core.permanent.entries?.has(request.playerId))reject('Oyuncu kanal veya oturum değiştiriyor. Aynı işlemi tekrar dene.',409);
   const sql=this.database.sqlite;
   if(!sql.prepare('SELECT id FROM players WHERE id=?').get(request.playerId))reject('Oyuncu bulunamadı.',404);
   // Namespace by the authenticated admin, not by target. Reusing one request
   // with a different target or amount cannot accidentally create another gift.
   const scope='admin-r31:'+createHash('sha256').update(adminId).digest('hex');
   return core.permanent.permanentPlayers([request.playerId],()=>{
    if(sql.isTransaction)reject('Yazıcı şu anda meşgul. Aynı işlemi tekrar dene.',503);
    sql.exec('BEGIN IMMEDIATE');
    try{
     const old=sql.prepare('SELECT result FROM kadim_tower_receipts WHERE player_id=? AND request_id=? AND kind=?').get(scope,request.requestId,receiptKind);
     if(old){
      const saved=JSON.parse(old.result);
      if(saved.playerId!==request.playerId||saved.amount!==request.amount||saved.adminId!==adminId)reject('Aynı işlem kimliği farklı oyuncu veya miktar için kullanılamaz.',409);
      sql.exec('COMMIT');const {adminId:_,...result}=saved;return {...result,replayed:true};
     }
     const player=sql.prepare('SELECT id,name FROM players WHERE id=?').get(request.playerId);if(!player)reject('Oyuncu bulunamadı.',404);
     const balance=Number(sql.prepare('SELECT CAST(amount AS TEXT) AS amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(request.playerId,TOWER_CHEST.kind)?.amount??0);
     if(!Number.isSafeInteger(balance)||balance<0||request.amount>Number.MAX_SAFE_INTEGER-balance)reject('Sandık miktarı güvenli envanter sınırını aşıyor.');
     sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount').run(request.playerId,TOWER_CHEST.kind,request.amount);
     const result={playerId:player.id,playerName:player.name,amount:request.amount,balance:balance+request.amount,requestId:request.requestId,replayed:false};
     sql.prepare('INSERT INTO kadim_tower_receipts(player_id,request_id,kind,result) VALUES(?,?,?,?)').run(scope,request.requestId,receiptKind,JSON.stringify({...result,adminId}));
     sql.exec('COMMIT');return result;
    }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
   });
  });
 }
}

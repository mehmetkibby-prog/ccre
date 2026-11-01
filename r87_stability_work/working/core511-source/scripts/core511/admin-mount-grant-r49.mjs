import {MountService} from './mounts-service.mjs';
import {mountItem} from './mounts-model.mjs';
import {prepareServerStatement} from './server-statements.mjs';

const reject=(message,status=422,gameCode='mount_grant_invalid')=>{throw Object.assign(new Error(message),{status,gameCode});};
const identifier=value=>typeof value==='string'&&value.length>0&&value.length<=160&&!/[\u0000-\u001f]/u.test(value);

// Only the authenticated native admin route supplies identity and reauthorize.
// MountService owns the allowlist, bound inventory and durable admin receipt.
export class AdminMountGrantR49 {
 constructor(database,getCore,{service=new MountService(database.sqlite)}={}){Object.assign(this,{database,getCore,service});}
 async grant(input,{adminId,reauthorize}={}){
  if(!identifier(adminId)||typeof reauthorize!=='function')reject('Yönetici kimliği doğrulanamadı.',403);
  if(!input||typeof input!=='object'||Array.isArray(input)||input.action!=='grant_mount_material_r49')reject('Geçersiz binek malzemesi gönderme isteği.');
  const item=mountItem(input.kind);
  if(!identifier(input.playerId)||!item)reject('Geçerli bir oyuncu ve binek malzemesi seç.');
  if(!Number.isSafeInteger(input.amount)||input.amount<1||input.amount>item.cap)reject('Malzeme adedi 1 ile '+item.cap+' arasında bir tam sayı olmalı.');
  if(typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/u.test(input.requestId))reject('Geçerli bir işlem kimliği gerekiyor.');
  const request=Object.freeze({playerId:input.playerId,kind:input.kind,amount:input.amount,requestId:input.requestId});
  const core=this.getCore?.();
  if(!core||core.database!==this.database||core.closed||core.stopping||typeof core.serial!=='function'||typeof core.permanent?.permanentPlayers!=='function')reject('Çekirdek gönderime hazır değil. Aynı işlemi biraz sonra tekrar dene.',503);
  return core.serial(async()=>{
   if(await reauthorize()!==adminId)reject('Yönetici oturumu değişti. Paneli yenileyip tekrar dene.',403);
   if(core.closed||core.stopping||core.recoveringWorld)reject('Çekirdek şu anda meşgul. Aynı işlemi biraz sonra tekrar dene.',503);
   this.service.requireEnabled();
   if(core.transitions?.has(request.playerId)||core.permanent.entries?.has(request.playerId))reject('Oyuncu kanal veya oturum değiştiriyor. Aynı işlemi tekrar dene.',409,'mount_player_busy');
   const sql=this.database.sqlite;
   if(!prepareServerStatement(sql,'SELECT id FROM players WHERE id=?').get(request.playerId))reject('Oyuncu bulunamadı.',404,'mount_player_missing');
   // Use the existing target-only hold → transaction → disk → refresh/resume
   // contract. Never use the world/configuration barrier for a single gift.
   return core.permanent.permanentPlayers([request.playerId],()=>{
    if(sql.isTransaction)reject('Yazıcı şu anda meşgul. Aynı işlemi tekrar dene.',503);
    sql.exec('BEGIN IMMEDIATE');
    try{
     const result=this.service.grant(request.playerId,request,adminId);
     sql.exec('COMMIT');return result;
    }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
   });
  });
 }
}

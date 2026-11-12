import {ENHANCEMENT_CATALOG491} from '../../../native510-bb3a6cc689c6/lib/enhancement491.mjs';
import {TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK} from './tower-config.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';
import {gameplayR58} from './r58-gameplay-options.mjs';
import {accessoryDefinitionR58,grantAccessoriesR58} from './admin-accessories-r58.mjs';

export const ADMIN_MATERIALS_R55=Object.freeze([
 ...ENHANCEMENT_CATALOG491,
 ...[...TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK].map(x=>({id:'material:'+x.kind,name:x.name,group:'Kadim Kulesi',table:'dungeon_materials',kind:x.kind})),
 {id:'resource:mastery_seals492',name:'Ustalık Mührü',group:'Artı basma',table:'players',column:'mastery_seals492'}
].map(x=>Object.freeze({...x,cap:1000000})));
const catalog=new Map(ADMIN_MATERIALS_R55.map(x=>[x.id,x]));
const reject=(message,status=422,gameCode='material_grant_invalid')=>{throw Object.assign(Error(message),{status,gameCode});};
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160&&!/[\u0000-\u001f]/u.test(value);
export function createAdminMaterialSchemaR55(sql){sql.exec(`CREATE TABLE IF NOT EXISTS admin_material_receipts_r55(admin_id TEXT NOT NULL,request_id TEXT NOT NULL,operation TEXT NOT NULL,result_json TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(admin_id,request_id));`);}
export class AdminMaterialsR55{
 constructor(database,getCore,{enabled=gameplayR55.adminMaterials,accessories=gameplayR58.adminAccessories,clock=Date.now}={}){Object.assign(this,{database,getCore,enabled,accessories,clock});}
 async grant(input,{adminId,reauthorize}={}){
  if(!this.enabled&&!(this.accessories&&accessoryDefinitionR58(input?.kind)))reject('Malzeme gönderimi kapalı.',404,'material_grant_disabled');
  if(!id(adminId)||typeof reauthorize!=='function')reject('Yönetici kimliği doğrulanamadı.',403);
  const item=(this.enabled?catalog.get(input?.kind):null)??(this.accessories?accessoryDefinitionR58(input?.kind):null);
  if(input?.action!=='grant_enhancement_material_r55'||!id(input.playerId)||!item||!Number.isSafeInteger(input.amount)||input.amount<1||input.amount>item.cap||typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId))reject('Geçerli oyuncu, malzeme, adet ve işlem kimliği gerekli.');
  const request={playerId:input.playerId,kind:item.id,amount:input.amount,requestId:input.requestId},operation=JSON.stringify([request.playerId,request.kind,request.amount]);
  const core=this.getCore?.();if(!core||core.database!==this.database||typeof core.serial!=='function'||typeof core.permanent?.permanentPlayers!=='function')reject('Malzeme hizmeti hazır değil.',503);
  return core.serial(async()=>{
   if(await reauthorize()!==adminId)reject('Yönetici oturumu değişti.',403);
   if(core.closed||core.stopping||core.recoveringWorld)reject('Çekirdek meşgul. Aynı gönderimi yeniden sorgula.',503);
   if(core.transitions?.has(request.playerId)||core.permanent.entries?.has(request.playerId))reject('Oyuncu oturum değiştiriyor. Aynı gönderimi yeniden sorgula.',409,'material_player_busy');
   const sql=this.database.sqlite,q=text=>prepareServerStatement(sql,text);
   if(!q('SELECT id FROM players WHERE id=?').get(request.playerId))reject('Oyuncu bulunamadı.',404,'material_player_missing');
   return core.permanent.permanentPlayers([request.playerId],()=>{
    if(sql.isTransaction)reject('Yazıcı meşgul. Aynı gönderimi yeniden sorgula.',503);
    sql.exec('BEGIN IMMEDIATE');
    try{
     const old=q('SELECT operation,result_json FROM admin_material_receipts_r55 WHERE admin_id=? AND request_id=?').get(adminId,request.requestId);
     if(old){if(old.operation!==operation)reject('İşlem kimliği başka bir gönderimde kullanıldı.',409,'material_request_conflict');sql.exec('COMMIT');return {...JSON.parse(old.result_json),replayed:true};}
     let inventory;
     if(item.equipment)inventory=grantAccessoriesR58(sql,item,request,this.clock());
     else {
     // SQL identifiers come only from the immutable server catalogue.
     const prior=item.table==='players'?q(`SELECT ${item.column} amount FROM players WHERE id=?`).get(request.playerId)?.amount:q(`SELECT amount FROM ${item.table} WHERE player_id=? AND kind=?`).get(request.playerId,item.kind)?.amount??0;
     if(!Number.isSafeInteger(prior)||prior<0||request.amount>Number.MAX_SAFE_INTEGER-prior)reject('Malzeme bakiyesi güvenli sınırı aşıyor.',422,'material_balance_limit');
     const balance=prior+request.amount;
     if(item.table==='players')q(`UPDATE players SET ${item.column}=? WHERE id=?`).run(balance,request.playerId);
     else q(`INSERT INTO ${item.table}(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount`).run(request.playerId,item.kind,balance);
     inventory={balance};
     }
     const result={ok:true,...request,...inventory,replayed:false};
     q('INSERT INTO admin_material_receipts_r55(admin_id,request_id,operation,result_json,created_at_ms) VALUES(?,?,?,?,?)').run(adminId,request.requestId,operation,JSON.stringify(result),this.clock());
     sql.exec('COMMIT');return result;
    }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
   });
  });
 }
}

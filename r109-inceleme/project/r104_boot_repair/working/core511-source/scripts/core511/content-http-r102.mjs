import {ContentServiceR102} from './content-service-r102.mjs';
import {contentErrorR102} from './content-model-r102.mjs';
export class ContentHttpR102{
 constructor(database,getCore){this.database=database;this.getCore=getCore;}
 core(){const c=this.getCore();if(c.closed||c.stopping||c.recoveringWorld)throw contentErrorR102('Oyun bağlantısı hazırlanıyor.','content_unavailable_r102',503);return c;}
 service(c){return c.writer.services.globals.__colContentR102;}
 async route(request){
  if(new URL(request.url).pathname!=='/api/content-r102')return null;
  if(request.method!=='GET')return new Response(null,{status:405,headers:{allow:'GET'}});
  try{
   const c=this.core(),session=await c.authenticate(request,{csrf:false});if(!session?.player?.id)throw contentErrorR102('Önce oyuna gir.','authentication_required',401);
   const result=await c.serial(async()=>{const current=await c.authenticate(request,{csrf:false});if(current?.player?.id!==session.player.id||current?.account?.id!==session.account.id||current?.tokenHash!==session.tokenHash)throw contentErrorR102('Oturumun değişti.','game_instance_expired',401);return this.service(c).status(current.player.id);});
   return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch(e){const status=[400,401,403,404,409,422,429,503].includes(e.status)?e.status:503;return Response.json({error:status===503?'Bilgiler şu anda alınamadı. Yeniden deneyebilirsin.':e.message,code:e.gameCode??'content_unavailable_r102'},{status,headers:{'cache-control':'no-store'}});}
 }
 atomic(fn){const sql=this.database.sqlite;if(sql.isTransaction)throw contentErrorR102('Yazıcı meşgul.','content_busy_r102',503);sql.exec('BEGIN IMMEDIATE');try{const r=fn();sql.exec('COMMIT');return r;}catch(e){if(sql.isTransaction)sql.exec('ROLLBACK');throw e;}}
 async admin(input,{adminId,reauthorize}){
  const c=this.core();if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')throw contentErrorR102('Yönetici kimliği gerekli.','content_admin_r102',403);
  const authorize=async()=>{if(await reauthorize()!==adminId)throw contentErrorR102('Yönetici oturumu değişti.','content_admin_r102',403);return adminId;};
  if(input?.action==='content_read_r102')return c.serial(async()=>{await authorize();const s=this.service(c);return {...s.settings(),catalog:s.catalog()};});
  if(input?.action==='content_save_r102')return this.database.core511Configuration.runAdminSettingsR65('content_save_r102',()=>this.atomic(()=>this.service(c).saveConfig(input.config,input.revision,adminId)),authorize);
  if(input?.action==='champion_grant_r102')return c.nativeHttpAction.adminPlayer(input,{adminId,reauthorize:authorize},()=>this.atomic(()=>this.service(c).adminChampion(input.playerId,input.level,adminId)));
  throw contentErrorR102('Geçersiz yönetici işlemi.');
 }
}

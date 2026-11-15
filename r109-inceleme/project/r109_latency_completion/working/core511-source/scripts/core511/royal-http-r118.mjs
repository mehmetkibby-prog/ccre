import {royalErrorR118} from './royal-model-r118.mjs';
import {validateChampionsConfigR118} from './champions-config-r118.mjs';

// HTTP only reads the authenticated character. Mutations travel through the
// existing owned action writer; admin saves use its global configuration gate.
export class RoyalHttpR118{
 constructor(database,getCore){this.database=database;this.getCore=getCore;}
 core(){const c=this.getCore();if(c.closed||c.stopping||c.recoveringWorld)throw royalErrorR118('Oyun bağlantısı hazırlanıyor.','royal_unavailable_r118',503);return c;}
 service(c){return c.writer.services.globals.__colRoyalR118;}
 async route(request){
  if(new URL(request.url).pathname!=='/api/royal-r118')return null;
  if(request.method!=='GET')return new Response(null,{status:405,headers:{allow:'GET','cache-control':'no-store'}});
  try{
   const c=this.core(),session=await c.authenticate(request,{csrf:false});
   if(!session?.player?.id)throw royalErrorR118('Önce oyuna gir.','authentication_required',401);
   const result=await c.serial(async()=>{
    const current=await c.authenticate(request,{csrf:false});
    if(current?.player?.id!==session.player.id||current?.account?.id!==session.account.id||current?.tokenHash!==session.tokenHash)throw royalErrorR118('Oturumun değişti.','game_instance_expired',401);
    return this.service(c).status(current.player.id);
   });return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch(e){const status=[400,401,403,404,409,422,429,503].includes(e.status)?e.status:503;return Response.json({error:status===503?'Kraliyet bilgileri alınamadı. Yeniden deneyebilirsin.':e.message,code:e.gameCode??'royal_unavailable_r118'},{status,headers:{'cache-control':'no-store'}});}
 }
 atomic(fn){const sql=this.database.sqlite;if(sql.isTransaction)throw royalErrorR118('Yazıcı meşgul.','royal_busy_r118',503);sql.exec('BEGIN IMMEDIATE');try{const r=fn();sql.exec('COMMIT');return r;}catch(e){if(sql.isTransaction)sql.exec('ROLLBACK');throw e;}}
 async admin(input,{adminId,reauthorize}){
  const c=this.core();if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')throw royalErrorR118('Yönetici kimliği gerekli.','royal_admin_r118',403);
  const authorize=async()=>{if(await reauthorize()!==adminId)throw royalErrorR118('Yönetici oturumu değişti.','royal_admin_r118',403);return adminId;};
  if(input?.action==='royal_admin_read_r118')return c.serial(async()=>{await authorize();const s=this.service(c);return {...s.settings(),catalog:s.catalog()};});
  if(input?.action==='royal_admin_save_r118')return this.database.core511Configuration.runAdminSettingsR65(input.action,()=>this.atomic(()=>this.service(c).saveConfig(input.config,input.revision,adminId)),authorize);
  throw royalErrorR118('Geçersiz yönetici işlemi.');
 }
 async championsAdmin(input,{adminId,reauthorize}){
  const c=this.core();if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')throw royalErrorR118('Yönetici kimliği gerekli.','champions_admin_r118',403);
  const authorize=async()=>{if(await reauthorize()!==adminId)throw royalErrorR118('Yönetici oturumu değişti.','champions_admin_r118',403);return adminId;};
  const service=()=>c.writer.services.globals.__colChampionsR118;
  if(input?.action==='champions_admin_read_r118')return c.serial(async()=>{await authorize();return service().settings();});
  if(input?.action==='champions_admin_save_r118'){
   let config;try{config=validateChampionsConfigR118(input.config);}catch{throw royalErrorR118('Şampiyonlar Diyarı ayarları geçersiz.','champions_config_invalid_r118',422);}
   return this.database.core511Configuration.runAdminSettingsR65(input.action,()=>this.atomic(()=>service().save(config,input.revision,adminId)),authorize);
  }
  throw royalErrorR118('Geçersiz yönetici işlemi.');
 }
}

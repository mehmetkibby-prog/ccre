import {ZumrutServiceR93} from './zumrut-service-r93.mjs';
const reject=(message,status=503)=>{throw Object.assign(Error(message),{status});};
// Reuses the authenticated native admin endpoint and the single durable writer.
// Settings are read only on a valley interaction, so no broadcasts or timer.
export class ZumrutAdminR93{
 constructor(database,getCore){this.database=database;this.getCore=getCore;this.service=new ZumrutServiceR93(database.sqlite);}
 async admin(input,{adminId,reauthorize}){
  if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')reject('Yönetici kimliği doğrulanamadı.',403);
  if(!input||!['zumrut_admin_get','zumrut_admin_save'].includes(input.action))reject('Geçersiz vadi ayarı işlemi.',422);
  const c=this.getCore();if(c.closed||c.stopping||c.recoveringWorld)reject('Oyun sunucusu hazırlanıyor.');
  return c.serial(async()=>{
   if(await reauthorize()!==adminId)reject('Yönetici oturumu değişti.',403);
   if(input.action==='zumrut_admin_get')return this.service.adminGet();
   return this.database.atomic(()=>this.service.saveConfig(input.config,input.revision));
  });
 }
}

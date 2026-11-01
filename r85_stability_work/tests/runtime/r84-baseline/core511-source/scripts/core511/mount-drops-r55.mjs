import {randomInt} from 'node:crypto';
import {MOUNT_RECIPE,mountEnabled,mountItem} from './mounts-model.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';
export const MOUNT_DROP_AREAS_R55=Object.freeze([
 ['forest','Kuzey Ormanı'],['frozen','Donmuş Çam Geçidi'],['black','Kara Bölge'],['ancient','Kadim Kök Vadisi'],['sanctum','Yaşam Çekirdeği Tapınağı'],['sinsi','Sinsi Taş Vadisi'],['dragon','Külkanat Krateri'],['rune','Kadim Rün Sahili'],['rune_v2','Karanlık Rün Sahili'],['event','Etkinlik Adası']
].map(([id,label])=>Object.freeze({id,label})));
const areas=new Set(MOUNT_DROP_AREAS_R55.map(x=>x.id));
export const MOUNT_DROP_DEFAULTS_R55=Object.freeze({materials:MOUNT_RECIPE.map((x,i)=>({kind:x.kind,mode:'legacy',sources:[{area:['forest','frozen','black'][i],chance:[100,20,10][i],monsters:'normal'}]}))});
export function validateMountDropsR55(value){
 const bad=()=>{throw Object.assign(Error('Binek düşme ayarı geçersiz. Üç malzeme için harita, canavar türü ve %0–100 oranı seç.'),{status:422,gameCode:'mount_drop_config_invalid'});};
 if(!value||!Array.isArray(value.materials)||value.materials.length!==MOUNT_RECIPE.length||Object.keys(value).some(k=>k!=='materials'))bad();
 const seen=new Set(),materials=value.materials.map(row=>{
  if(!MOUNT_RECIPE.some(x=>x.kind===row?.kind)||seen.has(row.kind)||!['legacy','chance'].includes(row.mode)||!Array.isArray(row.sources)||row.sources.length>20||Object.keys(row).some(k=>!['kind','mode','sources'].includes(k)))bad();seen.add(row.kind);
  const keys=new Set(),sources=row.sources.map(s=>{const key=s?.area+':'+s?.monsters;if(!areas.has(s?.area)||!['normal','boss','stone'].includes(s?.monsters)||keys.has(key)||typeof s?.chance!=='number'||!Number.isFinite(s.chance)||s.chance<0||s.chance>100||Math.abs(s.chance*100-Math.round(s.chance*100))>1e-7||Object.keys(s).some(k=>!['area','chance','monsters'].includes(k)))bad();keys.add(key);return {area:s.area,chance:s.chance,monsters:s.monsters};});
  if(row.mode==='legacy'&&JSON.stringify(sources)!==JSON.stringify(MOUNT_DROP_DEFAULTS_R55.materials.find(x=>x.kind===row.kind).sources))bad();
  return {kind:row.kind,mode:row.mode,sources};
 });return {materials:MOUNT_RECIPE.map(x=>materials.find(m=>m.kind===x.kind))};
}
export function createMountDropSchemaR55(sql){sql.exec('CREATE TABLE IF NOT EXISTS mount_drop_settings_r55(id INTEGER PRIMARY KEY CHECK(id=1),config_json TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0))');sql.prepare('INSERT OR IGNORE INTO mount_drop_settings_r55 VALUES(1,?,1)').run(JSON.stringify(MOUNT_DROP_DEFAULTS_R55));}
const cache=new WeakMap();
export function mountDropConfigR55(sql){
 if(!gameplayR55.mountDrops)return null;
 const row=prepareServerStatement(sql,'SELECT config_json,revision FROM mount_drop_settings_r55 WHERE id=1').get();
 if(!row)throw Error('mount_drop_config_missing');let value=cache.get(sql);
 if(!value||value.raw!==row.config_json){value={raw:row.config_json,config:validateMountDropsR55(JSON.parse(row.config_json))};cache.set(sql,value);}
 return {config:value.config,revision:row.revision};
}
export function awardMountMaterialsR55(service,id,{area,type,huntCount,huntBefore,config,roll=randomInt}){
 for(const entry of config.materials){
  if(service.amount(id,entry.kind)>=mountItem(entry.kind).cap)continue;
  if(entry.mode==='legacy'){
   if(type!=='normal'||huntBefore>=50)continue;
   if(entry.kind==='saddle_leather'&&area==='forest'&&huntCount<=30||entry.kind==='saddle_buckle'&&area==='frozen'&&huntCount%5===0||entry.kind==='saddle_rein'&&area==='black'&&huntCount%10===0)service.add(id,entry.kind,1);
  }else{
   const source=entry.sources.find(s=>s.area===area&&s.monsters===type);
   if(!source||source.chance===0)continue;
   // Independent bounded RNG: never consumes native combat/drop draws.
   const bp=Math.round(source.chance*100);
   if(bp===10000||roll(10000)<bp)service.add(id,entry.kind,1);
  }
 }
}
export class AdminMountDropsR55{
 constructor(database,getCore){Object.assign(this,{database,getCore});}
 async execute(input,{adminId,reauthorize}={}){
  const reject=(m,status=409,gameCode='mount_drop_busy')=>{throw Object.assign(Error(m),{status,gameCode});};
  if(!mountEnabled()||!gameplayR55.mountDrops)reject('Binek ayarları kapalı.',404,'mount_drop_disabled');
  if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')reject('Yönetici kimliği doğrulanamadı.',403);
  if(!['mount_drop_get_r55','mount_drop_save_r55'].includes(input?.action))reject('Geçersiz binek ayarı işlemi.',422);
  const save=input.action==='mount_drop_save_r55',config=save?validateMountDropsR55(input.config):null;
  if(save&&(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<1))reject('Ayar sürümü gerekli.',422);
  const core=this.getCore?.();if(!core||core.database!==this.database)reject('Binek ayarları hazır değil.',503);
  return core.serial(async()=>{
   if(await reauthorize()!==adminId)reject('Yönetici oturumu değişti.',403);
   if(core.closed||core.stopping||core.recoveringWorld)reject('Çekirdek meşgul. Biraz sonra tekrar dene.',503);
   if(save)await this.database.atomic(sql=>{
    const row=mountDropConfigR55(sql),same=JSON.stringify(row.config)===JSON.stringify(config);
    // A lost response can be retried safely without a second revision.
    if(row.revision===input.expectedRevision+1&&same)return;
    if(row.revision!==input.expectedRevision)reject('Ayarlar başka oturumda değişti. Yenile ve tekrar düzenle.',409,'mount_drop_revision');
    prepareServerStatement(sql,'UPDATE mount_drop_settings_r55 SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),input.expectedRevision);
   });
   return {ok:true,...mountDropConfigR55(this.database.sqlite),areas:MOUNT_DROP_AREAS_R55,materials:MOUNT_RECIPE};
  });
 }
}

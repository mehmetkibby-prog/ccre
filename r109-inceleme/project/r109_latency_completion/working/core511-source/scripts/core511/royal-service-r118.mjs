import {createHash} from 'node:crypto';
import {prepareServerStatement} from './server-statements.mjs';
import {costSummaryR93,payCostRowsR93} from './zumrut-catalog-r93.mjs';
import {enhancementBonus491,enhancementLevel491} from '../../../native510-bb3a6cc689c6/lib/enhancement491.mjs';
import {ROYAL_COST_CATALOG_R118,ROYAL_COST_BY_ID_R118,validateRoyalConfigR118} from './royal-config-r118.mjs';
import {ROYAL_ACTIONS_R118,ROYAL_KINDS_R118,ROYAL_ROLES_R118,ROYAL_LOCATIONS_R118,ROYAL_POWER_BONUS_R118,royalNameR118,royalErrorR118} from './royal-model-r118.mjs';
const fail=(...args)=>{throw royalErrorR118(...args);};
const canonical=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const ownMaterial=id=>id==='material:emerald_dust'||id==='material:royal_crown';
export function royalItemStampR118(item){return digest(item);}
export function royalPowerR118(item,forgeBefore=null){
 // The historical Sonsuz operation scaled the entire power, including the
 // then-current fixed +level bonus. Preserve that legacy gain, but do not
 // scale it again by 8%. This makes royal/sonsuz order equivalent while
 // keeping both the stored upgrade level and its native fixed bonus.
 const forgeUpgrade=forgeBefore?.kind===item.kind?enhancementBonus491(item.kind,enhancementLevel491(forgeBefore)):0;
 const upgrade=enhancementBonus491(item.kind,enhancementLevel491(item))+forgeUpgrade*0.2,base=item.power-upgrade;
 if(!Number.isFinite(base)||base<0||base>10000000)fail('Eşyanın gücü doğrulanamadı.','royal_item_power_r118',409);
 return Math.round((base*(1+ROYAL_POWER_BONUS_R118/100)+upgrade)*100)/100;
}
export class RoyalServiceR118{
 constructor(sql,{now=Date.now,globals={}}={}){Object.assign(this,{sql,now,globals});this.cached=null;}
 q(text){return prepareServerStatement(this.sql,text);}
 atomic(){if(!this.sql.isTransaction)throw Error('royal_writer_transaction_required_r118');}
 refresh(){this.cached=null;}
 settings(){
  const row=this.q('SELECT config,revision FROM royal_settings_r118 WHERE id=1').get();
  if(!row||!Number.isSafeInteger(row.revision)||row.revision<1)fail('Kraliyet sistemi hazırlanıyor.','royal_not_initialized_r118',503);
  if(!this.cached||this.cached.revision!==row.revision)this.cached={revision:row.revision,config:validateRoyalConfigR118(JSON.parse(row.config))};
  return this.cached;
 }
 player(id){const p=this.q('SELECT * FROM players WHERE id=?').get(id);if(!p)fail('Karakter bulunamadı.','royal_player_missing_r118',404);return p;}
 balance(id,kind){return this.q('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(id,kind)?.amount??0;}
 material(id,kind,amount){
  this.atomic();const before=this.balance(id,kind);
  if(!Number.isSafeInteger(before)||!Number.isSafeInteger(amount)||before<0||before+amount<0||before+amount>1000000000)fail('Malzeme bakiyesi yeterli değil veya sınırına ulaştı.','royal_balance_r118',409);
  if(this.q('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(id,kind,before+amount).changes!==1)fail('Malzeme bakiyesi değişti.','royal_balance_r118',409);
  return before+amount;
 }
 costs(id,rows){
  const known=rows.filter(r=>!ownMaterial(r.itemId)),summaries=new Map(costSummaryR93(this.sql,id,known,{now:this.now()}).map(r=>[r.itemId,r]));
  return rows.map(row=>{
   if(!ownMaterial(row.itemId))return summaries.get(row.itemId);
   const item=ROYAL_COST_BY_ID_R118.get(row.itemId),available=this.balance(id,item.kind);
   if(!Number.isSafeInteger(available)||available<0||available>1000000000)fail('Malzeme bakiyesi doğrulanamadı.','royal_balance_r118',409);
   return {...row,name:item.name,available,missing:Math.max(0,row.amount-available)};
  });
 }
 assertLocation(p,which){
  const loc=ROYAL_LOCATIONS_R118[which];
  if(p.hp<=0||p.area!==loc.area||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-loc.x,p.y-loc.y)>loc.radius||p.arena_match_id||p.combat_lock_until_ms>this.now())fail(which==='salvage'?'Zümrüt Tozu için Demirci Haso’nun yanına gel.':'Kraliyet dönüşümü için Pazar Köyü’ndeki Kraliyet Tezgâhı’na gel.','royal_location_r118',409);
  if(this.q('SELECT 1 FROM player_trade_locks WHERE player_id=?').get(p.id))fail('Önce açık ticareti tamamla veya kapat.','royal_trade_locked_r118',409);
 }
 eligible(item){return !!item&&item.rarity==='emerald'&&ROYAL_KINDS_R118.includes(item.kind)&&ROYAL_ROLES_R118.includes(item.role)&&item.equipped===0&&item.sale_locked499===0&&item.expires_at_ms===0;}
 item(id,input){
  if(typeof input.itemId!=='string'||!input.itemId||input.itemId.length>160)fail('Dönüştürülecek eşyayı seç.');
  const item=this.q('SELECT * FROM player_items WHERE id=? AND player_id=?').get(input.itemId,id);
  if(!this.eligible(item))fail('Çantandaki kuşanılmamış, kilitsiz ve süresiz Kadim Zümrüt eşyayı seç.','royal_item_ineligible_r118',409);
  if(input.itemStamp!==royalItemStampR118(item))fail('Eşya değişti. Listeyi yenileyip yeniden seç.','royal_item_changed_r118',409);
  return item;
 }
 itemView(item,knownForge){
  const forge=knownForge===undefined?this.q('SELECT before_json FROM content_forge_r102 WHERE item_id=?').get(item.id):knownForge;
  let forgeBefore=null;if(forge){try{forgeBefore=JSON.parse(forge.before_json);}catch{fail('Sonsuz eşya kaydı doğrulanamadı.','royal_forge_history_r118',409);}}
  const infinite=!!forge;
  const prefix=/^(\+[0-5]\s+)/u.exec(item.item_name)?.[1]??'';
  return {id:item.id,kind:item.kind,role:item.role,name:item.item_name,power:item.power,royalPower:royalPowerR118(item,forgeBefore),royalName:prefix+(infinite?'Sonsuz ':'')+royalNameR118(item.kind,item.role),enhancedLevel:enhancementLevel491(item),infinite,itemStamp:royalItemStampR118(item)};
 }
 status(id){
  const p=this.player(id),{config,revision}=this.settings();
  const forged=new Map(this.q("SELECT f.item_id,f.before_json FROM player_items i JOIN content_forge_r102 f ON f.item_id=i.id WHERE i.player_id=? AND i.rarity='emerald' AND i.equipped=0 AND i.sale_locked499=0 AND i.expires_at_ms=0").all(id).map(r=>[r.item_id,r]));
  const items=this.q("SELECT * FROM player_items WHERE player_id=? AND rarity='emerald' AND equipped=0 AND sale_locked499=0 AND expires_at_ms=0 AND kind IN ('weapon','armor','helmet','shoes','necklace') ORDER BY created_at,id LIMIT 500").all(id).filter(i=>this.eligible(i)).map(i=>this.itemView(i,forged.get(i.id)??null));
  return {revision,champion:p.champion_level_r102>=1,enabled:config.enabled,bonusPercent:ROYAL_POWER_BONUS_R118,location:ROYAL_LOCATIONS_R118,materials:{emerald_dust:this.balance(id,'emerald_dust'),royal_crown:this.balance(id,'royal_crown')},items,recipes:Object.fromEntries(ROYAL_KINDS_R118.map(kind=>[kind,{costs:this.costs(id,config.recipes[kind].costs)}]))};
 }
 transform(id,input){
  this.atomic();const p=this.player(id);if(!(p.champion_level_r102>=1))fail('Kraliyet eşyaları için Şampiyon olmalısın.','royal_champion_required_r118',403);
  this.assertLocation(p,'transform');const {config,revision}=this.settings();
  if(!config.enabled)fail('Kraliyet dönüşümü şu anda kapalı.','royal_disabled_r118',409);
  if(input.revision!==revision)fail('Dönüşüm malzemeleri değişti. Listeyi yenile.','royal_config_changed_r118',409);
  const item=this.item(id,input),view=this.itemView(item),rows=config.recipes[item.kind].costs;
  if(this.q('SELECT 1 FROM royal_transforms_r118 WHERE item_id=?').get(item.id))fail('Bu eşya zaten Kraliyet’e dönüştürüldü.','royal_already_transformed_r118',409);
  if(this.costs(id,rows).some(r=>r.missing>0))fail('Dönüşüm için gerekli malzemeler eksik.','royal_cost_missing_r118',409);
  payCostRowsR93(this.sql,id,rows.filter(r=>!ownMaterial(r.itemId)),{now:this.now()});
  for(const row of rows.filter(r=>ownMaterial(r.itemId)))this.material(id,ROYAL_COST_BY_ID_R118.get(row.itemId).kind,-row.amount);
  const after={...item,item_name:view.royalName,rarity:'royal',power:view.royalPower};
  this.q('INSERT INTO royal_transforms_r118(item_id,player_id,before_json,after_json,created_at) VALUES(?,?,?,?,?)').run(item.id,id,JSON.stringify(item),JSON.stringify(after),this.now());
  if(this.q("UPDATE player_items SET item_name=?,rarity='royal',power=? WHERE id=? AND player_id=? AND rarity='emerald' AND equipped=0 AND sale_locked499=0 AND expires_at_ms=0").run(after.item_name,after.power,item.id,id).changes!==1)fail('Eşya değişti. Malzemeleri yeniden kontrol et.','royal_item_changed_r118',409);
  return {item:{id:item.id,name:after.item_name,kind:item.kind,role:item.role,rarity:'royal',power:after.power,previousPower:item.power},bonusPercent:ROYAL_POWER_BONUS_R118,costs:rows,revision,message:'Kraliyet dönüşümü tamamlandı.'};
 }
 salvage(id,input){
  this.atomic();const p=this.player(id);this.assertLocation(p,'salvage');
  if(input.confirm!==true)fail('Eşya kalıcı olarak tüketilir. Zümrüt Tozu dönüşümünü onayla.','royal_salvage_confirmation_r118',409);
  const item=this.item(id,input);
  // Consume the exact selected item and award dust in the enclosing writer
  // transaction. Any receipt/material failure rolls the entire operation back.
  this.q('INSERT INTO royal_salvage_r118(item_id,player_id,before_json,created_at) VALUES(?,?,?,?)').run(item.id,id,JSON.stringify(item),this.now());
  if(this.q("DELETE FROM player_items WHERE id=? AND player_id=? AND rarity='emerald' AND equipped=0 AND sale_locked499=0 AND expires_at_ms=0").run(item.id,id).changes!==1)fail('Eşya değişti.','royal_item_changed_r118',409);
  const amount=this.material(id,'emerald_dust',1);
  return {consumedItemId:item.id,material:{kind:'emerald_dust',name:'Zümrüt Tozu',amount:1,balance:amount},message:'1 Kadim Zümrüt eşya, 1 Zümrüt Tozu’na dönüştürüldü.'};
 }
 command(id,input){
  if(!ROYAL_ACTIONS_R118.includes(input?.action))fail('Kraliyet işlemi geçersiz.');
  if(input.action==='royal_read_r118')return this.status(id);
  this.atomic();
  if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))fail('İşlem kimliği geçersiz.','royal_request_id_r118');
  const hash=digest(input),old=this.q('SELECT action,digest,result FROM royal_receipts_r118 WHERE player_id=? AND request_id=?').get(id,input.requestId);
  if(old){if(old.action!==input.action||old.digest!==hash)fail('İşlem kimliği farklı içerikle kullanıldı.','royal_request_conflict_r118',409);return JSON.parse(old.result);}
  const result=input.action==='royal_transform_r118'?this.transform(id,input):this.salvage(id,input);
  this.q('INSERT INTO royal_receipts_r118(player_id,request_id,action,digest,result,created_at) VALUES(?,?,?,?,?,?)').run(id,input.requestId,input.action,hash,JSON.stringify(result),this.now());return result;
 }
 catalog(){return ROYAL_COST_CATALOG_R118.map(({id,name,kind,type})=>({id,name,kind,type,maxAmount:1000000}));}
 saveConfig(config,revision,adminId){
  this.atomic();if(typeof adminId!=='string'||!adminId||adminId.length>160)fail('Yönetici kimliği gerekli.','royal_admin_r118',403);
  config=validateRoyalConfigR118(config);
  if(!Number.isSafeInteger(revision)||revision<1||revision>=Number.MAX_SAFE_INTEGER)fail('Ayar sürümü geçersiz.');
  if(this.q('UPDATE royal_settings_r118 SET config=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes!==1)fail('Ayarlar değişmiş. Yenileyip tekrar kaydet.','royal_config_conflict_r118',409);
  this.q('INSERT INTO royal_admin_audit_r118(admin_id,action,detail,created_at) VALUES(?,?,?,?)').run(adminId,'config',JSON.stringify({revision:revision+1,config}),this.now());
  this.refresh();return this.settings();
 }
}

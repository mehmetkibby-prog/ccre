import {randomUUID} from 'node:crypto';
import {BELTS_R31,BELT_RECIPE_R31,BELT_ACTIONS_R31,BELT_PAKIZE_R31,beltDefinition,validBeltItem} from './belt-model.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {bagUnequipBlocked,BAG_FULL_MESSAGE} from './bag-limit.mjs';

export function beltRule(message,code='belt_invalid'){
 return Object.assign(Error(message),{beltRule:true,gameCode:code,status:409});
}
const fail=(message,code)=>{throw beltRule(message,code);};
const requestId=input=>typeof input?.requestId==='string'&&/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)?input.requestId:fail('İşlem kimliği geçersiz; pencereyi yenileyip tekrar dene.');
const itemId=input=>typeof input?.itemId==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(input.itemId)?input.itemId:fail('Kemer seçimi geçersiz.');
const variant=input=>typeof input?.variant==='string'&&Object.hasOwn(BELTS_R31,input.variant)?input.variant:fail('Üretilecek kemer geçersiz.');
export class BeltService {
 constructor(sql,{now=Date.now,uuid=randomUUID,refreshHp,locked=()=>false}={}){
  if(typeof refreshHp!=='function')throw Error('belt_hp_dependency');
  Object.assign(this,{sql,now,uuid,refreshHp,locked});
 }
 statement(text){return prepareServerStatement(this.sql,text);}
 actor(id){const row=this.statement('SELECT * FROM players WHERE id=?').get(id);if(!row)fail('Karakter bulunamadı.');return row;}
 safe(p,time){
  if(p.hp<=0)fail('Bu işlemi hayattayken yapabilirsin.','belt_dead');
  if(p.combat_lock_until_ms>time)fail('Kemerini değiştirmek için savaşın bitmesini bekle.','belt_combat');
  if(p.arena_match_id||['arena','war','dungeon','solo'].includes(p.area)||this.locked(p.id))fail('Kemer işlemi için mücadeleden çıkmalısın.','belt_locked');
 }
 command(id,input){
  if(!this.sql.isTransaction)throw Error('belt_requires_writer_transaction');
  if(!input||!BELT_ACTIONS_R31.includes(input.action))fail('Kemer işlemi desteklenmiyor.');
  const key=requestId(input),choice=input.action==='craft_belt_r31'?variant(input):itemId(input),operation=input.action+':'+choice;
  const old=this.statement('SELECT operation,result FROM expansion456_receipts WHERE player_id=? AND request_id=?').get(id,key);
  if(old){if(old.operation!==operation)fail('Bu işlem kimliği başka bir işlemde kullanıldı.','belt_request_conflict');return {...JSON.parse(old.result),replayed:true};}
  const time=this.now();
  if(!Number.isSafeInteger(input.requestAt)||Math.abs(time-input.requestAt)>600000)fail('İşlemin süresi doldu; yeniden dene.','belt_expired');
  const p=this.actor(id);this.safe(p,time);
  if(bagUnequipBlocked(this.sql,id,input))fail(BAG_FULL_MESSAGE,'bag_full');
  // An operation's material, item, HP and idempotence writes commit together.
  // User rejections roll this savepoint back before becoming a normal 409.
  this.sql.exec('SAVEPOINT belt_command_r31');
  try{
   let result;
   if(input.action==='craft_belt_r31'){
    if(p.area!==BELT_PAKIZE_R31.area||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-BELT_PAKIZE_R31.x,p.y-BELT_PAKIZE_R31.y)>BELT_PAKIZE_R31.reach)fail('Kemer üretmek için Zanaat Ustası Pakize’nin yanına gel.','belt_location');
    for(const {kind,name,amount} of BELT_RECIPE_R31){
     const changed=this.statement('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(amount,id,kind,amount);
     if(changed.changes!==1)fail(name+' yetersiz. Gerekli miktar: '+amount+'.','belt_materials');
    }
    const def=BELTS_R31[choice],newId=this.uuid();
    this.statement("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin,sale_locked499) VALUES(?,?,'belt',?,'crafted',0,'all','[]',0,?,0,0,0)").run(newId,id,def.name,Math.floor(time/1000));
    result={ok:true,itemId:newId,variant:choice,message:def.name+' üretildi ve çantana eklendi.'};
   }else{
    const item=this.statement('SELECT * FROM player_items WHERE id=? AND player_id=?').get(choice,id);
    if(!item||!validBeltItem(item))fail('Kemer bulunamadı veya bu eşya kullanılamıyor.','belt_item');
    if(this.statement('SELECT 1 FROM market_listings WHERE item_id=? LIMIT 1').get(choice))fail('Pazardaki kemeri önce satıştan kaldır.','belt_listing');
    const desired=input.action==='equip_belt_r31'?1:0;
    if(desired&&item.equipped===0){
     this.statement("UPDATE player_items SET equipped=0 WHERE player_id=? AND kind='belt' AND equipped=1").run(id);
     if(this.statement("UPDATE player_items SET equipped=1 WHERE id=? AND player_id=? AND kind='belt' AND equipped=0").run(choice,id).changes!==1)fail('Kemer değişti; çantanı yenile.','belt_changed');
    }else if(!desired&&item.equipped===1){
     if(this.statement("UPDATE player_items SET equipped=0 WHERE id=? AND player_id=? AND kind='belt' AND equipped=1").run(choice,id).changes!==1)fail('Kemer değişti; çantanı yenile.','belt_changed');
    }
    // This is the full shared canonical calculation, including rank, set,
    // pet, premium, guild, runes and status; never a max_hp += delta shortcut.
    const refreshed=this.refreshHp(id);if(refreshed?.then)throw Error('belt_async_hp_dependency');
    const current=this.actor(id);
    result={ok:true,itemId:choice,variant:beltDefinition(item).variant,equipped:desired,hp:current.hp,maxHp:current.max_hp,hpRevision:current.hp_revision,message:desired?'Kemer kuşanıldı.':'Kemer çıkarıldı.'};
   }
   this.statement('INSERT INTO expansion456_receipts(player_id,request_id,operation,result,created_at_ms) VALUES(?,?,?,?,?)').run(id,key,operation,JSON.stringify(result),time);
   this.sql.exec('RELEASE belt_command_r31');return result;
  }catch(error){this.sql.exec('ROLLBACK TO belt_command_r31;RELEASE belt_command_r31');throw error;}
 }
}

import {createHash,randomUUID} from 'node:crypto';
import {recordMountReward} from './mounts-rewards.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {gameplayR60} from './r60-options.mjs';
import {mountInventoryTableR60,mountMaterialR60} from './mount-materials-r60.mjs';
import {mountEnabled,mountDefinition,mountItem,mountAllowed,MOUNT_ACTIONS,MOUNT_ITEMS,MOUNT_QUEST,MOUNT_RECIPE,MOUNT_NPC,MOUNT_TAME} from './mounts-model.mjs';
export const mountRule=(message,code='mount_invalid',status=409)=>Object.assign(Error(message),{mountRule:true,gameCode:code,status});
const fail=(message,code,status)=>{throw mountRule(message,code,status);};
const attackState=p=>JSON.stringify(['last_attack_at_ms','attack_one_at','attack_two_at','attack_three_at','attack_four_at'].map(k=>Number(p[k])||0));
const validRequest=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(value);
const stmt=(sql,text)=>prepareServerStatement(sql,text);
const profile=(sql,id)=>stmt(sql,'SELECT * FROM mount_profiles_r49 WHERE player_id=?').get(id);
export function readMountBundle(sql,id,{enabled=mountEnabled(),now=Date.now()}={}){
 if(!enabled)return {enabled:false};
 if(typeof id==='object')id=id?.id;
 const p=profile(sql,id),query=gameplayR60.mountMaterials?"SELECT kind,amount FROM mount_inventory_r49 WHERE player_id=?1 UNION ALL SELECT kind,amount FROM dungeon_materials WHERE player_id=?1 AND kind IN('saddle_leather','saddle_buckle','saddle_rein')":'SELECT kind,amount FROM mount_inventory_r49 WHERE player_id=?';
 const rows=stmt(sql,query).all(id),amount=new Map(rows.map(r=>[r.kind,r.amount]));
 const owned=stmt(sql,'SELECT kind FROM mount_unlocks_r49 WHERE player_id=? ORDER BY kind').all(id).map(r=>r.kind);
 const hunts=MOUNT_QUEST.hunts.map(h=>({...h,current:amount.get(h.kind)??0})),bosses=MOUNT_QUEST.bosses.map(b=>({...b,earned:(amount.get(b.kind)??0)>0}));
 const materials=MOUNT_RECIPE.map(r=>({...r,amount:amount.get(r.kind)??0}));
 const questReady=hunts.every(h=>h.current>=h.required)&&bosses.filter(b=>b.earned).length>=MOUNT_QUEST.bossRequired;
 const saddle=amount.get('mount_saddle')??0;
 return {enabled:true,quest:{active:Boolean(p?.active),variant:p?.variant??'',minLevel:MOUNT_QUEST.minLevel,stage:!p?.active?(owned.length?'complete':'not_started'):saddle?'tame':questReady?'craft':'hunt',hunts,bosses,bossRequired:MOUNT_QUEST.bossRequired},materials,inventory:MOUNT_ITEMS.map(i=>({...i,amount:amount.get(i.kind)??0})),owned,selected:p?.selected??'',mounted:false,saddle,challenge:p?.challenge_id&&p.challenge_expires_ms>=now?{id:p.challenge_id,step:p.challenge_step,targetAt:p.challenge_target_ms,expiresAt:p.challenge_expires_ms,windowMs:MOUNT_TAME.windowMs}:null,serverTime:now};
}
export const publicMounts=bundle=>bundle;
export class MountService{
 constructor(sql,{now=Date.now,uuid=randomUUID,locked=()=>false,enabled=mountEnabled()}={}){Object.assign(this,{sql,now,uuid,locked,enabled:enabled&&Boolean(sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='mount_profiles_r49'").get())});}
 statement(text){return stmt(this.sql,text);}
 reward(key,outcome){return recordMountReward(this,key,outcome);}
 read(id){return readMountBundle(this.sql,id,{enabled:this.enabled,now:this.now()});}
 actor(id){const p=this.statement('SELECT * FROM players WHERE id=?').get(id);if(!p)fail('Karakter bulunamadı.','mount_player_missing',404);return p;}
 requireEnabled(){if(!this.enabled)fail('Binek sistemi kapalı.','mount_disabled',404);}
 requireTransaction(){if(!this.sql.isTransaction)throw Error('mount_requires_writer_transaction');}
 safe(p,time){if(!mountAllowed(p,time,{locked:this.locked(p.id)}))fail('Binek işlemi için savaştan çıkıp güvenli bir haritaya dönmelisin.','mount_combat_or_area');}
 near(p){if(p.area!==MOUNT_NPC.area||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.hypot(p.x-MOUNT_NPC.x,p.y-MOUNT_NPC.y)>MOUNT_NPC.reach)fail('Bu işlem için pazardaki Seyis’in yanına gel.','mount_location');}
 ensure(id){this.statement('INSERT OR IGNORE INTO mount_profiles_r49(player_id) VALUES(?)').run(id);return profile(this.sql,id);}
 amount(id,kind){return this.statement('SELECT amount FROM '+mountInventoryTableR60(kind)+' WHERE player_id=? AND kind=?').get(id,kind)?.amount??0;}
 add(id,kind,amount,{cap=true}={}){
  const def=mountItem(kind);if(!def||!Number.isSafeInteger(amount)||amount<1)fail('Binek malzemesi geçersiz.','mount_material');
  // Native market purchases may exceed the drop ceiling. Never clamp away a
  // balance the player already owns when the next drop tries to add to it.
  const old=this.amount(id,kind);if(cap&&mountMaterialR60(kind)&&old>=def.cap)return old;
  const next=cap?Math.min(def.cap,old+amount):old+amount;
  if(next>def.cap)fail('Bu malzeme için görev çantası sınırı '+def.cap+'.','mount_material_cap');
  if(next!==old)this.statement('INSERT INTO '+mountInventoryTableR60(kind)+'(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(id,kind,next);
  return next;
 }
 consume(id,kind,amount){if(this.statement('UPDATE '+mountInventoryTableR60(kind)+' SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(amount,id,kind,amount).changes!==1)fail((mountItem(kind)?.label??kind)+' yetersiz.','mount_materials');}
 clearChallenge(id){this.statement("UPDATE mount_profiles_r49 SET challenge_id='',challenge_step=0,challenge_target_ms=0,challenge_expires_ms=0 WHERE player_id=?").run(id);}
 receipt(scope,key,operation){const old=this.statement('SELECT operation,result FROM mount_receipts_r49 WHERE scope=? AND request_id=?').get(scope,key);if(!old)return null;if(old.operation!==operation)fail('İşlem kimliği başka bir işlemde kullanılmış.','mount_request_conflict');return {...JSON.parse(old.result),replayed:true};}
 save(scope,key,operation,result,time){const {mounts:ignored,...compact}=result;this.statement('INSERT INTO mount_receipts_r49(scope,request_id,operation,result,created_at_ms) VALUES(?,?,?,?,?)').run(scope,key,operation,JSON.stringify(compact),time);return result;}
 command(id,input){
  this.requireEnabled();this.requireTransaction();
  if(!input||!MOUNT_ACTIONS.includes(input.action)||!validRequest(input.requestId))fail('Binek işlemi geçersiz.');
  const action=input.action,kind=input.kind??'',step=input.step??null,challengeId=input.challengeId??'';
  if(['start','select'].includes(action)&&!mountDefinition(kind))fail('Binek seçimi geçersiz.','mount_kind');
  if(action==='tame_step'&&(!Number.isInteger(step)||step<0||step>=MOUNT_TAME.steps||typeof challengeId!=='string'||challengeId.length>80))fail('Evcilleştirme adımı geçersiz.','mount_challenge');
  const operation=JSON.stringify([action,kind,step,challengeId]),scope='player:'+id,old=this.receipt(scope,input.requestId,operation);if(old)return {...old,mounts:this.read(id)};
  const time=this.now();if(!Number.isSafeInteger(input.requestAt)||Math.abs(time-input.requestAt)>600000)fail('İşlemin süresi doldu; tekrar dene.','mount_expired');
  const p=this.actor(id);this.safe(p,time);if(p.level<MOUNT_QUEST.minLevel)fail('Binek görevi 30. seviyede açılır.','mount_level');
  if(action!=='select')this.near(p);
  this.sql.exec('SAVEPOINT mount_command_r49');
  try{
   let state=this.ensure(id),result={ok:true};
   if(action==='start'){
    if(this.statement('SELECT 1 FROM mount_unlocks_r49 WHERE player_id=? AND kind=?').get(id,kind))fail('Bu bineğin zaten var.','mount_owned');
    if(state.active&&state.variant!==kind)fail('Başladığın binek görevini önce tamamlamalısın.','mount_quest_active');
    if(!state.active){this.statement('UPDATE mount_profiles_r49 SET active=1,variant=?,started_at_ms=?,cycle=cycle+1,crafted=0 WHERE player_id=?').run(kind,time,id);this.clearChallenge(id);this.statement('DELETE FROM mount_reward_claims_r49 WHERE player_id=?').run(id);}
    result.message='Seyis’in görevi başladı. Üç bölgede avlan, iki farklı bossa katkı ver ve eyer malzemelerini topla.';
   }else if(action==='craft'){
    if(!state.active)fail('Önce Seyis’ten bir binek görevi al.','mount_quest_required');
    if(this.amount(id,'mount_saddle')>0)fail('Eyerin hazır; evcilleştirmeye başlayabilirsin.','mount_saddle_owned');
    for(const h of MOUNT_QUEST.hunts)this.consume(id,h.kind,h.required);
    const bosses=MOUNT_QUEST.bosses.filter(b=>this.amount(id,b.kind)>0);if(bosses.length<MOUNT_QUEST.bossRequired)fail('İki farklı dünya bossuna katkı vermelisin.','mount_boss_required');
    for(const b of bosses.slice(0,MOUNT_QUEST.bossRequired))this.consume(id,b.kind,1);
    for(const item of MOUNT_RECIPE)this.consume(id,item.kind,item.required);
    this.add(id,'mount_saddle',1);this.statement('UPDATE mount_profiles_r49 SET crafted=1 WHERE player_id=?').run(id);result.message='Evcilleştirme Eyeri başarıyla üretildi.';
   }else if(action==='tame_start'){
    if(!state.active||this.amount(id,'mount_saddle')<1)fail('Önce görevini alıp Evcilleştirme Eyeri hazırlamalısın.','mount_saddle_required');
    const cid=this.uuid();this.statement('UPDATE mount_profiles_r49 SET challenge_id=?,challenge_step=0,challenge_target_ms=?,challenge_expires_ms=?,challenge_hp_revision=?,challenge_attack_state=? WHERE player_id=?').run(cid,time+MOUNT_TAME.delayMs,time+MOUNT_TAME.lifetimeMs,p.hp_revision??0,attackState(p),id);
    result.message='İşaret yeşil alana geldiğinde sakinleştir. Üç başarılı adım gerekiyor.';
   }else if(action==='tame_step'){
    if(!state.active||!state.challenge_id||state.challenge_id!==challengeId||state.challenge_step!==step)fail('Evcilleştirme denemesi değişmiş; güncel pencereyi kullan.','mount_challenge_stale');
    if(time>state.challenge_expires_ms||Math.abs(time-state.challenge_target_ms)>MOUNT_TAME.windowMs||(p.hp_revision??0)!==state.challenge_hp_revision||attackState(p)!==state.challenge_attack_state){this.clearChallenge(id);result={ok:true,failed:true,message:'Binek ürktü. Eyerin duruyor; malzeme harcamadan yeniden deneyebilirsin.'};}
    else if(step+1<MOUNT_TAME.steps){this.statement('UPDATE mount_profiles_r49 SET challenge_step=?,challenge_target_ms=? WHERE player_id=?').run(step+1,time+MOUNT_TAME.delayMs,id);result.message='Sakinleşiyor. Sonraki işareti bekle.';}
    else{
     if(!mountDefinition(state.variant))fail('Görevdeki binek geçersiz.','mount_kind');
     if(this.statement('SELECT 1 FROM mount_unlocks_r49 WHERE player_id=? AND kind=?').get(id,state.variant))fail('Bu binek zaten açılmış.','mount_owned');
     this.consume(id,'mount_saddle',1);this.statement('INSERT INTO mount_unlocks_r49(player_id,kind,unlocked_at_ms) VALUES(?,?,?)').run(id,state.variant,time);
     this.statement('UPDATE mount_profiles_r49 SET active=0,selected=?,crafted=0 WHERE player_id=?').run(state.variant,id);this.clearChallenge(id);result={ok:true,completed:true,message:mountDefinition(state.variant).label+' artık senin. Bütün binekler %25 yolculuk hızı verir.'};
    }
   }else if(action==='select'){
    if(!this.statement('SELECT 1 FROM mount_unlocks_r49 WHERE player_id=? AND kind=?').get(id,kind))fail('Bu bineği henüz evcilleştirmedin.','mount_not_owned');
    this.statement('UPDATE mount_profiles_r49 SET selected=? WHERE player_id=?').run(kind,id);result.message='Binek seçildi.';
   }
   result.mounts=this.read(id);this.save(scope,input.requestId,operation,result,time);this.sql.exec('RELEASE mount_command_r49');return result;
  }catch(error){this.sql.exec('ROLLBACK TO mount_command_r49;RELEASE mount_command_r49');throw error;}
 }
 grant(id,input,adminId){
  this.requireEnabled();this.requireTransaction();const {kind,amount,requestId}=input??{};
  if(typeof adminId!=='string'||!adminId||adminId.length>160||!validRequest(requestId)||!mountItem(kind)||!Number.isSafeInteger(amount)||amount<1||amount>50)fail('Binek gönderimi geçersiz.','mount_grant_invalid',422);
  const scope='admin:'+createHash('sha256').update(adminId).digest('hex'),operation=JSON.stringify([id,kind,amount]),old=this.receipt(scope,requestId,operation);if(old)return {...old,mounts:this.read(id)};
  this.actor(id);const time=this.now();this.sql.exec('SAVEPOINT mount_grant_r49');
  try{const balance=this.add(id,kind,amount,{cap:false}),result={ok:true,playerId:id,kind,amount,balance,requestId,replayed:false,mounts:this.read(id)};this.save(scope,requestId,operation,result,time);this.sql.exec('RELEASE mount_grant_r49');return result;}
  catch(error){this.sql.exec('ROLLBACK TO mount_grant_r49;RELEASE mount_grant_r49');throw error;}
 }
}

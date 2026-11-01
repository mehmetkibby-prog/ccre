import {randomUUID} from 'node:crypto';
import {JEWELRY456,JEWELRY_RECIPE456,PAKIZE456,HALLOWEEN456,SPECIALIZATION_RESET463,specialization456,skillFourCost456} from '../../lib/expansion456.mjs';

function reject(message,code='invalid_expansion456'){const e=Error(message);e.gameCode=code;e.status=409;throw e;}
function requestKey(input){if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))reject('İşlem kimliği geçersiz.');return input.requestId;}
export function createExpansion456Inventory(db,{now=Date.now,isHalloweenActive=()=>false}={}){
 const player=db.prepare('SELECT id,account_id,role,level,hp,area,x,y,gems,arena_match_id,combat_lock_until_ms,specialization,skill_four,halloween_candy_until FROM players WHERE id=?');
 const receipt=db.prepare('SELECT operation,result FROM expansion456_receipts WHERE player_id=? AND request_id=?');
 const remember=db.prepare('INSERT INTO expansion456_receipts(player_id,request_id,operation,result,created_at_ms) VALUES(?,?,?,?,?)');
 const debitMaterial=db.prepare('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?');
 const addMaterial=db.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount');
 const item=db.prepare('INSERT INTO player_items(id,player_id,kind,rarity,item_name,power,equipped,created_at,role,enchantments) VALUES(?,?,?,?,?,?,0,?,?,\'[]\')');
 const take=(id,kind,n)=>{if(debitMaterial.run(n,id,kind,n).changes!==1)reject('Gerekli malzemeler eksik.','craft_materials');};
 const near=(p,npc,time)=>{if(p.hp<=0||p.area!=='bazaar'||p.arena_match_id||p.combat_lock_until_ms>time||Math.hypot(p.x-npc.x,p.y-npc.y)>npc.reach)reject(`${npc.name} yanına gelmelisin.`,'craft_location');};
 return {act(playerId,input){
  if(!db.isTransaction)reject('Kalıcı işlem yetkisi eksik.','native_writer_transaction_required');
  const key=requestKey(input),operation=String(input.action??'')+':'+String(input.kind??input.specialization??input.slot??''),old=receipt.get(playerId,key);
  if(old){if(old.operation!==operation)reject('Bu işlem kimliği başka bir işlemde kullanıldı.');return {...JSON.parse(old.result),replayed:true};}
  const time=now();if(!Number.isSafeInteger(input.requestAt)||Math.abs(time-input.requestAt)>600000)reject('İşlem süresi doldu; yeniden dene.','expired_request');
  const p=player.get(playerId);if(!p)reject('Karakter bulunamadı.');let result;
  if(input.action==='craft_jewelry456'){
   const definition=typeof input.kind==='string'&&Object.hasOwn(JEWELRY456,input.kind)?JEWELRY456[input.kind]:null;if(!definition)reject('Üretilecek eşya geçersiz.');near(p,PAKIZE456,time);
   if(db.prepare('UPDATE players SET gems=gems-? WHERE id=? AND gems>=?').run(JEWELRY_RECIPE456.gems,playerId,JEWELRY_RECIPE456.gems).changes!==1)reject('50.000 Mücevher gerekli.','craft_gems');
   for(const[kind,amount]of Object.entries(JEWELRY_RECIPE456.materials))take(playerId,kind,amount);
   const id=randomUUID();item.run(id,playerId,definition.kind,'crafted',definition.name,20,Math.floor(time/1000),p.role);
   result={ok:true,itemId:id,kind:definition.kind,message:`${definition.name} üretildi ve çantana eklendi.`};
  }else if(input.action==='buy_specialization_reset463'){
   if(p.hp<=0||p.arena_match_id||['arena','war','black','dungeon','solo'].includes(p.area)||p.combat_lock_until_ms>time||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(playerId))reject('Parşömeni çatışma ve zindan dışında satın almalısın.');
   if(input.expectedPrice!==undefined&&input.expectedPrice!==SPECIALIZATION_RESET463.gems)reject('Parşömen fiyatı değişti; marketi yenile.');
   if(db.prepare('UPDATE players SET gems=gems-? WHERE id=? AND gems>=? AND hp>0').run(SPECIALIZATION_RESET463.gems,playerId,SPECIALIZATION_RESET463.gems).changes!==1)reject('5.000 Mücevher gerekli.');
   addMaterial.run(playerId,SPECIALIZATION_RESET463.kind,1);
   result={ok:true,kind:SPECIALIZATION_RESET463.kind,amount:1,message:SPECIALIZATION_RESET463.name+' çantana eklendi.'};
  }else if(input.action==='use_specialization_reset463'){
   if(!p.specialization)reject('Henüz seçilmiş bir uzmanlığın yok; parşömen harcanmadı.');
   if(p.hp<=0||p.arena_match_id||['arena','war','black','dungeon','solo'].includes(p.area)||p.combat_lock_until_ms>time||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(playerId))reject('Uzmanlığını çatışma ve zindan dışında sıfırlamalısın.');
   take(playerId,SPECIALIZATION_RESET463.kind,1);
   if(db.prepare("UPDATE players SET specialization='',special_guard_until_ms=0 WHERE id=? AND specialization=?").run(playerId,p.specialization).changes!==1)reject('Uzmanlık değişti; yeniden kontrol et.');
   result={ok:true,specialization:'',skill_four:p.skill_four,message:'Uzmanlığın sıfırlandı. Beceri geliştirmelerin ve bekleme süren korundu; yeni yolunu seçebilirsin.'};
  }else if(input.action==='choose_specialization456'){
   if(db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=?').get(playerId))reject('Uzmanlık seçmek için önce zindandan ayrılmalısın.');
   const branch=specialization456(p.role,input.specialization);if(!branch||p.level<30||p.hp<=0)reject('Uzmanlık seçmek için 30. seviye olmalısın.');
   if(p.arena_match_id||p.area==='dungeon'||p.area==='solo'||p.combat_lock_until_ms>time)reject('Uzmanlığını çatışma dışında seçmelisin.');
   if(p.specialization&&p.specialization!==branch.id)reject('Uzmanlığın zaten seçilmiş.','specialization_chosen');
   if(!p.specialization&&db.prepare("UPDATE players SET specialization=? WHERE id=? AND specialization='' AND level>=30 AND role=?").run(branch.id,playerId,p.role).changes!==1)reject('Uzmanlık seçimi değişti; yeniden kontrol et.');
   result={ok:true,specialization:branch.id,message:`${branch.name} uzmanlığını seçtin. ${branch.skill} açıldı.`};
  }else if(input.action==='upgrade_specialization456'){
   if(!specialization456(p.role,p.specialization)||p.level<30||p.skill_four>=10)reject('Bu beceri yükseltilemiyor.');
   const settings=db.prepare('SELECT skill_upgrade_gem_cost FROM game_settings WHERE id=1').get(),cost=skillFourCost456(settings.skill_upgrade_gem_cost,p.skill_four);
   if(db.prepare('UPDATE players SET gems=gems-?,skill_four=skill_four+1 WHERE id=? AND skill_four=? AND gems>=? AND level>=30 AND specialization=?').run(cost,playerId,p.skill_four,cost,p.specialization).changes!==1)reject('Mücevherin yetersiz veya beceri seviyesi değişti.');
   result={ok:true,skill_level:p.skill_four+1,upgradeCost:cost,message:'Uzmanlık becerin yükseltildi.'};
  }else if(input.action==='exchange_wands456'){
   if(!isHalloweenActive(Math.floor(time/1000)))reject('Cadılar Bayramı etkinliği şu anda açık değil.');near(p,HALLOWEEN456.witch,time);take(playerId,HALLOWEEN456.wand.kind,HALLOWEEN456.exchangeWands);addMaterial.run(playerId,HALLOWEEN456.candy.kind,1);
   result={ok:true,kind:HALLOWEEN456.candy.kind,amount:1,message:'50 değnek karşılığında 1 Cadı Şekeri aldın.'};
  }else if(input.action==='use_halloween_candy456'){
   if(p.hp<=0)reject('Şekeri hayattayken kullanabilirsin.');if(p.halloween_candy_until>time)reject('Cadı Şekeri etkisi zaten aktif.');take(playerId,HALLOWEEN456.candy.kind,1);
   const until=time+HALLOWEEN456.candySeconds*1000;db.prepare('UPDATE players SET halloween_candy_until=? WHERE id=?').run(until,playerId);
   result={ok:true,halloween_candy_until:until,message:'3 saat boyunca %25 ek tecrübe kazanacaksın.'};
  }else reject('İşlem desteklenmiyor.');
  remember.run(playerId,key,operation,JSON.stringify(result),time);return result;
 },prune(time,limit=128){return db.prepare('DELETE FROM expansion456_receipts WHERE rowid IN(SELECT rowid FROM expansion456_receipts WHERE created_at_ms<? ORDER BY created_at_ms LIMIT ?)').run(time-86400000,Math.max(1,Math.min(128,limit))).changes;}};
}

function resetSpecialization463(db,payload,adminId,{now=Date.now}={}){
 const playerId=typeof payload.playerId==='string'&&/^[a-zA-Z0-9-]{8,64}$/.test(payload.playerId)?payload.playerId:'';
 const requestId=typeof payload.requestId==='string'&&/^[a-zA-Z0-9_-]{16,80}$/.test(payload.requestId)?payload.requestId:'';
 const fail=(message,status)=>{throw Object.assign(Error(message),{status,gameCode:'invalid_specialization_reset463'});};
 if(!playerId||!requestId)fail('Geçerli oyuncu ve işlem kimliği gerekli.',400);
 if(db.isTransaction)fail('Uzmanlık sıfırlama işlemi başka bir işlem içinde başlatılamaz.',409);
 const auditId='specialization-reset463:'+requestId;
 db.exec('BEGIN IMMEDIATE');
 try{
  const old=db.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').get(auditId);
  let detail,replayed=false;
  if(old){
   detail=JSON.parse(old.detail_json);
   if(old.admin_account_id!==adminId||old.action!=='reset_specialization463'||detail.playerId!==playerId)fail('İşlem kimliği başka bir sıfırlamaya ait.',409);
   replayed=true;
  }else{
   const p=db.prepare('SELECT id,account_id,name,specialization,skill_four,attack_four_at FROM players WHERE id=?').get(playerId);
   if(!p)fail('Sıfırlanacak oyuncu bulunamadı.',404);
   detail={playerId:p.id,name:p.name,before:p.specialization,skillFour:p.skill_four,attackFourAt:p.attack_four_at};
   db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,'reset_specialization463',?,?,?)").run(auditId,adminId,p.account_id,JSON.stringify(detail),now());
   if(db.prepare("UPDATE players SET specialization='',special_guard_until_ms=0 WHERE id=?").run(playerId).changes!==1)fail('Oyuncu değişti; yeniden kontrol et.',409);
  }
  db.exec('COMMIT');
  return {ok:true,playerId,specialization:'',skill_four:detail.skillFour,attack_four_at:detail.attackFourAt,replayed,message:'Oyuncunun uzmanlığı sıfırlandı; seviyesi, eşyaları, geliştirmeleri ve bekleme süreleri korundu.'};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
export {resetSpecialization463};

import {requireAutoIpGrantR102} from './auto-ip-r102.mjs';
import {couponActor483} from '../../../native510-bb3a6cc689c6/vds-server/src/cp-coupons483.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {prepareServerStatement} from './server-statements.mjs';
import {ZUMRUT_CATALOG_R93,ZUMRUT_BY_ID_R93,costSummaryR93,payCostRowsR93,grantCatalogR93,assertZumrutRewardPoolR93} from './zumrut-catalog-r93.mjs';
import {CONTENT_DEFAULTS_R102,EMERALD_COST_R102,validateContentConfigR102} from './content-config-r102.mjs';
import {CONTENT_KINDS_R102 as K,CONTENT_ACTIONS_R102,AUTO_DAILY_MS_R102,AUTO_TICKET_MS_R102,AUTO_TICKET_CP_R102,AUTO_TICKET_DAILY_LIMIT_R102,AUTO_LEASE_MS_R102,contentErrorR102,championProgressR102,championThresholdR102,settleAutoR102,dayR102,battlefieldWindowR102,intR102} from './content-model-r102.mjs';
const fail=(...a)=>{throw contentErrorR102(...a);};
const canonical=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
export function championBonusR102(player){return Math.max(0,Number(player?.champion_level_r102)||0)/5;}
export class ContentServiceR102{
 constructor(sql,{now=Date.now,random=Math.random,uuid=randomUUID,globals={}}={}){Object.assign(this,{sql,now,random,uuid,globals});this.cached=null;}
 q(text){return prepareServerStatement(this.sql,text);}
 refresh(){this.cached=null;}
 settings(){if(!this.cached){const r=this.q('SELECT config,revision FROM content_settings_r102 WHERE id=1').get();this.cached={config:validateContentConfigR102(JSON.parse(r.config)),revision:r.revision};}return this.cached;}
 atomic(){if(!this.sql.isTransaction)throw Error('content_writer_transaction_required_r102');}
 player(id){const p=this.q('SELECT * FROM players WHERE id=?').get(id);if(!p)fail('Karakter bulunamadı.','content_player_missing_r102',404);return p;}
 balance(id,kind){return this.q('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(id,kind)?.amount??0;}
 material(id,kind,amount){
  this.atomic();const before=this.balance(id,kind);if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(before)||before+amount<0||before+amount>1000000000)fail('Eşya bakiyesi yeterli değil veya sınırına ulaştı.','content_balance_r102',409);
  this.q('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=excluded.amount').run(id,kind,before+amount);return before+amount;
 }
 timer(p,now=this.now()){const saved=this.q('SELECT * FROM content_auto_r102 WHERE account_id=?').get(p.account_id);return settleAutoR102(saved,now);}
 purchaseStatus(p,now=this.now()){
  // Existing durable receipts include purchases made before this update. Use
  // the time index, stop at three, and share the cap across an account's heroes.
  const start=dayR102(now)*86400000-10800000;
  const bought=this.q("SELECT COUNT(*) n FROM (SELECT 1 FROM content_receipts_r102 r INDEXED BY content_receipts_time_r102 JOIN players p ON p.id=r.player_id WHERE r.created_at>=? AND r.created_at<? AND r.action='auto_buy_r102' AND p.account_id=? LIMIT 3)").get(start,start+86400000,p.account_id).n;
  return {purchaseLimit:AUTO_TICKET_DAILY_LIMIT_R102,purchasedToday:bought,purchasesRemaining:Math.max(0,AUTO_TICKET_DAILY_LIMIT_R102-bought)};
 }
 autoStatus(p,now=this.now()){const r=this.timer(p,now);return {active:r.active&&r.active_player===p.id,remainingMs:r.remainingMs,dailyRemainingMs:Math.max(0,AUTO_DAILY_MS_R102-r.used_ms),paidMs:r.paid_ms,resetAtMs:r.resetAtMs,leaseUntilMs:r.lease_until_ms,serverTime:now,tickets:this.balance(p.id,K.ticket),...this.purchaseStatus(p,now)};}
 saveTimer(p,r){this.q('INSERT INTO content_auto_r102(account_id,day,used_ms,paid_ms,active_player,tick_at_ms,lease_until_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET day=excluded.day,used_ms=excluded.used_ms,paid_ms=excluded.paid_ms,active_player=excluded.active_player,tick_at_ms=excluded.tick_at_ms,lease_until_ms=excluded.lease_until_ms').run(p.account_id,r.day,r.used_ms,r.paid_ms,r.active_player,r.tick_at_ms,r.lease_until_ms);}
 auto(id,action,autoIp){
  this.atomic();const p=this.player(id),now=this.now(),r=this.timer(p,now);
  if(['auto_start_r102','auto_tick_r102'].includes(action))requireAutoIpGrantR102(autoIp,{playerId:id,accountId:p.account_id,now});
  if(action==='auto_buy_r102'){
   try{couponActor483(this.sql,p);}catch{fail('Bu hesap ÇP alışverişi yapamaz.','auto_purchase_account_r102',403);}
   if(this.purchaseStatus(p,now).purchasesRemaining===0)fail('Günlük 3 bilet satın alma sınırına ulaştın. Türkiye saatiyle 00.00’da yenilenir.','auto_purchase_daily_limit_r102',409);
   if(!Number.isSafeInteger(p.core_coins)||p.core_coins<AUTO_TICKET_CP_R102)fail('150 ÇP gerekli.','auto_purchase_balance_r102',409);
   this.material(id,K.ticket,1);if(this.q('UPDATE players SET core_coins=core_coins-? WHERE id=? AND core_coins>=?').run(AUTO_TICKET_CP_R102,id,AUTO_TICKET_CP_R102).changes!==1)fail('ÇP bakiyesi değişti.','auto_purchase_balance_r102',409);
   return {coreCoins:p.core_coins-AUTO_TICKET_CP_R102,tickets:this.balance(id,K.ticket)};
  }else if(action==='auto_ticket_r102'){
   if(r.paid_ms>31536000000-AUTO_TICKET_MS_R102)fail('Ek süre sınırına ulaştın.');
   this.material(id,K.ticket,-1);r.paid_ms+=AUTO_TICKET_MS_R102;r.remainingMs+=AUTO_TICKET_MS_R102;
  }else if(action==='auto_stop_r102'){if(r.active_player===id){r.active_player='';r.lease_until_ms=0;}}
  else{
   if(p.hp<=0)fail('Önce yeniden doğmalısın.','auto_dead_r102',409);
   if(action==='auto_start_r102'&&p.area==='afk'&&this.sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='afk_hunt_state'").get()){
    const island=this.q('SELECT active,tick_at_ms FROM afk_hunt_state WHERE player_id=?').get(id);
    if(island?.active&&now>=island.tick_at_ms&&now-island.tick_at_ms<15000)fail('Önce Oto Av Adası avını durdur; iki süre aynı anda harcanmaz.','auto_island_active_r102',409);
   }
   if(r.active_player&&r.active_player!==id)fail('Bu hesabın diğer karakterinde oto atak açık.','auto_other_character_r102',409);
   if(action==='auto_tick_r102'&&r.active_player!==id)return {auto:this.autoStatus(p,now)};
   if(r.remainingMs<=0)fail('Günlük oto atak süren doldu.','auto_exhausted_r102',409);
   r.active_player=id;r.tick_at_ms=now;r.lease_until_ms=now+Math.min(AUTO_LEASE_MS_R102,r.remainingMs);
  }
  this.saveTimer(p,r);this.q('UPDATE players SET auto_attack_until_r102=? WHERE id=?').run(r.active_player===id?r.lease_until_ms:0,id);return {auto:this.autoStatus(p,now)};
 }
 champion(p){const cfg=this.settings().config.champion,level=p.champion_level_r102??0,progress=level?championProgressR102(p.champion_xp_r102??0,cfg):null;
  const effective=progress?{...progress,level,bonus:level/5,levelXp:Math.max(0,(p.champion_xp_r102??0)-championThresholdR102(level,cfg)),requiredXp:championThresholdR102(level+1,cfg)-championThresholdR102(level,cfg),remainingXp:Math.max(0,championThresholdR102(level+1,cfg)-(p.champion_xp_r102??0))}:null;
  const last=this.q('SELECT MAX(milestone) n FROM content_champion_rewards_r102 WHERE player_id=?').get(p.id)?.n??0;
  return {xpBase:cfg.baseXp,xpStep:cfg.stepXp,eligible:p.level>=65&&p.rank_tier>=18,active:level>0,...effective,title:level?'Şampiyon Lv '+level:'',bonuses:{hp:level/5,attack:level/5,defense:level/5},costs:costSummaryR93(this.sql,p.id,cfg.costs,{now:this.now()}),nextReward:(last+10)<=level?last+10:null,rewards:cfg.rewards};
 }
 status(id){const p=this.player(id),{config,revision}=this.settings();return {revision,serverTime:this.now(),auto:this.autoStatus(p),champion:this.champion(p),newyear:{enabled:config.newyear.enabled,socks:this.balance(id,K.sock),chests:this.balance(id,K.newyear),required:50,rewards:config.newyear.rewards},battlefield:{active:battlefieldWindowR102(config.battlefield,this.now()),slots:config.battlefield.slots,killsPerChest:config.battlefield.killsPerChest,chests:this.balance(id,K.victory),progress:this.q('SELECT day,kills,chests FROM content_battlefield_r102 WHERE player_id=?').get(id)??null,rewards:config.battlefield.rewards},forge:{costs:costSummaryR93(this.sql,id,EMERALD_COST_R102,{now:this.now()}),items:this.q("SELECT i.id,i.item_name,i.kind,i.role,i.power FROM player_items i WHERE i.player_id=? AND i.rarity='emerald' AND i.equipped=0 AND i.sale_locked499=0 AND i.expires_at_ms=0 AND i.kind IN ('weapon','armor','helmet','shoes','necklace') AND NOT EXISTS(SELECT 1 FROM content_forge_r102 f WHERE f.item_id=i.id) ORDER BY i.created_at,i.id LIMIT 80").all(id)}};}
 enterChampion(id,input){
  const p=this.player(id);if(p.champion_level_r102>0)fail('Zaten Şampiyonsun.','champion_already_r102',409);
  if(p.level<65||p.rank_tier<18)fail('Önce Çekirdek Efsanesi 3 olmalısın.','champion_ineligible_r102',409);
  const cfg=this.settings().config.champion;payCostRowsR93(this.sql,id,cfg.costs,{now:this.now(),selectedItems:input.selectedItems??{}});
  this.q('UPDATE players SET champion_level_r102=1,champion_xp_r102=0,champion_entered_r102=?,hp_revision=hp_revision+1 WHERE id=? AND champion_level_r102=0').run(this.now(),id);
  return {champion:this.champion(this.player(id))};
 }
 grant(id,row){return grantCatalogR93(this.sql,id,row.itemId,row.amount,{now:this.now(),random:this.random,uuid:this.uuid,globals:this.globals});}
 championReward(id){
  const p=this.player(id),s=this.champion(p),milestone=s.nextReward;if(!milestone)fail('Henüz alınacak Şampiyon ödülün yok.','champion_reward_missing_r102',409);
  assertZumrutRewardPoolR93(this.sql,id,s.rewards,{now:this.now()});
  const result=s.rewards.map(r=>this.grant(id,r));this.q('INSERT INTO content_champion_rewards_r102(player_id,milestone,result) VALUES(?,?,?)').run(id,milestone,JSON.stringify(result));return {milestone,rewards:result,champion:this.champion(this.player(id))};
 }
 convertSocks(id){this.material(id,K.sock,-50);this.material(id,K.newyear,1);return {socks:this.balance(id,K.sock),chests:this.balance(id,K.newyear)};}
 openChest(id,input){
  const which=input.chest;if(!['newyear','victory'].includes(which))fail('Sandık türü geçersiz.');
  if(this.balance(id,K[which])<1)fail('Bu sandık çantanda yok.','content_chest_missing_r102',409);
  const rows=this.settings().config[which==='victory'?'battlefield':'newyear'].rewards;
  assertZumrutRewardPoolR93(this.sql,id,rows,{now:this.now()});
  const total=rows.reduce((n,r)=>n+r.weight,0);let draw=this.random()*total,selected=rows.at(-1);for(const r of rows){draw-=r.weight;if(draw<0){selected=r;break;}}
  this.material(id,K[which],-1);return {chest:which,reward:this.grant(id,selected),remaining:this.balance(id,K[which])};
 }
 forge(id,input){
  if(typeof input.itemId!=='string'||input.itemId.length>160)fail('Dönüştürülecek eşyayı seç.');
  const p=this.player(id);if(p.area!=='bazaar')fail('Dönüşüm için Demirci Haso’ya git.','forge_location_r102',409);
  const item=this.q('SELECT * FROM player_items WHERE id=? AND player_id=?').get(input.itemId,id);
  if(!item||item.rarity!=='emerald'||!['weapon','armor','helmet','shoes','necklace'].includes(item.kind)||item.equipped||item.sale_locked499||item.expires_at_ms!==0||this.q('SELECT 1 FROM content_forge_r102 WHERE item_id=?').get(item.id))fail('Kuşanılmamış, kilitsiz ve henüz dönüştürülmemiş Kadim Zümrüt eşya seç.','forge_item_r102',409);
  payCostRowsR93(this.sql,id,EMERALD_COST_R102,{now:this.now()});
  const power=Math.round(item.power*120)/100;if(!Number.isFinite(power)||power<0||power>10000000)fail('Eşyanın gücü doğrulanamadı.');
  // Keep rarity, set identity, stones and enchantments: their independent
  // upgrade rules still apply. The native power stat gains exactly 20%.
  this.q('INSERT INTO content_forge_r102(item_id,player_id,before_json,created_at) VALUES(?,?,?,?)').run(item.id,id,JSON.stringify(item),this.now());
  const name=item.item_name.replace(/^(\+[0-5]\s+)?/u,(_m,prefix='')=>prefix+'Sonsuz ');this.q('UPDATE player_items SET power=?,item_name=? WHERE id=? AND player_id=? AND equipped=0 AND sale_locked499=0').run(power,name,item.id,id);
  return {item:{id:item.id,name,power,previousPower:item.power,rarity:'emerald'},bonusPercent:20};
 }
 command(id,input,autoIp){
  this.atomic();if(!CONTENT_ACTIONS_R102.includes(input?.action))fail('İşlem geçersiz.');
  if(input.action==='content_status_r102')return this.status(id);
  if(input.action==='auto_tick_r102')return this.auto(id,input.action,autoIp);
  if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))fail('İşlem kimliği geçersiz.','content_request_id_r102');
  const hash=digest(input),old=this.q('SELECT action,digest,result FROM content_receipts_r102 WHERE player_id=? AND request_id=?').get(id,input.requestId);
  if(old){if(old.action!==input.action||old.digest!==hash)fail('İşlem kimliği farklı içerikle kullanıldı.','content_request_conflict_r102',409);return JSON.parse(old.result);}
  let result;if(input.action.startsWith('auto_'))result=this.auto(id,input.action,autoIp);
  else if(input.action==='newyear_convert_r102')result=this.convertSocks(id);
  else if(input.action==='content_chest_r102')result=this.openChest(id,input);
  else if(input.action==='champion_enter_r102')result=this.enterChampion(id,input);
  else if(input.action==='champion_reward_r102')result=this.championReward(id);
  else if(input.action==='emerald_infinite_r102')result=this.forge(id,input);
  this.q('INSERT INTO content_receipts_r102(player_id,request_id,action,digest,result,created_at) VALUES(?,?,?,?,?,?)').run(id,input.requestId,input.action,hash,JSON.stringify(result),this.now());return result;
 }
 dropSock(id){this.atomic();const {newyear}=this.settings().config;if(newyear.enabled&&newyear.dropPercent>0&&this.random()*100<newyear.dropPercent){this.material(id,K.sock,1);return true;}return false;}
 battlefieldKill(killer,victim){
  this.atomic();const now=this.now(),cfg=this.settings().config.battlefield;if(!battlefieldWindowR102(cfg,now)||killer.area!=='war'||victim.area!=='war'||killer.id===victim.id||!killer.account_id||killer.account_id===victim.account_id||killer.is_gm||victim.is_gm)return null;
  const old=this.q('SELECT last_at FROM content_battlefield_victims_r102 WHERE killer_account=? AND victim_account=?').get(killer.account_id,victim.account_id);
  if(old&&now-old.last_at<cfg.victimCooldownSeconds*1000)return null;
  const day=dayR102(now),saved=this.q('SELECT * FROM content_battlefield_r102 WHERE player_id=?').get(killer.id),state=saved?.day===day?saved:{kills:0,chests:0};if(state.chests>=cfg.maxChestsPerDay)return null;
  const kills=state.kills+1,award=kills>=cfg.killsPerChest;
  if(award)this.material(killer.id,K.victory,1);
  this.q('INSERT INTO content_battlefield_victims_r102(killer_account,victim_account,last_at) VALUES(?,?,?) ON CONFLICT(killer_account,victim_account) DO UPDATE SET last_at=excluded.last_at').run(killer.account_id,victim.account_id,now);
  this.q('INSERT INTO content_battlefield_r102(player_id,day,kills,chests) VALUES(?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET day=excluded.day,kills=excluded.kills,chests=excluded.chests').run(killer.id,day,award?0:kills,state.chests+(award?1:0));return {awarded:award,kills:award?0:kills};
 }
 saveConfig(config,revision,adminId){
  this.atomic();config=validateContentConfigR102(config);intR102(revision,1,Number.MAX_SAFE_INTEGER,'Ayar sürümü');
  if(this.q('UPDATE content_settings_r102 SET config=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes!==1)fail('Ayarlar değişmiş. Yenileyip tekrar kaydet.','content_config_conflict_r102',409);
  this.q('INSERT INTO content_admin_audit_r102(admin_id,action,detail,created_at) VALUES(?,?,?,?)').run(adminId,'config',JSON.stringify({revision:revision+1,config}),this.now());this.refresh();return this.settings();
 }
 adminChampion(id,level,adminId){
  this.atomic();intR102(level,1,1000000,'Şampiyon seviyesi');const p=this.player(id);if(p.level<65||p.rank_tier<18)fail('Oyuncu Çekirdek Efsanesi 3 olmalı.');if(level<=(p.champion_level_r102??0))fail('Yeni seviye mevcut seviyeden yüksek olmalı.');
  const xp=championThresholdR102(level,this.settings().config.champion);if(!Number.isSafeInteger(xp)||xp>9000000000000)fail('Bu seviye için tecrübe sınırı aşılıyor.');
  this.q('UPDATE players SET champion_level_r102=?,champion_xp_r102=MAX(champion_xp_r102,?),champion_entered_r102=CASE WHEN champion_entered_r102=0 THEN ? ELSE champion_entered_r102 END,hp_revision=hp_revision+1 WHERE id=?').run(level,xp,this.now(),id);
  this.q('INSERT INTO content_admin_audit_r102(admin_id,action,detail,created_at) VALUES(?,?,?,?)').run(adminId,'champion',JSON.stringify({playerId:id,before:p.champion_level_r102,level}),this.now());return this.champion(this.player(id));
 }
 catalog(){return ZUMRUT_CATALOG_R93.map(({id,name,type,kind,role,rarity,maxAmount,costAllowed,rewardAllowed,group})=>({id,name,type,kind,role,rarity,maxAmount,costAllowed,rewardAllowed,group}));}
}

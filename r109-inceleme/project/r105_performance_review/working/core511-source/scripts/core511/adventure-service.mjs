import {prepareCached477} from './writer-statements.mjs';
import {MistLootService,readMistLoot,readMistLootRevision} from './mist-loot.mjs';
import {deferAutomaticBagItems,pendingBagStatus} from './bag-pending.mjs';
import {bagPendingBounded} from './bag-pending-policy.mjs';
import {mapArea,isAdventureArea,adventureArea,ADVENTURE_ACTIONS,ADVENTURE_ENTRY,adventureEntry,adventureSpawn} from './adventure-maps.mjs';
import {towerConfigFromDatabase,TOWER_KINDS,TOWER_CATALOG_BY_ID,TOWER_CHEST,TOWER_MATERIALS} from './tower-config.mjs';
import {readMistConfig,mistScale,MIST_KINDS,MIST_CATALOG,MIST_MAPS} from './mist-config.mjs';
import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {emeraldPower444} from '../../../native510-bb3a6cc689c6/lib/emerald-set.mjs';
export {ADVENTURE_ACTIONS} from './adventure-maps.mjs';
const error=message=>{throw Object.assign(Error(message),{adventureRule:true});};
const parse=row=>row?{...row,config:JSON.parse(row.config),state:JSON.parse(row.state)}:null;
const requestId=input=>{if(typeof input.requestId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId))error('İşlem kimliği geçersiz.');return input.requestId;};
const int=n=>Math.max(0,Math.min(9000000000000,Math.floor(n)));
export function towerNeedsCatchup(run,player){
 const area=adventureArea(player?.area);
 return run?.kind==='tower'&&player?.channel===run.channel&&area?.kind==='tower'&&area.run===run.id.replaceAll('-','')&&area.floor<run.state.floor;
}
export class AdventureService {
 constructor(sql,{now=Date.now,lootClock=Date.now,random=Math.random,uuid,globals={}}={}){Object.assign(this,{sql,now,random,uuid,globals});this.profileCache=new Map();this.loot=new MistLootService(sql,{now:lootClock,uuid});}
 config(){return readMistConfig(this.sql.prepare('SELECT value FROM adventure_settings WHERE id=1').get()?.value);}
 player(id){return this.sql.prepare('SELECT * FROM players WHERE id=?').get(id);}
 run(id){return parse(prepareCached477(this.sql,'SELECT * FROM adventure_runs WHERE id=?').get(id));}
 membership(id){return this.sql.prepare('SELECT * FROM adventure_members WHERE player_id=? AND departed=0').get(id);}
 current(id){const m=this.membership(id);return m?this.run(m.run_id):null;}
 save(run){run.revision++;this.sql.prepare('UPDATE adventure_runs SET area=?,status=?,deadline_ms=?,revision=?,state=? WHERE id=?').run(run.area,run.status,run.deadline_ms,run.revision,JSON.stringify(run.state),run.id);}
 insertRun(kind,channel,cycle,config,state,id=this.uuid()){
  const run={id,kind,channel,cycle,area:mapArea(kind,id),status:'active',created_ms:this.now(),deadline_ms:0,revision:1,config,state};
  this.sql.prepare('INSERT INTO adventure_runs(id,kind,channel,cycle,area,status,created_ms,deadline_ms,revision,config,state) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,kind,channel,cycle,run.area,run.status,run.created_ms,0,1,JSON.stringify(config),JSON.stringify(state));return run;
 }
 cacheProfile(id,profile){if(!this.profileCache.has(id)&&this.profileCache.size>=2048)this.profileCache.delete(this.profileCache.keys().next().value);this.profileCache.set(id,Object.freeze(profile));return this.profileCache.get(id);}
 profile(monster){const id=typeof monster==='string'?monster:monster?.id;if(!id)return null;if(this.profileCache.has(id))return this.profileCache.get(id);const row=this.sql.prepare('SELECT profile FROM adventure_monsters WHERE id=?').get(id);const profile=row?Object.freeze(JSON.parse(row.profile)):null;if(profile)this.cacheProfile(id,profile);return profile;}
 move(player,area,point,{revive=false}={}){
  this.sql.prepare(`UPDATE players SET area=?,arena_match_id='',x=?,y=?,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,root_until_ms=0,stun_until_ms=0,combat_lock_until_ms=0,respawn_at_ms=0${revive?',hp=max_hp,hp_revision=hp_revision+1':''} WHERE id=? AND channel=?`).run(area,point.x,point.y,this.now(),player.id,player.channel);
  this.sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(player.id);
 }
 join(player,run){
  if(this.membership(player.id))error('Önce bulunduğun seferden çık.');
  const entered=this.sql.prepare('SELECT 1 FROM adventure_entries WHERE run_id=? AND player_id=?').get(run.id,player.id);
  // Mist stays single-entry PvP. Only a recorded tower death permits return;
  // voluntary retreat must not become a village-healing shortcut.
  const deathReturns=Array.isArray(run.state.deathReturnsR72)?run.state.deathReturnsR72:[];
  if(entered&&(run.kind!=='tower'||!deathReturns.includes(player.id)))error(run.kind==='tower'?'Bu kule seferine yalnızca yenildikten sonra geri dönebilirsin.':'Aynı yarığa ikinci kez girilemez.');
  const entrySlot=run.kind==='mist'?this.sql.prepare('SELECT COUNT(*) n FROM adventure_entries WHERE run_id=?').get(run.id).n:0;
  if(!entered)this.sql.prepare('INSERT INTO adventure_entries(run_id,player_id) VALUES(?,?)').run(run.id,player.id);
  this.sql.prepare('INSERT INTO adventure_members(player_id,run_id,origin_area,origin_x,origin_y,joined_ms,contribution,departed) VALUES(?,?,?,?,?,?,0,0) ON CONFLICT(player_id) DO UPDATE SET run_id=excluded.run_id,origin_area=excluded.origin_area,origin_x=excluded.origin_x,origin_y=excluded.origin_y,joined_ms=excluded.joined_ms,contribution=CASE WHEN adventure_members.run_id=excluded.run_id THEN adventure_members.contribution ELSE 0 END,departed=0').run(player.id,run.id,player.area,player.x,player.y,this.now());
  if(entered){run.state.deathReturnsR72=deathReturns.filter(id=>id!==player.id);this.save(run);}
  this.move(player,run.area,adventureEntry(run.area,entrySlot));
 }
 alive(run){return this.sql.prepare('SELECT m.* FROM monsters m JOIN adventure_monsters a ON a.id=m.id WHERE a.run_id=? AND m.area=? AND m.hp>0').all(run.id,run.area);}
 nextTowerFloor(run,players){
  if(run.kind!=='tower'||run.status!=='active'||!run.state.clear||run.state.floor>=10||run.deadline_ms<=this.now()||this.alive(run).length)return false;
  const previous=run.area;run.state.floor++;run.state.wave=1;delete run.state.autoNextAt;
  run.area=mapArea('tower',run.id,run.state.floor);
  // Only the actors held by the writer's ownership barrier may move here.
  // Disconnected party members catch up on their next owned admission.
  for(const p of players)if(p.hp>0&&p.area===previous&&p.channel===run.channel)this.move(p,run.area,ADVENTURE_ENTRY);
  this.spawnWave(run);return true;
 }
 spawn(run,kind,spec,index,count=1){
  const scale=run.kind==='mist'?run.state.scale:1,id=(['claw','rare'].includes(kind)?'golge':kind==='spirit'||kind==='acolyte'?'yutan':'curuk')+'-adv-'+this.uuid().replaceAll('-',''),point=adventureSpawn(index,count,run.area,kind);
  const profile={xpRevision:31,kind,runId:run.id,feature:run.kind,hp:int(spec.hp*scale),damage:int(spec.damage*scale),speed:['stone','seal'].includes(kind)?0:spec.speed,cadence:spec.attackMs,range:spec.range??230,stationary:['stone','seal'].includes(kind),boss:['warden','mourner','azrail','keeper','rare','gold'].includes(kind),xp:int((spec.xp??0)*(run.kind==='mist'?run.config.xpMultiplier:1)),gems:spec.gems??0,essence:int((spec.essence??0)*(run.kind==='mist'?run.config.essenceMultiplier:1)),drops:spec.drops??[],patterns:kind==='azrail'?run.config.patterns:null};
  // Boss/stone are presentation kinds here; they deliberately use the normal
  // scoped-monster ledger, never the global world-boss round or Sinsi spawner.
  this.sql.prepare("INSERT INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,despawn_at,spawn_round,area,channel,is_stone,wave_stage,summoned,parent_stone_id) VALUES(?,?,?,?,?,?,0,'normal',0,0,1,?,?,0,0,0,'')").run(id,(run.kind==='tower'?TOWER_KINDS:MIST_KINDS)[kind],point.x,point.y,profile.hp,profile.hp,run.area,run.channel);
  this.sql.prepare('INSERT INTO adventure_monsters VALUES(?,?,?,?)').run(id,run.id,run.area,JSON.stringify(profile));this.cacheProfile(id,profile);return id;
 }
 spawnWave(run){
  let index=0;if(run.kind==='tower'){
   const floor=run.config.floors[run.state.floor-1];for(const s of floor.spawns){if(s.kind==='stone'&&run.state.wave!==1||['warden','mourner','azrail'].includes(s.kind)&&run.state.wave!==floor.waves)continue;for(let i=0;i<s.count;i++)this.spawn(run,s.kind,s,index++);}
  }else{
   const kinds=run.state.objective==='hunt'?['rare']:run.state.objective==='seals'?['claw','guard','seal']:['claw','guard','spirit'];
   for(const kind of kinds){const s=run.config.enemies[kind],count=kind==='seal'?3:s.count;for(let i=0;i<count;i++)this.spawn(run,kind,s,i,count);}
  }
  run.state.nextWaveAt=0;run.state.clear=false;run.state.hazard=null;run.state.nextHazardAt=run.kind==='tower'&&run.state.floor===10?this.now()+3000:0;this.save(run);
 }
 leave(id,reason='leave'){
  const p=this.player(id),m=this.membership(id);if(!p||!m)return {ok:true};const run=this.run(m.run_id);const dead=reason==='death'||p.hp<=0,returnArea=run?.kind==='tower'||dead?'bazaar':m.origin_area,point=returnArea==='bazaar'?{x:1910,y:660}:{x:m.origin_x,y:m.origin_y};
  this.loot.cancel(id);this.move(p,returnArea,point,{revive:dead});this.sql.prepare('UPDATE adventure_members SET departed=1 WHERE player_id=? AND run_id=?').run(id,m.run_id);
  if(run&&!this.sql.prepare('SELECT 1 FROM adventure_members WHERE run_id=? AND departed=0 LIMIT 1').get(run.id)){run.status='closed';run.state.nextWaveAt=0;run.state.hazard=null;delete run.state.deathReturnsR72;this.sql.prepare('UPDATE adventure_portals SET closes_ms=MIN(closes_ms,?) WHERE run_id=?').run(this.now(),run.id);this.sql.prepare('UPDATE monsters SET hp=0,respawn_at=0 WHERE id IN (SELECT id FROM adventure_monsters WHERE run_id=?)').run(run.id);this.save(run);this.loot.closeRun(run.id);}
  else if(run?.kind==='tower'&&run.status==='active'&&dead){run.state.deathReturnsR72=[...new Set([...(Array.isArray(run.state.deathReturnsR72)?run.state.deathReturnsR72:[]),id])];this.save(run);}
  this.loot.refundPlayer(id);return {ok:true,message:dead?(run?.kind==='tower'?'Kadim Kulesi’nden Pazar Köyü’ne döndün.':'Sis Yarığı’ndan Pazar Köyü’ne döndün.'):bagPendingBounded?'Seferden çıktın; kazandığın ganimetler çantanda veya bekleme listende.':'Seferden çıktın; kazandığın ganimetler çantanda.'};
 }
 settleAdmission(id){
  this.loot.cancel(id);this.loot.refundPlayer(id);
  const p=this.player(id),m=this.membership(id),run=m?this.run(m.run_id):null;
  if(!m)return;
  const cycle=this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
  if(!run||run.status!=='active'||run.cycle!==cycle||run.deadline_ms&&run.deadline_ms<=this.now()||p.hp<=0)this.leave(id,p.hp<=0?'death':'timeout');
  else if(towerNeedsCatchup(run,p))this.move(p,run.area,ADVENTURE_ENTRY);
 }
 command(id,input,lootIdentity=null){
  if(!this.sql.isTransaction)throw Error('adventure_requires_writer_transaction');if(!input||typeof input!=='object'||Array.isArray(input)||typeof input.action!=='string'||!ADVENTURE_ACTIONS.includes(input.action))error('Bilinmeyen sefer işlemi.');const key=requestId(input),old=this.sql.prepare('SELECT result FROM adventure_receipts WHERE player_id=? AND request_id=? AND action=?').get(id,key,input.action);if(old)return JSON.parse(old.result);
  const p=this.player(id);if(!p)error('Karakter bulunamadı.');let result;
  if(input.action==='adventure_loot_begin')result=this.loot.begin(id,input,lootIdentity);
  else if(input.action==='adventure_loot_finish')result=this.loot.finish(id,input,lootIdentity);
  else if(input.action==='adventure_loot_cancel')result=this.loot.cancel(id,input);
  else if(input.action==='adventure_leave')result=this.leave(id);
  else if(input.action==='adventure_tower_enter'){
   const config=towerConfigFromDatabase(this.sql);if(!config.enabled)error('Kadim Kulesi şu anda kapalı.');
   if(p.hp<=0||p.level<config.minLevel||p.area!=='bazaar'||p.arena_match_id||p.combat_lock_until_ms>this.now()||this.globals.__colDungeon?.locked(id))error(`Pazar Köyü’nde ol; seviye ${config.minLevel} olmalı ve savaş dışında olmalısın.`);
   if(this.membership(id))error('Zaten bir seferdesin.');
   const cycle=this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,partyId=this.sql.prepare('SELECT party_id FROM party_members WHERE player_id=?').get(id)?.party_id;
   // Commands are serialized in the owned writer transaction. A simultaneous
   // second entry sees the first committed run, without moving another actor.
   let run=partyId?this.sql.prepare("SELECT * FROM adventure_runs WHERE kind='tower' AND status='active' AND cycle=? AND deadline_ms>? AND json_extract(state,'$.partyId')=? ORDER BY created_ms DESC LIMIT 1").get(cycle,this.now(),partyId):null;
   run=parse(run);
   if(run){
    if(run.channel!==p.channel)error(`Grubunun kulesi Kanal ${run.channel} üzerinde. Önce o kanala geç.`);
    if(p.level<run.config.minLevel)error(`Bu kule için seviye ${run.config.minLevel} olmalısın.`);
    if(!this.sql.prepare('SELECT 1 FROM adventure_entries WHERE run_id=? AND player_id=?').get(run.id,p.id)&&this.sql.prepare('SELECT COUNT(*) n FROM adventure_entries WHERE run_id=?').get(run.id).n>=5)error('Bu kule seferine en fazla 5 oyuncu katılabilir.');
    this.join(p,run);result={ok:true,runId:run.id,message:`Grubunun kulesine katıldın · ${run.state.floor}. Kat`};
   }else{
    run=this.insertRun('tower',p.channel,cycle,config,{floor:1,wave:1,clear:false,nextWaveAt:0,...(partyId?{partyId}:{})});run.deadline_ms=this.now()+config.durationSeconds*1000;this.join(p,run);this.spawnWave(run);result={ok:true,runId:run.id,message:'Kadim Kulesi · 1. Kat'};
   }
  }else if(input.action==='adventure_next'){
   const run=this.current(id);if(!run||run.status!=='active'||run.deadline_ms<=this.now()||run.kind!=='tower'||!run.state.clear||run.state.floor>=10||this.alive(run).length)error('Önce bu kattaki bütün dalgaları tamamla.');
   if(p.hp<=0||p.area!==run.area)error('Kat geçişi için önce seferine dön.');this.nextTowerFloor(run,[p]);result={ok:true,message:`${run.state.floor}. kata geçtin.`};
  }else if(input.action==='adventure_mist_enter'){
   const portal=this.sql.prepare('SELECT * FROM adventure_portals WHERE id=?').get(String(input.portalId??'')),now=this.now();
   if(!portal||portal.channel!==p.channel||portal.area!==p.area||portal.opens_ms>now||portal.closes_ms<=now||portal.entered>=portal.capacity||Math.hypot(p.x-portal.x,p.y-portal.y)>150)error('Portal kapandı, doldu veya yeterince yakın değilsin.');
   const run=this.run(portal.run_id);if(!run||run.status!=='active'||run.deadline_ms&&run.deadline_ms<=now||run.cycle!==this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle||p.hp<=0||p.level<run.config.minLevel||p.arena_match_id||p.loadlab_run_id||this.globals.__colDungeon?.locked(id))error('Bu yarığa giremiyorsun.');
   this.join(p,run);this.sql.prepare('UPDATE adventure_portals SET entered=entered+1 WHERE id=? AND entered<capacity').run(portal.id);
   if(!run.deadline_ms){const stats=this.globals.__colDungeon.statsFor(p);run.state.scale=mistScale(run.config,{...p,max_hp:stats.maxHp,attack:stats.attack});run.deadline_ms=now+run.config.durationSeconds*1000;this.spawnWave(run);}result={ok:true,message:'Sis Yarığı’na girdin. PvP açık; ölürsen Pazar Köyü’ne dönersin.'};
  }else if(input.action==='adventure_chest'){
   const run=this.current(id);if(!run||run.kind!=='mist'||run.status!=='active'||p.area!==run.area||p.channel!==run.channel||!run.state.clear||run.deadline_ms<=this.now()||p.hp<=0||this.alive(run).length)error('Görev tamamlanmadan sandık açılmaz.');
   // Reward delivery is deferred; a recorded kill counts before its loot is
   // claimed. Never make chest eligibility depend on a browser claim request.
   const member=this.membership(id),participated=member?.contribution>0||this.sql.prepare(`SELECT 1 FROM monster_participants mp
    JOIN adventure_monsters am ON am.id=mp.monster_id AND am.run_id=?
    JOIN normal_defeats d ON d.monster_id=mp.monster_id AND d.spawn_round=mp.spawn_round
    WHERE mp.player_id=? LIMIT 1`).get(run.id,id);
   // In the PvP rift the sole surviving member can finish a cleared run.
   // Offline, living members still count: disconnecting is not a shortcut.
   const otherLiving=this.sql.prepare(`SELECT 1 FROM adventure_members am JOIN players p ON p.id=am.player_id
    WHERE am.run_id=? AND am.departed=0 AND p.id<>? AND p.area=? AND p.channel=? AND p.hp>0 LIMIT 1`).get(run.id,id,run.area,run.channel);
   if(!participated&&otherLiving)error('Sandık için mücadeleye katılmalısın.');
   const mark=this.sql.prepare('INSERT OR IGNORE INTO adventure_awards VALUES(?,?,?)').run('finish:'+run.id,id,this.now());let chestRewards=null;if(mark.changes){const rows=run.state.gold?run.config.goldChest:run.config.chest;const granted=this.grantRows(id,rows,run.kind,{deferGear:bagPendingBounded});chestRewards={runId:run.id,gold:run.state.gold===true,items:granted};this.sql.prepare('INSERT INTO adventure_chests VALUES(?,?,?,?,?)').run(this.uuid(),id,run.state.gold?1:0,JSON.stringify(granted),this.now());}result={ok:true,chestClaimed:true,runId:run.id,...(chestRewards?{chestRewards}:{}),message:mark.changes?'Sis Sandığı ödülleri çantana eklendi.':'Bu seferin Sis Sandığı zaten açıldı.'};if(bagPendingBounded){result.bagPending=pendingBagStatus(this.sql,id);if(mark.changes&&result.bagPending.overflow&&result.bagPending.full)result.message='Sis Sandığı açıldı. Bekleme listesi dolu; kazanılmış ödüllerin kaybolmaması için çantana eklendi. Yer aç.';else if(mark.changes&&result.bagPending.count)result.message='Sis Sandığı açıldı. Çantana sığmayan ekipmanlar bekleme listende; diğer ödüllerin eklendi.';}
  }else if(input.action==='adventure_tower_chest'&& !this.membership(id))result=this.globals.__colDungeon.towerOpenChest(id,{...input,action:'tower_open_chest'},lootIdentity?.publish);
  else if(input.action==='adventure_refine'&& !this.membership(id))result=this.globals.__colDungeon.towerRefine(id,{...input,action:'tower_refine'});
  else error('Bilinmeyen sefer işlemi.');
  this.sql.prepare('INSERT INTO adventure_receipts VALUES(?,?,?,?)').run(id,key,input.action,JSON.stringify(result));return result;
 }
 grantRows(id,rows,kind,{deferGear=false}={}){
  const catalog=kind==='tower'?TOWER_CATALOG_BY_ID:new Map(MIST_CATALOG.map(i=>[i.id,i]));const rewards=[];
  for(const rule of rows){if(this.random()*100>=rule.chance)continue;const item=catalog.get(rule.itemId);if(!item||kind==='mist'&&item.id.startsWith('tower:'))throw Error('adventure_invalid_reward');const amount=rule.min+Math.floor(this.random()*(rule.max-rule.min+1));
   if(item.type.startsWith('tower'))this.material(id,item.kind,amount);
   else{let gear={};if(item.type==='gear'){const cfg=this.globals.__colDungeon.settings(),settings={...prepareCached477(this.sql,'SELECT * FROM game_settings WHERE id=1').get(),...prepareCached477(this.sql,'SELECT * FROM combat_settings WHERE id=1').get(),...prepareCached477(this.sql,'SELECT * FROM economy_settings WHERE id=1').get()};gear=this.globals.__colDungeon.makeGear(item,settings,cfg);if(item.rarity==='emerald')gear={...gear,item_name:item.name,power:emeraldPower444(item.kind,{...settings,...cfg})};}const grant=()=>this.globals.__colDragonBoss.grantCatalog(id,item,amount,gear);if(deferGear&&item.type==='gear')deferAutomaticBagItems(this.sql,id,grant);else grant();}
   rewards.push({id:item.id,amount});
  }return rewards;
 }
 material(id,kind,amount){prepareCached477(this.sql,'INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount').run(id,kind,amount);}
 award(pending){
  const profile=this.profile(pending.monster_id);if(!profile)throw Error('adventure_reward_profile_missing');const run=this.run(profile.runId);if(!run)throw Error('adventure_reward_run_missing');
  const participants=prepareCached477(this.sql,'SELECT p.id FROM monster_participants mp JOIN players p ON p.id=mp.player_id JOIN adventure_entries a ON a.player_id=p.id WHERE mp.monster_id=? AND mp.spawn_round=? AND a.run_id=?').all(pending.monster_id,pending.spawn_round,run.id);
  for(const p of participants){const inserted=prepareCached477(this.sql,'INSERT OR IGNORE INTO normal_reward_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,?,?,?,?)').run(pending.monster_id,pending.spawn_round,p.id,'adventure:'+pending.monster_id,Math.floor(this.now()/1000));if(!inserted.changes)continue;
   prepareCached477(this.sql,'UPDATE players SET essence=MIN(9000000000000,essence+?),gems=MIN(9000000000000,gems+?) WHERE id=?').run(profile.essence,profile.gems,p.id);this.grantRows(p.id,profile.drops,run.kind,{deferGear:true});prepareCached477(this.sql,'UPDATE adventure_members SET contribution=contribution+1 WHERE player_id=? AND run_id=? AND departed=0').run(p.id,run.id);
   if(profile.kind==='azrail'&&prepareCached477(this.sql,'INSERT OR IGNORE INTO adventure_awards VALUES(?,?,?)').run('azrail:'+run.id,p.id,this.now()).changes)this.material(p.id,TOWER_CHEST.kind,1);
  }
  prepareCached477(this.sql,'UPDATE normal_defeats SET rewards_completed_at=MAX(1,?) WHERE monster_id=? AND spawn_round=?').run(Math.floor(this.now()/1000),pending.monster_id,pending.spawn_round);
  return {monsterId:pending.monster_id,spawnRound:pending.spawn_round,awarded:participants.length>0,groundDrops:0};
 }
 portal({channel,area,x,y,gold=false,sourceKey=null,at=this.now()}){
  const cfg=this.config();if(!cfg.enabled||!Object.hasOwn(MIST_MAPS,area)||![x,y].every(Number.isFinite)||!Number.isSafeInteger(at)||typeof gold!=='boolean'||!Number.isInteger(channel)||channel<1||channel>4)error('Portal konumu veya ayarı geçersiz.');
  if(this.sql.prepare("SELECT COUNT(*) n FROM adventure_runs WHERE channel=? AND kind='mist' AND status='active' AND ((deadline_ms>0 AND deadline_ms>?) OR (deadline_ms=0 AND EXISTS(SELECT 1 FROM adventure_portals p WHERE p.run_id=adventure_runs.id AND p.closes_ms>?)))").get(channel,this.now(),this.now()).n>=cfg.maxActivePerChannel)return null;
  if(sourceKey&&this.sql.prepare('SELECT id FROM adventure_portals WHERE source_key=?').get(sourceKey))return null;
  const choices=Object.keys(cfg.objectives).filter(k=>cfg.objectives[k]),objective=choices[Math.floor(this.random()*choices.length)],run=this.insertRun('mist',channel,this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,cfg,{objective,gold,scale:1,floor:1,wave:1,clear:false,nextWaveAt:0,bossSpawned:false}),id=this.uuid();
  this.sql.prepare('INSERT INTO adventure_portals VALUES(?,?,?,?,?,?,?,?,?,?,0,?)').run(id,run.id,channel,area,x,y,at,at+cfg.portalSeconds*1000,gold?1:0,cfg.maxPlayers,sourceKey);return this.sql.prepare('SELECT * FROM adventure_portals WHERE id=?').get(id);
 }
 maybePortal(monster,player){
  if(!monster||!player||isAdventureArea(monster.area)||monster.area==='afk'||monster.area!==player.area||monster.channel!==player.channel||player.loadlab_run_id||player.is_gm||monster.id.startsWith('loadlab')||player.hp<=0)return null;
  const cfg=this.config();if(!cfg.enabled||!cfg.maps.includes(monster.area)||player.level<cfg.minLevel||this.sql.prepare('SELECT 1 FROM adventure_portals WHERE channel=? AND opens_ms>? LIMIT 1').get(player.channel,this.now()-cfg.killCooldownSeconds*1000)||this.random()*100>=cfg.chancePercent)return null;
  return this.portal({channel:player.channel,area:player.area,x:player.x,y:player.y,gold:this.random()*100<cfg.goldChancePercent,sourceKey:monster.id+':'+monster.spawn_round});
 }
 hazards(run,members,monsters){
  if(run.kind!=='tower'||run.state.floor!==10||!members.length)return;
  const boss=monsters.find(m=>this.profile(m)?.kind==='azrail'),now=this.now();if(!boss){if(run.state.hazard){run.state.hazard=null;this.save(run);}return;}
  const wave=run.state.hazard;
  if(wave&&now>=wave.at){
   // A delayed worker must not turn an unseen/expired warning into damage.
   if(now-wave.at<=500){
    const settings={...this.sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...this.sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},rules=createRetaliationRules({globals:this.globals,now:()=>now,random:this.random,fourChannels:true});
    for(const player of members){const dx=player.x-wave.x,dy=player.y-wave.y,d=Math.hypot(dx,dy),hit=wave.kind==='circle'?d<=wave.radius:wave.kind==='ring'?d>=Math.max(0,wave.radius-110)&&d<=wave.radius:Math.abs(dx*Math.cos(wave.angle)+dy*Math.sin(wave.angle))<=wave.radius&&Math.abs(-dx*Math.sin(wave.angle)+dy*Math.cos(wave.angle))<=65;if(!hit)continue;
     const armor=this.sql.prepare("SELECT kind,item_name,power,enchantments,equipped FROM player_items WHERE player_id=? AND kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') AND equipped=1").all(player.id),core=this.sql.prepare('SELECT equipped FROM dungeon_wings WHERE player_id=?').get(player.id)?.equipped??0;
     const damage=rules.runeBossDamage(boss,{...player,core_wings:core},armor,wave.damage,settings);
     this.sql.prepare('UPDATE players SET hp=MAX(0,hp-?),hp_revision=hp_revision+1,combat_lock_until_ms=MAX(combat_lock_until_ms,?) WHERE id=? AND area=? AND hp>0').run(damage.amount,now+5000,player.id,run.area);
     if(this.player(player.id).hp<=0)this.leave(player.id,'death');
    }
   }
   // Death exits may have saved return eligibility or closed the run. Preserve
   // that committed state instead of overwriting it with this older hazard copy.
   Object.assign(run,this.run(run.id));run.state.hazard=null;if(run.status==='active')this.save(run);return;
  }
  if(wave||now<(run.state.nextHazardAt??0))return;
  const options=Object.entries(run.config.patterns).filter(([,p])=>p.enabled);if(!options.length)return;const [kind,p]=options[(run.state.hazardSequence??0)%options.length],target=members[Math.floor(this.random()*members.length)];
  run.state.hazardSequence=(run.state.hazardSequence??0)+1;run.state.hazard={id:run.state.hazardSequence,kind,x:target.x,y:target.y,angle:this.random()*Math.PI,at:now+Math.max(750,p.telegraphMs),created:now,radius:p.radius,damage:p.damage};run.state.nextHazardAt=Math.max(now+p.cooldownMs,run.state.hazard.at+250);this.save(run);
 }
 scheduleStep(id){
  const row=this.sql.prepare('SELECT * FROM adventure_schedule WHERE id=? AND done_ms=0').get(id);if(!row||row.at_ms>this.now()||!this.config().enabled)return null;
  const sourceKey='schedule:'+row.id,portal=this.sql.prepare('SELECT * FROM adventure_portals WHERE source_key=?').get(sourceKey)??this.portal({...row,gold:row.gold===1,sourceKey,at:this.now()});
  // Capacity is temporary: retain the schedule until a portal was durably made.
  if(portal)this.sql.prepare('UPDATE adventure_schedule SET done_ms=? WHERE id=? AND done_ms=0').run(this.now(),id);return portal;
 }

 step(runId,allowed=null){
  let run=this.run(runId);if(!run||run.status!=='active')return;const now=this.now();
  const members=this.sql.prepare('SELECT p.* FROM players p JOIN adventure_members a ON a.player_id=p.id WHERE a.run_id=? AND a.departed=0').all(run.id).filter(p=>!allowed||allowed.has(p.id));
  for(const p of members)if(p.hp<=0)this.leave(p.id,'death');else if(run.cycle!==this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle||run.deadline_ms&&now>=run.deadline_ms)this.leave(p.id,'timeout');
  else if(towerNeedsCatchup(run,p))this.move(p,run.area,ADVENTURE_ENTRY);
  run=this.run(run.id);if(run.status!=='active')return;
  if(!members.length){const portal=this.sql.prepare('SELECT closes_ms FROM adventure_portals WHERE run_id=?').get(run.id);if(!run.deadline_ms&&portal&&portal.closes_ms<=now||run.deadline_ms&&run.deadline_ms<=now||run.cycle!==this.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle){run.status='closed';run.state.hazard=null;this.sql.prepare('UPDATE monsters SET hp=0,respawn_at=0 WHERE id IN (SELECT id FROM adventure_monsters WHERE run_id=?)').run(run.id);this.save(run);this.loot.closeRun(run.id);}return;}
  const monsters=this.alive(run);
  this.hazards(run,members.filter(p=>p.hp>0&&p.area===run.area),monsters);
  if(run.kind==='tower'){
   if(monsters.length)return;
   if(run.state.clear){
    if(run.state.floor>=10)return;
    if(!run.state.autoNextAt){run.state.autoNextAt=now+1200;this.save(run);}
    else if(now>=run.state.autoNextAt)this.nextTowerFloor(run,members.map(p=>this.player(p.id)));
    return;
   }
   const floor=run.config.floors[run.state.floor-1];if(run.state.wave<floor.waves){if(!run.state.nextWaveAt){run.state.nextWaveAt=now+floor.waveDelayMs;this.save(run);}else if(now>=run.state.nextWaveAt){run.state.wave++;this.spawnWave(run);}}else{run.state.clear=true;if(run.state.floor<10)run.state.autoNextAt=now+1200;this.save(run);}
  }else{
   if(run.state.objective==='seals'&&!run.state.bossSpawned&&!monsters.some(m=>this.profile(m)?.kind==='seal')){run.state.bossSpawned=true;const kind=run.state.gold?'gold':'keeper';for(let i=0;i<run.config.enemies[kind].count;i++)this.spawn(run,kind,run.config.enemies[kind],i,run.config.enemies[kind].count);this.save(run);}
   else if(!monsters.length&&!run.state.clear){if(run.state.gold&&!run.state.bossSpawned){run.state.bossSpawned=true;for(let i=0;i<run.config.enemies.gold.count;i++)this.spawn(run,'gold',run.config.enemies.gold,i,run.config.enemies.gold.count);}else run.state.clear=true;this.save(run);}
  }
 }
}
export function readAdventureBundle(sql,player){
 const lastMember=sql.prepare('SELECT * FROM adventure_members WHERE player_id=?').get(player.id),member=lastMember&&!lastMember.departed?lastMember:null,run=member?parse(sql.prepare('SELECT * FROM adventure_runs WHERE id=?').get(member.run_id)):null,retiredRunId=lastMember?.departed&&sql.prepare("SELECT 1 FROM adventure_runs WHERE id=? AND status='closed'").get(lastMember.run_id)?lastMember.run_id:null;
 const profiles=run?sql.prepare('SELECT a.id,a.profile FROM adventure_monsters a JOIN monsters m ON m.id=a.id WHERE a.run_id=? AND m.area=?').all(run.id,run.area).map(r=>[r.id,JSON.parse(r.profile)]):[];
 return {...(bagPendingBounded?{bagPending:pendingBagStatus(sql,player.id)}:{}),run,member,lootRevision:run?readMistLootRevision(sql,run.id):0,loot:run?readMistLoot(sql,{runId:run.id}):[],chestClaimed:!!(run?.kind==='mist'&&sql.prepare('SELECT 1 FROM adventure_awards WHERE key=? AND player_id=?').get('finish:'+run.id,player.id)),retiredRunId,profiles,towerInfo:{config:towerConfigFromDatabase(sql),inventory:Object.fromEntries(sql.prepare('SELECT kind,amount FROM dungeon_materials WHERE player_id=?').all(player.id).map(r=>[r.kind,r.amount]))},monsters:run?sql.prepare('SELECT m.* FROM monsters m JOIN adventure_monsters a ON a.id=m.id WHERE a.run_id=? AND m.area=?').all(run.id,run.area):[],portals:sql.prepare('SELECT * FROM adventure_portals WHERE channel=? AND area=? AND closes_ms>? AND entered<capacity').all(player.channel,player.area,Date.now())};
}
export function adventureProgress(bundle){
 const r=bundle.run;if(!r||r.kind!=='mist')return null;const profiles=new Map(bundle.profiles??[]),monsters=(bundle.monsters??[]).filter(m=>m.area===r.area),alive=monsters.filter(m=>m.hp>0);
 return {remaining:alive.length,total:monsters.length,sealsRemaining:alive.filter(m=>profiles.get(m.id)?.kind==='seal').length,bossRemaining:alive.filter(m=>profiles.get(m.id)?.boss).length};
}
export function publicAdventure(bundle,progress=adventureProgress(bundle)){const r=bundle.run;return {...(bundle.bagPending?{bagPending:bundle.bagPending}:{}),towerInfo:bundle.towerInfo,loot:bundle.loot??[],run:r?{id:r.id,kind:r.kind,area:r.area,revision:r.revision,deadline:r.deadline_ms,status:r.status,floor:r.state.floor,wave:r.state.wave,waves:r.kind==='tower'?r.config.floors[r.state.floor-1].waves:1,name:r.kind==='tower'?r.config.floors[r.state.floor-1].name:'Sis Yarığı',objective:r.state.objective,progress,gold:r.state.gold,clear:r.state.clear,hazard:r.state.hazard,contribution:bundle.member?.contribution??0,chestClaimed:bundle.chestClaimed===true}:null,portals:bundle.portals,profiles:bundle.profiles.map(([id,p])=>[id,{kind:p.kind,feature:p.feature,boss:p.boss,stationary:p.stationary,speed:p.speed,range:p.range}])};}

export function readAdventureBoot(sql,channel,now=Date.now()){
 const runs=sql.prepare("SELECT * FROM adventure_runs WHERE channel=? AND status='active'").all(channel).map(parse);
 return {runs,lootRevisions:runs.map(r=>[r.id,readMistLootRevision(sql,r.id)]),loot:readMistLoot(sql,{channel,now}),portals:sql.prepare("SELECT p.* FROM adventure_portals p JOIN adventure_runs r ON r.id=p.run_id WHERE p.channel=? AND r.status='active' AND p.closes_ms>? AND p.entered<p.capacity").all(channel,now),schedules:sql.prepare('SELECT * FROM adventure_schedule WHERE channel=? AND done_ms=0 ORDER BY at_ms LIMIT 64').all(channel),profiles:sql.prepare("SELECT a.id,a.profile FROM adventure_monsters a JOIN adventure_runs r ON r.id=a.run_id WHERE r.channel=? AND r.status='active' AND a.area=r.area").all(channel).map(r=>[r.id,JSON.parse(r.profile)])};
}

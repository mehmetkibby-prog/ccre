import {azrailNoticeR68} from './azrail-r62.mjs';
import {TOWER_CATALOG_BY_ID,TOWER_CATALOG,TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK,TOWER_KINDS,towerConfigFromDatabase,towerSummary} from './tower-config.mjs';
import {classMoveSpeed,classAttackRange} from '../../../native510-bb3a6cc689c6/lib/class-combat.mjs';
import {emeraldPower444} from '../../../native510-bb3a6cc689c6/lib/emerald-set.mjs';
import {armorDamageReduction} from './armor-mitigation-r102.mjs';
import {specialization456} from '../../../native510-bb3a6cc689c6/lib/expansion456.mjs';
import {DUNGEON_MAP_VERSION,DUNGEON_WORLD,dungeonPortal,dungeonWalkable} from '../../../native510-bb3a6cc689c6/lib/dungeon-maps.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const inventoryRule=message=>Object.assign(Error(message),{adventureRule:true});
const validRequest=input=>{const request=String(input.requestId??'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(request))throw inventoryRule('Geçerli işlem kimliği gerekiyor.');return request;};
export function createTowerRules({randomUUID,globals}){
 function config(){return this.settingsSnapshot?.('kadim_tower_settings')??towerConfigFromDatabase(this.db);}
 function towerInfo(id){return {config:config.call(this),inventory:this.materials(id),catalog:TOWER_CATALOG};}
 function grant(id,rule,cfg=this.settings()){
  const item=TOWER_CATALOG_BY_ID.get(rule.itemId);if(!item)throw Error('Kule ödülü tanınmıyor.');
  if(item.type.startsWith('tower'))this.material(id,item.kind,rule.amount);
  else{if(!globals.__colDragonBoss)throw Error('Ödül teslim sistemi hazır değil.');let gear={};if(item.type==='gear'){const settings={...this.gameSettings(),...this.combatSettings(),...this.db.prepare('SELECT * FROM economy_settings WHERE id=1').get()};gear=this.makeGear?.(item,settings,cfg);if(!gear)throw Error('Ekipman ödül sistemi hazır değil.');if(item.rarity==='emerald')gear={...gear,item_name:item.name,power:emeraldPower444(item.kind,{...settings,...cfg})};}globals.__colDragonBoss.grantCatalog(id,item,rule.amount,gear);}
  return {itemId:item.id,kind:item.kind??item.type,name:item.name,amount:rule.amount};
 }
 function roll(rows){return rows.filter(rule=>this.roll()*100<rule.chance).map(rule=>({...rule,amount:rule.min+Math.floor(this.roll()*(rule.max-rule.min+1))}));}
 function receipt(id,input,kind,fn){
  const request=validRequest(input);return this.transaction(()=>{const old=this.db.prepare('SELECT result FROM kadim_tower_receipts WHERE player_id=? AND request_id=? AND kind=?').get(id,request,kind);if(old)return JSON.parse(old.result);const result=fn();this.db.prepare('INSERT INTO kadim_tower_receipts(player_id,request_id,kind,result) VALUES(?,?,?,?)').run(id,request,kind,JSON.stringify(result));return result;});
 }
 function createTower(id,input){
  return receipt.call(this,id,input,'entry',()=>{
   const tower=config.call(this);if(!tower.enabled)throw Error('Kadim Kulesi şu anda kapalı.');
   this.keeper(id,false);const p=this.player(id),now=this.now();
   if(p.level<tower.minLevel||p.arena_match_id||p.combat_lock_until_ms>now)throw Error(`Kadim Kulesi için seviye ${tower.minLevel} olmalı ve savaş dışında olmalısın.`);
   const run={id:randomUUID(),partyId:'tower:'+id,leaderId:id,mode:'tower',status:'ready',created:now,readyUntil:now,started:0,deadline:0,stage:0,wave:0,attempt:0,size:1,cfg:{...this.settings(),minimum_level:tower.minLevel,duration_seconds:tower.durationSeconds},tower:structuredClone(tower),members:[{id,name:p.name,role:p.role,ready:true,x:1200,y:1190,hp:1,maxHp:1,damage:0,seen:now,input:{x:0,y:0},inputAt:0,sequence:0,cooldowns:[0,0,0,0],stats:null}],enemies:[],telegraphs:[],effects:[],groundLoot:[],message:'',rewards:{}};
   this.db.prepare('INSERT INTO dungeon_members(player_id,run_id) VALUES(?,?)').run(id,run.id);
   this.begin(run);this.save(run);this.runs.set(run.id,run);
   return {ok:true,runId:run.id};
  });
 }
 function towerOpenChest(id,input,publish){
  return receipt.call(this,id,input,'chest',()=>{
   const p=this.player(id);if(this.locked(id)||p.hp<=0||p.combat_lock_until_ms>this.now()||p.arena_match_id)throw inventoryRule('Sandık savaş ve zindan dışında açılabilir.');
   if(!this.db.prepare('UPDATE dungeon_materials SET amount=amount-1 WHERE player_id=? AND kind=? AND amount>0').run(id,TOWER_CHEST.kind).changes)throw inventoryRule('Azrail Sandığın yok.');
   const rewards=roll.call(this,config.call(this).chest).map(rule=>grant.call(this,id,rule)),personalNotice=azrailNoticeR68(p,rewards,this.now(),input.requestId);return {ok:true,rewards,...(personalNotice?{personalNotice}:{}),message:rewards.length?'Azrail Sandığı açıldı.':'Azrail Sandığı açıldı; bu sandıktan eşya çıkmadı.'};
  });
 }
 function towerRefine(){
  // Retired conversion: old clients receive a domain error, never a debit.
  throw inventoryRule('Kule malzemeleri artı basma malzemesidir; Kor Mührü’ne dönüştürülemez.');
 }
 function spawnWave(run){
  const f=run.tower.floors[run.stage-1],now=this.now();let index=0;
  run.enemies=[];run.waveSpawn=null;run.waveAt=0;
  for(const [row,s]of f.spawns.entries()){
   const boss=['warden','mourner','azrail'].includes(s.kind);
   if(s.kind==='stone'&&run.wave!==1||boss&&run.wave!==f.waves)continue;
   for(let i=0;i<s.count;i++){
    const angle=index*2.399963229728653,radius=160+(index%5)*115;
    const enemy={id:randomUUID(),kind:boss?'boss':s.kind==='stone'?'seal':'sentinel',towerKind:s.kind,towerRow:row,name:TOWER_KINDS[s.kind],x:clamp(1200+Math.cos(angle)*radius,300,2100),y:clamp(680+Math.sin(angle)*radius,300,1000),hp:s.hp,maxHp:s.hp,nextAttack:now+Math.max(1200,s.telegraphMs),attackCount:0,shield:false,rootUntil:0,moving:false};
    run.enemies.push(enemy);index++;
   }
  }
  run.message=`${run.stage}. Kat · ${f.name} · Dalga ${run.wave}/${f.waves}`;
 }
 function towerStage(run){
  if(!Number.isInteger(run.stage)||run.stage<1||run.stage>10)throw Error('Kule katı geçersiz.');
  run.motionTime=this.lastTick;run.status='active';run.mapVersion=DUNGEON_MAP_VERSION;run.mapId='kadim-tower-'+run.stage;run.attempt++;run.stageStarted=this.now();run.enemies=[];run.telegraphs=[];run.effects=[];run.wave=1;run.waveAt=0;run.waveSpawn=null;run.focusPhase=2;run.crystal=null;
  for(const p of run.members){this.refreshPumpkin499(p);p.x=1200;p.y=1190;p.hp=p.maxHp;p.input={x:0,y:0};p.inputAt=0;p.moveTarget=null;p.cooldowns=[0,0,0,0];p.positionEpoch=(p.positionEpoch??0)+1;}
  spawnWave.call(this,run);
 }
 function towerKills(run,enemies,actor){
  for(const enemy of enemies){
   for(const p of run.members.filter(p=>!p.left)){
    if(!this.db.prepare('INSERT OR IGNORE INTO kadim_tower_kills(run_id,enemy_id,player_id) VALUES(?,?,?)').run(run.id,enemy.id,p.id).changes)continue;
    const spec=run.tower.floors[run.stage-1].spawns[enemy.towerRow],rewards=roll.call(this,spec.drops).map(rule=>grant.call(this,p.id,rule,run.cfg));
    for(const reward of rewards)run.effects.push({id:randomUUID(),kind:'chest',actorId:p.id,x:enemy.x,y:enemy.y,text:`${reward.name} ×${reward.amount}`,until:this.now()+3500});
    if(enemy.towerKind==='azrail')awardChest.call(this,run,p);
   }
  }
  this.save(run);
 }
 function awardChest(run,p){
  if(this.db.prepare('SELECT 1 FROM dungeon_rewards WHERE run_id=? AND player_id=?').get(run.id,p.id))return;
  const reward=grant.call(this,p.id,{itemId:TOWER_CHEST.id,amount:1});
  this.db.prepare('INSERT INTO dungeon_rewards(run_id,player_id,rewards,created_at) VALUES(?,?,?,?)').run(run.id,p.id,JSON.stringify([reward]),this.now());run.rewards={...run.rewards,[p.id]:[reward]};
  run.effects.push({id:randomUUID(),kind:'chest',actorId:p.id,x:p.x,y:p.y,text:'Azrail Sandığı ×1',until:this.now()+5000});
 }
 function towerComplete(run){
  if(run.status==='complete')return;
  this.transaction(()=>{
   // The guaranteed chest was already committed with Azrail's lethal hit.
   // Clearing remaining enemies changes progression only; it never pays twice.
   run.status='complete';run.telegraphs=[];run.message='Kadim Kulesi tamamlandı! Azrail Sandığı envanterine eklendi. 1 dakika sonra Pazar Köyü’ne döneceksin.';run.deadline=this.now()+60000;this.save(run);
  });
 }
 function movement(run,alive,dt,now){
  for(const p of alive){
   if(now-p.inputAt>800){p.input={x:0,y:0};p.moveTarget=null;}
   if(p.moveTarget){const goal=p.moveTarget.id?run.enemies.find(e=>e.id===p.moveTarget.id&&e.hp>0):p.moveTarget,stop=p.moveTarget.id?Math.max(80,classAttackRange(p.role,0)-50):0,d=goal?dist(p,goal):0,strength=Math.min(1,Math.max(0,d-stop)/(classMoveSpeed(p.role)*Math.max(.001,dt)));p.input=goal&&d>.001?{x:(goal.x-p.x)/d*strength,y:(goal.y-p.y)/d*strength}:{x:0,y:0};}
   const x=clamp(p.x+p.input.x*classMoveSpeed(p.role)*dt,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX),y=clamp(p.y+p.input.y*classMoveSpeed(p.role)*dt,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
   if(dungeonWalkable(x,y)){p.x=x;p.y=y;if(Math.hypot(p.input.x,p.input.y)>.01)p.direction={...p.input};}else if(dungeonWalkable(x,p.y))p.x=x;else if(dungeonWalkable(p.x,y))p.y=y;
  }
 }
 function applyHazards(run,alive,now){
  for(const t of run.telegraphs.filter(t=>t.at<=now)){
   // A defeated caster cannot hit after its death; missed tick never multiplies a strike.
   if(!run.enemies.some(e=>e.id===t.source&&e.hp>0))continue;
   run.effects.push({id:randomUUID(),kind:'impact',shape:t.kind,x:t.x,y:t.y,angle:t.angle??0,radius:t.radius,at:t.at,until:now+650});
   for(const p of alive){const d=dist(p,t),angle=Math.atan2(Math.sin(Math.atan2(p.y-t.y,p.x-t.x)-t.angle),Math.cos(Math.atan2(p.y-t.y,p.x-t.x)-t.angle)),hit=t.kind==='line'?Math.abs(angle)<.15&&d<t.radius:t.kind==='ring'?d>95&&d<t.radius:d<t.radius;if(!hit)continue;
    if(this.roll()<Math.min(15,p.stats.block)/100){run.effects.push({id:randomUUID(),kind:'block',actorId:p.id,x:p.x,y:p.y,text:'BLOKLAMA',until:now+700});continue;}
    const guard=p.specialGuardUntil>now?(specialization456(p.role,p.stats.specialization,this.settingsSnapshot?.('game_settings')??{events_json:this.specialistSettingsRaw459})?.guard??0):0,damage=Math.min(p.hp,Math.max(0,Math.round(t.damage*(1-armorDamageReduction(p.stats.defense,'dungeon'))*(1-guard))));p.hp=Math.max(0,p.hp-damage);run.effects.push({id:randomUUID(),kind:'hurt',actorId:p.id,x:p.x,y:p.y,tx:p.x,ty:p.y,text:String(damage),until:now+650});
   }
  }
  run.telegraphs=run.telegraphs.filter(t=>t.at>now);
 }
 function enemiesTick(run,alive,dt,now){
  for(const e of run.enemies){if(e.hp<=0)continue;const s=run.tower.floors[run.stage-1].spawns[e.towerRow],near=alive.filter(p=>p.hp>0&&now-p.seen<10000),target=near.reduce((a,p)=>!a||dist(p,e)<dist(a,e)?p:a,null);e.moving=false;e.targetId=target?.id;if(!target)continue;
   const d=dist(e,target);if(now<(e.rootUntil??0)||now<(e.castingUntil??0))continue;
   e.direction={x:(target.x-e.x)/Math.max(1,d),y:(target.y-e.y)/Math.max(1,d)};
   const stop=e.towerKind==='azrail'?Math.min(180,s.range*.8):Math.min(110,s.range*.7,s.radius*.8);if(s.kind!=='stone'&&d>stop){const step=Math.min(s.speed*dt,d-stop);e.x=clamp(e.x+e.direction.x*step,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX);e.y=clamp(e.y+e.direction.y*step,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);e.moving=step>0;}
   if(dist(e,target)>s.range||now<e.nextAttack)continue;
   let kind='circle',pattern=s;const azrail=e.towerKind==='azrail';if(azrail){const patterns=Object.entries(run.tower.patterns).filter(([,p])=>p.enabled),chosen=patterns[e.attackCount%patterns.length];[kind,pattern]=chosen;}
   e.attackCount++;e.lastAttack=now;e.moving=false;e.strikeAt=now+pattern.telegraphMs;e.castingUntil=e.strikeAt+250;e.nextAttack=now+(pattern.cooldownMs??s.attackMs);
   // Azrail circles lock onto the player's current position, forcing relocation.
   const center=azrail&&kind==='circle'?target:e;
   run.telegraphs.push({id:randomUUID(),source:e.id,kind,x:center.x,y:center.y,angle:Math.atan2(target.y-e.y,target.x-e.x),radius:pattern.radius,startedAt:now,at:e.strikeAt,damage:pattern.damage});
  }
 }
 function towerTick(run,now,dt){
  run.motionTime=now;
  if(!['active','portal','complete','wipe'].includes(run.status))return;
  if(now>=run.deadline||run.status==='wipe'){this.finish(run,run.status==='complete'?'complete':run.status==='wipe'?'failed':'expired','Kadim Kulesi seferi sona erdi. Pazar Köyü’ne döndün.');return;}
  const alive=run.members.filter(p=>{if(!p.left)this.refreshPumpkin499(p,now);return !p.left&&p.hp>0;});
  if(!alive.length){this.finish(run,run.members.every(p=>p.left)?'abandoned':'failed','Kadim Kulesi seferi sona erdi. Pazar Köyü’ne döndün.');return;}
  movement(run,alive,dt,now);run.effects=run.effects.filter(e=>e.until>now);
  if(run.status==='active'){
   applyHazards.call(this,run,alive,now);if(alive.every(p=>p.hp<=0)){this.finish(run,'failed','Kadim Kulesi’nde yenildin. Pazar Köyü’ne döndün.');return;}
   if(run.enemies.every(e=>e.hp<=0)){
    const f=run.tower.floors[run.stage-1];if(run.wave<f.waves){if(!run.waveAt){run.waveAt=now+f.waveDelayMs;run.message='Dalga tamamlandı. Sonraki dalga hazırlanıyor.';this.save(run);}else if(now>=run.waveAt){run.wave++;spawnWave.call(this,run);this.save(run);}}
    else if(run.stage===10)towerComplete.call(this,run);
    else{run.status='portal';run.portalAt=now;run.telegraphs=[];run.message=`${run.stage}. kat tamamlandı. Açılan geçitten ${run.stage+1}. kata ilerle.`;this.save(run);}
   }else enemiesTick.call(this,run,alive,dt,now);
  }
  if(run.status==='portal'&&now>=(run.portalAt??0)+1000&&alive.some(p=>p.hp>0&&dist(p,dungeonPortal(run.stage))<=85)){run.stage++;towerStage.call(this,run);this.save(run);return;}
  if(now-(this.lastSave.get(run.id)??0)>=1000)this.periodicSave(run);
 }
 return {towerInfo,createTower,towerOpenChest,towerRefine,towerStage,towerTick,towerKills,towerSummary};
}

import {optimizeR18} from './perf-r18-features.mjs';
import {pveEntries489} from './pve-multi489.mjs';
import {colLabSamePlayerCohort,colLabMayAffectMonster,colLabIsMonster,colLabMonsterActive} from './loadlab-gameplay.mjs';
const EVENT_NEARBY_AREAS444=new Set(['forest','frozen','sanctum','dragon','sinsi','black','ancient','rune','rune_v2','event']);
import {deferDatabaseBackgroundTask} from './database.mjs';
import {reportRuntimeWork,measureRuntimeWork} from './runtime-performance.mjs';

const CONFIG_TABLES=['game_settings','combat_settings','economy_settings','dragon_settings','dungeon_settings'];
const WATCHED=['monsters','players','pve_engagements',...CONFIG_TABLES];
const playerFields='id,x,y,hp,area,channel,arena_match_id,realtime_scope_version,last_seen';
const playerKeys=playerFields.split(',');
const rowKey=(table,row)=>table==='pve_engagements'?row.player_id:row.id;
// One owner and one clock. No polling of SQLite or participation history in a
// 100ms turn: committed writers notify these maps through TEMP triggers.
export class WorldLoop {
 constructor(database,{positions,combat,channel=0,enabled=process.env.CORE_WORLD_LOOP!=='0',tickMs=Number(process.env.CORE_WORLD_TICK_MS??100),now=Date.now,defer=deferDatabaseBackgroundTask}={}){
  if(![0,1,2,3].includes(channel))throw Error('Invalid world owner channel');this.channel=channel;
  if(!Number.isInteger(tickMs)||tickMs<20||tickMs>1000)throw Error('CORE_WORLD_TICK_MS must be an integer from 20 to 1000');
  this.enabled=enabled;this.tickMs=tickMs;this.now=now;this.defer=defer;this.positions=positions;this.combat=combat;
  this.monsters=new Map();this.monstersByScope=new Map();this.players=new Map();this.engagements=new Map();this.engagedByMonster=new Map();this.activePlayers=new Set();this.config=new Map();this.jobs=new Map();this.regenClocks=new Map();
  this.stats={ticks:0,totalTickMs:0,tickMsMax:0,flushes:0,lastFlushMs:0,errors:0};this.stopped=false;
  if(!enabled)return;
  const raw=database.positionRawPrepare??database.prepare.bind(database);
  this.raw=raw;
  this.schema=new Set(raw("SELECT name FROM main.sqlite_schema WHERE type='table'").all().map(r=>r.name));
  this.reload();
  if(positions)positions.onChanged=id=>this.touchPlayer(id);
  if(combat)combat.worldLoop=this;
 }
 reload(){for(const table of WATCHED){if(!this.schema.has(table))continue;const map=table==='monsters'?this.monsters:table==='players'?this.players:table==='pve_engagements'?this.engagements:null;map?.clear();if(table==='monsters')this.monstersByScope.clear();if(table==='players')this.activePlayers.clear();if(table==='pve_engagements')this.engagedByMonster.clear();
  const scope=!this.channel?'':table==='monsters'?` WHERE channel=${this.channel} OR channel=0`:table==='players'?` WHERE channel=${this.channel}`:table==='pve_engagements'?` WHERE player_id IN (SELECT id FROM main.players WHERE channel=${this.channel})`:'';
  for(const row of this.raw(`SELECT ${table==='players'?playerFields:'*'} FROM main.${table}${scope}`).all())this.changed(table,rowKey(table,row),row);}}
 changed(table,id,row){
  if(this.channel&&row){if(table==='monsters'&&row.channel!==this.channel&&!(row.channel===0))row=null;else if(table==='players'&&row.channel!==this.channel)row=null;else if(table==='pve_engagements'&&!this.players.has(row.player_id))row=null;}
  if(table==='monsters'){
   const old=this.monsters.get(id),scopeChanged=!old||!row||old.area!==row.area||old.channel!==row.channel;
   if(old&&scopeChanged){
    const channels=this.monstersByScope.get(old.area),ids=channels?.get(old.channel);ids?.delete(id);
    if(!ids?.size)channels?.delete(old.channel);if(!channels?.size)this.monstersByScope.delete(old.area);
   }
   if(row){
    this.monsters.set(id,row);
    if(scopeChanged){let channels=this.monstersByScope.get(row.area);if(!channels)this.monstersByScope.set(row.area,channels=new Map());let ids=channels.get(row.channel);if(!ids)channels.set(row.channel,ids=new Set());ids.add(id);}
   }else{this.monsters.delete(id);this.regenClocks.delete(id);}
  }else if(table==='players'){
   // Commit notifications contain a full player row. Keep the same narrow
   // simulation view used by reload(), not hundreds of inventory/account fields.
   if(row){const view={};for(const key of playerKeys)view[key]=row[key];this.players.set(id,view);}else{this.players.delete(id);this.activePlayers.delete(id);}this.touchPlayer(id);
  }else if(table==='pve_engagements'){
   const old=this.engagements.get(id);for(const entry of pveEntries489(old)){const ids=this.engagedByMonster.get(entry.monster_id);ids?.delete(id);if(!ids?.size)this.engagedByMonster.delete(entry.monster_id);}
   if(row){this.engagements.set(id,row);for(const entry of pveEntries489(row)){let ids=this.engagedByMonster.get(entry.monster_id);if(!ids)this.engagedByMonster.set(entry.monster_id,ids=new Set());ids.add(id);}}else this.engagements.delete(id);
  }else if(row)this.config.set(table,row);
 }
 touchPlayer(id){const p=this.player(id);if(p&&p.last_seen>=Math.floor(this.now()/1000)-30)this.activePlayers.add(id);else this.activePlayers.delete(id);}
 player(id){
  const base=this.players.get(id);if(!base)return null;
  const p=this.positions?.entries.get(id)?.current,c=this.combat?.entry('players',id)?.current;
  const compatible=p&&p.area===base.area&&p.channel===base.channel&&p.realtime_scope_version===base.realtime_scope_version;
  return {...base,...(compatible?{x:p.x,y:p.y,last_seen:Math.max(base.last_seen,Math.floor(p.movement_checked_at_ms/1000))}:{}),...(c&&c.area===base.area&&c.channel===base.channel&&c.realtime_scope_version===base.realtime_scope_version?{hp:c.hp,last_seen:Math.max(base.last_seen,Math.floor((c.last_monster_hit_at??0)/1000),compatible?Math.floor(p.movement_checked_at_ms/1000):0)}:{})};
 }
 monster(id,b=this.monsters.get(id)){const c=this.combat?.entry('monsters',id)?.current;if(!optimizeR18)return c&&b&&c.spawn_round===b.spawn_round?{...b,hp:c.hp,last_damaged_at_ms:c.last_damaged_at_ms,last_regen_at_ms:c.last_regen_at_ms}:b;if(!c||!b||c.spawn_round!==b.spawn_round)return b;const cache=this.monsterRowsR18??=new WeakMap(),old=cache.get(b);if(old?.c===c&&old.hp===c.hp&&old.damaged===c.last_damaged_at_ms&&old.regen===c.last_regen_at_ms)return old.row;const row={...b,hp:c.hp,last_damaged_at_ms:c.last_damaged_at_ms,last_regen_at_ms:c.last_regen_at_ms};cache.set(b,{c,hp:c.hp,damaged:c.last_damaged_at_ms,regen:c.last_regen_at_ms,row});return row;}
 combatChanged(changes){for(const {name,id}of changes??[]){if(name==='pve_engagements')this.changed(name,id,this.combat.entry(name,id)?.current??null);else if(name==='players')this.touchPlayer(id);}}
 settings(defaults={}){return {...defaults,...this.config.get('game_settings'),...this.config.get('economy_settings'),...this.config.get('combat_settings')};}
 due(nowSeconds){const rows=[];for(const id of this.monsters.keys()){const m=this.monster(id);if(colLabMonsterActive(m)&&(!this.channel||this.channel===1||m.channel!==0)&&m.id!=='dragon-world-1'&&m.hp<=0&&m.respawn_at>0&&m.respawn_at<=nowSeconds)rows.push(m);}return rows;}
 needsRepair(s){
  for(const id of this.monsters.keys()){
   const m=this.monster(id);if(!colLabMonsterActive(m)||id==='dragon-world-1'||this.channel>1&&m.channel===0)continue;
   const stone=id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3',frozen=id==='frozen-boss-1',ancient=id==='ancient-boss-1',water=id.startsWith('frozen-water-c');
   const disabled=stone&&!s.black_stone_boss_enabled||frozen&&(!s.frozen_zone_enabled||!s.frozen_boss_enabled)||ancient&&!s.ancient_boss_enabled||water&&(!s.frozen_zone_enabled||!s.frozen_water_enabled);
   if(disabled){if(m.hp!==0||m.respawn_at!==0)return true;continue;}
   if(m.summoned&&m.hp<=0&&m.respawn_at<=0&&(this.monsters.get(m.parent_stone_id)?.spawn_round??0)>m.spawn_round)return true;
   if(m.hp<=0&&m.respawn_at<=0&&!m.summoned&&!m.is_boss&&m.area!=='event')return true;
  }return false;
 }
 needsDespawn(nowSeconds){for(const m of this.monsters.values())if(m.is_boss&&!colLabIsMonster(m.id)&&m.hp>0&&m.despawn_at>0&&m.despawn_at<=nowSeconds)return true;return false;}
 dragonDue(){const m=this.monster('dragon-world-1'),row=this.config.get('dragon_settings');if(!m||!row)return false;if(this.dragonRaw!==row.config_json){this.dragonRaw=row.config_json;this.dragonConfig=JSON.parse(row.config_json);}const c=this.dragonConfig;return c.enabled&&(m.hp>0&&m.despawn_at!==0||m.hp<=0&&(m.respawn_at<=0||m.respawn_at<=this.now()/1000&&c.loot.some(r=>r.chance>0)));}
 // Same nearest-player/range rules as armNearbyPveEngagement. This chooses
 // an existing anchor, never a new movement or damage rule.
 nearby(playerId,nowMs=this.now(),multiple489=false){
  const p=this.player(playerId);if(!p||p.hp<=0||!EVENT_NEARBY_AREAS444.has(p.area))return null;
  if(!multiple489&&this.engagements.has(playerId))return null;const known489=new Map(pveEntries489(this.engagements.get(playerId)).map(e=>[e.monster_id,e.spawn_round]));
  const eventArea444=p.area==='event',candidates=[],channels=this.monstersByScope.get(p.area);
  // Combat memory changes health/timestamps, never area or channel. Select the
  // committed scope first so each player only merges relevant monster rows.
  for(const ids of [channels?.get(0),p.channel===0?null:channels?.get(p.channel)]){
   if(!ids)continue;
   for(const id of ids){
    const base=this.monsters.get(id);if(!base||/^rune-v2-boss-c[1-3]-1$/.test(base.id)||base.is_stone||base.area!==p.area||base.channel!==0&&base.channel!==p.channel)continue;
    if(optimizeR18&&multiple489&&known489.get(id)===base.spawn_round)continue;
    const distance_sq=(base.x-p.x)**2+(base.y-p.y)**2;
    const range=eventArea444?320:(/^rune-v2-boss-c[1-3]-1$/.test(base.id)||base.id==='frozen-boss-1'||base.id==='stone-boss-black-c1'||base.id==='stone-boss-black-c2'||base.id==='stone-boss-black-c3')?370:base.id.startsWith('frozen-water-c')?330:base.is_boss||base.id==='dragon-world-1'?320:base.id.startsWith('yutan')?300:230;
    // Reject sleeping/out-of-range anchors before reading combat overlays or
    // allocating merged rows. Exact aggro radius and tie ordering stay intact.
    if(!(distance_sq<=range*range)||!colLabMayAffectMonster(p,base))continue;
    const m=this.monster(id,base);if(m.hp<=0||multiple489&&known489.get(id)===m.spawn_round)continue;
    candidates.push({monster:m,distance_sq});
   }
  }
  if(!multiple489)candidates.sort((a,b)=>a.distance_sq-b.distance_sq||(a.monster.id<b.monster.id?-1:a.monster.id>b.monster.id?1:0));
  const peers=[];for(const id of this.activePlayers){const peer=this.player(id);if(!peer||peer.last_seen<Math.floor(nowMs/1000)-30){this.activePlayers.delete(id);continue;}if(id!==playerId&&peer.hp>0&&peer.area===p.area&&peer.channel===p.channel&&colLabSamePlayerCohort(p,peer))peers.push(peer);}
  const eligible489=({monster:m,distance_sq})=>!peers.some(peer=>(m.x-peer.x)**2+(m.y-peer.y)**2<distance_sq);
  if(multiple489)return candidates.filter(eligible489).sort((a,b)=>a.distance_sq-b.distance_sq||(a.monster.id<b.monster.id?-1:a.monster.id>b.monster.id?1:0)).slice(0,Math.max(0,32-known489.size)).map(({monster,distance_sq})=>({player:p,monster:{...monster,distance_sq}}));
  const m=candidates.find(eligible489);
  if(!m)return null;return {player:p,monster:{...m.monster,distance_sq:m.distance_sq}};
 }
 regenerate(settings,nowMs=this.now()){
  if(!this.combat?.enabled)return false;
  const percent=settings.monster_rest_regen_percent,delay=settings.monster_rest_regen_combat_delay_seconds;
  for(const id of this.monsters.keys()){
   const m=this.monster(id);if(!colLabMonsterActive(m)||m.hp<=0||this.channel>1&&m.channel===0)continue;
   const last=Math.max(m.last_regen_at_ms??0,this.regenClocks.get(id)??0);if(last>nowMs-1000)continue;
   this.regenClocks.set(id,nowMs);
   if(m.hp>=m.max_hp||!(percent>0)||m.last_damaged_at_ms>nowMs-delay*1000)continue;
   const engaged=[...(this.engagedByMonster.get(id)??[])].some(pid=>{const e=this.engagements.get(pid);return e&&e.expires_at_ms>=nowMs&&pveEntries489(e).some(entry=>entry.monster_id===m.id&&entry.spawn_round===m.spawn_round);});
   if(engaged)continue;
   const hp=Math.min(m.max_hp,m.hp+Math.max(1,Math.round(m.max_hp*percent/100*Math.min(5000,Math.max(0,nowMs-Math.max(last,m.last_damaged_at_ms+delay*1000)))/1000)));
   this.combat.updateMonster(m,{hp,last_regen_at_ms:nowMs});
  }return true;
 }
 register(name,intervalMs,run,{overlap=false}={}){if(!this.enabled)return()=>{};const job={name,intervalMs,run,overlap,nextAt:this.now()+intervalMs,running:null};this.jobs.set(name,job);return()=>{if(this.jobs.get(name)===job)this.jobs.delete(name);};}
 tick(){
  if(this.stopped||!this.enabled)return;const at=performance.now(),now=this.now();
  for(const job of this.jobs.values())if((!job.running||job.overlap)&&now>=job.nextAt){
   job.nextAt=now+job.intervalMs;
   const work=this.defer(()=>{if(this.stopped)return;return measureRuntimeWork(job.name,()=>{const started=performance.now();try{return job.run();}finally{this.recordWork(performance.now()-started);}});});
   job.running=work;void work.catch(error=>{this.stats.errors++;console.error('World loop job failed',job.name,error.message);}).finally(()=>{if(job.running===work)job.running=null;});
  }
  const elapsed=performance.now()-at;this.stats.ticks++;this.stats.totalTickMs+=elapsed;this.stats.tickMsMax=Math.max(this.stats.tickMsMax,elapsed);reportRuntimeWork('world_loop_tick',elapsed,performance.timeOrigin+at);
 }
 start(){if(this.enabled&&!this.timer){this.timer=setInterval(()=>this.tick(),this.tickMs);this.timer.unref();}}
 recordWork(ms){this.stats.totalTickMs+=ms;this.stats.tickMsMax=Math.max(this.stats.tickMsMax,ms);}
 stop(){this.stopped=true;clearInterval(this.timer);}
 async flushed(task){const at=performance.now();await task();this.stats.flushes++;this.stats.lastFlushMs=performance.now()-at;}
 snapshot(){return {enabled:this.enabled,timingScope:'tick-and-initial-sync-work; async-wall-and-resumed-phases-in-process.work',tickMsMean:this.stats.ticks?this.stats.totalTickMs/this.stats.ticks:0,tickMsMax:this.stats.tickMsMax,monsters:this.monsters.size,flushes:this.stats.flushes,lastFlushMs:this.stats.lastFlushMs,errors:this.stats.errors};}
}

export function attachWorldLoop(database,world){
 world?.worldPush?.attach(database);
 if(!world?.enabled)return;
 const prepare=database.prepare.bind(database),exec=database.exec.bind(database),raw=database.positionRawPrepare??prepare;
 const readers=new Map();let changed=null;
 database.function('col_world_changed',{varargs:true},(table,id)=>{changed?.set(table+'\u001e'+id,[table,id]);return 0;});
 for(const table of WATCHED){if(!world.schema.has(table))continue;const key=table==='pve_engagements'?'player_id':'id';
  readers.set(table,raw(`SELECT ${table==='players'?playerFields:'*'} FROM main.${table} WHERE ${key}=?`));
  for(const [op,ref]of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']])exec(`CREATE TEMP TRIGGER col_world_${table}_${op} AFTER ${op} ON main.${table} BEGIN SELECT col_world_changed('${table}',${ref}.${key});END;`);
 }
 database.exec=sql=>{
  if(/^\s*BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)\b/i.test(sql)){changed=new Map();try{return exec(sql);}catch(error){changed=null;throw error;}}
  if(/^\s*(?:COMMIT|END)\b/i.test(sql)){const result=exec(sql),rows=changed;changed=null;if(rows)for(const [table,id]of rows.values())world.changed(table,id,readers.get(table).get(id)??null);return result;}
  if(/^\s*ROLLBACK\b(?!\s+TO)/i.test(sql)){const result=exec(sql);changed=null;return result;}
  if(!database.isTransaction&&/^\s*(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql)){database.exec('BEGIN IMMEDIATE');try{const r=exec(sql);database.exec('COMMIT');return r;}catch(error){if(database.isTransaction)database.exec('ROLLBACK');throw error;}}
  return exec(sql);
 };
 database.prepare=sql=>{
  const p=prepare(sql);if(!/^\s*(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql)&&!/^\s*WITH\b[\s\S]*\b(?:UPDATE|INSERT|DELETE|REPLACE)\b/i.test(sql))return p;
  for(const method of ['run','get','all']){const call=p[method].bind(p);p[method]=(...args)=>{if(database.isTransaction)return call(...args);database.exec('BEGIN IMMEDIATE');try{const r=call(...args);database.exec('COMMIT');return r;}catch(error){if(database.isTransaction)database.exec('ROLLBACK');throw error;}};}return p;
 };
}

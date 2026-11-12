import {randomUUID} from 'node:crypto';

export const RUNE_V2_BOSS_AI_SCHEMA484=`CREATE TABLE IF NOT EXISTS rune_v2_boss_state484(
 id TEXT PRIMARY KEY,spawn_round INTEGER NOT NULL,session TEXT NOT NULL,seq INTEGER NOT NULL,
 next_basic_at_ms INTEGER NOT NULL,next_wave_at_ms INTEGER NOT NULL,phase TEXT NOT NULL,
 cast_id TEXT NOT NULL,starts_at_ms INTEGER NOT NULL,impact_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,
 x REAL NOT NULL,y REAL NOT NULL,wave_damage INTEGER NOT NULL,channel INTEGER NOT NULL);`;
const contexts=new WeakMap(),views=new Map();
const bossId=channel=>`rune-v2-boss-c${channel}-1`;
const canonical=b=>!!b&&b.id===bossId(b.channel)&&b.area==='rune_v2'&&b.hp>0&&b.is_boss===0&&b.is_stone===0&&b.summoned===0&&b.loadlab_run_id==='';
const squared=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const real=`p.loadlab_run_id='' AND p.is_gm=0 AND p.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=p.id OR e.account_id=p.account_id) AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=p.account_id)`;
const realPlayer=`players.loadlab_run_id='' AND players.is_gm=0 AND players.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=players.id OR e.account_id=players.account_id) AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=players.account_id)`;
const bossGuard=`EXISTS(SELECT 1 FROM monsters b WHERE b.id=rune_v2_boss_state484.id AND b.spawn_round=rune_v2_boss_state484.spawn_round AND b.area='rune_v2' AND b.channel=rune_v2_boss_state484.channel AND b.hp>0 AND b.stun_until_ms<=? AND b.loadlab_run_id='' AND b.is_boss=0 AND b.is_stone=0 AND b.summoned=0)`;
const armorSql=p=>`(SELECT json_group_array(json_object('kind',i.kind,'power',i.power,'enchantments',i.enchantments,'equipped',i.equipped)) FROM (SELECT kind,power,enchantments,equipped FROM player_items WHERE player_id=${p}.id AND equipped=1 AND kind IN ('armor','helmet','shoes','necklace','costume') ORDER BY id) i)`;
const writerNow="CAST(unixepoch('subsec')*1000 AS INTEGER)";
const enabled=`json_extract((SELECT config_json FROM rune_v2_settings WHERE id=1),'$.enabled')=1`;
const waveEnabled=`COALESCE(json_extract((SELECT config_json FROM rune_v2_settings WHERE id=1),'$.monsters.boss.waveDamage'),20)>0`;

export function runeV2BossWave484(area,channel,monsters,now=Date.now()){
 if(area!=='rune_v2')return null;const value=views.get(Number(channel));
 if(!value||now>=value.expiresAtMs||!monsters?.some(m=>m.id===value.monsterId&&m.spawn_round===value.spawnRound&&m.channel===value.channel&&m.hp>0))return null;
 return value;
}
function expose(state){
 if(state.phase==='telegraph'||state.phase==='impact')views.set(state.channel,Object.freeze({monsterId:state.id,spawnRound:state.spawn_round,channel:state.channel,castId:state.cast_id,phase:state.phase,x:state.x,y:state.y,radius:180,startsAtMs:state.starts_at_ms,impactAtMs:state.impact_at_ms,expiresAtMs:state.expires_at_ms}));
 else views.delete(state.channel);
}
function forget(c,id,channel){c.states.delete(id);views.delete(channel);}
function context(db){let c=contexts.get(db);if(!c){c={session:randomUUID(),states:new Map(),running:null};contexts.set(db,c);}return c;}

export async function tickRuneV2Boss484(database,{settings,damage,cadence,publish,position,nowMs=Date.now(),clock=Date.now}={}){
 // Resident channels are sole owners. The realm main has no parallel boss job.
 if(!database.channel&&process.env.CORE_CHANNEL_PROCESSES==='1')return;
 const c=context(database);if(c.running)return c.running;
 c.running=run(database,c,{settings,damage,cadence,publish,position,nowMs,clock}).catch(error=>{for(const [id,state]of c.states)forget(c,id,state.channel);c.session=randomUUID();throw error;}).finally(()=>{c.running=null;});return c.running;
}

async function run(db,c,{settings,damage,cadence,publish,position,nowMs,clock}){
 const loop=db.worldLoop,channels=db.channel?[db.channel]:[1,2,3];
 for(const channel of channels){
  if(![1,2,3].includes(channel))continue;
  const id=bossId(channel),boss=loop?.enabled?loop.monster(id):await db.prepare('SELECT * FROM monsters WHERE id=?').bind(id).first();
  const configState=globalThis.__colRuneV2?.settings(),cfg=globalThis.__colRuneV2?.monster(boss),mapEnabled=configState?.config.enabled===true;
  if(!canonical(boss)||!cfg||!mapEnabled){views.delete(channel);c.states.delete(id);continue;}
  const basicMs=cadence(boss),waveDamage=cfg.waveDamage??20,cooldown=(cfg.waveCooldownSeconds??12)*1000;
  const candidates=[];
  if(loop?.enabled){for(const playerId of loop.activePlayers){const p=loop.player(playerId);if(p&&(!db.channel||!db.owners||db.owners.has(playerId))&&p.hp>0&&p.area==='rune_v2'&&p.channel===channel&&!p.arena_match_id&&p.last_seen>=Math.floor(nowMs/1000)-30&&squared(p,boss)<=370**2)candidates.push(p);}}
  else candidates.push(...(await db.prepare("SELECT id,x,y,hp,area,channel,arena_match_id,last_seen FROM players WHERE area='rune_v2' AND channel=? AND hp>0 AND last_seen>=? AND (x-?)*(x-?)+(y-?)*(y-?)<=? ORDER BY id LIMIT 25").bind(channel,Math.floor(nowMs/1000)-30,boss.x,boss.x,boss.y,boss.y,370**2).all()).results);
  candidates.sort((a,b)=>squared(a,boss)-squared(b,boss)||String(a.id).localeCompare(String(b.id)));
  if(candidates.length>25)candidates.length=25;
  let state=c.states.get(id);
  if(state?.spawn_round!==boss.spawn_round)state=null;
  if(!candidates.length){views.delete(channel);if(state?.phase==='telegraph')await cancel(db,c,state,nowMs,basicMs);continue;}
  if(!state){
   // A new owner/session cancels every previous in-flight cast. No damage is
   // replayed after restart; the first basic/wave gets its normal grace period.
   const result=await db.batch([db.prepare(`INSERT INTO rune_v2_boss_state484(id,spawn_round,session,seq,next_basic_at_ms,next_wave_at_ms,phase,cast_id,starts_at_ms,impact_at_ms,expires_at_ms,x,y,wave_damage,channel)
    SELECT id,spawn_round,?,0,${writerNow}+?,${writerNow}+?,'idle','',0,0,0,x,y,0,channel FROM monsters WHERE id=? AND area='rune_v2' AND channel=? AND hp>0 AND spawn_round=? AND loadlab_run_id=''
    ON CONFLICT(id) DO UPDATE SET spawn_round=excluded.spawn_round,session=excluded.session,seq=rune_v2_boss_state484.seq+1,next_basic_at_ms=excluded.next_basic_at_ms,next_wave_at_ms=excluded.next_wave_at_ms,phase='idle',cast_id='',starts_at_ms=0,impact_at_ms=0,expires_at_ms=0,x=excluded.x,y=excluded.y,wave_damage=0,channel=excluded.channel RETURNING *`).bind(c.session,basicMs,cooldown,id,channel,boss.spawn_round)]);
   state=result[0]?.results?.[0];if(!state)continue;c.states.set(id,state);expose(state);continue;
  }
  if(state.phase==='impact'&&nowMs>=state.expires_at_ms){views.delete(channel);state={...state,phase:'idle'};c.states.set(id,state);}
  if((boss.stun_until_ms??0)>nowMs||!waveDamage&&state.phase==='telegraph'){
   if(state.phase==='telegraph')await cancel(db,c,state,nowMs,basicMs);continue;
  }
  if(state.phase==='telegraph'&&nowMs<state.impact_at_ms)continue;
  if(state.phase==='telegraph'&&nowMs>state.expires_at_ms){await cancel(db,c,state,nowMs,basicMs);continue;}
  const impact=state.phase==='telegraph',startWave=!impact&&waveDamage>0&&nowMs>=state.next_wave_at_ms;
  if(!impact&&!startWave&&nowMs<state.next_basic_at_ms)continue;
  // Reads use the existing native position/HP overlay. The durable writer's
  // flush fence precedes these SQL radius/scope guards, so moving out dodges.
  const ids=candidates.map(p=>p.id);
  const rows=(await db.prepare(`SELECT p.*,(SELECT equipped FROM dungeon_wings WHERE player_id=p.id) AS core_wings,
   COALESCE((SELECT cycle FROM world_state WHERE id=1),1) AS world_cycle,
   ${armorSql('p')} AS armor_json484
   FROM players p WHERE p.id IN (SELECT value FROM json_each(?)) AND p.area='rune_v2' AND p.channel=? AND p.hp>0 AND ${real} ORDER BY p.id LIMIT 25`).bind(JSON.stringify(ids),channel).all()).results;
  rows.sort((a,b)=>squared(a,boss)-squared(b,boss)||String(a.id).localeCompare(String(b.id)));
  if(!rows.length){if(impact)await cancel(db,c,state,nowMs,basicMs);continue;}
  // Use the same trusted server-player/home projection as ordinary native
  // attacks. The writer rechecks that exact input before accepting a new cast.
  const projected485=runeV2ProjectedOrigin485(boss,rows[0],position);
  const projectionGuard485=`EXISTS(SELECT 1 FROM monsters home485 JOIN players p ON p.id=?
   WHERE home485.id=? AND home485.spawn_round=? AND home485.channel=? AND home485.area='rune_v2' AND home485.hp>0 AND home485.x=? AND home485.y=?
   AND COALESCE(home485.root_until_ms,0)=? AND COALESCE(home485.control_x,0)=? AND COALESCE(home485.control_y,0)=? AND (COALESCE(home485.root_until_ms,0)<=? OR home485.root_until_ms>${writerNow})
   AND p.hp>0 AND p.area='rune_v2' AND p.channel=home485.channel AND p.realtime_scope_version=? AND p.x=? AND p.y=? AND p.last_seen>=? AND ${real}
   AND (p.x-home485.x)*(p.x-home485.x)+(p.y-home485.y)*(p.y-home485.y)<=?)`;
  const projectionParams485=[rows[0].id,id,boss.spawn_round,channel,boss.x,boss.y,Number(boss.root_until_ms)||0,Number(boss.control_x)||0,Number(boss.control_y)||0,nowMs,rows[0].realtime_scope_version,rows[0].x,rows[0].y,Math.floor(nowMs/1000)-30,370**2];
  if(startWave){
   const cast=randomUUID();const guard=db.prepare(`UPDATE rune_v2_boss_state484 SET seq=seq+1,phase='telegraph',cast_id=?,starts_at_ms=${writerNow},impact_at_ms=${writerNow}+800,expires_at_ms=${writerNow}+1100,x=?,y=?,wave_damage=?,next_wave_at_ms=${writerNow}+?,next_basic_at_ms=${writerNow}+800+?
    WHERE id=? AND session=? AND seq=? AND spawn_round=? AND next_wave_at_ms<=? AND ${bossGuard} AND ${enabled} AND ${waveEnabled} AND (SELECT revision FROM rune_v2_settings WHERE id=1)=? AND ${projectionGuard485} RETURNING *`).bind(cast,projected485.x,projected485.y,waveDamage,cooldown,basicMs,id,c.session,state.seq,boss.spawn_round,nowMs,nowMs,configState.revision,...projectionParams485);
   const result=await db.guardedBatch(guard,[]);const saved=result.guard?.results?.[0];if(saved){c.states.set(id,saved);if(clock()>saved.impact_at_ms-500)await cancel(db,c,saved,clock(),basicMs);else expose(saved);}else forget(c,id,channel);continue;
  }
  const origin=impact?{x:state.x,y:state.y}:projected485,radius=impact?180:370,raw=impact?state.wave_damage:cfg.damage;
  const targets=(impact?rows:rows.slice(0,1)).map(p=>({p,d:damage(boss,p,JSON.parse(p.armor_json484||'[]'),raw,settings)}));
  const guard=db.prepare(`UPDATE rune_v2_boss_state484 SET seq=seq+1,phase=?,next_basic_at_ms=${writerNow}+?
    WHERE id=? AND session=? AND seq=? AND spawn_round=? AND ${impact?"phase='telegraph' AND impact_at_ms<=? AND expires_at_ms>=? AND impact_at_ms<="+writerNow+" AND expires_at_ms>="+writerNow+"":"phase IN ('idle','impact') AND next_basic_at_ms<=?"}
    AND ${bossGuard} AND ${enabled}${impact?' AND '+waveEnabled:' AND '+projectionGuard485} RETURNING *`).bind(impact?'impact':'idle',basicMs,id,c.session,state.seq,boss.spawn_round,nowMs,...(impact?[nowMs]:[]),nowMs,...(impact?[]:projectionParams485));
  const statements=targets.map(({p,d})=>db.prepare(`UPDATE players SET hp=MAX(0,hp-?),hp_revision=hp_revision+1,
   gems=CASE WHEN hp<=? THEN MAX(0,gems-CAST(gems/20 AS INTEGER)) ELSE gems END,
   respawn_at_ms=CASE WHEN hp<=? THEN ${writerNow}+2600 ELSE 0 END,last_monster_hit_at=${writerNow},last_seen=CAST(${writerNow}/1000 AS INTEGER),combat_lock_until_ms=MAX(combat_lock_until_ms,${writerNow}+5000)
   WHERE id=? AND hp>0 AND area='rune_v2' AND channel=? AND realtime_scope_version=? AND ${realPlayer}
   AND COALESCE(${armorSql('players')},'[]')=? AND last_seen>=? AND (x-?)*(x-?)+(y-?)*(y-?)<=?
   AND EXISTS(SELECT 1 FROM monsters b WHERE b.id=? AND b.spawn_round=? AND b.hp>0 AND b.area='rune_v2' AND b.channel=? AND b.stun_until_ms<=? AND b.loadlab_run_id='' AND (players.x-b.x)*(players.x-b.x)+(players.y-b.y)*(players.y-b.y)<=?)
   RETURNING id,hp,max_hp,hp_revision,respawn_at_ms,gems,last_monster_hit_at`).bind(d.amount,d.amount,d.amount,p.id,channel,p.realtime_scope_version,p.armor_json484||'[]',Math.floor(nowMs/1000)-30,origin.x,origin.x,origin.y,origin.y,radius**2,id,boss.spawn_round,channel,nowMs,370**2));
  const result=await db.guardedBatch(guard,statements),saved=result.guard?.results?.[0];if(!saved){forget(c,id,channel);continue;}
  c.states.set(id,saved);expose(saved);
  for(let i=0;i<targets.length;i++){const hit=result.results?.[i]?.results?.[0];if(!hit)continue;const{p,d}=targets[i];await publish({type:'player_hit',eventId:`pve:${p.id}:${hit.hp_revision}`,cycle:p.world_cycle,area:'rune_v2',channel,spawnRound:boss.spawn_round,nextHitAtMs:saved.next_basic_at_ms,ability:impact?'rune_wave484':'basic',targetId:p.id,monsterId:id,damage:d.amount,blocked:d.blocked,attackBlocked:d.attackBlocked===true,hp:hit.hp,maxHp:hit.max_hp,hpRevision:hit.hp_revision,respawnAtMs:hit.respawn_at_ms,dead:hit.hp<=0,serverAt:hit.last_monster_hit_at});}
 }
}
async function cancel(db,c,state,now,basicMs){
 const guard=db.prepare("UPDATE rune_v2_boss_state484 SET seq=seq+1,phase='idle',next_basic_at_ms=?,next_wave_at_ms=MAX(next_wave_at_ms,?) WHERE id=? AND session=? AND seq=? AND phase='telegraph' RETURNING *").bind(now+basicMs,now+basicMs,state.id,c.session,state.seq);
 const result=await db.guardedBatch(guard,[]),saved=result.guard?.results?.[0];if(saved){c.states.set(state.id,saved);expose(saved);}else forget(c,state.id,state.channel);
}

// Narrow adapter: client hints never enter this callback. Invalid projections
// fail closed to the persistent home; the native callback validates walkability.
export function runeV2ProjectedOrigin485(boss,player,position){
 const point=typeof position==='function'?position(boss,player):boss;
 return point?.ok!==false&&Number.isFinite(point?.x)&&Number.isFinite(point?.y)&&Math.hypot(point.x-boss.x,point.y-boss.y)<=460+1e-6?{x:point.x,y:point.y}:{x:boss.x,y:boss.y};
}

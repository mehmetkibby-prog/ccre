// Disposable load fixture only. No production imports, routes, guards or rules
// are replaced. Call before native owners start; never change SQL mid-combat.
import assert from 'node:assert/strict';

export const SHARED_BOSS_ID='dunya-bosu-1';
const channels=[1,2,3,4];
const readBoss=sql=>sql.prepare('SELECT * FROM monsters WHERE id=?').get(SHARED_BOSS_ID);
const nativeBoss=row=>row&&row.id===SHARED_BOSS_ID&&row.channel===0&&row.is_boss===1&&row.is_stone===0&&row.area==='sanctum'&&row.loadlab_run_id==='';

// The small native HTTP fixture marks its existing layout as current (24), so
// native-world-startup correctly skips the historical world seed. That fixture
// contains other shared bosses but omits this one. Recreate ONLY its canonical
// seed row, plus the native layout-8 area/channel migration, in this disposable
// fixture. Tests compare this declaration with the actual generated seed and
// respawn rules. Never turn an existing per-channel monster into a shared boss.
export const NATIVE_SHARED_BOSS_SEED=Object.freeze({name:'Çürümenin Kadimi',x:1200,y:690,hp:0,maxHp:18000,respawnSeconds:600,variant:'boss',area:'sanctum',channel:0});
function ensureNativeBoss(sql,nowMs){
 let boss=readBoss(sql);const created=boss===undefined;
 if(created){
  const seed=NATIVE_SHARED_BOSS_SEED;
  sql.prepare("INSERT INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,is_stone,despawn_at,spawn_round,area,channel,loadlab_run_id) VALUES(?,?,?,?,?,?,?, ?,1,0,0,0,?,0,'')").run(SHARED_BOSS_ID,seed.name,seed.x,seed.y,seed.hp,seed.maxHp,Math.floor(nowMs/1000)+seed.respawnSeconds,seed.variant,seed.area);
  boss=readBoss(sql);
 }
 assert(nativeBoss(boss),'fixture requires native shared dunya-bosu-1, not a per-channel substitute');
 return {boss,created};
}

export function seedSharedBoss(sql,actors,{terminal=false,nowMs=Date.now()}={}){
 assert(actors.length>=4&&actors.length<=100,'shared boss fixture needs 4–100 actors');
 assert.equal(new Set(actors.map(a=>a.id)).size,actors.length,'unique actors');
 assert.deepEqual([...new Set(actors.map(a=>a.channel))].sort(),channels,'all four real channels required');
 assert.equal(typeof terminal,'boolean');assert(Number.isSafeInteger(nowMs)&&nowMs>0);
 const settings=sql.prepare('SELECT channel_capacity,boss_hp,boss_respawn_seconds,boss_duration_seconds FROM game_settings WHERE id=1').get();
 assert(settings&&Number.isInteger(settings.channel_capacity)&&settings.channel_capacity>0);
 for(const channel of channels)assert(actors.filter(a=>a.channel===channel).length<=settings.channel_capacity,'do not bypass channel capacity');
 const player=sql.prepare('SELECT id,channel,loadlab_run_id FROM players WHERE id=?');
 for(const actor of actors){const row=player.get(actor.id);assert(row&&row.channel===actor.channel&&row.loadlab_run_id==='','fixture actors must use ordinary ownership and admission');}
 const {boss,created}=ensureNativeBoss(sql,nowMs);
 assert(Number.isFinite(boss.x)&&Number.isFinite(boss.y));
 const lastDefeat=sql.prepare('SELECT COALESCE(MAX(boss_round),0) n FROM boss_defeats').get().n;
 const lastContribution=sql.prepare('SELECT COALESCE(MAX(boss_round),0) n FROM boss_participants').get().n;
 const firstRound=Math.max(boss.spawn_round,lastDefeat,lastContribution)+1;
 assert(Number.isSafeInteger(firstRound)&&firstRound>0);
 // Separate sustained contention from repeated terminal/reward pressure. These
 // deliberately synthetic HP/respawn values are included in the final report.
 const hp=terminal?100000:1000000000,respawnSeconds=terminal?5:settings.boss_respawn_seconds,durationSeconds=Math.max(600,settings.boss_duration_seconds);
 sql.prepare('UPDATE game_settings SET boss_hp=?,boss_respawn_seconds=?,boss_duration_seconds=? WHERE id=1').run(hp,respawnSeconds,durationSeconds);
 sql.prepare('UPDATE monsters SET hp=?,max_hp=?,spawn_round=?,respawn_at=0,despawn_at=?,last_regen_at_ms=? WHERE id=? AND channel=0 AND is_boss=1').run(hp,hp,firstRound,Math.floor(nowMs/1000)+durationSeconds,nowMs,SHARED_BOSS_ID);
 const position=sql.prepare("UPDATE players SET area='sanctum',x=?,y=?,gems=100000,essence=100000,potions=100,stat_hp=1000000,hp=1001000,max_hp=1001000 WHERE id=? AND channel=?");
 for(const [i,actor]of actors.entries()){
  const angle=2*Math.PI*i/actors.length;
  assert.equal(position.run(boss.x+Math.cos(angle)*60,boss.y+Math.sin(angle)*60,actor.id,actor.channel).changes,1);
  actor.zone='shared_boss';actor.targetId=SHARED_BOSS_ID;
 }
 return {id:SHARED_BOSS_ID,area:'sanctum',channel:0,terminal,firstRound,hp,respawnSeconds,durationSeconds,players:actors.length,
  channels:Object.fromEntries(channels.map(c=>[c,actors.filter(a=>a.channel===c).length])),
  originalSettings:{bossHp:settings.boss_hp,respawnSeconds:settings.boss_respawn_seconds,durationSeconds:settings.boss_duration_seconds},
  synthetic:true,nativeOwnership:true,changedRules:false,createdFromNativeSeed:created,
  scenario:terminal?'Repeated native shared-boss death and reward commits; fixture HP and respawn cadence differ from live.':'Sustained native shared-boss contention; high fixture HP intentionally prevents terminal rewards.'};
}

// Read only, after bots have stopped and ordinary checkpoint/reward work has
// drained. Caller retains this report even when its checks fail. Include warmup
// deaths: firstRound is captured before play, not at measurement start.
export function reportSharedBoss(sql,actors,fixture,{acquiresByChannel=null}={}){
 assert.equal(fixture.id,SHARED_BOSS_ID);
 const ids=new Set(actors.map(a=>a.id)),boss=readBoss(sql),checks=[];
 const check=(name,passed,detail)=>checks.push({name,passed:Boolean(passed),...(detail===undefined?{}:{detail})});
 check('native_shared_boss_scope',nativeBoss(boss));
 const defeats=sql.prepare('SELECT boss_round,defeated_at FROM boss_defeats WHERE boss_round>=? ORDER BY boss_round').all(fixture.firstRound);
 const claims=sql.prepare('SELECT boss_round,player_id,claim_token FROM boss_reward_claims WHERE boss_round>=? ORDER BY boss_round,player_id').all(fixture.firstRound);
 const participants=sql.prepare('SELECT boss_round,player_id,hit_count,total_damage FROM boss_participants WHERE boss_round>=? AND total_damage>0 ORDER BY boss_round,player_id').all(fixture.firstRound);
 const xpClaims=sql.prepare('SELECT spawn_round,player_id FROM monster_xp_claims WHERE monster_id=? AND spawn_round>=? ORDER BY spawn_round,player_id').all(SHARED_BOSS_ID,fixture.firstRound);
 const terminalReceipts=[],invalidReceipts=[];
 for(const row of sql.prepare("SELECT operation_id,response FROM kernel511_channel_receipts WHERE operation_id LIKE 'shared:%'").all()){
  let response;try{response=JSON.parse(row.response);}catch{invalidReceipts.push(row.operation_id);continue;}
  for(const hit of response.result?.result?.body?.hits??[]){
   if(hit.id===SHARED_BOSS_ID&&hit.killed&&hit.spawnRound>=fixture.firstRound)terminalReceipts.push({operationId:row.operation_id,round:hit.spawnRound});
  }
 }
 const rounds=new Set(defeats.map(d=>d.boss_round));
 check('defeat_round_unique',rounds.size===defeats.length);
 check('claim_per_actor_round_unique',new Set(claims.map(c=>c.boss_round+':'+c.player_id)).size===claims.length);
 check('claims_belong_to_fixture_participants',claims.every(c=>ids.has(c.player_id)&&rounds.has(c.boss_round)));
 check('shared_receipt_json_valid',invalidReceipts.length===0,invalidReceipts);
 check('one_terminal_receipt_per_defeat',defeats.every(d=>terminalReceipts.filter(r=>r.round===d.boss_round).length===1)&&terminalReceipts.every(r=>rounds.has(r.round)),{defeats:defeats.length,terminalReceipts:terminalReceipts.length});
 check('no_unclaimed_defeated_contributions',!participants.some(p=>rounds.has(p.boss_round)));
 if(acquiresByChannel)check('shared_bridge_used_on_all_four_channels',channels.every(c=>Number(acquiresByChannel[c])>0),acquiresByChannel);
 if(fixture.terminal){
  check('native_terminal_path_exercised',defeats.length>0);
  check('native_rewards_exercised_each_death',defeats.every(d=>claims.some(c=>c.boss_round===d.boss_round)));
  check('all_actors_received_native_boss_claim',actors.every(a=>claims.some(c=>c.player_id===a.id)));
  const xp=new Set(xpClaims.map(c=>c.spawn_round+':'+c.player_id));
  check('boss_claims_have_durable_xp_claims',claims.every(c=>xp.has(c.boss_round+':'+c.player_id)));
 }else{
  check('sustained_boss_remained_alive',boss?.hp>0&&boss.hp<fixture.hp&&defeats.length===0);
  check('all_actors_have_durable_damage_checkpoint',actors.every(a=>participants.some(p=>p.player_id===a.id&&p.hit_count>0&&p.total_damage>0)));
 }
 return {fixture,passed:checks.every(c=>c.passed),checks,boss:boss?{id:boss.id,channel:boss.channel,hp:boss.hp,maxHp:boss.max_hp,spawnRound:boss.spawn_round,respawnAt:boss.respawn_at}:null,defeats,claims,xpClaims,participants,terminalReceipts,
  scope:'Native boss SQL state after gameplay. Duplicate/absent claims and terminal receipts fail; this is not a substitute for delayed-ACK/crash recovery tests.'};
}

export function verifySharedBoss(sql,actors,fixture,options){
 const report=reportSharedBoss(sql,actors,fixture,options);
 assert(report.passed,JSON.stringify(report.checks.filter(c=>!c.passed)));
 return report;
}

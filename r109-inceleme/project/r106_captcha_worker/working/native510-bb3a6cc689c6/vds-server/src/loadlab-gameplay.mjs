// Installed only with the exact-version load laboratory add-on. The control
// layer populates this immutable-ID registry before accepting any request.
// No SQL, timers, environment overrides or permissions are created here.
const ACTIONS = new Set(['join','heartbeat','move','attack','pvp_attack','respawn','guardian_dash','cast_support456','claim_rewards']);
const registry = () => {
  const value=globalThis.__colLoadLab;
  if (!value || !['accountRun','playerRun','monsterRun','playerTeam','active'].every(k=>typeof value[k]==='function'))
    throw Object.assign(new Error('loadlab_registry_unavailable'),{code:'loadlab_registry_unavailable',status:503});
  return value;
};
const key = value => typeof value==='string' ? value : value?.id;
const localDenials = new WeakSet();
const denied = code => {const error=Object.assign(new Error(code),{code,status:403});localDenials.add(error);return error;};
// Only errors minted by the pure isolation helpers become an ordinary rejected
// response. Writer/IPC/durability exceptions cannot enter this branch.
export function colLabFailureResponse(error){
 if(!error||!localDenials.has(error))return null;
 return Response.json({code:error.code,error:'Test işlemi bu oturumda kullanılamaz.'},{status:error.status});
}
export const colLabIsPlayer = id => Boolean(registry().playerRun(key(id)));
export const colLabIsMonster = id => Boolean(registry().monsterRun(key(id)));
export const colLabPlayerRun = id => registry().playerRun(key(id));
export function colLabSamePlayerCohort(leftId,rightId) {
  const state=registry(),left=state.playerRun(key(leftId)),right=state.playerRun(key(rightId));
  return left===right && (!left || state.active(left));
}
export function colLabMayAffectPlayer(attacker,target) {
  const state=registry(),a=key(attacker),b=key(target),left=state.playerRun(a),right=state.playerRun(b);
  if(left!==right)return false;
  if(!left)return true;
  const attackTeam=state.playerTeam(a),targetTeam=state.playerTeam(b);
  return state.active(left) && attackTeam>0 && targetTeam>0 && attackTeam!==targetTeam;
}
export function colLabMayAffectMonster(player,monster) {
  const state=registry(),left=state.playerRun(key(player)),right=state.monsterRun(key(monster));
  if(right&&monster?.is_boss===1&&colLabBossMonster(monster.spawn_round)?.id!==key(monster))return false;
  return left===right && (!left || state.active(left));
}
export function colLabAssertAction(auth,payload) {
  const state=registry(),run=state.accountRun(auth.account.id),playerRun=auth.player?state.playerRun(auth.player.id):'';
  if(!run&&!playerRun)return;
  if(!run || run!==playerRun || !state.active(run))throw denied('loadlab_lease_inactive');
  if(!ACTIONS.has(payload.action))throw denied('loadlab_action_forbidden');
  if(payload.action==='claim_rewards'&&(!Array.isArray(payload.rewardTargets)||payload.rewardTargets.length>10||payload.rewardTargets.some(t=>!t||state.monsterRun(t.id)!==run)))throw denied('loadlab_reward_target_forbidden');
  // The admitted cohort is seeded in normal world maps; production matchmaker,
  // guild arena and dungeon APIs are outside these four benchmark scenarios.
  if(auth.playerAccess?.area==='arena'||auth.playerAccess?.area?.startsWith('guild_'))throw denied('loadlab_scope_forbidden');
}
export function colLabAssertPlans(player,players,monsters) {
  if(players.some(target=>!colLabMayAffectPlayer(player,target))||monsters.some(target=>!colLabMayAffectMonster(player,target)))
    throw denied('loadlab_mixed_cohort');
}

export function colLabCanSeeMonster(viewer,monster) {
  const state=registry(),run=state.monsterRun(key(monster));
  return !run || run===state.playerRun(key(viewer))&&state.active(run);
}
export function colLabCanSeeCombat(viewer,event) {
  const state=registry(),run=state.playerRun(event.player_id)||state.monsterRun(event.target_id);
  return !run || run===state.playerRun(key(viewer))&&state.active(run);
}
export function colLabBossMonster(round) {
  const state=registry();
  if(typeof state.bossMonster!=='function')throw denied('loadlab_boss_registry_unavailable');
  const value=state.bossMonster(round);
  if(!value)return null;
  if(!value.id||!state.monsterRun(value.id))throw denied('loadlab_boss_registry_invalid');
  return value;
}
export function colLabEventAudience(event,channel,area) {
  // Movement and player HP remain visible: the user can observe BOT_ avatars.
  if(event.type==='move'||event.type==='player_state'||event.type==='force_disconnect')return null;
  const state=registry(),runs=new Set();
  const ids=[event.playerId,event.actorId,event.attackerId,event.targetId,event.monsterId,...(event.targets??[]).map(h=>h.id??h.targetId),...(event.previews??[]).map(h=>h.targetId??h.id),...(event.hits??[]).map(h=>h.id??h.targetId),...(event.states??[]).map(h=>h.id)];
  for(const id of ids){if(typeof id!=='string')continue;const run=state.playerRun(id)||state.monsterRun(id);if(run)runs.add(run);}
  if(!runs.size)return null;
  if(runs.size!==1)throw denied('loadlab_event_mixed_cohort');
  const [run]=runs;
  if(!state.active(run))return [];
  if(typeof state.playerIds!=='function')throw denied('loadlab_audience_registry_unavailable');
  const recipients=state.playerIds(run,channel,area);
  if(!Array.isArray(recipients)||recipients.length>75||new Set(recipients).size!==recipients.length||recipients.some(id=>state.playerRun(id)!==run))throw denied('loadlab_audience_registry_invalid');
  return recipients;
}
// This metadata is produced only inside trusted native builders. A writer must
// refuse it unless the exact addon + phase validator is installed. It is not a
// permission to commit economic mutations and is not accepted from HTTP input.
export function colLabTagReward(statements,target,phase,expectedRun) {
  const id=target.monster_id??target.id,round=target.spawn_round;
  const state=registry(),run=state.monsterRun(id);
  if(expectedRun&&run!==expectedRun)throw denied('loadlab_reward_owner_retired');
  if(!run)return statements;
  if(!state.active(run))throw denied('loadlab_reward_lease_inactive');
  if(!['inline','deferred'].includes(phase)||!Number.isSafeInteger(round)||round<0||statements.length>512)throw denied('loadlab_reward_phase_invalid');
  const group=Object.freeze({version:1,runId:run,monsterId:id,spawnRound:round,phase,count:statements.length});
  for(let index=0;index<statements.length;index++){
    if(!statements[index]||typeof statements[index].sql!=='string'||statements[index].loadlabReward)throw denied('loadlab_reward_statement_invalid');
    statements[index].loadlabReward=Object.freeze({...group,index});
  }
  return statements;
}
export function colLabRewardDatabase(database,pending) {
  const run=registry().monsterRun(pending.monster_id);
  if(!run)return database;
  return new Proxy(database,{get(target,property){
    if(property==='batch')return (statements,...args)=>target.batch(colLabTagReward(statements,pending,'deferred',run),...args);
    const value=Reflect.get(target,property,target);
    return typeof value==='function'?value.bind(target):value;
  }});
}
export function colLabTagWarReward(statements,player,victim) {
  const state=registry(),run=state.playerRun(key(player));
  if(!run)return statements;
  if(!colLabMayAffectPlayer(player,victim))throw denied('loadlab_war_reward_cohort');
  const revision=victim.hp_revision+1;
  if(!Number.isSafeInteger(revision)||statements.length>5)throw denied('loadlab_war_reward_shape');
  for(let index=0;index<statements.length;index++){
    if(statements[index].loadlabReward)throw denied('loadlab_war_reward_duplicate');
    statements[index].loadlabReward=Object.freeze({version:1,runId:run,phase:'pvp',actorId:key(player),victimId:key(victim),victimHpRevision:revision,count:statements.length,index});
  }
  return statements;
}
export function colLabMonsterActive(monster) {
  const state=registry(),run=state.monsterRun(key(monster));
  return !run||state.active(run);
}
export function colLabMonsterSource(id) {
  const state=registry();
  if(!state.monsterRun(id))return id;
  if(typeof state.monsterSource!=='function')throw denied('loadlab_source_registry_unavailable');
  const source=state.monsterSource(id);
  if(typeof source!=='string'||!source||state.monsterRun(source))throw denied('loadlab_source_registry_invalid');
  return source;
}
export function colLabValidateRoomAudience(room,event) {
  const expected=colLabEventAudience(event,room.channel,room.area),proof=event.__colLabAudience;
  if(expected===null){if(proof!==undefined)throw denied('loadlab_unexpected_room_audience');return null;}
  if(!expected.length)return new Set();
  const state=registry();
  if(!proof||typeof proof.runId!=='string'||!Array.isArray(proof.playerIds)||proof.playerIds.length<1||proof.playerIds.length>75)throw denied('loadlab_room_audience_missing');
  const allowed=new Set(expected),audience=new Set(proof.playerIds);
  if(audience.size!==proof.playerIds.length||[...audience].some(id=>!allowed.has(id)||state.playerRun(id)!==proof.runId)||!state.active(proof.runId))throw denied('loadlab_room_audience_invalid');
  // Authoritative player HP is applied before fanout. A signed lab combat
  // envelope may therefore reference only its own immutable cohort as well.
  const playerRefs=[event.playerId,event.actorId,event.attackerId];
  const targetRefs=[event.targetId,event.monsterId,...(event.targets??[]).map(h=>h.id??h.targetId),...(event.hits??[]).map(h=>h.id??h.targetId),...(event.states??[]).map(h=>h.id),...(event.previews??[]).map(h=>h.id??h.targetId)];
  if(playerRefs.some(id=>id&&state.playerRun(id)!==proof.runId)||targetRefs.some(id=>id&&(state.monsterRun(id)||state.playerRun(id))!==proof.runId))throw denied('loadlab_room_event_mixed_cohort');
  return audience;
}

// Appended to the existing loadlab-gameplay module by transform.mjs.
// The 1-second interval is a test workload setting, not a resurrection path.
// Existing native death writes, due scans, spawn rounds and writer ACKs remain.
export function colLabNormalRespawnSecondsR10(monster, nativeSeconds) {
  if (monster?.area !== 'forest' || monster.is_boss !== 0 || monster.is_stone !== 0 || monster.summoned !== 0) return nativeSeconds;
  const state = registry(), run = state.monsterRun(key(monster));
  // Tombstoned, expired, stopped or unregistered entities never get this rule.
  if (!run || !state.active(run) || typeof state.targetSupplyProfile !== 'function' ||
      state.targetSupplyProfile(run) !== 'r10-clientlike-900-1000-45000-normal-respawn1s-v1') return nativeSeconds;
  const source = typeof state.monsterSource === 'function' ? state.monsterSource(key(monster)) : '';
  if (!/^(golge|curuk|yutan)-/.test(source) || state.monsterRun(source)) return nativeSeconds;
  return 1;
}

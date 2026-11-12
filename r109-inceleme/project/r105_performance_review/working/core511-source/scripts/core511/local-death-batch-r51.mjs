const areas=new Set(['forest','frozen','black','ancient','sanctum']);
// The same post-ACK R32 predicates, with common lease/actor checks once per
// synchronous batch. No DB work, event send or ACK is performed here. A pending
// checkpoint is joined before reading any fence; no await follows validation.
export async function publishLocalDeathBatchR51(loop,{deaths,result,lease,kernel,barrier,id,epoch}){
 if(!Array.isArray(result.monsters)||!deaths.length)return 0;
 const byId=new Map();for(const row of result.monsters){if(byId.has(row.id)&&JSON.stringify(byId.get(row.id))!==JSON.stringify(row))return 0;byId.set(row.id,row);}
 function eligible(firstOnly=false){
 if(result.removed?.length||result.moves?.length||result.mistLoot||result.bossParticipants?.length!==0||!barrier||kernel.players.get(id)?.epoch!==epoch||lease.state!=='held'||lease.owner!==loop.incarnation||!loop.lanes.tokens.has(lease)||!lease.keys.every(key=>loop.lanes.owns(lease,key)))return null;
 const player=kernel.state.read('players',id),checkedActors=new Map(),monsters=[],selected=new Map();
 const actorValid=a=>{
  const previous=checkedActors.get(a.id);if(previous&&previous.p===a.p&&previous.owner===a.owner&&previous.epoch===a.epoch)return true;
  const valid=kernel.players.get(a.id)===a.p&&kernel.state.owners.get(a.id)===a.owner&&a.owner?.epoch===a.epoch&&a.p.epoch===a.epoch&&a.owner.state==='active'&&a.p.barrier===barrier&&a.p.accepting&&!a.p.quiescer&&!a.p.suspended&&!a.p.externalHold;
  if(valid)checkedActors.set(a.id,a);return valid;
 };
 for(const death of deaths){
  const {before,target,scope,actors}=death,m=byId.get(target.id);
  if(selected.has(target.id)||!before||!Object.isFrozen(before)||loop.memory.view?.monster(target.id)!==before||before.id!==target.id||before.spawn_round!==target.spawnRound||!(before.hp>0)||before.is_boss!==0||before.is_stone!==0||!areas.has(before.area)||before.channel!==kernel.state.channel||before.area!==scope.area||before.channel!==scope.channel||!(player?.hp>0)||player.area!==scope.area||player.channel!==scope.channel||player.cycle!==scope.cycle||player.realtime_scope_version!==scope.version||player.arena_match_id||player.instance_id||player.instanceId||m?.id!==before.id||m.hp!==0||m.spawn_round!==before.spawn_round||m.channel!==before.channel||m.area!==before.area||m.is_boss!==0||m.is_stone!==0||m.max_hp!==before.max_hp||!actors.every(actorValid))continue;
  selected.set(m.id,m.spawn_round);monsters.push(m);if(firstOnly)break;
 }
 return monsters.length?{monsters,selected}:null;
 }
 // Preserve the single-life contract: invalid candidates never join an unrelated
 // pending checkpoint. After a wait, re-read every owner/life before promotion.
 if(loop.combatCheckpoints.pending){if(!eligible(true))return 0;while(loop.combatCheckpoints.pending)await loop.combatCheckpoints.pending;}
 const accepted=eligible();if(!accepted)return 0;const {monsters,selected}=accepted;
 loop.lanes.assert(lease);
 // R50 promoted one life at a time: preserve death order, then the original
 // participant order within each life, even when the writer returns mixed rows.
 const groups=new Map(monsters.map(m=>[m.id,[]]));
 for(const p of result.participants??[])if(selected.has(p.monster_id)&&selected.get(p.monster_id)===p.spawn_round)groups.get(p.monster_id).push(p);
 const participants=[];for(const m of monsters)for(const p of groups.get(m.id))participants.push(p);
 const committed={...result,monsters,participants};
 loop.memory.committed(committed);loop.combatCheckpoints.committed(committed);
 for(const monster of monsters)loop.memory.view.setMonster(monster);
 return monsters.length;
}

import {demand} from './contract.mjs';
import {rewardAsyncReplyR54} from './r54-options.mjs';
import {previewDeathR54} from './reward-reply-r54.mjs';
const d2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const same=(a,b)=>a.area===b.area&&a.channel===b.channel&&a.arena_match_id===b.arena_match_id;
const resultRow=p=>({id:p.id,hp:p.hp,hp_revision:p.hp_revision,respawn_at_ms:p.respawn_at_ms,gems:p.gems});

// Both primary-target routes execute the same original mixed cast in ONE
// private overlay. A late terminal/busy target discards all earlier changes.
export class MixedCombat {
 constructor({attack,pvp,frameFor,party,dragon,blocked,cycle}){
  for(const fn of [frameFor,party,dragon,blocked,cycle])demand(typeof fn==='function','mixed_dependencies');
  Object.assign(this,{attack,pvp,frameFor,party,dragon,blocked,cycle});
  const a=this.bind(attack),b=this.bind(pvp);attack.mixedPlayers=a.prepareMixedPlayers473;attack.mixedMonsters=a.selectMixedMonsters473;attack.mixedAttack=a.runMixedBlack473;pvp.nativeMixed=b;
  pvp.mixedAttack=(...args)=>b.runMixedBlack473(...args);
  pvp.mixedApplied=result=>attack.committed(result);
  pvp.mixedChanges=t=>Object.fromEntries(['monsters','engagements','participants','bossParticipants'].map(k=>[k,t[k]?(k==='engagements'?[...t[k]]:[...t[k].values()]):[]]));
  pvp.rememberProposal=(proposal,nowMs)=>attack.remember(proposal,nowMs);
  pvp.commitProposal=(proposal,options)=>attack.commit(proposal,options);
 }
 bind(owner){
  const act=this.attack,init=()=>{for(const key of ['monsters','engagements','participants','bossParticipants'])owner.t[key]??=new Map();};
  const inOverlay=fn=>{init();const previous=act.t;act.t=owner.t;try{return fn();}finally{act.t=previous;}};
  const rules=owner.rules.mixedMemory({
   monsters:p=>[...act.view.monsters.values()].filter(m=>m.hp>0&&m.area===p.area&&(m.channel===0||m.channel===p.channel)).map(m=>owner.t.monsters?.get(m.id)??m),
   recentAttacks:(id,since)=>[...act.combatEvents,...owner.t.combatEvents].filter(e=>e.player_id===id&&e.created_at>=since).map(e=>({target_id:e.target_id})),
   players:(p,center,now)=>this.players(owner,p,center,now),monsterPlan:p=>act.hitPlan(p),
   commit:c=>inOverlay(()=>this.commit(owner,c)),
   retaliate:(id,settings,now)=>inOverlay(()=>{const r=act.retaliate(id,settings,now,act.overlay,{random:owner.t.random,publish:(...args)=>owner.t.events.push(args)});if(r?.durable)owner.requireDurable({reason:'mixed_retaliation_death',players:[...new Set([id,...owner.t.mixedPlayers??[]])],targets:[...new Set([...owner.t.mixedMonsters??[],r.monsterId])]});return r;}),
   arm:(...args)=>inOverlay(()=>act.arm(...args)),restoreLife:(...args)=>inOverlay(()=>act.restoreLife(...args)),
   clearDeadEncounter:(id,targets)=>inOverlay(()=>{const row=act.overlay.engagements.get(id);if(!row||!targets.some(t=>t.id===row.monster_id))return;const others=JSON.parse(row.attackers489||'{}');if(!Object.entries(others).some(([key,value])=>key!==row.monster_id&&act.monster(key)?.hp>0&&act.monster(key).spawn_round===value.spawn_round))act.overlay.setEngagement(id,null);}),
   nonlethalGems:row=>demand(!(row.pvp_gems_lost479>0),'mixed_gems_requires_writer'),requiresWriter:()=>{throw Error('mixed_terminal_invariant');}
  });
  return {...rules,runMixedBlack473:context=>{owner.t.mixedPlayers=[context.player.id,...context.playerPlans473.map(p=>p.target.id)];owner.t.mixedMonsters=context.targets.map(m=>m.id);return rules.runMixedBlack473(context);}};
 }
 players(owner,p,center,now){
  const actor=owner.player(p.id),group=this.party(p.id);
  const rows=[...this.attack.view.players.values()].map(row=>owner.player(row.id)).filter(v=>v.id!==p.id&&v.hp>0&&v.last_seen>=Math.floor(now/1000)-30&&!(group&&group===this.party(v.id))&&same(v,p)&&v.arena_match_id===''&&v.loadlab_run_id===actor.loadlab_run_id&&(!v.loadlab_run_id||v.loadlab_team>0&&v.loadlab_team!==actor.loadlab_team)&&d2(v,center)<=90000).sort((a,b)=>d2(a,center)-d2(b,center)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,29);
  for(const v of rows)if(this.blocked(v.id))owner.defer();
  return rows.map(p=>({...this.frameFor(p.id),...p,defender_dragon:Number(Boolean(this.dragon(p.id)))}));
 }
 commit(owner,{player,center,playerPlans,monsterPlans,cooldownAtMs,cooldownMs,nowMs}){
  const a=this.attack,p=a.player(player.id),reject=()=>({accepted:false,guard:{results:[]},playerRows:[],monsterResults:new Map(),plans:monsterPlans});
  const ids=[player.id,...playerPlans.map(p=>p.target.id)],mids=monsterPlans.map(p=>p.target.id);owner.t.mixedPlayers=ids;owner.t.mixedMonsters=mids;
  // With more than one nonlethal monster, native plans have one HP statement
  // per target, an optional boss participant, and five shared statements.
  if(monsterPlans.length>1&&5+monsterPlans.length+monsterPlans.filter(p=>p.target.is_boss).length>512)throw Object.assign(Error('mixed_cast_plan_limit'),{code:'mixed_cast_plan_limit'});
  // Native guard predicate, with all operands resident and no concurrent tick
  // between validation and applying the overlay. Root expiry uses the same
  // operation clock; the writer rechecks it against wall time before COMMIT.
  const guard={playerId:p.id,player,attackColumn:'attack_three_at',cooldownAtMs,cooldownMs,cooldownGraceMs:0,nowMs};
  if(!a.reservePreview(guard)||p.arena_match_id!==''||p.x!==player.x||p.y!==player.y||this.cycle()!==player.world_cycle)return reject();
  if(center.kind==='player'){const primary=a.player(center.id);if(!primary||primary.x!==center.x||primary.y!==center.y||d2(p,primary)>((p.role==='avci'?500:470)+95)**2)return reject();}
  else if(d2(p,{x:center.rangeX??center.x,y:center.rangeY??center.y})>((p.role==='avci'?500:470)+(center.rangeLeeway??100))**2)return reject();
  for(const id of ids)if(this.blocked(id))owner.defer();
  for(const {target:t}of playerPlans){const v=a.player(t.id),group=this.party(p.id);if(!v||v.id===p.id||v.hp<=0||v.hp!==t.hp||v.hp_revision!==t.hp_revision||v.realtime_scope_version!==t.realtime_scope_version||!same(v,p)||v.loadlab_run_id!==p.loadlab_run_id||p.loadlab_run_id&&!(p.loadlab_team>0&&v.loadlab_team>0&&v.loadlab_team!==p.loadlab_team)||group&&group===this.party(v.id)||Math.max(v.last_seen,Math.trunc(v.movement_checked_at_ms/1000),Math.trunc(v.last_monster_hit_at/1000))<Math.floor(nowMs/1000)-30||d2(v,center)>90000)return reject();}
  for(const {target:t}of monsterPlans){const v=a.monster(t.id);if(!v||v.hp<=0||v.hp!==t.hp||v.spawn_round!==t.spawn_round||v.area!==p.area||v.channel!==t.channel||![0,p.channel].includes(v.channel)||v.loadlab_run_id!==p.loadlab_run_id||v.x!==t.x||v.y!==t.y||(v.root_until_ms||0)!==(t.root_until_ms||0)||(v.control_x??null)!==(t.control_x??null)||(v.control_y??null)!==(t.control_y??null))return reject();if(a.blocked(v)){if(owner===a&&!playerPlans.length)a.deferMonsterResourcesR61(monsterPlans);owner.defer();}demand(a.assertMonsterOwner(v)===true,'mixed_monster_owner_fenced');}
  if(playerPlans.some(({target,totalDamage})=>target.hp<=totalDamage)||monsterPlans.some(({target,rolled})=>target.hp<=rolled||target.is_stone&&Math.max(target.wave_stage,target.hp-rolled<=target.max_hp/2?2:1)>target.wave_stage)){
   const boundary={reason:'mixed_terminal',players:ids,targets:mids};
   if(rewardAsyncReplyR54&&owner===a&&!playerPlans.length){const reply=previewDeathR54(monsterPlans,id=>a.monster(id),owner.t.contextR54,a.reservePreview(guard),nowMs);if(reply)boundary.replyR54=reply;}
   owner.requireDurable(boundary);
  }
  // Native committer inserts the PvP rows first, then per-monster events.
  const playerRows=[];for(const plan of playerPlans){const v=a.player(plan.target.id),next={...v,hp:v.hp-plan.totalDamage,hp_revision:v.hp_revision+1,respawn_at_ms:0,last_monster_hit_at:nowMs,combat_lock_until_ms:Math.max(v.combat_lock_until_ms,nowMs+5000)};a.setPlayer(next);playerRows.push(resultRow(next));owner.t.combatEvents.push({player_id:p.id,target_id:v.id,role:p.role,ability:2,created_at:nowMs});}
  const committed=a.commitHits(guard,monsterPlans);demand(committed.guard.results.length===1,'mixed_overlay_guard_changed');
  const monsterResults=new Map();let offset=0;
  for(const plan of monsterPlans){const rows=committed.results.slice(offset,offset+plan.hitStatements.length);offset+=plan.hitStatements.length;monsterResults.set(plan.target.id,rows);}
  return {accepted:true,guard:committed.guard,playerRows,finalPlayerRows:playerRows,monsterResults,plans:monsterPlans};
 }
}

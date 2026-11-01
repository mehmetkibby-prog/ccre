import {isAdventureArea} from '../adventure-maps.mjs';
import {optimizeR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-features.mjs";
import {entriesR53 as nativeEntries} from '../engagement-memory-r53.mjs';
import {colLabSamePlayerCohort,colLabMayAffectMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
const EVENT_NEARBY_AREAS444=new Set(['forest','frozen','sanctum','dragon','sinsi','black','ancient','rune','rune_v2','event']);
const entries=new WeakMap();
export function pveEntries489(row){if(!row)return [];if(!Object.isFrozen(row))return nativeEntries(row);let value=entries.get(row);if(!value){value=nativeEntries(row);entries.set(row,value);}return value;}
export class NativeAggroRules {
nearby(playerId,nowMs=this.now(),multiple489=false){
  const p=this.player(playerId);if(!p||p.hp<=0||(!EVENT_NEARBY_AREAS444.has(p.area)&&!isAdventureArea(p.area)))return null;
  if(!multiple489&&this.engagements.has(playerId))return null;const known489=new Map(pveEntries489(this.engagements.get(playerId)).map(e=>[e.monster_id,e.spawn_round]));
  const eventArea444=p.area==='event',candidates=[],channels=this.candidateScopes(p);
  // Combat memory changes health/timestamps, never area or channel. Select the
  // committed scope first so each player only merges relevant monster rows.
  for(const ids of [channels?.get(0),p.channel===0?null:channels?.get(p.channel)]){
   if(!ids)continue;
   for(const id of ids){
    const base=this.monsters.get(id);if(!base||/^rune-v2-boss-c[1-4]-1$/.test(base.id)||base.is_stone||base.area!==p.area||base.channel!==0&&base.channel!==p.channel)continue;
    if(isAdventureArea(base.area)&&this.adventureProfile?.(base)?.stationary)continue;
    if(optimizeR18&&multiple489&&known489.get(id)===base.spawn_round)continue;
    const distance_sq=(base.x-p.x)**2+(base.y-p.y)**2;
    const range=isAdventureArea(base.area)?(this.adventureProfile?.(base)?.range??320):eventArea444?320:(/^rune-v2-boss-c[1-4]-1$/.test(base.id)||base.id==='frozen-boss-1'||base.id==='stone-boss-black-c1'||base.id==='stone-boss-black-c2'||base.id==='stone-boss-black-c3'||base.id==='stone-boss-black-c4')?370:base.id.startsWith('frozen-water-c')?330:base.is_boss||base.id==='dragon-world-1'?320:base.id.startsWith('yutan')?300:230;
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
}

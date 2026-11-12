import {isAdventureArea} from '../adventure-maps.mjs';
import {pveEntries489} from './aggro-rules.mjs';
import {colLabIsMonster,colLabMonsterActive} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
export class NativeWorldClockRules {
regenerate(settings,nowMs=this.now()){
  if(!this.combat?.enabled)return false;
  const percent=settings.monster_rest_regen_percent,delay=settings.monster_rest_regen_combat_delay_seconds;
  for(const id of this.monsters.keys()){
   const m=this.monster(id);if(!colLabMonsterActive(m)||m.hp<=0||!this.owns(m)||this.blocked(m.id))continue;
   const last=Math.max(m.last_regen_at_ms??0,this.regenClocks.get(id)??0);if(last>nowMs-1000)continue;
   this.regenClocks.set(id,nowMs);
   if(m.hp>=m.max_hp||!(percent>0)||m.last_damaged_at_ms>nowMs-delay*1000)continue;
   const engaged=[...(this.engagedByMonster.get(id)??[])].some(pid=>{const e=this.engagements.get(pid);return e&&e.expires_at_ms>=nowMs&&pveEntries489(e).some(entry=>entry.monster_id===m.id&&entry.spawn_round===m.spawn_round);});
   if(engaged)continue;
   const hp=Math.min(m.max_hp,m.hp+Math.max(1,Math.round(m.max_hp*percent/100*Math.min(5000,Math.max(0,nowMs-Math.max(last,m.last_damaged_at_ms+delay*1000)))/1000)));
   if(this.combat.updateMonster(m,{hp,last_regen_at_ms:nowMs})===false)this.regenClocks.set(id,last);
  }return true;
 }
due(nowSeconds){const rows=[];for(const id of this.monsters.keys()){const m=this.monster(id);if(colLabMonsterActive(m)&&this.owns(m)&&m.id!=='dragon-world-1'&&m.hp<=0&&m.respawn_at>0&&m.respawn_at<=nowSeconds)rows.push(m);}return rows;}
needsRepair(s){
  for(const id of this.monsters.keys()){
   const m=this.monster(id);if(isAdventureArea(m.area)||!colLabMonsterActive(m)||id==='dragon-world-1'||!this.owns(m))continue;
   const stone=id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||id==='stone-boss-black-c4',frozen=id==='frozen-boss-1',ancient=id==='ancient-boss-1',water=id.startsWith('frozen-water-c');
   const disabled=stone&&!s.black_stone_boss_enabled||frozen&&(!s.frozen_zone_enabled||!s.frozen_boss_enabled)||ancient&&!s.ancient_boss_enabled||water&&(!s.frozen_zone_enabled||!s.frozen_water_enabled);
   if(disabled){if(m.hp!==0||m.respawn_at!==0)return true;continue;}
   if(m.summoned&&m.hp<=0&&m.respawn_at<=0&&(this.monsters.get(m.parent_stone_id)?.spawn_round??0)>m.spawn_round)return true;
   if(m.hp<=0&&m.respawn_at<=0&&!m.summoned&&!m.is_boss&&m.area!=='event')return true;
  }return false;
 }
repairCandidates(s){const rows=[];
  for(const id of this.monsters.keys()){
   const m=this.monster(id);if(isAdventureArea(m.area)||!colLabMonsterActive(m)||id==='dragon-world-1'||!this.owns(m))continue;
   const stone=id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||id==='stone-boss-black-c4',frozen=id==='frozen-boss-1',ancient=id==='ancient-boss-1',water=id.startsWith('frozen-water-c');
   const disabled=stone&&!s.black_stone_boss_enabled||frozen&&(!s.frozen_zone_enabled||!s.frozen_boss_enabled)||ancient&&!s.ancient_boss_enabled||water&&(!s.frozen_zone_enabled||!s.frozen_water_enabled);
   if(disabled){if(m.hp!==0||m.respawn_at!==0)rows.push(m);continue;}
   if(m.summoned&&m.hp<=0&&m.respawn_at<=0&&(this.monsters.get(m.parent_stone_id)?.spawn_round??0)>m.spawn_round)rows.push(m);
   if(m.hp<=0&&m.respawn_at<=0&&!m.summoned&&!m.is_boss&&m.area!=='event')rows.push(m);
  }return rows;
 }
needsDespawn(nowSeconds){for(const m of this.monsters.values())if(this.owns(m)&&m.is_boss&&!colLabIsMonster(m.id)&&m.hp>0&&m.despawn_at>0&&m.despawn_at<=nowSeconds)return true;return false;}
despawnCandidates(nowSeconds){const rows=[];for(const m of this.monsters.values())if(this.owns(m)&&m.is_boss&&!colLabIsMonster(m.id)&&m.hp>0&&m.despawn_at>0&&m.despawn_at<=nowSeconds)rows.push(m);return rows;}
dragonDue(){const m=this.monster('dragon-world-1'),row=this.config.get('dragon_settings');if(!m||!this.owns(m)||!row)return false;if(this.dragonRaw!==row.config_json){this.dragonRaw=row.config_json;this.dragonConfig=JSON.parse(row.config_json);}const c=this.dragonConfig;return c.enabled&&(m.hp>0&&m.despawn_at!==0||m.hp<=0&&(m.respawn_at<=0||m.respawn_at<=this.now()/1000&&c.loot.some(r=>r.chance>0)));}
}

from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[2]/'r109_latency_completion/working/core511-source/scripts/core511'
proof=[]
for p in sorted((root/'generated').glob('*.mjs')):
 if p.name in ['native-http-services.mjs','reward-services.mjs','combat-services.mjs','new-realm-schema-r101.mjs']:continue
 s=p.read_text();original=s;edits=[]
 def change(old,new):
  global s
  count=s.count(old)
  if count:s=s.replace(old,new);edits.append({'anchor':old[:140],'count':count})
 change('function areaWorld(area) {',"function areaWorld(area) {if(area==='champions')return CHAMPIONS_WORLD_R118;")
 change('function isAreaWalkablePosition(area, x, y) {',"function isAreaWalkablePosition(area, x, y) {if(area==='champions')return championsWalkableR118(x,y);")
 change('function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {',"function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(area==='champions')return championsSegmentR118(fromX,fromY,toX,toY);")
 change('function validArea(area) {',"function validArea(area) {if(area==='champions')return true;")
 change('^(zumrut|forest|','^(champions|zumrut|forest|')
 # Literal region arrays, never rank-region pairs, loot catalogs or arbitrary names.
 def regions(match):
  text=match.group();values=re.findall(r"['\"]([a-z_]+)['\"]",text)
  known={'forest','frozen','black','ancient','sanctum','rune','rune_v2','sinsi','dragon','event','war','arena','afk','bazaar','fishing','zumrut'}
  if 'champions' not in values and set(values)<=known and ('forest' in values and len(values)>=3 or set(values)=={'black','rune_v2'}):
   edits.append({'regionArray':text,'count':1});return text[:-1]+",'champions']"
  return text
 s=re.sub(r"\[(?:\s*['\"][a-z_]+['\"]\s*,?)+\]",regions,s)
 change("player.area==='black'||player.area==='rune_v2'","player.area==='black'||player.area==='rune_v2'||player.area==='champions'")
 change('player.area === "black" || player.area === "rune_v2"','player.area === "black" || player.area === "rune_v2" || player.area === "champions"')
 change('player.area !== "rune_v2" &&','player.area !== "rune_v2" && player.area !== "champions" &&')
 change("function resolveLootSourceKey(monster) {","function resolveLootSourceKey(monster) {if(monster.area==='champions'){const key=championsMonsterKeyR118(monster);return key?'champions.'+key:null;}")
 change("function profileFromDefeat(defeat, fallbackKey, settings) {","function profileFromDefeat(defeat, fallbackKey, settings) {if(String(fallbackKey).startsWith('champions.')){const saved=JSON.parse(defeat.loot_profile_json);if(saved?.version!==1||saved.key!==fallbackKey||!saved.championsLoot)throw Error('champions_reward_snapshot_r118');return saved;}")
 change('function prepareProfileDrops(profile, participants, monsterId, center, settings, now, eventSnapshot, pearlsRetired = false) {',"function prepareProfileDrops(profile, participants, monsterId, center, settings, now, eventSnapshot, pearlsRetired = false) {if(profile.championsLoot)return prepareChampionsDropsR118(profile,participants,monsterId,center,settings,now,{role:rollLootRole,name:resolveLootItemName,power:rollLootPower,enchants:rollEnchantments,random:()=>Math.random(),uuid:()=>crypto.randomUUID()});")
 change('function defaultLootSnapshot(target, settings) {',"function defaultLootSnapshot(target, settings) {if(target.area==='champions'){const snapshot=globalThis.__colChampionsR118?.lootSnapshot(target);if(!snapshot)throw Error('champions_loot_snapshot_missing_r118');return snapshot;}")
 change('function monsterXpReward(target, settings) {',"function monsterXpReward(target, settings) {if(target.area==='champions')return globalThis.__colChampionsR118?.monster(target)?.xp??0;")
 change('function pveDamage(monster, armorPower, player, settings) {',"function pveDamage(monster, armorPower, player, settings) {if(monster.area==='champions'){const cfg=globalThis.__colChampionsR118?.monster(monster);if(!cfg)throw Error('champions_damage_config_missing_r118');if(cfg.damage===0)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:cfg.damage};}")
 change("if(/^rune_v2\\.(tide|warden|sentinel|wraith|boss)$/.test(pending.loot_source_key))", "if(/^champions\\.(ivory_guard|golden_lion|crescent_hunter|royal_colossus)$/.test(pending.loot_source_key))return pending.loot_source_key;if(/^rune_v2\\.(tide|warden|sentinel|wraith|boss)$/.test(pending.loot_source_key))")
 change("(target.area==='rune_v2'?globalThis.__colRuneV2?.monster(target)?.respawnSeconds:","(target.area==='champions'?globalThis.__colChampionsR118?.monster(target)?.respawnSeconds:target.area==='rune_v2'?globalThis.__colRuneV2?.monster(target)?.respawnSeconds:")
 change("drop.monster_id.startsWith('rune-v2-')?'rune_v2':","drop.monster_id.startsWith('champions-')?'champions':drop.monster_id.startsWith('rune-v2-')?'rune_v2':")
 change("WHEN monster_id LIKE 'event-%' THEN", "WHEN monster_id LIKE 'champions-%' THEN 'champions' WHEN monster_id LIKE 'event-%' THEN")
 change("'weathered_iron','wing','infinite','pet','halloween_pumpkin'","'royal_crown','weathered_iron','wing','infinite','pet','halloween_pumpkin'")
 change("WHERE id=? AND area IN ('rune','rune_v2') AND EXISTS", "WHERE id=? AND area IN ('rune','rune_v2','champions') AND EXISTS")
 change('case "travel_zumrut":', 'case "travel_champions":case "travel_zumrut":')
 change("const destination = payload.action==='travel_zumrut'", "const destination = payload.action==='travel_champions'?'champions':payload.action==='travel_zumrut'")
 change('const target = destination === "zumrut"', 'const target = destination === "champions" ? CHAMPIONS_ENTRY_R118 : destination === "zumrut"')
 change('message: destination === "zumrut"', 'message: destination === "champions" ? "Şampiyonlar Diyarı’na vardın. PvP açık." : destination === "zumrut"')
 change("if(payload.action==='travel_rune_v2'&&payload.confirmPvp!==true)", "if(payload.action==='travel_champions'&&(!championsEligibleR118(player)||!globalThis.__colChampionsR118?.settings().config.enabled))return Response.json({error:'Şampiyonlar Diyarı için Şampiyon Lv 1 gerekiyor; harita açık olmalı.',code:'champions_access_r118'},{status:403});if(payload.action==='travel_champions'&&payload.confirmPvp!==true)return Response.json({error:'Bu haritada PvP açık. Giriş uyarısını onayla.',code:'champions_pvp_confirmation_r118'},{status:403});if(payload.action==='travel_rune_v2'&&payload.confirmPvp!==true)")
 # Exact CAS: the selected destination guard stays inside the same durable UPDATE.
 change("AND (? != 'event' OR json_extract", "AND (? != 'champions' OR (champion_level_r102>=1 AND json_extract((SELECT config_json FROM champions_settings_r118 WHERE id=1),'$.enabled')=1)) AND (? != 'event' OR json_extract")
 change('destination,destination,destination,destination).first()) return Response.json', 'destination,destination,destination,destination,destination).first()) return Response.json')
 change('destination,destination,destination,destination).first()) return Response.json', 'destination,destination,destination,destination).first()) return Response.json') if False else None
 change('const respawnArea = player.area===CASTLE_AREA', "const respawnArea = player.area==='champions'?(championsEligibleR118(player)&&globalThis.__colChampionsR118?.settings().config.enabled?'champions':'bazaar'):player.area===CASTLE_AREA")
 change("const respawnPoint = respawnArea==='event'", "const respawnPoint = respawnArea==='champions'?CHAMPIONS_ENTRY_R118:respawnArea==='event'")
 if p.name=='respawn-rules.mjs':
  change("if(monster.area==='rune_v2'){const cfg=", "if(monster.area==='champions'){const cfg=globalThis.__colChampionsR118?.monster(monster);if(!cfg)throw Error('champions_respawn_config_missing_r118');return database.prepare(\"UPDATE monsters SET name=?,hp=?,max_hp=?,variant='normal',respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND area='champions' AND loadlab_run_id='' AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?\").bind(cfg.name,cfg.hp,cfg.hp,monster.id,monster.spawn_round,monster.respawn_at,now);}if(monster.area==='rune_v2'){const cfg=")
 if p.name=='cold-world-rules.mjs':change('runeV2:{enabled:',"champions:{enabled:globalThis.__colChampionsR118?.settings().config.enabled===true,revision:globalThis.__colChampionsR118?.settings().revision??0},runeV2:{enabled:")
 if p.name=='action-names.mjs':change("'travel_zumrut'","'travel_champions','travel_zumrut'")
 if s!=original:
  names=['CHAMPIONS_WORLD_R118','CHAMPIONS_ENTRY_R118','championsEligibleR118','championsWalkableR118','championsSegmentR118','championsMonsterKeyR118','prepareChampionsDropsR118'];used=[n for n in names if n in s]
  if used:s="import {"+','.join(used)+"} from '../champions-config-r118.mjs';\n"+s
  p.write_text(s);proof.append({'path':str(p.relative_to(root)),'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(s.encode()).hexdigest(),'edits':edits})
# Explicit ordinary-map predicates; retaining native memory, batching and persistence lanes.
for name in ['r53-options.mjs','action-loop.mjs','persistence-scope-r113.mjs','potion-refresh.mjs','potion-batch-channel-r61.mjs','actor-section-reuse-r52.mjs','reward-actor-scope-r85.mjs','pvp-memory.mjs','local-death-batch-r51.mjs','attack-loop.mjs','local-mixed-scope.mjs']:
 p=root/name;s=p.read_text();original=s
 s=re.sub(r"\[(?:\s*['\"][a-z_]+['\"]\s*,?)+\]",regions,s)
 s=s.replace("WHEN monster_id LIKE 'event-%' THEN","WHEN monster_id LIKE 'champions-%' THEN 'champions' WHEN monster_id LIKE 'event-%' THEN")
 if s!=original:p.write_text(s);proof.append({'path':name,'before':hashlib.sha256(original.encode()).hexdigest(),'after':hashlib.sha256(s.encode()).hexdigest()})
# Custom profiles must bypass the legacy loot-profile parser cache.
p=root/'loot-profile-cache-r61.mjs';s=p.read_text();old=s;s=s.replace("fallbackKey.startsWith('rune.')||", "fallbackKey.startsWith('champions.')||fallbackKey.startsWith('rune.')||");p.write_text(s);proof.append({'path':p.name,'before':hashlib.sha256(old.encode()).hexdigest(),'after':hashlib.sha256(s.encode()).hexdigest()})
Path(__file__).resolve().parents[1].joinpath('evidence/champions-patch.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(proof),'paths':[x['path'] for x in proof]},indent=2))

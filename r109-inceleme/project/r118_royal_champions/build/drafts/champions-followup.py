from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[2]/'r109_latency_completion/working/core511-source/scripts/core511'
paths=list((root/'generated').glob('*.mjs'))+[root/n for n in ['r53-options.mjs','action-loop.mjs','persistence-scope-r113.mjs','potion-refresh.mjs','potion-batch-channel-r61.mjs','actor-section-reuse-r52.mjs','reward-actor-scope-r85.mjs','pvp-memory.mjs','local-death-batch-r51.mjs','attack-loop.mjs','local-mixed-scope.mjs']]
changed=[]
for p in paths:
 if p.name in ['native-http-services.mjs','reward-services.mjs','combat-services.mjs','new-realm-schema-r101.mjs']:continue
 s=p.read_text();before=s
 def regions(m):
  text=m.group();values=re.findall(r"['\"]([a-z_0-9]+)['\"]",text)
  known={'forest','frozen','black','ancient','sanctum','rune','rune_v2','sinsi','dragon','event','war','arena','afk','bazaar','fishing','zumrut'}
  if 'champions' not in values and set(values)<=known and ('forest' in values and len(values)>=3 or set(values)=={'black','rune_v2'}):return text[:-1]+",'champions']"
  return text
 s=re.sub(r"\[(?:\s*['\"][a-z_0-9]+['\"]\s*,?)+\]",regions,s)
 if s!=before:p.write_text(s);changed.append(str(p.relative_to(root)))
# Entry repair occurs inside the existing authenticated owner-fenced transaction.
p=root/'entry-writer.mjs';s=p.read_text();anchor="   if(session.playerAccess?.area==='rune_v2')rules.colRepairRuneV2Access(db,id);";assert s.count(anchor)==1
s=s.replace(anchor,"   if(session.playerAccess?.area==='champions'){const allowed=globals.__colChampionsR118?.settings().config.enabled===true;sql.prepare(\"UPDATE players SET area='bazaar',arena_match_id='',x=1200,y=520,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='champions' AND (champion_level_r102<1 OR ?=0)\").run(nowMs,id,allowed?1:0);}\n"+anchor);p.write_text(s);changed.append(p.name)
# Active mount travel obeys the same open rectangle as ordinary movement.
p=root/'mount-motion.mjs';s=p.read_text();anchor="  if((player.area==='rune'||player.area==='rune_v2')&&!runeWalkableSegment(fromX,fromY,x,y))return null;";assert s.count(anchor)==1
s="import {championsSegmentR118} from './champions-config-r118.mjs';\n"+s.replace(anchor,"  if(player.area==='champions'&&!championsSegmentR118(fromX,fromY,x,y))return null;\n"+anchor);p.write_text(s);changed.append(p.name)
print(json.dumps(changed,indent=2))

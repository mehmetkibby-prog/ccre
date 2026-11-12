import {localMixedTargetLimitR51} from './r51-options.mjs';
import {r37Options} from './r37-options.mjs';
import {localMixedTargets} from './local-mixed-targets.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {kernelError} from './contract.mjs';
import {r35Options} from './r35-options.mjs';
import {authorityReadR57,deathBatchR57} from './r57-options.mjs';
export const LOCAL_MIXED_AREAS=new Set(['forest','frozen','ancient','sanctum']);
// The whole local monster population is leased, including dead rows that may
// respawn. Re-read CURRENT DB in the authority transaction. The native target
// selector, damage, controls and reward SQL are not reimplemented here.
export function assertLocalMixedScope(sql,{local,input,resources,peer,actor,nowMs,batchSinglesR57=false}){
 const fail=()=>{throw kernelError('local_kill_requires_shared');};
 const p=prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(actor);
 if(!r35Options.localMixed||input?.action!=='attack'||!(Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))===2||deathBatchR57&&batchSinglesR57&&[0,1].includes(Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))))||!['avci','arkanist'].includes(p?.role)||!LOCAL_MIXED_AREAS.has(p.area)||p.channel!==peer.channel||p.arena_match_id||local.area!==p.area||!Array.isArray(local.targets)||!local.targets.length||local.targets.length>localMixedTargetLimitR51)fail();
 const held=new Set(resources??[]),targets=new Map(local.targets.map(t=>[t.id,t.spawnRound]));
 if(targets.size!==local.targets.length||!held.has('player:'+actor))fail();
 const population=prepareCached477(sql,'SELECT * FROM monsters WHERE area=? AND (channel=0 OR channel=?)').all(p.area,peer.channel);
 const narrow=local.narrow===true;if(narrow&&!r37Options.mixedNarrow)fail();
 const monsters=narrow?population.filter(m=>targets.has(m.id)):population;
 if(monsters.length!==targets.size)fail();
 if(narrow){if(!Number.isSafeInteger(nowMs)||localMixedTargets(population,p,input,nowMs).some(m=>!targets.has(m.id)))fail();}
 for(const m of monsters){
  if(m.channel!==peer.channel||m.is_boss||m.is_stone||targets.get(m.id)!==m.spawn_round||!held.has('monster:'+m.id))fail();
  if(m.hp>0)for(const row of prepareCached477(sql,'SELECT player_id FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round))if(!held.has('player:'+row.player_id))fail();
 }
 const permitted=[...held].filter(k=>k.startsWith('player:')).map(k=>k.slice(7)),offline=new Set(),checkedPartiesR57=authorityReadR57?new Set():null;
 for(const id of permitted){
  const party=prepareCached477(sql,'SELECT party_id FROM party_members WHERE player_id=?').get(id);if(!party)continue;
  // This guard is wholly read-only. A roster already checked against the
  // same held set is identical for its next member; discard at guard return.
  if(checkedPartiesR57?.has(party.party_id))continue;checkedPartiesR57?.add(party.party_id);
  for(const row of prepareCached477(sql,'SELECT m.player_id,EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=m.player_id) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=m.player_id) AS live FROM party_members m WHERE m.party_id=?').all(party.party_id)){
   if(held.has('player:'+row.player_id))continue;if(row.live)fail();offline.add(row.player_id);
  }
 }
 return [...offline];
}

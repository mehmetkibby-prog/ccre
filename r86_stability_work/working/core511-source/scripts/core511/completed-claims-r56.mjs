import {completedClaimR56} from './r56-options.mjs';
import {nonlethalSchemaR56} from './nonlethal-rewards-r56.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {colLabBossMonster} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs';

// A hint only selects a smaller lease ATTEMPT. It is never write authority:
// Ownership rechecks the current complete defeat and exact
// trigger certificate inside the sole-writer transaction on every request.
const valid=t=>t&&typeof t.id==='string'&&/^[a-z0-9-]{1,64}$/.test(t.id)&&Number.isSafeInteger(t.spawnRound)&&t.spawnRound>=0;
export function completedClaimTargetsR56(sql,targets){
 if(!completedClaimR56||!sql.isTransaction||!Array.isArray(targets)||!targets.length||targets.length>1024||!targets.every(valid)||!nonlethalSchemaR56(sql))return [];
 // Match EVERY alternate branch in native claim_rewards, including immutable
 // load-lab boss ranges whose dispatch is not chosen by monsters.is_boss.
 try{if(targets.some(t=>t.id==='dunya-bosu-1'||t.id.startsWith('sinsi-tasi-')||colLabBossMonster(t.spawnRound)?.id===t.id))return [];}catch{return [];}
 return prepareServerStatement(sql,`SELECT d.monster_id id,d.spawn_round spawnRound FROM json_each(?) j
 JOIN normal_defeats d ON d.monster_id=json_extract(j.value,'$.id') AND d.spawn_round=json_extract(j.value,'$.spawnRound')
 JOIN monsters m ON m.id=d.monster_id
 WHERE d.rewards_completed_at>0 AND m.channel>0 AND m.is_boss=0 AND m.is_stone=0 AND m.area IN ('forest','frozen','black','ancient','sanctum')
 ORDER BY CAST(j.key AS INTEGER)`).all(JSON.stringify(targets)).map(r=>({id:r.id,spawnRound:r.spawnRound}));
}
export function completedClaimProofR56(sql,targets){
 return completedClaimR56&&Array.isArray(targets)&&targets.length>0&&targets.length<=10&&new Set(targets.map(t=>JSON.stringify([t?.id,t?.spawnRound]))).size===targets.length&&completedClaimTargetsR56(sql,targets).length===targets.length;
}
export class CompletedClaimHintsR56 {
 constructor(){this.rows=new Map();}
 key(cycle,t){return JSON.stringify([cycle,t.id,t.spawnRound]);}
 record(cycle,targets){if(!completedClaimR56||!Array.isArray(targets)||targets.length>1024)return;for(const t of targets)if(valid(t)){this.rows.set(this.key(cycle,t),true);if(this.rows.size>1024)this.rows.delete(this.rows.keys().next().value);}}
 has(cycle,targets){return completedClaimR56&&targets.length>0&&targets.length<=10&&targets.every(t=>valid(t)&&this.rows.has(this.key(cycle,t)));}
}

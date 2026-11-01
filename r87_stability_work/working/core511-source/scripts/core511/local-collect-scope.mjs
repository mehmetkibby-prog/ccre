import {prepareCached477} from './writer-statements.mjs';
import {kernelError} from './contract.mjs';
import {r35Options} from './r35-options.mjs';
import {groundLoot30s} from './ground-loot-expiry.mjs';
export const LOCAL_COLLECT_REJECTED='local_collect_requires_shared';
export const localExpiredCollect=groundLoot30s&&process.env.CORE511_LOCAL_EXPIRED_COLLECT!=='0';
// Runs BEFORE authority executes or allocates the durable receipt. All native
// loot SQL, DROP deletion predicates, party splitting and dedupe remain intact.
export function assertLocalCollectScope(sql,{local,input,resources,peer,actor,nowMs}){
 const fail=()=>{throw kernelError(LOCAL_COLLECT_REJECTED);};
 if(!r35Options.localCollect||local.kind!=='collect'||input?.action!=='collect'||local.target!==input.targetId||local.owner!==actor)fail();
 const player=prepareCached477(sql,'SELECT channel FROM players WHERE id=?').get(actor);if(player?.channel!==peer.channel)fail();
 const drop=prepareCached477(sql,localExpiredCollect?'SELECT owner_id,monster_id,kind,expires_at FROM world_drops WHERE id=?':'SELECT owner_id,monster_id,kind FROM world_drops WHERE id=?').get(local.target);
 // Cold reads hide expired rows before bounded cleanup deletes them. Only an
 // owned, expired target may reach the existing native expiry rejection with
 // absent metadata; every live target and ownership/party fence stays strict.
 const expiredAbsent=localExpiredCollect&&local.absent===true&&drop?.owner_id===actor&&Number.isSafeInteger(nowMs)&&nowMs>=0&&drop.expires_at<=Math.floor(nowMs/1000);
 if(drop&&(drop.owner_id!==actor||!expiredAbsent&&(local.absent||drop.monster_id!==local.monster||drop.kind!==local.dropKind)))fail();
 const party=prepareCached477(sql,'SELECT party_id FROM party_members WHERE player_id=?').get(actor)?.party_id??null;
 if(party!==local.party)fail();
 const rows=party?prepareCached477(sql,`SELECT m.player_id,p.channel,EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=m.player_id) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=m.player_id) AS live
  FROM party_members m JOIN players p ON p.id=m.player_id WHERE m.party_id=? ORDER BY m.player_id`).all(party):[{player_id:actor,channel:peer.channel,live:1}];
 if(!Array.isArray(local.members)||JSON.stringify(rows.map(r=>r.player_id))!==JSON.stringify(local.members))fail();
 const permitted=new Set(resources.filter(k=>k.startsWith('player:')).map(k=>k.slice(7))),offline=[];
 for(const row of rows){if(row.channel!==peer.channel)fail();if(!permitted.has(row.player_id)){if(row.live)fail();offline.push(row.player_id);}}
 return offline;
}

import {r37Options} from './r37-options.mjs';
import {localClaimTargets,nativeClaimPrefix} from './claim-chunks.mjs';
import {kernelError} from './contract.mjs';
import {isAdventureArea} from './adventure-maps.mjs';
import {instanceRewardAreaR71,assertInstanceRewardScopeR71} from './instance-reward-scope-r71.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {requestGuardCache} from './r50-writer-options.mjs';
import {completedClaimProofR56} from './completed-claims-r56.mjs';

// R22 local kill/claim scope. A plain monster on this channel whose every
// participant (with its whole party) is a resident the channel leased cannot write
// a foreign or unleased player: native XP shares only with same-channel party
// allies (all leased here) and claims credit only monster participants. The writer
// re-checks CURRENT DB before any native statement runs; a mismatch is a
// pre-execution actor rejection and the channel retries via the shared path.
export const LOCAL_KILL_REJECTED='local_kill_requires_shared';
export const LOCAL_CLAIM_REJECTED='local_claim_requires_shared';
export function assertLocalRewardScope(sql,{code,targets,input,nativeLimit,completedR56,resources,peer,actor}){
 const fail=()=>{throw kernelError(code);};
 const permitted=new Set([actor,...(resources??[]).filter(k=>k.startsWith('player:')).map(k=>k.slice(7))]);
 if(nativeLimit!==undefined&&(nativeLimit!==true||code!==LOCAL_CLAIM_REJECTED||!r37Options.claimChunks))fail();
 if(!Array.isArray(targets)||!targets.length||targets.length>(code===LOCAL_CLAIM_REJECTED&&r37Options.claimChunks&&!nativeLimit?100:10))fail();
 if(code===LOCAL_CLAIM_REJECTED){
  const normalized=nativeLimit?nativeClaimPrefix(input?.rewardTargets):localClaimTargets(input?.rewardTargets,r37Options.claimChunks?100:10);
  if(input?.action!=='claim_rewards'||!normalized||JSON.stringify(normalized)!==JSON.stringify(targets))fail();
 }
 const player=prepareCached477(sql,'SELECT area,channel,arena_match_id FROM players WHERE id=?').get(actor);
 if(!player||player.channel!==peer.channel||player.arena_match_id||player.area==='arena'||isAdventureArea(player.area)&&!instanceRewardAreaR71(player.area))fail();
 if(completedR56!==undefined&&(completedR56!==true||code!==LOCAL_CLAIM_REJECTED||!completedClaimProofR56(sql,targets)))fail();
 for(const target of targets){
  const id=target?.id,round=target?.spawnRound;
  if(typeof id!=='string'||!Number.isSafeInteger(round)||id==='dunya-bosu-1'||id.startsWith('sinsi-tasi-'))fail();
  const m=prepareCached477(sql,'SELECT channel,area,is_boss,is_stone FROM monsters WHERE id=?').get(id);
  if(!m||m.channel!==peer.channel||m.is_boss||m.is_stone||m.area!==player.area)fail();
  assertInstanceRewardScopeR71(sql,{actor,player,target,fail});
  if(!completedR56)for(const row of prepareCached477(sql,'SELECT player_id FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(id,round))if(!permitted.has(row.player_id))fail();
 }
 // The unchanged native normal claim selects only completed_at=0. With the
 // current proof, it cannot award another participant. Pending gear finalizes
 // only owner_id=caller in unchanged native SQL (bounded64); native rate
 // accounting, own drop projection and receipt still run.
 if(completedR56)return [];
 // Party members are either leased here (permitted) or offline: native XP
 // sharing may then reach only rows the write scope allows (offline rewards).
 const offline=new Set(),parties=requestGuardCache?new Set():null;
 for(const id of permitted){
  const party=prepareCached477(sql,'SELECT party_id FROM party_members WHERE player_id=?').get(id);if(!party)continue;
  // This whole guard is synchronous/read-only and permitted is fixed. A party
  // roster already checked here has the same scope for its next local member.
  // The set is discarded before native reward writes; the next request rereads.
  if(parties?.has(party.party_id))continue;
  for(const row of prepareCached477(sql,'SELECT m.player_id,EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=m.player_id) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=m.player_id) AS live FROM party_members m WHERE m.party_id=?').all(party.party_id)){if(permitted.has(row.player_id))continue;if(row.live)fail();offline.add(row.player_id);}
  if(parties&&parties.size<4096)parties.add(party.party_id);
 }
 return [...offline];
}

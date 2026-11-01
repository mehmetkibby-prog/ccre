import {potionActorJoinR56} from './r56-options.mjs';
import {normalPlayerR53,normalMonsterR53} from './r53-options.mjs';

// Only the caller and stable, ordinary incoming attackers participate. An
// empty target list is valid: the actor journal still joins the potion commit.
export function potionJoinTargetsR56({input,footprint,ids,kernel}){
 if(!potionActorJoinR56||input.action!=='use_potion'||ids.length!==1||footprint.localScope||footprint.sharedLease)return null;
 const player=kernel.state.read('players',ids[0]);
 if(!normalPlayerR53(player)||player.channel!==kernel.state.channel)return null;
 const monsters=[];
 for(const key of footprint.resources){
  if(key==='player:'+ids[0])continue;
  if(!key.startsWith('monster:'))return null;
  const id=key.slice(8),row=kernel.state.read('monsters',id);
  if(!normalMonsterR53(row)||row.channel!==player.channel||row.area!==player.area)return null;
  monsters.push(id);
 }
 if(monsters.length>1024||new Set(monsters).size!==monsters.length)return null;
 return monsters;
}

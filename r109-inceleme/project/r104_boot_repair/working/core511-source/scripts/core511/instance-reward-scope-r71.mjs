import {adventureArea} from './adventure-maps.mjs';
import {prepareCached477} from './writer-statements.mjs';

// These encounters use the ordinary per-monster defeat/claim ledger. Castle,
// arena and the separate DungeonEngine never enter this path.
export function instanceRewardAreaR71(area){
 const kind=adventureArea(area)?.kind;
 return kind==='tower'||kind==='mist';
}

// Read CURRENT SQL under the writer transaction, before checkpoints or native
// reward writes. The caller still leases every participant and its party.
export function assertInstanceRewardScopeR71(sql,{actor,player,target,fail}){
 if(!instanceRewardAreaR71(player.area))return;
 const row=prepareCached477(sql,`SELECT r.id,r.kind,r.area,r.channel,r.cycle,r.status,
  m.area AS monster_area,m.profile,
  EXISTS(SELECT 1 FROM adventure_members a WHERE a.player_id=? AND a.run_id=r.id AND a.departed=0) AS member
  FROM adventure_monsters m JOIN adventure_runs r ON r.id=m.run_id WHERE m.id=?`).get(actor,target.id);
 const area=adventureArea(player.area);
 if(!row||row.status!=='active'||!row.member||row.area!==player.area||row.monster_area!==player.area||row.channel!==player.channel||row.kind!==area.kind||row.id.replaceAll('-','')!==area.run||row.cycle!==prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get()?.cycle)fail();
 let profile;try{profile=JSON.parse(row.profile);}catch{fail();}
 if(profile?.runId!==row.id||profile.feature!==row.kind)fail();
}

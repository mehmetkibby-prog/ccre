import {localDeathBatchR51} from './r51-options.mjs';
import {publishLocalDeathBatchR51} from './local-death-batch-r51.mjs';
// Capture immutable lives before yielding. Each promotion uses the unchanged
// R32 single-life validation, AFTER the writer's durable ACK. Alive, replaced,
// unleased, foreign, boss/stone and moved lives are never promoted early.
export function captureLocalDeaths(loop,targets,player,ids,kernel){
 return targets.map(target=>({target:{...target},before:loop.memory.view?.monster?.(target.id),scope:{area:player.area,channel:player.channel,cycle:player.world_cycle,version:player.realtime_scope_version},actors:ids.map(id=>({id,p:kernel.players.get(id),epoch:kernel.players.get(id).epoch,owner:kernel.state.owners.get(id)}))}));
}
export async function publishLocalDeaths(loop,{deaths,result,...context}){
 if(localDeathBatchR51&&deaths.length>1)return publishLocalDeathBatchR51(loop,{deaths,result,...context});
 if(!Array.isArray(result.monsters))return 0;let published=0;
 const byId=new Map();for(const row of result.monsters){if(byId.has(row.id)&&JSON.stringify(byId.get(row.id))!==JSON.stringify(row))return 0;byId.set(row.id,row);}
 for(const death of deaths){
  const monster=byId.get(death.target.id);if(monster?.hp!==0)continue;
  const single={...result,monsters:[monster],participants:(result.participants??[]).filter(p=>p.monster_id===monster.id&&p.spawn_round===monster.spawn_round)};
  if(await loop.publishLocalDeath({death,result:single,...context}))published++;
 }
 return published;
}

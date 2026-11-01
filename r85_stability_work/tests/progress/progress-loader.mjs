import fs from 'node:fs';
const base=new URL('../runtime/r84-baseline/core511-source/scripts/core511/',import.meta.url);
const working=new URL('../../working/core511-source/scripts/core511/',import.meta.url);
export async function resolve(specifier,context,next){
 if(['./actor-progress-refresh-r85.mjs','./collect-materials-r85.mjs'].includes(specifier)&&context.parentURL===new URL('actor-section-reuse-r52.mjs',base).href)return {url:new URL(specifier,working).href,shortCircuit:true};
 return next(specifier,context);
}
export async function load(url,context,next){
 const result=await next(url,context);
 if(process.env.R85_PROGRESS_CANDIDATE==='1'&&url===new URL('actor-section-reuse-r52.mjs',base).href)return {...result,source:fs.readFileSync(new URL('actor-section-reuse-r52.mjs',working),'utf8')};
 if(url===new URL('tests/process-channel-fixture.mjs',base).href){
  const source=String(result.source),anchor=" process.on('message',message=>{";
  if(source.split(anchor).length!==2)throw Error('progress_fixture_anchor_drift');
  return {...result,source:source.replace(anchor,anchor+"\n  if(message?.type==='test-progress-state'){const id=message.actor;process.send({type:message.type,request:message.request,snapshot:{player:runtime.channel.view.player(id),owner:runtime.world.subscribers.get(id)?.ownerRow,dungeon:runtime.dungeon.resident.players.get(id),materials:{projection:Object.fromEntries((runtime.world.subscribers.get(id)?.data.dungeonMaterials??[]).map(r=>[r.kind,r.amount])),publicTower:runtime.world.subscribers.get(id)?.data.adventure511?.towerInfo?.inventory,adventure:runtime.adventure.bundles.get(id)?.towerInfo?.inventory,dungeon:runtime.dungeon.resident.materials.get(id)}}});return;}")};
 }
 return result;
}

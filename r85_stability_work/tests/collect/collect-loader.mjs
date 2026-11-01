import fs from 'node:fs';
const base=new URL('../runtime/r84-baseline/core511-source/scripts/core511/',import.meta.url),working=new URL('../../working/core511-source/scripts/core511/',import.meta.url);
export async function resolve(specifier,context,next){
 if(specifier==='./collect-materials-r85.mjs'&&context.parentURL===new URL('collect-light.mjs',base).href)return {url:new URL(specifier,working).href,shortCircuit:true};
 return next(specifier,context);
}
export async function load(url,context,next){
 const result=await next(url,context);
 if(process.env.R85_COLLECT_CANDIDATE==='1'&&url===new URL('collect-light.mjs',base).href)return {...result,source:fs.readFileSync(new URL('collect-light.mjs',working),'utf8')};
 if(url===new URL('tests/process-channel-fixture.mjs',base).href){
  const source=String(result.source),anchor=" process.on('message',message=>{";if(source.split(anchor).length!==2)throw Error('collect_fixture_anchor_drift');
  return {...result,source:source.replace(anchor,anchor+"\n  if(message?.type==='test-collect-state'){const id=message.actor,sub=runtime.world.subscribers.get(id);process.send({type:message.type,request:message.request,snapshot:{player:runtime.channel.view.player(id),materials:sub?.data.dungeonMaterials,tower:sub?.data.adventure511?.towerInfo,adventure:runtime.adventure.bundles.get(id)?.towerInfo,dungeon:runtime.dungeon.resident.materials.get(id),drops:sub?.data.drops,inventory:sub?.data.inventory}});return;}")};
 }
 return result;
}

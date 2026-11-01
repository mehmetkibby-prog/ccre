import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export async function load(url,context,next){
 const result=await next(url,context),name=url.split('/').at(-1);
 if(!url.includes('/working/core511-source/scripts/core511/'))return result;
 if(process.env.R85_LOOT_PURE_EXPORTS==='1'&&name==='attack-writer-rules.mjs'){
  const source=String(result.source),anchor='return Object.freeze({mixedNative,mixedMemory';
  if(createHash('sha256').update(source).digest('hex')!=='b84b27d1682cbe93b5ecefaad61e508a4c94ecbb1cba3697beecb760698ca82e'||source.split(anchor).length!==2)throw Error('loot_pure_native_source_drift');
  return {...result,source:source.replace(anchor,'return Object.freeze({profileFromDefeat,defaultLootSnapshot,prepareProfileDrops,mixedNative,mixedMemory')};
 }
 if(process.env.R85_LOOT_FIXED_SEEDS==='1'&&name==='planned-attack-seed-r57.mjs'){
  const source=String(result.source);if(createHash('sha256').update(source).digest('hex')!=='f07dd0c7497df41934cdd2bba31c27be3915441a5abad84834d5c1bbc3b91f2e')throw Error('loot_seed_source_drift');
  return {...result,source:"import {createHash as fixtureHashR85} from 'node:crypto';\nconst fixtureSeedR85=context=>fixtureHashR85('sha256').update('native-independent-r85:'+context.id+':'+context.inputOrder).digest('hex');\n"+source.replaceAll('OperationRandom.seed()','fixtureSeedR85(context)')};
 }
 if(name!=='loot-profile-cache-r61.mjs')return result;
 if(createHash('sha256').update(String(result.source)).digest('hex')!=='89f5e370c893ad40e2e2a0d1f1de84d9979a6f0278a5ef121a7dcfba796851e7')throw Error('loot_pure_baseline_drift');
 let source=process.env.R85_LOOT_PURE_CANDIDATE==='1'?readFileSync(new URL('../../candidates/loot-pure-r85/loot-profile-cache-r61.mjs',import.meta.url),'utf8'):String(result.source);
 if(process.env.R85_LOOT_OBSERVE==='1'){
  source=source.replace('export function createLootProfileCacheR61(', 'function originalLootCacheR85(')+`
const settingsSeenR85=new WeakMap();let settingsSerialR85=0;
export function createLootProfileCacheR61(options){const fn=originalLootCacheR85(options);if(!fn)return fn;return (defeat,key,settings,derive)=>{
 const stats=globalThis.__r85LootPureStats??={calls:0,derives:0,hits:0,wallMs:0,settings:{}};stats.calls++;let identity=settingsSeenR85.get(settings);if(!identity){identity=++settingsSerialR85;settingsSeenR85.set(settings,identity);}stats.settings[identity]=(stats.settings[identity]??0)+1;
 const at=performance.now();let derived=false;try{return fn(defeat,key,settings,()=>{derived=true;stats.derives++;return derive();});}finally{stats.wallMs+=performance.now()-at;if(!derived)stats.hits++;}
};}
`;
 }
 return {...result,source};
}

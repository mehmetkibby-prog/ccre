// Local fixture adaptation only. Production files are returned byte-for-byte.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
const hash = value => createHash('sha256').update(value).digest('hex');
const overlay = {
 'vds-server/src/writer-sql-timing477.mjs': {bytes:8345,sha256:'9805eec530ab7ca17e13da370f332522ecd7ce328eca8574a483fdb8899f4663'},
 'vds-server/src/wal-checkpoint.mjs': {bytes:11496,sha256:'049ca592fe8ff68dc0d76479f8df7c8328b4dacb9b34d6cf05bdf3d5f29ee630'},
};
const declarations = ['lib/armor-mitigation.d.mts','lib/combat-attack-client.d.mts','lib/community-event.d.mts','lib/community-live.d.mts','lib/game-events.d.mts','lib/movement-checkpoint-client.d.mts','lib/seasonal-layouts.d.mts','vds-server/src/guild-schema.d.mts'];
function once(source, before, after) {
 if(source.split(before).length!==2)throw Error('r84_fixture_anchor_drift: '+before);
 return source.replace(before,after);
}
export async function resolve(specifier,context,next) {
 if(specifier.endsWith('/channel-runtime/assets/guild-village-runtime-Dke_G6YB.js')) {
  const baseline=process.env.COL_CORE511_BASE;
  if(!baseline||hash(fs.readFileSync(baseline+'/lib/guild-village-runtime.ts'))!=='f22b39ff4ca9cf971f64f1888ba3508488c1e85cd4dede2b53e6557b8b3730fa')throw Error('r84_guild_native_ts_drift');
  const url=new URL('./native-guild-runtime.mjs',import.meta.url);
  if(hash(fs.readFileSync(url))!=='4ce37ba3390ad983d7b904337a3efe86ad79e1fe520d17cfc064317f74738796')throw Error('r84_guild_fixture_erasure_drift');
  // Explicit source-only test substitute, not proof of absent built chunk bytes.
  return {url:url.href,shortCircuit:true};
 }
 return next(specifier,context);
}
export async function load(url,context,next) {
 const result=await next(url,context);let source=String(result.source??'');
 if(url.endsWith('/perf-r11/tests/reward/fixture.mjs')) {
  if(hash(source)!=='ef32e56cc3f7f6dfd6ad47e7f5ee5f9f9b901c73b0089d2612307d7f1e94f540')throw Error('r84_reward_fixture_drift');
  const anchor='const entries = new Map(JSON.parse(manifestBytes).files.map(row => [row.path, row]));';
  source=once(source,anchor,anchor+'\n  for(const [name,row] of Object.entries('+JSON.stringify(overlay)+')){if(!entries.has(name))throw Error("R84 overlay missing baseline entry: "+name);entries.set(name,{path:name,...row});}');
  source=once(source,"absent.some(name => name !== 'vds-server/src/loadtest-entry.mjs')","absent.some(name => name !== 'vds-server/src/loadtest-entry.mjs' && !"+JSON.stringify(declarations)+'.includes(name))');
  return {...result,source};
 }
 if(url.endsWith('/core511/tests/helpers.mjs')) {
  if(hash(source)!=='c4aaf2b32670b02663c1cad6ae5d078a2e880d0d3eaaff21bbc21df1557deedd')throw Error('r84_helpers_fixture_drift');
  source=once(source,'export const manifest=JSON.parse(bytes);','export const manifest=JSON.parse(bytes);\nfor(const [name,row] of Object.entries('+JSON.stringify(overlay)+')){const index=manifest.files.findIndex(row=>row.path===name);if(index<0)throw Error("R84 overlay missing baseline entry: "+name);manifest.files[index]={path:name,...row};}');
  return {...result,source};
 }
 if(url.endsWith('/core511/tests/pvp-fixture.mjs')) {
  if(hash(source)!=='c57e51f2cc72b46e4f6309936767af24a01d0005e5d27e9b461431da0e2dbb8b')throw Error('r84_pvp_fixture_drift');
  source="import {createTowerSchema} from '../tower-config.mjs';\nimport {createAdventureSchema} from '../adventure-schema.mjs';\n"+once(source,'installRegistry({now:()=>nowMs});','installRegistry({now:()=>nowMs});createTowerSchema(sql);createAdventureSchema(sql);');
  return {...result,source};
 }
 return result;
}

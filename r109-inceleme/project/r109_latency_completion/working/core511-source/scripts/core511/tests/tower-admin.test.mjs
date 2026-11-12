import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createTowerSchema,TOWER_DEFAULTS,TOWER_CATALOG,validateTowerConfig,readTowerConfig} from '../tower-config.mjs';
import {NativeTowerAdmin} from '../native-tower-admin.mjs';
import {patchNativeTowerAdminRoutes} from '../patch-native-tower-admin.mjs';
import {nativeAdminSource,adminHandlers,adminRequest} from './native-admin-fixture.mjs';

function fixture(t,run=async(_ids,fn)=>fn()){
 const sqlite=new DatabaseSync(':memory:');t.after(()=>sqlite.close());createTowerSchema(sqlite);createTowerSchema(sqlite);
 const database={sqlite,core511Configuration:{run}};return {sqlite,database,admin:new NativeTowerAdmin(database)};
}
const {source,proof}=patchNativeTowerAdminRoutes(nativeAdminSource);
test('tower admin is additive and retains the native authentication, same-origin and body guards',async()=>{
 const e=proof.edits[0];assert.equal(source.slice(0,e.start)+e.original+source.slice(e.start+e.replacement.length),nativeAdminSource);
 let calls=0;const database={core511TowerAdmin:{get(){calls++;return {revision:1};},save(){calls++;throw Error('unexpected');}}};
 const routes=adminHandlers({source,database,snapshot:async()=>({settings:{retained:true}})});
 routes.setUser(null);assert.equal((await routes.post(adminRequest({method:'POST',body:{action:'kadim_tower_get'}}))).status,403);
 routes.setUser({id:'admin-fixture',email:'admin@fixture.invalid'});
 assert.equal((await routes.post(adminRequest({method:'POST',origin:'https://other.invalid',body:{action:'kadim_tower_get'}}))).status,403);
 assert.equal((await routes.post(adminRequest({method:'POST',body:'{broken'}))).status,400);assert.equal(calls,0);
 const response=await routes.post(adminRequest({method:'POST',body:{action:'kadim_tower_get'}}));assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{settings:{retained:true},tower:{revision:1}});assert.equal(calls,1);
});
test('only dedicated tower actions receive256KiB request budget; legacy and oversized requests retain rejection',async()=>{
 let saved=0;const routes=adminHandlers({source,database:{core511TowerAdmin:{save:async()=>{saved++;return {revision:2};}}},snapshot:async()=>({settings:{}})});
 const body={action:'kadim_tower_save',revision:1,config:{data:'a'.repeat(20000)}};
 assert.equal((await routes.post(adminRequest({method:'POST',body}))).status,413);
 assert.equal((await routes.post(adminRequest({method:'POST',query:'?core511=tower',body}))).status,200);assert.equal(saved,1);
 assert.equal((await routes.post(adminRequest({method:'POST',query:'?core511=tower',body:{...body,action:'other_native_action'}}))).status,400);
 assert.equal((await routes.post(adminRequest({method:'POST',query:'?core511=tower',body:{...body,config:{data:'a'.repeat(270000)}}}))).status,413);assert.equal(saved,1);
});
test('full ten-floor fourteen-group sixteen-drop config saves atomically through the actual authorized route',async t=>{
 const {admin}=fixture(t),c=structuredClone(TOWER_DEFAULTS),ids=TOWER_CATALOG.filter(i=>['resource','material','stone','towerMaterial'].includes(i.type)).slice(0,16).map(i=>i.id);
 for(let f=0;f<10;f++)c.floors[f].spawns=Array.from({length:14},(_,i)=>({...c.floors[f].spawns[0],kind:f===9&&i===13?'azrail':'guard',count:1,drops:ids.map(itemId=>({itemId,chance:25,min:1,max:1000}))}));
 const config=validateTowerConfig(c),body={action:'kadim_tower_save',revision:1,config};assert(Buffer.byteLength(JSON.stringify(body))>65536);
 const routes=adminHandlers({source,database:{core511TowerAdmin:admin},snapshot:async()=>({settings:{}})});
 const response=await routes.post(adminRequest({method:'POST',query:'?core511=tower',body}));assert.equal(response.status,200);assert.equal(admin.get().revision,2);assert.deepEqual(admin.get().config.floors,config.floors);
});
test('tower settings save changes only the dedicated table and keeps optimistic revision consistency',async t=>{
 let barriers=0;const {sqlite,admin}=fixture(t,async(ids,fn)=>{assert.deepEqual(ids,[]);barriers++;return fn();});
 sqlite.exec('CREATE TABLE untouched_player_data(id TEXT,level INTEGER);INSERT INTO untouched_player_data VALUES(\'p\',42)');
 const cfg=structuredClone(TOWER_DEFAULTS);cfg.floors[2].waves=4;cfg.floors[2].spawns[0].hp=2345;
 const out=await admin.save(cfg,1);assert.equal(out.revision,2);assert.equal(out.config.floors[2].waves,4);assert.equal(barriers,1);
 const row=sqlite.prepare('SELECT value,revision FROM kadim_tower_settings WHERE id=1').get();assert.equal(row.revision,2);assert.equal(readTowerConfig(row.value).revision,2);
 assert.equal(sqlite.prepare('SELECT level FROM untouched_player_data').get().level,42);
 await assert.rejects(admin.save(cfg,1),{status:409});assert.equal(barriers,1);
});
test('invalid config, inherited kind names and missing writer barrier never mutate settings',async t=>{
 let barriers=0;const {sqlite,database,admin}=fixture(t,async(_ids,fn)=>{barriers++;return fn();});
 const before=sqlite.prepare('SELECT value FROM kadim_tower_settings').get().value;
 for(const mutate of [c=>c.floors[0].spawns[0].count=1000,c=>c.floors[0].spawns[0].kind='toString',c=>c.chest.find(x=>x.itemId==='tower:azrail_hook').chance=100]){
  const cfg=structuredClone(TOWER_DEFAULTS);mutate(cfg);await assert.rejects(admin.save(cfg,1),{status:422});
 }
 assert.equal(barriers,0);delete database.core511Configuration;await assert.rejects(admin.save(TOWER_DEFAULTS,1),{status:503});
 assert.equal(sqlite.prepare('SELECT value FROM kadim_tower_settings').get().value,before);
});
test('admin response waits for the native durability barrier and reports a raced revision safely',async t=>{
 let release,entered;const enteredPromise=new Promise(r=>entered=r),durable=new Promise(r=>release=r);
 const {admin,database}=fixture(t,async(_ids,fn)=>{const out=fn();entered();await durable;return out;});
 const routes=adminHandlers({source,database:{core511TowerAdmin:admin},snapshot:async()=>({settings:{}})});
 let replied=false;const response=routes.post(adminRequest({method:'POST',body:{action:'kadim_tower_save',config:TOWER_DEFAULTS,revision:1}})).then(v=>{replied=true;return v;});
 await enteredPromise;await Promise.resolve();assert.equal(replied,false);release();assert.equal((await response).status,200);
 database.core511Configuration.run=async(_ids,fn)=>{const cfg=admin.get().config;cfg.revision++;database.sqlite.prepare('UPDATE kadim_tower_settings SET value=?,revision=? WHERE id=1').run(JSON.stringify(cfg),cfg.revision);return fn();};
 await assert.rejects(admin.save(admin.get().config,2),{status:409});assert.equal(database.sqlite.isTransaction,false);assert.equal(admin.get().revision,3);
});

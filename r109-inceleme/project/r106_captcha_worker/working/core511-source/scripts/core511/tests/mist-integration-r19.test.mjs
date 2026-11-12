import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {setupPvp,json,put} from './pvp-fixture.mjs';
import {attackRandom} from '../attack-writer.mjs';
import {createAdventureSchema} from '../adventure-schema.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {NativeMistAdmin} from '../native-mist-admin.mjs';
import {mapArea} from '../adventure-maps.mjs';
import {MIST_DEFAULTS} from '../mist-config.mjs';
import {patchNativeTowerAdminRoutes} from '../patch-native-tower-admin.mjs';
import {patchNativeMistAdmin} from '../patch-native-mist-admin.mjs';
import {nativeAdminSource,adminHandlers,adminRequest} from './native-admin-fixture.mjs';

test('Sis: native PvP all classes/basic/area skills match durable rules; no new combat engine',async t=>{
 const s=await setupPvp(t),area=mapArea('mist',randomUUID());
 for(const role of ['avci','muhafiz','arkanist'])for(const ability of [0,1,2]){
  const c=s.reset({area,role,ability,extras:true}),result=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs}),native=await c.original.nativePvp(s.db,json(c.context));
  assert.equal(result.result.status,200,JSON.stringify(result));assert.deepEqual(json(result.result),json(native));
  for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)));
 }
});
test('four entrants, fifth refused; completion once, idle refused, offline expiry returns origin',async t=>{
 const s=await setupPvp(t),q=s.sql;createAdventureSchema(q);let now=Date.now();const services=new NativeGameServices(q,{clock:()=>now}),a=services.globals.__colAdventure,tx=fn=>s.f.database.atomic(()=>services.run({nowMs:now,seed:randomBytes(32).toString('hex')},fn));
 const ids=['real-1','rival-511','rival-extra','fourth','fifth'];for(const id of ids.slice(3))put(q,'players',{id,name:id,role:'avci',area:'forest',channel:1,x:900,y:900,hp:2000,max_hp:2000,level:40,last_seen:Math.floor(now/1000),created_at:1});
 q.prepare("UPDATE players SET area='forest',channel=1,x=900,y=900,hp=2000,max_hp=2000,level=40 WHERE id IN (?,?,?,?,?)").run(...ids);
 const command=(id,action,extra={},requestId=randomUUID())=>tx(()=>a.command(id,{action,requestId,...extra}));
 const portal=await tx(()=>a.portal({area:'forest',channel:1,x:900,y:900}));for(const id of ids.slice(0,4))await command(id,'adventure_mist_enter',{portalId:portal.id});await assert.rejects(command(ids[4],'adventure_mist_enter',{portalId:portal.id}),/Portal/);assert.equal(q.prepare('SELECT entered FROM adventure_portals').get().entered,4);
 const run=a.current(ids[0]);await tx(()=>{run.state.clear=true;a.save(run);q.prepare("UPDATE monsters SET hp=0 WHERE area=?").run(run.area);q.prepare('UPDATE adventure_members SET contribution=1 WHERE player_id=?').run(ids[0]);});
 await assert.rejects(command(ids[1],'adventure_chest'),/mücadele/);
 const req=randomUUID();await command(ids[0],'adventure_chest',{},req);await command(ids[0],'adventure_chest',{},req);await command(ids[0],'adventure_chest');assert.equal(q.prepare('SELECT COUNT(*) n FROM adventure_chests WHERE player_id=?').get(ids[0]).n,1);
 now=run.deadline_ms+1;await tx(()=>a.step(run.id,new Set()));assert.equal(a.run(run.id).status,'closed');assert.equal(a.player(ids[0]).area,run.area,'offline data is left for owned admission');await tx(()=>a.settleAdmission(ids[0]));assert.equal(a.player(ids[0]).area,'forest');assert.equal(a.player(ids[0]).x,900);
});
test('Mist admin retains auth/CSRF origin gate and waits for durable configuration',async t=>{
 const q=new DatabaseSync(':memory:');t.after(()=>q.close());createAdventureSchema(q);let release,entered;const began=new Promise(r=>entered=r),held=new Promise(r=>release=r),admin=new NativeMistAdmin({sqlite:q,core511Configuration:{run:async(_,fn)=>{const result=fn();entered();await held;return result;}}});
 const source=patchNativeMistAdmin(patchNativeTowerAdminRoutes(nativeAdminSource).source).source,r=adminHandlers({source,database:{core511MistAdmin:admin},snapshot:async()=>({settings:{}})}),request=body=>adminRequest({method:'POST',query:'?core511=mist',body});
 r.setUser(null);assert.equal((await r.post(request({action:'sis_mist_get'}))).status,403);r.setUser({id:'admin-fixture',email:'admin@fixture.invalid'});
 assert.equal((await r.post(adminRequest({method:'POST',query:'?core511=mist',origin:'https://wrong.invalid',body:{action:'sis_mist_get'}}))).status,403);
 let done=false;const task=r.post(request({action:'sis_mist_save',revision:1,config:MIST_DEFAULTS})).then(x=>{done=true;return x;});await began;assert.equal(done,false);release();assert.equal((await task).status,200);assert.equal(admin.get().revision,2);
 await assert.rejects(admin.act({action:'sis_mist_save',revision:1,config:MIST_DEFAULTS}),{status:409});
});

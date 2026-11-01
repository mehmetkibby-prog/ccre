import test from 'node:test';
import assert from 'node:assert/strict';
import {httpActionFixture} from './native-http-action-fixture.mjs';

test('native AFK controls preserve time-credit limits and guards while refreshing the current owner',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,sql=f.sql,call=(action,headers={})=>s.module.default(f.request({path:'/api/afk-hunt',body:{action},headers})),state=()=>sql.prepare('SELECT * FROM afk_hunt_state WHERE player_id=?').get(f.id),set=fn=>core.permanentPlayers([f.id],fn);
 assert.equal((await call('invented')).status,400);assert.equal((await call('start',{'X-CSRF-Token':'bad'})).status,403);assert.equal((await call('start')).status,403);
 for(const [level,hp,gm]of [[29,100,1],[30,0,1],[30,100,0]]){await set(()=>sql.prepare("UPDATE players SET area='afk',level=?,hp=?,is_gm=? WHERE id=?").run(level,hp,gm,f.id));assert.equal((await call('start')).status,403);}
 await set(()=>sql.prepare('UPDATE players SET hp=100,is_gm=1 WHERE id=?').run(f.id));const started=await call('start');assert.equal(started.status,200);assert.equal((await started.json()).active,true);assert.equal(state().active,1);assert.equal((await s.resources(f.id)).afk.active,1);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET tick_at_ms=?,used_ms=0 WHERE player_id=?').run(Date.now()-1000,f.id));const tick=await call('tick');assert.equal(tick.status,200);assert(state().used_ms>=1000&&state().used_ms<5000);assert.equal((await s.resources(f.id)).afk.used_ms,state().used_ms);
 assert.equal((await call('stop')).status,200);assert.equal(state().active,0);assert.equal((await s.resources(f.id)).afk.active,0);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET active=1,tick_at_ms=?,used_ms=0 WHERE player_id=?').run(Date.now()-16000,f.id));assert.equal((await call('tick')).status,200);assert.equal(state().active,0);assert.equal(state().used_ms,0);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET active=1,tick_at_ms=?,used_ms=7199900,bonus_ms=0 WHERE player_id=?').run(Date.now()-1000,f.id));assert.equal((await call('tick')).status,200);assert.equal(state().used_ms,7200000);assert.equal(state().active,0);assert.equal((await call('start')).status,409);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET bonus_ms=7200000 WHERE player_id=?').run(f.id));assert.equal((await call('start')).status,200);assert.equal((await s.resources(f.id)).afk.bonus_ms,7200000);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET tick_at_ms=?,used_ms=14399900 WHERE player_id=?').run(Date.now()-1000,f.id));assert.equal((await call('tick')).status,200);assert.equal(state().used_ms,14400000);assert.equal((await call('start')).status,409);
 await set(()=>sql.prepare('UPDATE afk_hunt_state SET day=day-1,active=1 WHERE player_id=?').run(f.id));const reset=await s.module.default(f.request({path:'/api/afk-hunt',method:'GET'}));assert.equal(reset.status,200);assert.equal(state().used_ms,0);assert.equal(state().bonus_ms,0);assert.equal(state().active,0);assert.equal((await s.resources(f.id)).afk.day,state().day);assert.equal((await s.resources(f.id)).afk.active,0);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

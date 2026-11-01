import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../../working/core511-source/scripts/core511/writer-runtime.mjs';
import {createAttackWriterHandler,readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';

test('primary expected-frame guards cannot be bypassed by request flags or an extra argument',{timeout:30000},async t=>{
 const s=await setupPvp(t),sql=s.sql,writer=new GameWriter(s.f.database,{realmId:'r86-primary',clock:()=>s.nowMs,ports:{guard:()=>true}});
 await writer.initialize();
 sql.prepare("UPDATE players SET area='forest',channel=1,x=1000,y=1000,hp=1000,max_hp=1000 WHERE id=?").run(s.id);
 const target='golge-r86-primary';
 put(sql,'monsters',{id:target,name:'Gölge',area:'forest',channel:1,x:1020,y:1000,hp:1,max_hp:1,spawn_round:17});
 const handler=createAttackWriterHandler({settingsFor:()=>writer.settingsCache.read(sql),globalsFor:()=>writer.services.globals,
  assertOwnership:()=>true,assertResources:()=>true,settleRetaliation:()=>null,clock:()=>s.nowMs});
 const context={actor:s.id,epoch:1,key:'r86-guard',realm:'r86-primary',peer:{channel:1,incarnation:'r86-peer'}};
 const cases=[
  ['stale player',p=>p.expected.player.x++,'attack_frame_conflict'],
  ['stale monster',p=>p.expected.monster.hp++,'attack_frame_conflict'],
  ['stale settings',p=>p.expected.settings.r86_unknown=true,'attack_settings_conflict'],
  ['public fresh flags',p=>{p.expected.player.x++;p.fresh=true;p.batchReadR61={fresh:true};},'attack_frame_conflict'],
  ['missing expected',p=>delete p.expected,'attack_frame_conflict'],
 ];
 for(const [name,change,code]of cases)await t.test(name,()=>{
  const expected={...readAttackFrame(sql,s.id,target,writer.services.globals),settings:{...writer.settingsCache.read(sql)}};
  const payload={nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:'1'.repeat(64),input:{action:'attack',targetId:target,spawnRound:17,ability:0},expected,
   resources:['player:'+s.id,'monster:'+target],localScope:{kind:'kill',targets:[{id:target,spawnRound:17}]}};
  change(payload);const before=sql.prepare('SELECT hp FROM monsters WHERE id=?').get(target).hp;
  sql.exec('SAVEPOINT r86_guard');
  try{assert.throws(()=>handler(sql,payload,context,{fresh:true}),error=>error.code===code);}
  finally{sql.exec('ROLLBACK TO r86_guard;RELEASE r86_guard');}
  assert.equal(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(target).hp,before);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id=?').get(target).n,0);
 });
});

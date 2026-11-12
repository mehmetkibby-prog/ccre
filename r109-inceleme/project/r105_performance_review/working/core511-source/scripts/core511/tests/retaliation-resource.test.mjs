import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,json} from './pvp-fixture.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {readRetaliationFrame} from '../retaliation-writer.mjs';

async function setup(t,{shared=false,resourceGuard=()=>true}={}){
 const s=await setupPvp(t);s.reset({area:'forest',actor:{hp:1,gems:103}});s.sql.prepare('UPDATE players SET channel=4 WHERE id=?').run(s.id);s.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(s.id);
 const mid='golge-native-lethal-resource',monster={id:mid,name:'Native lethal resource',area:'forest',channel:shared?0:4,x:1000,y:1000,hp:1000000,max_hp:1000000,spawn_round:17};put(s.sql,'monsters',monster);
 const writer=new GameWriter(s.f.database,{realmId:'retaliation-resource',clock:()=>s.nowMs,ports:{guard:()=>true,assertResources:resourceGuard}});await writer.initialize();const peer={channel:4,incarnation:'native-lethal-resource-owner'};await writer.register(peer);const owner=await writer.admit(s.id,peer,{sessionId:'retaliation-resource-session',guard:()=>true});
 const rules=createRetaliationRules({globals:writer.services.globals,now:()=>s.nowMs}),player=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id);s.db.batch(rules.preparePveEngagement(s.db,player,monster,s.nowMs-5000));
 const row=s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id),entry=JSON.parse(row.attackers489)[mid],engagement={...row,...entry},frame=readRetaliationFrame(s.sql,s.id,[engagement]);
 const payload={nowMs:s.nowMs,seed:s.seed,engagement,row,frame:{player:frame.player,monster:frame.monsters[0],armorItems:frame.armorItems},settings:s.settings,resources:['player:'+s.id,'monster:'+mid]},request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'native-lethal-resource-once',operation:'retaliation_death',payload};
 const capture=()=>json(Object.fromEntries(['players','pve_engagements','kernel511_channel_receipts'].map(table=>[table,s.sql.prepare('SELECT * FROM '+table).all()])));
 return {...s,mid,writer,peer,request,payload,capture};
}

test('native lethal retaliation cannot omit its actually held monster resource',async t=>{
 const s=await setup(t);s.payload.resources=['player:'+s.id];const before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request),{code:'retaliation_monster_unlocked'});assert.deepEqual(s.capture(),before);
});
test('native lethal C0 retaliation cannot bypass the shared writer authority with a declared key',async t=>{
 const s=await setup(t,{shared:true}),before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request),{code:'shared_writer_lease_required'});assert.deepEqual(s.capture(),before);
});
test('native lethal retaliation invokes the required resource guard before any death or receipt',async t=>{
 let calls=0;const s=await setup(t,{resourceGuard:()=>{calls++;return false;}}),before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request),{code:'retaliation_resources_fenced'});assert.equal(calls,1);assert.deepEqual(s.capture(),before);
});

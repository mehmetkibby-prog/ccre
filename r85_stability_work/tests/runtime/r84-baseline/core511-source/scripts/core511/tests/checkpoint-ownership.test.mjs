import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,json} from './pvp-fixture.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';

async function setup(t){
 const f=await setupPvp(t),writer=new GameWriter(f.f.database,{realmId:'checkpoint-scope',clock:()=>f.nowMs,ports:{guard:()=>true,assertResources:()=>true}});await writer.initialize();const peer={channel:1,incarnation:'checkpoint-channel-1'},foreign={channel:2,incarnation:'checkpoint-channel-2'};await writer.register(peer);await writer.register(foreign);
 const owner=await writer.admit(f.id,peer,{sessionId:'checkpoint-session',guard:()=>true});f.sql.prepare('UPDATE players SET channel=2 WHERE id=?').run(f.targetId);await writer.admit(f.targetId,foreign,{sessionId:'checkpoint-foreign-session',guard:()=>true});await writer.admit('rival-extra',peer,{sessionId:'checkpoint-local-session',guard:()=>true});
 for(const channel of [0,1,2])put(f.sql,'monsters',{id:'checkpoint-monster-'+channel,name:'Checkpoint scope fixture',channel,area:'forest',x:1000,y:1000,hp:100,max_hp:100,spawn_round:9100+channel,is_boss:1});
 const payload=(changes={})=>{const journal=new CombatCheckpoints({submit:()=>assert.fail('fixture journal must not submit')});journal.hydrate('monsters',f.sql.prepare("SELECT * FROM monsters WHERE id LIKE 'checkpoint-monster-%'").all());journal.changed(changes);return journal.snapshot();};
 const monster=channel=>({...f.sql.prepare('SELECT * FROM monsters WHERE id=?').get('checkpoint-monster-'+channel),hp:99});
 const participant=(channel,id)=>({monster_id:'checkpoint-monster-'+channel,spawn_round:9100+channel,player_id:id,created_at:Math.floor(f.nowMs/1000),stone_damage476:1,stone_first_hit_at_ms476:f.nowMs});
 const boss=(channel,id)=>({boss_round:9100+channel,player_id:id,hit_count:1,total_damage:1,created_at:Math.floor(f.nowMs/1000)});
 const event=(actor,target)=>({player_id:actor,target_id:target,role:'avci',ability:0,created_at:Math.floor(f.nowMs/1000)});
 const request=changes=>({playerId:f.id,epoch:owner.epoch,sequence:1,operationId:'checkpoint-scope-write',operation:'combat_checkpoint',payload:payload(changes)});
 const capture=()=>json(Object.fromEntries(['monsters','monster_participants','boss_participants','combat_events','kernel511_channel_receipts','kernel511_system_receipts'].map(table=>[table,f.sql.prepare('SELECT * FROM '+table).all()])));
 return {...f,writer,peer,foreign,owner,payload,monster,participant,boss,event,request,capture};
}

for(const [name,changes,code]of [
 ['foreign channel monster',s=>({monsters:[s.monster(2)]}),'system_monster_scope'],
 ['independent shared monster',s=>({monsters:[s.monster(0)]}),'system_monster_scope'],
 ['foreign channel contribution',s=>({participants:[s.participant(2,s.id)]}),'system_monster_scope'],
 ['foreign player contribution',s=>({participants:[s.participant(1,s.targetId)]}),'system_participant_scope'],
 ['foreign boss contribution',s=>({bossParticipants:[s.boss(2,s.id)]}),'system_boss_scope'],
 ['foreign PvP event target',s=>({combatEvents:[s.event(s.id,s.targetId)]}),'system_participant_scope']
])test('owned combat checkpoint rejects '+name+' without trusting external resource callbacks',async t=>{
 const s=await setup(t),before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request(changes(s))),{code});assert.deepEqual(s.capture(),before);assert.equal(s.writer.authority.owner(s.id).sequence,0);
});

test('native local checkpoint and shared historical credit keep their distinct actual owner scopes and replay once',async t=>{
 const s=await setup(t),request=s.request({monsters:[s.monster(1)],participants:[s.participant(1,'rival-extra')],bossParticipants:[s.boss(1,s.id)],combatEvents:[s.event(s.id,'checkpoint-monster-1')]}),ack=await s.writer.command(s.peer,request);assert.equal(s.sql.prepare("SELECT hp FROM monsters WHERE id='checkpoint-monster-1'").get().hp,99);const after=s.capture();assert.deepEqual(json(await s.writer.command(s.peer,request)),json(ack));assert.deepEqual(s.capture(),after);
 const world={realm:'checkpoint-scope',channel:0,role:'world',incarnation:'checkpoint-world'};await s.writer.system.register(world);const owner=s.writer.system.owner('world'),shared={epoch:owner.epoch,sequence:1,key:'checkpoint-shared-historical',kind:'combat_checkpoint',payload:s.payload({monsters:[s.monster(0)],participants:[s.participant(0,s.targetId)],bossParticipants:[s.boss(0,s.targetId)],combatEvents:[s.event(s.targetId,'checkpoint-monster-0')]})};
 const sharedAck=await s.writer.system.command(world,shared);assert.equal(s.sql.prepare("SELECT hp FROM monsters WHERE id='checkpoint-monster-0'").get().hp,99);assert.deepEqual(json(await s.writer.system.command(world,shared)),json(sharedAck));assert.equal(s.writer.authority.owner(s.targetId).channel,2);
});

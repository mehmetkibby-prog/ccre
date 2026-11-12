import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,json} from './pvp-fixture.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {settlementFootprint,settlementNeedsShared,coldSettlementResources} from '../settlement-resources.mjs';

async function setup(t,{channel=1,dead=false,oldLife=false,otherArea=false,futureHead=false}={}){
 const f=await setupPvp(t);f.reset({area:'forest',actor:{hp:500,max_hp:1000,potions:3}});const writer=new GameWriter(f.f.database,{realmId:'settlement-scope',clock:()=>f.nowMs,ports:{guard:()=>true,assertResources:()=>true}});await writer.initialize();const peer={channel:1,incarnation:'settlement-scope-owner'};await writer.register(peer);const owner=await writer.admit(f.id,peer,{sessionId:'settlement-scope-session',guard:()=>true}),mid='golge-settlement-scope';
 put(f.sql,'monsters',{id:mid,name:'Settlement scope fixture',channel,area:otherArea?'black':'forest',x:1000,y:1000,hp:dead?0:1000,max_hp:1000,spawn_round:2,stun_until_ms:f.nowMs+2000});const entry={monster_id:mid,spawn_round:oldLife?1:2,next_hit_at_ms:f.nowMs-1,last_skill_at_ms:f.nowMs-2000},row={player_id:f.id,...entry,next_hit_at_ms:futureHead?f.nowMs+1000:entry.next_hit_at_ms,expires_at_ms:f.nowMs+8000,hit_sequence:0,updated_at_ms:f.nowMs,attackers489:JSON.stringify({[mid]:entry})};put(f.sql,'pve_engagements',row);
 const request={playerId:f.id,epoch:owner.epoch,sequence:1,operationId:'settlement-scope-potion',operation:'native_action',payload:{input:{action:'use_potion'},nowMs:f.nowMs,receivedAtMs:f.nowMs,seed:f.seed,resources:['player:'+f.id],expected:{player:readAttackFrame(f.sql,f.id,'',writer.services.globals).player,settings:f.settings}}};
 const capture=()=>json(Object.fromEntries(['players','monsters','pve_engagements','kernel511_channel_receipts'].map(table=>[table,f.sql.prepare('SELECT * FROM '+table).all()])));return {...f,writer,peer,owner,mid,row,request,capture};
}

for(const channel of [0,1])test('writer independently rejects unlocked '+(channel?'local':'shared')+' incoming settlement despite permissive external callback',async t=>{
 const s=await setup(t,{channel}),before=s.capture();await assert.rejects(s.writer.command(s.peer,s.request),{code:'settlement_monster_unlocked'});assert.deepEqual(s.capture(),before);
 await assert.rejects(s.writer.command(s.peer,{...s.request,payload:{...s.request.payload,resources:[...s.request.payload.resources,'monster:unrelated-monster']}}),{code:'settlement_monster_unlocked'});assert.deepEqual(s.capture(),before);
 s.request.payload.resources.push('monster:'+s.mid);
 if(channel===0){await assert.rejects(s.writer.command(s.peer,s.request),{code:'shared_writer_lease_required'});assert.deepEqual(s.capture(),before);}
 else{const ack=await s.writer.command(s.peer,s.request);assert.equal(ack.result.result.body.hp,700);assert.equal(ack.result.result.body.potions,2);const after=s.capture();assert.deepEqual(json(await s.writer.command(s.peer,s.request)),json(ack));assert.deepEqual(s.capture(),after);}
});

test('potion read ownership cannot authorize even a trigger-side monster mutation',async t=>{
 const s=await setup(t),before=s.capture();s.request.payload.resources.push('monster:'+s.mid);
 s.sql.exec("CREATE TEMP TRIGGER forbidden_potion_monster AFTER UPDATE OF potions ON main.players BEGIN UPDATE monsters SET hp=hp-1; END");
 await assert.rejects(s.writer.command(s.peer,s.request),{code:'potion_monster_write_forbidden'});assert.deepEqual(s.capture(),before);
});

test('native dead, old-life, foreign and absent-scope encounters still clear without borrowing another owner',async t=>{
 for(const options of [{dead:true},{oldLife:true},{channel:2},{otherArea:true}]){
  const s=await setup(t,options),ack=await s.writer.command(s.peer,s.request);assert.equal(ack.result.result.body.hp,700,JSON.stringify(options));assert.equal(ack.result.result.body.potions,2);assert.equal(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id),undefined);
 }
});

test('settlement footprint uses original request time and head gate for all native travel branches without SQL',async t=>{
 const s=await setup(t,{futureHead:true}),monster=s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.mid),view={engagements:new Map([[s.id,s.row]]),monster:id=>id===s.mid?monster:null};const ack=await s.writer.command(s.peer,s.request);assert.equal(ack.result.result.body.hp,700);assert(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id));
 view.engagements.set(s.id,{...s.row,next_hit_at_ms:s.nowMs-1});const prepare=s.sql.prepare;s.sql.prepare=()=>assert.fail('resident settlement footprint used SQL');try{
  for(const action of ['use_potion','travel_event','travel_dragon','travel_rune_v2','travel_rune','travel_ancient','travel_afk','travel_market','travel_forest','travel_frozen','travel_fishing','travel_sanctum','travel_sinsi','travel_war','travel_black']){assert.deepEqual(settlementFootprint(view,s.id,{action},s.nowMs),['monster:'+s.mid]);assert.deepEqual(settlementFootprint(view,s.id,{action},s.nowMs-2),[]);assert.equal(settlementNeedsShared(view,s.id,{action},s.nowMs),false);}
  assert.deepEqual(settlementFootprint(view,s.id,{action:'start_fishing'},s.nowMs),[]);monster.channel=0;assert.equal(settlementNeedsShared(view,s.id,{action:'use_potion'},s.nowMs),true);delete monster.channel;assert.equal(settlementNeedsShared({...view,monster:()=>null},s.id,{action:'travel_market'},s.nowMs),true);
 }finally{s.sql.prepare=prepare;}
});

test('cold native reads include future current-life local/shared targets and preserve original stale-life and foreign clearing',async t=>{
 for(const options of [{channel:0},{channel:1,futureHead:true},{channel:2},{dead:true},{oldLife:true},{otherArea:true}]){
  const s=await setup(t,options),expected=options.channel===0||options.futureHead?[{channel:options.channel,resources:['monster:'+s.mid]}]:[];assert.deepEqual(coldSettlementResources(s.sql,s.id),expected,JSON.stringify(options));
 }
 const s=await setup(t);s.sql.prepare('DELETE FROM monsters WHERE id=?').run(s.mid);assert.deepEqual(coldSettlementResources(s.sql,s.id),[{channel:0,resources:['monster:'+s.mid]}],'missing target still crosses the shared FIFO before original cleanup');
});

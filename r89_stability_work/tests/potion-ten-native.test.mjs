import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {setupPvp,put} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {temporary} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/tests/helpers.mjs';
import {LocalDatabase} from '/workspace/ccre/r89_stability_work/working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {GameWriter} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/writer-runtime.mjs';
import {readAttackFrame} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/attack-writer.mjs';
import {readReceipt,replayValue} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/compact-receipt.mjs';
import {ActorCheckpoints} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/actor-checkpoint.mjs';
import {ResidentState} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/resident-state.mjs';
import {POTION_BATCH_LIMIT_R86} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/potion-batch-writer-r61.mjs';
import {POTION_BATCH_EXTRA_LIMIT_R61} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/potion-batch-channel-r61.mjs';
import {sourceIdentity} from '/workspace/ccre/r89_stability_work/working/core511-source/scripts/core511/source-identity.mjs';
const BASE=sourceIdentity().sha256;
test('ten native potions equal serial healing and charge debit; replay exact; tenth SQL failure rolls back every actor',{timeout:50000},async t=>{
 assert.equal(POTION_BATCH_LIMIT_R86,10);assert.equal(POTION_BATCH_EXTRA_LIMIT_R61,9);
 const f=await setupPvp(t),sql=f.sql,now=f.nowMs,seedWriter=new GameWriter(f.f.database,{realmId:'potion-ten-seed',clock:()=>now,ports:{guard:()=>true}});await seedWriter.initialize();
 const ids=Array.from({length:10},(_,i)=>'potion-native-'+i),template=sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);
 for(let i=0;i<10;i++){
  const account=sql.prepare('SELECT * FROM accounts WHERE id=?').get(template.account_id),accountId='potion-account-'+i;
  put(sql,'accounts',{...account,id:accountId,username:'Potion'+i,username_normalized:'potion'+i,email:'potion'+i+'@fixture.invalid',email_normalized:'potion'+i+'@fixture.invalid'});
  put(sql,'players',{...template,id:ids[i],account_id:accountId,name:'NativePotion'+i,area:'forest',channel:1,role:'avci',x:2700+i*10,y:2025,hp:100,max_hp:1000,level:40,last_seen:Math.floor(now/1000),loadlab_run_id:'',potions:3,auto_potion_owned:1,auto_potion_enabled:1,auto_potion_remaining:400,auto_potion_total:400,auto_potion_at_ms:0});
 }
 sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const dir=temporary(t),files=Object.fromEntries(['serial','batch','rollback'].map(mode=>[mode,path.join(dir,mode+'.sqlite')]));for(const file of Object.values(files))fs.copyFileSync(f.f.file,file);
 const outputs={},idJson=JSON.stringify(ids);
 for(const mode of ['serial','batch','rollback']){
  const db=new LocalDatabase(files[mode],{create:false,groupWrites:true,asyncDurable:false});t.after(()=>db.close());const writer=new GameWriter(db,{realmId:'potion-ten',clock:()=>now,ports:{guard:()=>true}});await writer.initialize();const q=db.sqlite,peer={channel:1,incarnation:'potion-ten-owner'},owners=[];await writer.register(peer);
  q.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(now/1000));});
  for(const id of ids)owners.push(await writer.admit(id,peer,{sessionId:'potion-session-'+id,guard:()=>true}));
  const state=new ResidentState(1),checkpoints=new ActorCheckpoints({state,clock:()=>now,submit:()=>assert.fail('oracle journals join native transaction')});
  for(let i=0;i<10;i++){state.put('players',q.prepare('SELECT * FROM players WHERE id=?').get(ids[i]));state.claim(ids[i],owners[i].epoch);checkpoints.hydrate(state.read('players',ids[i]));}
  const payload=i=>{const frame=readAttackFrame(q,ids[i],'',writer.services.globals);return {input:{action:'use_potion',automatic:true},nowMs:now,receivedAtMs:now,seed:createHash('sha256').update('potion-seed-'+i).digest('hex'),expected:{player:frame.player,settings:writer.settingsCache.read(q)},resources:['player:'+ids[i]],claimActorsR56:[{actor:ids[i],epoch:owners[i].epoch,payload:checkpoints.captureR53(ids[i]).payload}]};};
  const snapshot=()=>({players:q.prepare('SELECT id,hp,max_hp,hp_revision,potions,auto_potion_owned,auto_potion_enabled,auto_potion_remaining,auto_potion_total,auto_potion_at_ms,x,y,position_revision,gems,essence FROM players WHERE id IN(SELECT value FROM json_each(?)) ORDER BY id').all(idJson),encounters:q.prepare('SELECT * FROM pve_engagements WHERE player_id IN(SELECT value FROM json_each(?)) ORDER BY player_id').all(idJson)});
  const before=snapshot(),requests=[],acks=[],attempts=[];
  if(mode==='rollback'){
   q.function('r86_seen_potion',id=>{attempts.push(id);return 1;});
   q.exec("CREATE TRIGGER r86_late_potion_failure AFTER UPDATE OF auto_potion_remaining ON players WHEN NEW.auto_potion_remaining<OLD.auto_potion_remaining BEGIN SELECT r86_seen_potion(NEW.id); SELECT CASE WHEN NEW.id='potion-native-9' THEN RAISE(ABORT,'r86_late_potion_failure') END; END");
  }
  for(let i=0;i<(mode==='serial'?10:1);i++){
   let p;
   if(mode==='serial')p=payload(i);else{const entries=ids.map((actor,j)=>({actor,epoch:owners[j].epoch,sequence:1,payload:payload(j)}));p={...entries[0].payload,resources:ids.map(id=>'player:'+id),batchPotionsR61:entries};}
   const request={playerId:ids[i],epoch:owners[i].epoch,sequence:1,operationId:'potion-ten-operation-'+i,operation:'native_action',payload:p};requests.push(request);
   if(mode==='rollback'){acks.push(await writer.command(peer,request));break;}
   acks.push(await writer.command(peer,request));
  }
  if(mode==='rollback'){
   assert.deepEqual(attempts,ids,'each earlier native debit was attempted before the tenth SQL failure');assert.deepEqual(snapshot(),before);assert.deepEqual(acks[0].result.cancelActorsR61,ids);assert.equal(acks[0].result.potionBatchResultsR61.length,10);for(const row of acks[0].result.potionBatchResultsR61){assert.equal(row.value.result.status,409);assert.equal(row.value.result.body.not_executed,true);}assert.equal(q.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(requests[0].operationId).n,1);const replay=await writer.command(peer,requests[0]);assert.deepEqual(replay,JSON.parse(JSON.stringify(replayValue(acks[0]))));assert.deepEqual(snapshot(),before);assert.equal(attempts.length,10);outputs.rollback={attempted:attempts.length,allPlayersUnchanged:true,durableNegativeReceiptReplay:true};continue;
  }
  const replies=mode==='serial'?acks.map(a=>a.result.result):acks[0].result.potionBatchResultsR61.map(r=>r.value.result);assert.equal(replies.length,10);for(const reply of replies)assert.equal(reply.status,200,JSON.stringify(reply));
  const after=snapshot();for(let i=0;i<10;i++){const p=after.players[i],old=before.players[i];assert(p.hp>old.hp);assert.equal(old.auto_potion_remaining-p.auto_potion_remaining,p.hp-old.hp);assert.equal(p.potions,old.potions);assert.equal(p.gems,old.gems);}
  for(let i=0;i<requests.length;i++){const stored=readReceipt(q,q.prepare('SELECT response FROM kernel511_channel_receipts WHERE operation_id=?').get(requests[i].operationId).response),replay=await writer.command(peer,requests[i]);assert.deepEqual(replay,stored);assert.deepEqual(replay,JSON.parse(JSON.stringify(replayValue(acks[i]))));}assert.deepEqual(snapshot(),after);
  outputs[mode]={economics:after,replies:JSON.parse(JSON.stringify(replies)),receipts:requests.length};
 }
 assert.deepEqual(outputs.batch.economics,outputs.serial.economics);assert.deepEqual(outputs.batch.replies,outputs.serial.replies);assert.equal(sourceIdentity().sha256,BASE);
 fs.writeFileSync(new URL('../evidence/potion-ten-native-parity-r86.json',import.meta.url),JSON.stringify({passed:true,coreSHA256:BASE,scope:'Ten actual GameWriter native automatic potions, exact charge/heal parity versus serial, durable receipt replay, tenth SQLite trigger failure after all earlier debit attempts rolls back all players and retains only the proven negative receipt for replay. External security fixture allows; native owner, resource, journal and transaction paths real. No performance claim.',outputs},null,2)+'\n');
});

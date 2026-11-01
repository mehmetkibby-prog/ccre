import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {setupPvp,put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {temporary} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {LocalDatabase} from '../../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {GameWriter} from '../../working/core511-source/scripts/core511/writer-runtime.mjs';
import {readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';
import {readReceipt,replayValue} from '../../working/core511-source/scripts/core511/compact-receipt.mjs';
import {sourceIdentity} from '../../working/core511-source/scripts/core511/source-identity.mjs';

const BASE='572129943dbd0df97818f6b53b4e12defa42b87483f3d456e669881edc1e9356';
test('ten native independent kills with25 held party actors equal serial native awards',{timeout:50000},async t=>{
 assert.equal(sourceIdentity().sha256,BASE);
 const f=await setupPvp(t),sql=f.sql,now=f.nowMs,seedWriter=new GameWriter(f.f.database,{realmId:'ten-seed',clock:()=>now,ports:{guard:()=>true}});await seedWriter.initialize();
 const ids=Array.from({length:25},(_,i)=>'ten-native-'+i),targets=ids.slice(0,10).map((id,i)=>'golge-ten-native-'+i),template=sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);
 // Match installed channel capacity and leave all25 slots to this party-boundary fixture.
 sql.exec('UPDATE game_settings SET channel_capacity=25 WHERE id=1; UPDATE players SET last_seen=0');
 for(let i=0;i<25;i++){
  const account=sql.prepare('SELECT * FROM accounts WHERE id=?').get(template.account_id),accountId='ten-account-'+i;put(sql,'accounts',{...account,id:accountId,username:'Ten'+i,username_normalized:'ten'+i,email:'ten'+i+'@fixture.invalid',email_normalized:'ten'+i+'@fixture.invalid'});
  put(sql,'players',{...template,id:ids[i],account_id:accountId,name:'NativeTen'+i,area:'forest',channel:1,role:i%2?'arkanist':'avci',x:2700+i*10,y:2025,hp:100000,max_hp:1000000,level:40,xp:0,rank_tier:0,rank_xp:0,rank_started_at:0,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,last_seen:Math.floor(now/1000),loadlab_run_id:''});
  if(i<10&&i%2===0){sql.prepare('UPDATE players SET level=65 WHERE id=?').run(ids[i]);sql.prepare('UPDATE players SET rank_forest=rank_forest WHERE id=?').run(ids[i]);assert.equal(sql.prepare('SELECT rank_tier FROM players WHERE id=?').get(ids[i]).rank_tier,1);sql.prepare('UPDATE players SET hp=100000,max_hp=1000000,rank_xp=100 WHERE id=?').run(ids[i]);}
  if(i<10)put(sql,'monsters',{id:targets[i],name:'Gölge',area:'forest',channel:1,x:2720+i*10,y:2025,hp:1,max_hp:1,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});
 }
 const groups=Array.from({length:10},(_,i)=>[ids[i],...(i<5?[ids[10+i*2],ids[11+i*2]]:[ids[20+i-5]])]);
 for(let i=0;i<groups.length;i++){put(sql,'parties',{id:'ten-party-'+i,leader_id:ids[i],created_at:1});for(const id of groups[i])put(sql,'party_members',{party_id:'ten-party-'+i,player_id:id,joined_at:1});}
 const material=JSON.parse(sql.prepare('SELECT materials_json FROM progression_settings WHERE id=1').get().materials_json);for(const value of Object.values(material)){value.chance=100;value.min=2;value.max=2;}sql.prepare('UPDATE progression_settings SET materials_json=?,revision=revision+1 WHERE id=1').run(JSON.stringify(material));
 sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const dir=temporary(t),files={serial:path.join(dir,'serial.sqlite'),batch:path.join(dir,'batch.sqlite')};for(const file of Object.values(files))fs.copyFileSync(f.f.file,file);
 const outputs={},idJson=JSON.stringify(ids),targetJson=JSON.stringify(targets);
 for(const mode of ['serial','batch']){
  const db=new LocalDatabase(files[mode],{create:false,groupWrites:true,asyncDurable:false});t.after(()=>db.close());const writer=new GameWriter(db,{realmId:'ten-native',clock:()=>now,ports:{guard:()=>true}});await writer.initialize();const q=db.sqlite,peer={channel:1,incarnation:'ten-native-owner'},owners=[];await writer.register(peer);
  for(const id of ids)owners.push(await writer.admit(id,peer,{sessionId:'ten-session-'+id,guard:()=>true}));
  const input=i=>({action:'attack',targetId:targets[i],spawnRound:17,ability:0,intentId:'ten-intent-'+i}),seed=i=>createHash('sha256').update('ten-seed-'+i).digest('hex');
  const payload=(i,all=false)=>{const frame=readAttackFrame(q,ids[i],targets[i],writer.services.globals);return {nowMs:now,receivedAtMs:now,seed:seed(i),input:input(i),expected:{...frame,settings:writer.settingsCache.read(q)},resources:(all?ids:groups[i]).map(id=>'player:'+id).concat((all?targets:[targets[i]]).map(id=>'monster:'+id)),localScope:{kind:'kill',targets:(all?targets:[targets[i]]).map(id=>({id,spawnRound:17}))}};};
  const requests=[],acks=[];
  for(let i=0;i<(mode==='serial'?10:1);i++){
   const p=payload(i,mode==='batch');if(mode==='batch')p.batchAttacksR57=ids.slice(1,10).map((actor,j)=>({actor,epoch:owners[j+1].epoch,sequence:1,receivedAtMs:now,seed:seed(j+1),input:input(j+1)}));
   const request={playerId:ids[i],epoch:owners[i].epoch,sequence:1,operationId:'ten-operation-'+i,operation:'attack',payload:p};requests.push(request);acks.push(await writer.command(peer,request));
  }
  const replies=mode==='serial'?acks.map(ack=>ack.result.result):[acks[0].result.result,...acks[0].result.batchResultsR57.map(row=>row.result)];assert.equal(replies.length,10);for(let i=0;i<10;i++){assert.equal(replies[i].status,200,JSON.stringify(replies[i]));assert(replies[i].body.hits.some(hit=>hit.id===targets[i]&&hit.killed));}
  const snapshot=()=>({players:q.prepare('SELECT id,level,xp,rank_tier,rank_xp,hp,max_hp,hp_revision,gems,essence,quest_kills438,daily_monster_kills FROM players WHERE id IN(SELECT value FROM json_each(?)) ORDER BY id').all(idJson),monsters:q.prepare('SELECT id,hp,spawn_round FROM monsters WHERE id IN(SELECT value FROM json_each(?)) ORDER BY id').all(targetJson),xp:q.prepare('SELECT monster_id,spawn_round,player_id FROM monster_xp_claims WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY monster_id,player_id').all(targetJson),claims:q.prepare('SELECT monster_id,spawn_round,player_id FROM normal_reward_claims WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY monster_id,player_id').all(targetJson),drops:q.prepare('SELECT id,owner_id,monster_id,kind,item_name,rarity,power,amount,role,enchantments,x,y FROM world_drops WHERE monster_id IN(SELECT value FROM json_each(?)) ORDER BY id').all(targetJson),materials:q.prepare('SELECT * FROM dungeon_materials WHERE player_id IN(SELECT value FROM json_each(?)) ORDER BY player_id,kind').all(idJson)});
  const economics=snapshot();assert.equal(economics.xp.length,25);assert.equal(economics.claims.length,10);assert.equal(economics.players.length,25);assert(economics.players.every(p=>Number(p.id.split('-').at(-1))<10&&Number(p.id.split('-').at(-1))%2===0?p.rank_xp>100:p.xp>0));
  for(let i=0;i<requests.length;i++){const stored=readReceipt(q,q.prepare('SELECT response FROM kernel511_channel_receipts WHERE operation_id=?').get(requests[i].operationId).response),replay=await writer.command(peer,requests[i]);assert.deepEqual(replay,stored);assert.deepEqual(replay,JSON.parse(JSON.stringify(replayValue(acks[i]))));}assert.deepEqual(snapshot(),economics);
  if(mode==='batch'){assert.equal(acks[0].result.players.length,25);assert.equal(acks[0].result.batchEngagementsR57.length,9);assert.equal(acks[0].result.independentDeathBatchR85.actors.length,10);assert.equal(acks[0].result.batchResultsR57.length,9);}
  outputs[mode]={economics,receipts:requests.length,results:replies.map(r=>({status:r.status,hits:r.body.hits.map(h=>({id:h.id,spawnRound:h.spawnRound,damage:h.damage,hp:h.hp,killed:h.killed}))}))};
 }
 assert.deepEqual(outputs.batch.economics,outputs.serial.economics);assert.deepEqual(outputs.batch.results,outputs.serial.results);
 fs.writeFileSync(new URL('../../evidence/independent-ten-native-party25-parity-r85.json',import.meta.url),JSON.stringify({passed:true,coreSHA256:BASE,sourceUnchanged:sourceIdentity().sha256===BASE,scope:'Current native FULL SQLite/GameWriter, 25 real owner epochs in10 complete parties, fixed independent per-actor seeds/time, five established ranks and20 ordinary actors; all native economic effects and drop IDs compared against ten serial commands. Intrinsic authority/resources/savepoints/receipts real; fixture external security port true. No OS topology or performance claim.',outputs},null,2)+'\n');
});

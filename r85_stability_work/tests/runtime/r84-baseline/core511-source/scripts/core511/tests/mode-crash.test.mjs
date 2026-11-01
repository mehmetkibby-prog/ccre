import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {setupPvp,json} from './pvp-fixture.mjs';
import {prepareModeCase,captureModes,modeGlobals} from './mode-fixture.mjs';
import {NativeModeServices} from '../mode-services.mjs';
import {createModeWriterHandler} from '../mode-writer.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';

test('each service mutation survives actual SIGKILL before/after native COMMIT without duplicated spend or grant',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest'});const dir=temporary(t),baseline=path.join(dir,'baseline.sqlite'),{LocalDatabase}=await native('vds-server/src/database.mjs');
 s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,baseline);
 const cases=[
  ...['rune_claim','rune_craft','rune_upgrade','rune_equip','rune_unequip'].map(action=>['rune',action]),
  ...['arena_market_buy','arena_market_wings','arena_market_exp'].map(action=>['arena_market',action]),
  ['battle_pass','battle_pass_buy'],['battle_pass','battle_pass_claim'],['battle_pass','battle_pass_claim',{track:'premium',tier:10}],
  ...[0,1,2].map(stage=>['community_claim','claim',{stage}]),
  ...['buy','donate','upgrade','invite','revoke'].map(action=>['guild_village',action]),
  ...['resource:gems','resource:xp','rune:rune_attack','arena:wings','premium:auto_potion'].map(itemId=>['cauldron','craft',{itemId}])
 ];let count=0;
 for(const [index,[kind,action,extra]]of cases.entries())for(const phase of ['before','after']){
  const file=path.join(dir,'case-'+index+'-'+phase+'.sqlite'),input=path.join(dir,'input-'+index+'-'+phase+'.json'),marker=path.join(dir,'marker-'+index+'-'+phase);fs.copyFileSync(baseline,file);
  let db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const payload=await prepareModeCase({...s,sql:db.sqlite},kind,action,extra),authority=new ChannelOwnership(db,{realmId:'mode-crash'});await authority.initialize();const peer={channel:1,incarnation:'mode-crash-boot'};await authority.registerProcess(1,peer.incarnation);
   const owner=await authority.admit(s.id,peer,{sessionId:'mode-crash-session',guard:()=>true}),request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'mode-once-'+index,operation:'mode',payload},before=captureModes(db.sqlite);
   db.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();db=null;fs.writeFileSync(input,JSON.stringify({request,peer}));
   const child=spawn(process.execPath,[path.join(import.meta.dirname,'mode-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',kind+'/'+action+'/'+phase+' '+stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_mode':'durable_mode_before_ack');
   db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,phase==='after'?1:0);
   if(phase==='before')assert.deepEqual(captureModes(db.sqlite),before,kind+'/'+action+' uncommitted state');else assert.notDeepEqual(captureModes(db.sqlite),before,kind+'/'+action+' must actually mutate before crash');
   const resumed=new ChannelOwnership(db,{realmId:'mode-crash'});await resumed.initialize();const services=new NativeModeServices(db.sqlite,{clock:()=>payload.nowMs,globals:modeGlobals});registerOwnedRule(resumed,'mode',createModeWriterHandler({services,assertOwnership:(sql,p,id,e)=>Boolean(resumed.assertAdmitted(sql,p,id,e)),assertResources:()=>true}));
   const result=await resumed.command(peer,request),onceState=captureModes(db.sqlite),again=await resumed.command(peer,request);assert.deepEqual(json(again),json(result));assert.deepEqual(captureModes(db.sqlite),onceState,kind+'/'+action+' replay');assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,1);count++;
  }finally{db?.close();}
 }
 t.diagnostic(count+' actual process kills, independently checked receipt existence before recovery');
});

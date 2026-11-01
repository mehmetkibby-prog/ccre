import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupPvp,put,update} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {ChannelOwnership} from '../../working/core511-source/scripts/core511/ownership.mjs';
import {ReadWorker} from '../../working/core511-source/scripts/core511/read-worker.mjs';
import {certifyActorSectionsR52,refreshActorSectionsR52} from '../../working/core511-source/scripts/core511/actor-section-reuse-r52.mjs';
import {captureCommitSectionsR57} from '../../working/core511-source/scripts/core511/actor-commit-sections-r57.mjs';
import {plain,diff,resident,image} from '../collect/collect-fixtures.mjs';

test('native rank + material commits preserve full actor image, including a simultaneous portal',async t=>{
 const s=await setupPvp(t),{sql,id,nowMs}=s;s.reset({area:'forest'});
 update(sql,'players',id,{level:65,rank_tier:1,rank_xp:100,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50,battle_pass_season:'material-season',battle_pass_xp:100});
 put(sql,'dungeon_materials',{player_id:id,kind:'weathered_iron',amount:7});
 const authority=new ChannelOwnership(s.f.database,{realmId:'r85-material-progress'});await authority.initialize();const peer={channel:1,incarnation:'r85-material-channel'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(id,peer,{sessionId:'r85-material-session',guard:()=>true});
 const reader=new ReadWorker(s.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());const access={account:sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,chatAfterId:0,starterReward:{claimed:true}},cycle=sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
 const read=async()=>plain((await reader.query('kernel511_actor_world',[id,1,peer.incarnation,owner.epoch,1,nowMs,access])).rows),cases=[];
 for(const portal of [false,true]){
  const before=await read(),f=resident(before),r=f.runtime,c=r.channel;
  c.world={cycle};c.frames={entries:new Map([[id,{valid:true}]])};c.view.engagements=new Map([[id,null]]);c.view.setEngagement=(id,row)=>c.view.engagements.set(id,row);c.setMonster=()=>{};r.clock=Date.now;c.owners.set(id,{...peer,epoch:owner.epoch});c.kernel.players.get(id).epoch=owner.epoch;r.adventure.portals=new Map(before.adventure.portals.map(p=>[p.id,p]));
  const result=await s.f.database.atomic(sql=>{
   sql.prepare('UPDATE players SET rank_xp=rank_xp+1 WHERE id=?').run(id);sql.prepare("UPDATE dungeon_materials SET amount=amount+3 WHERE player_id=? AND kind='weathered_iron'").run(id);
   let created;
   if(portal){
    put(sql,'adventure_runs',{id:'material-portal-run',kind:'mist',channel:1,cycle,area:'mist-material-portal',status:'active',created_ms:Date.now(),deadline_ms:0,revision:1,config:'{}',state:'{}'});
    created={id:'material-portal',run_id:'material-portal-run',channel:1,area:'forest',x:100,y:100,opens_ms:Date.now(),closes_ms:Date.now()+600000,gold:1,capacity:4,entered:0,source_key:'material-portal-source'};put(sql,'adventure_portals',created);
   }
   const value={result:{status:200,body:{ok:true}},players:[sql.prepare('SELECT * FROM players WHERE id=?').get(id)],engagement:null,monsters:[],sharedRefresh:{version:1,all:portal,actors:[id],tables:['players','dungeon_materials',...(portal?['adventure_portals','adventure_runs']:[])]},...(portal?{portalCreationR57:{version:1,cycle,channel:1,capturedAtMs:Date.now(),portals:[created]}}:{})};
   return captureCommitSectionsR57(sql,certifyActorSectionsR52(sql,'attack',{localScope:{kind:'kill'}},{actor:id,peer},value));
  });
  assert(result.actorSectionsR52?.readMaterialsR60);assert(result.actorCommitSectionsR57?.complete);assert.equal(refreshActorSectionsR52(r,plain(result)),true);
  const after=await read();delete after.slim;assert.deepEqual(diff(after,image(f)),[],portal?'portal and material plans compose':'material and rank mirror image');
  if(portal){assert(r.adventure.bundles.get(id).portals.some(p=>p.id==='material-portal'));assert(f.sub.data.adventure511.portals.some(p=>p.id==='material-portal'));}
  cases.push({portal,rankXp:after.player.rank_xp,material:after.adventure.towerInfo.inventory.weathered_iron,fullBundleEqual:true});
 }
 fs.writeFileSync(new URL('../../evidence/progress-material-native-differential-r85.json',import.meta.url),JSON.stringify({passed:true,cases,scope:'real native SQLite rank/material rows and full readonly actor-world image; production certification, bounded committed snapshot, portal/material refresh composition',liveTouched:false},null,2)+'\n');
});

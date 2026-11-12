import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentMaintenance} from '../resident-maintenance.mjs';
import {native} from './helpers.mjs';
const {createMaintenance438}=await native('vds-server/src/maintenance438.mjs');

test('resident maintenance preserves native deadline, monotonic revision, GM and owner-admin rules with map-only reads',()=>{
 let now=1000;const players=new Map([['normal',{id:'normal',account_id:'owner-account',is_gm:0}],['gm',{id:'gm',account_id:'gm-account',is_gm:1}]]),nativePolicy=createMaintenance438({now:()=>now,isGameMaster:id=>id==='gm-account'}),resident=new ResidentMaintenance({clock:()=>now,player:id=>players.get(id)});
 try{for(const p of players.values())resident.hydrate(p);for(const phase of ['waiting','open','maintenance','ended','normal']){
  const frame={revision:(nativePolicy.policy?.revision??0)+1,phase,startedAt:1000,deadlineMs:2000,adminAccountId:'owner-account',maintenanceText:'Bakım'};nativePolicy.apply(frame);resident.apply(frame);
  for(now of [999,1000,1999,2000,2001])for(const id of ['owner-account','gm-account','unknown'])for(const method of ['allows','deadline','isAdmin','isGameMaster','view'])assert.deepEqual(resident.policy[method](id),nativePolicy[method](id),method+':'+phase+':'+id+':'+now);
  assert.equal(resident.apply({...frame,phase:'normal'}).revision,frame.revision);assert.equal(resident.policy.policy.phase,phase);
 }
 resident.apply({revision:10,phase:'maintenance',startedAt:1000,deadlineMs:2000,adminAccountId:'owner-account',maintenanceText:'Bakım'});now=2001;assert.equal(resident.policy.allows('gm-account'),true);players.set('gm',{id:'gm',account_id:'gm-account',is_gm:0});assert.equal(resident.policy.allows('gm-account'),false);resident.forget('gm');assert.equal(resident.accounts.has('gm-account'),false);
 }finally{nativePolicy.close();resident.close();}
});

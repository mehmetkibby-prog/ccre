import test from 'node:test';
import assert from 'node:assert/strict';
import {retiredFreezeOwner} from '../freeze-redirect.mjs';
import {PermanentCoordinator} from '../permanent-coordinator.mjs';
import {until} from './helpers.mjs';

test('a retired freeze requires the exact trusted request and an active next-epoch admission',()=>{
 const id='actor',source={epoch:7,channel:1,incarnation:'old-process'},token='freeze-token',ack={id,...source,token,retired:true};
 const owner={state:'active',epoch:8,channel:4,incarnation:'target-process'},admission={epoch:8,channel:4};
 const authority={owner:()=>owner,admission:()=>admission};
 assert.deepEqual(retiredFreezeOwner(authority,id,source,ack,token),owner);
 for(const patch of [{id:'other'},{token:'wrong'},{epoch:6},{channel:2},{incarnation:'other-process'},{retired:false}])assert.throws(()=>retiredFreezeOwner(authority,id,source,{...ack,...patch},token),/freeze_retirement_scope/);
 for(const patch of [{state:'draining'},{epoch:7},{epoch:9},{channel:2}])assert.throws(()=>retiredFreezeOwner({...authority,owner:()=>({...owner,...patch})},id,source,ack,token),/freeze_retirement_owner/);
 assert.throws(()=>retiredFreezeOwner({...authority,admission:()=>null},id,source,ack,token),/freeze_retirement_owner/);
 assert.deepEqual(retiredFreezeOwner({...authority,admission:()=>null,simulation:()=>admission},id,source,ack,token),owner);
});

for(const explicit of [true,false])test('late cold-owner change '+(explicit?'uses explicit retirement before refreezing':'fails closed without explicit retirement'),async()=>{
 const owners=new Map([['a',{channel:1,incarnation:'old-a',epoch:1,sequence:3,state:'active'}],['b',{channel:2,incarnation:'old-b',epoch:1,sequence:4,state:'active'}]]),calls=[],faults=[];let ran=false,gate;
 const authority={owner:id=>owners.get(id),admission:id=>({...owners.get(id),session_id:'session-'+id})};
 const ack=(id,token)=>({id,token,...owners.get(id),finalSequence:owners.get(id).sequence});
 gate=new PermanentCoordinator({authority,durable:async()=>{},onFault:(entry,error)=>faults.push({entry,error}),endpointFor:(channel,incarnation)=>({
  freeze:async request=>{calls.push(['freeze',channel,request.id,request.epoch]);
   if(incarnation==='old-a'&&owners.get('a').epoch===2)return {...request,channel:1,incarnation,retired:explicit};
   if(request.id==='b'){await until(()=>gate.entries.get('a')?.needsFreeze===false);owners.set('a',{channel:4,incarnation:'new-a',epoch:2,sequence:0,state:'active'});}return ack(request.id,request.token);
  },resume:async request=>{calls.push(['resume',channel,request.id,request.epoch]);return {...request,resumed:true};}
 })});
 const operation=gate.permanentPlayers(['a','b'],()=>{ran=true;assert.equal(gate.entries.get('a').owner.incarnation,'new-a');});
 if(explicit){await operation;assert(ran);assert.equal(gate.entries.size,0);assert.deepEqual(calls.filter(r=>r[0]==='resume'),[['resume',4,'a',2],['resume',2,'b',1]]);assert.equal(calls.filter(r=>r[0]==='freeze'&&r[2]==='a').length,3);assert.equal(faults.length,0);}
 else{await assert.rejects(operation,/freeze_retirement_scope/);assert.equal(ran,false);assert.equal(faults.length,2);assert([...gate.entries.values()].every(e=>e.phase==='unknown'));assert(!calls.some(r=>r[0]==='resume'));}
});

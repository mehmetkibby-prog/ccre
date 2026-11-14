// Run with scripts/run.py. The initial admission uses the candidate transport.
// Only the first oversized recovery admission invokes the preserved R115 method.
// No runtime file is replaced; the next automatic retry uses the candidate.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const base=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {setup}=await import(base+'tests/process-fixture.mjs');
const {until}=await import(base+'tests/helpers.mjs');
const {AdventureService}=await import(base+'adventure-service.mjs');
const {TOWER_DEFAULTS,TOWER_CATALOG,validateTowerConfig}=await import(base+'tower-config.mjs');
const originalDir=mkdtempSync(join(tmpdir(),'r116-original-stream-'));
const originalPath=join(originalDir,'reliable-stream.mjs');
const originalSource=readFileSync(new URL('./reliable-stream-r115-original.mjs',import.meta.url),'utf8');
writeFileSync(originalPath,originalSource.replace(/from '\.\/([^']+)'/g,(_,name)=>"from '"+pathToFileURL(base+name).href+"'"));
const Original=await import(pathToFileURL(originalPath));
const cleanups=[],test={after:fn=>cleanups.push(fn)};
try{
 const s=await setup(test,{shared:true,prepare:f=>{
  const config=structuredClone(TOWER_DEFAULTS),spawn=config.floors[0].spawns[0],drops=TOWER_CATALOG.filter(row=>!['towerChest','towerItem'].includes(row.type)).slice(0,8).map(row=>({itemId:row.id,chance:10,min:1,max:1}));
  config.floors[0].waves=10;config.floors[0].spawns=[{...spawn,count:30,damage:0,drops},{...spawn,kind:'claw',count:30,damage:0,drops}];validateTowerConfig(config);
  f.sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(config));f.sql.prepare('UPDATE players SET channel=4 WHERE id=?').run(f.id);
  const service=new AdventureService(f.sql,{now:f.clock,uuid:randomUUID}),run=service.insertRun('tower',4,f.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,config,{floor:1,wave:1,partyId:null});run.deadline_ms=f.clock()+3600000;service.join(f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id),run);
  for(let wave=1;wave<=10;wave++){f.sql.prepare('UPDATE monsters SET hp=0 WHERE area=?').run(run.area);run.state.wave=wave;service.spawnWave(run);}
 }});await s.world.stopJobs();const ticket=await s.http('character',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));await s.connect(ticket);
 const initial=s.supervisor.rows.get(4),install=s.core.install.bind(s.core);let failure=null;
 s.core.install=async(...args)=>{
  const control=s.core.process(args[1]).control,request=control.request;
  control.request=function(method,payload,options){
   if(failure===null&&method==='admit'&&Buffer.byteLength(JSON.stringify(payload))>1048576){
    try{return Original.StreamControl.prototype.request.call(this,method,payload,options);}
    catch(error){failure={code:error.code,bytes:error.bytes,stack:error.stack,channel:args[1].channel,epoch:args[1].epoch,priorEpoch:ticket.epoch};console.log('ORIGINAL_RESTORE_FAILURE',JSON.stringify(failure));throw error;}
   }
   return request.call(this,method,payload,options);
  };
  try{return await install(...args);}finally{control.request=request;}
 };
 assert(initial.child.kill('SIGKILL'));
 await until(()=>failure!==null,25000);assert.equal(failure.code,'ipc_frame_size');assert.equal(failure.channel,4);assert(failure.epoch>failure.priorEpoch);assert.match(failure.stack,/CoordinatorRecovery|coordinator-recovery\.mjs/);
 await until(()=>s.supervisor.rows.get(4)!==initial&&s.supervisor.rows.get(4)?.state==='running',25000);
 const next=await s.http('ticket');assert.equal(next.status,200,JSON.stringify(next));
 const evidence={fixture:'validated tower 10 waves x 60 enemies, 8 valid drop rows',initialAdmission:'candidate transport',firstReplacement:'preserved R115 StreamControl.request',failure,automaticRetry:'candidate transport; running and ticket200',faults:s.faults.map(row=>({code:row.error?.code,supervisor:row.supervisor,retryChannels:row.retryChannels}))};
 writeFileSync(new URL('./restore-before.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');console.log('RESTORE_BEFORE_REPRODUCTION_COMPLETE');
}finally{for(const cleanup of cleanups.reverse())await cleanup();rmSync(originalDir,{recursive:true,force:true});}

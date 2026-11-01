import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {LocalDatabase} from '../../../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {exclusiveWriterLaneR533 as candidate} from '../../../working/core511-source/scripts/core511/writer-lane-r533.mjs';
import {exclusiveWriterLaneR533 as baseline} from '../../../working/core511-source/scripts/core511/writer-lane-r533.mjs?baseline';

const directory=mkdtempSync(join(tmpdir(),'r85-inline-cost-')),fixtures=[];
async function setup(name,install){
 const file=join(directory,name+'.sqlite'),db=new LocalDatabase(file,{create:true,groupWrites:true});db.sqlite.exec('CREATE TABLE probe(id INTEGER PRIMARY KEY,value INTEGER NOT NULL); INSERT INTO probe VALUES(1,0)');
 let drains=0,serial=0,pending=null;
 const lane=install(db),drain=db.drainWrites;db.drainWrites=function(){drains++;return drain.call(this);};
 const worker=new Worker(new URL('./receipt-worker.mjs',import.meta.url),{workerData:{file}}),[ready]=await once(worker,'message');
 assert.equal(ready.ready,true);assert.equal(ready.synchronous,2,'external commits use SQLite FULL');
 worker.on('message',message=>{assert(pending);assert.equal(message.id,pending.id);const p=pending;pending=null;p.resolve(message);});
 const send=request=>{assert.equal(pending,null);return new Promise(resolve=>{pending={id:++serial,resolve};worker.postMessage({id:serial,request});});};
 async function wave(size){
  const before=drains,at=performance.now(),workerTimes=[];
  await Promise.all(Array.from({length:size},()=>lane.run(async()=>{
   const owner=db.sqlite.prepare('SELECT epoch,sequence FROM kernel511_channel_owners WHERE player_id=?').get('inline-actor');
   const request={playerId:'inline-actor',epoch:owner.epoch,sequence:owner.sequence+1,operationId:`${name}-${owner.sequence+1}`,operation:'probe',payload:{expectedSequence:owner.sequence}};
   const result=await send(request);assert(result.ok,JSON.stringify(result));
   assert.equal(result.ack.sequence,request.sequence);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,1);
   workerTimes.push(result.workMs);
  })));
  await lane.idle();const elapsedMs=performance.now()-at;
  return {elapsedMs,workerMs:workerTimes.reduce((a,b)=>a+b,0),drains:drains-before,messages:size,receipts:size};
 }
 const f={name,db,lane,worker,wave};fixtures.push(f);return f;
}
try{
 const a=await setup('baseline',baseline),b=await setup('candidate',candidate);
 await a.wave(24);await b.wave(24);const rows=[];
 for(let round=0;round<8;round++)for(const f of round%2?[b,a]:[a,b])rows.push({name:f.name,round,...await f.wave(40)});
 const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
 const summaries=Object.fromEntries(fixtures.map(f=>{const own=rows.filter(r=>r.name===f.name);return [f.name,{medianWallMs:median(own.map(r=>r.elapsedMs)),medianWorkerMs:median(own.map(r=>r.workerMs)),medianParentGapMs:median(own.map(r=>r.elapsedMs-r.workerMs)),drains:own.map(r=>r.drains),messages:own.map(r=>r.messages),receipts:f.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,ownerSequence:f.db.sqlite.prepare('SELECT sequence FROM kernel511_channel_owners').get().sequence,value:f.db.sqlite.prepare('SELECT value FROM probe').get().value}];}));
 const sha=p=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex');
 const report={scope:'Light microfixture: real separate worker, actual LocalDatabase SQLite FULL COMMIT, actual ChannelAuthority receipts/owner/sequence, synchronous main preflight per callback; simple increment operation, not native game workload or crowd acceptance',node:process.version,execArgv:process.execArgv,baselineSha:sha('../../../working/core511-source/scripts/core511/writer-lane-r533.mjs'),candidateSha:sha('./candidate/writer-lane-r533.mjs'),perWaveJobs:40,rows,summaries};
 for(const summary of Object.values(summaries))assert.equal(summary.receipts,summary.ownerSequence),assert.equal(summary.ownerSequence,summary.value);
 writeFileSync(new URL('../../../evidence/writer-inline-cost-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summaries,null,2));
}finally{
 for(const f of fixtures){await f.lane.idle();f.worker.postMessage({close:true});await once(f.worker,'exit');f.db.close();}
 rmSync(directory,{recursive:true,force:true});
}

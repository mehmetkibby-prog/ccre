import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SnapshotReadQueue as Before} from '../r82-work/core511-source/scripts/core511/snapshot-read-queue.mjs';
import {SnapshotReadQueue as After} from '../r83-investigation/periodic/snapshot-read-queue.mjs';
import {ColdReadCache} from '../r82-work/core511-source/scripts/core511/slim-reload.mjs';

const round=value=>Math.round(value*1000)/1000;
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const N=24;
function fixture(rows){
 const dir=mkdtempSync(join(tmpdir(),'core511-r83-cache-bench-')),file=join(dir,'fixture.sqlite');
 const writer=new DatabaseSync(file);
 writer.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; CREATE TABLE shared_profiles(id INTEGER PRIMARY KEY, area TEXT, kind TEXT, hp REAL, attack REAL, defense REAL, xp REAL, setting_json TEXT, label TEXT, flags INTEGER, revision INTEGER); CREATE TABLE actor_state(id INTEGER PRIMARY KEY, hp REAL, tick INTEGER); CREATE TABLE unrelated_writes(id INTEGER PRIMARY KEY, revision INTEGER); INSERT INTO unrelated_writes VALUES(1,0); BEGIN');
 const profile=writer.prepare('INSERT INTO shared_profiles VALUES(?,?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<rows;i++)profile.run(i,'area-'+(i%12),'monster-'+(i%7),100+i,20+i%100,30+i%90,10+i%30,JSON.stringify({enabled:true,rate:15,weights:[1,2,3,4],name:'configuration-'+i}),'profile-'+i,1,1);
 const actor=writer.prepare('INSERT INTO actor_state VALUES(?,?,?)');for(let i=0;i<N;i++)actor.run(i,100,1);
 writer.exec('COMMIT');
 const reader=new DatabaseSync(file,{readOnly:true});reader.exec('PRAGMA query_only=ON');
 return {writer,reader,close(){reader.close();writer.close();rmSync(dir,{recursive:true,force:true});}};
}
async function run(Queue,{sharedRows,writeAfterReply,gapMs=0}){
 const f=fixture(sharedRows),cache=new ColdReadCache(f.reader),replyTimes=[],observed=new Map();let transactions=0,readCalls=0,sqlMs=0,cacheReadMs=0,bytesMax=0,writerMs=0;
 const sharedSql='SELECT * FROM shared_profiles ORDER BY id',stmt=f.reader.prepare(sharedSql),ownSql='SELECT * FROM actor_state WHERE id=?',own=f.reader.prepare(ownSql),touch=f.writer.prepare('UPDATE unrelated_writes SET revision=revision+1 WHERE id=1');
 const start=performance.now();
 let q;
 const post=reply=>{
  assert.equal(f.reader.isTransaction,false);replyTimes.push(round(performance.now()-start));
  assert.equal(reply.sharedCount,sharedRows);assert.equal(reply.ownId,reply.id);assert(!observed.has(reply.id));observed.set(reply.id,reply);
  if(writeAfterReply){const at=performance.now();touch.run();writerMs+=performance.now()-at;}
 };
 q=new Queue({
  begin:()=>{assert.equal(f.reader.isTransaction,false);f.reader.exec('BEGIN');transactions++;},
  commit:()=>f.reader.exec('COMMIT'),rollback:()=>f.reader.exec('ROLLBACK'),post,
  read:async(message,{insideTransaction=false,post:localPost=post}={})=>{
   if(!insideTransaction){f.reader.exec('BEGIN');transactions++;}
   assert.equal(f.reader.isTransaction,true);
   // Match actual readActorWorldBundle + ColdWorldReader dual begin calls.
   cache.begin();cache.begin();
   let t=performance.now();
   const shared=cache.read(sharedSql,[],()=>{const at=performance.now();readCalls++;const rows=stmt.all();sqlMs+=performance.now()-at;return rows;});
   const player=cache.read(ownSql,[message.id],()=>{const at=performance.now();readCalls++;const row=own.all(message.id);sqlMs+=performance.now()-at;return row;});
   cacheReadMs+=performance.now()-t;
   // Include the actual result JSON size-check cost from readMessage.
   const bytes=Buffer.byteLength(JSON.stringify({shared,player}));assert(bytes<=4*1024*1024);bytesMax=Math.max(bytesMax,bytes);
   // Optional explicit fixed complete-read wait isolates repeated cache work
   // under an expensive read; this is not a measured native game delay.
   if(gapMs)await new Promise(resolve=>setTimeout(resolve,gapMs));else await turn();
   if(!insideTransaction)f.reader.exec('COMMIT');
   localPost({id:message.id,sharedCount:shared.length,ownId:player[0].id});
  }
 });
 for(let id=0;id<N;id++)q.push({id,name:'kernel511_actor_world'});
 while(q.running)await q.running;
 assert.equal(observed.size,N);assert.deepEqual([...observed.keys()],Array.from({length:N},(_,i)=>i));
 const totalMs=performance.now()-start;
 const result={firstReplyMs:replyTimes[0],totalMs:round(totalMs),readsPerSecond:round(N*1000/totalMs),transactions,sqlExecutions:readCalls,sqlMs:round(sqlMs),cacheReadMs:round(cacheReadMs),writerMs:round(writerMs),maxResultBytes:bytesMax,cache:{...cache.metrics},replyTimes};
 f.close();return result;
}
const scenarios=[
 {name:'small_shared_quiet',sharedRows:96,writeAfterReply:false},
 {name:'small_shared_writer',sharedRows:96,writeAfterReply:true},
 {name:'small_shared_12ms_read_wait_writer',sharedRows:96,writeAfterReply:true,gapMs:12},
 {name:'medium_shared_writer',sharedRows:2000,writeAfterReply:true},
 {name:'large_shared_quiet',sharedRows:8000,writeAfterReply:false},
 {name:'large_shared_writer',sharedRows:8000,writeAfterReply:true},
];
const outcomes=[];
for(const scenario of scenarios){
 const before=[],candidate=[];
 for(let i=0;i<3;i++){
  // Alternate order to reduce consistently charging warm-up to one variant.
  if(i%2){candidate.push(await run(After,scenario));before.push(await run(Before,scenario));}
  else{before.push(await run(Before,scenario));candidate.push(await run(After,scenario));}
 }
 const median=(rows,key)=>rows.map(row=>row[key]).sort((a,b)=>a-b)[1];
 const summary={name:scenario.name,totalMedianMs:{before:median(before,'totalMs'),candidate:median(candidate,'totalMs')},firstMedianMs:{before:median(before,'firstReplyMs'),candidate:median(candidate,'firstReplyMs')},sqlExecutions:before.map(row=>row.sqlExecutions)+' / '+candidate.map(row=>row.sqlExecutions),cacheResets:before.map(row=>row.cache.resets)+' / '+candidate.map(row=>row.cache.resets),transactions:before.map(row=>row.transactions)+' / '+candidate.map(row=>row.transactions)};
 outcomes.push({scenario,before,candidate,summary});console.log(JSON.stringify(summary));
}
const evidence={scope:'actual R82 ColdReadCache and real native SQLite WAL fixture; not full game, not live VDS throughput or FPS',node:process.version,requestsPerRun:N,runs:3,notes:['Shared fixture rows are explicit scenario sizes, not claimed live profile counts.','Each result is under the unchanged 4 MiB guard.','Writing after each published reply simulates resumed gameplay committing on another connection.','Actual NativeGameServices.refresh not executed because exact current AdventureService source is unavailable.','One scenario explicitly injects a 12 ms read wait; all other read work uses real SQLite/cache/JSON plus one setImmediate.'],outcomes};
writeFileSync(new URL('./periodic-read-cache-benchmark.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {SnapshotReadQueue as Before} from '../r82-work/core511-source/scripts/core511/snapshot-read-queue.mjs';
import {SnapshotReadQueue as After} from '../r83-investigation/periodic/snapshot-read-queue.mjs';

const delays=[12,160,160,160];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const round=value=>Math.round(value*1000)/1000;
async function run(Queue){
 const started=performance.now(),replies=[];let open=false,commits=0;
 const q=new Queue({
  begin:()=>{assert.equal(open,false);open=true;},
  commit:()=>{assert.equal(open,true);open=false;commits++;},
  rollback:()=>{open=false;},
  read:async(message,{insideTransaction=false,post=reply=>{assert.equal(open,false);replies.push({...reply,deliveredMs:round(performance.now()-started)});}}={})=>{
   assert.equal(open,insideTransaction);
   await pause(delays[message.id]);
   post({id:message.id,ownReadWaitMs:delays[message.id]});
  },
  post:reply=>{assert.equal(open,false);replies.push({...reply,deliveredMs:round(performance.now()-started)});}
 });
 for(let id=0;id<4;id++)q.push({id,name:'kernel511_actor_world'});
 while(q.running)await q.running;
 assert.deepEqual(replies.map(row=>row.id),[0,1,2,3]);
 return {firstReplyMs:replies[0].deliveredMs,totalMs:round(performance.now()-started),groupTransactions:commits,replies};
}
const old=[],candidate=[];
for(let n=0;n<3;n++){old.push(await run(Before));candidate.push(await run(After));}
const median=rows=>[...rows].map(row=>row.firstReplyMs).sort((a,b)=>a-b)[1];
const files={before:'r82-work/core511-source/scripts/core511/snapshot-read-queue.mjs',candidate:'r83-investigation/periodic/snapshot-read-queue.mjs'};
const result={scope:'controlled readonly actor refresh queue waits, not live VDS measurements',node:process.version,injectedOwnReadWaitMs:delays,runs:3,firstReplyMedianMs:{before:median(old),candidate:median(candidate)},before:old,candidate,
 sources:Object.fromEntries(Object.entries(files).map(([key,path])=>[key,{path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}]))};
writeFileSync(new URL('./periodic-read-batch-benchmark.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({scope:result.scope,runs:result.runs,firstReplyMedianMs:result.firstReplyMedianMs},null,2));

// COMPONENT benchmark only. It deliberately cannot satisfy complete-game
// acceptance: lifecycle/quests/rewards/arena/party integrations are not present.
import {parentPort,workerData} from 'node:worker_threads';
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {FixedLoop} from '../fixed-loop.mjs';
import {ResidentState} from '../resident-state.mjs';
import {MovementMemory} from '../movement-memory.mjs';
import {createRules} from '../generated/rules.mjs';
import {createMovementRule} from '../generated/movement.mjs';
import {ReliableStream,acceptStreamSocket} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
const {base,role}=workerData,delay=monitorEventLoopDelay({resolution:10});delay.enable();let beginElu,started;
const sockets=[];let ackSamples=[],errors=0;
const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(p*values.length)-1)]:0;
const stats=()=>({elapsedMs:performance.now()-started,elu:performance.eventLoopUtilization(beginElu).utilization,maxPauseMs:delay.max/1e6,errors});
if(role==='writer'){
 const {LocalDatabase}=await import(pathToFileURL(base+'/vds-server/src/database.mjs'));
 const db=new LocalDatabase(workerData.file,{create:true,groupWrites:true,asyncDurable:true});
 db.sqlite.exec('CREATE TABLE component_positions(id TEXT PRIMARY KEY,x REAL,y REAL,hp INTEGER,revision INTEGER)');
 const save=db.sqlite.prepare('INSERT INTO component_positions VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET x=excluded.x,y=excluded.y,hp=excluded.hp,revision=excluded.revision WHERE excluded.revision>=component_positions.revision');
 const ledger=new DurableLedger(db,{authorize:(_,peer,event)=>peer.channel===event.payload.channel&&event.actor.startsWith('bench-'+peer.channel+'-')&&event.realm==='component-test',handlers:new Map([['checkpoint',(sqlite,payload)=>{save.run(payload.id,payload.x,payload.y,payload.hp,payload.revision);return {revision:payload.revision};}]])});
 let committedEvents=0;
 parentPort.on('message',async message=>{
  if(message.type==='port'){
   const stream=new MessagePortStream(message.port);sockets.push(stream);acceptStreamSocket(stream,{authenticate:hello=>{if(hello.channel!==message.channel||hello.proof!==workerData.proof)throw Error('identity');return {channel:message.channel};},dispatch:async(peer,method,event)=>{
    if(method!=='economy')throw Error('unknown method');try{const result=await ledger.submit(peer,event);committedEvents++;return result;}catch(e){errors++;throw e;}
   }});
  }else if(message.type==='start'){beginElu=performance.eventLoopUtilization();started=performance.now();delay.reset();parentPort.postMessage({type:'started'});}
  else if(message.type==='stop'){
   const count=db.sqlite.prepare('SELECT count(*) AS n FROM kernel511_receipts').get().n;
   parentPort.postMessage({type:'result',result:{...stats(),committedEvents,receipts:count,receiptsVerified:count===committedEvents,writeStats:db.writeStats,role}});
   for(const socket of sockets)socket.destroy();delay.disable();db.close();parentPort.close();
  }
 });
 parentPort.postMessage({type:'ready'});
}else{
 const {channel,settings}=workerData,state=new ResidentState(channel),world={cycle:1,reset_at:0};
 let seed=channel;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 const formula=createRules({random}),move=createMovementRule(formula),memory=new MovementMemory({state,world,fishing:new Map(),pveHitDue:()=>false,epoch:()=>1});
 const {dungeonAttackDamage}=await import(pathToFileURL(base+'/lib/dungeon-combat.mjs'));
 const clients=new Map(),projections=new Map();let rpc,checkpointTimer,moves=0,attacks=0;
 const combatStats={attack:100,multipliers:[1,1.8,2.4,3],criticalMultiplier:1.5,monsterPower:10,fire:5,ice:5};
 const rules={
  movement({id,input,now}){const result=move(null,{player:{id},account:{id}},memory,input,now);if(!result.ok){errors++;throw Error(result.code);}moves++;return result;},
  combat({id}){const target=state.read('monsters','m-'+id),hit=dungeonAttackDamage(combatStats,0,target,random()<.1);state.patch('monsters',target.id,{hp:Math.max(1,target.hp-hit.damage)});attacks++;return {ok:true,damage:hit.damage};},
  ai({now,tick}){if(tick%20!==0)return;for(const [id,row]of state.table('players')){const result=formula.pveDamage({id:'golge-normal-c1-1',area:'forest',variant:'normal',is_boss:0,is_stone:0},100,{...row,level:20},settings);state.patch('players',id,{hp:Math.max(1,row.hp-result.amount),hp_revision:row.hp_revision+1});}},
  respawn(){},
  project({id,shared,results,lastApplied}){
   const self=state.read('players',id),previous=projections.get(id)??new Map(),next=new Map(),changed=[],removed=[];
   for(const kind of ['players','monsters'])for(const row of state.grids.get(kind).nearby(self,self.x,self.y,650)){
    const key=kind+':'+row.id;next.set(key,row);if(previous.get(key)===row)continue;
    let encoded=shared.get(key);if(!encoded){encoded={kind,id:row.id,x:row.x,y:row.y,hp:row.hp};shared.set(key,encoded);}changed.push(encoded);
   }
   for(const key of previous.keys())if(!next.has(key))removed.push(key);projections.set(id,next);
   return changed.length||removed.length||results.length?{type:'world',lastApplied,changed,removed,results}:null;
  }
 };
 const kernel=new FixedLoop({state,rules,send:(id,packet)=>clients.get(id).postMessage(packet),onFatal:()=>errors++});
 for(let i=0;i<25;i++){
  const id='bench-'+channel+'-'+i,row={id,account_id:id,role:['muhafiz','avci','arkanist'][i%3],channel,cycle:1,area:'forest',x:2700+i%5*12,y:2025+Math.floor(i/5)*12,hp:100000,hp_revision:1,position_revision:1,movement_checked_at_ms:0,movement_debt_ms:0,root_until_ms:0,realtime_scope_version:1,arena_match_id:'',level:20};
  state.put('players',row);state.claim(id,1);kernel.admit(id,1);state.put('monsters',{id:'m-'+id,channel,cycle:1,area:'forest',x:row.x+40,y:row.y,hp:1000000});
 }
 for(let i=0;i<125;i++)state.put('monsters',{id:'ambient-'+i,channel,cycle:1,area:'forest',x:2550+(i%15)*40,y:1850+Math.floor(i/15)*40,hp:1000000});
 async function checkpoint(){
  const work=[];
  for(const [id,actor]of kernel.players){if(actor.barrier)continue;const row=state.read('players',id),at=performance.now();
   work.push(kernel.durable(id,()=>rpc.request('economy',{realm:'component-test',actor:id,key:id+':'+row.position_revision+':'+row.hp_revision,kind:'checkpoint',payload:{id,channel,x:row.x,y:row.y,hp:row.hp,revision:row.position_revision}})).then(()=>ackSamples.push(performance.now()-at)));
  }await Promise.all(work);
 }
 parentPort.on('message',async message=>{
  if(message.type==='writer'){
   const port=message.port;rpc=new ReliableStream({open:()=>new MessagePortStream(port),handshake:()=>({channel,proof:workerData.proof})});rpc.start();
  }else if(message.type==='client'){
   const {id,port}=message;clients.set(id,port);port.on('message',input=>{try{kernel.enqueue(id,input);}catch(error){errors++;port.postMessage({type:'error',code:error.code});}});
  }else if(message.type==='start'){
   beginElu=performance.eventLoopUtilization();started=performance.now();delay.reset();kernel.start();checkpointTimer=setInterval(()=>{void checkpoint().catch(()=>errors++);},5000);parentPort.postMessage({type:'started'});
  }else if(message.type==='stop'){
   clearInterval(checkpointTimer);kernel.tick();kernel.stop();await checkpoint();
   parentPort.postMessage({type:'result',result:{...stats(),...kernel.snapshot(),channel,moves,attacks,players:clients.size,ack:{count:ackSamples.length,p95Ms:percentile(ackSamples,.95),maxMs:Math.max(0,...ackSamples)},hotSqlReads:0,role:'channel'}});
   for(const port of clients.values())port.close();rpc.close();delay.disable();parentPort.close();
  }
 });parentPort.postMessage({type:'ready'});
}

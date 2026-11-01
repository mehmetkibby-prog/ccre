// Measurement adapter only. All native simulation, auth, durability, cadence
// and WS framing remain in runChannelProcess. Never shipped as an app entry.
import {runChannelProcess} from '../channel-process.mjs';
import {ProcessStream} from '../process-stream.mjs';
import path from 'node:path';
import {TickTrace,measuredSend} from './tick-trace.mjs';
import {ProfileCapture} from './profile-capture.mjs';
import {demand} from '../contract.mjs';
import {potionLatencyProbe} from './latency-probe.mjs';
import {DEFER_INPUT} from '../fixed-loop.mjs';
await runChannelProcess({afterCreate(runtime){
 const detailedProfile=process.env.CORE511_DETAILED_PROFILE==='1'||process.env.CORE511_FOCUS_PROFILE==='1'&&runtime.peer.channel===3;const potionTrace=potionLatencyProbe(runtime.channel);
 let window=null,profile=null,profileRun=null;const trace=new TickTrace(),kernel=runtime.channel.kernel,control=runtime.control.bind(runtime),tick=kernel.tick.bind(kernel);
 const originalSend=runtime.connections.send;runtime.connections.send=function(actor,packet,options){potionTrace.sent(actor,packet);return trace.active?measuredSend(trace,this,actor,packet,options):originalSend.call(this,actor,packet,options);};
 const enqueue=kernel.enqueue;kernel.enqueue=function(id,input){const result=enqueue.call(this,id,input);if(window){const p=this.players.get(id),queued=p.queue.at(-1);window.inputStarts.set(input.payload,{started:queued.at,receivedAtMs:queued.receivedAtMs,action:input.payload.action,barrierOnEnqueue:!!p.barrier,suspendedOnEnqueue:p.suspended,deferAttempts:0});}return result;};
 if(detailedProfile)for(const [label,owner,names]of [['resident',runtime.channel,['loadActor','applyCommit']],['actorCheckpoint',runtime.channel.checkpoints,['drain']],['combatCheckpoint',runtime.channel.combatCheckpoints,['drain']],['action',runtime.channel.actions,['submit']]])for(const name of names){const original=owner[name];if(typeof original!=='function')continue;owner[name]=function(...args){return trace.asyncCall(label+'.wait.'+name,()=>original.apply(this,args));};}
 // Inclusive synchronous timings only, inside the unchanged measured window.
 // Retain bounded aggregates; never remove their overhead from acceptance.
 if(detailedProfile)for(const [label,owner,names]of [
  ['attack',runtime.channel.attackMemory,['step','commit']],
  ['action',runtime.channel,['action']],
  ['attackLoop',runtime.channel.attack,['attack']],
  ['movementLoop',runtime.channel.movement,['move']],
  ['shared',runtime.channel.sharedCombat,['needs']],
  ['frames',runtime.channel.frames,['frame','attack','retaliation']],
  ['view',runtime.channel.view,['setPlayer','setMonster','nearby','setEngagement']],
  ['projection',runtime.world,['common','snapshot','project']],
  ['retaliation',runtime.channel.retaliation,['tick']],
  ['retaliationMemory',runtime.channel.retaliationMemory,['arm','due','step']],
  ['fanout',runtime.events,['receive','publish']],
  ['checkpoint',runtime.channel.combatCheckpoints,['snapshot','changed']],
  ['runtime',runtime,['hydrate','snapshot']],
  ['connections',runtime.connections,['send']]
 ])for(const name of names){const original=owner[name];if(typeof original!=='function')continue;owner[name]=function(...args){return trace.call(label+'.'+name,()=>original.apply(this,args));};}
 // Only the synchronous message dispatch is timed, never async wait duration.
 // Includes stream/WS callbacks; V8 IPC decode before emit remains outside it.
 const emit=process.emit;if(detailedProfile)process.emit=function(event,...args){return event==='message'?trace.call('ipc.dispatch',()=>emit.call(this,event,...args)):emit.call(this,event,...args);};
 for(const phase of ['movement','combat','ai','respawn','project']){
  const original=kernel.rules[phase];kernel.rules[phase]=function(...args){
   return trace.phase(phase,()=>{const result=original.apply(this,args),input=window?.inputStarts.get(args[0]?.input);if(input){if(result===DEFER_INPUT)input.deferAttempts++;else{const ms=performance.now()-input.started;window.slowInputFlows.push({...input,ms,completedAtMs:performance.timeOrigin+performance.now()});window.slowInputFlows.sort((a,b)=>b.ms-a.ms);window.slowInputFlows.length=Math.min(20,window.slowInputFlows.length);window.inputStarts.delete(args[0].input);}}return result;});
  };
 }
 kernel.tick=function(){
  const h=window;if(!h)return tick();try{return trace.tick(tick);}finally{h.minPlayers=Math.min(h.minPlayers,kernel.activeCount);h.maxPlayers=Math.max(h.maxPlayers,kernel.activeCount);}
 };
 for(const writer of [runtime.channel.writer,runtime.channel.systemWriter].filter(Boolean)){
  const original=writer.request;writer.request=async function(...args){const h=window,at=performance.now();try{return await original.apply(this,args);}finally{h?.acks.push(performance.now()-at);}};
 }
 runtime.control=async(method,payload)=>{
  if(method==='benchmark_profile'){
   demand(/^[a-f0-9-]{36}$/.test(payload.runId),'benchmark_profile_run');
   if(payload.operation==='start'){demand(!profile,'benchmark_profile_busy');profile=new ProfileCapture();profileRun=payload.runId;await profile.start();return {started:true,runId:profileRun};}
   demand(payload.operation==='end'&&profileRun===payload.runId&&profile&&!window,'benchmark_profile_fenced');const result=await profile.stop(path.join(import.meta.dirname,'../evidence',`profile-${profileRun}-channel-${runtime.peer.channel}.cpuprofile`));profile=null;return result;
  }
  if(method!=='load_measure')return trace.asyncCall('control.wait.'+method,()=>trace.call('control.sync.'+method,()=>control(method,payload)));
  if(payload.operation==='end'&&window){trace.active.closing=true;await kernel.pendingTick;}
  const value=await control(method,payload);
  if(payload.operation==='begin'){potionTrace.begin();trace.begin(payload.runId,runtime.loadWindow.active.started);window={runId:payload.runId,acks:[],inputStarts:new WeakMap(),slowInputFlows:[],minPlayers:kernel.activeCount,maxPlayers:kernel.activeCount,start:{...kernel.metrics}};}
  if(payload.operation==='end'&&window){const h=window;window=null;value.game={...trace.end(),potionLatency:potionTrace.end(),maxInputMs:kernel.metrics.maxInputMs,slowInputs:kernel.metrics.slowInputs,slowInputFlows:h.slowInputFlows,minPlayers:h.minPlayers,maxPlayers:h.maxPlayers,players:kernel.activeCount,inputs:kernel.metrics.inputs-h.start.inputs,missed:kernel.metrics.missed-h.start.missed,messages:kernel.metrics.messages-h.start.messages,ackSamples:h.acks,hotSqlReads:0,hotSqlProof:'native resident channel has no SQLite handle or synchronous DB port'};}
  if(payload.operation==='cancel'){window=null;trace.active=null;}return value;
 };
 process.on('message',message=>{
  if(message?.type!=='validation-client'||!/^validation:[a-f0-9-]{36}$/.test(message.stream))return;
  const socket=new ProcessStream(process,{stream:message.stream,connect:false});Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.'+(runtime.peer.channel+1)});runtime.webSocketEndpoint.server.emit('connection',socket);
 });
}});

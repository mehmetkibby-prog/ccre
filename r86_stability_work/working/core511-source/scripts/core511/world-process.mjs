import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {ProcessStream} from './process-stream.mjs';
import {ReliableStream} from './reliable-stream.mjs';
import {SharedWorldRuntime} from './shared-world.mjs';
import {installRegistry} from './generated/cold-world-rules.mjs';
import {demand} from './contract.mjs';
import {createCpuProfiler507,startRuntimePerformance,runtimePerformance} from './generated/profiler-rules.mjs';
import {LoadWindow} from './load-window.mjs';
import {assertInheritedHostLock} from './host-lock-protocol.mjs';

export async function runWorldProcess(){
 demand(process.connected&&typeof process.send==='function','world_parent_required');let runtime,stream,registry,profiler,loadWindow,stopMetrics,ending=false;
 const exit=code=>{if(ending)return;ending=true;runtime?.stop();profiler?.close();loadWindow?.close();stopMetrics?.();stream?.close();registry?.close();process.exit(code);};
 process.once('disconnect',()=>exit(1));process.once('SIGTERM',()=>exit(0));
 const send=message=>new Promise((resolve,reject)=>process.send(message,error=>error?reject(error):resolve()));
 const fatal=error=>{if(!ending)void send({type:'kernel511-world-failed',code:typeof error?.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'world_process_failed'}).catch(()=>{}).finally(()=>exit(1));};
 try{
  const config=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('world_boot_timeout')),20000);process.once('message',message=>{clearTimeout(timer);if(message?.type==='kernel511-world-init')resolve(message.config);else reject(Error('world_boot_protocol'));});});
  demand(config.peer?.channel===0&&config.peer.role==='world'&&typeof config.proof==='string'&&config.proof.length>=32,'world_boot_configuration');assertInheritedHostLock(config.hostLock);registry=installRegistry({seed:config.initial.loadlab});
  let ready;const connected=new Promise(resolve=>ready=resolve);
  stream=new ReliableStream({open:()=>new ProcessStream(process),handshake:()=>({...config.peer,proof:config.proof}),onState:state=>{if(state==='ready')ready();if(state==='disconnected'&&!ending)fatal(Object.assign(Error('world_parent_disconnected'),{code:'world_parent_disconnected'}));},control:async(method,payload)=>{
   if(method==='activate')return runtime.activate();
   if(method==='quiesce_process')return runtime.drain();
   if(method==='engagements'){runtime.view.receive(payload);return {applied:true};}
   if(method==='shared_acquire')return runtime.sharedCombat.acquire(payload.peer,payload.id);
   if(method==='shared_finish')return runtime.sharedCombat.finish(payload.peer,payload);
   if(method==='shared_checkpoint')return runtime.sharedCombat.checkpoint(payload.peer,payload);
   if(method==='shared_reload')return runtime.sharedCombat.reload(payload.peer,payload);
   if(method==='world_state')return runtime.setWorld(payload);
   if(method==='enable_jobs'){demand(runtime.jobs,'world_jobs_missing');runtime.jobs.enabled=true;return {enabled:true};}
   if(method==='disable_jobs'){const enabled=runtime.jobs?.enabled===true;await runtime.jobs?.drain();return {disabled:true,enabled};}
   if(method==='configuration_freeze')return runtime.configuration.freeze(payload);
   if(method==='configuration_refresh')return runtime.configuration.refresh(payload);
   if(method==='configuration_resume')return runtime.configuration.resume(payload);
   if(method==='global_world_refresh')return runtime.jobs.refresh(payload);
   if(method==='global_world_publish')return runtime.jobs.publish(payload);
   if(method==='cleanup_freeze')return runtime.cleanupControl.freeze(payload);
   if(method==='cleanup_commit')return runtime.cleanupControl.commit(payload);
   if(method==='cleanup_resume')return runtime.cleanupControl.resume(payload);
   if(method==='cleanup_execute'){demand(payload.kind==='world_cleanup_batch','cleanup_command_kind');return runtime.writer.submit(payload);}
   if(method==='player_job_execute'){demand(['player_upkeep','abandoned_normal','scoped_reward'].includes(payload.kind),'player_job_command_kind');return runtime.writer.submit(payload);}
   if(method==='metrics')return {...runtime.snapshot(),process:runtimePerformance().snapshot()};
   if(method==='load_measure')return loadWindow.command(payload);
   if(method==='profile')return profiler.command(payload);
   if(method==='loadlab_registry'){registry.registry.apply(payload);return {generation:payload.generation};}
   demand(false,'unknown_world_control');
  }});
  runtime=new SharedWorldRuntime({peer:config.peer,initial:config.initial,request:(...args)=>stream.request(...args),onFatal:fatal});profiler=createCpuProfiler507();loadWindow=new LoadWindow({target:'world',incarnation:config.peer.incarnation});stopMetrics=startRuntimePerformance();stream.start();await connected;await send({type:'kernel511-world-ready',peer:config.peer});return {runtime,stream};
 }catch(error){fatal(error);return null;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await runWorldProcess();

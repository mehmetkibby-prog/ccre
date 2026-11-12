import {residentCapacityR59} from './castle-capacity-r59.mjs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createPublicKey} from 'node:crypto';
import {ChannelRuntime} from './channel-runtime.mjs';
import {ProcessStream} from './process-stream.mjs';
import {ReliableStream} from './reliable-stream.mjs';
import {ipcSafeStream} from './ipc-safe-stream.mjs';
import {readPartsMethod} from './ipc-read-parts.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {ipcRequestContext} from './ipc-request-context.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {demand,validChannel} from './contract.mjs';
import {installRegistry} from './generated/cold-world-rules.mjs';
import {startRuntimePerformance} from './generated/profiler-rules.mjs';
import {assertInheritedHostLock} from './host-lock-protocol.mjs';

// The parent is the only source of bootstrap data and control frames. No
// credentials are put in argv, environment variables, files or logs.
export async function runChannelProcess({afterCreate=null}={}){
 demand(typeof process.send==='function'&&process.connected,'channel_parent_required');
 let runtime,stream,registry,stopMetrics,ending=false;
 const reportFatal=createFaultReporter(text=>process.stderr.write(text));
 const exit=code=>{if(ending)return;ending=true;runtime?.close();stopMetrics?.();registry?.close();stream?.close();process.exit(code);};
 process.once('disconnect',()=>exit(1));process.once('SIGTERM',()=>exit(0));
 const send=value=>new Promise((resolve,reject)=>process.send(value,error=>error?reject(error):resolve()));
 const fatal=error=>{if(ending)return;if(actorFaultIsolation)reportFatal({error,channel:runtime?.peer?.channel,incarnation:runtime?.peer?.incarnation});void send({type:'kernel511-failed',...ipcRequestContext(error),code:typeof error?.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code)?error.code:'channel_process_failed'}).catch(()=>{}).finally(()=>exit(1));};
 try{
  const config=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('channel_boot_timeout')),20000);
   process.once('message',message=>{clearTimeout(timer);if(message?.type==='kernel511-init')resolve(message.config);else reject(Error('channel_boot_protocol'));});
  });
  demand(validChannel(config.peer?.channel)&&typeof config.peer.incarnation==='string'&&typeof config.proof==='string'&&config.proof.length>=32&&Array.isArray(config.origins)&&config.origins.length>0&&path.isAbsolute(config.mechanicsModule),'channel_boot_configuration');
  assertInheritedHostLock(config.hostLock);
  registry=installRegistry({seed:config.initial.loadlab});
  const module=await import(pathToFileURL(config.mechanicsModule).href);
  demand(typeof module.createChannelMechanics==='function','channel_mechanics_module');
  const request=(method,payload,options)=>stream.request(method,payload,ipcSafeStream&&readPartsMethod(method)?{...options,readParts:true}:options),mechanics=module.createChannelMechanics({peer:config.peer,initial:config.initial,runtime:()=>runtime,request,clock:Date.now});
  let ready;
  const connected=new Promise(resolve=>ready=resolve);
  stream=new ReliableStream({maxPending:128*residentCapacityR59(config.peer.channel)/25,open:()=>new ProcessStream(process),handshake:()=>({...config.peer,proof:config.proof}),onState:state=>{
   if(state==='ready')ready();else if(state==='disconnected'&&!ending)fatal(Object.assign(Error('channel_parent_disconnected'),{code:'channel_parent_disconnected'}));
  },control:async(method,payload)=>{
   if(method==='activate'){demand(!runtime.started,'channel_already_started');runtime.start();return {started:true};}
   if(method==='loadlab_registry'){registry.registry.apply(payload);return {generation:payload.generation};}
   return runtime.control(method,payload);
  }});
  runtime=new ChannelRuntime({peer:config.peer,initial:config.initial,publicKey:createPublicKey(config.publicKey),origins:new Set(config.origins),request,mechanics,onFatal:fatal});
  stopMetrics=startRuntimePerformance();
  if(config.webSocketModule){
   demand(path.isAbsolute(config.webSocketModule),'channel_websocket_module');
   const {WebSocketServer}=await import(pathToFileURL(config.webSocketModule).href),endpoint=runtime.endpoint(WebSocketServer);
   if(config.listen){
    demand(config.listen.host==='127.0.0.1'&&Number.isInteger(config.listen.port)&&config.listen.port>=1024&&config.listen.port<=65535,'channel_loopback_listener');
    await new Promise((resolve,reject)=>{endpoint.server.once('error',reject);endpoint.server.listen(config.listen.port,config.listen.host,()=>{endpoint.server.off('error',reject);resolve();});});
    endpoint.server.on('error',fatal);
   }
  }
  if(afterCreate)await afterCreate(runtime,config);
  stream.start();await connected;await send({type:'kernel511-ready',peer:config.peer});
  return {runtime,stream,registry};
 }catch(error){fatal(error);return null;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await runChannelProcess();

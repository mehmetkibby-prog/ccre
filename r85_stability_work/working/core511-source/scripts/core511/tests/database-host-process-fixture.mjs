import {generateKeyPairSync} from 'node:crypto';
import path from 'node:path';
import {DatabaseHost} from '../database-host.mjs';
import {GameWriter} from '../writer-runtime.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {CoreCoordinator} from '../coordinator.mjs';
import {ChannelProcessSupervisor} from '../process-supervisor.mjs';
import {WorldProcessSupervisor} from '../world-supervisor.mjs';
import {EntryWriter,createNativeEntryAuth} from '../entry-writer.mjs';
import {createBotCheck} from '../../../../native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';
import {installRegistry} from '../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';

// Actual production ownership/lifecycle classes, no network listener. These
// explicit ports test host startup and native entry, never complete mechanics.
installRegistry();
let host,core,channels,world;
const send=value=>new Promise((resolve,reject)=>process.send(value,error=>error?reject(error):resolve()));
process.on('message',async message=>{
 try{
  if(message.type==='open'){
   host=await DatabaseHost.open(message.expected);const content=await host.bootstrap();const writer=new GameWriter(host.database,{realmId:message.expected.realmId,ports:{guard:()=>true,assertResources:()=>true}});await host.prepareWriter(writer);
   const reader=new ReadWorker(host.file,new Map(),{actorBundles:true}),{privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
   const bot=createBotCheck(host.database.sqlite),launch={status:()=>({canPlay:true})};Object.assign(writer.services.globals,{__colBotCheck:bot,__colLaunch:launch});const auth=createNativeEntryAuth({database:host.database,globals:writer.services.globals}),entry=new EntryWriter({database:host.database,services:writer.services});
   core=new CoreCoordinator({host,writer,reader,auth,entry,privateKey,origins:new Set(['https://game.invalid']),realmId:message.expected.realmId,bot,launch,guild:{deadline:()=>Infinity},onFault:issue=>{void send({type:'fault',code:issue.error?.code??issue.error?.message});}});
   channels=new ChannelProcessSupervisor(core,{mechanicsModule:path.join(import.meta.dirname,'process-mechanics-fixture.mjs')});world=new WorldProcessSupervisor(core);await world.start();await channels.start();await world.stopJobs();
   await send({type:'ready',content,owners:[world.row,...channels.rows.values()].map(row=>({channel:row.peer.channel,incarnation:row.peer.incarnation,pid:row.child.pid})),children:host.children.size});return;
  }
  if(message.type==='stop-owner'){const row=message.channel===0?world.row:channels.rows.get(message.channel);if(!row.child.kill('SIGSTOP'))throw Error('fixture_owner_stop_failed');await send({type:'stopped',channel:message.channel,pid:row.child.pid});return;}
  if(message.type==='set-marker'){await core.permanentPlayers([message.actor],()=>host.database.sqlite.prepare('UPDATE players SET gems=? WHERE id=?').run(message.value,message.actor));await send({type:'marker'});return;}
  if(message.type==='ticket'){const response=await core.http(new Request(message.request.url,message.request));await send({type:'ticket',result:{status:response.status,...await response.json()}});return;}
  if(message.type==='close'){await host.close();await send({type:'closed'});process.exit(0);}
 }catch(error){await send({type:'error',code:error.code??error.message});if(host)await host.close().catch(()=>{});process.exit(error.code==='host_database_in_use'?73:1);}
});
process.on('disconnect',()=>{void host?.close().finally(()=>process.exit(1));});

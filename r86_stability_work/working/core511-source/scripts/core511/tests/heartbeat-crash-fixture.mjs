import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createWorldTransitionHandler} from '../world-jobs.mjs';
import {createHeartbeatWriterHandler} from '../heartbeat-writer.mjs';
import {writerSettlement} from '../combat-settlement.mjs';
import {NotificationOutbox} from '../notification-outbox.mjs';
export function bindHeartbeatCrash(database,{peer,request,settings}){
 const nowMs=request.payload.nowMs,authority=new ChannelOwnership(database,{realmId:peer.realm}),services=new NativeGameServices(database.sqlite,{clock:()=>nowMs}),outbox=new NotificationOutbox(database,{clock:()=>nowMs,resolveRecipients:()=>[request.playerId??request.payload.heartbeatJob.actor]});
 let writer;
 if(request.operation==='heartbeat'){
  writer=authority;const handler=createHeartbeatWriterHandler({settingsFor:()=>settings,globalsFor:()=>services.globals,assertOwnership:(sql,peer,id,epoch)=>Boolean(authority.assertAdmitted(sql,peer,id,epoch)),assertResources:()=>true,settleRetaliation:writerSettlement,clock:()=>nowMs});
  registerOwnedRule(writer,'heartbeat',(sql,payload,context)=>services.run(payload,()=>outbox.append(sql,context,handler(sql,payload,context))));
 }else{
  writer=new SystemWriter(database,{realmId:peer.realm,authority});writer.add('world_transition',createWorldTransitionHandler({services,authority,clock:()=>nowMs,assertFrozen:(_sql,p)=>p.fence==='isolated-heartbeat',assertHeartbeat:()=>true,appendEvents:(...args)=>outbox.append(...args)}));
 }
 return {writer,authority,outbox};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated heartbeat crash required');
 const data=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry();const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),{writer}=bindHeartbeatCrash(db,data);
 // The native operation completes inside an uncommitted outer transaction.
 const original=db.atomic.bind(db);db.atomic=fn=>original(sql=>{const result=fn(sql);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_heartbeat');process.kill(process.pid,'SIGKILL');}return result;});
 await writer.command(data.peer,data.request);fs.writeFileSync(marker,'durable_heartbeat_before_ack');process.kill(process.pid,'SIGKILL');
}

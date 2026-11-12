import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {createActionWriterHandler} from '../action-writer.mjs';
import {createNativeGameplayRates} from '../gameplay-rate.mjs';

export function bindRateCrash(database,{peer,request,settings}){
 const clock=()=>request.payload.nowMs,authority=new ChannelOwnership(database,{realmId:peer.realm,now:clock}),rates=createNativeGameplayRates(database.sqlite,{globals:{},clock});
 registerOwnedRule(authority,'native_action',createActionWriterHandler({settingsFor:()=>settings,globalsFor:()=>({}),assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true,affectedActors:()=>[],settleRetaliation:()=>null,enforceRateLimit:rates.enforce,clock}));return {authority};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated rate crash fixture required');const data=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry();const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),{authority}=bindRateCrash(db,data);
 const execute=authority.operations.native_action.execute;authority.operations.native_action.execute=(...args)=>{const result=execute(...args);if(result.result.result.status!==429)throw Error('Expected native rate rejection');if(phase==='before'){fs.writeFileSync(marker,'uncommitted_rate_rejection');process.kill(process.pid,'SIGKILL');}return result;};await authority.command(data.peer,data.request);fs.writeFileSync(marker,'durable_rate_rejection_before_ack');process.kill(process.pid,'SIGKILL');
}

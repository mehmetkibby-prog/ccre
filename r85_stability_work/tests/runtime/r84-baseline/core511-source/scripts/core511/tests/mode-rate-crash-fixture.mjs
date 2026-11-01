import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {native} from './helpers.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {NativeModeServices} from '../mode-services.mjs';
import {createModeWriterHandler} from '../mode-writer.mjs';

export function bindModeRateCrash(database,data,{phase,marker}={}){
 const authority=new ChannelOwnership(database,{realmId:'mode-rate-crash',now:()=>data.request.payload.nowMs}),services=new NativeModeServices(database.sqlite,{clock:()=>data.request.payload.nowMs});
 const handler=createModeWriterHandler({services,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true});
 registerOwnedRule(authority,'mode_action',(sql,payload,context)=>{const value=handler(sql,payload,context);if(value.status!==429)throw Error('Expected actual native mode429');if(phase==='before'){fs.writeFileSync(marker,'uncommitted_mode_rate');process.kill(process.pid,'SIGKILL');}return value;});return authority;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated mode rate crash required');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),data=JSON.parse(fs.readFileSync(input,'utf8')),database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),authority=bindModeRateCrash(database,data,{phase,marker});await authority.initialize();const ack=await authority.command(data.peer,data.request);if(ack.result.status!==429)throw Error('Expected committed native mode429');fs.writeFileSync(marker,'durable_mode_rate_before_ack');process.kill(process.pid,'SIGKILL');
}

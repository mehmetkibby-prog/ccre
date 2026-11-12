import fs from 'node:fs';
import {native} from './helpers.mjs';
import {bindGuildEjection} from './guild-ejection-fixture.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated guild ejection test required');
const {peer,request}=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry({now:()=>request.payload.nowMs});
const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),writer=await bindGuildEjection(database,request.payload.nowMs),execute=writer.authority.operations.mode_action.execute;
writer.authority.operations.mode_action.execute=(...args)=>{const value=execute(...args);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_native_guild_ejection');process.kill(process.pid,'SIGKILL');}return value;};
await writer.command(peer,request);fs.writeFileSync(marker,'durable_native_guild_ejection_before_ack');process.kill(process.pid,'SIGKILL');

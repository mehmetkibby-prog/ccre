import fs from 'node:fs';
import {native} from './helpers.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated HTTP guild revoke test required');
const {kind,id,body,enabled,revision,nowMs}=JSON.parse(fs.readFileSync(input,'utf8')),operation=kind==='configure'?'admin_guild_configuration':kind==='membership'?'guild_membership':'http_guild_revoke',{LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry({now:()=>nowMs});
const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),{writer,core,adapter}=await standaloneRevoke(database,nowMs),append=writer.notifications.append.bind(writer.notifications);
writer.notifications.append=(...args)=>{const value=append(...args);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_'+operation);process.kill(process.pid,'SIGKILL');}return value;};
if(kind==='configure')await adapter.configure(core.guild,enabled,revision);else if(kind==='membership')await adapter.membership(core.guild,id,body);else await adapter.revoke(core.guild,id,body);fs.writeFileSync(marker,'durable_'+operation+'_before_reply');process.kill(process.pid,'SIGKILL');

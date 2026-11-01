import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {bindGuildCombat} from './guild-combat-fixture.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated guild combat crash required');
const {peer,request,settings}=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),authority=new ChannelOwnership(db,{realmId:'guild-combat-test'}),command=bindGuildCombat(authority,{settings,clock:()=>request.payload.nowMs});
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry({now:()=>request.payload.nowMs});
await command(peer,request,()=>{if(phase==='before'){fs.writeFileSync(marker,'uncommitted_guild_hit_return');process.kill(process.pid,'SIGKILL');}});fs.writeFileSync(marker,'durable_guild_hit_return_before_ack');process.kill(process.pid,'SIGKILL');

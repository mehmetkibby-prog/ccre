import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createRuneBossHandler} from '../rune-boss-writer.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated rune crash required');const {peer,request}=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry({now:()=>request.payload.nowMs});
const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),authority=new ChannelOwnership(database,{realmId:peer.realm}),writer=new SystemWriter(database,{realmId:peer.realm,authority}),services=new NativeGameServices(database.sqlite,{clock:()=>request.payload.nowMs}),handler=createRuneBossHandler({services,authority,clock:()=>request.payload.nowMs});
writer.add('rune_boss_step',(...args)=>{const result=handler(...args);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_rune_death');process.kill(process.pid,'SIGKILL');}return result;});await writer.command(peer,request);fs.writeFileSync(marker,'durable_rune_death_before_ack');process.kill(process.pid,'SIGKILL');

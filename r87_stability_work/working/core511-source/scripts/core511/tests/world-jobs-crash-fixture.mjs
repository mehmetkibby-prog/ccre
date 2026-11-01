import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {createWorldUpkeepHandler,createWorldTransitionHandler} from '../world-jobs.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated world job crash required');
const {peer,request}=JSON.parse(fs.readFileSync(input,'utf8')),{LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),authority=new ChannelOwnership(db,{realmId:peer.realm}),writer=new SystemWriter(db,{realmId:peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>request.payload.nowMs}),options={services,authority,clock:()=>request.payload.nowMs,assertFrozen:(sql,p)=>p.fence==='isolated-no-channels'&&sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_processes WHERE online=1').get().n===0},handler=request.kind==='world_upkeep'?createWorldUpkeepHandler(options):createWorldTransitionHandler(options);
writer.add(request.kind,(...args)=>{const result=handler(...args);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_world_job');process.kill(process.pid,'SIGKILL');}return result;});await writer.command(peer,request);fs.writeFileSync(marker,'durable_world_job_before_ack');process.kill(process.pid,'SIGKILL');

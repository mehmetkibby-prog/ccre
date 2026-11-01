import fs from 'node:fs';
import {systemFixture} from './system-writer-fixture.mjs';
const [file,input,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated system crash required');
const {peer,request}=JSON.parse(fs.readFileSync(input,'utf8')),{db,writer}=await systemFixture(file,{initialize:false});
if(phase==='before'){const execute=writer.operations.get('combat_checkpoint');writer.operations.set('combat_checkpoint',(...args)=>{const result=execute(...args);fs.writeFileSync(marker,'uncommitted_monster');process.kill(process.pid,'SIGKILL');return result;});}
await writer.command(peer,request);fs.writeFileSync(marker,'durable_monster_before_ack');process.kill(process.pid,'SIGKILL');

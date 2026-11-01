import fs from 'node:fs';
import {native} from './helpers.mjs';
import {bootstrapFourthChannel} from '../channel-content.mjs';
const [file,phase,marker]=process.argv.slice(2);if(!file.includes('core511-isolated-')||!['before','after'].includes(phase))throw Error('Isolated content crash required');
const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),atomic=db.atomic.bind(db);
db.atomic=(work,options)=>atomic(sql=>{const result=work(sql);if(phase==='before'){fs.writeFileSync(marker,'uncommitted_content');process.kill(process.pid,'SIGKILL');}return result;},options);
await bootstrapFourthChannel(db,{assertStopped:()=>true});fs.writeFileSync(marker,'durable_content_before_ack');process.kill(process.pid,'SIGKILL');

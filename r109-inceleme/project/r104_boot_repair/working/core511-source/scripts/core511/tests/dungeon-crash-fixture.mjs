import fs from 'node:fs';
import {native} from './helpers.mjs';
import {createRules} from '../generated/rules.mjs';
import {createDungeonWriterHandler} from '../dungeon-runtime.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
const [file,eventFile,mode,marker]=process.argv.slice(2),event=JSON.parse(fs.readFileSync(eventFile,'utf8'));
if(!['before','after'].includes(mode)||!file.includes('core511-isolated-'))throw Error('Isolated crash fixture required');
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),peer={channel:1,realm:'fixture'};
const actual=createDungeonWriterHandler({stats:createRules({globals:{}}).calculateEquipmentStats,globals:{},clock:()=>event.payload.operation.now,
 assertOwnership:(sql,p,id,epoch)=>p===peer&&epoch===1&&sql.prepare('SELECT channel FROM players WHERE id=?').get(id)?.channel===1});
const handler=(sql,payload,context)=>{
 const result=actual(sql,payload,context);
 if(mode==='before'){fs.writeFileSync(marker,'uncommitted_native_dungeon_reward');process.kill(process.pid,'SIGKILL');}
 return result;
};
const ledger=new DurableLedger(database,{authorize:(_,p,e)=>p===peer&&e.realm==='fixture',handlers:new Map([['dungeon',handler]])});
await ledger.submit(peer,event);
fs.writeFileSync(marker,'committed_native_dungeon_reward_before_ack');process.kill(process.pid,'SIGKILL');

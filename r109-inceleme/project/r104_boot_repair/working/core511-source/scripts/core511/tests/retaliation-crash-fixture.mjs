import fs from 'node:fs';
import {native} from './helpers.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {createRetaliationWriterHandler} from '../retaliation-writer.mjs';
const [file,inputFile,mode,marker]=process.argv.slice(2),{request,peer}=JSON.parse(fs.readFileSync(inputFile,'utf8'));
if(!['before','after'].includes(mode)||!file.includes('core511-isolated-'))throw Error('Isolated retaliation crash fixture required');
const {LocalDatabase}=await native('vds-server/src/database.mjs'),{installRegistry}=await native('vds-server/src/loadlab/registry.mjs');installRegistry();
const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true}),authority=new ChannelOwnership(db,{realmId:'retaliation-crash'});await authority.initialize();
const actual=createRetaliationWriterHandler({assertResources:()=>true,clock:()=>request.payload.nowMs,globalsFor:()=>({__colRanks:{bonuses:()=>({defense:7})},__colRuneV2:{monster:()=>({damage:11})},__colRunes:{factor:()=>1}}),settingsFor:sql=>({...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()}),assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch))});
registerOwnedRule(authority,'retaliation_death',(sql,payload,context)=>{
 const result=actual(sql,payload,context);if(mode==='before'){fs.writeFileSync(marker,'uncommitted_native_death');process.kill(process.pid,'SIGKILL');}return result;
});
await authority.command(peer,request);fs.writeFileSync(marker,'durable_native_death_before_ack');process.kill(process.pid,'SIGKILL');

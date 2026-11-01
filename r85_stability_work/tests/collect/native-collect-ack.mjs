import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {nativeHttpHost} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {put,update} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/helpers.mjs';
import {RUNE_TYPES} from '../../working/native510-bb3a6cc689c6/lib/runes.mjs';
process.env.NODE_OPTIONS=(process.env.NODE_OPTIONS??'')+' --import '+new URL('./register-collect.mjs',import.meta.url).pathname;
const candidate=process.env.R85_COLLECT_CANDIDATE==='1',label=candidate?'r85':'r84',kinds=['strong_branch','strong_crystal','desert_plant','master_scroll',...Object.keys(RUNE_TYPES),'weathered_iron','wing','infinite','pet','halloween_pumpkin','witch_wand','halloween_candy'],rows=[],queries=[],writerRows=[],cleanups=[],t={after:fn=>cleanups.push(fn)};
let s,live,error=null,sequence=0,materialReads,releaseHeld,heldCommitVerified=false;
try{
 s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>host.database.atomic(sql=>{
  update(sql,'players',seed.id,{area:'forest',channel:1,x:2700,y:2025,hp:100000,max_hp:100000,last_seen:Math.floor(Date.now()/1000),essence:1000,xp:123});
  put(sql,'players',{id:'r85-collect-party-peer',name:'Collect peer',role:'avci',area:'forest',channel:1,x:2700,y:2025,hp:1000,max_hp:1000,level:40,last_seen:Math.floor(Date.now()/1000),created_at:1,essence:1000,xp:456});
  for(const kind of kinds)put(sql,'dungeon_materials',{player_id:seed.id,kind,amount:7});
  // A full equipment bag must still accept material rows and reject gear.
  const count=sql.prepare("SELECT count(*) n FROM player_items WHERE player_id=? AND equipped=0 AND kind IN('weapon','armor','helmet','shoes','necklace','earring','bracelet','belt')").get(seed.id).n;
  for(let i=count;i<35;i++)put(sql,'player_items',{id:'r85-bag-'+i,player_id:seed.id,kind:'weapon',item_name:'Bag '+i,rarity:'white',power:1,role:'avci',enchantments:'[]',equipped:0,created_at:1});
  for(const kind of [...kinds,'essence','weapon'])put(sql,'world_drops',{id:'r85-collect-'+kind,owner_id:seed.id,monster_id:'golge-r85-collect',kind,item_name:'Collect '+kind,rarity:'white',power:1,amount:kind==='essence'?11:3,role:'avci',enchantments:'[]',x:2700,y:2025,expires_at:Math.floor(Date.now()/1000)+600,collectible_at:Math.floor(Date.now()/1000)});
  put(sql,'world_drops',{id:'r85-held-collect',owner_id:seed.id,monster_id:'golge-r85-collect',kind:'weathered_iron',item_name:'Held material',rarity:'white',power:0,amount:3,role:null,enchantments:'[]',x:2700,y:2025,expires_at:Math.floor(Date.now()/1000)+600,collectible_at:Math.floor(Date.now()/1000)});
 })});
 await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));live=await s.connect(ticket);
 live.ws.on('message',bytes=>{const p=JSON.parse(bytes);if(p.type==='event')live.ws.send(JSON.stringify({type:'event_ack',ids:[p.id]}));});
 const originalQuery=s.reader.query.bind(s.reader);s.reader.query=async(name,...args)=>{const at=performance.now();try{return await originalQuery(name,...args);}finally{queries.push({name,ms:performance.now()-at});}};
 const originalCommand=s.writer.command.bind(s.writer);let first;
 s.writer.command=async(peer,request)=>{if(!first&&request.operation==='native_action'&&request.payload.input.action==='collect')first={peer,request};const result=await originalCommand(peer,request);if(request.operation==='native_action'&&request.payload.input.action==='collect')writerRows.push({scope:request.payload.localScope,collect:result.result.collectLight,refresh:result.result.sharedRefresh});return result;};
 const send=async target=>{const number=++sequence,at=performance.now(),start=queries.length;live.ws.send(JSON.stringify({type:'input',sequence:number,payload:{action:'collect',targetId:target}}));let result;await until(()=>{result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===number);return result;},10000);return {sequence:number,ms:performance.now()-at,result,queries:queries.slice(start)};};
 const snapshot=async()=>{const child=s.supervisor.rows.get(1).child,request=randomUUID();let value;const listener=m=>{if(m?.type==='test-collect-state'&&m.request===request)value=m.snapshot;};child.on('message',listener);try{child.send({type:'test-collect-state',request,actor:s.f.id});await until(()=>value,5000);return value;}finally{child.off('message',listener);}};
 for(const kind of kinds){
  const row=await send('r85-collect-'+kind);assert.equal(row.result.status,200,JSON.stringify(row));const state=await snapshot(),materials=s.f.sql.prepare('SELECT kind,amount FROM dungeon_materials WHERE player_id=?').all(s.f.id),inventory=Object.fromEntries(materials.map(r=>[r.kind,r.amount]));
  assert.equal(inventory[kind],10);assert.deepEqual(state.materials,JSON.parse(JSON.stringify(materials)));assert.deepEqual(state.tower.inventory,inventory);assert.deepEqual(state.adventure.inventory,inventory);assert.deepEqual(state.dungeon,inventory);assert(!state.drops.some(d=>d.id==='r85-collect-'+kind));assert.equal(state.inventory.filter(item=>item.equipped===0&&item.kind==='weapon').length,35);rows.push({kind,...row});
 }
 materialReads=queries.filter(q=>q.name==='kernel511_actor_world').length;assert.equal(materialReads,candidate?0:kinds.length);
 const held=new Promise(resolve=>releaseHeld=resolve);let committed=false;
 s.writer.command=async(peer,request)=>{const result=await originalCommand(peer,request);if(request.operation==='native_action'&&request.payload.input.targetId==='r85-held-collect'){committed=true;await held;}return result;};
 const heldReply=send('r85-held-collect');await until(()=>committed,10000);assert.equal(s.f.sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='weathered_iron'").get(s.f.id).amount,13);assert.equal((await snapshot()).tower.inventory.weathered_iron,10);assert(!live.packets.flatMap(p=>p.results??[]).some(r=>r.sequence===sequence));releaseHeld();assert.equal((await heldReply).result.status,200);assert.equal((await snapshot()).tower.inventory.weathered_iron,13);heldCommitVerified=true;
 const replay=await originalCommand(first.peer,first.request);assert.equal(replay.result.result.status,200);assert.equal(s.f.sql.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(s.f.id,kinds[0]).amount,10);
 const duplicate=await send('r85-collect-'+kinds[0]);assert.equal(duplicate.result.status,404);
 await s.core.permanentPlayers([s.f.id,'r85-collect-party-peer'],()=>{put(s.f.sql,'parties',{id:'r85-collect-party',leader_id:s.f.id,created_at:1});for(const [i,id]of [s.f.id,'r85-collect-party-peer'].entries())put(s.f.sql,'party_members',{party_id:'r85-collect-party',player_id:id,joined_at:i+1});});
 const before=s.f.sql.prepare('SELECT id,xp,essence FROM players WHERE id IN (?,?) ORDER BY id').all(s.f.id,'r85-collect-party-peer');
 const essence=await send('r85-collect-essence');assert.equal(essence.result.status,200);assert.equal(essence.result.body.shared,2);
 const after=s.f.sql.prepare('SELECT id,xp,essence FROM players WHERE id IN (?,?) ORDER BY id').all(s.f.id,'r85-collect-party-peer');assert.equal(after.reduce((n,p)=>n+p.essence,0)-before.reduce((n,p)=>n+p.essence,0),11);assert.deepEqual(after.map(p=>p.xp),before.map(p=>p.xp));assert.equal((await snapshot()).player.essence,after.find(p=>p.id===s.f.id).essence);
 const full=await send('r85-collect-weapon');assert.equal(full.result.status,409);assert.equal(full.result.body.code,'bag_full');assert(s.f.sql.prepare('SELECT id FROM world_drops WHERE id=?').get('r85-collect-weapon'));assert.equal(s.f.sql.prepare('SELECT id FROM player_items WHERE id=?').get('r85-collect-weapon'),undefined);
 rows.push({kind:'duplicate',...duplicate},{kind:'party_essence',...essence},{kind:'full_bag_weapon',...full});assert.equal(s.faults.length,0,JSON.stringify(s.faults.map(f=>f.error?.message)));
}catch(e){error={message:e.message,stack:e.stack};process.exitCode=1;}
finally{releaseHeld?.();live?.ws.terminate();for(const cleanup of cleanups.toReversed())try{await cleanup();}catch(e){error??={message:e.message,stack:e.stack};process.exitCode=1;}
 const files=candidate?['collect-light.mjs','collect-materials-r85.mjs']:['collect-light.mjs'],base=new URL(candidate?'../../working/core511-source/scripts/core511/':'../runtime/r84-baseline/core511-source/scripts/core511/',import.meta.url),hashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL(file,base))).digest('hex')]));
 const report={label,passed:!error,error,scope:'14 material types in full equipment bag; native durable SQLite writer, 4 OS channel processes, WS over OS IPC; exact R84 plus only collect modules for candidate',execArgv:process.execArgv,hashes,materialReads,heldCommitVerified,rows,queries,writerRows,liveTouched:false,fullBrowser:false};fs.writeFileSync(new URL('../../evidence/collect-native-ack-'+label+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}

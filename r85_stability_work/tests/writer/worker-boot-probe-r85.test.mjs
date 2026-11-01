import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeHttpHost} from '../../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {put} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {sourceIdentity} from '../../working/core511-source/scripts/core511/source-identity.mjs';
test('actual native host startup retains worker boot pool until first real lethal command',{timeout:40000},async t=>{
 const before=sourceIdentity().sha256;assert.equal(before,'572129943dbd0df97818f6b53b4e12defa42b87483f3d456e669881edc1e9356');
 const target='golge-boot-process-r85',s=await nativeHttpHost(t,{realmSetup:async host=>{const now=Date.now();put(host.database.sqlite,'monsters',{id:target,name:'Gölge',area:'forest',channel:1,x:2720,y:2025,hp:1,max_hp:1,spawn_round:17,last_damaged_at_ms:now,last_regen_at_ms:now});}});await s.world.stopJobs();
 const sql=s.f.sql;
 await s.host.database.atomic(()=>{
  sql.prepare("UPDATE players SET area='forest',channel=1,level=40,xp=0,x=2700,y=2025,hp=100000,max_hp=100000,rank_tier=0,rank_xp=0,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,last_seen=? WHERE id=?").run(Math.floor(Date.now()/1000),s.f.id);
  globalThis.__colLaunch.grant(sql.prepare('SELECT account_id FROM players WHERE id=?').get(s.f.id).account_id,true);
 });
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket),captured=[],command=s.writer.command.bind(s.writer);
 s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='attack')captured.push({request,ack});return ack;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:target,spawnRound:17,ability:0}}));
 await until(()=>captured.length||s.faults.length,12000);assert.deepEqual(s.faults,[]);assert.equal(captured.length,1);assert.equal(captured[0].ack.result.result.status,200);assert(captured[0].ack.result.result.body.hits.some(hit=>hit.killed&&hit.id===target));
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(captured[0].request.operationId).n,1);assert.equal(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(target).hp,0);
 const dir=new URL('../../evidence/',import.meta.url),names=fs.readdirSync(dir).filter(name=>name.startsWith('worker-boot-probe-r85-'+process.pid+'-')&&name.endsWith('.json'));assert.equal(names.length,1);
 const file=new URL(names[0],dir),probe=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(probe.rows.map(row=>row.phase),['ready','before-first-refresh','after-first-refresh','after-first-command']);assert.equal(probe.rows[3].operationId,captured[0].request.operationId);
 assert(probe.rows.every(row=>row.pool.compiled===128));assert(probe.rows.every(row=>row.pool.invalidated===null));assert(probe.rows.every(row=>row.prepared.invalidations===probe.rows[0].prepared.invalidations));assert(probe.rows.every(row=>row.schemaVersion===probe.rows[0].schemaVersion));assert(probe.rows[3].pool.hits>0);
 const paths=['worker-boot-probe-r85.mjs','worker-boot-probe-loader-r85.mjs','register-worker-boot-probe-r85.mjs','worker-boot-probe-r85.test.mjs'];
 const report={passed:true,coreSHA256:before,sourceUnchanged:sourceIdentity().sha256===before,node:process.version,execArgv:process.execArgv,scope:'One actual native lethal attack and durable exact receipt over nativeHttpHost main + reward worker + world/four OS channel processes. Functional fixture ProcessStream browser route; counters only, not performance measurement.',pins:paths.map(name=>{const bytes=fs.readFileSync(new URL(name,import.meta.url));return {name,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}),probeFile:file.pathname,probe};
 fs.writeFileSync(new URL('../../evidence/worker-boot-pool-verification-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
});

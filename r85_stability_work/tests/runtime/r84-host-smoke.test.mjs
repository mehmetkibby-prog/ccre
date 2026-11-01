import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeHttpHost} from './r84-baseline/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {sourceIdentity} from './r84-baseline/core511-source/scripts/core511/source-identity.mjs';
test('R84 real SQLite host starts four channels and world, admits an explicit channel, opens WS', {timeout:45000}, async t=>{
 assert.equal(sourceIdentity().sha256,'a0e0bcdfd87717a3d5129a0a30d29bda5a4f85639a2b68773af556f19bda6365');
 const s=await nativeHttpHost(t);await s.world.stopJobs();
 assert.equal(s.host.children.size,5);assert.equal(s.supervisor.rows.size,4);
 await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));
 const live=await s.connect(ticket);assert(live.packets.some(p=>p.type==='ready'));
 assert.equal(s.faults.length,0,s.faults.map(x=>x.error?.stack).join('\n'));
 fs.writeFileSync(new URL('../../evidence/r84-host-smoke.json',import.meta.url),JSON.stringify({passed:true,coreSHA256:sourceIdentity().sha256,node:process.version,sqlite:process.versions.sqlite,owners:s.host.children.size,channels:s.supervisor.rows.size,webSocket:'real ws frames over OS child ProcessStream',database:'fresh isolated SQLite, native startup and writer',fullBrowser:false,liveTouched:false},null,2)+'\n');
});

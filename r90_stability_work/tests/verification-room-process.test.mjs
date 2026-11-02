import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ProcessStream} from '../working/core511-source/scripts/core511/process-stream.mjs';
import {until,BASE,temporary} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
import {TOWER_DEFAULTS} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {adventureArea} from '../working/core511-source/scripts/core511/adventure-maps.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

// Exercise the exact shipped API entry. No client-rendering claim: this local
// source handoff has no complete dist-vds/client tree for the old UI fixture.
async function httpModule(t){
 const root=temporary(t),server=path.join(root,'dist-vds/server');
 fs.mkdirSync(server,{recursive:true});fs.writeFileSync(path.join(root,'package.json'),'{"type":"module"}');
 for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync(path.join(BASE,name),path.join(root,name),'dir');
 fs.cpSync(path.join(BASE,'dist-vds/server'),server,{recursive:true});
 // API-only fixture: the handoff omits the generated SSR asset manifest.
 // No page/asset request is used and no gameplay/auth module is substituted.
 fs.writeFileSync(path.join(server,'__vite_rsc_assets_manifest.js'),'export default {serverResources:{},clientReferenceDeps:{}};\n');
 fs.copyFileSync(new URL('../working/http-runtime/dist-vds/server/index.js',import.meta.url),path.join(server,'index.js'));
 return import(pathToFileURL(path.join(server,'index.js')));
}

async function connect(t,s,ticket){
 const row=s.supervisor.rows.get(ticket.channel),stream='test-browser:'+randomUUID(),socket=new ProcessStream(row.child,{stream});
 t.after(()=>socket.destroy());
 await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream},e=>e?reject(e):resolve()));
 const ws=new WebSocket('ws://127.0.0.1'+ticket.url,{origin:s.f.origin,createConnection:()=>socket}),packets=[];
 t.after(()=>ws.terminate());ws.on('message',b=>packets.push(JSON.parse(b)));await once(ws,'open');
 ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket,capabilities:['bot-challenge-v1','queued-movement-v1']}));
 await until(()=>packets.some(p=>p.type==='ready'),7000);return {ws,packets};
}

test('expired legacy verification is deferred inside a real tower, resumes at exit and preserves the same live session',{timeout:45000},async t=>{
 const s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  const q=host.database.sqlite,c=structuredClone(TOWER_DEFAULTS);c.minLevel=1;c.floors[0].waves=1;
  c.floors[0].spawns=[{...c.floors[0].spawns[0],kind:'acolyte',count:1,hp:1000000,damage:0,drops:[]}];
  q.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(c));
  q.prepare("UPDATE players SET area='bazaar',x=2070,y=430,level=40,hp=10000,max_hp=10000,is_gm=0,loadlab_run_id='' WHERE id=?").run(seed.id);
 }});
 await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 const module=await httpModule(t);
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));
 const live=await connect(t,s,ticket),sql=s.f.sql;let sequence=0;
 const player=()=>sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
 const faults=()=>s.faults.map(f=>f.error?.stack??String(f)).join('\n');
 async function action(action,extra={}){
  const n=++sequence;live.ws.send(JSON.stringify({type:'input',sequence:n,payload:{action,requestId:randomUUID(),...extra}}));
  await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===n))||live.ws.readyState===3||s.faults.length,7000);
  assert.equal(live.ws.readyState,1);assert.equal(s.faults.length,0,faults());
  const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===n);assert.equal(result?.status,200,JSON.stringify(result));return result;
 }
 await action('adventure_tower_enter');const entered=player(),room=adventureArea(entered.area);
 assert.equal(room.kind,'tower');const epoch=s.core.sessions.get(s.f.id).identity.epoch;
 const identity=s.core.sessions.get(s.f.id).identity;
 const staleQuestion=await s.core.afkCheck.request(s.core.processes.get(ticket.channel).peer,{op:'issue',actor:s.f.id,account:identity.account,epoch:identity.epoch,session:identity.session,eligible:true,exempt:false,reason:'continuous'});
 assert.equal(staleQuestion.status,200,JSON.stringify(staleQuestion));assert.equal(staleQuestion.body.afkCheck.challenge,null);assert.equal(staleQuestion.body.afkCheck.pending,true);
 // Clear only this synthetic pending request so the remaining case isolates
 // the independent text-CAPTCHA path. This is fixture data, not a game change.
 await s.core.afkCheck.durable(()=>s.core.afkCheck.service.adminAction({id:'fixture-admin'},{actor:s.f.id,action:'clean'}));
 const expired=Date.now()-1;
 await s.host.database.atomic(()=>sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(expired,s.f.account.id));
 await s.core.refreshSessions();
 const read=()=>module.default(s.f.request({path:'/api/bot-check',method:'GET'}));
 const response=await read(),verification=await response.json();assert.equal(response.status,200,JSON.stringify(verification));
 assert.equal(verification.required,false,'A timed CAPTCHA must not interrupt an active tower.');
 assert.equal(live.packets.some(p=>p.type==='bot_check'&&p.required),false);
 assert.equal(sql.prepare('SELECT due_ms FROM bot_due WHERE account_id=?').get(s.f.account.id).due_ms,expired,'Deferral cannot grant another 30 minutes.');
 const p=player();await action('move',{area:p.area,x:p.x+3,y:p.y,basePositionRevision:p.position_revision});
 const monster=sql.prepare('SELECT * FROM monsters WHERE area=? AND hp>0').get(p.area);
 await s.core.permanentPlayers([s.f.id],()=>sql.prepare('UPDATE players SET x=?,y=? WHERE id=?').run(monster.x,monster.y,s.f.id));
 const hit=await action('attack',{targetId:monster.id,spawnRound:monster.spawn_round,ability:0,intentId:randomUUID()});
 assert.equal(hit.body.hits[0].killed,false);assert.equal(player().area,entered.area);
 await action('adventure_leave');assert.equal(player().area,'bazaar');await s.core.refreshSessions();
 const after=await (await read()).json();assert.equal(after.required,true);assert(after.id);
 await until(()=>live.packets.some(p=>p.type==='bot_check'&&p.required),3000);
 assert.equal(live.ws.readyState,1);assert.equal(s.core.sessions.get(s.f.id).identity.epoch,epoch);
 const post=body=>module.default(s.f.request({path:'/api/bot-check',body}));
 const code='123456';await s.host.database.atomic(()=>sql.prepare('UPDATE bot_challenges SET hash=? WHERE id=?').run(createHash('sha256').update(after.id+':'+code).digest('hex'),after.id));
 assert.equal((await post({id:after.id,answer:'000000'})).status,400);
 assert.equal((await (await read()).json()).required,true);
 assert.equal((await post({id:after.id,answer:code})).status,200);
 await until(()=>live.packets.some(p=>p.type==='bot_check'&&!p.required),3000);
 assert.equal(live.ws.readyState,1);assert.equal(live.packets.filter(p=>p.type==='ready').length,1);
 assert.equal(s.core.sessions.get(s.f.id).identity.epoch,epoch);assert.equal(s.faults.length,0,faults());
 t.diagnostic(JSON.stringify({towerRun:room.run,sameSession:true,expiredDeadlinePreserved:true,moveAndAttack:true,requiredAfterExit:true,wrongAnswerRejected:true,correctAnswerAccepted:true,faults:s.faults.length}));
});

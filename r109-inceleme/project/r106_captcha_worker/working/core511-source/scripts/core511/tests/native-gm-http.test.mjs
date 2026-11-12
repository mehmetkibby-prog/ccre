import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {composeNativeHttp} from '../compose-native-http.mjs';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {until} from './helpers.mjs';

const player=s=>s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
const call=(s,enabled,headers={})=>s.module.default(s.f.request({path:'/api/gm',body:{action:'set_visibility',enabled},headers}));
async function setup(t){const s=await httpActionFixture(t),observer=extraPlayer(s,93);await s.host.database.atomic(()=>globalThis.__colLaunch.grant('shared-account-93',true));assert.equal((await observer.http()).status,200);observer.ticket=await observer.http('transfer',{channel:s.ticket.channel});assert.equal(observer.ticket.status,200);observer.live=await s.connect(observer.ticket);return {...s,observer};}
const visible=(live,id)=>live.packets.filter(p=>p.world?.type==='world_snapshot').at(-1)?.world.data.players.some(p=>p.id===id);

test('native GM visibility keeps original authorization and acknowledges all four frozen channels before reply',{timeout:45000},async t=>{
 const s=await setup(t),{f,core}=s;assert.equal((await call(s,true)).status,403);await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(f.id));assert.equal((await call(s,true,{'X-CSRF-Token':'bad'})).status,403);assert.equal((await call(s,'true')).status,400);
 const row=core.processes.get(4),request=row.control.request.bind(row.control),old=[s.world.row,...s.supervisor.rows.values()];let applied=false,answered=false,release;const gate=new Promise(r=>release=r);row.control.request=async(method,payload)=>{const result=await request(method,payload);if(method==='gm_visibility'&&!applied){applied=true;await gate;}return result;};
 try{const pending=call(s,true).finally(()=>answered=true);await until(()=>applied,5000);assert.equal(answered,false);assert.equal(core.globalWorld.held.phase,'frozen');assert.equal(player(s).gm_invisible,1);release();const response=await pending;assert.equal(response.status,200,await response.text());}finally{release();row.control.request=request;}
 await until(()=>visible(s.observer.live,f.id)===false&&visible(s.live,f.id)===true,5000);assert.equal((await s.resources(f.id)).gm_invisible,1);assert(s.observer.live.packets.some(p=>p.type==='gm_visibility'&&p.playerId===f.id&&p.invisible===true));const revision=player(s).gm_visibility_revision;
 assert.equal((await call(s,false)).status,200);await until(()=>visible(s.observer.live,f.id)===true,5000);assert.equal(player(s).gm_visibility_revision,revision+1);assert.equal((await s.resources(f.id)).gm_invisible,0);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],old);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native visibility publication failure keeps original visible rollback with a newer acknowledged revision',{timeout:45000},async t=>{
 const s=await setup(t),{f,core}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(f.id));const before=player(s).gm_visibility_revision,row=core.processes.get(4),request=row.control.request.bind(row.control),old=[s.world.row,...s.supervisor.rows.values()];let lost=false;
 row.control.request=async(method,payload)=>{const ack=await request(method,payload);if(method==='gm_visibility'&&!lost){lost=true;throw Error('gm_publication_ack_lost');}return ack;};try{const response=await call(s,true);assert.equal(response.status,503);assert.equal((await response.json()).code,'visibility_sync_failed');}finally{row.control.request=request;}
 assert(lost);assert.equal(player(s).gm_invisible,0);assert.equal(player(s).gm_visibility_revision,before+2);assert.equal((await s.resources(f.id)).gm_visibility_revision,before+2);await until(()=>visible(s.observer.live,f.id)===true,5000);assert.equal(core.globalWorld.held,null);assert.deepEqual([s.world.row,...s.supervisor.rows.values()],old);assert.equal(s.faults.length,0);
});

test('lost final GM refresh ACK retires all five owners and recovers committed visibility before reconnect',{timeout:50000},async t=>{
 const s=await setup(t),{f,core,supervisor,world}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(f.id));const old=[world.row,...supervisor.rows.values()],row=core.processes.get(4),request=row.control.request.bind(row.control);let lost=false;
 row.control.request=async(method,payload)=>{const ack=await request(method,payload);if(method==='global_refresh'&&!lost){lost=true;throw Error('gm_final_refresh_lost');}return ack;};const r=await call(s,true);assert.notEqual(r.status,200,await r.text());assert(lost);assert.equal(player(s).gm_invisible,1);
 await until(()=>!core.recoveringWorld&&!core.globalWorld.recovery&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));await world.stopJobs();const ticket=await s.http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));await s.connect(ticket);assert.equal((await s.resources(f.id)).gm_invisible,1);assert(!s.faults.some(f=>f.globalRecovery),s.faults.map(f=>f.error?.stack).join('\n'));
});

test('original owner-GM body rechecks its provider identity, retains audit and updates current GM permissions',{timeout:45000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s,source=composeNativeHttp().source,ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),parts=['POST$43','owner$1','publishGmVisibility','safeId'].map(name=>{const n=ast.body.find(n=>n.id?.name===name);assert(n,name);return source.slice(n.start,n.end);});let identity=null;const target=extraPlayer(s,95);await s.host.database.atomic(()=>globalThis.__colLaunch.grant('shared-account-95',true));const ticket=await target.http();assert.equal(ticket.status,200);await s.connect(ticket);const targetCall=enabled=>s.module.default(new Request(f.origin+'/api/gm',{method:'POST',headers:core.sessions.get(target.id).request.headers,body:JSON.stringify({action:'set_visibility',enabled})}));
 // Only the external owner identity and rate service are controlled here;
 // original native route guards/body/audit SQL and five real processes run.
 const auth=core.auth.rules,handler=vm.runInNewContext(parts.join('\n')+'\nPOST$43',{Response,Request,Headers,URL,Date,crypto:globalThis.crypto,Error,gameOwnerIdentity:async()=>identity,AuthRequestError:auth.AuthRequestError,assertSameOrigin:auth.assertSameOrigin,readJsonObject:auth.readJsonObject,noStoreHeaders:auth.noStoreHeaders,authErrorResponse:core.auth.error,db:()=>f.db,enforceRateLimit:async()=>{}}),request=enabled=>f.request({path:'/api/admin/gm',body:{action:'set_gm',enabled,playerId:target.id}});
 assert.equal((await handler(request(true))).status,403);identity='isolated-owner';assert.equal((await handler(request(true))).status,200);assert.equal((await s.resources(target.id)).is_gm,1);assert.equal((await targetCall(true)).status,200);assert.equal((await handler(request(false))).status,200);assert.equal((await s.resources(target.id)).is_gm,0);assert.equal((await s.resources(target.id)).gm_invisible,0);assert.equal((await targetCall(true)).status,403);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM admin_audit_events WHERE admin_account_id=? AND action IN('gm_grant','gm_revoke')").get(identity).n,2);assert.equal(s.faults.length,0);
});

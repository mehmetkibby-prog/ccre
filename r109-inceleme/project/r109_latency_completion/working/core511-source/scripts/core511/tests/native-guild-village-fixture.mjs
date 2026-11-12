import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {createIngressRules} from '../generated/ingress-rules.mjs';
import {patchNativeGuildVillage} from '../patch-native-guild-village.mjs';
export const villageSource=patchNativeGuildVillage(nativeAdminSource).source;

export function villageHandler(s,{source=villageSource,publish=()=>{throw Error('legacy guild publisher reached');}}={}){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),parts=['POST$19','channelPermanent'].map(name=>{
  const fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(fn,name);return source.slice(fn.start,fn.end);
 });
 const r=s.f.auth.rules,rates=createIngressRules(s.f.clock);
 // Execute the original route and native auth/body/rate guards. The legacy
 // publisher is captured only in the baseline; the candidate uses the outbox.
 return vm.runInNewContext(parts.join('\n')+'\nPOST$19',{Response,Error,AuthRequestError:r.AuthRequestError,requireGameSession:r.requireGameSession,assertCsrf:r.assertCsrf,readJsonObject:r.readJsonObject,authErrorResponse:r.authErrorResponse,noStoreHeaders:r.noStoreHeaders,enforceLocalActionRate:rates.action,guildVillageService:()=>s.core.guild,__colChannelPermanent:globalThis.__colChannelPermanent,authDatabase:()=>s.host.database,publishGuildEjections:publish});
}

export async function villageFixture(t){
 const s=await nativeHttpHost(t),{f,core,host,world,http,connect}=s;await world.stopJobs();
 const guest=extraPlayer(s,71),observer=extraPlayer(s,72);
 await host.database.atomic(()=>{for(const id of [f.account.id,'shared-account-71','shared-account-72'])globalThis.__colLaunch.grant(id,true);});
 const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket);
 for(const actor of [guest,observer]){assert.equal((await actor.http()).status,200);actor.ticket=await actor.http('transfer',{channel:4});assert.equal(actor.ticket.status,200,JSON.stringify(actor.ticket));actor.live=await connect(actor.ticket);}
 assert.notEqual(ticket.channel,4);
 await core.nativeConfiguration.run([],()=>{
  const service=core.guild;service.save(true,service.settings().revision);
  f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('http-revoke511','HTTP revoke','http revoke',f.id);
  for(const id of [f.id,observer.id])f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(id,'http-revoke511');
  f.sql.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run('http-revoke511',f.id);
  f.sql.prepare('INSERT INTO guild_castle_guests VALUES(?,?,?,?)').run('http-revoke511',guest.id,f.id,Math.floor(f.clock()/1000)+1800);
  for(const id of [guest.id,observer.id])f.sql.prepare("UPDATE players SET area='guild_hall_http-revoke511',x=1000,y=1000,hp=max_hp,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0 WHERE id=?").run(id);
 });
 const body={action:'revoke',target:guest.id,requestId:randomUUID()},request=(input=body)=>f.request({path:'/api/guild-village',body:input}),read=()=>JSON.parse(JSON.stringify({guest:f.sql.prepare('SELECT area,position_revision,hp_revision,realtime_scope_version FROM players WHERE id=?').get(guest.id),invited:!!f.sql.prepare('SELECT 1 FROM guild_castle_guests WHERE guild_id=? AND player_id=?').get('http-revoke511',guest.id),receipts:f.sql.prepare('SELECT COUNT(*) n FROM guild_castle_receipts').get().n,notices:f.sql.prepare("SELECT COUNT(*) n FROM kernel511_notifications WHERE json_extract(payload,'$.event.type')='player_respawn'").get().n}));
 return {...s,guest,observer,ticket,live,body,request,read,old:[world.row,...s.supervisor.rows.values()]};
}

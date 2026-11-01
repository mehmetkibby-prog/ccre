import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {nativeAdminSource} from './native-admin-fixture.mjs';
import {createIngressRules} from '../generated/ingress-rules.mjs';
import {patchNativeGuildMembership} from '../patch-native-guild-membership.mjs';
export const membershipSource=patchNativeGuildMembership(nativeAdminSource).source;
const snippets=new Map();
export function membershipHandler(s,{source=membershipSource,onlyAction=false,clock=s.f.clock,uuid=()=>crypto.randomUUID(),publish=()=>{throw Error('legacy guild publisher reached');}}={}){
 let parts=snippets.get(source);if(!parts){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});parts=['POST$22','guildAction','guildKickoffStatements','joinGuildWar','startGuildWar','baseReadyPlayer','authorized','NORMAL_GROUP_RULES','GROUP_RULES'].map(name=>{const n=ast.body.find(n=>n.id?.name===name||n.declarations?.some(d=>d.id.name===name));assert(n,name);return source.slice(n.start,n.end);});snippets.set(source,parts);}
 const r=s.f.auth?.rules,rates=createIngressRules(clock);
 return vm.runInNewContext(parts.join('\n')+'\n'+(onlyAction?'guildAction':'POST$22'),{Response,Error,crypto:{randomUUID:uuid},Date:{now:clock},channelCapacitySql510:()=>25,AuthRequestError:r?.AuthRequestError,requireGameSession:r?.requireGameSession,assertCsrf:r?.assertCsrf,readJsonObject:r?.readJsonObject,authErrorResponse:r?.authErrorResponse,noStoreHeaders:r?.noStoreHeaders,enforceLocalActionRate:rates.action,db:()=>s.host?.database,guildVillageService:()=>s.core.guild,guild_village_runtime_exports:{guildVillageService:()=>s.core.guild,publishGuildEjections:publish},publishRealtimeGuildEvent:publish,getRequestExecutionContext:()=>null});
}
export function membershipOracle({clock,uuid,publish}){
 const ast=parse(nativeAdminSource,{ecmaVersion:'latest',sourceType:'module'}),route=ast.body.find(n=>n.id?.name==='POST$22'),event=route.body.body[0].block.body.find(n=>n.type==='TryStatement'&&nativeAdminSource.slice(n.start,n.end).includes('const onlyJoiner'));
 const parts=['guildAction','guildKickoffStatements','joinGuildWar','startGuildWar','baseReadyPlayer','authorized','NORMAL_GROUP_RULES','GROUP_RULES'].map(name=>{const n=ast.body.find(n=>n.id?.name===name||n.declarations?.some(d=>d.id.name===name));return nativeAdminSource.slice(n.start,n.end);});
 const changed='async function changed(database,playerId,body,result){const auth={player:{id:playerId}},db=()=>database;'+nativeAdminSource.slice(event.start,event.end)+'}';
 return vm.runInNewContext(parts.join('\n')+'\n'+changed+'\n({action:guildAction,changed})',{Error,crypto:{randomUUID:uuid},Date:{now:clock},channelCapacitySql510:()=>25,publishRealtimeGuildEvent:publish,getRequestExecutionContext:()=>null});
}
export function membershipRequest(s,body,actor='leader'){
 if(actor==='leader')return s.f.request({path:'/api/guild',body});
 assert.equal(actor,'member');const index=72,token='shared-native-session-'+String(index).repeat(40),csrf='shared-native-csrf-'+String(index).repeat(40),instance=s.f.sql.prepare('SELECT instance_id FROM game_presence WHERE account_id=?').get('shared-account-'+index).instance_id;
 return new Request(s.f.origin+'/api/guild',{method:'POST',headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf,'X-Game-Instance':instance,'Content-Type':'application/json'},body:JSON.stringify(body)});
}

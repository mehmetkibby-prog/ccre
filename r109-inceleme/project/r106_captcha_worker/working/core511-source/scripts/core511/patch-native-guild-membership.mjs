import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

export function patchNativeGuildMembership(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$22');
 if(!fn||hash(source.slice(fn.start,fn.end))!=='ae791871f8d1975a055e6009721c8c00e0101f1563ac6e739862274e605dffe1')throw Error('native_guild_membership_route_changed');
 const body=fn.body.body[0].block.body,call=body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='result'))?.declarations[0].init.argument,repair=body.find(n=>n.type==='IfStatement'&&source.slice(n.start,n.end).includes('publishGuildEjections(guildVillageService()?.repairAll() ?? [])')),event=body.find(n=>n.type==='TryStatement'&&source.slice(n.start,n.end).includes('const onlyJoiner = body.action === "war_join"'));
 const original='guildAction(db(), auth.player.id, body)',guard='["create", "invite", "accept", "decline", "leave", "disband", "kick", "permission", "transfer", "tax", "withdraw", "challenge", "war_decline", "war_accept", "war_join"].includes(body.action)';
 if(!call||source.slice(call.start,call.end)!==original||!repair||!event)throw Error('native_guild_membership_calls_changed');
 const edits=[
  {start:call.start,end:call.end,original,replacement:'('+guard+' ? db().core511GuildVillage.membership(guildVillageService(), auth.player.id, body) : '+original+')'},
  {start:repair.start,end:repair.end,original:source.slice(repair.start,repair.end),replacement:'/* Owned membership changes commit original guild repairs and notices together. */'},
  {start:event.start,end:event.end,original:source.slice(event.start,event.end),replacement:'if (!'+guard+') '+source.slice(event.start,event.end)}
 ];
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),nativeRouteSha256:hash(source.slice(fn.start,fn.end)),patchedSha256:hash(output),edits,scope:'All fifteen native guild actions and their notification paths; repairAll remains limited to leave/kick/disband, native auth/CSRF/rates/body/result/error preserved; war owner epochs follow native movement in the same COMMIT'}};
}

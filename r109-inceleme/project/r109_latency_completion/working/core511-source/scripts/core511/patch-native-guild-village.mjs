import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

export function patchNativeGuildVillage(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$19');
 if(!fn||hash(source.slice(fn.start,fn.end))!=='3b98ec7b838912c17fd1ecd6f70beec5969163ad97b54a29bbd2d851db3fc242')throw Error('native_guild_village_route_changed');
 const edits=[],body=fn.body.body[0].block.body,decl=body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='result')),call=decl?.declarations.find(d=>d.id.name==='result')?.init?.argument;
 const original='channelPermanent([auth.player.id], () => service.act(auth.player.id, body))',repair=body.find(n=>n.type==='IfStatement'&&source.slice(n.start,n.end)==='if (body.action === "revoke") await publishGuildEjections(service.repairAll());');
 if(!call||source.slice(call.start,call.end)!==original||!repair)throw Error('native_guild_village_calls_changed');
 edits.push({start:call.start,end:call.end,original,replacement:'(body.action === "revoke" ? authDatabase().core511GuildVillage.revoke(service, auth.player.id, body) : '+original+')'});
 edits.push({start:repair.start,end:repair.end,original:source.slice(repair.start,repair.end),replacement:'/* Revoke repairs and notices are committed by the owned adapter. */'});
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),nativeRouteSha256:hash(source.slice(fn.start,fn.end)),patchedSha256:hash(output),edits,scope:'Only revoke execution and its post-callback repair/publication; original auth, CSRF, rates, body limit, all other actions and response/error formatting unchanged'}};
}

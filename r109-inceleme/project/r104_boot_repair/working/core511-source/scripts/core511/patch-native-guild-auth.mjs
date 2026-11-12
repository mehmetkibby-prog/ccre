import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const originals=new Set(['4cccf31fb5c21f7520b7e3d557dd995171afbaeabb6af86a15380aa4d4e46f4b','dbee7aad153f3494578eba7e72db18df336a37c318d68d531398a14326fde915']);
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}

export function patchNativeGuildAuth(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='validateGameSession');
 if(!fn||!originals.has(hash(source.slice(fn.start,fn.end))))throw Error('native_guild_auth_function_changed');
 const edits=[];walk(fn,n=>{
  const original=source.slice(n.start,n.end);
  if(n.type==='ChainExpression'&&original==='guildVillageService()?.repair(session.player.id)')edits.push({start:n.start,end:n.end,original,replacement:'guildVillageService() ? await authDatabase().core511GuildAuth.repair(guildVillageService(), session.player.id) : undefined'});
  if(n.type==='CallExpression'&&original==='publishGuildEjections([repair])')edits.push({start:n.start,end:n.end,original,replacement:'authDatabase().core511GuildAuth.publish([repair])'});
 });
 if(edits.length!==2)throw Error('native_guild_auth_calls_changed');let output=source;
 for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),nativeFunctionSha256:hash(source.slice(fn.start,fn.end)),patchedSha256:hash(output),edits,scope:'Only repair and publisher call expressions; original authorization, guard order and session result remain unchanged'}};
}

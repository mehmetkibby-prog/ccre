import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
export function patchNativeBotCheck(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['GET$25','POST$30']){
  const fn=ast.body.find(n=>n.id?.name===name),calls=[];
  walk(fn,n=>{if(n.type==='CallExpression'&&(n.callee.object?.name==='bot'&&n.callee.property.name===(name==='GET$25'?'required':'verify')||n.callee.object?.name==='Response'&&n.callee.property.name==='json'))calls.push(n);});
  if(calls.length!==2||source.slice(fn.start,fn.end).includes('core511BotCheck'))throw Error('native_bot_route_changed:'+name);
  for(const n of calls){const original=source.slice(n.start,n.end),operation=name==='GET$25'&&n.callee.object?.name==='Response'?`{const required=bot.required(auth.account.id);return ${original};}`:original,replacement=`(await db().core511BotCheck.call(auth,async()=>{
 const current=await requireGameSession(request);${name==='POST$30'?'await assertCsrf(request,current);':''}
 if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;
},bot,()=>${operation}))`;edits.push({start:n.start,end:n.end,original,replacement});}
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Native game CAPTCHA read/verify calls and response construction only; original attempts, challenge generation, single-use, authentication, CSRF and rates retained'}};
}

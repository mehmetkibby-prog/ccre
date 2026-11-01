import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');

// Explicit native AFK control requests are cold owner operations. Their
// existing daily ledger, timing SQL and errors remain unchanged; no SQL or
// polling is introduced in any channel simulation tick.
export function patchNativeAfkControl(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['GET$29','POST$38']){
  const fn=ast.body.find(n=>n.id?.name===name),body=fn?.body.body.find(n=>n.type==='TryStatement')?.block.body;
  const first=body?.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.init?.type==='AwaitExpression'&&d.init.argument.callee?.name==='ready')),last=body?.at(-1);
  if(!first||last?.type!=='ReturnStatement'||source.slice(first.start,last.end).includes('core511HttpAction'))throw Error('native_afk_control_changed:'+name);
  const original=source.slice(first.start,last.end),replacement=`return await db().core511HttpAction.player(auth,async()=>{
 const current=await requireGameSession(request);${name==='POST$38'?'await assertCsrf(request,current);':''}
 if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;
},async()=>{${original}},true);`;edits.push({start:first.start,end:last.end,original,replacement});
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Two native AFK control blocks under existing durable actor gate; original daily/time/level/area/GM/HP rules and responses unchanged; no channel tick SQL'}};
}

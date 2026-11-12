import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
const fresh=csrf=>`async()=>{const current=await requireGameSession(request);${csrf?'await assertCsrf(request,current);':''}if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;}`;

export function patchNativeTradeStorage(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[],fn=name=>ast.body.find(n=>n.id?.name===name);
 const body=fn('POST')?.body.body.find(n=>n.type==='TryStatement')?.block.body,first=body?.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='peer')),last=body?.at(-1);
 if(!first||last?.type!=='ReturnStatement')throw Error('native_trade_body_changed');
 const original=source.slice(first.start,last.end),gate='await channelPermanent([auth.player.id, ...peer ? [peer] : []], () => service().act(auth.player.id, input))',defer='if (ctx) ctx.waitUntil(delivery);';
 if(original.split(gate).length!==2||original.split(defer).length!==2)throw Error('native_trade_gate_changed');
 const changed=original.slice(first.end-first.start).replace(gate,'service().act(auth.player.id, input)').replace(defer,'await delivery;');
 edits.push({start:first.start,end:last.end,original,replacement:`return await db().core511HttpAction.trade(auth,input,${fresh(true)},async()=>{${changed}});`});
 for(const [name,method]of [['POST$2','act'],['POST$20','act'],['GET$4','snapshot'],['GET$2','snapshot']]){
  const found=[];walk(fn(name),n=>{if(n.type!=='CallExpression')return;if(method==='act'&&n.callee.name==='channelPermanent'||method==='snapshot'&&n.callee.property?.name==='snapshot')found.push(n);});
  if(found.length!==1)throw Error('native_trade_storage_call_changed:'+name);const n=found[0],original=source.slice(n.start,n.end),operation=method==='act'?source.slice(n.arguments[1].start,n.arguments[1].end):`()=>(${original})`;
  edits.push({start:n.start,end:n.end,original,replacement:`(await db().core511HttpAction.player(auth,${fresh(method==='act')},${operation}))`});
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Native two-party trade gate and private notices; fresh native storage/guild-skill mutation authorization and owned storage/trade snapshots; original SQL, receipts, rule guards and guild sync retained'}};
}

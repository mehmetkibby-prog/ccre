import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
const auth=`async()=>{const current=await requireGameSession(request);await assertCsrf(request,current);if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;}`;

export function patchNativeSocial(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[],chat=ast.body.find(n=>n.id?.name==='POST$29'),body=chat?.body.body.find(n=>n.type==='TryStatement')?.block.body;
 const first=body?.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='database')),last=body?.at(-1);
 if(!first||last?.type!=='ReturnStatement')throw Error('native_chat_body_changed');
 const original=source.slice(first.start,last.end),deferred='if (context) context.waitUntil(delivery);\n\t\telse await delivery;';if(original.split(deferred).length!==2)throw Error('native_chat_delivery_changed');
 // Keep the original persisted messages, item-link transaction and native
 // audience senders. Await their delivery capture before the scope closes.
 edits.push({start:first.start,end:last.end,original,replacement:`return await db().core511HttpAction.action(auth,{action:'native_chat'},${auth},async()=>{${original.replace(deferred,'await delivery;')}});`});
 for(const name of ['POST$21','POST$18']){
  const fn=ast.body.find(n=>n.id?.name===name),found=[];walk(fn,n=>{if(name==='POST$21'&&n.type==='CallExpression'&&n.callee.object?.type==='CallExpression'&&n.callee.object.callee.name==='guildSkillService'&&n.callee.property.name==='send')found.push(n);if(name==='POST$18'&&n.type==='VariableDeclarator'&&n.id.name==='result')found.push(n.init);});
  if(found.length!==1)throw Error('native_social_call_changed:'+name);const n=found[0],original=source.slice(n.start,n.end);edits.push({start:n.start,end:n.end,original,replacement:`(await db().core511HttpAction.player(auth,${auth},async()=>(${original}),true))`});
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Native chat/item-link actor ownership and awaited native audience capture; guild chat and voice calls under fresh native session gate; original body/rates/filter/SQL/receipts/token rules retained'}};
}

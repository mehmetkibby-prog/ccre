import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}

// Candidate assembly only. The original admin authorization, Origin/body,
// actor queries, native callbacks, SQL and response/error formatting survive.
export function patchNativeConfiguration(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45'),body=fn?.body.body[0]?.block?.body,edits=[];
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.slice(body[2].start,body[2].end)!=='const payload = await readJsonObject(request);')throw Error('native_configuration_guard_changed');
 walk(fn,n=>{if(n.type!=='CallExpression'||n.callee.name!=='channelPermanent')return;if(n.arguments.length!==2||n.arguments[1].type!=='ArrowFunctionExpression'||n.arguments[1].async)throw Error('native_configuration_callback_changed');edits.push({start:n.callee.start,end:n.callee.end,original:source.slice(n.callee.start,n.callee.end),replacement:'database.core511Configuration.run'});});
 if(edits.length!==9)throw Error('native_configuration_calls_changed');let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Nine native admin configuration call targets only; native arguments/callbacks, security and all other bundle bytes unchanged'}};
}

import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}

// Sole non-accounts batch only. Original password/account/ban validation,
// token entropy, SQL, accounts role/guard, lifetime, errors and cookies remain.
export function patchNativeSession(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='createSession');if(!fn)throw Error('native_session_create_missing');const edits=[];
 walk(fn,n=>{if(n.type!=='CallExpression'||n.callee.type!=='MemberExpression'||n.callee.object.name!=='database'||n.callee.property.name!=='batch'||n.arguments[0]?.type!=='ArrayExpression')return;
  if(n.arguments.length!==1||n.arguments[0].elements.length!==4)throw Error('native_session_batch_changed');
  edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement:'database.core511Session.batch('+source.slice(n.arguments[0].start,n.arguments[0].end)+', accountId, nowMs)'});
 });
 if(edits.length!==1)throw Error('native_session_branches_changed');const e=edits[0],output=source.slice(0,e.start)+e.replacement+source.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only native non-accounts createSession batch call; native statements/auth/token/realm semantics unchanged'}};
}

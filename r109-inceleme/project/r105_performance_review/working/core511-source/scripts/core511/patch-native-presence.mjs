import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}

// Candidate only: the original auth/CSRF, instance/body/account/maintenance
// checks, SQL/binds, native45s expiry, error/response/bootstrap remain intact.
export function patchNativePresence(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$24');if(!fn)throw Error('native_presence_route_missing');const edits=[];
 walk(fn,n=>{if(n.type!=='CallExpression'||n.callee.type!=='MemberExpression'||!['first','run'].includes(n.callee.property.name))return;const bound=n.callee.object,prepare=bound?.callee?.object;if(bound?.type!=='CallExpression'||bound.callee.property?.name!=='bind'||prepare?.type!=='CallExpression'||prepare.callee.object?.name!=='db'||prepare.callee.property?.name!=='prepare')return;
  if(n.arguments.length)throw Error('native_presence_result_changed');const first=n.callee.property.name==='first';edits.push({start:n.start,end:n.end,first,original:source.slice(n.start,n.end),replacement:'db.core511Presence.execute('+source.slice(bound.start,bound.end)+', {accountId:auth.account.id,tokenHash:auth.tokenHash,instance,action:body.action,nowMs:now,first:'+first+'})'});
 });
 if(edits.length!==3||edits.filter(e=>e.first).length!==2)throw Error('native_presence_statements_changed');let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only three native game-presence statement execution calls; all other native bytes and SQL unchanged'}};
}

import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex'),pin='702053f4520c1cb96f166a71948c054de984689adebaa19aadbeeeee00b3dc48';
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
export function patchNativeRealmAdmission(source){
 if(hash(source)!==pin)throw Error('native_realm_admission_source_changed');const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),klass=ast.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='RealmAdmission')?.declaration,method=klass?.body.body.find(n=>n.key.name==='accept');if(!method)throw Error('native_realm_admission_accept_missing');const edits=[];
 walk(method,n=>{if(n.type!=='CallExpression'||n.callee.type!=='MemberExpression'||n.callee.object.name!=='db'||n.callee.property.name!=='batch')return;
  if(n.arguments.length!==1||n.arguments[0].type!=='ArrayExpression'||n.arguments[0].elements.length!==5)throw Error('native_realm_admission_statements_changed');edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement:'db.core511RealmAdmission.acceptBatch('+source.slice(n.arguments[0].start,n.arguments[0].end)+', a.id, now)'});
 });
 if(edits.length!==1)throw Error('native_realm_admission_call_count');const security=klass.body.body.find(n=>n.key.name==='applySecurity');
 walk(security,n=>{if(n.type!=='CallExpression'||n.callee.type!=='MemberExpression'||n.callee.object.name!=='db'||n.callee.property.name!=='batch')return;
  if(n.arguments.length!==1||n.arguments[0].type!=='ArrayExpression'||n.arguments[0].elements.length!==3)throw Error('native_realm_security_statements_changed');edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement:'db.core511RealmSecurity.batch('+source.slice(n.arguments[0].start,n.arguments[0].end)+', accountId, state)'});
 });
 if(edits.length!==2)throw Error('native_realm_security_call_count');let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only the accept and applySecurity batch execution calls; all native SQL, binds, guards, receipt checks and other module bytes unchanged'}};
}

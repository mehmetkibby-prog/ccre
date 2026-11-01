import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
function walk(node,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(n=>walk(n,visit));else if(value?.type)walk(value,visit);}

// Candidate bundle patch only. Native Origin, optional-session CSRF, cookie
// validation/deletion, realm branches, account version rules, errors, redirect
// and response headers stay unchanged. Accounts-only realms retain V510.
export function patchNativeLogout(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='deleteCurrentSession');
 if(!fn)throw Error('native_logout_function_missing');const edits=[];
 walk(fn,node=>{if(node.type!=='CallExpression'||node.callee.type!=='MemberExpression'||node.callee.object.name!=='database'||node.callee.property.name!=='batch')return;
  if(node.arguments.length!==1||node.arguments[0].type!=='ArrayExpression')throw Error('native_logout_batch_changed');
  const original=source.slice(node.start,node.end),statements=source.slice(node.arguments[0].start,node.arguments[0].end);
  edits.push({start:node.start,end:node.end,original,replacement:'(realmRuntime()?.role === "accounts" ? '+original+' : database.core511Logout.batch('+statements+', tokenHash))'});
 });
 if(edits.length!==2)throw Error('native_logout_branches_changed');let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only two native logout batch calls; original route/auth/SQL/cookies/realm policy unchanged'}};
}

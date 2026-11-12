import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
function walk(node,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value?.type)walk(value,visit);}

// Applied by the candidate assembler to verified native bundle bytes. Only
// three diagnostic calls change. Existing route registration, requireAdmin,
// Origin/body guards and all other admin actions remain byte-identical.
export function patchNativeAdmin(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['GET$35','POST$45']){
  const fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name),body=fn?.body.body[0]?.block?.body;
  if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });')throw Error('native_admin_guard_changed');
  if(name==='POST$45'&&(source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.slice(body[2].start,body[2].end)!=='const payload = await readJsonObject(request);'))throw Error('native_admin_body_guard_changed');
  const calls=[];walk(fn,node=>{
   if(node.type!=='CallExpression')return;
   if(node.callee.name==='adminCpuProfile507'){
    if(node.arguments.length!==2||source.slice(node.arguments[0].start,node.arguments[0].end)!=='db()')throw Error('native_admin_database_changed');
    calls.push({start:node.start,end:node.end,kind:'profile',replacement:'db().core511Admin.profile('+source.slice(node.arguments[1].start,node.arguments[1].end)+')'});
   }
   if(node.callee.type==='MemberExpression'&&node.callee.object.name==='Response'&&node.callee.property.name==='json'&&node.arguments[0]?.callee?.name==='adminLoadSnapshot')calls.push({start:node.start,end:node.end,kind:'load',replacement:'await db().core511Admin.load()'});
  });
  if(calls.length!==(name==='GET$35'?2:1)||calls.filter(e=>e.kind==='profile').length!==1)throw Error('native_admin_routes_changed');
  edits.push(...calls);
 }
 let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:edits.map(e=>({...e,original:source.slice(e.start,e.end)})),scope:'Three diagnostic call expressions only; native admin authorization, Origin/body guards, routes and other actions unchanged'}};
}

import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
function walk(node,visit,parent=null){if(!node||typeof node!=='object')return;if(node.type)visit(node,parent);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit,node));else if(value?.type)walk(value,visit,node);}

// Replace only the old three-channel coordinator hook. The original service,
// validation, SQL/HP rounding, revision conflict and HTTP guards are retained.
export function patchNativeRuneConfiguration(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45'),edits=[];
 if(!fn)throw Error('native_rune_configuration_route');
 walk(fn,(node,parent)=>{
  if(node.type!=='MemberExpression'||node.object?.name!=='globalThis'||node.property?.name!=='__colRuneV2HealthSave485')return;
  let target,replacement;
  if(parent.type==='UnaryExpression'&&parent.operator==='typeof'){target=node;replacement='database.core511Configuration?.saveRuneV2';}
  else if(parent.type==='CallExpression'&&parent.callee===node&&parent.arguments.length===2&&source.slice(parent.arguments[0].start,parent.arguments[0].end)==='payload.config'&&source.slice(parent.arguments[1].start,parent.arguments[1].end)==='payload.revision'){target=parent;replacement='database.core511Configuration.saveRuneV2(service,payload.config,payload.revision)';}
  else throw Error('native_rune_configuration_hook_changed');
  edits.push({start:target.start,end:target.end,original:source.slice(target.start,target.end),replacement});
 });
 if(edits.length!==2)throw Error('native_rune_configuration_hook_count');
 let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Original Rune V2 service and arguments retained; only hook availability and call use the private all-owner configuration barrier'}};
}

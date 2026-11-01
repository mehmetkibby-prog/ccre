import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(node,visit){if(!node||typeof node!=='object')return;if(node.type)visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value?.type)walk(value,visit);}

export function patchGuildVoiceRenewR72(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),route=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='POST$18'),results=[];
 walk(route,n=>{if(n.type==='VariableDeclarator'&&n.id?.name==='result')results.push(n);});
 if(results.length!==1)throw Error('r72_voice_result_anchor');
 const value=results[0].init,calls=[];walk(value,n=>{if(n.type==='CallExpression'&&n.callee?.type==='MemberExpression'&&n.callee.property?.name==='player'&&n.callee.object?.property?.name==='core511HttpAction')calls.push(n);});
 if(calls.length!==1||calls[0].arguments.length!==4)throw Error('r72_voice_gate_anchor');
 const original=source.slice(value.start,value.end),reauthorize=source.slice(calls[0].arguments[1].start,calls[0].arguments[1].end);
 if(!original.includes('service.renew(auth, String(body.identity))')||!original.includes('service.join(auth)')||!original.includes('service.leave(auth, String(body.identity))')||!reauthorize.includes('assertCsrf'))throw Error('r72_voice_native_body_anchor');
 const replacement=`(body.action === "renew" ? await db().core511HttpAction.voiceRenew(auth,String(body.identity),${reauthorize}) : ${original})`;
 const output=source.slice(0,value.start)+replacement+source.slice(value.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 const restored=output.slice(0,value.start)+original+output.slice(value.start+replacement.length);if(restored!==source)throw Error('r72_voice_inverse');
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),inverseEqual:true,edits:[{from:original,to:replacement}],scope:'Guild voice renew only uses the bound native service after unchanged fresh session, CSRF, account and actor checks. Join and leave retain the permanent gate; native service body and authorization are unchanged.'}};
}

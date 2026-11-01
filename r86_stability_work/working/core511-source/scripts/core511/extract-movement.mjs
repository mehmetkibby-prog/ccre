import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const base=process.env.COL_CORE511_BASE??path.resolve(import.meta.dirname,'../../../native510-bb3a6cc689c6'),out=process.env.COL_CORE511_RULE_OUTPUT??path.join(import.meta.dirname,'generated');
const hash=b=>createHash('sha256').update(b).digest('hex'),manifestBytes=fs.readFileSync(path.join(base,'realm-package-manifest.json'));
if(hash(manifestBytes)!=='bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b')throw Error('Exact V510 required');
const file='dist-vds/server/channel-runtime/index.mjs',bytes=fs.readFileSync(path.join(base,file));
if(JSON.parse(manifestBytes).files.find(row=>row.path===file)?.sha256!==hash(bytes))throw Error('V510 movement changed');
const source=bytes.toString(),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='applyAuthoritativeMove');
if(!node?.async)throw Error('Unexpected movement source');
const edits=[{start:node.start,end:node.start+6,text:''}],counts={await:0,checkpoint:0,moved:0};
function visit(n){
 if(!n||typeof n!=='object')return;
 if(n.type==='AwaitExpression'){edits.push({start:n.start,end:n.argument.start,text:''});counts.await++;}
 if(n.type==='VariableDeclarator'&&n.id.name==='checkpoint'){
  if(source.slice(n.init.start,n.init.end).indexOf('UPDATE players SET x = ?')<0)throw Error('Unexpected checkpoint');
  edits.push({start:n.init.start,end:n.init.end,text:'database.checkpoint(session, row, payload, nowMs, targetX, targetY, movement)'});counts.checkpoint++;return;
 }
 if(n.type==='VariableDeclarator'&&n.id.name==='moved'){edits.push({start:n.init.start,end:n.init.end,text:'checkpoint'});counts.moved++;return;}
 for(const value of Object.values(n)){if(Array.isArray(value))for(const child of value)visit(child);else if(value&&typeof value==='object')visit(value);}
}
visit(node);if(counts.await!==4||counts.checkpoint!==1||counts.moved!==1)throw Error('Movement rewrite scope changed '+JSON.stringify(counts));
let body=source.slice(node.start,node.end);for(const edit of edits.sort((a,b)=>b.start-a.start))body=body.slice(0,edit.start-node.start)+edit.text+body.slice(edit.end-node.start);
const text=`// Generated from pinned V510. Only async/storage operations were replaced.\nexport function createMovementRule(rules, recordSecurityEvent=()=>{}) {\nconst {validArea,movementPathDistance,isAreaWalkableSegment,evaluateMovementBudget}=rules;\nconst readAuthoritativeMovement=(database,playerId,accountId,now)=>database.read(playerId,accountId,now);\n${body}\nreturn applyAuthoritativeMove;\n}\n`;
parse(text,{ecmaVersion:'latest',sourceType:'module'});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'movement.mjs'),text);
const named=name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!n)throw Error('Native movement function missing '+name);return source.slice(n.start,n.end);};
function sync(code){const tree=parse(code,{ecmaVersion:'latest',sourceType:'module'}),edits=[];function walk(n){if(!n||typeof n!=='object')return;if(n.type==='AwaitExpression')edits.push([n.start,n.argument.start]);if(n.async){if(code.slice(n.start,n.start+5)!=='async')throw Error('Unexpected native movement async');edits.push([n.start,n.start+5]);}for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v?.type)walk(v);}}walk(tree);for(const [a,b]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,a)+code.slice(b);return code;}
const wrapper=named('executeMovementAction'),read=named('readAuthoritativeMovement'),original=named('applyAuthoritativeMove');
const exports=`const {settlePveEngagement,getGameSettings,publishRealtimeRoomEvent,deliverRealtime,recordSecurityEvent}=ports;\n`;
const actions=`// Generated exact V510 wrapper and SQL writer. No movement formula changes.\nimport {createMovementRule} from './movement.mjs';\nexport function createMovementActionMemory(rules,ports){\n${exports}const applyAuthoritativeMove=createMovementRule(rules,recordSecurityEvent),readAuthoritativeMovement=(database,...args)=>database.read(...args);\n${sync(wrapper)}\nreturn executeMovementAction;\n}\nexport function createMovementActionWriter(rules,ports){\n${exports}const {validArea,movementPathDistance,isAreaWalkableSegment,evaluateMovementBudget}=rules;\n${sync(read)}\n${sync(original)}\n${sync(wrapper)}\nreturn {executeMovementAction,readAuthoritativeMovement};\n}\n`;
parse(actions,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path.join(out,'movement-action.mjs'),actions);
fs.writeFileSync(path.join(out,'movement-proof.json'),JSON.stringify({baselineSha256:hash(manifestBytes),originalFunctionSha256:hash(source.slice(node.start,node.end)),outputSha256:hash(text),storageRewriteCounts:counts,wrapperSha256:hash(wrapper),generatedActionSha256:hash(actions),fullMovementIntegration:false,remaining:'Admission/session/dungeon/access-repair guards are bound by the production router, outside executeMovementAction.'},null,2)+'\n');
console.log(JSON.stringify({bytes:Buffer.byteLength(text),...counts}));

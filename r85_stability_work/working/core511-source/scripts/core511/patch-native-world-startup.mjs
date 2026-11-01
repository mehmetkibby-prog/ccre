import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
import proof from './generated/native-world-startup-proof.json' with {type:'json'};
const hash=x=>createHash('sha256').update(x).digest('hex');

export function patchNativeWorldStartup(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['ensureWorldSeed','ensureMonsterBalanceInitialized']){
  const fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!fn?.async||fn.params.length||hash(source.slice(fn.body.start,fn.body.end))!==proof.bodies[name])throw Error('native_startup_function_changed:'+name);
  edits.push({name,start:fn.body.start,end:fn.body.end,original:source.slice(fn.body.start,fn.body.end),replacement:'{return db().core511WorldSeed.ensure();}'});
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Two warmup entry points check the sole host durable startup proof; all other native bytes unchanged'}};
}

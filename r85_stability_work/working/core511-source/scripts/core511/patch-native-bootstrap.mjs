import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');

// Replace only the legacy display helper. Its old three-channel/last_seen
// query and ensureWorldSeed must not run against live CORE511 owners. The
// original caller/auth/response construction and every other byte stay intact.
export function patchNativeBootstrap(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='col422ChannelBootstrap');if(!fn||fn.params.length||!fn.async)throw Error('native_bootstrap_function_changed');
 const e={start:fn.body.start,end:fn.body.end,original:source.slice(fn.body.start,fn.body.end),replacement:'{return db().core511Bootstrap.read();}'},output=source.slice(0,e.start)+e.replacement+source.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[e],scope:'Only legacy channel-bootstrap display body; original HTTP caller and authorization unchanged'}};
}

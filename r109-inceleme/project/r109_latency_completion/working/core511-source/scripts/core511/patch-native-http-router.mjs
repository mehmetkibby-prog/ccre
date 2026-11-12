import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');

export function patchNativeHttpRouter(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),exports=ast.body.filter(n=>n.type==='ExportNamedDeclaration').flatMap(n=>n.specifiers??[]),spec=exports.find(n=>n.exported.name==='default');
 if(spec?.local.name!=='_virtual_vinext_rsc_entry_default'||exports.length!==2)throw Error('native_http_export_changed');
 const edit={start:spec.local.start,end:spec.local.end,original:source.slice(spec.local.start,spec.local.end),replacement:'core511NativeHttpDefault'},wrapper='\nasync function core511NativeHttpDefault(...args){const binding=globalThis[Symbol.for("coreoflife.core511.httpBindings")];if(!binding)throw new Error("native_http_binding_required");return binding.route(args[0],()=>_virtual_vinext_rsc_entry_default(...args));}\n';
 const output=source.slice(0,edit.start)+edit.replacement+source.slice(edit.end)+wrapper;parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[edit,{start:source.length,end:source.length,original:'',replacement:wrapper}],scope:'Native RSC handler unchanged; default export adds sole-host kernel routes, native realm route policy, current readiness and graceful request drain'}};
}

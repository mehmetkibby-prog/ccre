import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');

// The native environment must never fall back to opening a second writer.
// All other environment values and native HTTP code are left intact.
export function patchNativeDatabase(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),env=ast.body.flatMap(n=>n.declarations??[]).find(n=>n.id?.name==='env');
 const getter=env?.init?.arguments?.[1]?.properties?.find(p=>p.key?.name==='get')?.value,branch=getter?.body.body[0];
 if(branch?.type!=='IfStatement'||source.slice(branch.test.start,branch.test.end)!=='key === "DB"'||branch.consequent.type!=='ReturnStatement'||branch.consequent.argument?.operator!=='??='||branch.consequent.argument?.right?.callee?.name!=='LocalDatabase')throw Error('native_http_database_changed');
 const edit={start:branch.consequent.start,end:branch.consequent.end,original:source.slice(branch.consequent.start,branch.consequent.end),replacement:'{ const binding = globalThis[Symbol.for("coreoflife.core511.httpBindings")]; if (!binding) throw new Error("native_http_binding_required"); return binding.database(); }'};
 const output=source.slice(0,edit.start)+edit.replacement+source.slice(edit.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[edit],scope:'Only native env.DB fallback; require the existing sole host binding'}};
}

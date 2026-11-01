import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
import {ADMIN_SETTINGS_R65} from './admin-settings-r65.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

// Apply last: existing auth, Origin/body validation and all route-specific
// validation/CAS/SQL stay byte-for-byte inside the callback. Only these cold
// admin actions enter the all-owner barrier; no player input gains a new poll.
export function patchAdminSettingsR65(source){
 if(source.includes('runAdminSettingsR65('))throw Error('admin_settings_r65_already_patched');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45');
 const body=fn?.body.body.find(n=>n.type==='TryStatement')?.block.body;
 const database=body?.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='database'));
 const last=body?.at(-1);
 if(!database||last?.type!=='ReturnStatement'||source.slice(database.start,database.end)!=='const database = db();')throw Error('admin_settings_r65_route_changed');
 const guards=source.slice(fn.start,database.start);
 if(!guards.includes('requireAdmin()')||!guards.includes('assertSameOrigin(request)')||!guards.includes('const payload ='))throw Error('admin_settings_r65_guards_changed');
 const edits=[
  {start:database.end,end:database.end,original:'',replacement:'\nconst runAdminSettingsBodyR65=async()=>{\n'},
  {start:last.end,end:last.end,original:'',replacement:'\n};\nreturn await ('+JSON.stringify(ADMIN_SETTINGS_R65)+'.includes(payload.action)?database.core511Configuration.runAdminSettingsR65(payload.action,runAdminSettingsBodyR65,async()=>{if(!await requireAdmin())throw new AuthRequestError(403,"admin_required","Bu alan yalnızca oyun yöneticisine açık.");assertSameOrigin(request);}):runAdminSettingsBodyR65());\n'}
 ];
 let output=source;for(const e of edits.toReversed())output=output.slice(0,e.start)+e.replacement+output.slice(e.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,actions:ADMIN_SETTINGS_R65,scope:'Legacy settings writes now drain, commit and refresh all four channels and shared world; original route bodies and authorization retained.'}};
}

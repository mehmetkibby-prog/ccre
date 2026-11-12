import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');

export function patchNativeGuildConfiguration(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45'),body=fn?.body.body[0]?.block?.body;
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.slice(body[2].start,body[2].end)!=='const payload = await readJsonObject(request);')throw Error('native_guild_configuration_guard_changed');
 const branch=body.find(n=>n.type==='IfStatement'&&source.slice(n.test.start,n.test.end)==='payload.action === "save_guild_village"');
 if(!branch||hash(source.slice(branch.start,branch.end))!=='bf1a320fd35d15c447ccf110519389549f495e6df5c250b132735579eaa48142')throw Error('native_guild_configuration_branch_changed');
 const [save,repair]=branch.consequent.body,edits=[
  {start:save.start,end:save.end,original:source.slice(save.start,save.end),replacement:'await database.core511GuildVillage.configure(guildVillageService(), payload.guildVillageEnabled, payload.guildVillageRevision);'},
  {start:repair.start,end:repair.end,original:source.slice(repair.start,repair.end),replacement:'/* Original settings, repairs and room events share the owned transaction. */'}
 ];
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),nativeBranchSha256:hash(source.slice(branch.start,branch.end)),patchedSha256:hash(output),edits,scope:'Only native save_guild_village save and repair/publication; native admin identity, Origin, body, snapshot, errors and all other branches unchanged'}};
}

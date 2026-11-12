import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativeGameplayR58(source){
 const from='const requestedSource = url.searchParams.get("source");';
 const to=from+'\n const mistPreviewR58=globalThis[Symbol.for("coreoflife.core511.httpBindings")]?.mistPreviewR58(session.player.id,url);if(mistPreviewR58)return Response.json({profile:mistPreviewR58},{headers:NO_STORE_HEADERS});';
 if(source.split(from).length!==2)throw Error('r58_loot_preview_anchor');
 const factorFrom='const itemMultiplier = forestLootMultiplier(sourceKey, player?.level, settings);';
 const factorTo='const itemMultiplier = globalThis[Symbol.for("coreoflife.core511.httpBindings")]?.levelExemptPreviewR58(session.player.id,url)?1:forestLootMultiplier(sourceKey, player?.level, settings);';
 if(source.split(factorFrom).length!==2)throw Error('r58_level_preview_anchor');
 const output=source.replace(from,to).replace(factorFrom,factorTo);
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{from,to,count:1},{from:factorFrom,to:factorTo,count:1}],scope:'Authenticated same-area/channel Sis loot preview uses actual immutable adventure drops; ordinary loot routes unchanged.'}};
}

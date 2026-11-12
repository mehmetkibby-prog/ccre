import {createHash} from 'node:crypto';
import {ZUMRUT_MATERIALS_R93} from './zumrut-materials-r93.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchZumrutMarketR93(source){
 const from='function parseDungeonMaterial(value) {';
 if(source.split(from).length!==2||source.includes('const zumrutMaterialNamesR93='))throw Error('zumrut_market_parser_anchor_changed');
 const to=from+`\n const zumrutMaterialNamesR93=${JSON.stringify(ZUMRUT_MATERIALS_R93)};\n if(typeof value==='string'&&Object.hasOwn(zumrutMaterialNamesR93,value))return {label:zumrutMaterialNamesR93[value],key:value,kind:value,value:0,percent:false};`;
 const debit='database.prepare(`UPDATE ${resourceTable} SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=? AND changes()>0`).bind(amount, playerId, stone.key, amount)';
 if(source.split(debit).length!==2)throw Error('zumrut_market_debit_anchor_changed');
 const unequip=debit+`,\n ...((isMaterial&&(stone.key==='zumrut_axe_r93'||stone.key==='zumrut_pickaxe_r93'))?[database.prepare("UPDATE zumrut_tools_r93 SET equipped='' WHERE player_id=? AND equipped=? AND changes()>0 AND NOT EXISTS(SELECT 1 FROM dungeon_materials WHERE player_id=? AND kind=? AND amount>0)").bind(playerId,stone.key==='zumrut_axe_r93'?'axe':'pickaxe',playerId,stone.key)]:[])`;
 const output=source.replace(from,to).replace(debit,unequip);
 if(output.replace(unequip,debit).replace(to,from)!==source)throw Error('zumrut_market_inverse_changed');
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{from,to,count:1},{from:debit,to:unequip,count:1}],scope:'Five valley inventory material kinds use the existing native player market. The same escrow transaction clears a selected tool only when its last owned unit is listed. Original prices, sale, cancellation, durability and replay SQL stay unchanged.'}};
}
export function patchZumrutRodR93(source){
 const start=source.indexOf('if (payload.action === "equip_rod") {'),end=source.indexOf('if (payload.action === "start_fishing") {',start);
 if(start<0||end<start||source.indexOf('if (payload.action === "equip_rod") {',start+1)!==-1)throw Error('zumrut_rod_action_anchor_changed');
 const from=source.slice(start,end),tail='.bind(now, playerId)]);';
 if(!from.includes('if (!player.has_rod) return Response.json')||!from.includes('UPDATE players SET rod_equipped = 1,')||from.split(tail).length!==2||from.includes('zumrut_tools_r93'))throw Error('zumrut_rod_batch_anchor_changed');
 const to=from.replace(tail,'.bind(now, playerId), database.prepare("UPDATE zumrut_tools_r93 SET equipped=\'\' WHERE player_id=? AND changes()>0 AND EXISTS(SELECT 1 FROM players WHERE id=? AND rod_equipped=1 AND hp>0)").bind(playerId,playerId)]);');
 const output=source.slice(0,start)+to+source.slice(end);
 if(output.replace(to,from)!==source)throw Error('zumrut_rod_inverse_changed');
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{from,to,count:1}],scope:'Existing rod equip transaction clears the selected gathering tool after successful rod equip. Original rod ownership guard, weapon unequip and player health update are retained.'}};
}

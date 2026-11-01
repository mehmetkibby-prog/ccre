import {createHash} from 'node:crypto';
import {MOUNT_MATERIALS_R60} from './mount-materials-r60.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function patchMountMarketR60(source){
 const from='function parseDungeonMaterial(value) {';
 const to=from+`\n if(process.env.CORE511_R60_MOUNT_MATERIALS==='1'&&typeof value==='string'&&Object.hasOwn(${JSON.stringify(MOUNT_MATERIALS_R60)},value))return {label:${JSON.stringify(MOUNT_MATERIALS_R60)}[value],key:value,kind:value,value:0,percent:false};`;
 if(source.split(from).length!==2)throw Error('r60_material_market_anchor');
 const output=source.replace(from,to);if(output.replace(to,from)!==source)throw Error('r60_material_market_inverse');
 return {source:output,proof:{sourceSha256:sha(source),patchedSha256:sha(output),edits:[{from,to,count:1}],scope:'Three mount material identities use the existing native dungeon-material market listing, escrow, purchase, cancellation and receipts. Flag0 leaves the original parser unchanged.'}};
}

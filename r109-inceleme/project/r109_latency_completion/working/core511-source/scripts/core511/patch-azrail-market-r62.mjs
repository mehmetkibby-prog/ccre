import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function patchAzrailMarketR62(source){
 const from='function parseDungeonMaterial(value) {';
 const to=from+`\n if(process.env.CORE511_R62_CHEST_MARKET==='1'&&value==='tower_azrail_chest')return {label:'Azrail Sandığı',key:value,kind:value,value:0,percent:false};`;
 if(source.split(from).length!==2)throw Error('r62_chest_market_anchor');
 const output=source.replace(from,to);if(output.replace(to,from)!==source)throw Error('r62_chest_market_inverse');
 return {source:output,proof:{sourceSha256:sha(source),patchedSha256:sha(output),edits:[{from,to,count:1}],scope:'Azrail chest identity uses unchanged native material escrow, purchase, cancellation and receipts. Flag0 restores original parser.'}};
}

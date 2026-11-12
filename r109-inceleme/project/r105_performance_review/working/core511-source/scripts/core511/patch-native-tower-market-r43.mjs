import {createHash} from 'node:crypto';
import {TOWER_MARKET_R43} from './r43-tower-materials.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativeTowerMarketR43(source){
 const anchor='function parseDungeonMaterial(value) {',count=source.split(anchor).length-1;
 if(count!==1)throw Error('r43_tower_market_parser_changed');
 const prefix=`const towerMarketEnabledR43=process.env.CORE511_TOWER_MARKET!=='0';\nconst towerMarketCatalogR43=Object.freeze(${JSON.stringify(TOWER_MARKET_R43)});\n`;
 const replacement=anchor+"\n if(towerMarketEnabledR43&&typeof value==='string'&&Object.hasOwn(towerMarketCatalogR43,value))return {label:towerMarketCatalogR43[value],key:value,kind:value,value:0,percent:false};";
 const output=prefix+source.replace(anchor,replacement);
 if(output.slice(prefix.length).replace(replacement,anchor)!==source)throw Error('r43_tower_market_inverse');
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{position:'prepend',from:'',to:prefix},{from:anchor,to:replacement,count:1}],scope:'Five tower upgrade/crafting material identities admitted to the existing native market parser. Existing listing/settlement SQL, receipts, ownership, CSRF, prices and quantities unchanged. Flag0 original parser.'}};
}

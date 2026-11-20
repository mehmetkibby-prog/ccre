import {encodeCommittedActorR113,encodeCommittedTextR127} from './committed-codec-r113.mjs';
import {prepareCached477} from './writer-statements.mjs';

const inventoryFields = ['id','player_id','kind','item_name','rarity','power','role','enchantments','equipped','created_at','expires_at_ms','sale_locked499'];
const storageFields = ['id','player_id','slot','kind','item_name','rarity','power','role','enchantments','created_at'];
export const inventoryRowsR127 = 'SELECT '+inventoryFields.join(', ')+" FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'royal' THEN 8 WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC";
export const storageRowsR127 = 'SELECT '+storageFields.join(', ')+' FROM player_storage_items WHERE player_id = ? ORDER BY slot';
const object = fields => 'json_object('+fields.map(field=>"'"+field+"',"+field).join(',')+')';
const inventoryJson = 'SELECT json_group_array('+object(inventoryFields)+') AS rows FROM ('+inventoryRowsR127+')';
const storageJson = 'SELECT json_group_array('+object(storageFields)+') AS rows FROM ('+storageRowsR127+')';

export function readHoldingsR127(sql,id){
 try {
  const inventory=prepareCached477(sql,inventoryJson).get(id).rows;
  const storage=prepareCached477(sql,storageJson).get(id).rows;
  // The pinned Node reader truncates text at an embedded NUL. Its JSON
  // encoding also maps non-finite numbers to null, and rejects unsafe SQLite integers.
  if(![inventory,storage].some(text=>text.includes('\\u0000')||text.includes('9.0e+999')||/:-?\d{16}/.test(text)))return {inventory,storage};
 } catch (error) {
  if(!String(error.message).includes('JSON cannot hold BLOB values'))throw error;
 }
 return {
  inventory:JSON.stringify(prepareCached477(sql,inventoryRowsR127).all(id)),
  storage:JSON.stringify(prepareCached477(sql,storageRowsR127).all(id)),
 };
}

export function encodeHoldingsActorR127(part,holdings,options){
 const {id,base,next,bundle,sections}=part;
 if(Object.hasOwn(sections,'inventory')||Object.hasOwn(sections,'storageItems')){
  const complete={inventory:JSON.parse(holdings.inventory),storageItems:JSON.parse(holdings.storage),...sections};
  return encodeCommittedActorR113({...part,sections:complete},options);
 }
 // SQLite supplies complete ordered JSON arrays for this transaction. Avoid
 // turning every unchanged item into a JS object before encoding the receipt.
 const fields=JSON.stringify(sections);
 const text='{"id":'+JSON.stringify(id)+',"base":'+base+',"next":'+next+
  ',"bundle":'+JSON.stringify(bundle)+',"sections":'+fields.slice(0,-1)+(fields==='{}'?'':',')+
  '"inventory":'+holdings.inventory+',"storageItems":'+holdings.storage+'}}';
 const {epoch,channel,incarnation}=bundle.owner;
 return {id,base,next,epoch,channel,incarnation,image:encodeCommittedTextR127(text,options)};
}

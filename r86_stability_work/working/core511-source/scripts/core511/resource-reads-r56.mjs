import {resourceBatchR56} from './r56-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
const columns={channel:'id,channel',scope:'id,channel,area,spawn_round,is_boss,is_stone,summoned,parent_stone_id',join:'id,area,channel,spawn_round,is_boss,is_stone',life:'id,hp,spawn_round'};
// One synchronous guard invocation only. Indexed reads retain every requested
// identity and missing-row distinction. Never cache rows across a native write.
export function readResourceMonstersR56(sql,ids,kind){
 if(!resourceBatchR56||!columns[kind]||!Array.isArray(ids)||ids.length>4096||ids.some(id=>typeof id!=='string'||id.length>240))return null;
 const unique=[...new Set(ids)];if(!unique.length)return new Map();
 const rows=prepareServerStatement(sql,'SELECT '+columns[kind].split(',').map(c=>'m.'+c).join(',')+' FROM json_each(?) wanted JOIN monsters m ON m.id=wanted.value').all(JSON.stringify(unique));return new Map(rows.map(row=>[row.id,row]));
}
export function readResourcePlayersR56(sql,ids){
 if(!resourceBatchR56||!Array.isArray(ids)||ids.length>4096||ids.some(id=>typeof id!=='string'||id.length>240))return null;
 const rows=prepareServerStatement(sql,'SELECT p.id FROM json_each(?) wanted JOIN players p ON p.id=wanted.value').all(JSON.stringify([...new Set(ids)]));return new Set(rows.map(row=>row.id));
}

import {randomUUID} from 'node:crypto';
import {JEWELRY456} from '../../../native510-bb3a6cc689c6/lib/expansion456.mjs';
import {bagHasSpace,BAG_FULL_MESSAGE} from './bag-limit.mjs';
import {prepareServerStatement} from './server-statements.mjs';

export const ADMIN_ACCESSORIES_R58=Object.freeze([
 ...Object.values(JEWELRY456).map(x=>({id:'equipment:'+x.kind,name:x.name,kind:x.kind,power:20})),
 {id:'equipment:belt:wisdom',name:'Bilgelik Kemeri',kind:'belt',power:0},
 {id:'equipment:belt:sovereign',name:'Hükümdar Kemeri',kind:'belt',power:0}
].map(x=>Object.freeze({...x,equipment:true,cap:35})));
const catalog=new Map(ADMIN_ACCESSORIES_R58.map(x=>[x.id,x]));
export const accessoryDefinitionR58=kind=>catalog.get(kind);
// Called inside the existing FULL durable, actor-fenced admin transaction.
// The receipt is stored in that same transaction; retries never create items.
export function grantAccessoriesR58(sql,item,request,now){
 if(!sql.isTransaction)throw Error('accessory_transaction_required');
 if(!bagHasSpace(sql,request.playerId,request.amount))throw Object.assign(Error(BAG_FULL_MESSAGE),{status:409,gameCode:'bag_full'});
 const q=text=>prepareServerStatement(sql,text),player=q('SELECT role FROM players WHERE id=?').get(request.playerId);
 const insert=q("INSERT INTO player_items(id,player_id,kind,rarity,item_name,power,equipped,created_at,role,enchantments,expires_at_ms,premium_origin,sale_locked499) VALUES(?,?,?,'crafted',?,?,0,?,?,'[]',0,0,0)");
 const itemIds=[];
 for(let n=0;n<request.amount;n++){const id=randomUUID();insert.run(id,request.playerId,item.kind,item.name,item.power,Math.floor(now/1000),item.kind==='belt'?'all':player.role);itemIds.push(id);}
 const balance=q('SELECT COUNT(*) n FROM player_items WHERE player_id=? AND kind=? AND item_name=?').get(request.playerId,item.kind,item.name).n;
 return {balance,itemIds};
}

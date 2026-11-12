import {PlayerTrade} from '../../../native510-bb3a6cc689c6/vds-server/src/player-trade.mjs';

const KIND='tower_azrail_chest',KEY='dungeon:'+KIND;
// Extend the native two-party transaction; its revisions, double confirmation,
// ownership, recipient limits and replay receipts remain authoritative.
export class PlayerTradeR102 extends PlayerTrade{
 inventory(id){
  const stock=super.inventory(id),amount=this.db.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(id,KIND)?.amount??0;
  if(Number.isSafeInteger(amount)&&amount>0)stock.materials.push({key:KEY,label:'Azrail Sandığı',amount});
  return stock;
 }
 transfer(from,to,offer){
  const chest=offer.materials.filter(m=>m.key===KEY);
  if(chest.length>1||chest.some(m=>!Number.isSafeInteger(m.amount)||m.amount<1||m.amount>1000000000))throw Error('Sandık miktarı geçersiz.');
  super.transfer(from,to,{...offer,materials:offer.materials.filter(m=>m.key!==KEY)});
  for(const m of chest){
   if(!this.db.isTransaction)throw Error('trade_chest_transaction_required_r102');
   if(this.db.prepare('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(m.amount,from,KIND,m.amount).changes!==1)throw Error('Azrail Sandığı miktarı değişti.');
   this.db.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount').run(to,KIND,m.amount);
  }
 }
}

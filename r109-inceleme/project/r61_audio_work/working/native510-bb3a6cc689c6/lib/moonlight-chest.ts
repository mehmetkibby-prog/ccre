import type {db} from './game-world';
type GameDatabase=ReturnType<typeof db>;
export type MoonlightReward={id:string;label:string;amount:number;
 column?:'essence'|'potions'|'stone_dust'|'gems'|'pearls'|'red_pearls'|'fifth_enchant_scrolls';
 material?:'wing'|'pet';stone?:string;
 item?:{id:string;kind:'necklace';item_name:string;rarity:'red';power:number;role:string;enchantments:string}};

// The existing receipt ledger has globally unique IDs; moonlight requests use
// their own prefix. One transaction claims the chest, grants exactly one reward
// and consumes it. A retry returns the original receipt without another roll.
export async function openMoonlightChest(database:GameDatabase,playerId:string,requestId:string,reward:MoonlightReward,now:number){
 const previous=await database.prepare('SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?').bind(requestId,playerId).first<{reward_json:string}>();
 if(previous)return JSON.parse(previous.reward_json) as MoonlightReward;
 const token=crypto.randomUUID();
 const gate='EXISTS(SELECT 1 FROM crystal_chest_openings WHERE id=? AND player_id=? AND claim_token=?)';
 const statements=[database.prepare(`INSERT OR IGNORE INTO crystal_chest_openings(id,player_id,reward_json,claim_token,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind='moonlight_chest' AND amount>0)`)
  .bind(requestId,playerId,JSON.stringify(reward),token,now,playerId)];
 if(reward.item){const i=reward.item;statements.push(database.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at)
 SELECT ?,?,?,?,?,?,?,?,0,? WHERE ${gate}`).bind(i.id,playerId,i.kind,i.item_name,i.rarity,i.power,i.role,i.enchantments,now,requestId,playerId,token));}
 else if(reward.material){statements.push(database.prepare(`INSERT INTO dungeon_materials(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=dungeon_materials.amount+excluded.amount`)
  .bind(playerId,reward.material,reward.amount,requestId,playerId,token));}
 else if(reward.stone){statements.push(database.prepare(`INSERT INTO player_stones(player_id,kind,amount)
 SELECT ?,?,? WHERE ${gate} ON CONFLICT(player_id,kind) DO UPDATE SET amount=player_stones.amount+excluded.amount`)
  .bind(playerId,reward.stone,reward.amount,requestId,playerId,token));}
 else if(reward.column&&['essence','potions','stone_dust','gems','pearls','red_pearls','fifth_enchant_scrolls'].includes(reward.column)){
  statements.push(database.prepare(`UPDATE players SET ${reward.column}=${reward.column}+? WHERE id=? AND ${gate}`)
   .bind(reward.amount,playerId,requestId,playerId,token));
 }else throw new Error('Geçersiz Ayışığı Sandığı ödülü.');
 statements.push(database.prepare(`UPDATE player_stones SET amount=amount-1 WHERE player_id=? AND kind='moonlight_chest' AND amount>0 AND ${gate}`)
  .bind(playerId,requestId,playerId,token));
 await database.batch(statements);
 const receipt=await database.prepare('SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?').bind(requestId,playerId).first<{reward_json:string}>();
 return receipt?JSON.parse(receipt.reward_json) as MoonlightReward:null;
}

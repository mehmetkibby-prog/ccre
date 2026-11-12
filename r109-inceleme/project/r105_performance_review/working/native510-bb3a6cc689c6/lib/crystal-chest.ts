import type {db} from './game-world';
type GameDatabase=ReturnType<typeof db>;
type ChestReward={id:string;label:string;column?:'pearls'|'red_pearls'|'potions'|'essence'|'fish_sokan'|'fifth_enchant_scrolls';amount:number;item?:{id:string;kind:string;item_name:string;rarity:string;power:number;role:string;enchantments:string}};
export async function openCrystalChest(database:GameDatabase,playerId:string,requestId:string,reward:ChestReward,now:number){
 const previous=await database.prepare('SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?').bind(requestId,playerId).first<{reward_json:string}>();
 if(previous)return JSON.parse(previous.reward_json) as ChestReward;
 const token=crypto.randomUUID();
 const gate='EXISTS(SELECT 1 FROM crystal_chest_openings WHERE id=? AND player_id=? AND claim_token=?)';
 const statements=[database.prepare(`INSERT OR IGNORE INTO crystal_chest_openings(id,player_id,reward_json,claim_token,created_at)
 SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM player_stones WHERE player_id=? AND kind='crystal_chest' AND amount>0)`)
 .bind(requestId,playerId,JSON.stringify(reward),token,now,playerId)];
 if(reward.item){const i=reward.item;statements.push(database.prepare(`INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at) SELECT ?,?,?,?,?,?,?,?,0,? WHERE ${gate}`).bind(i.id,playerId,i.kind,i.item_name,i.rarity,i.power,i.role,i.enchantments,now,requestId,playerId,token));}
 else{const column=reward.column;if(!column||!['pearls','red_pearls','potions','essence','fish_sokan','fifth_enchant_scrolls'].includes(column))throw new Error('Geçersiz sandık ödülü.');
 statements.push(database.prepare(`UPDATE players SET ${column}=${column}+? WHERE id=? AND ${gate}`).bind(reward.amount,playerId,requestId,playerId,token));}
 statements.push(database.prepare(`UPDATE player_stones SET amount=amount-1 WHERE player_id=? AND kind='crystal_chest' AND amount>0 AND ${gate}`).bind(playerId,requestId,playerId,token));
 await database.batch(statements);
 const receipt=await database.prepare('SELECT reward_json FROM crystal_chest_openings WHERE id=? AND player_id=?').bind(requestId,playerId).first<{reward_json:string}>();
 return receipt?JSON.parse(receipt.reward_json) as ChestReward:null;
}

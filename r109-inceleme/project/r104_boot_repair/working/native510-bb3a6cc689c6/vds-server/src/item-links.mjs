import {enhancementLevel491,enhancementName491} from '../../lib/enhancement491.mjs';
import {LAST_WORLD_CHAT_SQL,worldChatRetryAfter,WorldChatCooldownError} from "../../lib/world-chat.mjs";
// Server-owned immutable snapshots. Spending and publishing are one SQLite transaction.
export class ItemLinks {
 constructor(db){this.db=db;}
 send(playerId,{requestId,itemId,recipientId,scope,area,channel,body,createdAt}){
  if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId??''))throw new Error('Paylaşım kimliği geçersiz.');
  const db=this.db,target=JSON.stringify([recipientId||null,scope,area,channel,body]);
  db.exec('BEGIN IMMEDIATE');try{
   const old=db.prepare('SELECT * FROM item_link_receipts WHERE request_id=?').get(requestId);
   if(old){if(old.player_id!==playerId||old.item_id!==itemId||old.target!==target)throw new Error('Paylaşım kimliği başka işlemde kullanılmış.');const saved=db.prepare('SELECT * FROM messages WHERE id=?').get(old.message_id);if(!saved)throw new Error('Bu paylaşım daha önce tamamlandı.');db.exec('COMMIT');return saved;}
   const player=db.prepare('SELECT name,item_link_orbs FROM players WHERE id=?').get(playerId);
   if(!player||player.item_link_orbs<1)throw new Error('Eşya Yansıtma nesnen yok. Nesne Market’ten alabilirsin.');
   const item=db.prepare("SELECT id,kind,item_name,rarity,power,role,enchantments FROM player_items WHERE id=? AND player_id=? AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet')").get(itemId,playerId);
   if(!item)throw new Error('Yansıtmak için çantandaki veya kuşanılmış bir ekipmanı seç.');
   if(recipientId&&!db.prepare('SELECT 1 FROM players WHERE id=?').get(recipientId))throw new Error('Alıcı bulunamadı.');
   if((scope==='world'||scope==='trade')&&!recipientId){const seconds=worldChatRetryAfter(db.prepare(LAST_WORLD_CHAT_SQL).get(playerId)?.sent_at,createdAt);if(seconds)throw new WorldChatCooldownError(seconds);}
   const snapshot=JSON.stringify({...item,item_name:enhancementName491(item),upgrade_level491:enhancementLevel491(item)});
   const row=db.prepare('INSERT INTO messages(player_id,player_name,recipient_id,scope,area,channel,body,created_at,item_snapshot) VALUES(?,?,?,?,?,?,?,?,?) RETURNING *').get(playerId,player.name,recipientId||null,scope,area,channel,body,createdAt,snapshot);
   db.prepare('UPDATE players SET item_link_orbs=item_link_orbs-1 WHERE id=? AND item_link_orbs>0').run(playerId);
   db.prepare('INSERT INTO item_link_receipts VALUES(?,?,?,?,?)').run(requestId,playerId,itemId,target,row.id);
   db.exec('COMMIT');return row;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
}

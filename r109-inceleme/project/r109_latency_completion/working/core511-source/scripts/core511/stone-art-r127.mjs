import {createHash} from 'node:crypto';

export class StoneArtError extends Error {}
function reject(message) { throw new StoneArtError(message); }

// parseStone is the same definition used when crafting and socketing a stone.
export function stoneArtTransaction(sql, playerId, input, parseStone, now = Date.now()) {
  if (!sql.isTransaction) throw Error('stone_art_requires_transaction');
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(typeof input.requestId === 'string' ? input.requestId : '')) reject('İşlem kimliği geçersiz.');
  const buying = input.action === 'buy_stone_extractor';
  if (!buying && input.action !== 'extract_socket_stone') reject('Taş işlemi geçersiz.');
  const definition = buying ? null : parseStone(input.stoneKind);
  if (!buying && (!definition || definition.key !== definition.kind + ':' + definition.value || typeof input.itemId !== 'string' || input.itemId.length > 160)) reject('Eşyayı ve çıkarılacak taşı seç.');
  const signature = createHash('sha256').update(JSON.stringify([input.action, buying ? null : input.itemId, definition?.key ?? null])).digest('hex');
  const old = sql.prepare('SELECT digest,result FROM royal_receipts_r118 WHERE player_id=? AND request_id=?').get(playerId,input.requestId);
  if (old) {
    if (old.digest !== signature) reject('Bu işlem kimliği daha önce kullanılmış.');
    return JSON.parse(old.result);
  }
  const player = sql.prepare('SELECT hp,gems FROM players WHERE id=?').get(playerId);
  if (!player || player.hp <= 0) reject('Bu işlemi ayaktayken yapabilirsin.');
  if (sql.prepare('SELECT 1 FROM player_trade_locks WHERE player_id=?').get(playerId)) reject('Önce açık ticareti tamamla.');
  if (buying) {
    if (!sql.prepare('UPDATE players SET gems=gems-200 WHERE id=? AND gems>=200').run(playerId).changes) reject('Taş Sanatı için 200 mücevher gerekli.');
    sql.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'stone_extractor',1) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+1").run(playerId);
  } else {
    const item = sql.prepare('SELECT enchantments,kind FROM player_items WHERE player_id=? AND id=? AND sale_locked499=0 AND (expires_at_ms=0 OR expires_at_ms>?)').get(playerId,input.itemId,now);
    if (!item || item.kind !== definition.itemKind) reject('Eşya çantanda olmalı ve satış kilidi açık olmalı.');
    const enchants = JSON.parse(item.enchantments);
    const matches = Array.isArray(enchants) ? enchants.filter(e=>e?.kind === definition.enchantment && e.value === definition.value) : [];
    if (matches.length !== 1) reject('Seçtiğin taş artık bu eşyanın üzerinde değil.');
    if (!sql.prepare("UPDATE dungeon_materials SET amount=amount-1 WHERE player_id=? AND kind='stone_extractor' AND amount>=1").run(playerId).changes) reject('Çantanda Taş Sanatı yok.');
    const remaining = enchants.filter(e=>e !== matches[0]);
    if (!sql.prepare('UPDATE player_items SET enchantments=? WHERE player_id=? AND id=? AND enchantments=?').run(JSON.stringify(remaining),playerId,input.itemId,item.enchantments).changes) reject('Eşya değişti. Tekrar seç.');
    sql.prepare('INSERT INTO player_stones(player_id,kind,amount) VALUES(?,?,1) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+1').run(playerId,definition.key);
  }
  const count = sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='stone_extractor'").get(playerId).amount;
  const result = {ok:true,extractors:count,gems:player.gems-(buying?200:0),stoneKind:definition?.key??null,message:buying?'Taş Sanatı çantana eklendi.':definition.label+' aynı değeriyle çantana döndü.'};
  sql.prepare('INSERT INTO royal_receipts_r118(player_id,request_id,action,digest,result,created_at) VALUES(?,?,?,?,?,?)').run(playerId,input.requestId,input.action,signature,JSON.stringify(result),now);
  return result;
}

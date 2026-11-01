// Update only the kill counter. Never grant an evolution stage or overwrite stones.
export async function setWeaponEvolutionPoints(database:any, adminId:string, playerId:string, itemId:string, amount:number) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000000) throw new Error("Evrim puanı 0–1.000.000.000 arasında tam sayı olmalı.");
  const item = await database.prepare("SELECT enchantments FROM player_items WHERE id=? AND player_id=? AND kind='weapon' AND equipped=1").bind(itemId,playerId).first();
  if (!item) throw new Error("Oyuncunun kuşandığı silah değişmiş veya bulunamıyor. Listeyi yenile.");
  const entries=JSON.parse(item.enchantments);
  if (!Array.isArray(entries)) throw new Error("Silah verisi geçersiz.");
  const next=JSON.stringify([...entries.filter((entry:any)=>entry.kind!=="evolution_kills"),{kind:"evolution_kills",value:amount}]);
  const results=await database.batch([
    database.prepare("UPDATE player_items SET enchantments=? WHERE id=? AND player_id=? AND kind='weapon' AND equipped=1 AND enchantments=? RETURNING id")
      .bind(next,itemId,playerId,item.enchantments),
    database.prepare(`INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms)
      SELECT ?,?,'set_weapon_evolution_points',account_id,?,? FROM players WHERE id=? AND changes()>0`)
      .bind(crypto.randomUUID(),adminId,JSON.stringify({playerId,itemId,amount}),Date.now(),playerId),
  ]);
  if(!results[0]?.results?.length) throw new Error("Silah bu sırada değişti. Güncel puanı kontrol edip yeniden dene.");
}

import {pumpkinActive499} from '../../lib/pumpkin499.mjs';
import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {EXTRA_PRODUCTS,EXTRA_COLUMNS,TALISMAN_COLORS} from '../../lib/extra-products.mjs';
export function ensureExtraProducts(db){const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(r=>r.name));for(const key of EXTRA_COLUMNS)if(!cols.has(key))db.exec(`ALTER TABLE players ADD COLUMN ${key} INTEGER NOT NULL DEFAULT 0`);
 db.exec('CREATE INDEX IF NOT EXISTS premium_ration_expiry ON players(ration_until) WHERE ration_until>0');
 db.exec('CREATE INDEX IF NOT EXISTS premium_pumpkin_expiry499 ON players(pumpkin_until499) WHERE pumpkin_enabled499=1');
 const economy=db.prepare("SELECT 1 FROM sqlite_master WHERE name='economy_settings'").get();if(economy&&!db.prepare('PRAGMA table_info(economy_settings)').all().some(c=>c.name==='fishing_talisman_chance'))db.exec('ALTER TABLE economy_settings ADD COLUMN fishing_talisman_chance REAL NOT NULL DEFAULT 0.1');
}
export function extraBuff(p,now=Date.now()){const pumpkin=pumpkinActive499(p,now);return {attack:(p?.ration_until>now?15:0)+(arenaWingsActive477(p,now)?10:0)+(pumpkin?20:0),hp:(p?.ration_until>now?200:0)+(pumpkin?1000:0),pumpkin,pumpkinUntil:p?.pumpkin_until499??0,monsters:pumpkin?10:0,rationUntil:p?.ration_until??0,radiant:!!p?.radiant_enabled&&p.radiant_until>now,essence:p?.essence_until>now?20:0};}
export function useExtra(engine,p,input){const db=engine.db,now=engine.now(),key=String(input.product),product=EXTRA_PRODUCTS[key];
 if(input.action==='extra_use'){
  if(!product||!(p[product.stock]>0))throw Error('Bu nesne çantanda yok.');
  if(key==='mastery_seal492')throw Error('Ustalık Mührü’nü Haso → Artı Basma bölümünde seç.');
  if(key==='protection_seal')throw Error('Mührü Haso → Taş Sanatı bölümünde seç.');
  if(key==='rank_scroll'&&!(p.level>=65&&p.rank_tier>0))throw Error('Önce Savaşçının Yolu görevini tamamlayıp rütbeni açmalısın.');
  if(product.timer&&p[product.timer]>now)throw Error('Bu etki hâlâ aktif. Süresi dolmadan tekrar kullanılamaz.');
  if(key==='fishing_bait'&&p.bait_remaining>0)throw Error('Mevcut yeminin hakları bitmedi.');
  db.prepare(`UPDATE players SET ${product.stock}=${product.stock}-1${product.timer?`,${product.timer}=?`:''}${key==='fishing_bait'?',bait_remaining=30':''}${key==='xp_costume'?',radiant_enabled=1,pumpkin_enabled499=0':''} WHERE id=?`).run(...(product.timer?[now+product.seconds*1000,p.id]:[p.id]));
  if(key==='xp_costume')db.prepare("UPDATE player_items SET equipped=0 WHERE player_id=? AND kind='costume'").run(p.id);
  if(!['fishing_guide','boss_reminder'].includes(key))engine.refreshHp(p.id);return product.name+' kullanıldı.';
 }
 if(input.action==='radiant_toggle'){if(!(p.radiant_until>now))throw Error('Giysinin süresi dolmuş.');db.prepare('UPDATE players SET radiant_enabled=?,pumpkin_enabled499=CASE WHEN ?=1 THEN 0 ELSE pumpkin_enabled499 END WHERE id=?').run(input.enabled===true?1:0,input.enabled===true?1:0,p.id);if(input.enabled===true)db.prepare("UPDATE player_items SET equipped=0 WHERE player_id=? AND kind='costume'").run(p.id);engine.refreshHp(p.id);return 'Giysi görünümü güncellendi.';}
 // Haso's location is authoritative, not supplied by the client.
 if(p.area!=='bazaar'||Math.hypot(p.x-1200,p.y-390)>220)throw Error('Tılsım işlemi için Demirci Haso’nun yanına yaklaş.');
 if(input.action==='talisman_craft'){if(p.talisman_stones<20)throw Error('20 Tılsım Taşı gerekiyor.');db.prepare('UPDATE players SET talisman_stones=talisman_stones-20,talisman_powers=talisman_powers+1 WHERE id=?').run(p.id);return 'Tılsımın Gücü oluşturuldu.';}
 const item=db.prepare("SELECT * FROM player_items WHERE id=? AND player_id=? AND kind='weapon'").get(String(input.itemId),p.id);if(!item)throw Error('Çantandaki bir silahı seç.');const color=String(input.color);if(!TALISMAN_COLORS[color])throw Error('Geçerli bir renk seç.');const ench=JSON.parse(item.enchantments||'[]');const old=ench.find(e=>e.kind==='stone_talisman');if(!old&&p.talisman_powers<1)throw Error('Tılsımın Gücü nesnen yok.');if(!old){ench.push({kind:'stone_talisman',value:1});db.prepare('UPDATE players SET talisman_powers=talisman_powers-1 WHERE id=?').run(p.id);}const index=Object.keys(TALISMAN_COLORS).indexOf(color)+1;const c=ench.find(e=>e.kind==='stone_talisman_color');if(c)c.value=index;else ench.push({kind:'stone_talisman_color',value:index});db.prepare('UPDATE player_items SET enchantments=? WHERE id=? AND player_id=?').run(JSON.stringify(ench),item.id,p.id);return 'Silahına +15 saldırı ve tüm canavarlara karşı %2 güç işlendi.';
}

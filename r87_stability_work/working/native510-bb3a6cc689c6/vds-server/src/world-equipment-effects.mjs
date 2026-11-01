import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';

// Only exact known portable/owner/public-roster query shapes opt in. Future
// SQL changes automatically retain the original query until parity is reviewed.
const QUERY_HASHES = new Set(["bc92bfc957166b020a474fd061e9a3c14452f44d16f4a33cc727a99b613d7e0c","5f2294972622c5c866a783f50d4aef9d3aebdc22ea17c78b4fc025b4a32d8430","7976e1e31c102396e9d117a53ec5b080d67800e2dc678917556ea9f543ad0efe"]);
const ORIGINAL_EFFECTS = "equipment_effects AS MATERIALIZED (\n SELECT i.player_id,i.kind,\n json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') AS effect_kind,\n CAST(json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value') AS INTEGER) AS effect_value\n FROM equipped_items i,\n json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) effect\n), enchantment_totals AS MATERIALIZED (SELECT i.player_id,\nMIN(50,MAX(0,COALESCE(SUM(CASE WHEN i.effect_kind='cast_speed' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value>0 THEN MIN(50,MAX(1,i.effect_value)) ELSE 0 END),0))) AS cast_speed,\nMIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='forest_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS forest_power,\nMIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='frozen_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS frozen_power,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='fire' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS fire_damage,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='ice' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS ice_damage,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='strong_players' AND i.kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS strong_players,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='sword_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS sword_defense,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='arrow_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS arrow_defense,\nMIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='magic_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS magic_defense,\nMIN(90, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='resistant_players' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS resistant_players\n FROM equipment_effects i GROUP BY i.player_id)";
const CACHED_EFFECTS = "equipment_profiles AS MATERIALIZED (\n SELECT i.player_id,col_native_equipment_effects(i.kind,i.enchantments) AS effects FROM equipped_items i\n), enchantment_totals AS MATERIALIZED (SELECT i.player_id,\nMIN(50,MAX(0,COALESCE(SUM(json_extract(i.effects,'$.cast_speed')),0))) AS cast_speed,\nMIN(10, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.forest_power')),0))) AS forest_power,\nMIN(10, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.frozen_power')),0))) AS frozen_power,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.fire_damage')),0))) AS fire_damage,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.ice_damage')),0))) AS ice_damage,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.strong_players')),0))) AS strong_players,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.sword_defense')),0))) AS sword_defense,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.arrow_defense')),0))) AS arrow_defense,\nMIN(80, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.magic_defense')),0))) AS magic_defense,\nMIN(90, MAX(0, COALESCE(SUM(json_extract(i.effects,'$.resistant_players')),0))) AS resistant_players\n FROM equipment_profiles i GROUP BY i.player_id)";
const ITEM_CONTRIBUTIONS = "WITH equipped_items(player_id,kind,enchantments) AS (VALUES (0,?,?)), equipment_effects AS MATERIALIZED (\n SELECT i.player_id,i.kind,\n json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') AS effect_kind,\n CAST(json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value') AS INTEGER) AS effect_value\n FROM equipped_items i,\n json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) effect\n) SELECT COALESCE(SUM(CASE WHEN i.effect_kind='cast_speed' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value>0 THEN MIN(50,MAX(1,i.effect_value)) ELSE 0 END),0) AS cast_speed,\nCOALESCE(SUM(CASE WHEN i.effect_kind='forest_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0) AS forest_power,\nCOALESCE(SUM(CASE WHEN i.effect_kind='frozen_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0) AS frozen_power,\nCOALESCE(SUM(CASE WHEN i.effect_kind='fire' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS fire_damage,\nCOALESCE(SUM(CASE WHEN i.effect_kind='ice' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS ice_damage,\nCOALESCE(SUM(CASE WHEN i.effect_kind='strong_players' AND i.kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS strong_players,\nCOALESCE(SUM(CASE WHEN i.effect_kind='sword_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS sword_defense,\nCOALESCE(SUM(CASE WHEN i.effect_kind='arrow_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS arrow_defense,\nCOALESCE(SUM(CASE WHEN i.effect_kind='magic_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS magic_defense,\nCOALESCE(SUM(CASE WHEN i.effect_kind='resistant_players' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0) AS resistant_players FROM equipment_effects i";

// Cache only a pure function of exact item kind + exact raw enchantment bytes.
// Player IDs, scope, equipped flags, power, rarity, roles and response rows are
// never cached. Their current values are read by the original WAL-snapshot SQL.
export function installEquipmentEffectCache(database, {maxEntries=1024,maxBytes=2*1024*1024}={}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 0 || !Number.isSafeInteger(maxBytes) || maxBytes < 0) throw new Error('Invalid equipment cache limit');
  const evaluator = new DatabaseSync(':memory:');
  evaluator.exec('PRAGMA query_only=ON');
  const calculate = evaluator.prepare(ITEM_CONTRIBUTIONS);
  const entries = new Map();
  const stats = {hits:0,misses:0,entries:0,bytes:0};
  let closed = false;
  database.function('col_native_equipment_effects', {deterministic:true}, (kind, raw) => {
    // Non-text SQLite values are evaluated unchanged but never keyed by lossy
    // JavaScript serialization. Large texts remain uncached and memory-bounded.
    const key = typeof kind === 'string' && typeof raw === 'string' && (kind.length+raw.length)*2 <= maxBytes
      ? JSON.stringify([kind,raw]) : null;
    const cached = key === null ? undefined : entries.get(key);
    if (cached) {
      entries.delete(key); entries.set(key,cached); stats.hits++;
      return cached.value;
    }
    stats.misses++;
    // Use SQLite's exact json_valid/json_each/CAST/CASE semantics, not a JS
    // approximation. No outer player cap is applied until the live SQL SUM.
    const value = JSON.stringify(calculate.get(kind,raw));
    const bytes = key === null ? Infinity : (key.length+value.length)*2+128;
    if (maxEntries && bytes <= maxBytes) {
      while (entries.size >= maxEntries || stats.bytes+bytes > maxBytes) {
        const oldest = entries.keys().next().value;
        stats.bytes -= entries.get(oldest).bytes; entries.delete(oldest);
      }
      entries.set(key,{value,bytes}); stats.bytes += bytes; stats.entries=entries.size;
    }
    return value;
  });
  return {
    stats,
    rewrite(sql) {
      if (!sql.includes(ORIGINAL_EFFECTS)) return sql;
      // The existing per-snapshot room reader substitutes its own timestamp in
      // these two pet-expiry clauses. Normalize only that known literal shape.
      const shape = sql.replace(/>\d{1,16} AND equipped = 1 LIMIT 1\)/g, '>unixepoch() AND equipped = 1 LIMIT 1)').replace("SELECT i.player_id,i.kind,i.role,i.rarity,i.power,CASE WHEN substr(i.item_name,1,3)='+5 ' AND i.kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(i.enchantments) AND json_type(i.enchantments)='array' THEN i.enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE i.kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE i.kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE i.enchantments END AS enchantments","SELECT i.player_id,i.kind,i.role,i.rarity,i.power,i.enchantments");
      if (!QUERY_HASHES.has(createHash('sha256').update(shape).digest('hex'))) return sql;
      return sql.replace(ORIGINAL_EFFECTS,CACHED_EFFECTS);
    },
    close() {
      if (closed) return; closed=true;
      entries.clear(); stats.entries=0; stats.bytes=0; evaluator.close();
    },
  };
}

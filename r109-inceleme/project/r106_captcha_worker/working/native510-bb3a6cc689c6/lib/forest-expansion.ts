// Preserve the original forest art and creature families; spread 30 hunting
// slots over a larger field, with a clear central arrival area.
const families = ["golge", "curuk", "yutan"] as const;
const names = { golge: "Gölge Kurdu", curuk: "Çürük Muhafız", yutan: "Öz Yutan" };
const counters = { golge: 0, curuk: 0, yutan: 0 };
export const EXPANDED_FOREST_SPAWNS = [300, 650, 1000, 1350, 1700, 2050].flatMap(y =>
  [360, 920, 1480, 2040, 2600, 3160].filter(x => !(x >= 1480 && x <= 2040 && y >= 650 && y <= 1350)).map(x => ({x,y})),
).map((position, index) => {
  const family = families[index % families.length];
  const number = ++counters[family];
  const variant = number === 10 ? "katil" : number >= 7 ? "agresif" : "normal";
  return { ...position, family, number, variant, name: names[family], profileKey: `forest.${family}.${variant}`,
    fallbackHp: family === "golge" ? 220 : family === "curuk" ? 340 : 480 };
});

export const FOREST_SPAWN_UPSERT_SQL = `INSERT INTO monsters
  (id,name,x,y,hp,max_hp,variant,area,channel,respawn_at,is_boss,is_stone,summoned)
  SELECT ?,?,?,?,COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),
    COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),?,'forest',?,0,0,0,0
  WHERE EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)
  ON CONFLICT(id) DO UPDATE SET x=excluded.x,y=excluded.y
  WHERE monsters.area='forest' AND monsters.is_boss=0 AND monsters.is_stone=0 AND monsters.summoned=0
    AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)`;

export type MonsterVariant = 0 | 1 | 2; // normal, agresif, katil
export const VARIANT_NAMES = ['', 'Agresif', 'Katil'];

export interface MonsterDef {
  id: string;
  name: string;
  art: 'wolf' | 'fox' | 'rotguard' | 'devourer' | 'lynx' | 'golem' | 'seer' | 'blackstone' | 'boss_tree' | 'fox_king' | 'goblin' | 't_skeleton' | 't_gargoyle' | 't_wraith' | 't_knight' | 't_executioner' | 'azrail' | 'f_slag' | 'f_boss' | 'world_boss';
  hpBase: number; hpPerLevel: number;
  atkBase: number; atkPerLevel: number;
  def: number;
  speed: number;
  range: number;
  attackMs: number;
  aggroRadius: number; // agresif varyant için
  leash: number;
  xpBase: number;
  size: number; // çizim ölçeği
  boss?: boolean;
  /** boss yeniden doğma süresi (dakika); yönetimden değişir */
  respawnMin?: number;
}

/**
 * Her canavar türünün tek, sabit seviyesi (haritadaki bütün kopyalar bu seviyede doğar). Yönetim "Canavar türleri"
 * tablosundan değişir (TUNING.monsters[id].level). Bosslar ve kule katları kendi ayarındaki seviyeyi kullanır.
 */
export const MONSTER_LEVEL: Record<string, number> = {
  wild_fox: 2, sneaky_goblin: 4,
  shadow_wolf: 10, rot_guard: 13, essence_eater: 16,
  frost_lynx: 20, ice_golem: 25, blizzard_seer: 30,
};

export const MONSTERS: MonsterDef[] = [
  { id: 'sneaky_goblin', name: 'Sinsi Goblin', art: 'goblin', hpBase: 52, hpPerLevel: 15, atkBase: 4, atkPerLevel: 1.3, def: 1, speed: 175, range: 70, attackMs: 1350, aggroRadius: 220, leash: 600, xpBase: 26, size: 1 },
  { id: 'wild_fox', name: 'Yabani Tilki', art: 'fox', hpBase: 34, hpPerLevel: 12, atkBase: 3, atkPerLevel: 1, def: 0, speed: 200, range: 60, attackMs: 1300, aggroRadius: 220, leash: 600, xpBase: 18, size: 0.8 },
  // Kuzey Ormanı (Sv. 10+): Pazar Köyü'ndeki tilki/goblin dengesine göre, her seviyede ~10 vuruşta ölür; seviye başına ~45–60 av
  { id: 'shadow_wolf', name: 'Gölge Kurt', art: 'wolf', hpBase: 100, hpPerLevel: 90, atkBase: 10, atkPerLevel: 4, def: 2, speed: 190, range: 70, attackMs: 1400, aggroRadius: 300, leash: 700, xpBase: -10, size: 1 },
  { id: 'rot_guard', name: 'Çürük Muhafız', art: 'rotguard', hpBase: 400, hpPerLevel: 100, atkBase: 6.5, atkPerLevel: 4.5, def: 6, speed: 130, range: 80, attackMs: 1800, aggroRadius: 260, leash: 650, xpBase: -3, size: 1.15 },
  { id: 'essence_eater', name: 'Öz Yutan', art: 'devourer', hpBase: 150, hpPerLevel: 90, atkBase: 4.5, atkPerLevel: 4.5, def: 3, speed: 150, range: 260, attackMs: 2000, aggroRadius: 320, leash: 700, xpBase: -5, size: 1 },
  { id: 'frost_lynx', name: 'Kırağı Vaşağı', art: 'lynx', hpBase: 400, hpPerLevel: 40, atkBase: 40, atkPerLevel: 3.4, def: 12, speed: 210, range: 70, attackMs: 1300, aggroRadius: 320, leash: 750, xpBase: 60, size: 1 },
  { id: 'ice_golem', name: 'Buzkök Golemi', art: 'golem', hpBase: 700, hpPerLevel: 55, atkBase: 48, atkPerLevel: 3.6, def: 20, speed: 120, range: 90, attackMs: 2000, aggroRadius: 260, leash: 650, xpBase: 80, size: 1.3 },
  { id: 'blizzard_seer', name: 'Tipi Kâhini', art: 'seer', hpBase: 450, hpPerLevel: 42, atkBase: 55, atkPerLevel: 3.8, def: 10, speed: 150, range: 300, attackMs: 2200, aggroRadius: 340, leash: 700, xpBase: 75, size: 1 },
  { id: 'black_stone', name: 'Kara Taş Muhafızı', art: 'blackstone', hpBase: 60000, hpPerLevel: 0, atkBase: 180, atkPerLevel: 0, def: 60, speed: 0, range: 320, attackMs: 2500, aggroRadius: 380, leash: 400, xpBase: 4000, size: 1.8, boss: true, respawnMin: 10 },
  // Pazar Köyü'nün güney ucundaki arenada: grup boss'u (değerler yönetim panelinden değişir)
  { id: 'fox_king', name: 'Tilki Kral', art: 'fox_king', hpBase: 36000, hpPerLevel: 0, atkBase: 75, atkPerLevel: 0, def: 22, speed: 160, range: 110, attackMs: 1700, aggroRadius: 360, leash: 560, xpBase: 2600, size: 1.2, boss: true, respawnMin: 60 },
  // Kadim Kule (her iki katta bir yeni tür; kat başına can/saldırı yönetimden)
  { id: 't_skeleton', name: 'Kadim İskelet', art: 't_skeleton', hpBase: 520, hpPerLevel: 46, atkBase: 40, atkPerLevel: 3.0, def: 14, speed: 175, range: 75, attackMs: 1400, aggroRadius: 300, leash: 900, xpBase: 90, size: 1 },
  { id: 't_gargoyle', name: 'Kule Gargoylü', art: 't_gargoyle', hpBase: 700, hpPerLevel: 52, atkBase: 44, atkPerLevel: 3.2, def: 22, speed: 160, range: 85, attackMs: 1700, aggroRadius: 300, leash: 900, xpBase: 100, size: 1 },
  { id: 't_wraith', name: 'Matem Hayaleti', art: 't_wraith', hpBase: 600, hpPerLevel: 48, atkBase: 48, atkPerLevel: 3.3, def: 12, speed: 185, range: 250, attackMs: 2000, aggroRadius: 320, leash: 900, xpBase: 110, size: 1 },
  { id: 't_knight', name: 'Lanetli Şövalye', art: 't_knight', hpBase: 900, hpPerLevel: 58, atkBase: 52, atkPerLevel: 3.5, def: 28, speed: 145, range: 85, attackMs: 1800, aggroRadius: 300, leash: 900, xpBase: 130, size: 1 },
  { id: 't_executioner', name: 'Kule Celladı', art: 't_executioner', hpBase: 1300, hpPerLevel: 66, atkBase: 62, atkPerLevel: 3.8, def: 30, speed: 135, range: 95, attackMs: 2200, aggroRadius: 300, leash: 900, xpBase: 160, size: 1 },
  { id: 'azrail', name: 'Azrail', art: 'azrail', hpBase: 150000, hpPerLevel: 0, atkBase: 260, atkPerLevel: 0, def: 70, speed: 150, range: 140, attackMs: 2000, aggroRadius: 520, leash: 900, xpBase: 9000, size: 1, boss: true, respawnMin: 15 },
  // Kor Kulesi (Sv. 10+): güç, seviye ve TP kulenin yönetim ayarından (kat başına mutlak değer); buradakiler yedek
  { id: 'f_slag', name: 'Cüruf Golemi', art: 'f_slag', hpBase: 1000, hpPerLevel: 0, atkBase: 40, atkPerLevel: 0, def: 8, speed: 150, range: 85, attackMs: 1800, aggroRadius: 1400, leash: 1600, xpBase: 70, size: 1 },
  { id: 'f_brute', name: 'Kızgın Cüruf Golemi', art: 'f_slag', hpBase: 1400, hpPerLevel: 0, atkBase: 50, atkPerLevel: 0, def: 10, speed: 160, range: 90, attackMs: 1700, aggroRadius: 1400, leash: 1600, xpBase: 95, size: 1.18 },
  // Dünya Boss'u (Kadim Sunak): her kanalda aralıklarla doğar; bütün değerler ve ganimet Boss sekmesinden
  { id: 'world_boss', name: 'Kadim Yıkıcı', art: 'world_boss', hpBase: 450000, hpPerLevel: 0, atkBase: 340, atkPerLevel: 0, def: 95, speed: 120, range: 170, attackMs: 2200, aggroRadius: 1100, leash: 1500, xpBase: 25000, size: 1, boss: true, respawnMin: 120 },
  { id: 'f_boss', name: 'Karademir', art: 'f_boss', hpBase: 24000, hpPerLevel: 0, atkBase: 80, atkPerLevel: 0, def: 14, speed: 140, range: 140, attackMs: 2100, aggroRadius: 1400, leash: 1600, xpBase: 3000, size: 1.2, boss: true, respawnMin: 0 },
];
export const MONSTER_INDEX = new Map(MONSTERS.map((m, i) => [m.id, i] as const));

export function monsterStats(def: MonsterDef, level: number, variant: MonsterVariant) {
  const hpMul = variant === 2 ? 2.6 : variant === 1 ? 1.25 : 1;
  const atkMul = variant === 2 ? 1.7 : variant === 1 ? 1.15 : 1;
  return {
    maxHp: Math.round((def.hpBase + def.hpPerLevel * level) * hpMul),
    atk: Math.round((def.atkBase + def.atkPerLevel * level) * atkMul),
    def: def.def + Math.floor(level / 3),
    xp: Math.round((def.xpBase + level * 6) * (variant === 2 ? 3 : variant === 1 ? 1.3 : 1)),
  };
}

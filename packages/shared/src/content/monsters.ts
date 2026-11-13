export type MonsterVariant = 0 | 1 | 2; // normal, agresif, katil
export const VARIANT_NAMES = ['', 'Agresif', 'Katil'];

export interface MonsterDef {
  id: string;
  name: string;
  art: 'wolf' | 'fox' | 'rotguard' | 'devourer' | 'lynx' | 'golem' | 'seer' | 'blackstone' | 'boss_tree' | 'fox_king';
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
}

export const MONSTERS: MonsterDef[] = [
  { id: 'wild_fox', name: 'Yabani Tilki', art: 'fox', hpBase: 34, hpPerLevel: 12, atkBase: 3, atkPerLevel: 1, def: 0, speed: 200, range: 60, attackMs: 1300, aggroRadius: 220, leash: 600, xpBase: 18, size: 0.8 },
  { id: 'shadow_wolf', name: 'Gölge Kurt', art: 'wolf', hpBase: 60, hpPerLevel: 26, atkBase: 7, atkPerLevel: 2.4, def: 2, speed: 190, range: 70, attackMs: 1400, aggroRadius: 300, leash: 700, xpBase: 14, size: 1 },
  { id: 'rot_guard', name: 'Çürük Muhafız', art: 'rotguard', hpBase: 110, hpPerLevel: 38, atkBase: 9, atkPerLevel: 2.8, def: 5, speed: 130, range: 80, attackMs: 1800, aggroRadius: 260, leash: 650, xpBase: 20, size: 1.15 },
  { id: 'essence_eater', name: 'Öz Yutan', art: 'devourer', hpBase: 80, hpPerLevel: 30, atkBase: 11, atkPerLevel: 3.1, def: 3, speed: 150, range: 260, attackMs: 2000, aggroRadius: 320, leash: 700, xpBase: 18, size: 1 },
  { id: 'frost_lynx', name: 'Kırağı Vaşağı', art: 'lynx', hpBase: 400, hpPerLevel: 40, atkBase: 40, atkPerLevel: 3.4, def: 12, speed: 210, range: 70, attackMs: 1300, aggroRadius: 320, leash: 750, xpBase: 60, size: 1 },
  { id: 'ice_golem', name: 'Buzkök Golemi', art: 'golem', hpBase: 700, hpPerLevel: 55, atkBase: 48, atkPerLevel: 3.6, def: 20, speed: 120, range: 90, attackMs: 2000, aggroRadius: 260, leash: 650, xpBase: 80, size: 1.3 },
  { id: 'blizzard_seer', name: 'Tipi Kâhini', art: 'seer', hpBase: 450, hpPerLevel: 42, atkBase: 55, atkPerLevel: 3.8, def: 10, speed: 150, range: 300, attackMs: 2200, aggroRadius: 340, leash: 700, xpBase: 75, size: 1 },
  { id: 'black_stone', name: 'Kara Taş Muhafızı', art: 'blackstone', hpBase: 60000, hpPerLevel: 0, atkBase: 180, atkPerLevel: 0, def: 60, speed: 0, range: 320, attackMs: 2500, aggroRadius: 380, leash: 400, xpBase: 4000, size: 1.8, boss: true },
  // Pazar Köyü'nün güney ucundaki arenada: grup boss'u (değerler yönetim panelinden değişir)
  { id: 'fox_king', name: 'Tilki Kral', art: 'fox_king', hpBase: 36000, hpPerLevel: 0, atkBase: 75, atkPerLevel: 0, def: 22, speed: 160, range: 110, attackMs: 1700, aggroRadius: 360, leash: 560, xpBase: 2600, size: 1.2, boss: true },
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

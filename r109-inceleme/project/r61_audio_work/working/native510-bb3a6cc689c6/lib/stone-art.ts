export const STONE_DEFINITIONS = {
  critical: { inventory: "critical", enchantment: "stone_critical", value: 7, values: [7,8,9,10], itemKind: "weapon", label: "Kritik Şansı Taşı", percent: true },
  attack: { inventory: "attack", enchantment: "stone_attack", value: 25, values: [20,25,30], itemKind: "weapon", label: "Saldırı Gücü Taşı", percent: false },
  defense: { inventory: "defense", enchantment: "stone_defense", value: 50, values: [30,40,50], itemKind: "armor", label: "Savunma Taşı", percent: false },
  block: { inventory: "block", enchantment: "stone_block", value: 8, values: [6,7,8], itemKind: "armor", label: "Bloklama Taşı", percent: true },
} as const;
export type StoneKind = keyof typeof STONE_DEFINITIONS;
export type StoneKey = StoneKind | `${StoneKind}:${number}`;
export function parseStone(key: unknown) {
  if (typeof key !== "string") return null;
  const match = /^(critical|attack|defense|block)(?::(\d+))?$/.exec(key);
  if (!match) return null;
  const kind = match[1] as StoneKind, definition = STONE_DEFINITIONS[kind];
  const value = match[2] === undefined ? definition.value : Number(match[2]);
  if (!(definition.values as readonly number[]).includes(value)) return null;
  if (match[2] !== undefined && key !== `${kind}:${value}`) return null;
  return { ...definition, kind, value, key: key as StoneKey };
}
export function rollStone(kind: StoneKind, roll = Math.random()) {
  const values = STONE_DEFINITIONS[kind].values;
  const value = values[Math.min(values.length-1, Math.max(0, Math.floor(roll*values.length)))];
  return parseStone(`${kind}:${value}`)!;
}
export function stoneEffect(stone: {value:number;percent:boolean}) { return stone.percent ? `%${stone.value}` : `+${stone.value}`; }
export function stoneOutcomes(kind: StoneKind) {
  const stone = STONE_DEFINITIONS[kind];
  return stone.values.map(value => stoneEffect({value,percent:stone.percent})).join(" / ");
}

export const EVOLUTION_DEFAULTS = {
  evolution_1_kills:100,evolution_1_gems:100,evolution_1_scrolls:5,evolution_1_attack:20,evolution_1_critical:3,evolution_1_players:5,
  evolution_2_kills:350,evolution_2_gems:250,evolution_2_scrolls:25,evolution_2_attack:50,evolution_2_critical:5,evolution_2_players:8,
  evolution_3_kills:500,evolution_3_gems:500,evolution_3_scrolls:50,evolution_3_attack:80,evolution_3_critical:7,evolution_3_players:12,
};
export type EvolutionSettings = typeof EVOLUTION_DEFAULTS;
export const EVOLUTION_KEYS = Object.keys(EVOLUTION_DEFAULTS) as (keyof EvolutionSettings)[];
export function evolutionStage(level:number,settings:Partial<EvolutionSettings>={}) {
  const stage=Math.max(1,Math.min(3,Math.floor(level)));
  const value=(field:string)=>{const key=`evolution_${stage}_${field}` as keyof EvolutionSettings;return Math.max(0,Math.floor(Number(settings[key]??EVOLUTION_DEFAULTS[key])));};
  return {stage,kills:value("kills"),gems:value("gems"),scrolls:stage===1?0:value("scrolls"),pearls:stage===1?5:0,attack:value("attack"),critical:value("critical"),players:value("players")};
}
export function weaponEvolution(raw:unknown) {
  let entries:Array<{kind:string;value:number}>=[];
  try { const parsed=typeof raw==="string"?JSON.parse(raw):raw;if(Array.isArray(parsed)) entries=parsed; } catch {}
  const value=(key:string,max:number)=>Math.max(0,Math.min(max,Math.floor(Number(entries.find(e=>e.kind==="evolution_"+key)?.value)||0)));
  return {level:value("level",3),kills:value("kills",1e9),attack:value("attack",100000),critical:value("critical",80),players:value("players",80)};
}
export function evolveEnchantments(raw:string,stage:ReturnType<typeof evolutionStage>) {
  const entries=JSON.parse(raw) as Array<{kind:string;value:number}>;
  return JSON.stringify([...entries.filter(e=>!e.kind.startsWith("evolution_")||e.kind==="evolution_kills"),
    {kind:"evolution_level",value:stage.stage},{kind:"evolution_attack",value:stage.attack},
    {kind:"evolution_critical",value:stage.critical},{kind:"evolution_players",value:stage.players}]);
}
// Called before the lethal HP update inside its existing transaction.
export const WEAPON_KILL_SQL = `UPDATE player_items SET enchantments=CASE
  WHEN EXISTS(SELECT 1 FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills')
  THEN json_set(enchantments,(SELECT '$['||key||'].value' FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),
    MIN(1000000000,COALESCE((SELECT json_extract(value,'$.value') FROM json_each(enchantments) WHERE json_extract(value,'$.kind')='evolution_kills' LIMIT 1),0)+1))
  ELSE json_insert(enchantments,'$[#]',json_object('kind','evolution_kills','value',1)) END
  WHERE id=? AND player_id=? AND kind='weapon' AND equipped=1
  AND EXISTS(SELECT 1 FROM monsters WHERE id=? AND spawn_round=? AND hp>0 AND hp<=? AND is_stone=0)`;

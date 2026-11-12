// A stale or custom Rune row can be absent from the current catalog.
// Keep every known Rune value (including zero), otherwise use the existing
// generic boss/stone/summoned/ordinary respawn expression, without touching loot.
export function adaptRuneRespawnR89(source){
 const prefix=/target\.area\s*===\s*'rune_v2'\s*\?\s*globalThis\.__colRuneV2\.monster\(target\)\.respawnSeconds\s*:\s*target\.area\s*===\s*'rune'\s*\?\s*globalThis\.__colRunes\.monster\(target\)\.respawnSeconds\s*:/;
 let count=0;
 const adapted=source.replace(/const respawn = ([^\n]+);/g,(line,expression)=>{
  if(!prefix.test(expression))return line;
  if(!expression.endsWith(')'))throw Error('rune_respawn_expression_r89');
  count++;
  const lookup="(target.area==='rune_v2'?globalThis.__colRuneV2?.monster(target)?.respawnSeconds:target.area==='rune'?globalThis.__colRunes?.monster(target)?.respawnSeconds:undefined) ?? (";
  return 'const respawn = '+expression.replace(prefix,lookup)+');';
 });
 if(count!==6)throw Error('rune_respawn_count_r89:'+count);
 return adapted;
}

// Per-planning-call index only. No cached ownership, party, HP or spawn state.
// Preserve the old Set insertion order, duplicate behavior and strict equality
// (Map/Set's NaN equality is deliberately excluded).
export function mixedParticipantsR51(actor,monsters,participants){
 const lives=new Map(),actors=new Set([actor]);
 for(const monster of monsters){
  if(!(monster.hp>0)||Number.isNaN(monster.id)||Number.isNaN(monster.spawn_round))continue;
  let rounds=lives.get(monster.id);if(!rounds)lives.set(monster.id,rounds=new Set());rounds.add(monster.spawn_round);
 }
 for(const row of participants)if(lives.get(row.monster_id)?.has(row.spawn_round))actors.add(row.player_id);
 return actors;
}

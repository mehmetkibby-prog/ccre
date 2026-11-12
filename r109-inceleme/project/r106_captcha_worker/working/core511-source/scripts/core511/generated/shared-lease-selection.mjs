// Mechanically copied V510 selection; bounded Map lookup replaces its combat storage reader.
export function sharedNeeds(payload,actor){
  if(payload?.action==='pvp_attack'){
   const ability=Math.min(3,Math.max(0,Math.floor(Number(payload.ability)||0)));
   // PvP-primary mixed hits can include a shared monster only in black.
   // Actor area is not used to authorize damage; the route checks it again.
   return ability===2&&actor?.role!=='muhafiz'&&[...this.monsters.values()].some(row=>row.area==='black');
  }
  if(payload?.action!=='attack')return false;
  if(this.monsters.has(payload.targetId))return true;
  // This is the native target selector's exact ability normalization. Only the
  // third Hunter/Arcanist skill expands to nearby targets; the others never do.
  const ability=Math.min(3,Math.max(0,Math.floor(Number(payload.ability)||0)));
  if(ability!==2||actor?.role==='muhafiz')return false;
  const target=this.localMonster(payload.targetId);
  // Do not infer geometry from client hints or stale positions. Any shared row
  // in this target's map (even presently dead) keeps the conservative lease.
  // Unknown target scope also keeps the lease. Actor area is not trusted here.
  return !target||[...this.monsters.values()].some(row=>row.area===target.area);
 }

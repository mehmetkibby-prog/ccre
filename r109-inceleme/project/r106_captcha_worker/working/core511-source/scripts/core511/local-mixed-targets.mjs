// Native AOE radius is 300. Lease a conservative union of possible native
// points plus 64 units. Untrusted hints can only enlarge this bounded set;
// native areaSkillPoint still validates walkability, leash and provocation.
// Include dead lives: a queued respawn cannot appear unleased during a drain.
export function localMixedTargets(monsters,player,input,nowMs){
 const primary=monsters.find(m=>m.id===input.targetId);if(!primary)return [];
 const hints=new Map();
 if(Array.isArray(input.areaTargets)&&input.areaTargets.length<=32)for(const h of input.areaTargets)if(h&&typeof h.id==='string'&&h.id.length<=120&&Number.isSafeInteger(h.spawnRound)&&Number.isFinite(h.x)&&Number.isFinite(h.y))hints.set(h.id,h);
 const points=m=>{
  const rows=[m],h=hints.get(m.id);
  if(Number(m.root_until_ms)>nowMs&&Number.isFinite(m.control_x)&&Number.isFinite(m.control_y))rows.push({x:m.control_x,y:m.control_y});
  if(h&&h.spawnRound===m.spawn_round&&!m.is_boss&&!m.is_stone&&Math.hypot(h.x-m.x,h.y-m.y)<=482)rows.push(h);
  return rows;
 };
 const centers=points(primary);
 return monsters.filter(m=>m.id===primary.id||points(m).some(p=>centers.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<=364)));
}

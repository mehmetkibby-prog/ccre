import {areaWorld,isAreaWalkablePosition,FOREST_CORE,FOREST_SPAWN,FROZEN_SPAWN,FROZEN_BOSS_SPAWN,FROZEN_WATER_SPAWN,BLACK_SPAWN} from './world-layout';
export const HUNTING_COUNTS={forest:72,frozen:45,black:64} as const;
export function huntingPositions(area:keyof typeof HUNTING_COUNTS){
 const world=areaWorld(area),points:{x:number;y:number}[]=[];
 const protectedPoints=area==='forest'?[FOREST_CORE,FOREST_SPAWN]:area==='frozen'?[FROZEN_SPAWN,FROZEN_BOSS_SPAWN,FROZEN_WATER_SPAWN]:[BLACK_SPAWN];
 for(let row=0;row<9;row++)for(let col=0;col<11;col++){
  const x=Math.round(240+col*(world.width-480)/10+(row%2?45:-45)),y=Math.round(200+row*(world.height-420)/8);
  if(isAreaWalkablePosition(area,x,y)&&protectedPoints.every(p=>Math.hypot(x-p.x,y-p.y)>420))points.push({x,y});
 }
 // Interleave rows so all quadrants are populated even when some slots are omitted.
 return points.map((p,i)=>({...p,order:(i*37)%points.length})).sort((a,b)=>a.order-b.order).slice(0,HUNTING_COUNTS[area]);
}
export async function expandHuntingWorld(database:any){
 const gate='EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<23)';
 const writes=[database.prepare(`UPDATE players SET x=x*1.5,y=y*1.5,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0 WHERE area IN ('forest','frozen','black') AND ${gate}`),
 database.prepare(`UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area IN ('forest','frozen','black') AND id NOT LIKE 'frozen-%' AND ${gate}`),
 database.prepare(`UPDATE monsters SET x=?,y=? WHERE id='frozen-boss-1' AND ${gate}`).bind(FROZEN_BOSS_SPAWN.x,FROZEN_BOSS_SPAWN.y),
 database.prepare(`UPDATE monsters SET x=?,y=? WHERE id LIKE 'frozen-water-c%' AND ${gate}`).bind(FROZEN_WATER_SPAWN.x,FROZEN_WATER_SPAWN.y)];
 for(const area of ['forest','frozen','black'] as const)for(let channel=1;channel<=3;channel++){
  const rows=(await database.prepare("SELECT id,name,hp,max_hp,variant FROM monsters WHERE area=? AND channel=? AND is_boss=0 AND is_stone=0 AND summoned=0 AND id NOT LIKE 'frozen-%' ORDER BY id").bind(area,channel).all()).results;
  if(!rows.length)throw new Error('Av alanı kaynakları bulunamadı.');
  const positions=huntingPositions(area);
  for(let i=0;i<positions.length;i++){
   const source=rows[i%rows.length],{x,y}=positions[i];
   if(i<rows.length)writes.push(database.prepare(`UPDATE monsters SET x=?,y=? WHERE id=? AND ${gate}`).bind(x,y,source.id));
   else {
    const family=source.id.split('-')[0],suffix=area==='black'?`-black-c${channel}-${source.id.match(/-([1-8])$/)?.[1]??1}`:area==='frozen'?`-frozen-c${channel}-${i+100}`:`-c${channel}-${i+100}`;
    const id=area==='black'?`${family}-expanded${i}${suffix}`:`${family}${suffix}`;
    writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,is_stone,summoned,area,channel,spawn_round)
    SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,0,0,area,channel,1 FROM monsters WHERE id=? AND ${gate}`).bind(id,x,y,source.id));
   }
  }
 }
 writes.push(database.prepare('UPDATE world_state SET layout_version=23 WHERE id=1 AND layout_version<23'));
 await database.batch(writes);
}

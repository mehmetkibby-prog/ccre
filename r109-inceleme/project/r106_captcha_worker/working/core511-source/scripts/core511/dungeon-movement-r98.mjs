import {classMoveSpeed,classAttackRange} from '../../../native510-bb3a6cc689c6/lib/class-combat.mjs';
import {DUNGEON_WORLD,dungeonWalkable} from '../../../native510-bb3a6cc689c6/lib/dungeon-maps.mjs';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// The next tick must never apply a newly received stop/turn to time already
// spent holding the previous intent. Consume that interval first, then record
// the server-owned boundary. Duplicate/replayed sequences never enter here.
export function consumeDungeonInputR98(engine,run,member,now){
 const start=Math.max(engine.lastTick,member.inputAppliedAtR98??engine.lastTick);
 const spent=member.inputBudgetTickR98===engine.lastTick?member.inputBudgetSecondsR98:0;
 const seconds=Math.min(Math.max(0,.2-spent),Math.max(0,(now-start)/1000));
 advanceDungeonMemberR98(run,member,now,seconds);
 member.inputAppliedAtR98=now;
 member.inputBudgetTickR98=engine.lastTick;
 member.inputBudgetSecondsR98=spent+seconds;
}

export function dungeonMemberSecondsR98(member,now,elapsed,lastTick){
 const spent=member.inputBudgetTickR98===lastTick?member.inputBudgetSecondsR98:0;
 return Math.max(0,Math.min(elapsed-spent,(now-(member.inputAppliedAtR98??now-elapsed*1000))/1000));
}

export function advanceDungeonMemberR98(r,p,now,dt){
 if(dt<=0||p.hp<=0||p.left||!['active','portal','complete'].includes(r.status))return;
 if(now-p.inputAt>800){p.input={x:0,y:0};p.moveTarget=null;}
 if(p.moveTarget){
  const goal=p.moveTarget.id?r.enemies.find(e=>e.id===p.moveTarget.id&&e.hp>0):p.moveTarget;
  const stop=p.moveTarget.id?Math.max(80,classAttackRange(p.role,0)-50):0;
  const distance=goal?dist(p,goal):0,strength=Math.min(1,Math.max(0,distance-stop)/(classMoveSpeed(p.role)*Math.max(.001,dt)));
  p.input=goal&&distance>.001?{x:(goal.x-p.x)/distance*strength,y:(goal.y-p.y)/distance*strength}:{x:0,y:0};
 }
 const x=clamp(p.x+p.input.x*classMoveSpeed(p.role)*dt,DUNGEON_WORLD.minX,DUNGEON_WORLD.maxX),y=clamp(p.y+p.input.y*classMoveSpeed(p.role)*dt,DUNGEON_WORLD.minY,DUNGEON_WORLD.maxY);
 if(dungeonWalkable(x,y)){p.x=x;p.y=y;if(Math.hypot(p.input.x,p.input.y)>.01)p.direction={...p.input};}
 else if(dungeonWalkable(x,p.y))p.x=x;
 else if(dungeonWalkable(p.x,y))p.y=y;
}

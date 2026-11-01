// A life identity, not just an ID: a respawn must require a fresh press.
export function heldCombatTarget(world:any,dungeon:any,monsterId:string|null,playerId:string|null):string|null {
 if(dungeon?.run){const enemy=dungeon.run.enemies?.find((e:any)=>e.id===dungeon.target&&e.hp>0);return enemy?`dungeon:${dungeon.run.id}:${dungeon.run.attempt}:${dungeon.run.stage}:${enemy.id}`:null;}
 if(!world)return null;
 if(world.area==='war'||world.area==='arena'||world.area==='black'&&playerId){const p=world.players?.find((p:any)=>p.id===playerId&&p.hp>0&&p.area===world.area);return p?`player:${p.id}:${p.respawn_at_ms??0}`:null;}
 const m=world.monsters?.find((m:any)=>m.id===monsterId&&m.hp>0);return m?`monster:${m.id}:${m.spawn_round}`:null;
}

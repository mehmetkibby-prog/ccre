import {isDeepStrictEqual} from 'node:util';

// Mutation frontier of the manifest-pinned DungeonEngine.command/tickStep and
// soloStage/soloTick. Immutable catalogue, appearance, loot and effect payloads
// are shared; their containing arrays are private. Native attack can rewrite
// specialist stats/cadence slots, so those are private for attack commands.
// No mutation is published until the unchanged native step finishes without
// requesting a durable writer. Native terminal rollback still clones its own
// private room, exactly as it did before this transport optimization.
export function forkDungeonRoom(run,{attack=false,presence=null}={}){
 return {...run,
  cfg:{...run.cfg},
  members:run.members.map(member=>({...member,
   ...(presence?{seen:Math.max(member.seen??0,presence.get(member.id)??0)}:{}),
   ...(member.cooldowns?{cooldowns:member.cooldowns.slice()}:{}),
   ...(attack&&member.stats?{stats:{...member.stats,multipliers:member.stats.multipliers?.slice(),cooldowns:member.stats.cooldowns?.slice()}}:{})
  })),
  enemies:run.enemies.map(enemy=>({...enemy})),effects:run.effects.slice(),telegraphs:run.telegraphs.slice(),
  ...(run.crystal?{crystal:{...run.crystal}}:{}),...(run.waveSpawn?{waveSpawn:{...run.waveSpawn}}:{})
 };
}

// motionTime remains exact in the authoritative room and in explicit snapshots.
// Only delta/projection invalidation ignores a clock-only tick. Movement, HP,
// effects, visibility and every other native room field still invalidate it.
export function dungeonImageChanged(before,after){
 if(!before||!after)return before!==after;
 const keys=new Set([...Object.keys(before),...Object.keys(after)]);keys.delete('motionTime');
 for(const key of keys)if(!Object.is(before[key],after[key])&&!isDeepStrictEqual(before[key],after[key]))return true;
 return false;
}

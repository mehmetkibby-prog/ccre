import {isAreaWalkablePosition,isAreaWalkableSegment} from "./world-layout.ts";

type Point = {x:number;y:number};
type Candidate = Point & {id:string;spawn_round:number;area:string;is_stone:number;is_boss:number;root_until_ms?:number;control_x?:number;control_y?:number};
export type AreaSkillHint = {id:string;spawnRound:number;x:number;y:number};

// The client only supplies bounded presentation hints for monsters that visibly
// walked together. The server still owns identities, life rounds, HP and damage.
export function readAreaSkillHints(input:unknown):Map<string,AreaSkillHint>{
 const result=new Map<string,AreaSkillHint>();
 if(!Array.isArray(input)||input.length>32)return result;
 for(const raw of input){
  if(!raw||typeof raw!=="object")continue;
  const row=raw as Record<string,unknown>;
  if(typeof row.id!=="string"||row.id.length>120||typeof row.spawnRound!=="number"||!Number.isSafeInteger(row.spawnRound)
    ||typeof row.x!=="number"||typeof row.y!=="number"||!Number.isFinite(row.x)||!Number.isFinite(row.y))continue;
  result.set(row.id,{id:row.id,spawnRound:row.spawnRound,x:row.x,y:row.y});
 }
 return result;
}

export function areaSkillPoint(target:Candidate,player:Point,hint:AreaSkillHint|undefined,nowMs:number,primary=false,recentlyProvoked=false):Point{
 if(Number(target.root_until_ms)>nowMs && Number.isFinite(target.control_x)&&Number.isFinite(target.control_y))
  return {x:Number(target.control_x),y:Number(target.control_y)};
 if(!hint||hint.id!==target.id||hint.spawnRound!==target.spawn_round||target.is_stone||target.is_boss)return target;
 // 150 is the normal leash. An earlier server-recorded attack allows the
 // 480-unit provoked leash; a client-provided position cannot grant it.
 const leash=primary||recentlyProvoked?480:150;
 if(Math.hypot(hint.x-target.x,hint.y-target.y)>leash+2
   ||((primary||recentlyProvoked) && Math.hypot(player.x-hint.x,player.y-hint.y)>500)
   ||Math.hypot(player.x-target.x,player.y-target.y)>(primary||recentlyProvoked?850:500)
   ||!isAreaWalkablePosition(target.area,hint.x,hint.y)
   ||!isAreaWalkableSegment(target.area,target.x,target.y,hint.x,hint.y))return target;
 return {x:hint.x,y:hint.y};
}

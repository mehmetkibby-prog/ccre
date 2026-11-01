import {smoothMotionPositionR72,firstMotionTargetR72} from './remote-playback-r72.mjs';
// Dungeon snapshots use their own authoritative simulation clock. Do not pass
// them through the world-preview stream or change local prediction/monsters.
export function acceptDungeonPeerR72(client,row,motion,run,at){
 if(row.id===client.playerId||!run.members.some(member=>member.id===row.id))return;
 const serverAt=Number(run.motionTime??run.serverTime);
 if(!Number.isFinite(serverAt)||!Number.isFinite(at))return;
 const scope=JSON.stringify([run.id,run.stage,run.attempt,row.positionEpoch??0,row.hp<=0]),sample={x:row.x,y:row.y,serverAt,receivedAt:at,stopped:row.hp<=0||Math.hypot(row.velocity?.x??0,row.velocity?.y??0)<.01};
 let buffer=motion.peerBufferR72;
 const last=buffer?.samples.at(-1);
 if(!buffer||buffer.scope!==scope||serverAt-(last?.serverAt??serverAt)>250||Math.hypot(row.x-(last?.x??row.x),row.y-(last?.y??row.y))>360){
  buffer={scope,samples:[sample],offset:at-serverAt};motion.peerBufferR72=buffer;
 }else{
  if(serverAt<last.serverAt)return;
  buffer.offset=Math.min(buffer.offset,at-serverAt);
  if(serverAt===last.serverAt)buffer.samples[buffer.samples.length-1]=sample;
  else buffer.samples.push(sample);
  if(buffer.samples.length>24)buffer.samples.splice(0,buffer.samples.length-24);
 }
 buffer.dead=row.hp<=0;
}
export function advanceDungeonPeerR72(motion,now,seconds,bounds){
 const buffer=motion.peerBufferR72;if(!buffer)return undefined;
 const state={motion,lastAt:motion.peerFrameAtR72??now-16.667,firstPointR72:motion.peerFirstR72};
 const first=firstMotionTargetR72(state,buffer,now);
 motion.peerFirstR72=state.firstPointR72;motion.peerFrameAtR72=now;
 const target=first??smoothMotionPositionR72(buffer,now,1,motion);if(!target)return undefined;
 const x=Math.max(bounds.minX,Math.min(bounds.maxX,target.x)),y=Math.max(bounds.minY,Math.min(bounds.maxY,target.y)),dx=x-motion.x,dy=y-motion.y,distance=Math.hypot(dx,dy);
 const travel=buffer.dead?distance:Math.min(distance,300*Math.max(0,Math.min(.1,seconds)));
 if(distance>0){motion.x+=dx*travel/distance;motion.y+=dy*travel/distance;}
 if(motion.remote){motion.remote.x=motion.x;motion.remote.y=motion.y;}
 motion.travel+=travel;return travel;
}

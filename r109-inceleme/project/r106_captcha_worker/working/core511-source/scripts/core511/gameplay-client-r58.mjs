export const clientGameplayR58={mountCombat:false,mountRender:false,dungeonWorldControls:false,adminAccessories:false,mistLevelRewards:false};
import {mountedHandR60} from './mount-rider-r60.mjs';
export function acceptGameplayR58(flags){for(const key of Object.keys(clientGameplayR58))clientGameplayR58[key]=flags?.[key]===true;}
export const mountedSkillBlockedR58=(player,ability)=>clientGameplayR58.mountCombat&&player?.mount?.mounted===true&&Number(ability)!==0;
// Transform a saddle-relative grip with the same torso lean as the rider.
export function mountedHandR58(role,x,y,frame,direction,mount){
 if(mount?.gripR60)return mountedHandR60(x,y,direction,mount);
 const facing=direction<-.08?-1:1,phase=mount?.attackPhase??0,swing=mount?.attacking?Math.sin(phase*Math.PI):0,lean=.06+swing*.16;
 const hx=role==='avci'?23:role==='arkanist'?20:22,hy=-5;
 return {x:x+facing*(hx*Math.cos(lean)-hy*Math.sin(lean)),y:y+8+(mount?.bob??0)+hx*Math.sin(lean)+hy*Math.cos(lean),facing};
}
export function dungeonSnapshotR58(data){return !clientGameplayR58.dungeonWorldControls||Object.hasOwn(data??{},'run');}
export function dungeonAttackR58(control,skill,now=performance.now()){
 if(!control.me||control.me.hp<=0||control.run?.status!=='active')return;
 const support=skill===3&&['heal','guard'].includes(control.branch456?.effect);
 let target=control.run.enemies.find(row=>row.id===control.target&&row.hp>0);
 if(!target&&!support){let distance=Infinity;for(const row of control.run.enemies){if(row.hp<=0)continue;const d=Math.hypot(row.x-control.me.x,row.y-control.me.y);if(d<distance){target=row;distance=d;}}}
 if(!target&&!support)return;
 control.queued=skill;
 if(target&&!support){control.target=target.id;control.chase=true;control.destination=null;if(skill===0)control.autoAttack=true;}
 control.prepareStrike(now);
}

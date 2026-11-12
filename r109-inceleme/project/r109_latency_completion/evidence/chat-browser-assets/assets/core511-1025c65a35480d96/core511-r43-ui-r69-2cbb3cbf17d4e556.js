import {TOWER_MARKET_R43} from './core511-r43-materials-0c10ea33dc2cc813.js';
import {towerMaterialIconR40} from './core511-r40-icons-r69-16445e30a5872c06.js';
const disabled=Object.freeze({towerMarket:false,pvpAutoTarget:false,remoteAttackAnimation:false,remoteMotionLatency:false});
let options=disabled,loading;
export function readR43Options(){return options;}
export function loadR43Options(request=globalThis.fetch){
 return loading??=Promise.resolve().then(()=>request('/api/core511-r43-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(!response.ok)throw Error('r43_options_unavailable');const value=await response.json();
  options=Object.freeze(Object.fromEntries(Object.keys(disabled).map(key=>[key,value?.[key]===true])));return options;
 }).catch(()=>disabled);
}
export function towerMarketEntriesR43(world,React){
 if(!options.towerMarket)return [];
 return Object.entries(TOWER_MARKET_R43).map(([kind,label])=>({id:'part:'+kind,kind:'dungeon_material',materialKind:kind,label,amount:world?.dungeonMaterials?.find(row=>row.kind===kind)?.amount??0,icon:towerMaterialIconR40(React,kind,label)}));
}
export function towerMarketIconR43(React,kind){return options.towerMarket&&Object.hasOwn(TOWER_MARKET_R43,kind)?towerMaterialIconR40(React,kind,TOWER_MARKET_R43[kind]):null;}
// The caller supplies the existing area, party and safe-circle rules. This
// chooses an initial target only; the native physical-hold latch is unchanged.
export function pvpEligibleR43(world,player,ownId,point,now,friendly,safe,isOpen){
 if(!options.pvpAutoTarget)return true;
 if(!world||!player||!['war','arena'].includes(world.area)&&!isOpen(world.area)||player.id===ownId||player.hp<=0||player.area!==world.area||player.channel!=null&&player.channel!==world.channel||friendly(world,player.id)||!Number.isFinite(player.x)||!Number.isFinite(player.y))return false;
 if(world.area==='war'&&(safe(point.x,point.y)||safe(player.x,player.y)))return false;
 if(world.area==='arena'){
  const match=world.arenaMatch,team=world.players?.find(row=>row.id===ownId)?.arena_team||match?.myTeam||0;
  if(!match||!Number.isFinite(match.startsAtMs)||now<match.startsAtMs||match.id?.startsWith('guild-')&&now>=match.startsAtMs+600000||team<=0||!(player.arena_team>0)||player.arena_team===team)return false;
 }
 return true;
}
export function choosePvpTargetR43({world,ownId,point,range,selectedId,monsterId,now,friendly,safe,isOpen,monsterValid}){
 if(!options.pvpAutoTarget||!world||!Number.isFinite(range)||range<0||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;
 let nearest=null,selected=null,distance=range;
 for(const player of (world.players??[]).slice(0,100)){
  if(!pvpEligibleR43(world,player,ownId,point,now,friendly,safe,isOpen))continue;
  if(player.id===selectedId)selected=player;
  const next=Math.hypot(player.x-point.x,player.y-point.y);
  if(next<=distance&&(!nearest||next<distance)){nearest=player;distance=next;}
 }
 if(selected)return selected.id;
 if(!['war','arena'].includes(world.area)&&monsterId&&(world.monsters??[]).some(row=>row.id===monsterId&&row.hp>0&&monsterValid(row)))return null;
 return nearest?.id??null;
}
// A stale PvP cast phase used to override each new confirmed attack pose in
// the hero renderer. Use the current pose without creating another projectile.
export function remoteCastPhaseR43(pose,legacy,now){
 if(!options.remoteAttackAnimation||!pose)return legacy;
 const duration=pose.until-pose.startedAt;
 if(!Number.isFinite(duration)||duration<=0)return legacy;
 const elapsed=Math.max(0,now-pose.startedAt);
 return {active:elapsed<duration,phase:Math.min(1,elapsed/duration)};
}

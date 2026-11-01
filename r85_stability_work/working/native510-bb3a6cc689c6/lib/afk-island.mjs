// One channel has 30 persistent creatures. IDs and positions are stable across releases.
export const AFK_WORLD = Object.freeze({width: 5400, height: 3600});
export const AFK_SPAWN = Object.freeze({x: 1180, y: 2340});
export const AFK_LEVEL = 30;
export const AFK_FREE_MS = 2 * 60 * 60 * 1000;
export const AFK_TICKET_MS = 2 * 60 * 60 * 1000;
export const AFK_FAMILIES = Object.freeze([
  {family:'golge',name:'Yosun Boynuz',hp:460,damage:8},
  {family:'curuk',name:'Kristal Kabuk',hp:650,damage:12},
  {family:'yutan',name:'Yaprak Ruhu',hp:540,damage:10},
]);
// All positions sit on the broad, walkable interior of the simplified island.
// Six loose columns and five staggered rows leave room for player approaches.
const clearings = [
  [1440,2410],[1930,2510],[2490,2390],[3040,2560],[3590,2390],[4130,2500],
  [1600,2100],[2160,2220],[2700,2070],[3250,2190],[3800,2040],[4230,2130],
  [1410,1750],[1970,1870],[2520,1720],[3090,1830],[3640,1710],[4120,1850],
  [1580,1430],[2120,1530],[2660,1370],[3220,1510],[3770,1360],[4210,1490],
  [1450,1100],[1980,1180],[2540,1050],[3070,1190],[3630,1030],[4140,1160],
];
export const AFK_SPAWNS = Object.freeze(clearings.map(([x,y],index)=>({
  slot:index+1,x,y,...AFK_FAMILIES[index%3],
})));
// The daily reset follows Turkey / Cyprus time (UTC+3) irrespective of server timezone.
export function afkDay(nowMs){return Math.floor((nowMs+3*3600000)/86400000);}
export function afkRemaining(state,nowMs){
  if(!state || state.day!==afkDay(nowMs))return AFK_FREE_MS;
  const elapsed=state.active?Math.min(15000,Math.max(0,nowMs-state.tick_at_ms)):0;
  return Math.max(0,AFK_FREE_MS+state.bonus_ms-state.used_ms-elapsed);
}

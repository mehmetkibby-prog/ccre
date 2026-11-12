// R92: local XP visibility; all other gameplay exports share R69 state.
import {clientGameplayR55} from './core511-gameplay-r69-ec0e405322bc1d3b.js';
export * from './core511-gameplay-r69-ec0e405322bc1d3b.js';
clientGameplayR55.mobileExperience=true;
export const EXPERIENCE_CSS_R55=`@media(pointer:coarse){
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level{display:flex!important;flex:0 0 48px;flex-direction:column;align-items:center;align-self:flex-end;justify-content:flex-end;min-width:48px;width:48px;max-width:48px;padding:0 2px 8px;gap:3px;box-sizing:border-box}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level>span{display:none}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level strong{width:28px;min-width:28px;height:28px;font-size:13px;line-height:24px}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level [data-slot=progress]{display:block!important;width:44px;height:5px;min-height:5px;flex-shrink:0}
.game-shell[data-col-r55-xp="true"] .combat-dock .hero-level small{display:block!important;white-space:normal;overflow-wrap:anywhere;text-align:center;max-width:48px;font-size:9px;line-height:1.15;color:#e1d5af}
}`;
export function createGameplayUIR55(React,loadOptions){
 return function GameplayUIR55(){
  const [flags,setFlags]=React.useState(()=>({...clientGameplayR55}));
  React.useEffect(()=>{let active=true;void loadOptions().then(data=>{if(!active)return;const next=data.gameplayR55??{};for(const key of Object.keys(clientGameplayR55))clientGameplayR55[key]=key==='mobileExperience'?next[key]!==false:next[key]===true;setFlags({...clientGameplayR55});});return()=>{active=false;};},[]);
  React.useEffect(()=>{const shell=document.querySelector('.game-shell');if(!shell||!flags?.mobileExperience)return;shell.setAttribute('data-col-r55-xp','true');window.dispatchEvent(new Event('resize'));return()=>shell.removeAttribute('data-col-r55-xp');},[flags?.mobileExperience]);
  return flags?.mobileExperience?React.createElement('style',null,EXPERIENCE_CSS_R55):null;
 };
}

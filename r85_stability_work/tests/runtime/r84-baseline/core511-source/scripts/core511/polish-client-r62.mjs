import {towerMaterialIconR40} from './tower-material-icons-r40.mjs';
import {ITEM_PANELS_CSS_R68} from './launch-ui-r68.mjs';
export const clientPolishR62={azrail:false,chestMarket:false,inventory:false,verification:false};
const listeners=new Set();
export function acceptPolishR62(value){for(const key of Object.keys(clientPolishR62))clientPolishR62[key]=value?.[key]===true;for(const fn of listeners)fn();}
export function azrailIconR62(React,kind,label='Azrail Sandığı'){
 if(!clientPolishR62.azrail||kind!=='tower_azrail_chest')return null;return React.createElement('span',{className:'azrail62-icon',style:{display:'inline-flex',width:54,height:54,flexShrink:0}},towerMaterialIconR40(React,kind,label));
}
export function azrailMarketR62(world,React){return clientPolishR62.chestMarket?[{id:'part:tower_azrail_chest',kind:'dungeon_material',materialKind:'tower_azrail_chest',label:'Azrail Sandığı',amount:world?.dungeonMaterials?.find(row=>row.kind==='tower_azrail_chest')?.amount??0,icon:azrailIconR62(React,'tower_azrail_chest')??React.createElement('span',{'aria-hidden':true},'◆')}]:[];}
export const INVENTORY_CSS_R62=`
.equipment-sheet .equipped-slots{grid-auto-rows:max-content!important;grid-template-rows:none!important}
.equipment-sheet .equipped-slots .gear-slot{display:grid!important;flex:none!important;align-self:start;max-height:none!important;height:auto!important;box-sizing:border-box;min-width:0;max-width:100%;min-height:64px;grid-template-columns:40px minmax(0,1fr)!important;align-items:center}
.equipment-sheet .gear-slot>span{min-width:0;max-width:100%}.equipment-sheet .gear-slot>span:last-child{height:auto!important;max-height:none!important;overflow:visible;align-self:center}
.equipment-sheet .gear-slot strong,.equipment-sheet .gear-slot small,.equipment-sheet .gear-slot b{display:block;max-width:100%;white-space:normal!important;overflow-wrap:anywhere;line-height:1.3;text-overflow:clip}
.equipment-sheet button.gear-slot>span>small,.equipment-sheet button.gear-slot>span>b,.equipment-sheet .bag-list.bag-grid .bag-gear-card .bag-item-inspect>span>small{display:none!important}
.equipment-sheet button.gear-slot>span>strong,.equipment-sheet .bag-list.bag-grid .bag-gear-card .bag-item-inspect>span>strong{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden!important;max-height:2.6em!important;white-space:normal!important;overflow-wrap:anywhere;line-height:1.3!important;text-overflow:ellipsis}
.equipment-sheet .bag-item-inspect{min-height:64px;touch-action:manipulation}.equipment-sheet button.gear-slot{touch-action:manipulation}
.equipment-sheet .bag-heading{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
.equipment-sheet .bag-heading-actions{display:grid!important;grid-template-columns:minmax(0,.9fr) minmax(0,.75fr) minmax(0,.8fr) minmax(0,1.25fr);gap:5px;width:100%;flex-basis:100%;min-width:0;max-width:100%;margin:0;overflow:visible}
.equipment-sheet .bag-heading-actions>button{display:inline-flex!important;align-items:center;justify-content:center;gap:4px;width:100%;min-width:0!important;min-height:40px;padding:6px 5px!important;margin:0!important;white-space:nowrap!important;font-size:11px!important;line-height:1.2}
.equipment-sheet .bag-heading-actions>button svg,.equipment-sheet .bag-heading-actions .rune-icon{width:14px!important;height:14px!important;flex-shrink:0}
@media(max-width:420px){.equipment-sheet .bag-heading-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.equipment-sheet .bag-heading-actions>button{min-height:44px}.equipment-sheet .gear-slot{min-height:62px}}
`;
export const AZRAIL_CSS_R62=`
.equipment-sheet .bag-list.bag-grid .tower27-material:has(.azrail62-icon){grid-column:span 2;display:grid!important;grid-template-columns:56px minmax(0,1fr)!important;align-items:center!important;gap:7px!important;height:auto!important;min-height:132px!important;padding:9px!important}
.equipment-sheet .bag-list.bag-grid .tower27-material:has(.azrail62-icon) .tower27-label strong,.equipment-sheet .bag-list.bag-grid .tower27-material:has(.azrail62-icon) .tower27-label small{display:block!important;max-height:none!important;-webkit-line-clamp:unset!important;overflow:visible!important;white-space:normal!important}
.equipment-sheet .bag-list.bag-grid .tower27-material:has(.azrail62-icon) .bag-actions{grid-column:1/-1;display:flex!important;justify-content:flex-end}.equipment-sheet .tower27-material:has(.azrail62-icon) .bag-actions>button{min-width:90px!important}
`;
export function createPolishUIR62(React){return function Polish(){const[,changed]=React.useState(0);React.useEffect(()=>{const fn=()=>changed(n=>n+1);listeners.add(fn);return()=>listeners.delete(fn);},[]);return React.createElement('style',{'data-polish-r62':true},ITEM_PANELS_CSS_R68+(clientPolishR62.inventory?INVENTORY_CSS_R62:'')+(clientPolishR62.azrail?AZRAIL_CSS_R62:''));};}

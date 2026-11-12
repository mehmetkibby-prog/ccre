import {ZUMRUT_MATERIALS_R93} from './zumrut-materials-r93.mjs';
import {zumrutItemIconR93} from './zumrut-icons-r93.mjs';
// Called by the existing Pazarım selector. No fetch, timers or second market.
export function zumrutMarketEntriesR93(world,React){
 const balances=new Map((world?.dungeonMaterials??[]).filter(row=>Object.hasOwn(ZUMRUT_MATERIALS_R93,row.kind)).map(row=>[row.kind,row.amount]));
 return Object.entries(ZUMRUT_MATERIALS_R93).map(([kind,label])=>({id:'part:'+kind,kind:'dungeon_material',materialKind:kind,label,amount:balances.get(kind)??0,icon:zumrutItemIconR93(React,kind,label,48)}));
}
export function zumrutMarketIconR93(React,kind){return Object.hasOwn(ZUMRUT_MATERIALS_R93,kind)?zumrutItemIconR93(React,kind,ZUMRUT_MATERIALS_R93[kind],48):null;}

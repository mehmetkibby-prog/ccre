// R40 input/display helpers. No transport, movement, combat math or item data changes.
export {towerMaterialIconR40,drawTowerMaterialIconR40} from './tower-material-icons-r40.mjs';
const disabled=Object.freeze({mobileMenu:false,inventoryWrap:false,mistAutoTarget:false,enchantmentDisplay:false,towerMaterialIcons:false,reconnectRecovery:false,bagLimit:null});
let options=disabled,loading=null;
const listeners=new Set();
export function readR40Options(){return options;}
export function loadR40Options(request=globalThis.fetch){
 if(loading)return loading;
 loading=Promise.resolve().then(()=>request('/api/core511-ui-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(!response.ok)throw Error('ui_options_unavailable');
  const value=await response.json();
  options=Object.freeze({mobileMenu:value?.mobileMenu===true,inventoryWrap:value?.inventoryWrap===true,mistAutoTarget:value?.mistAutoTarget===true,enchantmentDisplay:value?.enchantmentDisplay===true,towerMaterialIcons:value?.towerMaterialIcons===true,reconnectRecovery:value?.reconnectRecovery===true,bagLimit:value?.bagLimit===35?35:null});
  for(const notify of listeners)notify(options);
  return options;
 }).catch(()=>disabled);
 return loading;
}
export function ordinaryEnchantR40(entry){return !options.enchantmentDisplay||!String(entry?.kind).startsWith('stone_');}
export function chooseMistTargetR40({world,ownId,point,range,selectedId,monsterId,isMist,friendly,monsterValid}){
 if(!options.mistAutoTarget||!isMist||!world||!Number.isFinite(range)||range<0||!Number.isFinite(point?.x)||!Number.isFinite(point?.y))return null;
 const players=world.players??[];
 const eligible=p=>p&&p.id!==ownId&&p.hp>0&&p.area===world.area&&(p.channel==null||p.channel===world.channel)&&!friendly(world,p.id)&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 // Preserve a manually selected player; native range/chase handling still owns it.
 let selected=null,nearest=null,distance=range;
 for(let index=0;index<Math.min(players.length,100);index++){
  const player=players[index];if(!eligible(player))continue;
  if(player.id===selectedId)selected=player;
  const next=Math.hypot(player.x-point.x,player.y-point.y);
  if(next<=distance&&(!nearest||next<distance)){nearest=player;distance=next;}
 }
 if(selected)return selected.id;
 // A live manually selected monster keeps its priority. A stale target cannot block PvP.
 if(monsterId&&(world.monsters??[]).some(monster=>monster.id===monsterId&&monster.hp>0&&monsterValid(monster)))return null;
 return nearest?.id??null;
}
const equipmentKinds=new Set(['weapon','armor','helmet','shoes','necklace','earring','bracelet','belt']);
export function bagEquipmentCountR40(inventory){let count=0;for(const item of inventory??[])if(!item.equipped&&equipmentKinds.has(item.kind))count++;return count;}
export const inventoryCSSR40=`
.equipment-sheet .bag-grid,.equipment-sheet .equipped-slots{min-width:0}
.equipment-sheet .bag-item,.equipment-sheet .gear-slot{min-width:0;max-width:100%;box-sizing:border-box}
.equipment-sheet .bag-item-inspect{min-width:0;max-width:100%;width:100%;box-sizing:border-box}
.equipment-sheet .bag-item-inspect>span,.equipment-sheet .inventory-summary,.equipment-sheet .gear-slot>span{min-width:0;max-width:100%;overflow:hidden}
.equipment-sheet .bag-item strong,.equipment-sheet .bag-item small,.equipment-sheet .gear-slot strong,.equipment-sheet .gear-slot b,.equipment-sheet .gear-slot small{white-space:normal;overflow-wrap:anywhere;word-break:normal;max-width:100%;text-overflow:clip}
.equipment-sheet .bag-actions{min-width:0;max-width:100%;flex-wrap:wrap;box-sizing:border-box}
.equipment-sheet .bag-actions button,.equipment-sheet .bag-actions b{min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere}
.equipment-sheet .bag-heading{min-width:0;flex-wrap:wrap;gap:8px}
.equipment-sheet .bag-heading-actions{min-width:0;max-width:100%;flex-wrap:wrap}
.equipment-sheet .bag-list.bag-grid .bag-item{height:auto!important;min-height:148px!important}
.equipment-sheet .bag-list.bag-grid .bag-item-inspect{flex:0 0 auto!important;overflow:visible}
.equipment-sheet .bag-list.bag-grid .bag-item-inspect>span,.equipment-sheet .bag-list.bag-grid .inventory-summary{overflow:visible}
.equipment-sheet .bag-list.bag-grid .bag-item strong,.equipment-sheet .bag-list.bag-grid .bag-item small,.equipment-sheet .bag-list.bag-grid .inventory-summary:has(small+small) small{display:block!important;-webkit-line-clamp:unset!important;max-height:none!important;overflow:visible!important}
.equipment-sheet .bag-list.bag-grid .bag-actions{flex:0 0 auto!important;height:auto!important;min-height:32px!important;margin-top:auto!important}
.equipment-sheet .bag-list.bag-grid .bag-actions>:is(button,b){height:auto!important;min-height:32px!important}
.inventory-gear-tooltip{max-width:min(360px,calc(100vw - 24px));overflow-wrap:anywhere}
`;
export const mobileMenuCSSR40=`
.world-actions.r40-mobile-menu{position:relative!important;display:block!important;width:auto!important;max-width:calc(100vw - 24px);overflow:visible!important;z-index:65}
.world-actions.r40-mobile-menu>.r40-mobile-menu-toggle{width:auto!important;height:42px!important;min-height:42px!important;min-width:84px!important;display:flex;align-items:center;justify-content:center!important;gap:8px;padding:9px 13px!important;border:1px solid #b99555;border-radius:9px;background:#191b24;color:#f2dfb8;font-family:inherit;font-size:13px!important;font-weight:700;touch-action:manipulation}
.world-actions.r40-mobile-menu>.r40-mobile-menu-items{position:absolute;top:calc(100% + 6px);left:0;display:flex;flex-direction:column;gap:6px;width:min(240px,calc(100vw - 28px));max-height:min(60dvh,420px);overflow:auto;padding:8px;border:1px solid #947444;border-radius:10px;background:#151822;box-shadow:0 8px 28px #0009;box-sizing:border-box;overscroll-behavior:contain}
.world-actions.r40-mobile-menu>.r40-mobile-menu-items[hidden]{display:none!important}
.r40-mobile-menu-items>button,.r40-mobile-menu-items>a{position:static!important;inset:auto!important;transform:none!important;width:100%!important;min-height:40px;max-width:100%;white-space:normal;box-sizing:border-box;justify-content:flex-start!important;font-size:13px!important}
.r40-mobile-menu-items .quests479-label{display:inline!important;position:static!important;width:auto!important;height:auto!important;clip:auto!important;overflow:visible!important}
`;
export function createR40UI(React){
 const h=React.createElement;
 function useOptions(){const [value,setValue]=React.useState(readR40Options);React.useEffect(()=>{listeners.add(setValue);setValue(options);void loadR40Options();return()=>listeners.delete(setValue);},[]);return value;}
 function Menu({children,...props}){
  const flags=useOptions(),[open,setOpen]=React.useState(false),[mobile,setMobile]=React.useState(()=>typeof window!=='undefined'&&window.matchMedia('(pointer: coarse)').matches),root=React.useRef(null),toggle=React.useRef(null),id=React.useId();
  React.useEffect(()=>{const query=window.matchMedia('(pointer: coarse)'),change=()=>{setMobile(query.matches);setOpen(false);};query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  React.useEffect(()=>{if(!open)return;const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);},key=event=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
  const compact=flags.mobileMenu&&mobile;
  const closeAfterChoice=event=>{const choice=event.target.closest?.('button,a');if(choice&&!choice.disabled&&!event.target.closest?.('[role="dialog"],[role="alertdialog"]'))setOpen(false);};
  const body=compact?h('div',{...props,ref:root,className:props.className+' r40-mobile-menu'},
   h('button',{ref:toggle,type:'button',className:'r40-mobile-menu-toggle','aria-expanded':open,'aria-controls':id,onClick:()=>setOpen(value=>!value)},h('span',{'aria-hidden':true},open?'×':'☰'),'Menü'),
   h('div',{id,className:'r40-mobile-menu-items',hidden:!open,onPointerUp:closeAfterChoice,onClick:closeAfterChoice},children)):
   h('div',props,children);
  if(!compact&&!flags.inventoryWrap)return body;
  return h(React.Fragment,null,h('style',{'data-core511-r40-ui':true},(compact?mobileMenuCSSR40:'')+(flags.inventoryWrap?inventoryCSSR40:'')),body);
 }
 function BagCapacity({inventory}){const flags=useOptions();if(!flags.bagLimit)return null;const count=bagEquipmentCountR40(inventory);return h('span',{className:'r40-bag-capacity',role:'status',style:{fontSize:12,color:count>=flags.bagLimit?'#ffb28b':'#d7c8ab',whiteSpace:'normal'}},count>=flags.bagLimit?`Çanta dolu (${count}/${flags.bagLimit}). Yeni ekipman almak için yer aç.`:`${count}/${flags.bagLimit} ekipman`);}
 return {Menu,BagCapacity};
}

import {SOLO_CATALOG as MIST_CATALOG} from '../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs';
const catalog=new Map(MIST_CATALOG.map(item=>[item.id,item]));
export const MIST_REWARD_DURATION_R70=5000;
export function mistRewardRowsR70(result){
 const reward=result?.chestRewards;if(!reward||typeof reward.runId!=='string'||!Array.isArray(reward.items)||reward.items.length>16)return null;
 const items=reward.items.filter(row=>catalog.has(row.id)&&Number.isSafeInteger(row.amount)&&row.amount>0).map(row=>({item:catalog.get(row.id),amount:row.amount}));
 return {runId:reward.runId,gold:reward.gold===true,items};
}
export function createMistRewardPopupR70(React,{rewardArt,GearIcon}={}){
 const h=React.createElement;
 function Glyph({kind}){const paths={essence:'M12 2C8 8 4 11 4 15a8 8 0 0 0 16 0c0-4-4-7-8-13Z',gem:'m12 2 9 8-9 12L3 10l9-8Zm-9 8h18M12 2v20',potion:'M8 2h8v4l-1 2v3l5 7c2 4-2 4-8 4s-10 0-8-4l5-7V8L8 6Z',pearl:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z'};return h('svg',{viewBox:'0 0 24 24',width:32,height:32,'aria-hidden':true},h('path',{d:paths[kind]??paths.gem,fill:kind==='potion'?'#c8384e':kind==='pearl'?'#f4e9d0':'#123d2e',stroke:kind==='potion'?'#ffadad':'#88dfb6',strokeWidth:1.5}));}
 function Icon({item}){
  if(item.type==='gear'&&GearIcon)return h(GearIcon,{...item,enchantments:'[]'});
  let art;try{art=rewardArt?.({...item,catalog_id:item.id});}catch{}
  if(art?.src)return h('span',{className:'mist70-sprite',role:'img','aria-label':item.name,style:{backgroundImage:`url(${JSON.stringify(art.src)})`,backgroundSize:`${(art.columns??1)*100}% ${(art.rows??1)*100}%`,backgroundPosition:`${art.columns>1?art.col/(art.columns-1)*100:50}% ${art.rows>1?art.row/(art.rows-1)*100:50}%`}});
  return h(Glyph,{kind:art?.glyph??item.column??item.kind});
 }
 return function Popup({reward,onClose}){
  React.useEffect(()=>{if(!reward)return;const timer=setTimeout(onClose,MIST_REWARD_DURATION_R70);return()=>clearTimeout(timer);},[reward,onClose]);
  if(!reward)return null;
  return h('aside',{className:'mist70-reward'+(reward.gold?' mist70-gold':''),'aria-label':'Kazanılan sandık ödülleri'},h('style',null,`.mist70-reward{position:fixed;z-index:90;top:max(90px,env(safe-area-inset-top));right:16px;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 150px);overflow:auto;background:#0d201b;color:#f2ead4;border:1px solid #5ca583;border-radius:15px;padding:16px;box-shadow:0 14px 50px #000b;pointer-events:auto;font-family:inherit}.mist70-gold{border-color:#d9b970;background:#272314}.mist70-reward header{display:flex;align-items:center;gap:8px;margin-bottom:12px}.mist70-reward header div{flex:1}.mist70-reward header small{display:block;color:#a3c5b3;font-size:10px;letter-spacing:1.4px;margin-bottom:3px}.mist70-reward header strong{font-size:17px}.mist70-reward button{background:#ffffff0c;border:1px solid #ffffff30;color:#f5e7c3;border-radius:8px;width:32px;height:32px;cursor:pointer;font-size:20px}.mist70-rewards{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mist70-reward-item{display:flex;align-items:center;gap:9px;background:#ffffff05;border:1px solid #ffffff15;border-radius:9px;padding:8px;min-width:0}.mist70-icon{width:42px;height:42px;flex-shrink:0;display:grid;place-items:center}.mist70-sprite{width:42px;height:42px;display:block;background-repeat:no-repeat}.mist70-reward-item b{font-size:12px;line-height:1.3;display:block;overflow-wrap:anywhere}.mist70-reward-item small{display:block;color:#b8e4c8;margin-top:3px;font-size:12px}.mist70-expiry{height:3px;margin-top:13px;border-radius:2px;background:#d6ba71;transform-origin:left;animation:mist70-expire 5s linear forwards}.mist70-reward p{font-size:13px;margin:8px 0}@keyframes mist70-expire{to{transform:scaleX(0)}}@media(max-height:500px){.mist70-reward{top:68px;padding:12px;max-height:calc(100dvh - 125px)}}@media(prefers-reduced-motion:reduce){.mist70-expiry{animation:none}}`),h('header',null,h('div',{role:'status'},h('small',null,'ÖDÜLLERİN TESLİM EDİLDİ'),h('strong',null,reward.gold?'Altın Sis Sandığı':'Sis Sandığı')),h('button',{type:'button','aria-label':'Ödül penceresini kapat',onClick:onClose},'×')),reward.items.length?h('div',{className:'mist70-rewards'},...reward.items.map(({item,amount},i)=>h('div',{className:'mist70-reward-item',key:item.id+':'+i},h('span',{className:'mist70-icon'},h(Icon,{item})),h('span',null,h('b',null,item.name),h('small',null,'×'+amount.toLocaleString('tr-TR')))))):h('p',null,'Bu sandıktan eşya çıkmadı.'),h('div',{className:'mist70-expiry','aria-hidden':true}));
 };
}

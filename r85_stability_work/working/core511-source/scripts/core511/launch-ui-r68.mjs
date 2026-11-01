// Local presentation of an authenticated chest result. Nothing is sent to chat.
const EVENT='core511:azrail-result-r68';
export function publishAzrailResultR68(path,input,result,host=globalThis.window){
 if(!['/api/action','/api/dungeon'].includes(path)||!['adventure_tower_chest','tower_open_chest'].includes(input?.action)||result?.ok!==true)return;
 const notice=result.personalNotice;
 if(notice?.kind!=='azrail'||typeof notice.playerId!=='string'||typeof notice.id!=='string'||!Array.isArray(notice.lines)||notice.lines.length>16||!notice.lines.length||notice.lines.some(line=>typeof line!=='string'||!line.length||line.length>140)||!Number.isSafeInteger(notice.at))return;
 host.dispatchEvent(new CustomEvent(EVENT,{detail:notice}));
}
export function listenAzrailResultR68(actor,append,host=globalThis.window){
 const seen=new Set();
 const receive=({detail:n})=>{
  if(n?.playerId!==actor||seen.has(n.id))return;
  seen.add(n.id);if(seen.size>256)seen.delete(seen.values().next().value);
  append(old=>[...old,...n.lines.map((body,i)=>({id:n.id+':'+i,createdAt:n.at/1000,body,azrail:true,playerId:actor}))].slice(-30));
 };
 host.addEventListener(EVENT,receive);return()=>host.removeEventListener(EVENT,receive);
}
// The emerald rarity rule supplies a translucent gradient with !important.
// Give every item information surface an opaque base beneath its existing art.
export const ITEM_PANELS_CSS_R68=`
body .item-detail-dialog[class],body .inventory-gear-tooltip[class],body .gear-quick-details[class],body .shop-slot-details[class],body .col-market-detail477[class]{background-color:#0d1913!important;opacity:1!important}
.chat-log .azrail-personal-r68,.chat-log .azrail-personal-r68 strong{color:#ff6969!important}
.equipment-sheet .bag-list.bag-grid .bag-gear-card .bag-item-inspect>span>small.bag-summary-r68{display:grid!important;gap:3px;margin-top:7px;max-height:none!important;overflow:visible!important;white-space:normal!important;line-height:1.3;font-size:11px;color:#bac9ba}
.bag-summary-r68>span{display:block;overflow-wrap:anywhere}
`;

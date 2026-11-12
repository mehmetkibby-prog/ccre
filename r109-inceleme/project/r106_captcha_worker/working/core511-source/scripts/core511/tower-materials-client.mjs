export function createTowerMaterials(React,{Icon,items,css}) {
 const h=React.createElement;
 return function TowerMaterials({world,own,post,onChange}) {
  const [busy,setBusy]=React.useState(false),[message,setMessage]=React.useState('');
  const lock=React.useRef(false),pending=React.useRef(null),alive=React.useRef(true);
  React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const counts=new Map((world?.dungeonMaterials??[]).map(row=>[row.kind,row.amount]));
  const count=kind=>counts.has(kind)?counts.get(kind):world?.adventure511?.towerInfo?.inventory?.[kind]??0;
  const rows=items.filter(([kind])=>count(kind)>0),run=world?.adventure511?.run;
  async function act(action,kind) {
   if(lock.current)return;
   const key=action+':'+kind;
   if(pending.current&&pending.current.key!==key){setMessage('Önce önceki işlemi aynı düğmeyle yeniden sorgula.');return;}
   pending.current??={key,requestId:crypto.randomUUID()};lock.current=true;setBusy(true);setMessage('');
   try {const result=await post('/api/action',{action,kind,amount:1,requestId:pending.current.requestId});if(result.error)throw Error(result.error);pending.current=null;if(alive.current){setMessage(result.message??'Tamamlandı.');await onChange?.();}}
   catch(error){if(error?.status>=400&&error.status<500&&error?.payload?.code!=='command_outcome_unknown')pending.current=null;if(alive.current)setMessage(error.message??'İşlem doğrulanamadı; aynı düğmeyle yeniden sorgula.');}
   finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  return h(React.Fragment,null,h('style',null,css),...rows.map(([kind,name,forge])=>h('article',{className:'bag-item tower27-material',key:kind},h('div',{className:'item-icon'},h(Icon,{kind})),h('div',{className:'tower27-label'},h('strong',null,name+' × '+count(kind)),h('small',null,kind==='tower_azrail_chest'?'İçeriği admin panelindeki sandık ayarına göre belirlenir.':kind==='tower_azrail_hook'?'Kadim Kulesi’ne özel eşya.':'Kadim Kulesi artı basma malzemesi.')),h('div',{className:'bag-actions'},kind==='tower_azrail_chest'&&h('button',{disabled:busy||!!run,onClick:()=>act('adventure_tower_chest',kind)},'Aç')))),message&&h('p',{role:'status'},message));
 };
}
export const INVENTORY_R27_CSS=`.equipped-jewelry463 .gear-slot{min-width:0;height:auto;min-height:76px}.equipped-jewelry463 .gear-slot>span{min-width:0}.equipped-jewelry463 .gear-slot strong,.equipped-jewelry463 .gear-slot small,.equipped-jewelry463 .gear-slot b{white-space:normal;overflow-wrap:anywhere;line-height:1.3}.bag-item-inspect{min-width:0;max-width:100%}.bag-item-inspect>span,.tower27-label{min-width:0;overflow-wrap:anywhere}.bag-item-inspect strong,.bag-item-inspect small,.tower27-label strong,.tower27-label small{white-space:normal;overflow-wrap:anywhere;line-height:1.35}.bag-actions{flex-wrap:wrap;min-width:0}.bag-gear-card,.tower27-material{min-width:0;max-width:100%}.tower27-material{display:grid!important;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center}.tower27-label small{display:block}.tower27-material .tower18-icon{width:48px;height:48px}.equipped-jewelry463{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px;min-width:0;width:100%;grid-column:1/-1}.equipped-jewelry463>.gear-slot{width:100%;box-sizing:border-box}.equipped-jewelry463 button{min-width:0;white-space:normal;overflow-wrap:anywhere}.trade-glass499-confirm .gear-quick-details{width:100%;min-width:0;box-sizing:border-box}.trade-glass499-confirm .gear-quick-details strong{white-space:normal;overflow-wrap:anywhere}@media(max-width:520px){.tower27-material{grid-template-columns:48px minmax(0,1fr)}.tower27-material .bag-actions{grid-column:2}.bag-gear-card .bag-actions{display:flex;flex-wrap:wrap}.equipped-jewelry463{grid-template-columns:minmax(0,1fr)!important}}`;

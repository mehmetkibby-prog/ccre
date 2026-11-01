// Revised R41 bag flow only. Existing R40 UI, transport and movement stay intact.
import {bagEquipmentCountR40} from './r40-client.mjs';
const disabled=Object.freeze({bagClientGuard:false,bagLimit:null});
let options=disabled,loading=null;
const listeners=new Set();
export function readBagOptionsR41(){return options;}
export function loadBagOptionsR41(request=globalThis.fetch){
 if(loading)return loading;
 loading=Promise.resolve().then(()=>request('/api/core511-ui-options',{credentials:'same-origin',cache:'no-store'})).then(async response=>{
  if(!response.ok)throw Error('bag_options_unavailable');
  const value=await response.json();
  options=Object.freeze({bagClientGuard:value?.bagClientGuard===true,bagLimit:value?.bagLimit===35?35:null});
  for(const notify of listeners)notify(options);
  return options;
 }).catch(()=>disabled);
 return loading;
}
export const BAG_PENDING_OVERFLOW_MESSAGE_R41='Bekleme listesi dolu; kazanılmış ödüller kaybolmaması için çantana eklendi. Yer aç.';
const equipment=new Set(['weapon','armor','helmet','shoes','necklace','earring','bracelet','belt']);
export function createBagGuardR41({readOptions=readBagOptionsR41,now=()=>performance.now()}={}){
 let inventory=null,count=0,owner=null,blocked=null,lastWarning=-Infinity;
 const active=()=>{const flags=readOptions();return flags.bagClientGuard===true&&flags.bagLimit===35;};
 function observe(world,id){
  if(id!==owner){owner=id;inventory=null;count=0;blocked=null;lastWarning=-Infinity;}
  const next=world?.inventory;
  if(next!==inventory){
   inventory=next;count=bagEquipmentCountR40(next);
   if(blocked){if(count<blocked.count)blocked=null;else blocked.count=Math.max(blocked.count,count);}
  }
  return count;
 }
 function warn(notify,at,message='Çantan dolu. Yeni ekipman almak için yer aç.'){if(at-lastWarning>=10000){lastWarning=at;notify(message);}}
 return {
  warnOverflow(world,notify,at=now(),id=''){
   const pending=world?.adventure511?.bagPending;if(!active()||pending?.full!==true)return false;
   if(observe(world,id)<=35&&!(pending.overflow===true))return false;
   warn(notify,at,BAG_PENDING_OVERFLOW_MESSAGE_R41);return true;
  },
  allowAuto(drop,world,notify,at=now(),id=''){
   if(!active()||!equipment.has(drop?.kind))return true;
   const total=observe(world,id);
   if(total<35&&!blocked)return true;
   warn(notify,at);return false;
  },
  reject(error,drop,world,notify,at=now(),id=''){
   const body=error?.payload??error?.body??error;
   if(!active()||body?.code!=='bag_full'||body.retryable!==false)return false;
   const total=observe(world,id),known=Number.isSafeInteger(body.bagCount)&&body.bagCount>=35?body.bagCount:35;
   blocked={count:Math.max(total,known)};warn(notify,at);return true;
  }
 };
}
export function pendingBagTextR41(value){
 if(!value||!Number.isSafeInteger(value.count)||value.count<=0)return '';
 return `+${value.count}${value.hasMore===true?'+':''} bekliyor`;
}
export function createBagCapacityR41(React,Previous){
 const h=React.createElement;
 return function BagCapacityR41({inventory,pending}){
  const [flags,setFlags]=React.useState(readBagOptionsR41);
  React.useEffect(()=>{listeners.add(setFlags);setFlags(options);void loadBagOptionsR41();return()=>listeners.delete(setFlags);},[]);
  if(!flags.bagClientGuard||flags.bagLimit!==35)return h(Previous,{inventory});
  const count=bagEquipmentCountR40(inventory),suffix=pendingBagTextR41(pending),overflow=pending?.full===true&&(count>35||pending.overflow===true);
  return h('span',{className:'r40-bag-capacity',role:'status',style:{fontSize:12,color:count>=flags.bagLimit?'#ffb28b':'#d7c8ab',whiteSpace:'normal'}},
   (count>=flags.bagLimit?`Çanta dolu (${count}/${flags.bagLimit}). Yeni ekipman almak için yer aç.`:`${count}/${flags.bagLimit} ekipman`)+(suffix?' · '+suffix:'')+(overflow?' '+BAG_PENDING_OVERFLOW_MESSAGE_R41:''));
 };
}

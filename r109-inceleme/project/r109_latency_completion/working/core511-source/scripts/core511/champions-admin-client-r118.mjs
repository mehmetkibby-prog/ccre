import {adminRequestR118,ADMIN_CSS_R118} from './royal-admin-client-r118.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
const lootLimit=id=>['white','blue','orange','red','purple','emerald'].includes(id)?3:100;
export function validateChampionsAdminR118(config,species,lootLabels){
 if(!config||typeof config.enabled!=='boolean'||!config.monsters)return 'Haritanın açık veya kapalı olduğunu seç.';
 for(const {key} of species??[]){
  const row=config.monsters[key];if(!row||typeof row.name!=='string'||!row.name.trim()||row.name.length>60)return 'Her canavarın 1–60 karakterlik bir adı olmalı.';
  for(const [field,min,max,label] of [['hp',1,10000000,'Can'],['damage',0,1000000,'Hasar'],['xp',0,1000000,'Tecrübe'],['essence',0,1000000,'Öz'],['respawnSeconds',1,86400,'Yeniden doğma süresi']])if(!Number.isSafeInteger(row[field])||row[field]<min||row[field]>max)return row.name+' · '+label+' alanına '+min+'–'+max+' arası tam sayı yaz.';
  for(const [id,loot] of Object.entries(row.loot??{})){
   if(!Object.hasOwn(lootLabels??{},id))return 'Bilinmeyen ganimet seçildi.';
   if(!Number.isFinite(loot.chance)||loot.chance<0||loot.chance>100)return 'Ganimet oranları %0–%100 arasında olmalı.';
   if(!Number.isSafeInteger(loot.min)||!Number.isSafeInteger(loot.max)||loot.min<1||loot.max<loot.min||loot.max>lootLimit(id))return 'Ganimet adedi 1–'+lootLimit(id)+' arasında; en yüksek adet en düşük adetten az olmamalı.';
  }
 }
 return '';
}
export function createChampionsAdminR118(React){
 const h=React.createElement;
 return function ChampionsAdmin(){
  const [data,setData]=React.useState(null),[draft,setDraft]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[notice,setNotice]=React.useState(''),[active,setActive]=React.useState(''),[shown,setShown]=React.useState({}),[mustReload,setMustReload]=React.useState(false);
  const alive=React.useRef(true),lock=React.useRef(false),controller=React.useRef(null);
  const act=async(save=false)=>{
   if(lock.current)return;
   const invalid=save?validateChampionsAdminR118(draft,data?.species,data?.lootLabels):'';if(invalid){setError(invalid);return;}
   lock.current=true;setBusy(true);setError('');setNotice('');const abort=new AbortController();controller.current=abort;
   try{
    const next=await adminRequestR118('champions',{action:save?'champions_admin_save_r118':'champions_admin_read_r118',...(save?{revision:data.revision,config:draft}:{})},{signal:abort.signal});
    const merged={...data,...next};
    if(!Array.isArray(merged.species)||merged.species.length!==4||!merged.lootLabels||merged.species.some(row=>!next.config.monsters?.[row.key]))throw Error('Canavar ayarları eksik. Yeniden yükle.');
    if(alive.current&&controller.current===abort){setData(merged);setDraft(clone(next.config));setActive(old=>merged.species.some(row=>row.key===old)?old:merged.species[0].key);setShown(Object.fromEntries(merged.species.map(({key})=>[key,Object.keys(next.config.monsters[key].loot).filter(id=>id==='royal_crown'||next.config.monsters[key].loot[id].chance>0)])));setMustReload(false);setNotice(save?'Şampiyonlar Diyarı ayarları bu sunucuya kaydedildi.':'');}
   }catch(e){if(alive.current&&controller.current===abort&&e.name!=='AbortError'){setError(e.message??'İşlem tamamlanamadı.');if(save)setMustReload(true);}}
   finally{if(controller.current===abort){lock.current=false;controller.current=null;if(alive.current)setBusy(false);}}
  };
  React.useEffect(()=>{alive.current=true;void act();return()=>{alive.current=false;controller.current?.abort();controller.current=null;lock.current=false;};},[]);
  const species=data?.species??[],labels=data?.lootLabels??{},row=draft?.monsters?.[active],visible=shown[active]??[],validation=draft?validateChampionsAdminR118(draft,species,labels):'';
  const change=patch=>setDraft(old=>({...old,monsters:{...old.monsters,[active]:{...old.monsters[active],...patch}}}));
  const lootChange=(id,patch)=>change({loot:{...row.loot,[id]:{...row.loot[id],...patch}}});
  const remove=id=>{lootChange(id,{chance:0});setShown(old=>({...old,[active]:old[active].filter(key=>key!==id)}));};
  const number=(key,label,min,max)=>h('label',{key},label,h('input',{type:'number',step:1,min,max,value:row[key],disabled:busy,'aria-label':label,onChange:e=>change({[key]:Number(e.target.value)})}));
  return h('section',{className:'admin-card r118-admin','data-champions-admin':'r118'},h('style',null,ADMIN_CSS_R118),h('header',null,h('small',null,'HARİTALAR VE SAVAŞ'),h('h2',null,'Şampiyonlar Diyarı'),h('p',null,'Yalnız Şampiyonların girebildiği açık PvP haritası. Her türün canını, hasarını ve av ödüllerini ayrı düzenle.')),
   draft&&row?h(React.Fragment,null,
    h('label',{className:'r118-select'},'Harita',h('select',{value:String(draft.enabled),disabled:busy,onChange:e=>setDraft({...draft,enabled:e.target.value==='true'})},h('option',{value:'true'},'Açık'),h('option',{value:'false'},'Kapalı'))),
    h('p',{className:'r118-subtle'},'Giriş koşulu: en az Şampiyon Lv 1. PvP açıktır. Her kanalda dört türden toplam '+species.reduce((sum,v)=>sum+(v.count??12),0)+' canavar bulunur.'),
    h('nav',{className:'r118-species','aria-label':'Şampiyonlar Diyarı canavarları'},...species.map(v=>h('button',{key:v.key,type:'button','aria-pressed':active===v.key,onClick:()=>setActive(v.key)},draft.monsters[v.key]?.name??v.name))),
    h('section',{className:'r118-card'},h('h3',null,'Canavar özellikleri'),h('div',{className:'r118-fields'},h('label',null,'Canavar adı',h('input',{type:'text',maxLength:60,value:row.name,disabled:busy,onChange:e=>change({name:e.target.value})})),number('hp','Can',1,10000000),number('damage','Hasar',0,1000000),number('xp','Tecrübe',0,1000000),number('essence','Öz',0,1000000),number('respawnSeconds','Yeniden doğma (saniye)',1,86400)),h('p',{className:'r118-subtle'},'Can değişikliği canavar yeniden doğduğunda uygulanır. Öz ve tecrübe av başına belirlenir. Aşağıdaki eşya oranları birbirinden bağımsızdır; toplamın %100 olması gerekmez.')),
    h('section',{className:'r118-card'},h('h3',null,'Bu canavardan düşebilecek eşyalar'),
     ...visible.map((id,index)=>{const value=row.loot[id]??{chance:0,min:1,max:1};return h('div',{className:'r118-row r118-loot',key:id},h('label',null,'Eşya '+(index+1),h('select',{value:id,disabled:busy,'aria-label':'Ganimet '+(index+1),onChange:e=>{const next=e.target.value;change({loot:{...row.loot,[id]:{...value,chance:0},[next]:{...value,min:Math.min(value.min,lootLimit(next)),max:Math.min(value.max,lootLimit(next))}}});setShown(old=>({...old,[active]:old[active].map(key=>key===id?next:key)}));}},...Object.entries(labels).filter(([key])=>key===id||!visible.includes(key)).map(([key,label])=>h('option',{key,value:key},label)))),h('label',null,'Oran %',h('input',{type:'number',min:0,max:100,step:.01,value:value.chance,disabled:busy,'aria-label':'Ganimet oranı '+(index+1),onChange:e=>lootChange(id,{chance:Number(e.target.value)})})),h('label',null,'En az',h('input',{type:'number',min:1,max:lootLimit(id),step:1,value:value.min,disabled:busy,'aria-label':'Ganimet en az '+(index+1),onChange:e=>lootChange(id,{min:Number(e.target.value)})})),h('label',null,'En çok',h('input',{type:'number',min:1,max:lootLimit(id),step:1,value:value.max,disabled:busy,'aria-label':'Ganimet en çok '+(index+1),onChange:e=>lootChange(id,{max:Number(e.target.value)})})),h('button',{type:'button',disabled:busy,'aria-label':'Ganimeti kaldır '+(index+1),onClick:()=>remove(id)},'Kaldır'));}),
     !visible.length&&h('p',{className:'r118-empty'},'Bu canavarda eşya düşürme kapalı. Ganimet ekleyerek bir oran belirleyebilirsin.'),
     h('button',{type:'button',disabled:busy||visible.length>=Object.keys(labels).length,onClick:()=>{const id=Object.keys(labels).find(key=>!visible.includes(key));if(id){lootChange(id,{chance:0,min:1,max:1});setShown(old=>({...old,[active]:[...(old[active]??[]),id]}));}}},'+ Ganimet ekle'),
     h('p',{className:'r118-subtle'},'Oranı %0 olan eşya düşmez. Kraliyet Tacı dönüşüm malzemesidir; buradan çıkma oranını belirleyebilirsin.')),
    validation&&h('p',{className:'r118-error',role:'status'},validation),mustReload&&h('p',{className:'r118-error'},'Kaydın sonucunu doğrulamak için kayıtlı ayarları yükle.'),h('div',{className:'r118-actions'},h('button',{type:'button',className:'r118-primary',disabled:busy||mustReload||!!validation,onClick:()=>void act(true)},busy?'İşleniyor…':'Harita ayarlarını kaydet'),h('button',{type:'button',disabled:busy,onClick:()=>void act()},'Kayıtlı ayarları yükle')))
   :h('section',{className:'r118-card'},h('p',{role:'status'},busy?'Şampiyonlar Diyarı ayarları yükleniyor…':'Harita ayarları yüklenemedi.'),!busy&&h('button',{type:'button',onClick:()=>void act()},'Yeniden dene')),
   error&&h('p',{className:'r118-error',role:'alert'},error),notice&&h('p',{className:'r118-notice',role:'status'},notice));
 };
}

import {createTowerUI as createTower511} from './core511-tower-03c17a08a07307f5.js';
// Pure display helpers. No item, combat or catalogue mutation.
const colEnhanceKinds491=Object.freeze(['weapon','armor','helmet','shoes','necklace','earring','bracelet']);
const colEnhanceWeapon491=Object.freeze([0,3,8,15,25,40]);
const colEnhanceDefense491=Object.freeze([0,2,6,11,18,28]);
const colEnhanceSpecial491=Object.freeze({weapon:'Oyunculara karşı güç +%5',armor:'Oyunculara karşı direnç +%5',helmet:'Kritik vuruş hasarı +%10',shoes:'Oyunculara karşı güç +%3',necklace:'Oyunculara karşı direnç +%3'});
function colEnhanceLevel491(item){
  const explicit=item?.enhancementLevel;
  if(Number.isInteger(explicit)&&explicit>=0&&explicit<=5)return explicit;
  const match=/^\+([0-5])\s/u.exec(String(item?.item_name??''));
  return match?Number(match[1]):0;
}
function colEnhanceName491(item){
  const name=item?.item_name;
  if(typeof name!=='string'||!colEnhanceKinds491.includes(item?.kind))return name;
  return '+'+colEnhanceLevel491(item)+' '+name.replace(/^(?:\+[0-5]\s+)+/u,'');
}
function colEnhanceBonusDetail491({React,item}){
  if(!colEnhanceKinds491.includes(item?.kind)||colEnhanceLevel491(item)!==5||!colEnhanceSpecial491[item.kind])return null;
  return React.createElement('p',{className:'enhancement491-special'},React.createElement('strong',null,'+5 bonusu · '),colEnhanceSpecial491[item.kind]);
}
function colEnhanceRequest491(){
  if(globalThis.crypto?.randomUUID)return 'enhance491_'+globalThis.crypto.randomUUID();
  if(!globalThis.crypto?.getRandomValues)throw Error('Güvenli işlem başlatılamadı. Sayfayı yenileyin.');
  const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);
  return 'enhance491_'+Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
}
function colEnhancePending491(actorId,ref,value,expectedRequestId){
  const actor=String(actorId??'');if(!actor)return null;
  const key='coreoflife:enhance491:'+actor;
  if(arguments.length>=3){
    if(value)ref.current={actor,payload:value};
    else if(ref.current?.actor===actor&&(!expectedRequestId||ref.current.payload?.requestId===expectedRequestId))ref.current=null;
    try{if(value)globalThis.sessionStorage?.setItem(key,JSON.stringify(value));else{const stored=JSON.parse(globalThis.sessionStorage?.getItem(key)??'null');if(!expectedRequestId||stored?.requestId===expectedRequestId)globalThis.sessionStorage?.removeItem(key);}}catch{}
    return value;
  }
  if(ref.current?.actor===actor)return ref.current.payload;
  try{
    const stored=JSON.parse(globalThis.sessionStorage?.getItem(key)??'null');
    if(stored&&typeof stored.requestId==='string'&&/^enhance491_[A-Za-z0-9-]{16,80}$/.test(stored.requestId)&&typeof stored.itemId==='string'&&stored.itemId.length<=128&&Number.isInteger(stored.expectedLevel)&&stored.expectedLevel>=0&&stored.expectedLevel<5&&Number.isSafeInteger(stored.configRevision)&&stored.configRevision>=0){ref.current={actor,payload:stored};return stored;}
  }catch{}
  return null;
}
function colEnhanceValidate491(config,catalog){
  const percent=value=>Number.isFinite(value)&&value>=0&&value<=100&&Math.abs(value*100-Math.round(value*100))<1e-7;
  if(!config||typeof config.enabled!=='boolean')return 'Sistemin açık veya kapalı olduğunu seçin.';
  if(!percent(config.dropPercent))return 'Kor Mührü düşme oranı 0–100 arasında, en fazla iki ondalık basamaklı olmalı.';
  if(!Array.isArray(config.stages)||config.stages.length!==5)return 'Beş geliştirme aşaması bulunmalı.';
  const available=new Set((catalog??[]).map(row=>row.id));
  for(let i=0;i<5;i++){
    const row=config.stages[i];
    if(row.level!==i+1||!percent(row.successPercent))return '+'+(i+1)+' başarı oranı 0–100 arasında, en fazla iki ondalık basamaklı olmalı.';
    if(!Array.isArray(row.requirements)||row.requirements.length>12)return 'Bir aşamada en fazla 12 malzeme seçilebilir.';
    const seen=new Set();
    for(const cost of row.requirements){if(!available.has(cost.id))return 'Listeden geçerli bir malzeme seçin.';if(seen.has(cost.id))return 'Aynı malzemeyi bir aşamada iki kez seçmeyin.';seen.add(cost.id);if(!Number.isSafeInteger(cost.amount)||cost.amount<1||cost.amount>1000000)return 'Malzeme miktarı 1–1.000.000 arasında tam sayı olmalı.';}
  }
  return '';
}

function colEnhanceAdmin491({React,value,busy,act}){
  const h=React.createElement,copy=config=>JSON.parse(JSON.stringify(config??{enabled:false,dropPercent:0,stages:[1,2,3,4,5].map(level=>({level,successPercent:0,requirements:[]}))}));
  const [draft,setDraft]=React.useState(()=>copy(value?.config)),[revision,setRevision]=React.useState(value?.revision),[saving,setSaving]=React.useState(false),[notice,setNotice]=React.useState(''),[changed,setChanged]=React.useState(false);
  const dirty=React.useRef(false),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  React.useEffect(()=>{if(!dirty.current){setDraft(copy(value?.config));setRevision(value?.revision);}},[value]);
  const catalog=value?.catalog??[],conflict=dirty.current&&revision!==value?.revision,validation=colEnhanceValidate491(draft,catalog),disabled=busy||saving;
  const edit=fn=>{dirty.current=true;setChanged(true);setNotice('');setDraft(previous=>fn(previous));};
  const editStage=(level,fn)=>edit(previous=>({...previous,stages:previous.stages.map(row=>row.level===level?fn(row):row)}));
  const numberInput=(label,number,update,min,max,step=1)=>h('label',{className:'enhancement491-field'},h('span',null,label),h('input',{type:'number',inputMode:step===1?'numeric':'decimal',min,max,step,value:number,disabled,onChange:event=>update(event.target.value===''?'':Number(event.target.value))}));
  const save=async()=>{
    if(lock.current||disabled||validation||conflict||!dirty.current)return;
    lock.current=true;setSaving(true);setNotice('');
    try{const response=await act({action:'enhancement_settings491',config:draft,expectedRevision:revision});if(response?.enhancement491){dirty.current=false;if(mounted.current){setDraft(copy(response.enhancement491.config));setRevision(response.enhancement491.revision);setChanged(false);setNotice('Artı basma ayarları kaydedildi.');}}else if(mounted.current)setNotice('Kaydedilemedi. Üstteki yönetici mesajını kontrol edin.');}
    catch(error){if(mounted.current)setNotice(error instanceof Error?error.message:'Ayarlar kaydedilemedi.');}
    finally{lock.current=false;if(mounted.current)setSaving(false);}
  };
  if(!value)return h('section',{className:'admin-card enhancement491-admin'},h('h2',null,'Artı Basma'),h('p',null,'Ayarlar yüklenemedi. Canlı veriyi yenileyin.'));
  return h('section',{className:'admin-card enhancement491-admin'},
    h('header',{className:'enhancement491-heading'},h('img',{src:'/game/haso-forge-v186.webp',alt:'',width:64,height:64}),h('div',null,h('small',null,'DEMİRCİ HASO · EKİPMAN GELİŞTİRME'),h('h2',null,'Artı Basma'),h('p',null,'Tüm sınıflar ve eşya renkleri aynı geliştirme katkısını alır. Efsun, taş ve evrim özellikleri korunur.'))),
    h('div',{className:'enhancement491-admin-top'},h('label',{className:'enhancement491-toggle'},h('input',{type:'checkbox',checked:draft.enabled===true,disabled,onChange:event=>edit(previous=>({...previous,enabled:event.target.checked}))}),h('span',null,h('strong',null,draft.enabled?'Artı basma AÇIK':'Artı basma KAPALI'),h('small',null,'Kapalıyken yeni deneme yapılamaz. Var olan artılar ve bonuslar korunur.'))),numberInput('Kor Mührü düşme şansı (%)',draft.dropPercent,n=>edit(previous=>({...previous,dropPercent:n})),0,100,.01)),
    h('p',{className:'enhancement491-hint'},'Kor Mührü yalnız gerçek canavar ölümünde, seçtiğiniz oranla düşer. Tek vuruş başına yeniden denenmez.'),
    h('div',{className:'enhancement491-summary'},h('div',null,h('small',null,'+5 silah katkısı'),h('strong',null,'+40 saldırı')),h('div',null,h('small',null,'+5 savunma eşyası başına'),h('strong',null,'+28 savunma')),h('div',null,h('small',null,'Altı savunma eşyası toplamı'),h('strong',null,'+168 savunma'))),
    h('p',{className:'enhancement491-risk'},'Başarısızlıkta mevcut artı 1 düşer; +0’ın altına inmez. Seçilen malzemeler başarıda da başarısızlıkta da harcanır. Eşya kırılmaz.'),
    h('div',{className:'enhancement491-stage-grid'},draft.stages.map(stage=>h('article',{key:stage.level,className:'enhancement491-stage'},
      h('header',null,h('span',{className:'enhancement491-stage-number'},'+'+stage.level),h('div',null,h('h3',null,'+'+(stage.level-1)+' → +'+stage.level),h('small',null,'Başarısızlıkta +'+Math.max(0,stage.level-2)))),
      numberInput('Başarı şansı (%)',stage.successPercent,n=>editStage(stage.level,row=>({...row,successPercent:n})),0,100,.01),
      h('div',{className:'enhancement491-stage-stats'},h('span',null,'Başarısızlık: %'+(Number.isFinite(stage.successPercent)?Math.round((100-stage.successPercent)*100)/100:'—')),h('span',null,'Toplam +'+colEnhanceWeapon491[stage.level]+' saldırı / +'+colEnhanceDefense491[stage.level]+' savunma')),
      stage.level===5?h('details',{className:'enhancement491-special'},h('summary',null,'+5 özel bonusları'),h('ul',null,[['Silah','weapon'],['Zırh','armor'],['Kask','helmet'],['Ayakkabı','shoes'],['Kolye','necklace']].map(([name,kind])=>h('li',{key:kind},name+': '+colEnhanceSpecial491[kind]))),h('small',null,'Küpe ve bilezikte ek +5 özel bonus yok. Artı +4’e düşerse özel bonus kapanır.')):null,
      h('h4',null,'İstenen malzemeler'),h('div',{className:'enhancement491-requirements'},stage.requirements.map((cost,index)=>h('div',{className:'enhancement491-requirement',key:stage.level+'-'+index},
        h('label',{className:'enhancement491-field'},h('span',null,'Malzeme '+(index+1)),h('select',{value:cost.id,disabled,'aria-label':'+'+stage.level+' malzeme '+(index+1),onChange:event=>editStage(stage.level,row=>({...row,requirements:row.requirements.map((entry,n)=>n===index?{...entry,id:event.target.value}:entry)}))},h('option',{value:''},'Malzeme seçin'),catalog.map(entry=>h('option',{key:entry.id,value:entry.id,disabled:stage.requirements.some((other,n)=>n!==index&&other.id===entry.id)},entry.name)))),
        numberInput('Miktar',cost.amount,n=>editStage(stage.level,row=>({...row,requirements:row.requirements.map((entry,at)=>at===index?{...entry,amount:n}:entry)})),1,1000000),
        h('button',{type:'button',className:'enhancement491-remove',disabled,'aria-label':'+'+stage.level+' aşamasından '+(catalog.find(row=>row.id===cost.id)?.name??'malzeme')+' kaldır',onClick:()=>editStage(stage.level,row=>({...row,requirements:row.requirements.filter((_,at)=>at!==index)}))},'Kaldır')))),
      stage.requirements.length===0?h('p',{className:'enhancement491-hint'},'Bu aşama malzeme istemiyor. İsterseniz malzeme ekleyin.'):null,
      h('button',{type:'button',className:'enhancement491-add',disabled:disabled||stage.requirements.length>=12||stage.requirements.length>=catalog.length,onClick:()=>editStage(stage.level,row=>({...row,requirements:[...row.requirements,{id:catalog.find(entry=>!row.requirements.some(cost=>cost.id===entry.id))?.id??'',amount:1}]}))},'+ Malzeme ekle')))),
    conflict?h('p',{className:'enhancement491-alert',role:'alert'},'Ayarlar başka bir oturumda değişti. Yazdıklarınız korunuyor; kaydetmeden önce güncel ayarları yükleyin.'):null,
    validation?h('p',{className:'enhancement491-alert',role:'alert'},validation):null,
    notice?h('p',{className:'enhancement491-notice',role:'status'},notice):null,
    h('footer',{className:'enhancement491-admin-save'},h('span',null,changed?'Kaydedilmemiş değişiklikler var.':'Güncel ayarlar görüntüleniyor.'),h('button',{type:'button',disabled,onClick:()=>{dirty.current=false;setChanged(false);setDraft(copy(value.config));setRevision(value.revision);setNotice('');}},'Güncel ayarları yükle'),h('button',{type:'button',className:'enhancement491-primary',disabled:disabled||!!validation||conflict||!changed,onClick:()=>void save()},saving?'Kaydediliyor…':'Artı basma ayarlarını kaydet')));
}

const colCauldronIngredients488=Object.freeze([
  {id:'bat_wing',name:'Yarasa Kanadı',image:'/assets/cauldron488-bat-wing.webp'},
  {id:'ghost_dust',name:'Hayalet Tozu',image:'/assets/cauldron488-ghost-dust.webp'},
  {id:'pumpkin_seed',name:'Balkabağı Çekirdeği',image:'/assets/cauldron488-pumpkin-seed.webp'}
]);
function colCauldronIcon488(React,item,className=''){
  const h=React.createElement,icon=item?.icon;
  if(String(item?.id??item?.itemId??'').startsWith('class:'))return h('svg',{viewBox:'0 0 24 24',className:'cauldron488-item-art '+className,'aria-hidden':true},h('path',{d:'m12 3 9 5-9 5-9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5',fill:'#294962',stroke:'#8cd1ef',strokeWidth:1.4,strokeLinejoin:'round'}));
  if(icon?.src){const columns=Math.max(1,Number(icon.columns)||1),rows=Math.max(1,Number(icon.rows)||1);return h('span',{className:'cauldron488-item-art '+className,role:'img','aria-label':item.label??item.name??'',style:{backgroundImage:`url(${icon.src})`,backgroundSize:`${columns*100}% ${rows*100}%`,backgroundPosition:`${columns===1?0:(Number(icon.col)||0)/(columns-1)*100}% ${rows===1?0:(Number(icon.row)||0)/(rows-1)*100}%`}});}
  if(item?.image)return h('img',{className:'cauldron488-item-art '+className,src:item.image,alt:'',loading:'lazy',decoding:'async'});
  if(['pearl','essence','gem','potion'].includes(icon?.glyph)){
    const red=item?.id==='resource:red_pearls'||item?.itemId==='resource:red_pearls';
    const children=icon.glyph==='pearl'?[h('circle',{key:1,cx:12,cy:12,r:8.2,fill:red?'#e35b76':'#dff8ff',stroke:red?'#ffb5c0':'#a9dbe7',strokeWidth:1.4}),h('circle',{key:2,cx:9.2,cy:8.8,r:2.2,fill:'#fff',fillOpacity:.92}),h('path',{key:3,d:'M7.2 15.8c2.8 2.4 6.9 2.7 9.7-.5',stroke:red?'#8f1732':'#8ebdcc',strokeWidth:1.1,strokeLinecap:'round',opacity:.7})]:icon.glyph==='potion'?[h('path',{key:1,d:'M9 3h6v6l4 7a4 4 0 0 1-3.5 6h-7A4 4 0 0 1 5 16l4-7Z',fill:'#7a233a',stroke:'#f1c29b',strokeWidth:1.5}),h('path',{key:2,d:'M8 14h8l2 4q1 3-3 3H9q-4 0-3-3Z',fill:'#e44459'}),h('path',{key:3,d:'M8 3h8M8 7h8',stroke:'#e5b17e',strokeWidth:2})]:[h('path',{key:1,d:icon.glyph==='essence'?'m12 2 7 10-7 10-7-10Z':'m6 4-4 6 10 12 10-12-4-6Z',fill:'#236a55',stroke:'#7fe4b8',strokeWidth:1.3}),h('path',{key:2,d:icon.glyph==='essence'?'M12 2v20L8 12Z':'m6 4 6 18 6-18M2 10h20',fill:icon.glyph==='essence'?'#81edb7':'none',stroke:'#9af7ce',strokeWidth:1.2})];
    return h('svg',{viewBox:'0 0 24 24',className:'cauldron488-item-art '+className,'aria-hidden':true},children);
  }
  return h('span',{className:'cauldron488-item-art cauldron488-glyph '+className,'aria-hidden':true,style:{color:icon?.color??'#dec18c'}},icon?.glyph??'✦');
}
function colCauldronCanBrew488(state,recipe){
  if(!state?.enabled||!recipe?.id)return false;
  if((Number(state.dailyCrafts?.[recipe.id])||0)>=Number(recipe.dailyLimit))return false;
  return colCauldronIngredients488.every(item=>(Number(state.ingredients?.[item.id])||0)>=(Number(recipe.cost?.[item.id])||0));
}
function colCauldronRequestId488(){
  if(globalThis.crypto?.randomUUID)return 'cauldron488_'+globalThis.crypto.randomUUID();
  if(!globalThis.crypto?.getRandomValues)throw Error('Güvenli işlem başlatılamadı. Sayfayı yenileyip tekrar dene.');
  const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return 'cauldron488_'+Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
}
function colCauldronCalendarEntry488(React,enabled,onOpen,onClose){
  if(!enabled)return null;
  const h=React.createElement;
  return h('button',{type:'button',className:'cauldron488-calendar-entry',onClick:()=>{onClose();onOpen?.();}},h('img',{src:'/assets/cauldron488-icon.webp',alt:'',width:44,height:44}),h('span',null,h('strong',null,'Cadının Kazanı'),h('small',null,'Malzemelerini topla, tatlı ödüller hazırla')),h('span',{'aria-hidden':true},'→'));
}

function colCauldronDraft488(value){return JSON.parse(JSON.stringify(value??{version:1,enabled:false,dropMaps:[],drops:{bat_wing:0,ghost_dust:0,pumpkin_seed:0},recipes:[]}));}
function colCauldronSearch488(catalog,query,group,page,size=24){
  const text=String(query??'').trim().toLocaleLowerCase('tr');
  const matched=(catalog??[]).filter(item=>(!group||item.group===group)&&(!text||[item.label,item.name,item.id,item.group,item.description].some(value=>String(value??'').toLocaleLowerCase('tr').includes(text))));
  const pages=Math.max(1,Math.ceil(matched.length/size)),current=Math.max(0,Math.min(pages-1,Number(page)||0));
  return {total:matched.length,pages,page:current,items:matched.slice(current*size,(current+1)*size)};
}
function colCauldronValidateDraft488(config,catalog){
  const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  if(!config||typeof config.enabled!=='boolean'||!Array.isArray(config.recipes)||config.recipes.length>8)return 'En fazla 8 tarif ekleyebilirsin.';
  if(colCauldronIngredients488.some(item=>!integer(config.drops?.[item.id],0,1000000)))return 'Malzeme oranları %0–100 arasında olmalı.';
  if(config.enabled&&(!config.recipes.length||!config.dropMaps.length))return 'Etkinliği açmak için en az bir harita ve ödüllü tarif seç.';
  const ids=new Set;
  for(const recipe of config.recipes){
    if(!/^[a-zA-Z0-9_-]{1,48}$/.test(recipe.id)||ids.has(recipe.id))return 'Tarif kimlikleri geçersiz.';ids.add(recipe.id);
    if(!String(recipe.name??'').trim()||recipe.name.length>48)return 'Her tarife 1–48 karakterlik bir ad ver.';
    if(!integer(recipe.dailyLimit,1,100))return 'Günlük hak 1–100 arasında olmalı.';
    if(colCauldronIngredients488.some(item=>!integer(recipe.cost?.[item.id],0,1000))||colCauldronIngredients488.reduce((sum,item)=>sum+recipe.cost[item.id],0)<1)return 'Tarif en az bir malzeme istemeli; her malzeme en fazla 1000 olabilir.';
    if(!Array.isArray(recipe.rewards)||recipe.rewards.length<1||recipe.rewards.length>8)return 'Her tarife 1–8 ödül ekle.';
    for(const reward of recipe.rewards){const item=catalog.find(row=>row.id===reward.itemId);if(!item||!integer(reward.amount,1,item.maxAmount??1000000))return 'Ödül miktarlarını kontrol et.';if(item.powerMin!==undefined&&(!integer(reward.power,item.powerMin,item.powerMax)))return 'Ekipman veya rün gücünü kontrol et.';}
  }
  return '';
}
function colCauldronAdmin488({React,value,expectedEvents,busy,act}){
  const h=React.createElement;
  const [draft,setDraft]=React.useState(()=>colCauldronDraft488(value?.config)),[expected,setExpected]=React.useState({revision:value?.revision,events:expectedEvents}),[saving,setSaving]=React.useState(false),[notice,setNotice]=React.useState(''),[picker,setPicker]=React.useState(''),[query,setQuery]=React.useState(''),[group,setGroup]=React.useState(''),[page,setPage]=React.useState(0);
  const dirty=React.useRef(false),lock=React.useRef(false);
  React.useEffect(()=>{if(!dirty.current){setDraft(colCauldronDraft488(value?.config));setExpected({revision:value?.revision,events:expectedEvents});}},[value,expectedEvents]);
  const catalog=value?.catalog??[],areas=value?.areas??[],conflict=dirty.current&&(expected.revision!==value?.revision||expected.events!==expectedEvents);
  const validation=colCauldronValidateDraft488(draft,catalog),disabled=busy||saving;
  const set=fn=>{dirty.current=true;setDraft(old=>fn(old));setNotice('');};
  const changeRecipe=(id,fn)=>set(old=>({...old,recipes:old.recipes.map(recipe=>recipe.id===id?fn(recipe):recipe)}));
  const input=(label,value,onChange,min,max,step=1)=>h('label',{className:'cauldron488-field',key:label},h('span',null,label),h('input',{type:'number',min,max,step,value,disabled,onChange:event=>onChange(event.target.value===''?'':Number(event.target.value))}));
  const save=async()=>{
    if(lock.current||disabled||validation||conflict||!dirty.current)return;
    lock.current=true;setSaving(true);setNotice('');
    try{const result=await act({action:'cauldron_settings488',config:draft,expectedRevision:expected.revision,expectedEvents:expected.events});if(result?.cauldron488){dirty.current=false;setDraft(colCauldronDraft488(result.cauldron488.config));setExpected({revision:result.cauldron488.revision,events:result.settings?.events_json});setNotice('Cadının Kazanı ayarları kaydedildi.');}else setNotice('Ayarlar kaydedilemedi. Üstteki yönetici mesajını kontrol et.');}
    catch(error){setNotice(error instanceof Error?error.message:'Ayarlar kaydedilemedi.');}
    finally{lock.current=false;setSaving(false);}
  };
  const results=React.useMemo(()=>picker?colCauldronSearch488(catalog,query,group,page):{total:0,pages:1,page:0,items:[]},[catalog,picker,query,group,page]);
  const groups=React.useMemo(()=>picker?[...new Set(catalog.map(item=>item.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')):[],[catalog,picker]);
  if(!value)return h('section',{className:'admin-card'},h('h2',null,'Cadının Kazanı'),h('p',null,'Etkinlik ayarları yüklenemedi. Canlı veriyi yenile.'));
  return h('section',{className:'admin-card cauldron488-admin'},
    h('header',{className:'cauldron488-admin-head'},h('img',{src:'/assets/cauldron488-icon.webp',alt:'',width:64,height:64}),h('div',null,h('span',{className:'cauldron488-eyebrow'},'CADILAR BAYRAMI ETKİNLİĞİ'),h('h2',null,'Cadının Kazanı'),h('p',null,'Malzemeler canavarlardan çıkar. Oyuncu seçtiği tarifin bütün ödüllerini alır.'))),
    h('label',{className:'cauldron488-enable'},h('input',{type:'checkbox',checked:draft.enabled,disabled,onChange:event=>set(old=>({...old,enabled:event.target.checked}))}),h('span',null,h('strong',null,draft.enabled?'Etkinlik AÇIK':'Etkinlik KAPALI'),h('small',null,'Kaydettiğinde oyunculara uygulanır. Kapatınca birikmiş malzemeler korunur.'))),
    h('div',{className:'cauldron488-admin-block'},h('h3',null,'1. Malzemelerin çıkacağı haritalar'),h('div',{className:'cauldron488-map-grid'},areas.map(area=>{const id=Array.isArray(area)?area[0]:(area.id??area.area),name=Array.isArray(area)?area[1]:(area.name??area.label??id);return h('label',{key:id},h('input',{type:'checkbox',checked:draft.dropMaps.includes(id),disabled,onChange:event=>set(old=>({...old,dropMaps:event.target.checked?[...old.dropMaps,id]:old.dropMaps.filter(item=>item!==id)}))}),name);})),h('p',{className:'cauldron488-muted'},'Yalnız seçilen av haritalarındaki uygun canavarlar malzeme verir. Bu malzemeler satılamaz ve takas edilemez.')),
    h('div',{className:'cauldron488-admin-block'},h('h3',null,'2. Malzeme düşme şansları'),h('div',{className:'cauldron488-rate-grid'},colCauldronIngredients488.map(item=>h('div',{key:item.id,className:'cauldron488-rate'},h('img',{src:item.image,alt:'',width:60,height:60}),input(item.name+' (%)',draft.drops[item.id]===''?'':draft.drops[item.id]/10000,value=>set(old=>({...old,drops:{...old.drops,[item.id]:value===''?'':Math.round(value*10000)}})),0,100,0.0001)))),h('p',{className:'cauldron488-muted'},'Her malzemenin şansı ayrı hesaplanır; toplamın %100 olması gerekmez. Aynı canavardan birden fazla malzeme çıkabilir. %0 kapalı, %5 ise her uygun kesimde %5 şanstır.')),
    h('div',{className:'cauldron488-admin-block'},h('div',{className:'cauldron488-admin-row'},h('h3',null,'3. Tarifler ve ödüller'),h('button',{type:'button',disabled:disabled||draft.recipes.length>=8,onClick:()=>{const id='tarif_'+colCauldronRequestId488().replace(/[^a-zA-Z0-9]/g,'').slice(-16);set(old=>({...old,recipes:[...old.recipes,{id,name:'Cadının Hediyesi',cost:{bat_wing:3,ghost_dust:2,pumpkin_seed:1},dailyLimit:5,rewards:[]}]}));}},'+ Tarif ekle')),
      !draft.recipes.length?h('p',{className:'cauldron488-empty'},'İlk tarifini oluştur. Ödülleri sen seçene kadar etkinlik kapalı kalır.'):null,
      draft.recipes.map((recipe,recipeIndex)=>h('article',{className:'cauldron488-admin-recipe',key:recipe.id},
        h('div',{className:'cauldron488-admin-row'},h('h4',null,'Tarif ',recipeIndex+1),h('button',{type:'button',className:'cauldron488-remove',disabled,onClick:()=>{if(picker===recipe.id)setPicker('');set(old=>({...old,recipes:old.recipes.filter(row=>row.id!==recipe.id)}));}},'Tarifi kaldır')),
        h('div',{className:'cauldron488-edit-grid'},h('label',{className:'cauldron488-field'},h('span',null,'Oyuncunun göreceği tarif adı'),h('input',{value:recipe.name,maxLength:48,disabled,onChange:event=>changeRecipe(recipe.id,row=>({...row,name:event.target.value}))})),input('Oyuncu başına günlük hak',recipe.dailyLimit,count=>changeRecipe(recipe.id,row=>({...row,dailyLimit:count})),1,100)),
        h('div',{className:'cauldron488-cost-grid'},colCauldronIngredients488.map(item=>input(item.name,recipe.cost[item.id],count=>changeRecipe(recipe.id,row=>({...row,cost:{...row.cost,[item.id]:count}})),0,1000))),
        h('h5',null,'Verilecek ödüller · ',recipe.rewards.length,' / 8'),
        h('div',{className:'cauldron488-selected-rewards'},recipe.rewards.map((reward,index)=>{const item=catalog.find(row=>row.id===reward.itemId);return h('div',{className:'cauldron488-selected-reward',key:reward.itemId+':'+index},colCauldronIcon488(React,item),h('span',{className:'cauldron488-reward-name'},h('strong',null,item?.label??item?.name??reward.itemId),h('small',null,item?.description??item?.group??'')),input('Miktar',reward.amount,amount=>changeRecipe(recipe.id,row=>({...row,rewards:row.rewards.map((entry,i)=>i===index?{...entry,amount}:entry)})),1,item?.maxAmount??1000000),item?.powerMin!==undefined?input('Güç',reward.power??item.defaultPower,power=>changeRecipe(recipe.id,row=>({...row,rewards:row.rewards.map((entry,i)=>i===index?{...entry,power}:entry)})),item.powerMin,item.powerMax):null,h('button',{type:'button',disabled,'aria-label':(item?.name??'Ödül')+' ödülünü kaldır',onClick:()=>changeRecipe(recipe.id,row=>({...row,rewards:row.rewards.filter((entry,i)=>i!==index)}))},'Kaldır'));})),
        h('button',{type:'button',className:'cauldron488-add-reward',disabled:disabled||recipe.rewards.length>=8,onClick:()=>{setPicker(picker===recipe.id?'':recipe.id);setQuery('');setGroup('');setPage(0);}},picker===recipe.id?'Ödül seçiciyi kapat':'+ Oyundaki ödüllerden seç'),
        picker===recipe.id?h('div',{className:'cauldron488-picker'},h('div',{className:'cauldron488-picker-filters'},h('label',{className:'cauldron488-field'},h('span',null,'Ödül ara'),h('input',{type:'search',value:query,placeholder:'Eşya, para, kanat, kupon…',onChange:event=>{setQuery(event.target.value);setPage(0);}})),h('label',{className:'cauldron488-field'},h('span',null,'Kategori'),h('select',{value:group,onChange:event=>{setGroup(event.target.value);setPage(0);}},h('option',{value:''},'Tüm kategoriler'),groups.map(name=>h('option',{key:name,value:name},name))))),h('p',{className:'cauldron488-muted'},results.total,' ödül · Sayfa ',results.page+1,' / ',results.pages),h('div',{className:'cauldron488-picker-items'},results.items.map(item=>h('button',{type:'button',key:item.id,disabled:disabled||recipe.rewards.length>=8||recipe.rewards.some(reward=>reward.itemId===item.id),onClick:()=>changeRecipe(recipe.id,row=>({...row,rewards:[...row.rewards,{itemId:item.id,amount:1,...(item.powerMin!==undefined?{power:item.defaultPower??item.powerMin}:{})}]}))},colCauldronIcon488(React,item),h('span',null,h('strong',null,item.label??item.name),h('small',null,item.group),item.description?h('small',null,item.description):null)))),h('div',{className:'cauldron488-picker-pages'},h('button',{type:'button',disabled:results.page===0,onClick:()=>setPage(results.page-1)},'← Önceki'),h('button',{type:'button',disabled:results.page+1>=results.pages,onClick:()=>setPage(results.page+1)},'Sonraki →'))):null))),
    h('p',{className:'cauldron488-muted'},'Ödüller rastgele seçilmez: tarifteki listenin tamamı verilir. Süreli eşyalar, üzerlerinde yazan mevcut oyun süresiyle verilir. Günlük haklar Türkiye saatiyle 00.00’da yenilenir.'),
    h('div',{className:'cauldron488-admin-status',role:'status','aria-live':'polite'},notice||(conflict?'Canlı ayarlar değişti. Taslağın korundu; güncel ayarları yükleyip değişikliklerini tekrar uygula.':validation)),
    h('div',{className:'cauldron488-admin-actions'},h('button',{type:'button',className:'admin-primary',disabled:disabled||!!validation||conflict||!dirty.current,onClick:()=>void save()},saving?'Kaydediliyor…':'Cadının Kazanı ayarlarını kaydet'),h('button',{type:'button',disabled,onClick:()=>{dirty.current=false;setDraft(colCauldronDraft488(value.config));setExpected({revision:value.revision,events:expectedEvents});setNotice('');setPicker('');}},'Güncel ayarları yükle')));
}

function defaultFishingCatch482(){return {pearl:12,red_pearl:8,talisman:10,sokan:30,levrek:20,zargana:20};}
function validateFishingCatch482(input){
 const keys=['pearl','red_pearl','talisman','sokan','levrek','zargana'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||Object.keys(input).some(key=>!keys.includes(key)))throw Error('Altı av ödülünün oranını gir.');
 const next={};let total=0;
 for(const key of keys){const value=input[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>0.000001)throw Error('Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=value;total+=Math.round(value*100);}
 if(total!==10000)throw Error('Yakalama oranlarının toplamı %100 olmalı.');
 return next;
}
function readFishingCatch482(raw){try{const value=typeof raw==='string'?JSON.parse(raw):raw;return validateFishingCatch482(value?.fishingCatchWeights482??defaultFishingCatch482());}catch{return defaultFishingCatch482();}}
function createLoadLabAdmin477(React) {
  const h = React.createElement;
function panelBudgetSecondsR12(botCount, durationMinutes = 5) {
  if (!Number.isSafeInteger(botCount) || botCount < 1 || botCount > 75 || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10) return null;
  return Math.ceil((30000 + Math.floor((botCount - 1) / 10) * 30000 + ((botCount - 1) % 10) * 150 + 30000 + durationMinutes * 60000 + 8000) / 1000);
}
function balancedAllocationR12(botCount, settings, rows, now = Date.now()) {
  if (!Number.isSafeInteger(botCount) || botCount < 1 || botCount > 75 || !Array.isArray(rows)) return null;
  const capacities = [1, 2, 3].map(id => {
    const row = rows.find(value => value.id === id), age = now - Date.parse(row?.observedAt);
    if (!row || !Number.isFinite(age) || age < -2000 || age > 6000 || !Number.isSafeInteger(row.humanPlayers) || row.humanPlayers < 0 || !Number.isSafeInteger(row.botPlayers) || row.botPlayers < 0) return null;
    return Math.max(0, 25 - row.humanPlayers - row.botPlayers - Number(settings.reserveOne && settings.reserveChannel === id));
  });
  if (capacities.some(value => value === null) || capacities.reduce((a, b) => a + b, 0) < botCount) return null;
  const chosen = [0, 0, 0];
  for (let i = 0; i < botCount; i++) {
    let channel = -1;
    for (let j = 0; j < 3; j++) if (chosen[j] < capacities[j] && (channel < 0 || chosen[j] < chosen[channel])) channel = j;
    chosen[channel]++;
  }
  return chosen;
}
  const endpoint = '/api/admin?loadlab=1';
  const base = '0d352caa12e40846a3864eb9645c8de3a593b53b38b1666e2eb213fb7b8b12fc';
  const states = { unknown: 'Durum bilinmiyor', idle: 'Hazır', starting: 'Başlatılıyor', running: 'Çalışıyor', stopping: 'Durduruluyor / temizleniyor', completed: 'Tamamlandı', stopped: 'Durduruldu', invalid: 'Ölçüm geçersiz', failed: 'İşlem başarısız' };
  const scenarios = { pve: 'Dağınık PvE', pvp10v10: '10v10 PvP', boss: 'Boss başında toplanma', mixed: 'Karışık' };
  const number = (value, digits = 1) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('tr-TR', { maximumFractionDigits: digits }) : '—';
  const percent = value => typeof value === 'number' && Number.isFinite(value) ? number(value) + '%' : '—';
  const stamp = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('tr-TR') : '—';
  const css = '.loadlab-admin477{grid-column:1/-1;min-width:0}.loadlab-admin477 *{box-sizing:border-box}.loadlab-admin477 .lab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:12px}.loadlab-admin477 label{display:flex;flex-direction:column;gap:6px}.loadlab-admin477 input,.loadlab-admin477 select,.loadlab-admin477 textarea{width:100%;min-height:44px;color:inherit;background:#162333;border:1px solid #65758d;border-radius:8px;padding:8px}.loadlab-admin477 .lab-check{display:flex;flex-direction:row;align-items:center;gap:8px}.loadlab-admin477 .lab-check input{width:20px;min-height:20px;flex:0 0 20px}.loadlab-admin477 .lab-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.loadlab-admin477 button{min-height:44px;cursor:pointer;padding:9px 14px}.loadlab-admin477 button:disabled{cursor:not-allowed;opacity:.55}.loadlab-admin477 .lab-stop{display:block;width:100%;min-height:64px;background:#a21324;color:#fff;border:2px solid #ff8f99;border-radius:10px;font-size:20px;font-weight:800}.loadlab-admin477 .lab-banner{padding:12px;background:#102e43;border:1px solid #598bab;border-radius:8px}.loadlab-admin477 .lab-error{color:#ffb6bb}.loadlab-admin477 .lab-table{overflow:auto;max-width:100%;margin:12px 0}.loadlab-admin477 table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.loadlab-admin477 th,.loadlab-admin477 td{padding:9px;text-align:left;white-space:nowrap;border-bottom:1px solid #4a596a}.loadlab-admin477 textarea{min-height:100px;overflow-wrap:anywhere}.loadlab-admin477 fieldset{min-width:0;border:1px solid #53637c;padding:12px;border-radius:8px;margin:16px 0}.loadlab-admin477 .lab-report{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;border-bottom:1px solid #53637c;padding:10px 0}.loadlab-admin477 .lab-note{font-size:13px;line-height:1.5}.loadlab-admin477 code{overflow-wrap:anywhere}.loadlab-admin477 h3{margin-top:22px}';
  return function LoadLabAdmin477() {
    const [status, setStatus] = React.useState(null), [statusAvailable, setStatusAvailable] = React.useState(false), [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
    const [busy, setBusy] = React.useState(''), [stopping, setStopping] = React.useState(false), [pairing, setPairing] = React.useState('');
    const [minutes, setMinutes] = React.useState(60), [reports, setReports] = React.useState([]), [download, setDownload] = React.useState('');
    const [form, setForm] = React.useState({ botCount: 70, channels: [24, 23, 23], reserveOne: true, reserveChannel: 1, durationMinutes: 5, ramp: { enabled: true, stepBots: 10, everySeconds: 30 }, scenario: 'pve' });
    const alive = React.useRef(false), requests = React.useRef(new Set()), poll = React.useRef(null), inFlight = React.useRef(false), lock = React.useRef(false), stopLock = React.useRef(false), downloadTask = React.useRef(null), commandEpoch = React.useRef(0), pairingTimer = React.useRef(null);
    const refreshRef = React.useRef(null);
    async function request(operation, payload = {}, signal) {
      const controller = new AbortController(); requests.current.add(controller);
      const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timeout = setTimeout(abort, operation === 'status' ? 12000 : 30000);
      try {
        const response = await fetch(endpoint, { method: operation === 'status' ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
          ...(operation === 'status' ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'loadlab', operation, payload }) }) });
        const result = await response.json();
        if (!response.ok || result?.ok === false) throw Object.assign(Error(result?.error || result?.message || 'İşlem tamamlanamadı.'), { code: result?.code });
        return result;
      } finally { clearTimeout(timeout); requests.current.delete(controller); signal?.removeEventListener('abort', abort); }
    }
    function acceptStatus(result) {
      if (!alive.current) return;
      setStatus(result); setStatusAvailable(typeof result?.enabled === 'boolean');
      if (Array.isArray(result?.agent?.reports)) setReports(result.agent.reports.slice(0, 50));
      if (result?.enabled === false) setPairing('');
    }
    async function refresh() {
      if (!alive.current || inFlight.current || document.visibilityState === 'hidden') return;
      inFlight.current = true;
      try { acceptStatus(await request('status')); }
      catch (cause) { if (alive.current) { setStatusAvailable(false); setError(cause?.name === 'AbortError' ? 'Test durumu zamanında alınamadı. Açık/kapalı ve temizlik durumu doğrulanamadı.' : cause?.message || 'Test durumu alınamadı.'); } }
      finally { inFlight.current = false; }
    }
    refreshRef.current = refresh;
    React.useEffect(() => {
      alive.current = true;
      let generation = 0;
      const update = () => {
        const version = ++generation;
        clearTimeout(poll.current);
        if (document.visibilityState === 'hidden') { setPairing(''); return; }
        void refreshRef.current().finally(() => { if (alive.current && version === generation && document.visibilityState !== 'hidden') poll.current = setTimeout(update, 2000); });
      };
      document.addEventListener('visibilitychange', update); update();
      return () => { alive.current = false; ++generation; clearTimeout(poll.current); clearTimeout(pairingTimer.current); downloadTask.current?.abort(); for (const controller of requests.current) controller.abort(); requests.current.clear(); document.removeEventListener('visibilitychange', update); };
    }, []);
    async function command(operation, payload = {}) {
      if (lock.current || stopLock.current) return;
      lock.current = true; const epoch = ++commandEpoch.current; setBusy(operation); setError(''); setNotice('');
      try {
        const result = await request(operation, payload);
        if (!alive.current || commandEpoch.current !== epoch) return;
        if (typeof result?.pairingToken === 'string') { setPairing(result.pairingToken); clearTimeout(pairingTimer.current); pairingTimer.current = setTimeout(() => { if (alive.current) setPairing(''); }, Math.max(0, Math.min(3600000, (result.expiresAtMs ?? Date.now()) - Date.now()))); }
        if (operation === 'reports') setReports(Array.isArray(result?.reports) ? result.reports.slice(0, 50) : []);
        if (operation === 'disable') setPairing('');
        if (['stop','cleanup','disable'].includes(operation) && result?.protocol === 'col-loadlab-cleanup-v2') {setStatus(previous => ({...(previous??{}),clean:result.clean===true,cleanupProgress:result.cleanup,cleanupError:result.cleanupError??null})); setNotice(result.clean===true ? 'Test kayıtlarının temizliği doğrulandı.' : 'Durdurma alındı. Temizlik sürüyor; tamamlanmadan yeni test başlayamaz.'); await refreshRef.current(); return;}
        setNotice(({ enable: 'Süreli test modu açıldı. Test VDS’ini aşağıdaki kodla eşleştir.', pair: 'Yeni eşleştirme kodu hazır. Test VDS’indeki eşleştirmeyi güncelle.', disable: 'Test modunu kapatma isteği alındı.', cleanup: 'Yalnız bu teste ait kayıtlar için temizlik istendi.', start: 'Başlatma isteği test VDS’ine gönderildi. Canlı durumdan sonucu izle.', reports: 'Rapor listesi güncellendi.' })[operation] || 'İstek alındı.');
        await refreshRef.current();
      } catch (cause) { if (alive.current && commandEpoch.current === epoch) { setError(cause?.code === 'stale_admin_epoch' ? 'Kontrol durumu değişti. Güncel durumu kontrol edip yeniden başlat.' : cause?.name === 'AbortError' ? 'Yanıt süresi doldu. İşlem sonucu bilinmiyor; canlı durumu kontrol et.' : cause?.message || 'İşlem tamamlanamadı.'); if (cause?.code === 'stale_admin_epoch') await refreshRef.current(); } }
      finally { lock.current = false; if (alive.current) setBusy(''); }
    }
    async function emergencyStop() {
      if (stopLock.current) return;
      stopLock.current = true; ++commandEpoch.current; setStopping(true); setNotice('Acil durdurma isteği gönderiliyor…'); setError('');
      try { const result=await request('stop'); if (alive.current) { if(result?.protocol==='col-loadlab-cleanup-v2')setStatus(previous=>({...previous,clean:result.clean===true,cleanupProgress:result.cleanup,cleanupError:result.cleanupError??null})); setNotice(result?.clean===true ? 'Botlar durduruldu ve temizlik doğrulandı.' : 'Acil durdurma alındı. Botların çıkışı ve temizlik sürüyor; aşağıdaki canlı temizlik durumunu izle.'); } await refreshRef.current(); }
      catch (cause) { if (alive.current) setError('Durdurma yanıtı doğrulanamadı. Durumu yenile; gerekirse canlı sunucuda sudo col-loadlab-live disable komutunu çalıştır.'); }
      finally { stopLock.current = false; if (alive.current) setStopping(false); }
    }
    async function downloadReport(id, format) {
      if (downloadTask.current || typeof id !== 'string') return;
      const task = new AbortController(); downloadTask.current = task; setDownload(id + format); setError('');
      try {
        const deadline = Date.now() + 60000;
        while (!task.signal.aborted && Date.now() < deadline) {
          if (document.visibilityState === 'hidden') throw Error('Rapor indirmesi sekme gizlendiği için duraklatıldı. Bu ekrana dönünce yeniden İndir’e bas.');
          const result = await request('report', { id, format }, task.signal);
          if (result?.state === 'ready') {
            if (result.id !== id || result.format !== format || (format === 'txt' && typeof result.data !== 'string')) throw Error('Rapor yanıtı doğrulanamadı.');
            const body = format === 'json' ? JSON.stringify(result.data, null, 2) + '\n' : result.data;
            const url = URL.createObjectURL(new Blob([body], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }));
            const link = document.createElement('a'); link.href = url; link.download = 'bot-testi-' + id.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100) + '.' + format;
            document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
            if (alive.current) setNotice('Rapor indirme isteği tarayıcıya gönderildi.'); return;
          }
          if (result?.state !== 'pending') throw Error('Rapor henüz hazır değil veya test VDS’ine ulaşılamıyor.');
          await new Promise((resolve, reject) => { const timer = setTimeout(done, 2000); function done() { task.signal.removeEventListener('abort', cancel); resolve(); } function cancel() { clearTimeout(timer); task.signal.removeEventListener('abort', cancel); reject(new DOMException('İptal', 'AbortError')); } task.signal.addEventListener('abort', cancel, { once: true }); });
        }
        if (!task.signal.aborted) throw Error('Rapor bekleme süresi doldu. Test VDS’inin bağlantısını kontrol edip yeniden indir.');
      } catch (cause) { if (alive.current && cause?.name !== 'AbortError') setError(cause?.code === 'report_requires_new_pairing' ? 'Bu raporun önbelleği yok. Test modunu açıp test VDS’ini yeniden eşleştir veya test VDS’indeki özel panelden indir.' : cause?.message || 'Rapor indirilemedi.'); }
      finally { downloadTask.current = null; if (alive.current) setDownload(''); }
    }
    
    const cleanupProgress492=status?.cleanupProgress;
    const cleanupFailed492=status?.cleanupError || ['failed','requires_cleanup'].includes(cleanupProgress492?.status);
    const cleanupMessages492=(Array.isArray(cleanupProgress492?.failures)?cleanupProgress492.failures:[]).slice(-3).map(f=>typeof f?.code==='string'?f.code:'bilinmeyen_temizlik_hatasi');
    const agent = status?.agent, metrics = agent?.status;
    const actionNames = [['attack', 'Saldırı'], ['move', 'Hareket'], ['world', 'Dünya']];
    const serverMetric = key => metrics?.actionTimingMs?.[key]?.stages?.server_total;
    const serverValue = (key, field) => serverMetric(key)?.count > 0 ? number(serverMetric(key)[field], 2) : '—';
    const cpuGroups = metrics?.processTotals?.groups ?? [];
    const connected = agent?.connected === true;
    const fresh = statusAvailable && connected && metrics?.observedAt && Date.now() - Date.parse(metrics.observedAt) >= -2000 && Date.now() - Date.parse(metrics.observedAt) < 7000;
    const active = status?.active === true || ['starting', 'running', 'stopping'].includes(metrics?.state) || ['queued', 'accepted', 'executing'].includes(agent?.command?.state);
    const change = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
    const rebalance = (count = form.botCount) => {
      if (busy || active || stopping) return;
      const channels = balancedAllocationR12(count, form, metrics?.channels);
      if (!channels) { setError('Dağılım için güncel kanal bilgisi ve yeterli boş yer gerekli.'); return; }
      setError(''); setForm(previous => ({ ...previous, botCount: count, channels }));
    };
    const changeCount = value => {
      if (busy || active || stopping) return;
      setForm(previous => ({ ...previous, botCount: value, channels: balancedAllocationR12(value, previous, metrics?.channels) ?? previous.channels }));
    };
    const allocation = (channel, value) => setForm(previous => { const channels = previous.channels.map((n, i) => i === channel ? value : n); return { ...previous, channels, botCount: channels.reduce((sum, n) => sum + n, 0) }; });
    const issue = (() => {
      if (!Number.isInteger(form.botCount) || form.botCount < 1 || form.botCount > 75) return 'Toplam bot sayısı 1–75 arasında olmalı.';
      if (form.channels.some(n => !Number.isInteger(n) || n < 0 || n > 25) || form.channels.reduce((sum, n) => sum + n, 0) !== form.botCount) return 'Üç kanalın toplamı bot sayısına eşit olmalı; kanal başına en fazla 25 oyuncu.';
      if (form.reserveOne && form.channels[form.reserveChannel - 1] > 24) return 'Sana yer ayrılan kanalda en fazla 24 bot olabilir.';
      if (!Number.isInteger(form.durationMinutes) || form.durationMinutes < 1 || form.durationMinutes > 10) return 'Kararlı ölçüm süresi 1–10 dakika olmalı.';
      if (form.ramp.enabled !== true || form.ramp.stepBots !== 10 || form.ramp.everySeconds !== 30) return 'Sabit rampa: her 30 saniyede 10 bot; ısınma 30 saniye.';
      if (form.scenario === 'pvp10v10' && (form.botCount !== 20 || form.channels.filter(Boolean).length !== 1)) return '10v10 PvP için tek kanalda tam 20 bot seç.';
      if (form.scenario === 'mixed' && (form.botCount < 21 || !form.channels.some(n => n >= 20))) return 'Karışık senaryoda bir kanalda 20 PvP botu ve en az 1 ek bot gerekir.';
      if (!Number.isInteger(form.ramp.stepBots) || form.ramp.stepBots < 1 || form.ramp.stepBots > 25 || !Number.isInteger(form.ramp.everySeconds) || form.ramp.everySeconds < 10 || form.ramp.everySeconds > 60) return 'Artış için 10–60 saniyede 1–25 bot seç.';
      for (const row of metrics?.channels ?? []) { const remaining = 25 - (row.humanPlayers ?? 25) - (row.botPlayers ?? 0) - Number(form.reserveOne && form.reserveChannel === row.id); if (form.channels[row.id - 1] > remaining) return 'Kanal ' + row.id + ' için gerçek oyuncular ve ayrılan yer sonrası boşluk yetersiz.'; }
      return '';
    })();
    const input = (label, value, min, max, onChange, disabled = !!busy || active || stopping) => h('label', null, h('span', null, label), h('input', { type: 'number', min, max, step: 1, value: Number.isNaN(value) ? '' : value, disabled, onChange: event => onChange(event.target.value === '' ? NaN : Number(event.target.value)) }));
    const button = (text, operation, payload, disabled = false) => h('button', { type: 'button', disabled: !!busy || stopping || disabled, onClick: () => void command(operation, payload) }, busy === operation ? 'İşleniyor…' : text);
    const table = (headings, rows) => h('div', { className: 'lab-table' }, h('table', null, h('thead', null, h('tr', null, ...headings.map(heading => h('th', { key: heading, scope: 'col' }, heading)))), h('tbody', null, ...rows.map((row, i) => h('tr', { key: i }, ...row.map((cell, index) => h('td', { key: index }, cell)))))));
    return h('section', { className: 'admin-card loadlab-admin477', 'data-loadlab-admin477': '' }, h('style', null, css),
      h('h2', null, 'Bot Testi · gerçekçi sentetik v2'),
      h('p', { className: 'lab-note' }, 'Sabit istemci profili: temel saldırı 1,3 sn; beceriler 20,8/24,7 sn; hareket kontrolü 1 sn. Gerçek oyuncu p90/p99 ölçülmedi. Son bot bağlandıktan sonra 30 sn ısınma, ardından seçtiğin süre boyunca kararlı ölçüm. 5 dakika Protokol v1 karşılaştırmasıdır; diğer süreler özel ölçüm olarak raporlanır. Giriş ve ısınma seçilen süreye dahil değildir.'),
      h('p', { className: 'lab-banner' }, h('strong', null, 'Kapasite: 75 oyuncu · 3 kanal × 25. '), '100 oyuncu için 4. kanal gerekir. Gerçek oyuncular ve sana ayrılan yer, kullanılabilir bot kapasitesinden düşülür.'),
      h('p', null, 'Botlar ayrı test VDS’inde (45.84.191.73) çalışır. Bu yönetim ekranı canlı sunucudaki süreli test yetkisini ve uzak botları kontrol eder.'),
      h('div', { className: 'lab-grid' }, input('Test modu süresi (dakika)', minutes, 1, 60, setMinutes, !!busy || active), h('div', null, h('strong', null, !statusAvailable ? 'Test modu durumu bilinmiyor' : status?.enabled === true ? 'Test modu açık' : 'Test modu kapalı'), h('p', null, connected ? 'Test VDS’i bağlı' : 'Test VDS’i bağlı değil'), h('small', null, 'Yetki bitişi: ', stamp(status?.lease?.expiresAtMs ?? metrics?.live?.expiresAt)))),
      h('div', { className: 'lab-actions' }, button('Test modunu aç', 'enable', { minutes }, !statusAvailable || status?.clean === false || active || !Number.isInteger(minutes) || minutes < 1 || minutes > 60), button('Eşleştirme kodu üret', 'pair', {}, !status?.enabled || active), button('Test modunu kapat', 'disable', {}, !status?.enabled), button('Test kayıtlarını temizle', 'cleanup', {}, active), h('button', { type: 'button', onClick: () => void refresh(), disabled: stopping }, 'Durumu yenile')),
      pairing && h('fieldset', null, h('legend', null, 'Test VDS’ini eşleştir'), h('p', null, '45.84.191.73 terminalinde aşağıdaki komutu çalıştır; istendiğinde bu kodu yapıştır. Kod yalnız bu yetki penceresinde kullanılır. Sohbete gönderme.'), h('code', null, 'sudo col-loadlab pair'), h('textarea', { readOnly: true, value: pairing, 'aria-label': 'Test VDS’i eşleştirme kodu', autoComplete: 'off', spellCheck: false }), h('div', { className: 'lab-actions' }, h('button', { type: 'button', onClick: async () => { try { await navigator.clipboard.writeText(pairing); if (alive.current) setNotice('Eşleştirme kodu kopyalandı.'); } catch { if (alive.current) setError('Kod otomatik kopyalanamadı. Metni seçerek kopyala.'); } } }, 'Kodu kopyala'), h('button', { type: 'button', onClick: () => setPairing('') }, 'Kodu gizle'))),
      h('fieldset', { disabled: !!busy || active || stopping }, h('legend', null, 'Test ayarları'), h('div', { className: 'lab-grid' }, input('Toplam bot sayısı', form.botCount, 1, 75, changeCount), ...form.channels.map((n, i) => h('div', { key: i }, input('Kanal ' + (i + 1) + ' bot sayısı', n, 0, form.reserveOne && form.reserveChannel === i + 1 ? 24 : 25, value => allocation(i, value)))), input('Kararlı ölçüm (dakika)', form.durationMinutes, 1, 10, value => change('durationMinutes', value)), h('label', null, 'Senaryo', h('select', { value: form.scenario, onChange: event => change('scenario', event.target.value) }, ...Object.entries(scenarios).map(([value, label]) => h('option', { key: value, value }, label))))),
        h('button', { type: 'button', disabled: !!busy || active || stopping, onClick: () => rebalance() }, 'Dengeli dağıt'),
        h('p', { className: 'lab-note', role: 'status' }, panelBudgetSecondsR12(form.botCount, form.durationMinutes) === null ? 'Bot sayısını ve süreyi kontrol et.' : form.botCount + ' bot · ' + form.durationMinutes + ' dakika kararlı ölçüm · giriş ve ısınma dahil test bütçesi ' + panelBudgetSecondsR12(form.botCount, form.durationMinutes) + ' sn. Test yetkisi bunun en az 60 sn ötesine uzanmalı.'),
        h('p', null, h('label', { className: 'lab-check' }, h('input', { type: 'checkbox', checked: form.reserveOne, onChange: event => change('reserveOne', event.target.checked) }), '1 yeri benim için boş bırak')),
        h('label', null, 'Bana yer ayrılacak kanal', h('select', { value: form.reserveChannel, disabled: !form.reserveOne, onChange: event => change('reserveChannel', Number(event.target.value)) }, ...[1, 2, 3].map(n => h('option', { key: n, value: n }, 'Kanal ' + n)))),
        h('p', null, h('label', { className: 'lab-check' }, h('input', { type: 'checkbox', disabled: true, checked: form.ramp.enabled, onChange: event => change('ramp', { ...form.ramp, enabled: event.target.checked }) }), 'Bot sayısını kademeli artır')),
        form.ramp.enabled && h('div', { className: 'lab-grid' }, input('Her adımda eklenecek bot', form.ramp.stepBots, 10, 10, value => change('ramp', { ...form.ramp, stepBots: value }), true), input('Artış aralığı (saniye)', form.ramp.everySeconds, 30, 30, value => change('ramp', { ...form.ramp, everySeconds: value }), true)),
        issue && h('p', { className: 'lab-error', role: 'status' }, issue), h('p', { className: 'lab-note' }, '10v10 PvP botları yalnız kendi test grubuyla savaşır. Başlangıçta sunucu kapasiteyi, yetki süresini ve güvenlik ölçümlerini tekrar doğrular.'), button('Testi başlat', 'start', { settings: form, expectedEpoch: agent?.epoch }, !!issue || !status?.enabled || !fresh || active || status?.clean === false || !Number.isSafeInteger(agent?.epoch))),
      h('button', { type: 'button', className: 'lab-stop', disabled: stopping, onClick: () => void emergencyStop() }, stopping ? 'DURDURMA GÖNDERİLİYOR…' : 'ACİL DURDUR'),
      h('p', { className: 'lab-note' }, 'Durdurma bot bağlantılarını kapatır. Test kayıtlarının temizliği tamamlanana kadar yeni test başlayamaz. Kanal ELU %90 veya loop delay 200 ms sınırını 10 saniyeden uzun aşarsa otomatik durdurma devrededir.'),
      error && h('p', { className: 'lab-error', role: 'alert' }, error), notice && h('p', { role: 'status' }, notice),
      h('section',{className:cleanupFailed492?'lab-banner lab-error':'lab-banner','aria-label':'Canlı test temizliği',role:cleanupFailed492?'alert':'status'},h('strong',null,!statusAvailable?'Canlı temizlik durumu doğrulanamadı.':status?.clean===true?'Canlı test kayıtları temiz.':cleanupFailed492?'Temizlik tamamlanamadı; yeni test engelli.':'Test kayıtları henüz temizlenmedi; yeni test engelli.'),status?.cleanupError&&h('p',null,'Hata: ',String(status.cleanupError)),cleanupMessages492.length>0&&h('p',null,'Son temizlik hataları: ',cleanupMessages492.join(' · ')),cleanupProgress492&&h('small',null,'Durum: ',String(cleanupProgress492.status??'bilinmiyor'),' · Deneme: ',number(cleanupProgress492.attempts,0))),
      h('h3', null, 'Canlı ölçüm'), h('p', null, states[metrics?.state] || 'Test VDS’inden veri bekleniyor', ' · ', fresh ? 'Güncel' : 'Veri güncel değil / bağlantı bekleniyor', ' · Son veri: ', stamp(metrics?.observedAt)),
      h('p', null, fresh ? 'Bağlı bot: ' : 'Son bildirilen bot sayısı (güncel değil): ', number(metrics?.bots?.connected, 0), ' · Hata: ', number(metrics?.bots?.errors, 0), ' · Kopma: ', number(metrics?.bots?.disconnects, 0)),
      ['pending', 'requires_attention', 'confirmed'].includes(metrics?.cleanup?.status) && h('p', { className: metrics.cleanup.status === 'requires_attention' ? 'lab-banner lab-error' : 'lab-banner', role: 'status' },
        metrics.cleanup.status === 'pending' ? 'Temizlik doğrulanıyor. Nihai rapor henüz hazır değil.' : metrics.cleanup.status === 'requires_attention' ? 'Temizlik doğrulanamadı. Nihai rapor bekletiliyor; ACİL DURDUR ile yeniden dene.' : metrics.cleanup.reportReady ? 'Temizlik doğrulandı. Nihai rapor hazır.' : 'Temizlik doğrulandı. Rapor hazırlanıyor.',
        ' · Deneme: ', number(metrics.cleanup.attempts, 0)),
      (metrics?.generator?.saturated || metrics?.invalidReasons?.length > 0) && h('p', { className: 'lab-error', role: 'alert' }, metrics?.generator?.saturated ? 'Üretici doymuş, sonuç geçersiz. ' : 'Ölçüm geçersiz. ', (metrics?.invalidReasons ?? []).join(' · ')),
      metrics?.stopReason && h('p', null, 'Durdurma nedeni: ', metrics.stopReason),
      h('section', { className: 'lab-banner', 'aria-label': 'Oyun sunucusu işlem süreleri', style: { margin: '18px 0', padding: '18px' } },
        h('h3', { style: { marginTop: 0 } }, 'Oyun sunucusu işlem süresi · test geneli'),
        h('div', { className: 'lab-grid' }, ...actionNames.map(([key, label]) => h('div', { key }, h('div', null, label + ' · p95'),
          h('strong', { style: { fontSize: 'clamp(24px,4vw,36px)', display: 'block', lineHeight: 1.3 } }, serverValue(key, 'p95'), ' ms'),
          h('div', null, 'p50 ', serverValue(key, 'p50'), ' ms · max ', serverValue(key, 'max'), ' ms'),
          h('small', null, number(serverMetric(key)?.count, 0), ' sunucu örneği / ', number(metrics?.actionTimingMs?.[key]?.acceptedReplies, 0), ' başarılı yanıt')))),
        h('p', { className: 'lab-note' }, 'Gerçek oyunculara da hizmet veren oyun sunucusu yolunda ölçülür. Ağ, test geçidi ve cihaz çizimi hariçtir; gerçek oyuncunun uçtan uca gecikme garantisi değildir. Bot izolasyonunun farklı kalan adımları raporda belirtilir.'),
        h('p', { className: 'lab-note' }, 'Test başından itibaren biriken p50/p95/max. Ölçülmeyen veya eski sürümde bulunmayan aşama — gösterilir; bot yanıt süresiyle doldurulmaz.')),
      h('h3', null, 'Bot uçtan uca yanıtı · test geneli'),
      table(['İşlem', 'p50 (ms)', 'p95 (ms)', 'En yüksek (ms)', 'Örnek'], actionNames.map(([key, label]) => { const row = metrics?.latencyMs?.[key]; return [label, row?.count > 0 ? number(row.p50, 3) : '—', row?.count > 0 ? number(row.p95, 3) : '—', row?.count > 0 ? number(row.max, 3) : '—', number(row?.count, 0)]; })),
      h('p', { className: 'lab-note' }, 'İki saniyede yenilenir; son iki saniyenin gecikmesi değildir. Bot, bağlantı ve test geçidi sürelerini içerir. p95 değerleri birbirinden çıkarılarak ağ süresi hesaplanmaz.'),
      h('details', null, h('summary', null, 'Saldırı, hareket ve dünya aşamalarını göster'), ...actionNames.map(([key, label]) => h('div', { key },
        h('h3', null, label), table(['Ölçülen aşama', 'p50 ms', 'p95 ms', 'max ms', 'Örnek'], Object.entries(metrics?.actionTimingMs?.[key]?.stages ?? {}).slice(0, 64).map(([stage, row]) => [stage, row?.count > 0 ? number(row.p50, 2) : '—', row?.count > 0 ? number(row.p95, 2) : '—', row?.count > 0 ? number(row.max, 2) : '—', number(row?.count, 0)])))),
        h('p', { className: 'lab-note' }, 'Aşamalar iç içe olabilir; toplanmaz. HTTP ile WebSocket yolları farklıdır. Saydam WebSocket test geçidinin istek başına süresi ayrıca ölçülmez; eksik ölçüm sıfır anlamına gelmez.')),
      table(['Kanal', 'Gerçek / bot', 'ELU', 'Loop delay (ms)', 'CPU', 'RAM (MiB)'], [1, 2, 3].map(id => { const row = metrics?.channels?.find(item => item.id === id); return [id, number(row?.humanPlayers, 0) + ' / ' + number(row?.botPlayers, 0), typeof row?.elu === 'number' ? percent(row.elu * 100) : '—', number(row?.loopDelayMs, 3), percent(row?.cpuPercent), typeof row?.ramBytes === 'number' ? number(row.ramBytes / 1048576) : '—']; })),
      h('p', null, 'Canlı VDS CPU: ', percent(metrics?.host?.cpuPercent), ' · Steal: ', percent(metrics?.host?.stealPercent), ' · Fsync aralık ortalaması / süreç boyunca en yüksek: ', number(metrics?.host?.fsyncIntervalMeanMs, 3), ' / ', number(metrics?.host?.fsyncLifetimeMaxMs, 3), ' ms'),
      h('p', { className: 'lab-note' }, 'Steal canlı VDS geneline, fsync ortak yazıcıya aittir; kanal başına bağımsız fsync veya fsync p95 ölçümü değildir.'),
      h('h3', null, 'Oyun ve test CPU toplamları'),
      h('div', { className: 'lab-grid' }, ...[['game-runtime', 'Oyun süreçleri'], ['isolated-test-overhead', 'Test geçidi · canlı VDS'], ['isolated-test-producer', 'Bot üreticisi · test VDS']].map(([scope, label]) => { const row = cpuGroups.find(v => v.scope === scope); return h('div', { key: scope, className: 'lab-banner' }, h('div', null, label), h('strong', { style: { fontSize: '24px', display: 'block' } }, row?.complete ? number(row.cores, 2) : '—', ' çekirdek'), h('small', null, row?.complete ? 'Son ölçülen aralık · ' + stamp(row.observedAt) : 'Tam toplam için süreç ölçümleri bekleniyor')); })),
      h('p', { className: 'lab-note' }, 'Bu üç toplam ayrıdır; host CPU ile toplanmaz. Oyun toplamına test geçidi veya ayrı VDS üreticisi eklenmez. Oyun süreçlerindeki bot savaş/izolasyon işi oyun toplamında kalır.'),
      h('h3', null, 'Süreç CPU dağılımı'),
      table(['Süreç / VDS', 'CPU · 1 çekirdek', 'CPU · VDS', 'RAM MiB', 'Durum / yeniden başlama'], (metrics?.processes ?? []).map(row => [row.label + ' / ' + (row.host === 'live' ? 'Canlı' : 'Test'), percent(row.cpuPercentOfOneCore), percent(row.cpuPercentOfHost), typeof row.ramBytes === 'number' ? number(row.ramBytes / 1048576) : '—', ({ready:'Güncel',warming:'İlk aralık bekleniyor',restarted:'Yeniden başladı',unavailable:'Ölçüm yok',duplicate:'PID çakışması'}[row.state] || 'Ölçüm yok') + ' / ' + number(row.restartsObserved, 0)])),
      h('p', {className:'lab-note'}, 'CPU 100% bir çekirdektir; VDS yüzdesi kullanılabilir çekirdeğe bölünür. Yeniden başlama sayacı gözlenen PID/başlangıç kimliği değişimidir; tek başına çökme kanıtı değildir. Rapor aktif test ve temizlik CPU zirvelerini ayrı zamanlarıyla verir. Üretici/panel/işçi threadleri tek süreçte bir kez sayılır. Eksik ölçümde CPU boş kalır. RSS toplamları ortak belleği tekrar sayabilir.'),
      h('p', null, 'Test VDS’i CPU: ', percent(metrics?.generator?.cpuPercent), ' · Bot zamanlama sapması p50 / p95 / en yüksek: ', number(metrics?.generator?.schedulingDriftMs?.p50, 3), ' / ', number(metrics?.generator?.schedulingDriftMs?.p95, 3), ' / ', number(metrics?.generator?.schedulingDriftMs?.max, 3), ' ms'),
      h('p', { className: 'lab-note' }, 'Veriler bu bölüm görünürken yaklaşık 2 saniyede yenilenir. Bölümden ayrılınca veya sekme gizlenince sorgulama durur.'),
      h('h3', null, 'İndirilebilir raporlar'), button('Rapor listesini yenile', 'reports', {}, !connected), !reports.length && h('p', null, 'Henüz rapor yok veya test VDS’i bağlı değil.'),
      ...reports.map(row => h('div', { key: row.id, className: 'lab-report' }, h('span', null, stamp(row.createdAt), ' · ', number(row.botCount, 0), ' bot · ', scenarios[row.scenario] || row.scenario || 'Test', ' · ', row.valid === true ? 'Geçerli' : 'Geçersiz / tamamlanmadı', row.cleanupConfirmed ? ' · Temizlik doğrulandı' : ' · Temizlik doğrulanmadı'), h('div', { className: 'lab-actions' }, ...['json', 'txt'].map(format => h('button', { key: format, type: 'button', disabled: !!download, onClick: () => void downloadReport(row.id, format) }, download === row.id + format ? 'Hazırlanıyor…' : format === 'json' ? 'JSON indir' : 'Özeti indir'))))),
      h('p', { className: 'lab-note' }, 'Rapor savaş, hasar, ödül hazırlığı ve SQL adımlarını; kalıcı ödül, görünürlük ve kayıt bakımından gerçek saldırıdan farklı kalan noktaları listeler. Canlı taban: V477 · ', base.slice(0, 16)));
  };
}

function createGuildResetAdmin470(React) {
  const h = React.createElement;
  const warning = 'Tüm loncalar kapatılacak. Satın alınmış şatolar, şato gelişimleri ve lonca kasaları silinecek. Bu işlem geri alınamaz. Loncaları sıfırlamak istiyor musun?';
  function GuildResetAdmin470({ busy, act }) {
    const [pending, setPending] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const request = React.useRef(null), inFlight = React.useRef(false), mounted = React.useRef(true), latest = React.useRef({ busy, act });
    latest.current = { busy, act };
    React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    async function resetGuilds470() {
      if (inFlight.current || latest.current.busy) return;
      if (!globalThis.confirm(warning)) return;
      inFlight.current = true; setPending(true); setError(''); setMessage('');
      try {
        if (!request.current) request.current = { requestId: globalThis.crypto.randomUUID() };
        const token = request.current;
        const result = await latest.current.act({ action: 'reset_guilds', requestId: token.requestId, confirmation: 'LONCALARI SIFIRLA' });
        const receipt = result?.guildReset;
        if (receipt?.ok === true && receipt.requestId === token.requestId) {
          request.current = null;
          if (mounted.current) setMessage(receipt.replayed ? 'Önceki lonca sıfırlama işlemi doğrulandı.' : 'Loncalar ve satın alınmış şatolar sıfırlandı.');
        } else if (mounted.current) setError('Sıfırlama sonucu doğrulanamadı. Tekrar denediğinde aynı işlem kontrol edilir. Yönetim bildirimini de kontrol et.');
      } catch (cause) {
        if (mounted.current) setError(cause?.message || 'Sıfırlama sonucu doğrulanamadı. Tekrar denediğinde aynı işlem kontrol edilir.');
      } finally {
        inFlight.current = false;
        if (mounted.current) setPending(false);
      }
    }
    return h('section', { className: 'admin-card danger-card', 'data-guild-reset470': '' },
      h('div', { className: 'admin-card-title' }, h('div', null, h('h2', null, 'Loncaları sıfırla'), h('p', null, 'Tüm loncaları kapatır; satın alınmış şatoları, şato gelişimlerini ve lonca kasalarını siler.'))),
      h('button', { type: 'button', disabled: !!busy || pending, onClick: resetGuilds470 }, pending ? 'Sıfırlanıyor…' : 'Loncaları sıfırla'),
      error && h('p', { role: 'alert' }, error), message && h('p', { role: 'status' }, message));
  }
  return GuildResetAdmin470;
}
const colSpecialistSkills459=(function createSpecialistSkills459(){
 const defaults={
  arkanist_burst:{multiplier:2.1,cooldownMs:18000},
  arkanist_heal:{healPercent:20,cooldownMs:24000},
  avci_sharp:{multiplier:2.2,cooldownMs:18000},
  avci_trap:{multiplier:1.5,rootMs:1800,cooldownMs:20000},
  muhafiz_tank:{healPercent:12,guardPercent:20,guardMs:6000,cooldownMs:24000},
  muhafiz_strike:{multiplier:2.2,cooldownMs:18000},
 };
 const bounds={multiplier:[.1,10],healPercent:[0,30],guardPercent:[0,75],guardMs:[0,30000],rootMs:[0,2000],cooldownMs:[1000,120000]};
 const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
 freeze(defaults);freeze(bounds);
 function defaultConfig(){return {revision:0,skills:Object.fromEntries(Object.entries(defaults).map(([id,values])=>[id,{...values}]))};}
 function validate(input){
  if(!plain(input)||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>=Number.MAX_SAFE_INTEGER||!plain(input.skills))throw Error('Uzmanlık becerisi ayarları veya sürümü geçersiz.');
  if(Object.keys(input).some(k=>!['revision','skills'].includes(k))||Object.keys(input.skills).some(id=>!Object.hasOwn(defaults,id)))throw Error('Bilinmeyen uzmanlık becerisi veya ayar alanı.');
  const skills={};
  for(const[id,fields]of Object.entries(defaults)){
   const row=input.skills[id];if(!plain(row)||Object.keys(row).some(k=>!Object.hasOwn(fields,k)))throw Error('Uzmanlık becerisi alanları geçersiz: '+id);
   skills[id]={};for(const key of Object.keys(fields)){const n=row[key],[min,max]=bounds[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key.endsWith('Ms')&&!Number.isSafeInteger(n)))throw Error(id+': '+key+' '+min+'–'+max+' arasında olmalı.');skills[id][key]=n;}
  }
  return {revision:input.revision,skills};
 }
 const cache=new Map();let parses=0;
 function record(raw){
  const key=typeof raw==='string'?raw:'';let hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
  let config;try{const value=key?JSON.parse(key):null;config=value?.specialistSkills459===undefined?defaultConfig():validate(value.specialistSkills459);}catch{config=defaultConfig();}
  parses++;hit={config:freeze(config),branches:new Map()};cache.set(key,hit);if(cache.size>8)cache.delete(cache.keys().next().value);return hit;
 }
 function read(raw){return record(raw).config;}
 function configure(branch,settings){
  if(!branch)return null;if(settings===undefined)return branch;
  const entry=record(typeof settings==='string'?settings:settings?.events_json),row=entry.config.skills[branch.id];if(!row)return branch;
  if(!entry.branches.has(branch.id))entry.branches.set(branch.id,freeze({...branch,
   ...(row.multiplier!==undefined?{multiplier:row.multiplier}:{}),
   ...(row.healPercent!==undefined?{heal:row.healPercent/100}:{}),
   ...(row.guardPercent!==undefined?{guard:row.guardPercent/100}:{}),
   ...(row.guardMs!==undefined?{guardMs:row.guardMs}:{}),
   ...(row.rootMs!==undefined?{rootMs:row.rootMs}:{}),cooldown:row.cooldownMs,
  }));return entry.branches.get(branch.id);
 }
 // Used only by tests/diagnostics, never sent in a world snapshot.
 return {defaults,bounds,defaultConfig,validate,read,configure,diagnostics:()=>({cacheSize:cache.size,parses})};
})();
const colEventsModel456=(()=>{const EVENT_KINDS = ['loot','xp','essence','chest','moonlight','fishing','halloween'];
const EVENT_LABELS = {loot:'Ganimet Bereketi',xp:'Tecrübe Bereketi',essence:'Öz Bereketi',chest:'Kristal Sandığı',moonlight:'Ayışığı Sandığı',fishing:'Balıkçılık Etkinliği',halloween:'Cadılar Bayramı'};
const CHEST_PRIZES = [
 {id:'pearl',label:'Beyaz İnci',weight:2}, {id:'potion',label:'Kırmızı İksir',weight:20},
 {id:'weapon',label:'Turuncu Silah',weight:1}, {id:'armor',label:'Turuncu Zırh',weight:1},
 {id:'essence5',label:'5 Öz',weight:20}, {id:'essence8',label:'8 Öz',weight:15},
 {id:'essence10',label:'10 Öz',weight:15}, {id:'essence15',label:'15 Öz',weight:10},
 {id:'essence20',label:'20 Öz',weight:6}, {id:'sokan',label:'Sokan Balığı',weight:10},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:0.1},
 {id:'red_pearl',label:'Kırmızı İnci',weight:0.1},
];
const MOONLIGHT_PRIZES = [
 {id:'essence20',label:'20 Yaşam Özü',weight:30},{id:'potions5',label:'5 Kırmızı İksir',weight:25},
 {id:'dust5',label:'5 Taş Tozu',weight:20},{id:'gems20',label:'20 Mücevher',weight:15},
 {id:'wing',label:'Kanat Parçası',weight:1},{id:'pearl',label:'Beyaz İnci',weight:2},
 {id:'dragon',label:'Ejderha Parçası',weight:.6},{id:'necklace',label:'Kırmızı Kolye · rastgele efsun',weight:1},
 {id:'attack_stone',label:'Saldırı Gücü Taşı',weight:1},{id:'evolution_scroll',label:'Evrim Parşömeni',weight:1},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:.05},
 {id:'red_pearl',label:'Kırmızı İnci',weight:.05},
];
const FISHING_EVENT_PRIZES = [
 {id:'enchant_scroll',label:'Efsun Değiştirme Nesnesi',weight:50,image:'/game/enchant-change.webp'},
 {id:'enchant_add',label:'Efsun Artırma Nesnesi',weight:30,image:'/game/enchant-add-v262.webp'},
 {id:'afk_ticket',label:'Oto Av Bileti · +2 saat',weight:15,image:'/game/afk-ticket-v350.webp'},
 {id:'auto_potion',label:'Oto Kırmızı İksir',weight:5,image:'/game/auto-red-potion.webp'},
];
function defaultEvents(){return {version:1,events:Object.fromEntries(EVENT_KINDS.map(kind=>[kind,{enabled:false,start:0,end:0,percent:kind==='chest'?2:kind==='moonlight'||kind==='fishing'||kind==='halloween'?1:20,runId:''}])),weights:Object.fromEntries(CHEST_PRIZES.map(p=>[p.id,p.weight])),moonlightWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),fishingWeights:Object.fromEntries(FISHING_EVENT_PRIZES.map(p=>[p.id,p.weight])),halloweenWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),halloweenWandChance:20,fishingRedPearlChance460:5,fishingCatchWeights482:defaultFishingCatch482(),specialistSkills459:colSpecialistSkills459.defaultConfig()};}
function validateEvents(input){
 if(!input||typeof input!=='object')throw new Error('Etkinlik ayarları geçersiz.');
 const config=defaultEvents();
 for(const kind of EVENT_KINDS){const e=(kind==='moonlight'||kind==='fishing'||kind==='halloween')&&!input.events?.[kind]?config.events[kind]:input.events?.[kind];if(!e||typeof e.enabled!=='boolean'||!Number.isFinite(e.percent)||e.percent<0||e.percent>(kind==='chest'||kind==='moonlight'||kind==='fishing'||kind==='halloween'?100:500)||!Number.isSafeInteger(e.start)||!Number.isSafeInteger(e.end)||e.start<0||e.end<0||e.end>4102444800||((e.enabled||e.start||e.end)&&!(e.start>0&&e.end>e.start)))throw new Error(`${EVENT_LABELS[kind]}: oranı ve başlangıç/bitiş saatini kontrol et.`);
 config.events[kind]={enabled:e.enabled,start:e.start,end:e.end,percent:e.percent,runId:typeof e.runId==='string'?e.runId.slice(0,80):''};config.events[kind].schedule499=colEventNormalize499(kind,e.schedule499,config.events[kind]);}
 for(const prize of CHEST_PRIZES){const w=input.weights?.[prize.id]??((prize.id==='fifth_enchant'||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Sandık ağırlıkları 0–100000 arasında olmalı.');config.weights[prize.id]=w;}
 if(Object.values(config.weights).reduce((a,b)=>a+b,0)<=0)throw new Error('Sandıkta en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.moonlightWeights?.[prize.id]??((input.moonlightWeights===undefined||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Ayışığı Sandığı ağırlıkları 0–100000 arasında olmalı.');config.moonlightWeights[prize.id]=w;}
 if(Object.values(config.moonlightWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Ayışığı Sandığında en az bir ödül açık olmalı.');
 for(const prize of FISHING_EVENT_PRIZES){const w=input.fishingWeights?.[prize.id]??(input.fishingWeights===undefined?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Balıkçılık ödül ağırlıkları 0–100000 arasında olmalı.');config.fishingWeights[prize.id]=w;}
 if(Object.values(config.fishingWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Balıkçılık etkinliğinde en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.halloweenWeights?.[prize.id]??(input.halloweenWeights===undefined?config.moonlightWeights[prize.id]:prize.id==='red_pearl'?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Bal Kabağı ağırlıkları 0–100000 arasında olmalı.');config.halloweenWeights[prize.id]=w;}
 if(Object.values(config.halloweenWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Bal Kabağında en az bir ödül açık olmalı.');
 const wand=input.halloweenWandChance??20;if(!Number.isFinite(wand)||wand<0||wand>100)throw new Error('Cadı değneği şansı 0–100 arasında olmalı.');config.halloweenWandChance=wand;const red=input.fishingRedPearlChance460??5;if(typeof red!=='number'||!Number.isFinite(red)||red<0||red>100||Math.abs(red*100-Math.round(red*100))>0.000001)throw new Error('Kırmızı inci şansı 0–100 arasında, en fazla iki ondalıklı olmalı.');config.fishingRedPearlChance460=red;config.fishingCatchWeights482=validateFishingCatch482(input.fishingCatchWeights482??defaultFishingCatch482());config.specialistSkills459=colSpecialistSkills459.validate(input.specialistSkills459??colSpecialistSkills459.defaultConfig());
 return config;
}
function parseEvents(raw){try{return validateEvents(typeof raw==='string'?JSON.parse(raw):raw);}catch{return defaultEvents();}}
// Read-only hot path (combat/fishing/chest rolls): the same events_json string is
// parsed and fully validated on every attack. Reuse the validated result while
// the exact string is unchanged. The returned object is frozen; callers that
// need a mutable copy (admin editing) must keep using parseEvents().
let cachedEventsRaw,cachedEventsConfig;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
function readEventsConfig(raw){
 if(typeof raw!=='string')return parseEvents(raw);
 if(raw!==cachedEventsRaw){cachedEventsConfig=deepFreeze(parseEvents(raw));cachedEventsRaw=raw;}
 return cachedEventsConfig;
}
function eventActive(event,now=Date.now()/1000){return !!event?.enabled&&now>=event.start&&now<event.end;}
function eventBonus(config,kind,now=Date.now()/1000){const e=config.events[kind];return eventActive(e,now)?e.percent:0;}
// Stochastic rounding preserves small rewards: +20% of 1 is really +20% on average.
function bonusAmount(amount,percent,random=Math.random){const value=Math.max(0,amount)*(1+Math.max(0,percent)/100),base=Math.floor(value);return base+(random()<value-base?1:0);}
function pickChestPrize(config,random=Math.random){const total=CHEST_PRIZES.reduce((n,p)=>n+config.weights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of CHEST_PRIZES){roll-=config.weights[p.id];if(roll<0)return p;}return CHEST_PRIZES.findLast(p=>config.weights[p.id]>0);}
function pickMoonlightPrize(config,random=Math.random){const total=MOONLIGHT_PRIZES.reduce((n,p)=>n+config.moonlightWeights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of MOONLIGHT_PRIZES){roll-=config.moonlightWeights[p.id];if(roll<0)return p;}return MOONLIGHT_PRIZES.findLast(p=>config.moonlightWeights[p.id]>0);}
function eventRemaining(seconds){const n=Math.max(0,Math.ceil(seconds));return `${Math.floor(n/86400)}g ${String(Math.floor(n/3600)%24).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}

// One extra reward per completed cast; fishing bait never multiplies this draw.
function rollFishingEventReward(config,now=Date.now()/1000,random=Math.random){
 const chance=eventBonus(config,'fishing',now);if(chance<=0||random()*100>=chance)return null;
 const total=FISHING_EVENT_PRIZES.reduce((sum,p)=>sum+config.fishingWeights[p.id],0);
 let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;
 for(const prize of FISHING_EVENT_PRIZES){roll-=config.fishingWeights[prize.id];if(roll<0)return prize;}
 return null;
}

function pickHalloweenPrize(config,random=Math.random){return pickMoonlightPrize({moonlightWeights:config.halloweenWeights},random);}

return {EVENT_KINDS,EVENT_LABELS,CHEST_PRIZES,MOONLIGHT_PRIZES,FISHING_EVENT_PRIZES,defaultEvents,validateEvents,parseEvents,readEventsConfig,eventActive,eventBonus,eventRemaining,pickHalloweenPrize};})();
const colHalloweenAdminFactory456=function createEventsAdmin456(React,model){
 const h=React.createElement,localDate=colEventDateInput499;
 function Panel({raw,busy,act,serverTime}){
  const [draft,setDraft]=React.useState(()=>model.parseEvents(raw)),[plans499,setPlans499]=React.useState({}),[modes,setModes]=React.useState({}),[durations,setDurations]=React.useState({}),[error,setError]=React.useState(''),[now,setNow]=React.useState(serverTime);
  React.useEffect(()=>setDraft(model.parseEvents(raw)),[raw]);
  React.useEffect(()=>{const start=performance.now();setNow(serverTime);const timer=setInterval(()=>setNow(serverTime+(performance.now()-start)/1000),1000);return()=>clearInterval(timer);},[serverTime]);
  const edit=(kind,key,value)=>(key==='start'||key==='end')?setPlans499(d=>({...d,[kind]:{...(d[kind]??{start:0,end:0}),[key]:value}})):setDraft(d=>({...d,events:{...d.events,[kind]:{...d.events[kind],[key]:value}}}));
  const numeric=(label,value,change,max=100000,step=.01)=>h('label',null,label,h('input',{type:'number',min:0,max,step,value:Number.isNaN(value)?'':value,onChange:e=>change(e.target.value===''?NaN:Number(e.target.value))}));
  const start=async kind=>{try{setError('');const e={...draft.events[kind],...(plans499[kind]??{start:0,end:0})},mode=modes[kind]??'schedule';let body;
   if(mode==='schedule'){if(!Number.isSafeInteger(e.start)||!Number.isSafeInteger(e.end)||e.start<=0||e.end<=e.start)throw Error('Başlangıç ve bitiş tarihini seç. Bitiş, başlangıçtan sonra olmalı.');body={action:'event_schedule',eventKind:kind,eventStart:e.start,eventEnd:e.end,percent:e.percent,expectedEvents:raw};}
   else{const duration=durations[kind]??{hours:1,minutes:0},seconds=(duration.hours*60+duration.minutes)*60;if(!Number.isSafeInteger(duration.hours)||!Number.isSafeInteger(duration.minutes)||duration.hours<0||duration.minutes<0||duration.minutes>59||!Number.isSafeInteger(seconds)||seconds<60||seconds>31536000)throw Error('Süre 1 dakika ile 365 gün arasında olmalı. Dakika alanına 0–59 yaz.');body={action:'event_start',eventKind:kind,percent:e.percent,durationSeconds:seconds,expectedEvents:raw};}await act(body);
  }catch(e){setError(e.message??'Etkinlik başlatılamadı.');}};
  const liveConfig499=model.parseEvents(raw);const cards=model.EVENT_KINDS.map(kind=>{const e={...draft.events[kind],...(plans499[kind]??{start:0,end:0})},live=colEventDisplay499(liveConfig499.events[kind],now),mode=modes[kind]??'schedule',duration=durations[kind]??{hours:1,minutes:0},isDrop=['chest','moonlight','halloween','fishing'].includes(kind);
   return h('article',{key:kind},h('h3',null,model.EVENT_LABELS[kind]),h('p',null,model.eventActive(live,now)?'Aktif · '+model.eventRemaining(live.end-now):live.enabled&&now<live.start?'Başlamasına '+model.eventRemaining(live.start-now):'Kapalı / sona erdi'),numeric(kind==='halloween'?'Bal Kabağı düşme şansı (%)':kind==='fishing'?'Av başına ek ödül şansı (%)':isDrop?'Sandık düşme şansı (%)':'Ek kazanç (%)',e.percent,n=>edit(kind,'percent',n),isDrop?100:500,.1),h('label',null,'Başlatma şekli',h('select',{value:mode,onChange:e=>setModes(d=>({...d,[kind]:e.target.value}))},h('option',{value:'schedule'},'Seçtiğim tarihte başlat'),h('option',{value:'now'},'Hemen başlat — süre belirle'))),mode==='schedule'?h(React.Fragment,null,h('label',null,'Başlangıç',h('input',{type:'datetime-local',value:localDate(e.start),onChange:v=>edit(kind,'start',colEventDateParse499(v.target.value))})),h('label',null,'Bitiş',h('input',{type:'datetime-local',value:localDate(e.end),onChange:v=>edit(kind,'end',colEventDateParse499(v.target.value))}))):h('div',{className:'event-duration-fields'},numeric('Saat',duration.hours,n=>setDurations(d=>({...d,[kind]:{...duration,hours:n}})),8760,1),numeric('Dakika',duration.minutes,n=>setDurations(d=>({...d,[kind]:{...duration,minutes:n}})),59,1)),h('div',{className:'event-admin-actions'},h('button',{disabled:busy,onClick:()=>void start(kind)},mode==='schedule'?'Takvime ekle':'Belirlediğim süreyle şimdi başlat'),h('button',{disabled:busy,onClick:()=>void act({action:'event_stop',eventKind:kind,expectedEvents:raw})},'Durdur')));
  });
  const weights=(title,list,key,description,fishing=false)=>{const total=Object.values(draft[key]).reduce((a,b)=>a+b,0);return h(React.Fragment,{key},h('h3',null,title),h('p',null,description),h('div',{className:'event-prize-grid'},...list.map(p=>h('label',{key:p.id},p.label,h('input',{type:'number',min:0,max:100000,step:.01,value:draft[key][p.id],onChange:e=>setDraft(d=>({...d,[key]:{...d[key],[p.id]:Number(e.target.value)}}))}),h('small',null,(fishing?'Av başına %':'%')+(total>0?draft[key][p.id]/total*(fishing?draft.events.fishing.percent:100):0).toFixed(3))))));};
  return h('section',{className:'admin-card events-admin'},h('h2',null,'Etkinlikler'),h('p',null,'Birden fazla etkinliği önceden planlayabilirsin. Başlangıç ve bitiş otomatik uygulanır; panelin açık kalması gerekmez. Tarihler Türkiye saatindedir (UTC+3).'),error&&h('p',{role:'alert'},error),h('div',{className:'event-admin-grid'},...cards),colEventAdminRows499(React,liveConfig499,now,model.EVENT_LABELS,busy,act,raw,setError),h('p',null,'Takvime ekle yalnız seçilen yeni planı kaydeder; mevcut etkinlikler korunur. İçerik oranlarını değiştirdikten sonra aşağıdaki kaydet düğmesine bas. Planların oranları eklendikleri haliyle korunur.'),weights('Balıkçılık Etkinliği · Ödül oranları',model.FISHING_EVENT_PRIZES,'fishingWeights','Başarılı her av, normal ödüle ek olarak en fazla bir etkinlik ödülü verir. Bereketli yem bunu çoğaltmaz.',true),weights('Kristal Sandığı · İçerik oranları',model.CHEST_PRIZES,'weights','Her sandıktan bir ödül çıkar. Ağırlık 0 ödülü kapatır. Sandıklar etkinlik bittikten sonra da açılır.'),weights('Ayışığı Sandığı · İçerik oranları',model.MOONLIGHT_PRIZES,'moonlightWeights','Her sandıktan bir ödül çıkar. Kanat ve Ejderha parçaları mevcut malzemelerle birleşir.'),weights('Cadılar Bayramı · Bal Kabağı içeriği',model.MOONLIGHT_PRIZES,'halloweenWeights','İlk içerik Ayışığı Sandığından alınır; buradaki değişiklikler Ayışığını değiştirmez. Her Bal Kabağından bir ödül ve ayrıca aşağıdaki şansla Cadının Sihirli Değneği çıkar.'),numeric('Ek Cadı değneği şansı (%)',draft.halloweenWandChance,n=>setDraft(d=>({...d,halloweenWandChance:n})),100,.1),h('p',null,'50 Cadı değneği → 1 Cadı Şekeri. Şeker 3 saat %25 tecrübe verir. Cadı yalnız etkinlik açıkken Pazar Köyüne gelir; kazanılmış eşyalar etkinlik sonunda kaybolmaz.'),h('button',{disabled:busy,onClick:()=>void act({action:'save_events',events:draft,expectedEvents:raw})},'Ödül oranlarını kaydet'));
 }
 return {Panel};
};let colHalloweenAdmin456;
var colAffixValues454 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // lib/enchantment-tiers.mjs
  var enchantment_tiers_exports = {};
  __export(enchantment_tiers_exports, {
    ENCHANT_TIERS: () => ENCHANT_TIERS,
    ENCHANT_TIER_DEFAULTS: () => ENCHANT_TIER_DEFAULTS,
    ENCHANT_TIER_KEYS: () => ENCHANT_TIER_KEYS,
    TIER_SUFFIXES: () => TIER_SUFFIXES,
    enchantTierValues: () => enchantTierValues,
    rollEnchantmentValue: () => rollEnchantmentValue,
    tierKeys: () => tierKeys,
    validateEnchantmentTiers: () => validateEnchantmentTiers
  });
  var ENCHANT_TIERS = [
    ["forest_power", "Kuzey Orman\u0131 g\xFCc\xFC", [2, 4, 8, 10], 10],
    ["frozen_power", "Donmu\u015F \xC7am g\xFCc\xFC", [2, 4, 8, 10], 10],
    ["fire", "Ate\u015F", [2, 4, 8, 10], 80],
    ["ice", "Buz", [2, 4, 8, 10], 80],
    ["sword_defense", "K\u0131l\u0131\xE7 savunmas\u0131", [2, 4, 9, 12], 80],
    ["arrow_defense", "Ok savunmas\u0131", [2, 4, 9, 12], 80],
    ["magic_defense", "B\xFCy\xFC savunmas\u0131", [2, 4, 9, 12], 80],
    ["strong_players", "Oyunculara kar\u015F\u0131 g\xFC\xE7", [2, 4, 8, 10], 80],
    ["resistant_players", "Oyunculara kar\u015F\u0131 savunma", [2, 4, 9, 12], 80],
    ["critical", "Kritik \u015Fans\u0131", [1, 2, 4, 6], 80],
    ["attack_speed", "Sald\u0131r\u0131 h\u0131z\u0131", [2, 4, 8, 10], 80],
    ["cast_speed", "B\xFCy\xFC H\u0131z\u0131", [4, 8, 16, 20], 50],
    ["life_steal", "Can \xE7alma", [3, 6, 12, 15], 15],
    ["attack_block", "Sald\u0131r\u0131 bloklama", [3, 6, 12, 15], 15],
    ["hp", "Azami can", [60, 120, 240, 300], 1e6]
  ];
  var TIER_SUFFIXES = ["one", "two", "four", "five"];
  var tierKeys = (kind) => TIER_SUFFIXES.map((suffix) => `enchant_${kind}_tier_${suffix}`);
  var ENCHANT_TIER_DEFAULTS = Object.fromEntries(ENCHANT_TIERS.flatMap(([kind, , values]) => tierKeys(kind).map((key, i) => [key, values[i]])));
  var ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
  function enchantTierValues(settings, kind) {
    const definition = ENCHANT_TIERS.find((d) => d[0] === kind);
    if (!definition) throw new Error("Ge\xE7ersiz efsun t\xFCr\xFC.");
    const valid = (value) => Number.isSafeInteger(value) && value >= 1 && value <= definition[3];
    const keys = tierKeys(kind), legacyKey = `enchant_${kind}_tier_three`;
    if (settings?.[keys[2]] == null && settings?.[keys[3]] == null && settings?.[legacyKey] != null) {
      const oldMax = Number(settings[legacyKey]);
      const top = valid(oldMax) ? oldMax : definition[2][3];
      const oldMin = Number(settings[keys[0]] ?? Math.min(definition[2][0], top));
      const low = valid(oldMin) && oldMin <= top ? oldMin : Math.min(definition[2][0], top);
      return Array.from({ length: 4 }, (_, i) => low + Math.floor((top - low) * i / 3));
    }
    return keys.map((key, i) => {
      const value = Number(settings?.[key] ?? definition[2][i]);
      return valid(value) ? value : definition[2][i];
    });
  }
  function rollEnchantmentValue(settings, kind, random = Math.random) {
    const roll = Number(random());
    return enchantTierValues(settings, kind)[Number.isFinite(roll) ? Math.min(3, Math.max(0, Math.floor(roll * 4))) : 0];
  }
  function validateEnchantmentTiers(input, current) {
    const result = {};
    for (const [kind, label, , max] of ENCHANT_TIERS) {
      const keys = tierKeys(kind);
      if (!keys.some((key) => Object.hasOwn(input, key))) continue;
      const previous = enchantTierValues(current, kind);
      const values = keys.map((key, i) => Object.hasOwn(input, key) ? Number(input[key]) : previous[i]);
      const legacyUnchanged = previous[3] - previous[0] < 3 && previous.every((value, i) => value === values[i] && (!i || previous[i - 1] <= value));
      if (values.some((v) => !Number.isSafeInteger(v) || v < 1 || v > max) || !legacyUnchanged && !values.every((value, i) => !i || values[i - 1] < value))
        throw new Error(`${label}: d\xF6rt farkl\u0131 tam say\u0131 k\xFC\xE7\xFCkten b\xFCy\xFC\u011Fe, 1\u2013${max} aras\u0131nda olmal\u0131; 4. kademe en y\xFCksek de\u011Ferdir.`);
      keys.forEach((key, i) => {
        result[key] = values[i];
      });
    }
    return result;
  }
  return __toCommonJS(enchantment_tiers_exports);
})();

function colAffixAdminFieldValue454(settings,key){const match=/^enchant_([a-z_]+)_tier_(one|two|four|five)$/.exec(key);if(!match)return settings?.[key]??'';const keys=colAffixValues454.tierKeys(match[1]),legacy=settings?.[keys[2]]==null&&settings?.[keys[3]]==null&&settings?.['enchant_'+match[1]+'_tier_three']!=null;if(!legacy&&settings?.[key]!=null)return settings[key];return colAffixValues454.enchantTierValues(settings,match[1])[keys.indexOf(key)];}
var colSeasonalEditorModule453 = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // seasonal-editor453.tsx
  var seasonal_editor453_exports = {};
  __export(seasonal_editor453_exports, {
    createSeasonalEditor453: () => createSeasonalEditor453
  });

  // lib/seasonal-layouts.mjs
  var winter = {
    bazaar: { props: [[1, 0.26, 0.26, 250], [0, 0.22, 0.32, 120], [3, 0.83, 0.37, 160], [2, 0.13, 0.48, 165], [2, 0.88, 0.61, 165], [4, 0.39, 0.135, 75, true], [4, 0.81, 0.18, 85, true], [5, 0.74, 0.79, 180], [0, 0.29, 0.78, 100]], lights: [[0.15, 0.18, 0.3, 0.13, 0.025], [0.36, 0.09, 0.59, 0.09, 0.035], [0.79, 0.14, 0.94, 0.27, 0.045], [0.09, 0.63, 0.15, 0.8, 0.025], [0.69, 0.91, 0.85, 0.83, 0.025]] },
    forest: { props: [[1, 0.37, 0.32, 270], [0, 0.35, 0.35, 130], [2, 0.19, 0.52, 185], [5, 0.65, 0.59, 190], [1, 0.73, 0.31, 230], [4, 0.22, 0.19, 100, true], [4, 0.62, 0.29, 115, true], [2, 0.39, 0.74, 185], [1, 0.62, 0.84, 245], [0, 0.65, 0.85, 125], [2, 0.82, 0.68, 180]], lights: [[0.26, 0.14, 0.37, 0.17, 0.025], [0.31, 0.37, 0.39, 0.34, 0.02], [0.61, 0.19, 0.68, 0.23, 0.025], [0.65, 0.62, 0.74, 0.64, 0.025], [0.38, 0.81, 0.46, 0.85, 0.02]] },
    frozen: { props: [[5, 0.34, 0.33, 245], [1, 0.57, 0.29, 280], [0, 0.59, 0.32, 135], [2, 0.32, 0.63, 190], [1, 0.68, 0.66, 290], [4, 0.55, 0.19, 120, true], [5, 0.81, 0.56, 230], [0, 0.19, 0.45, 130], [2, 0.42, 0.85, 200], [1, 0.24, 0.78, 240]], lights: [[0.12, 0.38, 0.23, 0.39, 0.018], [0.43, 0.14, 0.5, 0.14, 0.025], [0.53, 0.3, 0.59, 0.32, 0.02], [0.73, 0.6, 0.79, 0.64, 0.024], [0.33, 0.76, 0.39, 0.8, 0.02]] },
    black: { props: [[2, 0.16, 0.21, 200], [4, 0.47, 0.1, 120, true], [0, 0.22, 0.72, 155], [3, 0.83, 0.65, 200], [2, 0.8, 0.2, 200], [1, 0.34, 0.87, 235], [5, 0.69, 0.82, 230], [4, 0.89, 0.49, 100, true]], lights: [[0.09, 0.16, 0.21, 0.13, 0.026], [0.44, 0.065, 0.56, 0.065, 0.027], [0.79, 0.15, 0.91, 0.24, 0.02], [0.79, 0.77, 0.87, 0.71, 0.02]] },
    fishing: { props: [[1, 0.24, 0.22, 160], [0, 0.19, 0.26, 85], [2, 0.1, 0.51, 150], [2, 0.9, 0.56, 150], [5, 0.3, 0.87, 150], [4, 0.77, 0.18, 85, true], [0, 0.71, 0.88, 85]], lights: [[0.1, 0.38, 0.15, 0.29, 0.018], [0.82, 0.29, 0.9, 0.4, 0.02], [0.29, 0.9, 0.39, 0.94, 0.015]] },
    sanctum: { props: [[1, 0.33, 0.25, 170], [5, 0.67, 0.27, 150], [2, 0.24, 0.49, 155], [2, 0.77, 0.51, 155], [4, 0.45, 0.15, 65, true], [4, 0.57, 0.16, 65, true], [0, 0.33, 0.68, 85], [0, 0.67, 0.67, 85]], lights: [[0.31, 0.25, 0.38, 0.19, 0.012], [0.62, 0.19, 0.7, 0.25, 0.012], [0.3, 0.66, 0.35, 0.71, 0.01]] },
    sinsi: { props: [[1, 0.29, 0.23, 165], [0, 0.31, 0.26, 85], [5, 0.7, 0.24, 155], [2, 0.22, 0.49, 130], [2, 0.76, 0.51, 130], [1, 0.31, 0.81, 175], [0, 0.65, 0.82, 85], [4, 0.5, 0.4, 70, true]], lights: [[0.24, 0.21, 0.33, 0.2, 0.018], [0.7, 0.35, 0.74, 0.41, 0.018], [0.26, 0.72, 0.34, 0.73, 0.014]] },
    war: { props: [[1, 0.25, 0.2, 250], [0, 0.23, 0.24, 125], [2, 0.13, 0.49, 190], [2, 0.88, 0.52, 190], [5, 0.75, 0.79, 195], [1, 0.28, 0.8, 230]], lights: [[0.23, 0.18, 0.34, 0.14, 0.022], [0.66, 0.14, 0.77, 0.18, 0.022]] },
    arena: { props: [[2, 0.17, 0.24, 165], [2, 0.83, 0.24, 165], [1, 0.15, 0.8, 190], [5, 0.85, 0.8, 170], [0, 0.17, 0.84, 85], [4, 0.5, 0.12, 75, true]], lights: [[0.3, 0.14, 0.42, 0.11, 0.02], [0.58, 0.11, 0.7, 0.14, 0.02]] }
  ,"ancient":{"props":[[1,0.16,0.2,185],[2,0.65,0.2,175],[5,0.83,0.4,180],[2,0.2,0.57,180],[1,0.48,0.78,170],[0,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[1,0.25,0.22,170],[2,0.59,0.15,175],[5,0.82,0.31,165],[2,0.23,0.5,160],[1,0.76,0.69,170],[0,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[1,0.27,0.22,185],[2,0.72,0.23,185],[5,0.16,0.47,175],[2,0.84,0.47,175],[1,0.32,0.66,180],[0,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[1,0.27,0.2,175],[2,0.61,0.17,165],[5,0.82,0.29,170],[2,0.83,0.64,175],[1,0.33,0.76,170],[0,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[1,0.39,0.24,185],[2,0.66,0.28,180],[5,0.32,0.43,175],[2,0.66,0.58,180],[1,0.35,0.7,175],[0,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
  var harvest = {
    bazaar: { props: [[5, 0.17, 0.4, 160], [0, 0.19, 0.43, 90], [1, 0.3, 0.31, 180], [4, 0.8, 0.28, 180], [3, 0.83, 0.71, 125], [0, 0.73, 0.83, 90], [2, 0.14, 0.73, 160], [0, 0.39, 0.16, 85], [0, 0.61, 0.15, 75]], lights: [[0.35, 0.12, 0.54, 0.12, 0.035], [0.8, 0.2, 0.91, 0.29, 0.035]] },
    forest: { props: [[1, 0.34, 0.34, 255], [0, 0.32, 0.37, 115], [2, 0.62, 0.31, 220], [4, 0.22, 0.22, 225], [3, 0.23, 0.59, 145], [0, 0.65, 0.64, 125], [2, 0.79, 0.45, 220], [1, 0.41, 0.79, 225], [5, 0.7, 0.81, 230], [0, 0.73, 0.82, 110]], lights: [[0.27, 0.14, 0.37, 0.19, 0.03], [0.6, 0.25, 0.68, 0.26, 0.026], [0.63, 0.72, 0.72, 0.76, 0.025]] },
    frozen: { props: [[2, 0.36, 0.35, 220], [0, 0.38, 0.38, 115], [1, 0.59, 0.36, 245], [4, 0.22, 0.51, 225], [3, 0.64, 0.71, 160], [2, 0.81, 0.55, 225], [0, 0.41, 0.85, 125], [5, 0.23, 0.77, 210]], lights: [[0.25, 0.16, 0.34, 0.18, 0.025], [0.59, 0.64, 0.67, 0.67, 0.025]] },
    black: { props: [[2, 0.16, 0.27, 235], [1, 0.82, 0.32, 240], [5, 0.24, 0.73, 225], [0, 0.27, 0.75, 125], [3, 0.77, 0.77, 165], [4, 0.36, 0.15, 230], [2, 0.66, 0.87, 235], [0, 0.88, 0.49, 120]], lights: [[0.43, 0.08, 0.56, 0.08, 0.022], [0.77, 0.77, 0.85, 0.71, 0.026]] },
    fishing: { props: [[4, 0.24, 0.27, 170], [0, 0.21, 0.3, 80], [3, 0.11, 0.6, 110], [1, 0.88, 0.61, 180], [0, 0.3, 0.84, 80], [5, 0.72, 0.86, 125]], lights: [[0.11, 0.4, 0.17, 0.3, 0.024], [0.83, 0.38, 0.9, 0.47, 0.02]] },
    sanctum: { props: [[2, 0.32, 0.28, 180], [2, 0.69, 0.29, 180], [0, 0.37, 0.21, 75], [0, 0.63, 0.2, 75], [3, 0.25, 0.52, 110], [3, 0.75, 0.51, 110], [4, 0.34, 0.72, 160]], lights: [[0.29, 0.32, 0.36, 0.23, 0.02], [0.64, 0.23, 0.72, 0.33, 0.02]] },
    sinsi: { props: [[1, 0.3, 0.27, 175], [0, 0.33, 0.28, 75], [2, 0.7, 0.24, 150], [3, 0.24, 0.53, 100], [4, 0.58, 0.46, 150], [5, 0.34, 0.82, 150], [0, 0.67, 0.81, 80]], lights: [[0.19, 0.42, 0.25, 0.48, 0.022], [0.6, 0.73, 0.69, 0.71, 0.02]] },
    war: { props: [[1, 0.27, 0.22, 235], [1, 0.75, 0.24, 225], [0, 0.24, 0.26, 105], [3, 0.13, 0.58, 140], [2, 0.86, 0.62, 205], [5, 0.69, 0.84, 205]], lights: [[0.2, 0.26, 0.27, 0.19, 0.025], [0.71, 0.17, 0.81, 0.23, 0.025]] },
    arena: { props: [[2, 0.16, 0.25, 165], [2, 0.84, 0.25, 165], [0, 0.19, 0.82, 90], [0, 0.81, 0.82, 90], [1, 0.27, 0.16, 170], [1, 0.73, 0.16, 170]], lights: [[0.33, 0.13, 0.45, 0.11, 0.02], [0.55, 0.11, 0.67, 0.13, 0.02]] }
  ,"ancient":{"props":[[1,0.16,0.2,185],[2,0.65,0.2,175],[4,0.83,0.4,180],[3,0.2,0.57,180],[5,0.48,0.78,170],[0,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[1,0.25,0.22,170],[2,0.59,0.15,175],[4,0.82,0.31,165],[3,0.23,0.5,160],[5,0.76,0.69,170],[0,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[1,0.27,0.22,185],[2,0.72,0.23,185],[4,0.16,0.47,175],[3,0.84,0.47,175],[5,0.32,0.66,180],[0,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[1,0.27,0.2,175],[2,0.61,0.17,165],[4,0.82,0.29,170],[3,0.83,0.64,175],[5,0.33,0.76,170],[0,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[1,0.39,0.24,185],[2,0.66,0.28,180],[4,0.32,0.43,175],[3,0.66,0.58,180],[5,0.35,0.7,175],[0,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
  var ramadan = {
    bazaar: { props: [[1, 0.28, 0.28, 230], [5, 0.8, 0.32, 185], [3, 0.2, 0.46, 100], [2, 0.17, 0.44, 80], [0, 0.15, 0.66, 175], [0, 0.86, 0.65, 175], [3, 0.77, 0.79, 100], [4, 0.4, 0.13, 115, true], [4, 0.82, 0.19, 105, true], [0, 0.64, 0.86, 165]], lights: [[0.18, 0.19, 0.3, 0.15, 0.035], [0.37, 0.09, 0.57, 0.1, 0.035], [0.79, 0.19, 0.92, 0.3, 0.038], [0.14, 0.67, 0.22, 0.79, 0.025]] },
    forest: { props: [[0, 0.36, 0.33, 230], [1, 0.2, 0.58, 225], [4, 0.28, 0.21, 155, true], [0, 0.64, 0.34, 225], [4, 0.65, 0.29, 140, true], [0, 0.77, 0.62, 220], [2, 0.39, 0.78, 100], [0, 0.41, 0.79, 220], [1, 0.66, 0.83, 205]], lights: [[0.31, 0.37, 0.39, 0.33, 0.025], [0.62, 0.62, 0.72, 0.63, 0.026], [0.38, 0.81, 0.46, 0.85, 0.025]] },
    frozen: { props: [[0, 0.35, 0.33, 235], [1, 0.59, 0.32, 225], [0, 0.23, 0.58, 220], [4, 0.52, 0.18, 145, true], [0, 0.66, 0.68, 235], [4, 0.75, 0.56, 140, true], [1, 0.27, 0.8, 210], [2, 0.4, 0.86, 95]], lights: [[0.24, 0.18, 0.34, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025]] },
    black: { props: [[5, 0.24, 0.23, 235], [3, 0.26, 0.29, 140], [2, 0.22, 0.29, 105], [1, 0.65, 0.15, 260], [0, 0.16, 0.65, 245], [0, 0.82, 0.68, 245], [4, 0.48, 0.1, 185, true], [1, 0.32, 0.85, 235], [4, 0.83, 0.27, 150, true]], lights: [[0.12, 0.17, 0.24, 0.14, 0.026], [0.45, 0.075, 0.56, 0.075, 0.024], [0.79, 0.17, 0.9, 0.25, 0.027], [0.73, 0.81, 0.84, 0.74, 0.025]] },
    fishing: { props: [[0, 0.23, 0.24, 170], [4, 0.28, 0.18, 100, true], [3, 0.13, 0.57, 85], [0, 0.88, 0.58, 160], [1, 0.72, 0.85, 165], [2, 0.29, 0.85, 70], [0, 0.34, 0.91, 150]], lights: [[0.12, 0.39, 0.17, 0.29, 0.024], [0.82, 0.28, 0.89, 0.39, 0.024], [0.63, 0.91, 0.72, 0.87, 0.018]] },
    sanctum: { props: [[1, 0.34, 0.25, 175], [1, 0.66, 0.25, 175], [0, 0.24, 0.48, 165], [0, 0.76, 0.48, 165], [4, 0.48, 0.15, 110, true], [0, 0.35, 0.72, 150], [0, 0.65, 0.72, 150]], lights: [[0.31, 0.26, 0.38, 0.19, 0.018], [0.62, 0.19, 0.7, 0.25, 0.018]] },
    sinsi: { props: [[1, 0.29, 0.26, 180], [4, 0.33, 0.2, 100, true], [0, 0.7, 0.24, 160], [0, 0.23, 0.5, 150], [0, 0.75, 0.53, 150], [3, 0.34, 0.8, 85], [2, 0.36, 0.83, 70], [1, 0.66, 0.79, 165]], lights: [[0.25, 0.21, 0.35, 0.19, 0.024], [0.59, 0.42, 0.67, 0.37, 0.022], [0.27, 0.72, 0.35, 0.74, 0.02]] },
    war: { props: [[1, 0.28, 0.23, 230], [1, 0.73, 0.22, 230], [0, 0.12, 0.53, 220], [0, 0.88, 0.53, 220], [0, 0.32, 0.82, 205], [0, 0.69, 0.82, 205]], lights: [[0.22, 0.2, 0.33, 0.14, 0.025], [0.67, 0.14, 0.78, 0.2, 0.025]] },
    arena: { props: [[0, 0.16, 0.27, 180], [0, 0.84, 0.27, 180], [1, 0.28, 0.16, 185], [1, 0.72, 0.16, 185], [0, 0.16, 0.82, 170], [0, 0.84, 0.82, 170]], lights: [[0.34, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.66, 0.13, 0.018]] }
  ,"ancient":{"props":[[0,0.16,0.2,185],[1,0.65,0.2,175],[0,0.83,0.4,180],[1,0.2,0.57,180],[0,0.48,0.78,170],[2,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[0,0.25,0.22,170],[1,0.59,0.15,175],[0,0.82,0.31,165],[1,0.23,0.5,160],[0,0.76,0.69,170],[2,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[0,0.27,0.22,185],[1,0.72,0.23,185],[0,0.16,0.47,175],[1,0.84,0.47,175],[0,0.32,0.66,180],[2,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[0,0.27,0.2,175],[1,0.61,0.17,165],[0,0.82,0.29,170],[1,0.83,0.64,175],[0,0.33,0.76,170],[2,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[0,0.39,0.24,185],[1,0.66,0.28,180],[0,0.32,0.43,175],[1,0.66,0.58,180],[0,0.35,0.7,175],[2,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
  var firstLight = {
    bazaar: { props: [[0, 0.28, 0.27, 260], [2, 0.24, 0.32, 85], [1, 0.35, 0.29, 185], [3, 0.7, 0.28, 235], [5, 0.72, 0.78, 160], [2, 0.75, 0.83, 85], [1, 0.15, 0.65, 190], [1, 0.85, 0.65, 190], [4, 0.42, 0.14, 115, true], [4, 0.8, 0.18, 105, true], [5, 0.27, 0.78, 145]], lights: [[0.15, 0.19, 0.3, 0.13, 0.027], [0.36, 0.09, 0.6, 0.09, 0.03], [0.78, 0.15, 0.92, 0.26, 0.026], [0.67, 0.91, 0.82, 0.85, 0.025]] },
    forest: { props: [[0, 0.35, 0.35, 290], [2, 0.33, 0.38, 100], [1, 0.63, 0.34, 250], [5, 0.66, 0.61, 215], [4, 0.26, 0.2, 160, true], [3, 0.71, 0.81, 290], [1, 0.39, 0.76, 240], [2, 0.22, 0.59, 105], [5, 0.78, 0.45, 190], [4, 0.65, 0.27, 150, true]], lights: [[0.28, 0.15, 0.38, 0.19, 0.024], [0.61, 0.25, 0.69, 0.27, 0.025], [0.65, 0.72, 0.72, 0.77, 0.024]] },
    frozen: { props: [[0, 0.35, 0.34, 290], [5, 0.6, 0.32, 200], [1, 0.27, 0.59, 255], [4, 0.54, 0.19, 155, true], [3, 0.68, 0.7, 285], [2, 0.65, 0.74, 100], [1, 0.82, 0.58, 255], [5, 0.27, 0.81, 200], [2, 0.43, 0.85, 100]], lights: [[0.25, 0.18, 0.35, 0.16, 0.025], [0.64, 0.64, 0.73, 0.68, 0.025], [0.4, 0.79, 0.45, 0.82, 0.018]] },
    black: { props: [[3, 0.28, 0.22, 310], [1, 0.19, 0.31, 270], [0, 0.65, 0.16, 310], [2, 0.62, 0.2, 115], [5, 0.22, 0.73, 220], [1, 0.82, 0.66, 270], [4, 0.48, 0.1, 185, true], [5, 0.68, 0.84, 215], [2, 0.87, 0.51, 110]], lights: [[0.12, 0.17, 0.25, 0.14, 0.027], [0.44, 0.07, 0.56, 0.07, 0.025], [0.79, 0.17, 0.9, 0.25, 0.025]] },
    fishing: { props: [[5, 0.25, 0.26, 160], [1, 0.11, 0.51, 175], [2, 0.12, 0.59, 80], [0, 0.72, 0.84, 205], [4, 0.76, 0.19, 105, true], [1, 0.89, 0.56, 175], [2, 0.31, 0.87, 80]], lights: [[0.13, 0.39, 0.18, 0.29, 0.02], [0.81, 0.29, 0.89, 0.4, 0.02], [0.63, 0.92, 0.73, 0.87, 0.02]] },
    sanctum: { props: [[0, 0.33, 0.27, 210], [0, 0.67, 0.27, 210], [1, 0.23, 0.48, 180], [1, 0.77, 0.48, 180], [5, 0.34, 0.7, 140], [5, 0.66, 0.7, 140], [4, 0.5, 0.15, 115, true], [2, 0.39, 0.21, 70], [2, 0.62, 0.21, 70]], lights: [[0.3, 0.28, 0.38, 0.19, 0.018], [0.62, 0.19, 0.71, 0.28, 0.018]] },
    sinsi: { props: [[0, 0.29, 0.26, 200], [5, 0.7, 0.25, 145], [1, 0.22, 0.5, 175], [1, 0.76, 0.52, 175], [4, 0.49, 0.41, 110, true], [3, 0.33, 0.82, 195], [2, 0.65, 0.83, 80]], lights: [[0.24, 0.21, 0.34, 0.19, 0.02], [0.61, 0.43, 0.68, 0.37, 0.02], [0.29, 0.74, 0.37, 0.77, 0.02]] },
    war: { props: [[0, 0.27, 0.22, 285], [3, 0.72, 0.23, 270], [1, 0.12, 0.52, 235], [1, 0.88, 0.52, 235], [5, 0.32, 0.82, 200], [5, 0.68, 0.82, 200], [2, 0.25, 0.26, 105]], lights: [[0.23, 0.19, 0.34, 0.14, 0.025], [0.66, 0.14, 0.77, 0.2, 0.025]] },
    arena: { props: [[1, 0.16, 0.26, 190], [1, 0.84, 0.26, 190], [0, 0.29, 0.16, 205], [0, 0.71, 0.16, 205], [2, 0.17, 0.83, 80], [2, 0.83, 0.83, 80], [4, 0.5, 0.11, 95, true]], lights: [[0.33, 0.13, 0.44, 0.11, 0.018], [0.56, 0.11, 0.67, 0.13, 0.018]] }
  ,"ancient":{"props":[[0,0.16,0.2,185],[1,0.65,0.2,175],[5,0.83,0.4,180],[1,0.2,0.57,180],[0,0.48,0.78,170],[2,0.8,0.84,90]],"lights":[[0.1,0.15,0.22,0.16,0.016],[0.78,0.32,0.89,0.35,0.015]]},"afk":{"props":[[0,0.25,0.22,170],[1,0.59,0.15,175],[5,0.82,0.31,165],[1,0.23,0.5,160],[0,0.76,0.69,170],[2,0.42,0.73,90]],"lights":[[0.22,0.16,0.32,0.14,0.015],[0.65,0.75,0.76,0.77,0.014]]},"dragon":{"props":[[0,0.27,0.22,185],[1,0.72,0.23,185],[5,0.16,0.47,175],[1,0.84,0.47,175],[0,0.32,0.66,180],[2,0.69,0.66,90]],"lights":[[0.23,0.19,0.35,0.15,0.018],[0.65,0.15,0.77,0.19,0.018]]},"event":{"props":[[0,0.27,0.2,175],[1,0.61,0.17,165],[5,0.82,0.29,170],[1,0.83,0.64,175],[0,0.33,0.76,170],[2,0.17,0.47,90]],"lights":[[0.23,0.14,0.35,0.14,0.016],[0.7,0.78,0.81,0.74,0.016]]},"rune":{"props":[[0,0.39,0.24,185],[1,0.66,0.28,180],[5,0.32,0.43,175],[1,0.66,0.58,180],[0,0.35,0.7,175],[2,0.65,0.82,90]],"lights":[[0.35,0.22,0.43,0.18,0.014],[0.7,0.52,0.78,0.49,0.015]]}};
  winter.guild_arena = { props: [[1, 0.15, 0.17, 185], [5, 0.85, 0.18, 170], [0, 0.21, 0.85, 90], [2, 0.8, 0.87, 170], [4, 0.36, 0.09, 80, true], [4, 0.66, 0.09, 80, true]], lights: [[0.22, 0.08, 0.39, 0.08, 0.017], [0.59, 0.08, 0.76, 0.08, 0.017], [0.24, 0.89, 0.42, 0.9, 0.013]] };
  harvest.guild_arena = { props: [[2, 0.15, 0.2, 170], [2, 0.85, 0.2, 170], [0, 0.25, 0.85, 85], [0, 0.75, 0.85, 85], [1, 0.38, 0.1, 145], [1, 0.62, 0.1, 145]], lights: [[0.22, 0.085, 0.39, 0.085, 0.019], [0.61, 0.085, 0.78, 0.085, 0.019]] };
  ramadan.guild_arena = { props: [[0, 0.15, 0.21, 180], [0, 0.85, 0.21, 180], [1, 0.26, 0.86, 150], [1, 0.74, 0.86, 150], [4, 0.38, 0.09, 90, true], [4, 0.62, 0.09, 90, true]], lights: [[0.22, 0.085, 0.4, 0.085, 0.019], [0.6, 0.085, 0.78, 0.085, 0.019]] };
  firstLight.guild_arena = { props: [[0, 0.16, 0.19, 190], [0, 0.84, 0.19, 190], [1, 0.24, 0.87, 170], [1, 0.76, 0.87, 170], [4, 0.38, 0.09, 95, true], [4, 0.64, 0.09, 95, true], [2, 0.42, 0.89, 80], [2, 0.58, 0.89, 80]], lights: [[0.22, 0.085, 0.4, 0.085, 0.017], [0.6, 0.085, 0.78, 0.085, 0.017]] };
  var FESTIVAL_LAYOUTS = { new_year: winter, halloween: harvest, ramadan, first_light: firstLight };
  function festivalLayout(theme, area) {
    return FESTIVAL_LAYOUTS[theme]?.[area];
  }

  // lib/seasonal-decor.mjs
  var labels = {
    new_year: ["K\u0131zak", "I\u015F\u0131kl\u0131 \xC7am", "\xC7an Dire\u011Fi", "K\u0131\u015F Tezg\xE2h\u0131", "\xC7am Girland\u0131", "Buz Geyi\u011Fi", "Kardan Adam", "Hediye Y\u0131\u011F\u0131n\u0131", "F\u0131nd\u0131kk\u0131ran", "\xC7elenk Dire\u011Fi", "K\u0131\u015F Feneri", "Mum K\xF6\u015Fesi"],
    halloween: ["Balkaba\u011F\u0131 K\xFCmesi", "Korkuluk", "Kuzgun Heykeli", "Cad\u0131 Kazan\u0131", "Fenerli Ge\xE7it", "Hasat Arabas\u0131","Büyülü Cadı Kazanı","Hasat Korkuluğu","Eski Mezartaşları","İskeletli Tabut","Balkabağı Arabası","Yarasa Sancağı"],
    ramadan: ["Fanus Dire\u011Fi", "Hilal", "Davul", "\u0130ftar Masas\u0131", "As\u0131l\u0131 Fanus", "T\xF6ren \xC7ad\u0131r\u0131"],
    first_light: ["\xC7ekirdek Feneri", "T\xF6ren Sanca\u011F\u0131", "Mum K\xFCmesi", "T\xF6ren Kemeri", "Prizma Girland\u0131", "Fidan Havuzu"]
  };
  var sizes = { new_year: [120, 250, 165, 160, 85, 180, 165, 100, 200, 180, 150, 90], halloween: [90, 180, 160, 125, 180, 160,140,190,150,155,160,190], ramadan: [175, 230, 80, 100, 105, 185], first_light: [260, 185, 85, 235, 105, 160] };
  var catalog = Object.freeze(Object.fromEntries(Object.entries(labels).map(([theme, names]) => [theme, Object.freeze(names.map((label, kind) => Object.freeze({ kind, label, name: label, size: sizes[theme][kind], wall: kind === 4 })))])));
  var lastText;
  var lastParsed = {};
  function seasonalSettings453(settings) {
    const text = settings?.seasonal_themes_json ?? "{}";
    if (text !== lastText) {
      lastText = text;
      try {
        const parsed = JSON.parse(text);
        lastParsed = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
      } catch {
        lastParsed = {};
      }
    }
    return lastParsed;
  }
  var args = (first, second, third) => typeof first === "string" ? [first, second, third] : [second, third, first];
  var copy = (layout) => ({ revision: Number.isSafeInteger(layout?.revision) && layout.revision >= 0 ? layout.revision : 0, custom: layout?.custom === true, props: (layout?.props ?? []).map((p) => p.slice()), lights: (layout?.lights ?? []).map((p) => p.slice()) });
  function defaultDecorLayout(theme, area) {
    return copy(festivalLayout(theme, area));
  }
  function decorRevision(first, second, third) {
    const [theme, area, settings] = args(first, second, third);
    const entry = seasonalSettings453(settings).__decor?.layouts?.[`${theme}:${area}`];
    return Number.isSafeInteger(entry?.revision) && entry.revision >= 0 ? entry.revision : 0;
  }
  function decorLayout(first, second, third) {
    const [theme, area, settings] = args(first, second, third), entry = seasonalSettings453(settings).__decor?.layouts?.[`${theme}:${area}`];
    return entry?.custom === true && Array.isArray(entry.props) && Array.isArray(entry.lights) ? copy(entry) : defaultDecorLayout(theme, area);
  }

  // lib/seasonal-atlas-bounds453.mjs
  var SEASONAL_ATLAS_BOUNDS453 = {
    "new_year": [
      [
        54,
        110,
        417,
        382
      ],
      [
        590,
        12,
        382,
        500
      ],
      [
        1175,
        10,
        335,
        493
      ],
      [
        25,
        512,
        475,
        475
      ],
      [
        524,
        605,
        535,
        298
      ],
      [
        1100,
        493,
        390,
        520
      ]
    ],
    "halloween": [
      [
        39,
        119,
        450,
        380
      ],
      [
        565,
        7,
        411,
        503
      ],
      [
        1156,
        23,
        269,
        482
      ],
      [
        34,
        560,
        459,
        408
      ],
      [
        526,
        523,
        485,
        452
      ],
      [
        1066,
        536,
        448,
        437
      ]
    ],
    "ramadan": [
      [
        140,
        0,
        248,
        545
      ],
      [
        554,
        16,
        427,
        530
      ],
      [
        1080,
        133,
        390,
        403
      ],
      [
        8,
        560,
        503,
        453
      ],
      [
        514,
        557,
        527,
        396
      ],
      [
        1070,
        528,
        460,
        480
      ]
    ],
    "first_light": [
      [
        95,
        7,
        366,
        502
      ],
      [
        658,
        0,
        225,
        530
      ],
      [
        1072,
        92,
        415,
        410
      ],
      [
        62,
        518,
        439,
        482
      ],
      [
        524,
        512,
        500,
        409
      ],
      [
        1110,
        527,
        395,
        480
      ]
    ]
  };

  // lib/seasonal-extra-bounds453.mjs
  var SEASONAL_EXTRA_BOUNDS453 = [[49, 9, 321, 379], [400, 104, 402, 274], [895, 3, 149, 411], [69, 389, 319, 367], [461, 386, 248, 372], [789, 422, 347, 334]];

  // lib/seasonal-renderer453.mjs
  var SEASONAL_LIMITS453 = Object.freeze({ props: 32, lights: 8, spriteSide: 320, stripSide: 640, stripEntries: 24, stripPixels: 1048576, sceneEntries: 2 });
  var palettes = {
    new_year: { rgb: "255,208,128", accent: "#e8edda", particle: "#eaf2f4" },
    halloween: { rgb: "237,151,62", accent: "#acb794", particle: "#c9c9ad" },
    ramadan: { rgb: "255,210,139", accent: "#8cbeb2", particle: "#eddbaf" },
    first_light: { rgb: "127,222,167", accent: "#ead59e", particle: "#e5d8a5" }
  };
  var imageRecords = /* @__PURE__ */ new WeakMap();
  var layoutAliases = /* @__PURE__ */ new WeakMap();
  var halos = /* @__PURE__ */ new Map();
  var strips = /* @__PURE__ */ new Map();
  var stripPixels = 0;
  var canvas = () => typeof document !== "undefined" ? document.createElement("canvas") : null;
  var validImage = (image) => !!image?.complete && Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0;
  var num = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  var array = (value) => Array.isArray(value) ? value : [];
  var themeKey = (theme) => Object.hasOwn(palettes, theme) ? theme : "none";
  var wrap = (n, max) => (n % max + max) % max;
  var keyFor = (o, layout) => `${o.theme}:${o.area}:${o.width}:${o.height}:${layout.custom ? "custom" : "default"}:${layout.props.map((p) => p.join(",")).join(";")}/${layout.lights.map((p) => p.join(",")).join(";")}`;
  const SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 = [[0,0,512,512],[548,0,464,512],[1032,0,496,512],[32,520,510,490],[542,540,490,450],[1108,512,356,512]];
function boundedSeasonalLayout453(theme, area, value) {
    const count = (theme === "new_year" || theme === "halloween") ? 12 : SEASONAL_ATLAS_BOUNDS453[theme]?.length ?? 0;
    const input = value && value.custom !== false && typeof value === "object" && Array.isArray(value.props) && Array.isArray(value.lights) && (!value.theme || value.theme === theme) && (!value.area || value.area === area) ? value : festivalLayout(theme, area);
    if (!input) return null;
    const props = [], lights = [];
    for (const p of array(input.props).slice(0, 32)) {
      if (!Array.isArray(p) || !Number.isInteger(p[0]) || p[0] < 0 || p[0] >= count || !num(p[1], 0, 1) || !num(p[2], 0, 1) || !num(p[3], 60, 320)) continue;
      props.push([p[0], p[1], p[2], p[3], p[4] === true]);
    }
    for (const p of array(input.lights).slice(0, 8)) {
      if (!Array.isArray(p) || p.length < 5 || !p.slice(0, 4).every((n) => num(n, 0, 1)) || !num(p[4], 0, 0.08)) continue;
      lights.push(p.slice(0, 5));
    }
    return { props, lights, custom: input === value && value?.custom !== false };
  }
  function halo(theme) {
    let cached = halos.get(theme);
    if (cached) return cached;
    const c = canvas();
    if (!c) return null;
    c.width = c.height = 96;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(48, 48, 1, 48, 48, 48), rgb = palettes[theme].rgb;
    g.addColorStop(0, `rgba(${rgb},.40)`);
    g.addColorStop(0.35, `rgba(${rgb},.14)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
    halos.set(theme, c);
    return c;
  }
  function makeSprite(image, theme, index, extra = false) {
    const bounds = extra ? (theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : SEASONAL_EXTRA_BOUNDS453)[index] : SEASONAL_ATLAS_BOUNDS453[theme]?.[index];
    if (!bounds) return null;
    const [left, top, width, height] = bounds;
    if (!(width > 0 && height > 0 && left >= 0 && top >= 0 && left + width <= image.naturalWidth && top + height <= image.naturalHeight)) return null;
    const c = canvas();
    if (!c) return null;
    const scale = Math.min(1, 320 / Math.max(width, height));
    c.width = Math.ceil(width * scale);
    c.height = Math.ceil(height * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, left, top, width, height, 0, 0, c.width, c.height);
    return c;
  }
  function lightStrip(theme, points, width, height, custom = false) {
    const key = `${theme}:${width}:${height}:${custom ? "custom:" : ""}${points.join(",")}`;
    let cached = strips.get(key);
    if (cached) {
      strips.delete(key);
      strips.set(key, cached);
      return cached;
    }
    const [ax, ay, bx, by, sag] = points, x1 = ax * width, y1 = ay * height, x2 = bx * width, y2 = by * height, drop = sag * height;
    const left = Math.min(x1, x2) - 14, top = Math.min(y1, y2) - 14, w = Math.abs(x2 - x1) + 28, h = Math.abs(y2 - y1) + drop + 45;
    const scale = Math.min(1, 640 / Math.max(w, h), custom ? Math.sqrt(65536 / (w * h)) : 1), c = canvas();
    if (!c) return null;
    c.width = Math.ceil(w * scale);
    c.height = Math.ceil(h * scale);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    const glow = halo(theme);
    if (!glow) return null;
    ctx.scale(scale, scale);
    ctx.translate(-left, -top);
    ctx.strokeStyle = theme === "new_year" ? "#344138" : "#67573f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 + drop * 2, x2, y2);
    ctx.stroke();
    const count = Math.min(18, Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / (theme === "new_year" ? 27 : 60))));
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + 4 * drop * t * (1 - t), fanous = theme === "ramadan", size = fanous ? 6 : theme === "new_year" ? 2.8 : 4;
      ctx.drawImage(glow, x - 13, y - 8, 26, 26);
      ctx.fillStyle = i % 3 === 0 ? palettes[theme].accent : "#f0d3a0";
      if (fanous) {
        ctx.strokeStyle = "#a08650";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 5);
        ctx.stroke();
        ctx.fillRect(x - size / 2, y + 5, size, size * 1.3);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    cached = { canvas: c, key, left, top, width: w, height: h, pixels: c.width * c.height };
    strips.set(key, cached);
    stripPixels += cached.pixels;
    while (strips.size > 24 || stripPixels > 1048576) {
      const oldest = strips.keys().next().value, item = strips.get(oldest);
      strips.delete(oldest);
      stripPixels -= item.pixels;
    }
    return cached;
  }
  function recordsFor(image) {
    let record = imageRecords.get(image);
    if (!record) {
      record = { art: /* @__PURE__ */ new Map(), scenes: /* @__PURE__ */ new Map() };
      imageRecords.set(image, record);
    }
    return record;
  }
  function sceneStart(o) {
    const theme = themeKey(o.theme);
    if (theme === "none" || !validImage(o.image) || !num(o.width, 1, 2e4) || !num(o.height, 1, 2e4)) return null;
    const layout = boundedSeasonalLayout453(theme, o.area, o.layout);
    if (!layout) return null;
    const needExtra = (theme === "new_year" || theme === "halloween") && layout.props.some((p) => p[0] >= 6);
    if (needExtra && !validImage(o.extraImage)) return null;
    const key = keyFor(o, layout), record = recordsFor(o.image), cached = record.scenes.get(key);
    if (cached && cached.lights.every((l) => strips.has(l.key))) {
      if (o.layout && typeof o.layout === "object") layoutAliases.set(o.layout, cached);
      record.active = cached;
      return { cached };
    }
    const base = record.art.get(theme) ?? [];
    record.art.set(theme, base);
    const extraRecord = needExtra ? recordsFor(o.extraImage) : null, extra = extraRecord ? extraRecord.art.get(theme === "halloween" ? "halloweenExtra469" : "extra") ?? [] : [];
    if (extraRecord) extraRecord.art.set(theme === "halloween" ? "halloweenExtra469" : "extra", extra);
    const art = [];
    const scene = { theme, area: o.area, width: o.width, height: o.height, key, layout, art, lights: [], glow: null, ready: false };
    const jobs = [];
    for (let i = 0; i < SEASONAL_ATLAS_BOUNDS453[theme].length; i++) jobs.push(() => {
      if (!base[i]) base[i] = makeSprite(o.image, theme, i);
      art[i] = base[i];
    });
    if (needExtra) for (let i = 0; i < 6; i++) jobs.push(() => {
      if (!extra[i]) extra[i] = makeSprite(o.extraImage, theme, i, true);
      art[6 + i] = extra[i];
    });
    jobs.push(() => {
      scene.glow = halo(theme);
    });
    for (const points of layout.lights) jobs.push(() => {
      const strip = lightStrip(theme, points, o.width, o.height, layout.custom);
      if (strip) {
        const { key: key2, left, top, width, height } = strip;
        scene.lights.push({ key: key2, left, top, width, height, x1: points[0] });
      }
    });
    const finish = () => {
      scene.ready = !!scene.glow && scene.art.length === (needExtra ? 12 : 6) && scene.art.every(Boolean);
      if (!scene.ready) return;
      record.scenes.set(key, scene);
      while (record.scenes.size > 2) record.scenes.delete(record.scenes.keys().next().value);
      record.active = scene;
      if (o.layout && typeof o.layout === "object") layoutAliases.set(o.layout, scene);
    };
    return { scene, jobs, finish };
  }
  function prepareSeasonalScene453(o) {
    const work = sceneStart(o);
    if (!work) return null;
    if (work.cached) return work.cached;
    for (const job of work.jobs) job();
    work.finish();
    return work.scene.ready ? work.scene : null;
  }
  function seasonalParticleBudget453(o) {switch(o.area){case "ancient":case "afk":case "dragon":case "event":case "rune":return 0;}
    return o.still ? 0 : o.heat ? 8 : o.reduced ? 16 : 28;
  }
  function drawSeasonalScene453(ctx, o, actors) {
    const theme = themeKey(o.theme);
    if (theme === "none" || !validImage(o.image)) return;
    const records = imageRecords.get(o.image);
    if (!records) return;
    const alias = o.layout && typeof o.layout === "object" ? layoutAliases.get(o.layout) : null;
    const scene = alias?.theme === theme && alias?.area === o.area && alias.width === o.width && alias.height === o.height ? alias : records.active;
    if (!scene?.ready || scene.theme !== theme || scene.area !== o.area || scene.width !== o.width || scene.height !== o.height) return;
    const { layout, art, glow } = scene, palette = palettes[theme], time = o.still ? 0 : Math.floor(o.now / (o.heat ? 125 : 80)) * (o.heat ? 125 : 80);
    const left = o.cameraX - o.viewWidth / 2, top = o.cameraY - o.viewHeight / 2, right = left + o.viewWidth, bottom = top + o.viewHeight;
    const visible = (x, y, w, h) => x + w > left && x < right && y + h > top && y < bottom;
    ctx.save();
    try {
      for (const strip of scene.lights) {
        if (!visible(strip.left, strip.top, strip.width, strip.height)) continue;
        const raster = strips.get(strip.key);
        if (!raster) continue;
        ctx.globalAlpha = o.still ? 1 : 0.94 + Math.sin(time / 2400 + strip.x1 * 8) * 0.06;
        ctx.drawImage(raster.canvas, strip.left, strip.top, strip.width, strip.height);
      }
      ctx.globalAlpha = 1;
      for (let index = 0; index < layout.props.length; index++) {
        const [kind, ax, ay, size, wall] = layout.props[index], im = art[kind];
        if (!im) continue;
        const x = ax * o.width, y = ay * o.height, h = size, w = size * im.width / im.height;
        if (!visible(x - w / 2, y - h, w, h + size * 0.18)) continue;
        if (!wall) {
          ctx.globalAlpha = 0.48;
          ctx.drawImage(glow, x - size * 0.4, y - size * 0.12, size * 0.8, size * 0.28);
          ctx.globalAlpha = 1;
        }
        const draw = () => {
          ctx.save();
          ctx.drawImage(im, x - w / 2, y - h, w, h);
          if (kind === (theme === "first_light" ? 0 : theme === "new_year" ? 1 : theme === "ramadan" ? 0 : 3)) {
            ctx.globalAlpha = o.still ? 0.13 : 0.13 + 0.025 * Math.sin(time / 2300 + index);
            ctx.drawImage(glow, x - size * 0.22, y - h * 0.7, size * 0.44, size * 0.38);
          }
          ctx.restore();
        };
        if (wall) draw();
        else actors.push({ y, draw });
      }
      if (!layout.props.length) return;
      const count = seasonalParticleBudget453(o);
      for (let i = 0; i < count; i++) {
        const anchor = layout.props[i % layout.props.length], size = anchor[3];
        const x = anchor[1] * o.width + (wrap(i * 79.17, size * 1.5) - size * 0.75) + Math.sin(time / 3200 + i) * 9;
        const snow = theme === "new_year" && o.area !== "black", rise = wrap(i * 47.11 + time * (snow ? 0.013 : -8e-3), size * 0.8), y = anchor[2] * o.height - size * 0.85 + rise;
        if (!visible(x - 8, y - 8, 16, 16)) continue;
        ctx.globalAlpha = 0.28 + 0.2 * Math.sin(time / 2100 + i) ** 2;
        ctx.fillStyle = palette.particle;
        if (theme === "halloween") ctx.drawImage(glow, x - 16, y - 5, 32, 10);
        else if (theme === "first_light") {
          ctx.beginPath();
          ctx.moveTo(x, y - 3.5);
          ctx.lineTo(x + 1.7, y);
          ctx.lineTo(x, y + 3.5);
          ctx.lineTo(x - 1.7, y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, y, snow ? 1.9 : 1.5, snow ? 1.5 : 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } finally {
      ctx.restore();
    }
  }
  function seasonalSpriteRatios453(theme) {
    return [...SEASONAL_ATLAS_BOUNDS453[theme] ?? [], ...theme === "new_year" ? SEASONAL_EXTRA_BOUNDS453 : theme === "halloween" ? SEASONAL_HALLOWEEN_EXTRA_BOUNDS469 : []].map(([, , w, h]) => Math.ceil(w * Math.min(1, 320 / Math.max(w, h))) / Math.ceil(h * Math.min(1, 320 / Math.max(w, h))));
  }

  // app/admin/seasonal-editor-core.mjs
  var MAX_PROPS = 32;
  var MAX_LIGHTS = 8;
  var cloneLayout = (layout) => ({ props: (layout?.props ?? []).map((p) => [...p]), lights: (layout?.lights ?? []).map((l) => [...l]) });
  var layoutEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var bound = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function editorCamera({ width, height, worldWidth, worldHeight, focus = [0.5, 0.5], overview = true }) {
    const zoom = Math.min(width / worldWidth, height / worldHeight) * (overview ? 1 : 2.1);
    return { width, height, worldWidth, worldHeight, zoom, x: (overview ? 0.5 : focus[0]) * worldWidth, y: (overview ? 0.5 : focus[1]) * worldHeight };
  }
  function screenToWorld(camera, x, y) {
    return { x: (x - camera.width / 2) / camera.zoom + camera.x, y: (y - camera.height / 2) / camera.zoom + camera.y };
  }
  function propRect(prop, world, ratios) {
    const [kind, ax, ay, h] = prop, w = h * (ratios[kind] || 1);
    return { x: ax * world.width - w / 2, y: ay * world.height - h, width: w, height: h };
  }
  function distanceToSegment(x, y, ax, ay, bx, by) {
    const length = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = length ? bound(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / length, 0, 1) : 0;
    return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
  }
  function hitDecoration(layout, world, ratios, point, tolerance) {
    const sorted = layout.props.map((p, i) => ({ p, i })).sort((a, b) => Number(Boolean(a.p[4])) - Number(Boolean(b.p[4])) || b.p[2] - a.p[2] || b.i - a.i);
    for (const { p, i } of sorted) {
      const r = propRect(p, world, ratios);
      if (point.x >= r.x - tolerance && point.x <= r.x + r.width + tolerance && point.y >= r.y - tolerance && point.y <= r.y + r.height + tolerance) return { kind: "prop", index: i };
    }
    for (let index = layout.lights.length - 1; index >= 0; index--) {
      const [ax, ay, bx, by, sag] = layout.lights[index];
      let px = ax * world.width, py = ay * world.height;
      for (let step = 1; step <= 16; step++) {
        const t = step / 16, x = (ax + (bx - ax) * t) * world.width, y = (ay + (by - ay) * t + 4 * sag * t * (1 - t)) * world.height;
        if (distanceToSegment(point.x, point.y, px, py, x, y) <= tolerance) return { kind: "light", index };
        px = x;
        py = y;
      }
    }
    return null;
  }
  function moveDecoration(layout, selected, from, to, world, ratios) {
    if (!selected) return layout;
    const next = cloneLayout(layout), dx = (to.x - from.x) / world.width, dy = (to.y - from.y) / world.height;
    if (selected.kind === "prop") {
      const p = next.props[selected.index];
      if (!p) return layout;
      const half = p[3] * (ratios[p[0]] || 1) / (2 * world.width), height = p[3] / world.height;
      p[1] = bound(p[1] + dx, Math.min(0.49, half), Math.max(0.51, 1 - half));
      p[2] = bound(p[2] + dy, Math.min(0.99, height), 1);
    } else {
      const l = next.lights[selected.index];
      if (!l) return layout;
      const sx = bound(dx, -Math.min(l[0], l[2]), 1 - Math.max(l[0], l[2]));
      const sy = bound(dy, -Math.min(l[1], l[3]), 1 - Math.max(l[1], l[3]) - l[4]);
      l[0] += sx;
      l[2] += sx;
      l[1] += sy;
      l[3] += sy;
    }
    return next;
  }
  function resizeProp(layout, index, size, world, ratios) {
    const next = cloneLayout(layout), p = next.props[index];
    if (!p) return layout;
    p[3] = bound(Number(size) || 80, 60, 320);
    return moveDecoration(next, { kind: "prop", index }, { x: 0, y: 0 }, { x: 0, y: 0 }, world, ratios);
  }
  function removeDecoration(layout, selected) {
    if (!selected) return layout;
    const next = cloneLayout(layout);
    next[selected.kind === "prop" ? "props" : "lights"].splice(selected.index, 1);
    return next;
  }
  function makeDraft(layout, revision) {
    const copied = cloneLayout(layout);
    return { layout: copied, original: cloneLayout(layout), expectedRevision: revision, dirty: false };
  }
  function updateDraft(draft, layout) {
    return { ...draft, layout, dirty: !layoutEqual(draft.original, layout) };
  }
  function reconcileDraft(draft, layout, revision) {
    return !draft || !draft.dirty ? makeDraft(layout, revision) : draft;
  }
  function acknowledgeDraft(draft, submitted, revision) {
    return { ...draft, original: cloneLayout(submitted), expectedRevision: revision, dirty: !layoutEqual(draft.layout, submitted) };
  }
  function beginDrag(pointerId, selected, layout, point) {
    return { pointerId, selected, layout: cloneLayout(layout), point };
  }
  function dragPointer(drag, pointerId, point, world, ratios) {
    return drag?.pointerId === pointerId ? moveDecoration(drag.layout, drag.selected, drag.point, point, world, ratios) : null;
  }
  function cancelDrag(drag, pointerId) {
    return drag?.pointerId === pointerId ? cloneLayout(drag.layout) : null;
  }

  // seasonal-editor453.tsx
  function createSeasonalEditor453(React, { SEASONAL_AREAS, SEASONAL_ART, seasonalTheme, FESTIVAL_MAPS, areaWorld }) {
    const { useEffect, useMemo, useRef, useState } = React;
    function ratiosFor(theme) {
      return seasonalSpriteRatios453(theme);
    }
    function SeasonalPreview({ theme, area = "bazaar", overview = false, layout, selected = null, disabled = false, onLayout, onSelect }) {
      const ref = useRef(null), paintRef = useRef(() => {
      }), dragRef = useRef(null), dragFrame = useRef(0), pendingPoint = useRef(null);
      const latest = useRef({ layout, selected, disabled, onLayout, onSelect });
      latest.current = { layout, selected, disabled, onLayout, onSelect };
      const [status, setStatus] = useState("loading");
      const label = SEASONAL_AREAS.find(([id]) => id === area)?.[1] ?? (area === "guild_arena" ? "Lonca Sava\u015F\u0131" : area);
      const world = areaWorld(area), ratios = ratiosFor(theme);
      const camera = () => editorCamera({ width: ref.current?.clientWidth || 1, height: ref.current?.clientHeight || 1, worldWidth: world.width, worldHeight: world.height, focus: FESTIVAL_MAPS[area].focus, overview });
      const point = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return screenToWorld(camera(), (event.clientX - rect.left) * event.currentTarget.clientWidth / rect.width, (event.clientY - rect.top) * event.currentTarget.clientHeight / rect.height);
      };
      const finish = (event, cancelled = false) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        window.cancelAnimationFrame(dragFrame.current);
        dragFrame.current = 0;
        const next = cancelled ? cancelDrag(drag, event.pointerId) : dragPointer(drag, event.pointerId, pendingPoint.current ?? point(event), world, ratios);
        pendingPoint.current = null;
        dragRef.current = null;
        if (next) latest.current.onLayout?.(next);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      };
      useEffect(() => {
        const canvas2 = ref.current;
        if (!canvas2) return;
        const ctx = canvas2.getContext("2d");
        if (!ctx) return;
        setStatus("loading");
        let alive = true, visible = true, frame = 0;
        const map = new Image(), art = new Image(), extra = (theme === "new_year" || theme === "halloween") ? new Image() : void 0, meta = FESTIVAL_MAPS[area], currentWorld = areaWorld(area), currentRatios = ratiosFor(theme);
        const paint = () => {
          frame = 0;
          if (!alive || document.hidden || !visible) return;
          const width = canvas2.clientWidth, height = canvas2.clientHeight, dpr = Math.min(devicePixelRatio || 1, 1.5);
          if (!width || !height) return;
          const ready = map.complete && map.naturalWidth && art.complete && art.naturalWidth && (!extra || extra.complete && extra.naturalWidth);
          if (canvas2.width !== Math.round(width * dpr) || canvas2.height !== Math.round(height * dpr)) {
            canvas2.width = Math.round(width * dpr);
            canvas2.height = Math.round(height * dpr);
          }
          const cam = editorCamera({ width, height, worldWidth: currentWorld.width, worldHeight: currentWorld.height, focus: meta.focus, overview });
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = "#09130f";
          ctx.fillRect(0, 0, width, height);
          ctx.translate(width / 2, height / 2);
          ctx.scale(cam.zoom, cam.zoom);
          ctx.translate(-cam.x, -cam.y);
          if (map.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, currentWorld.width, currentWorld.height);
          if (ready) {
            const actors = [];
            prepareSeasonalScene453({ theme, area, ...currentWorld, image: art, extraImage: extra, layout: latest.current.layout });
            drawSeasonalScene453(ctx, { theme, area, ...currentWorld, now: 0, image: art, extraImage: extra, cameraX: cam.x, cameraY: cam.y, viewWidth: width / cam.zoom, viewHeight: height / cam.zoom, reduced: true, still: true, layout: latest.current.layout }, actors);
            actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
            const pick = latest.current.selected, current = latest.current.layout;
            if (pick && current) {
              ctx.strokeStyle = "#ffe9a2";
              ctx.fillStyle = "#ffe9a2";
              ctx.lineWidth = 2 / cam.zoom;
              ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
              if (pick.kind === "prop" && current.props[pick.index]) {
                const r = propRect(current.props[pick.index], currentWorld, currentRatios);
                ctx.strokeRect(r.x - 4 / cam.zoom, r.y - 4 / cam.zoom, r.width + 8 / cam.zoom, r.height + 8 / cam.zoom);
              } else if (pick.kind === "light" && current.lights[pick.index]) {
                const [ax, ay, bx, by, sag] = current.lights[pick.index];
                ctx.beginPath();
                ctx.moveTo(ax * currentWorld.width, ay * currentWorld.height);
                ctx.quadraticCurveTo((ax + bx) * currentWorld.width / 2, ((ay + by) / 2 + sag * 2) * currentWorld.height, bx * currentWorld.width, by * currentWorld.height);
                ctx.stroke();
                ctx.setLineDash([]);
                for (const [x, y] of [[ax, ay], [bx, by]]) {
                  ctx.beginPath();
                  ctx.arc(x * currentWorld.width, y * currentWorld.height, 5 / cam.zoom, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
              ctx.setLineDash([]);
            }
          }
        };
        const schedule = () => {
          if (alive && !frame && !document.hidden && visible) frame = requestAnimationFrame(paint);
        };
        paintRef.current = schedule;
        const loaded = () => {
          if (!alive) return;
          if (map.complete && map.naturalWidth && art.complete && art.naturalWidth && (!extra || extra.complete && extra.naturalWidth)) setStatus("ready");
          schedule();
        };
        const failed = () => {
          if (alive) setStatus("error");
        };
        map.onload = loaded;
        art.onload = loaded;
        map.onerror = failed;
        art.onerror = failed;
        if (extra) {
          extra.onload = loaded;
          extra.onerror = failed;
        }
        const observer = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (!visible) {
            window.cancelAnimationFrame(frame);
            frame = 0;
          } else schedule();
        });
        observer.observe(canvas2);
        const resize = new ResizeObserver(schedule);
        resize.observe(canvas2);
        const visibility = () => {
          if (document.hidden) {
            window.cancelAnimationFrame(frame);
            frame = 0;
            if (dragRef.current) {
              latest.current.onLayout?.(cloneLayout(dragRef.current.layout));
              const id = dragRef.current.pointerId;
              dragRef.current = null;
              if (canvas2.hasPointerCapture(id)) canvas2.releasePointerCapture(id);
            }
            window.cancelAnimationFrame(dragFrame.current);
            dragFrame.current = 0;
            pendingPoint.current = null;
          } else schedule();
        };
        document.addEventListener("visibilitychange", visibility);
        map.src = meta.asset;
        art.src = SEASONAL_ART[theme].asset;
        if (extra) extra.src = theme === "halloween" ? "/game/halloween-decor-v469.webp" : "/game/festival-new-year-extra-v453.webp";
        schedule();
        return () => {
          alive = false;
          paintRef.current = () => {
          };
          window.cancelAnimationFrame(frame);
          window.cancelAnimationFrame(dragFrame.current);
          dragFrame.current = 0;
          pendingPoint.current = null;
          const id = dragRef.current?.pointerId;
          dragRef.current = null;
          if (id !== void 0 && canvas2.hasPointerCapture(id)) canvas2.releasePointerCapture(id);
          map.onload = art.onload = null;
          map.onerror = art.onerror = null;
          if (extra) {
            extra.onload = extra.onerror = null;
          }
          observer.disconnect();
          resize.disconnect();
          document.removeEventListener("visibilitychange", visibility);
        };
      }, [theme, area, overview]);
      useEffect(() => {
        paintRef.current();
      }, [layout, selected]);
      return /* @__PURE__ */ React.createElement("figure", { className: "seasonal-preview-stage" }, /* @__PURE__ */ React.createElement("canvas", { ref, className: onLayout ? "seasonal-edit-canvas" : void 0, "aria-label": `${SEASONAL_ART[theme].label} \xB7 ${label} dekor yerle\u015Fimi`, onPointerDown: (event) => {
        if (!onLayout || disabled || status !== "ready" || dragRef.current || event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        const current = latest.current.layout;
        if (!current) return;
        const start = point(event), pick = hitDecoration(current, world, ratios, start, 12 / camera().zoom);
        latest.current.onSelect?.(pick);
        if (!pick) return;
        dragRef.current = beginDrag(event.pointerId, pick, current, start);
        event.currentTarget.setPointerCapture(event.pointerId);
      }, onPointerMove: (event) => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        pendingPoint.current = point(event);
        if (!dragFrame.current) dragFrame.current = requestAnimationFrame(() => {
          dragFrame.current = 0;
          const drag = dragRef.current, pending = pendingPoint.current;
          if (!drag || !pending) return;
          const next = dragPointer(drag, drag.pointerId, pending, world, ratios);
          if (next) latest.current.onLayout?.(next);
        });
      }, onPointerUp: (event) => finish(event), onPointerCancel: (event) => finish(event, true), onLostPointerCapture: (event) => {
        if (dragRef.current?.pointerId === event.pointerId) finish(event, true);
      } }), status !== "ready" && /* @__PURE__ */ React.createElement("div", { className: "seasonal-preview-status", role: "status" }, status === "error" ? "G\xF6rseller y\xFCklenemedi. Ba\u015Fka harita se\xE7ip yeniden deneyebilirsin." : "Harita ve s\xFCsler y\xFCkleniyor\u2026"), /* @__PURE__ */ React.createElement("figcaption", null, label, " \xB7 ", SEASONAL_ART[theme].label));
    }
    function SeasonalPanel({ settings, busy, act }) {
      const [preview, setPreview] = useState("first_light"), [area, setArea] = useState("bazaar"), [overview, setOverview] = useState(true), [drafts, setDrafts] = useState({}), [selected, setSelected] = useState(null), [note, setNote] = useState(""), [resetKeys, setResetKeys] = useState({});
      const key = `${preview}:${area}`, revision = decorRevision(preview, area, settings), base = useMemo(() => cloneLayout(decorLayout(preview, area, settings)), [revision, preview, area]);
      const draft = drafts[key] ?? makeDraft(base, revision), layout = draft.layout, ratios = ratiosFor(preview), world = areaWorld(area), catalog2 = catalog[preview];
      useEffect(() => {
        setDrafts((current) => ({ ...current, [key]: reconcileDraft(current[key], base, revision) }));
      }, [key, revision, base]);
      useEffect(() => {
        setSelected(null);
        setNote("");
      }, [key]);
      const change = (next, reset = false) => {
        setDrafts((current) => ({ ...current, [key]: { ...updateDraft(current[key] ?? makeDraft(base, revision), next), ...reset ? { dirty: true } : {} } }));
        setResetKeys((current) => ({ ...current, [key]: reset }));
      };
      const dirty = draft.dirty || Boolean(resetKeys[key]);
      const navigate = (set) => {
        setSelected(null);
        setNote("");
        set();
      };
      const save = async () => {
        const submitted = cloneLayout(layout), anchor = draft.expectedRevision;
        const response = await act(resetKeys[key] ? { action: "reset_decor_layout", theme: preview, area, expectedRevision: anchor } : { action: "set_decor_layout", theme: preview, area, props: submitted.props, lights: submitted.lights, expectedRevision: anchor });
        if (!response?.settings) {
          setNote("Kaydedilemedi. Tasla\u011F\u0131n korunuyor; canl\u0131 veriyi yenileyip tekrar kontrol et.");
          return;
        }
        const nextRevision = decorRevision(preview, area, response.settings);
        setDrafts((current) => ({ ...current, [key]: acknowledgeDraft(current[key] ?? draft, submitted, nextRevision) }));
        setResetKeys((current) => ({ ...current, [key]: false }));
        setNote("Yerle\u015Fim kaydedildi. Haritan\u0131n temas\u0131 a\xE7\u0131ksa oyuncular bu yerle\u015Fimi g\xF6r\xFCr.");
      };
      const defaults = () => {
        change(cloneLayout(defaultDecorLayout(preview, area)), true);
        setSelected(null);
        setNote("Varsay\u0131lan yerle\u015Fim tasla\u011Fa al\u0131nd\u0131. Uygulamak i\xE7in Kaydet.");
      };
      const cancel = () => {
        setDrafts((current) => ({ ...current, [key]: makeDraft(base, revision) }));
        setResetKeys((current) => ({ ...current, [key]: false }));
        setSelected(null);
        setNote("Bu haritan\u0131n kaydedilmemi\u015F de\u011Fi\u015Fiklikleri iptal edildi.");
      };
      const selectedProp = selected?.kind === "prop" ? layout.props[selected.index] : null;
      return /* @__PURE__ */ React.createElement("section", { className: "admin-card seasonal-maps-card" }, /* @__PURE__ */ React.createElement("h2", null, "Etkinlik G\xF6r\xFCn\xFCmleri"), /* @__PURE__ */ React.createElement("p", null, "Temay\u0131 ve haritay\u0131 se\xE7. S\xFCsleri fareyle veya parma\u011F\u0131nla s\xFCr\xFCkle; d\xFCzenin yaln\u0131z Kaydet d\xFC\u011Fmesiyle uygulan\u0131r."), /* @__PURE__ */ React.createElement("div", { className: "seasonal-theme-choices", role: "group", "aria-label": "Tema se\xE7imi" }, Object.entries(SEASONAL_ART).map(([id, art]) => /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, key: id, "aria-pressed": preview === id, onClick: () => navigate(() => setPreview(id)) }, /* @__PURE__ */ React.createElement("strong", null, art.label), /* @__PURE__ */ React.createElement("span", null, art.subtitle)))), /* @__PURE__ */ React.createElement("div", { className: "seasonal-preview-controls" }, /* @__PURE__ */ React.createElement("label", null, "Yerle\u015Fim haritas\u0131", /* @__PURE__ */ React.createElement("select", { disabled: busy, value: area, onChange: (e) => navigate(() => setArea(e.target.value)) }, SEASONAL_AREAS.map(([id, label]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, label)), /* @__PURE__ */ React.createElement("option", { value: "guild_arena" }, "Lonca Sava\u015F\u0131 \xB7 Arena temas\u0131"))), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, "aria-pressed": overview, onClick: () => setOverview((v) => !v) }, overview ? "Yak\u0131ndan incele" : "Haritan\u0131n tamam\u0131n\u0131 g\xF6r")), /* @__PURE__ */ React.createElement(SeasonalPreview, { theme: preview, area, overview, layout, selected, disabled: busy || !settings, onLayout: change, onSelect: setSelected }), /* @__PURE__ */ React.createElement("div", { className: "seasonal-editor-toolbar" }, /* @__PURE__ */ React.createElement("span", null, layout.props.length, "/", MAX_PROPS, " s\xFCs \xB7 ", layout.lights.length, "/", MAX_LIGHTS, " \u0131\u015F\u0131k dizisi"), /* @__PURE__ */ React.createElement("strong", null, dirty ? "Kaydedilmemi\u015F de\u011Fi\u015Fiklikler" : "Kay\u0131tl\u0131 yerle\u015Fim")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-decor-picker", role: "group", "aria-label": "S\xFCs ekle" }, catalog2.map((item, slot) => /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || layout.props.length >= MAX_PROPS, key: slot, onClick: () => {
        const next = cloneLayout(layout);
        next.props.push([slot, 0.5, 0.52, item.size, item.wall ?? false]);
        change(next);
        setSelected({ kind: "prop", index: next.props.length - 1 });
      } }, item.label)), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || layout.lights.length >= MAX_LIGHTS, onClick: () => {
        const next = cloneLayout(layout);
        next.lights.push([0.35, 0.4, 0.65, 0.4, 0.025]);
        change(next);
        setSelected({ kind: "light", index: next.lights.length - 1 });
      } }, "I\u015F\u0131k dizisi")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-selected-decor" }, selected ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", null, selectedProp ? catalog2[selectedProp[0]]?.label ?? "S\xFCs" : "I\u015F\u0131k dizisi", " se\xE7ili"), selectedProp && /* @__PURE__ */ React.createElement("label", null, "Boyut ", /* @__PURE__ */ React.createElement("input", { "aria-label": "Se\xE7ili s\xFCs\xFCn boyutu", type: "range", min: "60", max: "320", step: "5", disabled: busy, value: selectedProp[3], onChange: (e) => change(resizeProp(layout, selected.index, Number(e.target.value), world, ratios)) }), /* @__PURE__ */ React.createElement("output", null, selectedProp[3])), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy, onClick: () => {
        change(removeDecoration(layout, selected));
        setSelected(null);
      } }, "Se\xE7iliyi kald\u0131r")) : /* @__PURE__ */ React.createElement("span", null, "Ta\u015F\u0131mak veya boyutunu ayarlamak i\xE7in haritadaki bir s\xFCse dokun.")), /* @__PURE__ */ React.createElement("div", { className: "seasonal-editor-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "seasonal-save", disabled: busy || !settings || !dirty, onClick: () => void save() }, "Kaydet"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !dirty, onClick: cancel }, "\u0130ptal"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings, onClick: defaults }, "Varsay\u0131lan yerle\u015Fim"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: busy || !settings || !layout.props.length && !layout.lights.length, onClick: () => {
        change({ props: [], lights: [] });
        setSelected(null);
      } }, "S\xFCsleri temizle")), note && /* @__PURE__ */ React.createElement("p", { className: "seasonal-editor-feedback", role: "status" }, note), dirty && revision !== draft.expectedRevision && /* @__PURE__ */ React.createElement("p", { className: "seasonal-editor-feedback", role: "status" }, "Bu yerle\u015Fim ba\u015Fka bir y\xF6netici ekran\u0131nda de\u011Fi\u015Fti. Tasla\u011F\u0131n korunuyor; \u0130ptal ile son kayda d\xF6nebilirsin."), /* @__PURE__ */ React.createElement("p", { className: "seasonal-map-note" }, FESTIVAL_MAPS[area].note), /* @__PURE__ */ React.createElement("p", { className: "seasonal-preview-note" }, "Tema veya harita de\u011Fi\u015Ftirince tasla\u011F\u0131n korunur. S\xFCsler sava\u015F, hareket ve ganimet kurallar\u0131n\u0131 de\u011Fi\u015Ftirmez. Zindanlar ayn\u0131 kal\u0131r."), /* @__PURE__ */ React.createElement("div", { className: "seasonal-map-list" }, SEASONAL_AREAS.map(([id, label]) => /* @__PURE__ */ React.createElement("label", { key: id }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("select", { "aria-label": label + " temas\u0131", disabled: busy || !settings, value: seasonalTheme(settings, id), onChange: (e) => void act({ action: "set_map_theme", area: id, theme: e.target.value, expectedTheme: seasonalTheme(settings, id) }) }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "Kapal\u0131 \xB7 Normal harita"), Object.entries(SEASONAL_ART).map(([theme, art]) => /* @__PURE__ */ React.createElement("option", { key: theme, value: theme }, art.label)))))));
    }
    return { Panel: SeasonalPanel, Preview: SeasonalPreview };
  }
  return __toCommonJS(seasonal_editor453_exports);
})();

function createEventIslandAdmin444(React,{Composer,sendGm}){
 const h=React.createElement;
 function Admin({value,busy,act}){
  const [draft,setDraft]=React.useState(()=>structuredClone(value.config)),[revision,setRevision]=React.useState(value.revision),[status,setStatus]=React.useState(''),[working,setWorking]=React.useState(false);
  const request=React.useRef(null),dirty=React.useRef(false),inFlight448=React.useRef(false);
  const [hpDraft448,setHpDraft448]=React.useState({});
  const hpText448=b=>Object.hasOwn(hpDraft448,b.kind)?hpDraft448[b.kind].value:String(value.config.hpOverrides?.[b.kind]??b.effectiveHp??b.baseHp??'');
  const hpValid448=b=>{const text=hpText448(b);return /^\d+$/.test(text)&&Number.isSafeInteger(Number(text))&&Number(text)>=1&&Number(text)<=100000000;};
  const hpNumber448=n=>Number.isSafeInteger(Number(n))&&Number(n)>0?Number(n).toLocaleString('tr-TR'):'—';
  React.useEffect(()=>{if(!dirty.current){setDraft(structuredClone(value.config));setRevision(value.revision);}},[value.revision]);
  const set=fn=>{dirty.current=true;setDraft(old=>{const next=structuredClone(old);fn(next);return next;});};
  const locked=busy||working,counts=[1,2,3].map(channel=>({channel,active:(value.active??[]).filter(b=>b.channel===channel&&b.hp>0).length,planned:draft.plan.filter(b=>b.channel===channel).reduce((sum,b)=>sum+Number(b.count||0),0)}));
  const invalid=!Number.isSafeInteger(draft.maxBossesPerChannel)||draft.maxBossesPerChannel<1||draft.maxBossesPerChannel>8||draft.plan.some(row=>!Number.isSafeInteger(row.count)||row.count<1||row.count>8)||counts.some(v=>v.active+v.planned>draft.maxBossesPerChannel);
  const run=async(action,body)=>{if(locked||inFlight448.current)return;inFlight448.current=true;setWorking(true);setStatus('');try{if(action!=='save_event_island')request.current??={action,id:Date.now()+'-'+crypto.randomUUID(),body:JSON.stringify(body)};if(request.current&&(request.current.action!==action||request.current.body!==JSON.stringify(body)))request.current={action,id:Date.now()+'-'+crypto.randomUUID(),body:JSON.stringify(body)};const result=await act({action,...body,...(action!=='save_event_island'?{requestId:request.current.id}:{})});if(result){request.current=null;if(result.eventIsland){if(action==='set_event_island_hp'){
     setDraft(old=>({...old,hpOverrides:structuredClone(result.eventIsland.config.hpOverrides??{})}));
     setHpDraft448(old=>Object.fromEntries(Object.entries(old).filter(([kind])=>kind!==body.kind).map(([kind,row])=>[kind,row.revision===body.revision?{...row,revision:result.eventIsland.revision}:row])));
     if(!dirty.current||revision===body.revision)setRevision(result.eventIsland.revision);
    }else{dirty.current=false;setDraft(structuredClone(result.eventIsland.config));setRevision(result.eventIsland.revision);}}setStatus(result.message||'Etkinlik Adası güncellendi.');}else setStatus('İşlem tamamlanmadı. Hata mesajını kontrol et.');}catch(e){setStatus(e.message||'İşlem tamamlanamadı.');}finally{inFlight448.current=false;setWorking(false);}};
  const update=(index,key,v)=>set(d=>{d.plan[index][key]=key==='kind'?v:Number(v);});
  const button=(label,onClick,disabled=false)=>h('button',{type:'button',disabled:locked||disabled,onClick},label);
  return h('section',{className:'event444-admin'},h('style',null,`.event444-admin{display:grid;gap:18px;min-width:0;color:#e9f4ed}.event444-head{position:relative;overflow:hidden;border:1px solid #638478;border-radius:16px;padding:22px;background:#112a25}.event444-head img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.23;pointer-events:none}.event444-head>div{position:relative}.event444-head h2{margin:0 0 8px}.event444-head p{margin:0;max-width:720px}.event444-toolbar,.event444-summary{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.event444-admin button{min-height:42px;padding:9px 15px;border:1px solid #907d47;border-radius:9px;background:#bc9a51;color:#161d15;font-weight:700}.event444-admin button:disabled{opacity:.45}.event444-admin input,.event444-admin select{min-height:42px;border:1px solid #45675c;border-radius:7px;padding:8px;background:#0c211c;color:#edf6ee;min-width:0;width:100%;font-size:16px}.event444-admin input[type=checkbox]{width:20px;min-height:20px;margin-right:10px}.event444-toolbar label{display:flex;align-items:center;gap:8px}.event444-toolbar input[type=number]{max-width:85px}.event444-summary span{padding:10px 14px;border:1px solid #45675c;border-radius:10px;background:#112921}.event444-plan{display:grid;gap:10px}.event444-plan-row{display:grid;grid-template-columns:minmax(170px,2fr) minmax(100px,1fr) 100px auto;gap:10px;align-items:end;border:1px solid #304d42;padding:12px;border-radius:10px}.event444-plan-row label{display:grid;gap:6px;font-size:13px}.event444-current{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;max-height:300px;overflow:auto}.event444-current article{background:#10261f;border-radius:9px;padding:12px}.event444-current small{display:block;color:#adcebf;margin-top:5px}.event444-alert{color:#f6ce87}.event444-gm{border-top:1px solid #405d50;padding-top:16px}.event444-actions{display:flex;flex-wrap:wrap;gap:10px}.event444-empty{color:#a8bfb3}.event448-hp{display:grid;gap:12px;min-width:0;border:1px solid #466c57;border-radius:12px;padding:16px;background:#10251d}.event448-hp h3,.event448-hp p{margin:0}.event448-hp>p{color:#b9d2c4;line-height:1.55}.event448-hp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px}.event448-hp-card{display:grid;gap:10px;min-width:0;padding:14px;background:#0b1d17;border:1px solid #355345;border-radius:10px}.event448-hp-card h4{margin:0;color:#f1dfad}.event448-hp-card dl{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;margin:0;font-size:13px}.event448-hp-card dt{color:#b9d2c4}.event448-hp-card dd{margin:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.event448-hp-card label{display:grid;gap:6px;font-size:13px}.event448-hp-card input{box-sizing:border-box;min-height:44px}.event448-hp-card .event444-actions{align-items:stretch}.event448-hp-card button{min-height:44px;flex:1 1 auto}.event448-hp-card small{color:#b9d2c4}.event448-hp-card [role=alert]{color:#f6ce87;font-size:13px}@media(max-width:700px){.event448-hp{padding:12px}.event448-hp-grid{grid-template-columns:minmax(0,1fr)}.event448-hp-card{padding:12px}.event444-plan-row{grid-template-columns:minmax(0,1fr) 90px}.event444-plan-row label:first-child{grid-column:1/-1}.event444-head{padding:16px}.event444-summary{gap:7px}.event444-summary span{flex:1;padding:8px;font-size:13px}.event444-toolbar{align-items:flex-start;flex-direction:column}.event444-admin{gap:13px}}`),
   h('header',{className:'event444-head'},h('img',{src:'/game/event-island-mobile-v444.webp',alt:'',loading:'lazy',decoding:'async'}),h('div',null,h('h2',null,'Etkinlik Adası'),h('p',null,'Adanın kapılarını aç, bosslarını seç ve her kanalın karşılaşmasını planla. Adet sınırı doluysa yeni boss gönderilmez.'))),
   h('div',{className:'event444-toolbar'},h('label',null,h('input',{type:'checkbox',checked:!!draft.enabled,disabled:locked,onChange:e=>set(d=>{d.enabled=e.target.checked;})}),'Etkinlik Adası açık'),h('label',null,'Kanal başına boss sınırı',h('input',{type:'number',min:1,max:8,step:1,value:draft.maxBossesPerChannel,disabled:locked,onChange:e=>set(d=>{d.maxBossesPerChannel=Number(e.target.value);})})),button('Ayarları kaydet',()=>run('save_event_island',{config:draft,revision}))),
   h('p',{className:'event444-alert'},'Ada kapatıldığında giriş gizlenir, adadaki oyuncular güvenle Pazar Köyü’ne döner. Gönderilen bosslar yeniden doğmaz. Zindan bossları burada açık alan savaş düzeniyle dövüşür.'),
   h('section',{className:'event448-hp','aria-labelledby':'event448-hp-title'},
    h('h3',{id:'event448-hp-title'},'Etkinlik bosslarının canı'),
    h('p',null,'Can ayarı yeni çağrılacak bosslara uygulanır. Yalnız Etkinlik Adası için geçerlidir; adadaki mevcut bossların canı ve diğer haritalar değişmez.'),
    h('div',{className:'event448-hp-grid'},...(value.catalog??[]).map(b=>{
     const input=hpText448(b),valid=hpValid448(b),changed=Object.hasOwn(hpDraft448,b.kind),hasOverride=Object.hasOwn(value.config.hpOverrides??{},b.kind);
     return h('article',{className:'event448-hp-card',key:b.kind},h('h4',null,b.name),
      h('dl',null,h('dt',null,'Kaynak boss canı'),h('dd',null,hpNumber448(b.baseHp)),h('dt',null,'Adada yeni doğuş canı'),h('dd',null,hpNumber448(b.effectiveHp)),h('dt',null,'Can ayarı'),h('dd',null,hasOverride?'Adaya özel':'Varsayılan')),
      h('label',{htmlFor:'event448-hp-'+b.kind},'Etkinlik Adası canı',h('input',{id:'event448-hp-'+b.kind,type:'number',inputMode:'numeric',min:1,max:100000000,step:1,value:input,disabled:locked,'aria-invalid':!valid,'aria-label':b.name+' etkinlik canı',onChange:e=>{const text=e.target.value;setHpDraft448(old=>({...old,[b.kind]:{value:text,revision:value.revision}}));}})),
      !valid&&h('p',{role:'alert'},'1 ile 100.000.000 arasında tam sayı gir.'),
      h('div',{className:'event444-actions'},button('Kaydet ve uygula',()=>{if(!valid||!changed)return;return run('set_event_island_hp',{kind:b.kind,hp:Number(input),revision:hpDraft448[b.kind]?.revision??value.revision});},!valid||!changed),button('Geri al',()=>{if(!hasOverride){setHpDraft448(old=>{const next={...old};delete next[b.kind];return next;});return;}return run('set_event_island_hp',{kind:b.kind,hp:null,revision:value.revision});},!hasOverride&&!changed)),
      h('small',null,'Geri al: yeni çağrılacak bosslar kaynak bossun can ayarını kullanır.'));
    }))),
   h('div',{className:'event444-summary'},...counts.map(row=>h('span',{key:row.channel},h('b',null,'Kanal '+row.channel),h('br'),row.active+' aktif · '+row.planned+' planlanan / '+draft.maxBossesPerChannel))),
   h('div',{className:'event444-plan'},h('h3',null,'Boss planı'),...draft.plan.map((row,index)=>h('div',{className:'event444-plan-row',key:index},h('label',null,'Boss',h('select',{value:row.kind,disabled:locked,onChange:e=>update(index,'kind',e.target.value)},...(value.catalog??[]).map(b=>h('option',{key:b.kind,value:b.kind},b.name)))),h('label',null,'Kanal',h('select',{value:row.channel,disabled:locked,onChange:e=>update(index,'channel',e.target.value)},...[1,2,3].map(n=>h('option',{key:n,value:n},'Kanal '+n)))),h('label',null,'Adet',h('input',{type:'number',min:1,max:8,step:1,value:row.count,disabled:locked,onChange:e=>update(index,'count',e.target.value)})),button('Kaldır',()=>{request.current=null;set(d=>{d.plan.splice(index,1);});}))),!draft.plan.length&&h('p',{className:'event444-empty'},'Henüz bir boss seçilmedi.'),h('div',{className:'event444-actions'},button('+ Boss ekle',()=>{request.current=null;set(d=>{d.plan.push({kind:value.catalog[0]?.kind??'world',channel:1,count:1});});},draft.plan.length>=21),button('Planı adaya gönder',()=>run('spawn_event_island',{plan:draft.plan}),!value.config.enabled||invalid||!draft.plan.length))),
   invalid&&h('p',{role:'alert',className:'event444-alert'},'Planın adetlerini ve kanal sınırlarını kontrol et; aktif bosslar da sınıra dahildir.'),status&&h('p',{role:'status'},status),
   h('h3',null,'Adadaki bosslar'),h('div',{className:'event444-current'},...(value.active??[]).filter(b=>b.hp>0).map(b=>h('article',{key:b.id},h('strong',null,b.name),h('small',null,'Kanal '+b.channel+' · '+Number(b.hp).toLocaleString('tr-TR')+' / '+Number(b.max_hp).toLocaleString('tr-TR')+' can')))),!(value.active??[]).some(b=>b.hp>0)&&h('p',{className:'event444-empty'},'Adada yaşayan boss yok.'),
   h('div',{className:'event444-actions'},...[1,2,3].map(channel=>button('Kanal '+channel+' bosslarını kaldır',()=>run('clear_event_island',{channel}),!counts[channel-1].active))),
   h('div',{className:'event444-gm'},h('h3',null,'GM duyurusu'),h('p',null,'Etkinlik mesajını oyunculara buradan yayınla.'),h(Composer,{author:'Oyun Yönetimi',send:(body,requestId,durationSeconds)=>sendGm({action:'announce',body,requestId,durationSeconds})}))
  );
 }
 return {Admin};
}

const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
const EMERALD_CATALOG444=['muhafiz','avci','arkanist'].flatMap(role=>['weapon','armor','helmet','necklace','shoes'].map(kind=>({id:`gear:${role}:${kind}:emerald`,name:emeraldName444(kind,role),type:'gear',kind,role,rarity:'emerald',group:'Kadim Zümrüt'})));
function emeraldIconStyle444(kind,role){if(kind==='armor')return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-armor-v447.webp)',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'};const col=kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(role)):Math.max(0,['helmet','necklace','shoes'].indexOf(kind));return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-set-v447.webp)',backgroundSize:'300% 200%',backgroundPosition:`${col*50}% ${kind==='weapon'?0:100}%`,backgroundRepeat:'no-repeat'};}
function emeraldGroundArt444(drop){if(drop.kind==='armor')return {src:'/game/emerald-armor-v447.webp',columns:1,rows:1,col:0,row:0,glyph:'◆',label:drop.item_name??emeraldName444('armor',drop.role),color:'#39c889',rarity:'emerald'};return {src:'/game/emerald-set-v447.webp',columns:3,rows:2,col:drop.kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(drop.role)):Math.max(0,['helmet','necklace','shoes'].indexOf(drop.kind)),row:drop.kind==='weapon'?0:1,glyph:'◆',label:drop.item_name??emeraldName444(drop.kind,drop.role),color:'#39c889',rarity:'emerald'};}
function emeraldGrantFields444(current,change,settings={}){const next={...current,...change};if(next.rarity!=='emerald')return next;return {...next,itemName:emeraldName444(next.kind,next.role),power:emeraldPower444(next.kind,settings)};}

/** Administrator quest editor; uses the existing signed admin action path. */
function createQuestsAdmin438(React){
 const h=React.createElement,copy=x=>JSON.parse(JSON.stringify(x)),maxAmount=item=>item?.type==='xp'?1000000:item?.id==='resource:core_coins'?100000:['resource','stone','material'].includes(item?.type)?10000:1;
 function Admin({value,busy,act}){
  const[draft,setDraft]=React.useState(()=>copy(value?.config||{enabled:true,quests:[]})),[revision,setRevision]=React.useState(value?.revision),[selected,setSelected]=React.useState(''),[message,setMessage]=React.useState(''),[saving,setSaving]=React.useState(false);const dirty=React.useRef(false),lock=React.useRef(false),catalog=value?.catalog||[],events=value?.eventTypes||[{id:'kill',label:'Canavar yenme'},{id:'fish',label:'Başarılı balık avı'},{id:'market',label:'Pazar öğretimi'},{id:'evolution',label:'İlk silah evrimi'}];
  React.useEffect(()=>{if(value?.config&&!dirty.current){setDraft(copy(value.config));setRevision(value.revision);}},[value?.revision]);
  const edit=fn=>{dirty.current=true;setDraft(old=>fn(old));setMessage('Kaydedilmemiş değişiklikler var.');};
  const change=(id,fields)=>edit(old=>({...old,quests:old.quests.map(q=>q.id===id?{...q,...fields}:q)}));
  const add=()=>{const id='quest_'+Date.now().toString(36);edit(old=>({...old,quests:[...old.quests,{id,title:'Yeni görev',description:'Görevin amacını ve yapılacakları yaz.',event:'kill',target:15,rewards:[]}]}));setSelected(id);};
  const save=async()=>{if(lock.current||busy)return;lock.current=true;setSaving(true);setMessage('');try{const r=await act({action:'quests_save',config:draft,revision});if(r?.quests438){dirty.current=false;setDraft(copy(r.quests438.config));setRevision(r.quests438.revision);setMessage('Görevler ve ödüller kaydedildi. Oyuncunun alınmış ödülleri korunur.');}else setMessage('Kaydedilemedi. Yönetim bildirimini kontrol et; değişikliklerin burada duruyor.');}catch(e){setMessage(e.message||'Görevler kaydedilemedi.');}finally{lock.current=false;setSaving(false);}};
  const q=draft.quests.find(q=>q.id===selected)||draft.quests[0],locked=!!busy||saving;
  const rewardChange=(index,fields)=>change(q.id,{rewards:q.rewards.map((r,i)=>i===index?{...r,...fields}:r)});
  if(!value?.config)return h('section',{className:'quests438-admin'},h('h2',null,'Görevler'),h('p',null,'Görev ayarları alınıyor…'));
  return h('section',{className:'quests438-admin'},h('header',null,h('div',null,h('small',null,'OYUNCUNUN İLK ADIMLARI'),h('h2',null,'Görevler ve Ödüller'),h('p',null,'Görevler listede sırayla açılır. Mevcut görevin kimliği ve alınmış ödülleri korunur.')),h('label',{className:'quests438-switch'},h('input',{type:'checkbox',checked:!!draft.enabled,disabled:locked,onChange:e=>edit(x=>({...x,enabled:e.target.checked}))}),' Görevler etkin')),
   h('div',{className:'quests438-admin-layout'},h('nav',{'aria-label':'Düzenlenecek görev'},...draft.quests.map((item,i)=>h('button',{type:'button',key:item.id,className:q?.id===item.id?'is-selected':'',onClick:()=>setSelected(item.id)},h('b',null,String(i+1).padStart(2,'0')),item.title)),h('button',{type:'button',disabled:locked||draft.quests.length>=40,onClick:add},'+ Yeni görev')),
    q&&h('div',{className:'quests438-editor'},h('div',{className:'quests438-fields'},h('label',null,'Görev adı',h('input',{value:q.title,maxLength:80,disabled:locked,onChange:e=>change(q.id,{title:e.target.value})})),h('label',null,'Hedef türü',h('select',{value:q.event,disabled:locked,onChange:e=>change(q.id,{event:e.target.value,target:['market','evolution'].includes(e.target.value)?1:q.target})},...events.map(e=>h('option',{key:e.id,value:e.id},e.label)))),h('label',null,'Hedef miktarı',h('input',{type:'number',inputMode:'numeric',min:1,max:100000,step:1,value:q.target,disabled:locked,onChange:e=>change(q.id,{target:Number(e.target.value)})}))),h('label',null,'Oyuncuya açıklama',h('textarea',{value:q.description,rows:3,maxLength:500,disabled:locked,onChange:e=>change(q.id,{description:e.target.value})})),h('small',null,'Kalıcı görev kimliği: ',q.id),h('h3',null,'Ödüller'),h('p',null,'Sınıfa uygun mavi silah/zırh seçeneği rastgele 4 efsun verir. Kaynakları ve diğer oyun eşyalarını ayrı ödül olarak ekleyebilirsin.'),
     ...q.rewards.map((reward,index)=>{const meta=catalog.find(x=>(x.id??x.itemId)===reward.itemId);return h('div',{className:'quests438-reward-edit',key:index},h('label',null,'Eşya / kaynak',h('select',{value:reward.itemId,disabled:locked,onChange:e=>{const chosen=catalog.find(item=>(item.id??item.itemId)===e.target.value);rewardChange(index,{itemId:e.target.value,amount:1,...(['gear','rune'].includes(chosen?.type)?{power:chosen.type==='rune'?1:20}:{})});}},...catalog.map(item=>h('option',{key:item.id??item.itemId,value:item.id??item.itemId},item.name||item.label||item.id)))),h('label',null,'Adet',h('input',{type:'number',min:1,max:maxAmount(meta),step:1,value:reward.amount,disabled:locked||maxAmount(meta)===1,onChange:e=>rewardChange(index,{amount:Number(e.target.value)})})),['gear','rune'].includes(meta?.type)&&h('label',null,meta.type==='rune'?'Rün seviyesi':'Eşya gücü',h('input',{type:'number',min:1,max:100000,value:reward.power??20,disabled:locked,onChange:e=>rewardChange(index,{power:Number(e.target.value)})})),h('button',{type:'button',disabled:locked,onClick:()=>change(q.id,{rewards:q.rewards.filter((_,i)=>i!==index)}),'aria-label':'Ödülü kaldır'},'Kaldır'));}),h('button',{type:'button',disabled:locked||q.rewards.length>=6,onClick:()=>change(q.id,{rewards:[...q.rewards,{itemId:'resource:gems',amount:10}]})},'+ Ödül ekle'))),
   h('footer',null,h('button',{type:'button',className:'quests438-claim',disabled:locked||!dirty.current,onClick:save},saving?'Kaydediliyor…':'Görevleri kaydet'),h('p',{role:'status'},message)),h('p',{className:'quests438-admin-note'},'Statü ve yetenek yönlendirmeleri oyuncunun seviyesine, kullanılmamış puanına ve mücevherine göre görünür. İpuçları kapatılabilir; hiçbir eşya otomatik satılmaz veya harcanmaz.'));
 }
 return {Admin};
}

export function createLaunchModeUI438(React, fetcher = fetch) {
  const h = React.createElement;
  const opening478 = Date.parse('2026-10-10T19:00:00+03:00');
  const options = [
    ['scheduled', '10 Ekim · Otomatik açılış', 'Cumartesi 19.00’da (Türkiye saati) oyuncu erişimi kendiliğinden açılır ve açık kalır. Kayıtlar şimdiden alınabilir.'],
    ['closed', 'Elle kapalı · Ön kayıt', 'Oyuncu erişimi kapalı kalır; sayaç dolsa da otomatik açılmaz. İzinli hesapların test erişimi korunur.'],
    ['open', 'Oyun açık', 'Ziyaretçiler kayıt olabilir veya hesaplarına giriş yapabilir.'],
    ['maintenance', 'Bakım modu', 'Oyundaki herkes, yöneticiler dahil, 10 saniyelik uyarıdan sonra bakım ekranına alınır. Yönetim paneline erişim korunur.']
  ];
  return function LaunchModePanel438() {
    const [draft, setDraft] = React.useState(null), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState('');
    const mounted = React.useRef(false), lock = React.useRef(false);
    React.useEffect(() => {
      mounted.current = true;
      let current = true;
      const controller = new AbortController();
      fetcher('/api/admin/launch', {cache:'no-store', signal:controller.signal}).then(async response => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Durum alınamadı.');
        if (current) setDraft(data.settings);
      }).catch(error => { if (current && error.name !== 'AbortError') setNotice(error.message); });
      return () => { current = false; mounted.current = false; controller.abort(); };
    }, []);
    const mode = draft?.mode === 'maintenance' ? 'maintenance' : draft?.mode === 'open' || draft?.enabled === 0 ? 'open' : draft?.mode === 'scheduled' && draft?.public_opens_at > 0 ? 'scheduled' : 'closed';
    const save = async () => {
      if (lock.current || !draft) return;
      lock.current = true; setBusy(true); setNotice('');
      try {
        const response = await fetcher('/api/admin/launch', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'save', settings:{...draft, enabled:1, mode}})});
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Durum kaydedilemedi.');
        if (mounted.current) { setDraft(data.settings); setNotice(mode === 'maintenance' ? 'Bakım kaydedildi. Oyundaki oyuncular sunucunun 10 saniyelik süresi dolunca bakım ekranına alınır.' : 'Oyun durumu kaydedildi.'); }
      } catch (error) { if (mounted.current) setNotice(error.message); }
      finally { lock.current = false; if (mounted.current) setBusy(false); }
    };
    return h('section', {className:'admin-card status438-panel status491fix1-panel'},
      h('div', {className:'status491fix1-heading'}, h('h2', null, 'Oyun Durumu'), h('p', null, 'Açılış ekranını ve oyuncu erişimini yönet. Değişiklikler Kaydet düğmesine bastığında uygulanır.')),
      draft && h(React.Fragment, null,
        h('div', {className:'status491fix1-options', role:'group', 'aria-label':'Oyun durumu'}, ...options.map(([id,label,description]) =>
          h('button', {key:id, type:'button', className:'status491fix1-option', disabled:busy, 'aria-pressed':mode===id, onClick:() => { if (!lock.current) setDraft({...draft, enabled:1, mode:id, ...(id==='scheduled' ? {public_opens_at:opening478} : {})}); }},
            h('span', {className:'status491fix1-option-title'}, h('span', {className:'status491fix1-choice', 'aria-hidden':true}, mode===id ? '✓' : ''), h('strong', null, label)), h('small', null, description)))),
        mode === 'scheduled' && h('p', {className:'status491fix1-info'}, '10 Ekim 2026 Cumartesi, 19.00 · Türkiye saati (UTC+03:00). Bitiş tarihi yoktur; eski beta takvimi ve hediye kayıtları değiştirilmez.'),
        h('label', {className:'status491fix1-label'}, 'Bakım açıklaması', h('textarea', {value:draft.maintenance_text??'', rows:4, maxLength:2000, disabled:busy, placeholder:'Oyuncuların bakım ekranında göreceği açıklamayı yaz…', onChange:event => { if (!lock.current) setDraft({...draft, maintenance_text:event.target.value}); }})),
        h('p', {className:'status491fix1-hint'}, 'Kaydettiğin açıklama açık bakım ekranlarında yaklaşık 5 saniyede yenilenir.'),
        h('div', {className:'status491fix1-footer'}, h('button', {type:'button', className:'status491fix1-save', disabled:busy, onClick:save}, busy ? 'Kaydediliyor…' : 'Durumu ve açıklamayı kaydet'))),
      notice && h('p', {className:'status491fix1-notice', role:'status'}, notice), !draft && !notice && h('p', null, 'Durum yükleniyor…'));
  };
}


// Kept import-free so the native runtime can share this exact React factory.
function createBattlePassAdmin434(React) {
  const h = React.createElement;
  const fmt = n => Number(n || 0).toLocaleString('tr-TR');
  const clone = config => ({ ...config, tiers: (config?.tiers || []).map(tier => ({ ...tier, free: tier.free ? { ...tier.free } : null, premium: tier.premium ? { ...tier.premium } : null })) });
  const defaults = () => ({ enabled: false, title: 'Kadim Miras', price: 1000, durationDays: 20, tiers: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, xp: Math.ceil(200000 * (i + 1) / 30), free: null, premium: null })) });
  const integer = value => value === '' ? NaN : Number(value);
  const maxAmount = item => item?.id === 'resource:core_coins' ? 100000 : ['resource', 'material', 'stone'].includes(item?.type) ? 10000 : 1;
  const powerDefault = item => item?.type === 'rune' ? 1 : ({ white: 10, blue: 20, orange: 35, red: 50, purple: 70, unique: 90, infinite: 100 ,emerald:265}[item?.rarity] || 10);
  const date = value => { const n = Number(value); return n > 0 ? new Date(n < 1e12 ? n * 1000 : n).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Henüz başlamadı'; };

  function Mark() {
    return h('svg', { viewBox: '0 0 48 48', fill: 'none', 'aria-hidden': true }, h('path', { d: 'M24 3 40 12v21L24 45 8 33V12L24 3Z', stroke: 'currentColor', strokeWidth: 1.8 }), h('path', { d: 'm24 10 9 14-9 14-9-14 9-14Zm0 0v28M15 24h18', stroke: 'currentColor', strokeWidth: 1.4 }), h('path', { d: 'm7 20-4 4 4 4m34-8 4 4-4 4', stroke: 'currentColor', strokeWidth: 1.5 }));
  }

  function Admin({ value, busy, act }) {
    const [draft, setDraft] = React.useState(() => clone(value?.config || defaults()));
    const [revision, setRevision] = React.useState(value?.revision);
    const [count, setCount] = React.useState(() => value?.config?.tiers?.length || 30);
    const [finalXp, setFinalXp] = React.useState(() => value?.config?.tiers?.at(-1)?.xp || 200000);
    const [editing, setEditing] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [error, setError] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [confirmStart, setConfirmStart] = React.useState(false);
    /* colBattlePassEnd469 */
    const [accepted469, setAccepted469] = React.useState(null);
    const [confirmStop469, setConfirmStop469] = React.useState(null);
    const mounted469 = React.useRef(true);
    React.useEffect(() => { mounted469.current = true; return () => { mounted469.current = false; }; }, []);
    const currentValue469 = accepted469 && Number(accepted469.revision) > Number(value?.revision ?? -1) ? accepted469 : value;
    const latest469 = React.useRef(currentValue469); latest469.current = currentValue469;
    const dirty = React.useRef(false), lock = React.useRef(false);
    const catalog = value?.catalog || [];
    const items = React.useMemo(() => new Map(catalog.map(item => [item.id, item])), [catalog]);
    const groups = React.useMemo(() => { const out = new Map(); for (const item of catalog) { const key = item.group || 'Diğer'; if (!out.has(key)) out.set(key, []); out.get(key).push(item); } return [...out]; }, [catalog]);
    const season = currentValue469?.season;
    const active = season?.status === 'active' || season?.status === 'paused';
    const locked = !!busy || saving;
    const coins = draft.tiers.reduce((sum, tier) => sum + (tier.premium?.itemId === 'resource:core_coins' ? Number(tier.premium.amount) || 0 : 0), 0);
    const freeCoins = draft.tiers.reduce((sum, tier) => sum + (tier.free?.itemId === 'resource:core_coins' ? Number(tier.free.amount) || 0 : 0), 0);

    const accept = settings => {
      setAccepted469(settings); setConfirmStop469(null);
      dirty.current = false;
      setDraft(clone(settings.config)); setRevision(settings.revision);
      setCount(settings.config.tiers.length); setFinalXp(settings.config.tiers.at(-1)?.xp || 200000);
      setEditing(''); setConfirmStart(false);
    };
    React.useEffect(() => { if (currentValue469?.config && !dirty.current) accept(currentValue469); }, [value?.revision]);
    const change = next => { dirty.current = true; setDraft(old => typeof next === 'function' ? next(old) : { ...old, ...next }); setError(''); setMessage('Kaydedilmemiş değişiklikler var.'); setConfirmStart(false); };
    const changeTier = (id, key, reward) => change(old => ({ ...old, tiers: old.tiers.map(tier => tier.id === id ? { ...tier, [key]: reward } : tier) }));
    const fail = text => { setError(text); setMessage(''); };

    function validate() {
      if (!draft.title?.trim() || draft.title.trim().length > 64) throw Error('Sezon adı 1–64 karakter olmalı.');
      if (!Number.isSafeInteger(integer(draft.price)) || draft.price < 1 || draft.price > 1000000) throw Error('Bilet fiyatı 1–1.000.000 ÇP arasında tam sayı olmalı.');
      if (!Number.isSafeInteger(integer(draft.durationDays)) || draft.durationDays < 1 || draft.durationDays > 365) throw Error('Sezon süresi 1–365 gün arasında olmalı.');
      if (!draft.tiers.length || draft.tiers.length > 100) throw Error('Kademe sayısı 1–100 arasında olmalı.');
      let previous = -1;
      for (const tier of draft.tiers) {
        if (!Number.isSafeInteger(integer(tier.xp)) || tier.xp < 1 || tier.xp <= previous || tier.xp > 9000000000000) throw Error(tier.id + '. kademenin toplam tecrübe hedefi önceki kademeden büyük olmalı.');
        previous = tier.xp;
        if (!tier.free && !tier.premium) throw Error(tier.id + '. kademeye en az bir ödül ekle.');
        for (const track of ['premium', 'free']) {
          const reward = tier[track]; if (!reward) continue;
          const item = items.get(reward.itemId);
          if (!item) throw Error(tier.id + '. kademede geçerli bir ödül seç.');
          if (!Number.isSafeInteger(integer(reward.amount)) || reward.amount < 1 || reward.amount > maxAmount(item)) throw Error(tier.id + '. kademedeki ' + item.name + ' adedi 1–' + fmt(maxAmount(item)) + ' arasında olmalı.');
          if (['gear', 'rune'].includes(item.type) && (!Number.isSafeInteger(integer(reward.power)) || reward.power < (item.type === 'rune' ? 1 : 0) || reward.power > 100000)) throw Error(tier.id + '. kademedeki eşya gücü / rün seviyesi geçersiz.');
        }
      }
      return { ...draft, title: draft.title.trim() };
    }

    async function save() {
      if (lock.current || locked) return;
      let config; try { config = validate(); } catch (e) { fail(e.message); return; }
      lock.current = true; setSaving(true); setError('');
      try {
        const result = await act({ action: 'battle_pass_save', config, revision });
        if (result?.battlePass) { accept(result.battlePass); setMessage('Sezon taslağı kaydedildi. Başlangıç düğmesine basılmadan yeni sezon açılmaz.'); }
        else fail('Taslak kaydedilemedi. Yönetim bildirimindeki açıklamayı kontrol et; değişikliklerin burada duruyor.');
      } catch (e) { fail(e.message || 'Taslak kaydedilemedi.'); }
      finally { lock.current = false; setSaving(false); }
    }

    async function start() {
      if (lock.current || locked || dirty.current || active) return;
      lock.current = true; setSaving(true); setError('');
      try {
        const result = await act({ action: 'battle_pass_start', revision });
        if (result?.battlePass) { accept(result.battlePass); setMessage('Sezon başladı. Oyuncular Nesne Market > Savaş Bileti bölümünden katılabilir.'); }
        else fail('Sezon başlatılamadı. Yönetim bildirimindeki açıklamayı kontrol et.');
      } catch (e) { fail(e.message || 'Sezon başlatılamadı.'); }
      finally { lock.current = false; setSaving(false); }
    }

    function openStop469() {
      if (lock.current || locked || !active || !season?.id) return;
      if (confirmStop469) { setConfirmStop469(null); return; }
      try {
        setConfirmStart(false); setError('');
        setConfirmStop469({ seasonId: season.id, revision: currentValue469.revision, title: season.title || season.config?.title || 'Savaş Bileti', requestId: globalThis.crypto.randomUUID() });
      } catch { fail('İşlem kimliği oluşturulamadı. Paneli yenileyip tekrar dene.'); }
    }

    async function stop469() {
      const token = confirmStop469, current = latest469.current;
      if (!token || lock.current || locked) return;
      if (current?.season?.id !== token.seasonId || current?.revision !== token.revision || !['active', 'paused'].includes(current?.season?.status)) {
        setConfirmStop469(null); fail('Sezon bilgileri değişti. Güncel sezonu kontrol edip yeniden onayla.'); return;
      }
      lock.current = true; setSaving(true); setError('');
      try {
        const result = await act({ action: 'battle_pass_end', seasonId: token.seasonId, revision: token.revision, requestId: token.requestId });
        if (!mounted469.current) return;
        const settings = result?.battlePass, latest = latest469.current;
        if (!settings?.config || settings.season?.id !== token.seasonId || settings.season?.status !== 'ended' || !Number.isSafeInteger(settings.revision) || settings.revision < token.revision) {
          fail('Sezon durdurulamadı. Yönetim bildirimindeki açıklamayı kontrol et; aynı onayla tekrar deneyebilirsin.'); return;
        }
        if (Number(latest?.revision) > settings.revision || (Number(latest?.revision) >= settings.revision && latest?.season?.id !== settings.season.id)) {
          setConfirmStop469(null); fail('Sezon bilgileri bu sırada değişti. Güncel durumu kontrol et.'); return;
        }
        if (dirty.current) {
          setAccepted469(settings);
          if (revision === token.revision) setRevision(settings.revision);
          setConfirmStop469(null); setConfirmStart(false);
        } else accept(settings);
        setMessage(dirty.current ? 'Sezon durduruldu. Taslağın korunuyor; kaydettikten sonra yeni sezonu hemen başlatabilirsin.' : 'Sezon durduruldu. Hazır taslakla yeni sezonu hemen başlatabilirsin.');
      } catch (e) { if (mounted469.current) fail(e.message || 'Sezon durdurulamadı. Aynı onayla tekrar deneyebilirsin.'); }
      finally { lock.current = false; if (mounted469.current) setSaving(false); }
    }

    function resize() {
      const n = integer(count);
      if (!Number.isSafeInteger(n) || n < 1 || n > 100) return fail('Kademe sayısı 1–100 arasında olmalı.');
      change(old => {
        const last = old.tiers.at(-1)?.xp || 0, step = Math.max(1, Math.ceil(last / Math.max(1, old.tiers.length)));
        return { ...old, tiers: Array.from({ length: n }, (_, i) => old.tiers[i] || { id: i + 1, xp: last + step * (i + 1 - old.tiers.length), free: null, premium: null }) };
      }); setEditing('');
    }

    function spread() {
      const n = integer(finalXp);
      if (!Number.isSafeInteger(n) || n < draft.tiers.length || n > 9000000000000) return fail('Son hedef, kademe sayısından küçük olmayan bir tam sayı olmalı (en fazla 9 trilyon).');
      change(old => ({ ...old, tiers: old.tiers.map((tier, i) => ({ ...tier, xp: Math.ceil(n * (i + 1) / old.tiers.length) })) }));
    }

    function Reward({ tier, track }) {
      const reward = tier[track], item = reward && items.get(reward.itemId), key = tier.id + ':' + track;
      const open = editing === key;
      return h('div', { className: 'bp434-reward-cell ' + track },
        h('small', { className: 'bp434-track-label' }, track === 'premium' ? 'PREMIUM' : 'ÜCRETSİZ'),
        h('button', { className: 'bp434-reward-pick', type: 'button', disabled: locked, 'aria-expanded': open, 'aria-label': tier.id + '. kademe ' + (track === 'premium' ? 'premium' : 'ücretsiz') + ' ödülünü düzenle', onClick: () => setEditing(open ? '' : key) },
          h('span', { className: 'bp434-reward-icon', 'aria-hidden': true }, item?.image ? h('img', { src: item.image, alt: '', loading: 'lazy', decoding: 'async' }) : item?.id === 'resource:core_coins' ? 'ÇP' : h(Mark)),
          h('span', null, h('strong', null, item?.name || (reward ? 'Seçilen eşya' : 'Ödül seç')), h('small', null, reward ? fmt(reward.amount) + ' adet' + (item?.type === 'rune' ? ' · Sv. ' + reward.power : item?.type === 'gear' ? ' · Güç ' + reward.power : '') : 'Bu kademede ödül yok')),
          h('span', { className: 'bp434-edit-label' }, open ? 'Kapat' : 'Düzenle')),
        open && h('div', { className: 'bp434-reward-editor' },
          h('label', null, 'Ödül', h('select', { value: reward?.itemId || '', disabled: locked, onChange: e => { const next = items.get(e.target.value); changeTier(tier.id, track, next ? { itemId: next.id, amount: 1, ...(['gear', 'rune'].includes(next.type) ? { power: powerDefault(next) } : {}) } : null); } }, h('option', { value: '' }, 'Ödül yok'), ...groups.map(([name, list]) => h('optgroup', { key: name, label: name }, ...list.map(x => h('option', { key: x.id, value: x.id }, x.name)))))),
          reward && item && h('div', { className: 'bp434-reward-inputs' }, h('label', null, 'Adet', h('input', { type: 'number', inputMode: 'numeric', min: 1, max: maxAmount(item), step: 1, value: reward.amount, disabled: locked || maxAmount(item) === 1, onChange: e => changeTier(tier.id, track, { ...reward, amount: e.target.value === '' ? '' : Number(e.target.value) }) })), ['gear', 'rune'].includes(item.type) && h('label', null, item.type === 'rune' ? 'Rün seviyesi' : 'Eşya gücü', h('input', { type: 'number', inputMode: 'numeric', min: item.type === 'rune' ? 1 : 0, max: 100000, step: 1, value: reward.power ?? powerDefault(item), disabled: locked, onChange: e => changeTier(tier.id, track, { ...reward, power: e.target.value === '' ? '' : Number(e.target.value) }) })))));
    }

    if (!value?.config) return h('section', { className: 'bp434-admin' }, h('h2', null, 'Savaş Bileti'), h('p', { role: 'status' }, 'Bilet ayarları yükleniyor…'));
    return h('section', { className: 'bp434-admin' },
      h('header', { className: 'bp434-admin-hero' }, h('div', { className: 'bp434-admin-mark' }, h(Mark)), h('div', null, h('small', null, 'CORE OF LIFE · SEZON YÖNETİMİ'), h('h2', null, 'Savaş Bileti'), h('p', null, 'Oynadıkça ilerle. Her kademede yeni bir ödül.'))),
      season?.id && h('section', { className: 'bp434-live-season' }, h('div', null, h('small', null, 'YAYINDAKİ SEZON'), h('strong', null, season.title || season.config?.title || 'Savaş Bileti'), h('span', { className: 'bp434-state ' + (active ? 'active' : '') }, ({ active: 'Sezon açık', paused: 'Erişim kapalı', ended: 'Sona erdi', draft: 'Taslak' }[season.status] || 'Taslak'))), h('p', null, 'Başlangıç: ', date(season.startsAt), h('br'), 'Bitiş: ', date(season.endsAt)), h('small', null, 'Yayındaki sezonun ödülleri, hedefleri ve süresi korunur. Aşağıdaki taslak bir sonraki sezon içindir.')),
      h('div', { className: 'bp434-admin-heading' }, h('div', null, h('h3', null, 'Yeni sezon ayarları'), h('p', null, 'Tecrübe hedefleri sezon boyunca kazanılan toplam puandır; her kademede sıfırlanmaz.')), h('span', { className: 'bp434-state' }, dirty.current ? 'Kaydedilmedi' : 'Taslak')),
      h('div', { className: 'bp434-admin-stats' }, ...[[fmt(draft.price) + ' ÇP', 'Bilet fiyatı'], [draft.durationDays + ' gün', 'Sezon süresi'], [draft.tiers.length, 'Ödül kademesi'], [fmt(coins) + ' ÇP', 'Premium geri kazanım']].map(([number, label]) => h('div', { key: label }, h('strong', null, number), h('small', null, label)))),
      h('div', { className: 'bp434-admin-fields' },
        h('label', { className: 'bp434-name' }, 'Sezon adı', h('input', { value: draft.title, maxLength: 64, disabled: locked, onChange: e => change({ title: e.target.value }) })),
        h('label', null, 'Premium fiyatı · ÇP', h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 1000000, value: draft.price, disabled: locked, onChange: e => change({ price: e.target.value === '' ? '' : Number(e.target.value) }) })),
        h('label', null, 'Sezon süresi · gün', h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 365, value: draft.durationDays, disabled: locked, onChange: e => change({ durationDays: e.target.value === '' ? '' : Number(e.target.value) }) }))),
      h('div', { className: 'bp434-enabled' }, h('span', null, h('strong', null, 'Önce tasarla, sonra sezonu aç'), h('small', null, 'Taslağı kaydetmek sezonu başlatmaz. Süre, ödüller ve tecrübe hedefleri “Sezonu başlat” ile o sezon için sabitlenir.'))),
      h('div', { className: 'bp434-tier-tools' },
        h('div', null, h('label', null, 'Kademe sayısı', h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 100, value: count, disabled: locked, onChange: e => setCount(e.target.value === '' ? '' : Number(e.target.value)) })), h('button', { type: 'button', disabled: locked || Number(count) === draft.tiers.length, onClick: resize }, 'Sayısını uygula')),
        h('div', null, h('label', null, 'Son ödül için toplam tecrübe', h('input', { type: 'number', inputMode: 'numeric', min: draft.tiers.length, max: 9000000000000, value: finalXp, disabled: locked, onChange: e => setFinalXp(e.target.value === '' ? '' : Number(e.target.value)) })), h('button', { type: 'button', disabled: locked, onClick: spread }, 'Hedefleri eşit dağıt'))),
      h('p', { className: 'bp434-admin-note' }, 'Her hedefi ve iki hattın ödülünü aşağıdan ayrı ayrı değiştirebilirsin. Premium ÇP toplamı ödüllerden hesaplanır; ilk sezon önerisi 300 ÇP.', freeCoins > 0 ? ' Ücretsiz hatta ayrıca ' + fmt(freeCoins) + ' ÇP var.' : ''),
      h('div', { className: 'bp434-tier-list' }, ...draft.tiers.map(tier => h('article', { className: 'bp434-tier-row', key: tier.id }, h('div', { className: 'bp434-tier-target' }, h('span', { className: 'bp434-tier-number' }, String(tier.id).padStart(2, '0')), h('label', null, 'Toplam tecrübe', h('input', { type: 'number', inputMode: 'numeric', min: 1, max: 9000000000000, step: 1, value: tier.xp, disabled: locked, 'aria-label': tier.id + '. kademe toplam tecrübe', onChange: e => changeTier(tier.id, 'xp', e.target.value === '' ? '' : Number(e.target.value)) }))), Reward({ tier, track: 'premium' }), Reward({ tier, track: 'free' })))),
      h('footer', { className: 'bp434-admin-footer' },
        error && h('p', { role: 'alert', className: 'bp434-admin-error' }, error), message && h('p', { role: 'status', className: 'bp434-admin-message' }, message),
        currentValue469?.revision !== revision && dirty.current && h('p', { className: 'bp434-admin-error' }, 'Canlı ayarlar başka bir işlemde değişti. Taslağın korunuyor. Kaydetmeden önce canlı taslağı yükleyip yeniden düzenle.'),
        h('div', { className: 'bp434-admin-actions' }, h('button', { type: 'button', disabled: locked || !dirty.current, onClick: () => { accept(currentValue469); setError(''); setMessage('Kaydedilmiş taslak yüklendi.'); } }, 'Kaydedilmiş taslağı yükle'), h('button', { type: 'button', className: 'bp434-primary', disabled: locked || !dirty.current, onClick: save }, saving ? 'İşleniyor…' : 'Taslağı kaydet'), h('button', { type: 'button', className: 'bp434-start', disabled: locked || dirty.current || active, onClick: () => setConfirmStart(v => !v) }, 'Sezonu başlat')),
        active && h('div', { className: 'bp434-admin-actions' }, h('button', { type: 'button', className: 'bp434-start', disabled: locked, onClick: openStop469 }, 'Sezonu Durdur')),
        active && h('small', null, 'Yeni sezonu hemen başlatmak için yayındaki sezonu önce durdurabilirsin.'),
        confirmStop469 && h('div', { className: 'bp434-start-confirm' }, h('strong', null, confirmStop469.title, ' sezonu durdurulsun mu?'), h('p', null, 'Bu sezonun süresi şimdi sona erer; yeni sezon ilerlemesi ve bilet satışı kapanır. Kazanılmış ödüller yeni sezon başlayana kadar alınabilir. Yeni sezonu başlattığında eski sezonun ödül alma dönemi de kapanır.'), h('div', null, h('button', { type: 'button', disabled: locked, onClick: () => setConfirmStop469(null) }, 'Vazgeç'), h('button', { type: 'button', className: 'bp434-primary', disabled: locked, onClick: stop469 }, saving ? 'İşleniyor…' : 'Evet, sezonu durdur'))),
        confirmStart && h('div', { className: 'bp434-start-confirm' }, h('strong', null, draft.title, ' sezonu açılsın mı?'), h('p', null, draft.durationDays, ' günlük süre şimdi başlayacak. ', draft.tiers.length, ' kademe, ', fmt(draft.price), ' ÇP premium fiyatı ve ', fmt(coins), ' ÇP geri kazanım bu sezon için sabitlenir.'), h('div', null, h('button', { type: 'button', disabled: locked, onClick: () => setConfirmStart(false) }, 'Vazgeç'), h('button', { type: 'button', className: 'bp434-primary', disabled: locked, onClick: start }, 'Evet, sezonu aç')))));
  }
  return { Admin };
}

function colSlowWorkView504(row,flags,now){
 const source=row?.slowWork504;
 if(flags?.slowWork===false||source?.enabled!==true)return null;
 const measured=Number.isFinite(now)?now:source.measuredAtMs;
 if(!Number.isFinite(measured))return null;
 const name=value=>typeof value==='string'&&/^[a-zA-Z0-9_.:-]{1,96}$/.test(value)?value:'unattributed';
 const validTime=value=>Number.isFinite(value)&&value>=measured-900000&&value<=measured+1000;
 const safeGc=value=>({count:Number.isInteger(value?.count)&&value.count>=0?value.count:0,totalMs:Number.isFinite(value?.totalMs)&&value.totalMs>=0?value.totalMs:0,maxMs:Number.isFinite(value?.maxMs)&&value.maxMs>=0?value.maxMs:0});
 const events=list=>(Array.isArray(list)?list:[]).filter(x=>x&&Number.isFinite(x.startedAtMs)&&x.startedAtMs<=measured+1000&&Number.isFinite(x.durationMs)&&x.durationMs>=0&&x.startedAtMs+x.durationMs>measured-900000&&(x.kind==='gc'||x.durationMs>50)).map(x=>({name:name(x.name),kind:x.kind==='gc'?'gc':'job',startedAtMs:x.startedAtMs,durationMs:x.durationMs}));
 const top=events(source.top).sort((a,b)=>b.durationMs-a.durationMs||b.startedAtMs-a.startedAtMs).slice(0,10);
 const intervals=(Array.isArray(source.busyWindows)?source.busyWindows:[]).filter(x=>x&&validTime(x.endedAtMs)&&Number.isFinite(x.startedAtMs)&&x.startedAtMs<=x.endedAtMs&&Number.isFinite(x.loopUtilization)&&x.loopUtilization>.9&&x.loopUtilization<=1).sort((a,b)=>b.endedAtMs-a.endedAtMs).slice(0,8).map(x=>({startedAtMs:x.startedAtMs,endedAtMs:x.endedAtMs,loopUtilization:x.loopUtilization,gc:safeGc(x.gc),top:(Array.isArray(x.top)?x.top:[]).filter(y=>y&&Number.isFinite(y.totalMs)&&y.totalMs>=0&&Number.isFinite(y.maxMs)&&y.maxMs>=0&&Number.isInteger(y.count)&&y.count>=0).sort((a,b)=>b.totalMs-a.totalMs).slice(0,5).map(y=>({name:name(y.name),totalMs:y.totalMs,maxMs:y.maxMs,count:y.count}))}));
 const gc=source.gc??{};
 return {top,intervals,gc:{...safeGc(gc),recent:events(gc.recent).slice(0,10)},droppedEvents:Number.isInteger(source.droppedEvents)&&source.droppedEvents>=0?source.droppedEvents:0,droppedGc:Number.isInteger(source.droppedGc)&&source.droppedGc>=0?source.droppedGc:0,stale:row.status!=='live'};
}
function colPlayerCount504(row,flags){
 if(flags?.channelCounts===false||!/^channel-[1-3]$/.test(row?.key??''))return null;
 if(flags?.channelCounts!==true&&!row.online504)return null;
 const online=row.online504,n=online?.count;
 return online?.status==='live'&&online.capacity===25&&Number.isSafeInteger(n)&&n>=0?String(n)+' / 25':'— / 25';
}
function colSlowWorkCard504(h,row,flags,now,fmt){
 const view=colSlowWorkView504(row,flags,now);if(!view)return null;
 const stamp=n=>new Date(n).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
 const list=rows=>h('ol',{style:{paddingLeft:18,margin:'8px 0',fontSize:12}},...rows.map((x,i)=>h('li',{key:i,style:{marginBottom:5,overflowWrap:'anywhere'}},h('strong',null,x.kind==='gc'?'GC · '+x.name:x.name),' · ',fmt(x.durationMs),' ms · ',h('time',{dateTime:new Date(x.startedAtMs).toISOString()},stamp(x.startedAtMs)))));
 return h('details',{className:'col-slow504',style:{borderTop:'1px solid #385346',marginTop:10,paddingTop:10,textAlign:'left'}},h('summary',{style:{cursor:'pointer',fontSize:12}},'Kaydedilen işler · Son 15 dk',view.stale?' · Son kayıt':''),
  h('p',{style:{fontSize:11,margin:'8px 0'}},'En uzun 10 iş. Ölçüm, kaydedilen eşzamanlı çalışma süresidir; bekleme ve tüm CPU işi değildir. İç içe işler ve GC süreleri örtüşebilir; toplanmaz.'),
  view.top.length?list(view.top):h('p',{style:{fontSize:12}},'50 ms üzerinde kaydedilen iş yok.'),
  h('p',{style:{fontSize:11}},'GC: ',view.gc.count,' duraklama · toplam ',fmt(view.gc.totalMs),' ms · en uzun ',fmt(view.gc.maxMs),' ms'),
  view.gc.recent.length>0&&h('details',null,h('summary',{style:{fontSize:11,cursor:'pointer'}},'Son GC duraklamaları'),list(view.gc.recent)),
  h('strong',{style:{fontSize:12}},'ELU %90 üzeri aralıklar'),
  view.intervals.length?view.intervals.map((x,i)=>h('details',{key:i,style:{marginTop:7}},h('summary',{style:{fontSize:11,cursor:'pointer'}},stamp(x.startedAtMs),'–',stamp(x.endedAtMs),' · %',fmt(x.loopUtilization*100)),h('ul',{style:{paddingLeft:17,fontSize:11}},...x.top.map((y,j)=>h('li',{key:j,style:{overflowWrap:'anywhere'}},y.name,' · ',fmt(y.totalMs),' ms toplam · ',y.count,' kez · en uzun ',fmt(y.maxMs),' ms'))),h('p',{style:{fontSize:11}},'Aralıktaki GC: ',x.gc.count,' · ',fmt(x.gc.totalMs),' ms · en uzun ',fmt(x.gc.maxMs),' ms'),!x.top.length&&h('p',{style:{fontSize:11}},'Bu aralıkta adı belirlenen iş yok.'))):h('p',{style:{fontSize:11}},'Kaydedilen yüksek yoğunluk aralığı yok.'),
  view.droppedEvents>0&&h('small',null,'Bellek sınırı nedeniyle elenen kayıt: ',view.droppedEvents),view.droppedGc>0&&h('small',{style:{display:'block'}},'GC kayıt sınırına ulaşıldı; bu toplam yalnız saklanan duraklamaları içerir.'));
}
function createLoadUI430(React,{fetcher=(...args)=>globalThis.fetch(...args)}={}){
 const h=React.createElement,fmt=n=>n===null||n===undefined?'—':Number(n).toLocaleString('tr-TR',{maximumFractionDigits:1});
function profileComponent507({React,fetcher}){
 const h=React.createElement,[target,setTarget]=React.useState('main'),[state,setState]=React.useState({state:'idle'}),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[refresh,setRefresh]=React.useState(0);
 const running=['starting','recording','finishing'].includes(state.state);
 React.useEffect(()=>{
  let stopped=false,timer=null,controller=null;
  async function poll(){
   controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);
   try{const r=await fetcher('/api/admin?cpu_profile507=status',{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('Profil durumu alınamadı.');const value=await r.json();if(!stopped){setState(value);setError('');if(['starting','recording','finishing'].includes(value.state))timer=setTimeout(poll,2000);}}
   catch(e){if(!stopped)setError('Profil durumu alınamadı. Durumu yenileyebilirsin.');}
   finally{clearTimeout(timeout);}
  }
  void poll();return()=>{stopped=true;clearTimeout(timer);controller?.abort();};
 },[refresh]);
 async function start(){
  setBusy(true);setError('');
  try{const r=await fetcher('/api/admin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'cpu_profile507',target}),signal:AbortSignal.timeout(10000)});const value=await r.json();if(!r.ok)throw Error(value.error??'Profil başlatılamadı.');setState(value);setRefresh(n=>n+1);}
  catch(e){setError(e.message??'Profil başlatılamadı.');setRefresh(n=>n+1);}
  finally{setBusy(false);}
 }
 const label=state.target==='main'?'Ana işlem':/^channel-[1-3]$/.test(state.target??'')?'Kanal '+state.target.slice(-1):'';
 return h('div',{className:'col-profile507',style:{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',margin:'12px 0',padding:12,border:'1px solid #385346',borderRadius:10}},
  h('label',{style:{display:'flex',alignItems:'center',gap:8}},'Profil alınacak süreç',h('select',{'aria-label':'Profil alınacak süreç',value:target,disabled:busy||running,onChange:e=>setTarget(e.target.value),style:{width:'auto',padding:'6px 10px'}},h('option',{value:'main'},'Ana işlem'),...[1,2,3].map(i=>h('option',{key:i,value:'channel-'+i},'Kanal '+i)))),
  h('button',{type:'button',disabled:busy||running,onClick:start},busy?'Başlatılıyor…':'60 saniyelik işlemci profili'),
  running&&h('span',{role:'status'},label+' · Profil alınıyor · '+Math.max(0,Math.ceil(((state.endsAtMs??Date.now())-Date.now())/1000))+' sn'),
  state.state==='ready'&&h('a',{href:'/api/admin?cpu_profile507=download&id='+encodeURIComponent(state.id),download:true,style:{textDecoration:'underline'}},label+' · .cpuprofile indir'),
  ['failed','expired'].includes(state.state)&&h('span',{role:'status'},state.state==='expired'?'Profilin saklama süresi doldu.':'Profil tamamlanamadı; süreç kapanmış olabilir.'),
  error&&h('span',{role:'alert'},error),h('button',{type:'button',disabled:busy,onClick:()=>setRefresh(n=>n+1)},'Durumu yenile'),
  h('small',{style:{flexBasis:'100%'}},'Yalnız ölçüm sırasında ek yük oluşturur. Aynı anda tek süreç ölçülür; hazır dosya 5 dakika saklanır.'));
}
 function Panel(){
  const [data,setData]=React.useState(null),[error,setError]=React.useState('');
  React.useEffect(()=>{
   let stopped=false,timer=null,inflight=null,sequence=0;
   async function refresh(){
    if(stopped||document.visibilityState==='hidden'||inflight)return;
    const controller=new AbortController(),id=++sequence;inflight=controller;
    const timeout=setTimeout(()=>controller.abort(),5000);
    try{
     const response=await fetcher('/api/admin?load=1',{cache:'no-store',signal:controller.signal});
     if(!response.ok)throw Error(response.status===403?'Yönetici oturumu gerekli.':'Ölçümler alınamadı.');
     const next=await response.json();if(!Array.isArray(next.rows))throw Error('Ölçüm henüz hazır değil.');
     if(!stopped&&id===sequence){setData(next);setError('');}
    }catch(e){if(!stopped&&id===sequence){setData(null);setError('Ölçümler yenilenemedi; tekrar deneniyor.');}}
    finally{clearTimeout(timeout);if(inflight===controller)inflight=null;if(!stopped&&document.visibilityState!=='hidden'&&id===sequence)timer=setTimeout(refresh,2000);}
   }
   function visibility(){clearTimeout(timer);sequence++;inflight?.abort();inflight=null;if(document.visibilityState==='hidden'){setData(null);setError('');}else void refresh();}
   document.addEventListener('visibilitychange',visibility);void refresh();
   return()=>{stopped=true;sequence++;clearTimeout(timer);inflight?.abort();document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const rows=data?.rows??[{key:'main',label:'Ana işlem'},...[1,2,3].map(i=>({key:'channel-'+i,label:'Kanal '+i})),{key:'realtime',label:'Realtime'}];
  return h('section',{className:'admin-card col-load430','aria-label':'Canlı işlem yükü'},
   h('header',null,h('div',null,h('small',null,'SUNUCU İŞLEMLERİ'),h('h2',null,'Canlı işlem yükü')),h('span',{className:'col-load430-live'},data?'● 2 sn ölçüm':'● Ölçüm bekleniyor')),
   h(profileComponent507,{React,fetcher}),h('p',null,'Ana işlem, her kanal ve realtime ayrı ölçülür. İşlem yoğunluğu, son 2 saniyede olay döngüsünün meşgul kaldığı paydır; VDS toplam CPU yüzdesi veya oyuncu pingi değildir.'),
   h('div',{className:'col-load430-grid'},...rows.map(r=>{
    const live=r.status==='live',level=!live?'unknown':r.busyPercent>=85?'high':r.busyPercent>=60?'medium':'low';
    return h('article',{key:r.key,'data-load':level},h('div',{className:'col-load430-title'},h('strong',null,r.label),h('small',null,!live?(r.status==='unavailable'?'Ulaşılamıyor':'Ölçüm bekleniyor'):level==='high'?'Yüksek':level==='medium'?'Artmış':'Düşük')),
     h('div',{className:'col-load430-number'},fmt(r.busyPercent),h('span',null,'%')),h('span',{className:'col-load430-label'},'İşlem yoğunluğu'),
     h('div',{className:'col-load430-meter',role:'meter','aria-label':r.label+' işlem yoğunluğu','aria-valuemin':0,'aria-valuemax':100,...(live?{'aria-valuenow':r.busyPercent}:{})},h('i',{style:{width:(r.busyPercent??0)+'%'}})),
     h('dl',null,h('div',null,h('dt',null,'Döngü gecikmesi'),h('dd',null,fmt(r.loopDelayMs)+' ms')),h('div',null,h('dt',null,'Bellek · RSS'),h('dd',null,fmt(r.memoryMb)+' MB')),colPlayerCount504(r,data?.flags504)!==null&&h('div',null,h('dt',null,'Oyuncu sayısı'),h('dd',null,colPlayerCount504(r,data?.flags504)))),colSlowWorkCard504(h,r,data?.flags504,data?.measuredAtMs,fmt));
   })),
   h('small',{className:'col-load430-note'},'Gecikme: son ölçüm aralığındaki en büyük döngü duraklaması. Renkler yalnız yoğunluğu özetler; tek başına lag kanıtı değildir. Panel görünürken yenilenir.'),
   error&&h('p',{role:'status',className:'col-load430-error'},error));
 }
 return {Panel};
}

const colStatusModel429=(()=>{const STATUS_CAP=64;
const STATUS_FIELDS=['attack','defense','hp'];
const STATUS_TYPES={attack:{label:'Güç',effect:'Saldırı',color:'#ff8c86',icon:'sword'},defense:{label:'Direnç',effect:'Savunma',color:'#85bdff',icon:'shield'},hp:{label:'Canlılık',effect:'Maksimum can',color:'#7ae8b4',icon:'heart'}};
function defaultStatusConfig(){return {enabled:true,attack:10,defense:10,hp:12};}
function validateStatusConfig(input){
 if(!input||typeof input.enabled!=='boolean')throw Error('Statü ayarı geçersiz.');
 const out={enabled:input.enabled};for(const k of STATUS_FIELDS){const n=input[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>30)throw Error('Statü bonusları %0–30 arasında olmalı.');out[k]=Math.round(n*100)/100;}return out;
}
function statusBudget(level){return Math.max(0,Math.min(65,Math.floor(Number(level)||1))-1)*3;}
function statusBonus(player,stat,config){
 if(!config?.enabled||!player)return 0;
 const a=Math.max(0,Math.min(64,Number(player.stat_attack)||0)),d=Math.max(0,Math.min(64,Number(player.stat_defense)||0)),h=Math.max(0,Math.min(64,Number(player.stat_hp)||0));
 const sum=a+d+h,ratio=Math.min(1,statusBudget(player.level)/Math.max(1,sum));
 return (stat==='attack'?a:stat==='defense'?d:h)*ratio/64*(Number(config[stat])||0)/100;
}
function validateStatusPoints(input,level){
 const out={};for(const k of STATUS_FIELDS){const n=input?.[k];if(!Number.isInteger(n)||n<0||n>64)throw Error('Her statü 0–64 tam puan olmalı.');out[k]=n;}
 if(out.attack+out.defense+out.hp>statusBudget(level))throw Error('Yeterli statü puanın yok.');return out;
}

return {STATUS_CAP,STATUS_FIELDS,STATUS_TYPES,defaultStatusConfig,validateStatusConfig,statusBudget,statusBonus,validateStatusPoints};})();
function createStatusUI429(React,{fetcher,post,Button='button'}){
 const h=React.createElement,M=colStatusModel429,T=M.STATUS_TYPES,fmt=n=>Number(n).toLocaleString('tr-TR',{maximumFractionDigits:3});
 function Icon({kind='attack'}){const paths={attack:'M14 3h7v7l-9 9-7-7 9-9ZM3 21l5-5M3 13l8 8M14 3l7 7',defense:'M12 3 3 7v5c0 5 9 10 9 10s9-5 9-10V7l-9-4Zm0 5v9m-4-5h8',hp:'M12 21C8 17 2 13 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 5-6 9-10 13Z'};return h('svg',{viewBox:'0 0 24 24',width:24,height:24,fill:'none',stroke:'currentColor',strokeWidth:1.7,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},h('path',{d:paths[kind]}));}
 function Entry({own,onChanged}){
  const [open,setOpen]=React.useState(false),[state,setState]=React.useState(null),[draft,setDraft]=React.useState(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[message,setMessage]=React.useState('');
  const dialog=React.useRef(null),lock=React.useRef(false),generation=React.useRef(0);
  React.useEffect(()=>{if(!open)return;const d=dialog.current;if(d&&!d.open)d.showModal();const close=()=>setOpen(false);window.addEventListener('coreoflife:bot-check',close);return()=>{window.removeEventListener('coreoflife:bot-check',close);if(d?.open)d.close();};},[open]);
  React.useEffect(()=>{if(!open)return;const abort=new AbortController(),version=++generation.current;setState(null);setDraft(null);setError('');setMessage('');fetcher('/api/ranks?view=status',{cache:'no-store',signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Statüler alınamadı.');if(version!==generation.current)return;setState(data);setDraft({...data.points});}).catch(e=>{if(e.name!=='AbortError'&&version===generation.current)setError(e.message);});return()=>{generation.current++;abort.abort();};},[open,own?.id]);
  const available=state&&draft?state.total-draft.attack-draft.defense-draft.hp:0;
  const dirty=!!state&&!!draft&&M.STATUS_FIELDS.some(k=>state.points[k]!==draft[k]);
  const change=(key,n)=>{if(busy)return;setMessage('');setDraft(old=>{const spare=state.total-old.attack-old.defense-old.hp,next=Math.max(0,Math.min(64,old[key]+Math.min(n,spare)));return {...old,[key]:n<0?Math.max(0,old[key]+n):next};});};
  const save=async()=>{if(lock.current||!state||!draft)return;lock.current=true;setBusy(true);setError('');setMessage('');const version=generation.current;try{const r=await post('/api/ranks',{action:'status_allocate',points:draft,revision:state.revision,settingsRevision:state.settings.revision});if(version===generation.current){setState(r.state);setDraft({...r.state.points});setMessage('Statü puanların uygulandı.');}await onChanged?.();}catch(e){if(version===generation.current)setError(e.message||'Puanlar kaydedilemedi.');}finally{lock.current=false;setBusy(false);}};
  return h(React.Fragment,null,h(Button,{type:'button',className:'status429-entry',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();setOpen(true);}},h(Icon,{}),' Statü'),open&&h('dialog',{ref:dialog,className:'status429-dialog','aria-labelledby':'status429-title',onCancel:()=>setOpen(false),onClose:()=>setOpen(false),onPointerDown:e=>e.stopPropagation(),onClick:e=>e.stopPropagation()},
   h('header',null,h('div',null,h('small',null,'KARAKTER GELİŞİMİ'),h('h2',{id:'status429-title'},'Statü')),h('button',{type:'button',onClick:()=>setOpen(false),'aria-label':'Statü penceresini kapat'},'×')),
   error&&h('p',{className:'status429-error',role:'alert'},error),!state&&!error&&h('p',{role:'status'},'Statü puanları alınıyor…'),
   state&&draft&&h(React.Fragment,null,h('div',{className:'status429-summary'},h('span',null,'Seviye ',state.level),h('strong',null,available,' boş puan'),h('span',null,'Toplam ',state.total)),!state.settings.config.enabled&&h('p',{role:'status'},'Statü sistemi yönetim tarafından kapatıldı.'),
    h('div',{className:'status429-grid'},...M.STATUS_FIELDS.map(key=>{const item=T[key],percent=draft[key]/64*state.settings.config[key];return h('section',{key,className:'status429-card',style:{'--status-color':item.color}},h('div',{className:'status429-icon'},h(Icon,{kind:key})),h('h3',null,item.label),h('small',null,item.effect),h('b',{className:'status429-bonus'},'+%',fmt(percent)),h('div',{className:'status429-track'},h('i',{style:{width:draft[key]/64*100+'%'}})),h('div',{className:'status429-counter'},h('button',{type:'button',disabled:busy||draft[key]<=0||!state.settings.config.enabled,onClick:()=>change(key,-1),'aria-label':item.label+' puanını azalt'},'−'),h('strong',null,draft[key],h('small',null,' / 64')),h('button',{type:'button',disabled:busy||available<=0||draft[key]>=64||!state.settings.config.enabled,onClick:()=>change(key,1),'aria-label':item.label+' puanını artır'},'+')),h('button',{className:'status429-add',type:'button',disabled:busy||available<=0||draft[key]>=64||!state.settings.config.enabled,onClick:()=>change(key,5)},'+5 puan'),h('small',null,'Üst sınır: %',fmt(state.settings.config[key])));})),
    h('p',{className:'status429-help'},'Her seviyede 3 puan kazanırsın. 65. seviyede toplam 192 puan; her statüde en fazla 64 puan. Bonuslar rünlerle toplanır. Can değişikliği seni iyileştirmez.'),h('footer',null,h('button',{type:'button',disabled:busy||!state.settings.config.enabled,onClick:()=>{setDraft({attack:0,defense:0,hp:0});setMessage('Sıfırlamayı kaydetmek için Uygula düğmesine bas.');}},'Sıfırla'),h('button',{type:'button',disabled:busy||!dirty||available<0||!state.settings.config.enabled,onClick:save},busy?'Kaydediliyor…':'Uygula')),h('p',{className:'status429-message',role:'status'},message||'Puan dağıtımı ve sıfırlama savaş dışında, ücretsizdir.'))));
 }
 function Admin({value,busy,act}){
  const [draft,setDraft]=React.useState(()=>({...value.config})),[revision,setRevision]=React.useState(value.revision),[message,setMessage]=React.useState('');const dirty=React.useRef(false);
  React.useEffect(()=>{if(!dirty.current){setDraft({...value.config});setRevision(value.revision);}},[value.revision]);
  const change=(key,value)=>{dirty.current=true;setDraft(old=>({...old,[key]:value}));setMessage('Kaydedilmemiş değişiklikler');};
  return h('section',{className:'status429-admin'},h('h2',null,'Statü sistemi'),h('p',null,'Her seviye 3 puan; 65. seviyede 192 puan. Her statü 64 puanla aşağıdaki üst sınıra ulaşır. Değerler yüzde olarak doğrusal uygulanır.'),h('label',null,h('input',{type:'checkbox',checked:draft.enabled,onChange:e=>change('enabled',e.target.checked)}),' Statü bonusları etkin'),h('div',{className:'status429-grid'},...M.STATUS_FIELDS.map(k=>h('label',{key:k},T[k].effect+' üst sınırı (%)',h('input',{type:'number',min:0,max:30,step:.1,value:draft[k],onChange:e=>change(k,Number(e.target.value))})))),h('p',null,'Can bonusunu artırmak mevcut canı doldurmaz; azaltmak canı yeni üst sınıra indirir. Kapatmak dağıtılmış puanları silmez.'),h('button',{disabled:busy,onClick:async()=>{const result=await act({action:'save_status',config:draft,revision});if(result?.status){dirty.current=false;setDraft({...result.status.config});setRevision(result.status.revision);setMessage('Statü ayarları kaydedildi.');}else setMessage('Ayarlar kaydedilemedi.');}},'Statü ayarlarını kaydet'),h('p',{role:'status'},message));
 }
 return {Entry,Admin};
}

function createUpdate425UI(React,{fetcher=fetch,post,rankLabel=(n)=>'Rütbe '+n}={}){
 const h=React.createElement;
 function StatusControls({draft,setDraft,busy,act}){
  const mode=draft.mode==='maintenance'?'maintenance':!draft.enabled||draft.mode==='open'?'open':'closed';
  return h('div',{className:'status425-controls'},h('label',null,'Oyun durumu',h('select',{value:mode,onChange:e=>setDraft({...draft,enabled:1,mode:e.target.value})},h('option',{value:'closed'},'Ön kayıt'),h('option',{value:'open'},'Oyun açık'),h('option',{value:'maintenance'},'Bakım modu'))),
   h('p',null,'Ön kayıt: yakında açılacağız ve kayıt ekranı. Oyun açık: kayıt ol veya giriş yap. Bakım: giriş kapanır; oyuncular 10 saniye sonra bakım ekranına alınır. Yönetici erişimi korunur.'),
   h('label',null,'Bakım açıklaması',h('textarea',{value:draft.maintenance_text??'',maxLength:2000,rows:4,placeholder:'Bakım hakkında oyunculara gösterilecek açıklama…',onChange:e=>setDraft({...draft,maintenance_text:e.target.value})})),
   h('small',null,'Kaydettiğinde bakım ekranındaki metin açık sayfalarda da güncellenir.'),
   h('button',{disabled:busy,onClick:()=>act({action:'save',settings:{...draft,enabled:1,mode}})},busy?'Kaydediliyor…':'Durumu ve açıklamayı kaydet'));
 }
 function BagItems({own,onChanged}){
  const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');const receipt=React.useRef(null);
  const act=async(body)=>{if(busy)return;setBusy(true);setError('');const key=JSON.stringify(body);if(receipt.current?.key!==key)receipt.current={key,id:crypto.randomUUID()};try{await post('/api/ranks',{...body,requestId:receipt.current.id});receipt.current=null;await onChanged?.();}catch(e){setError(e.message);}finally{setBusy(false);}};
  return h(React.Fragment,null,
   own?.arena_wings_owned>0&&h('button',{className:'bag-item arena425-item',disabled:busy,onClick:()=>act({action:'arena_market_wings',enabled:!own.arena_wings_equipped})},h('span',{className:'item-icon'},h('img',{src:'/game/arena-wings-v424.webp',alt:''})),h('span',null,h('strong',null,'Arena Kanatları'),h('small',null,'+10 saldırı · +%10 canavarlara güç'),h('b',null,own.arena_wings_equipped?'Kuşanıldı · Çıkar':'Kalıcı · Kuşan'))),
   own?.arena_exp_rings>0&&h('button',{className:'bag-item arena425-item',disabled:busy,onClick:()=>act({action:'arena_market_exp'})},h('span',{className:'item-icon'},h('img',{src:'/game/exp-ring-v424.webp',alt:''})),h('span',null,h('strong',null,'Arena Tecrübe Yüzüğü'),h('small',null,'1 saat +%20 tecrübe'),h('b',null,own.arena_exp_rings+' adet · Kullan'))),
   own?.red_pearls>0&&h('div',{className:'bag-item arena425-item'},h('span',{className:'item-icon'},h('span',{className:'red-pearl425',role:'img','aria-label':'Kırmızı inci'})),h('span',null,h('strong',null,'Kırmızı İnci'),h('small',null,'Ejderha girişi: 1 inci + 100 mücevher + 200 öz'),h('b',null,own.red_pearls+' adet'))),
   error&&h('p',{className:'arena425-error',role:'alert'},error));
 }
 function Ranking({playerId}){
  const [open,setOpen]=React.useState(false),[tab,setTab]=React.useState('level'),[data,setData]=React.useState(null),[error,setError]=React.useState('');const dialog=React.useRef(null);
  React.useEffect(()=>{const d=dialog.current;if(open&&!d.open)d.showModal();if(!open&&d.open)d.close();},[open]);
  React.useEffect(()=>{if(!open)return;let stopped=false,timer,controller;const refresh=async()=>{if(stopped||document.hidden)return;controller?.abort();controller=new AbortController();const current=controller;const timeout=setTimeout(()=>current.abort(),8000);try{const r=await fetcher('/api/level-ranking',{cache:'no-store',signal:current.signal}),s=await r.json();if(!r.ok)throw Error(s.error??'Sıralama alınamadı.');if(!stopped){setData(s);setError('');}}catch(e){if(!stopped)setError(e.message);}finally{clearTimeout(timeout);if(!stopped)timer=setTimeout(refresh,15000);}};const visible=()=>{clearTimeout(timer);if(document.hidden)controller?.abort();else void refresh();};void refresh();document.addEventListener('visibilitychange',visible);return()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visible);};},[open,playerId]);
  const monsters=tab==='monsters',rows=monsters?data?.monsters?.rows:data?.rows;
  return h(React.Fragment,null,h('button',{type:'button',className:'mobile-dungeon level-ranking-open',onClick:()=>setOpen(true),title:'Sıralamalar','aria-label':'Seviye, rütbe ve canavar sıralamaları'},h('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:2,width:20,height:20,'aria-hidden':true},h('path',{d:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 13v7m-4 1h8'})),h('span',null,'Sıralamalar')),
   h('dialog',{ref:dialog,className:'level-ranking-dialog ranking425-dialog',onCancel:()=>setOpen(false),onClose:()=>setOpen(false),'aria-labelledby':'ranking425-title'},
    h('header',null,h('h2',{id:'ranking425-title'},'Sıralamalar'),h('button',{onClick:()=>setOpen(false),'aria-label':'Sıralamayı kapat'},'×')),
    h('div',{className:'ranking425-tabs',role:'tablist'},h('button',{role:'tab','aria-selected':!monsters,onClick:()=>setTab('level')},'Seviye ve Rütbe'),h('button',{role:'tab','aria-selected':monsters,onClick:()=>setTab('monsters')},'Canavar Sıralaması')),
    h('p',null,monsters?'Tüm kanallar · Bugün ilk 10 · 00.00’da birinciye 50 ÇP':'Tüm kanallar · İlk 20'),
    error&&h('p',{role:'alert'},error),!data&&h('p',null,'Sıralama yükleniyor…'),
    h('div',{className:'level-ranking-scroll'},h('table',null,h('thead',null,h('tr',null,...['Sıra','Oyuncu',monsters?'Canavar':'Seviye / Rütbe',...monsters?[]:['TP']].map(t=>h('th',{key:t},t)))),h('tbody',null,...(rows??[]).slice(0,monsters?10:20).map(row=>h('tr',{key:row.id,className:row.id===playerId?'ranking-mine':''},h('td',null,row.rank),h('td',null,h('strong',null,row.name+(row.id===playerId?' · Sen':''))),h('td',null,monsters?row.kills:row.rankTier?rankLabel(row.rankTier,true):row.level),!monsters&&h('td',null,(row.rankTier?row.rankXp??0:row.xp).toLocaleString('tr-TR')))))),data&&!rows?.length&&h('p',null,monsters?'Bugün henüz canavar kesilmedi.':'Henüz sıralanacak oyuncu yok.')),
    h('footer',null,!monsters&&data?.own&&h('strong',null,'Sıran: '+data.own.rank),h('small',null,monsters?'Ödül hakkı kazandığın canavarlar sayılır. Gün sonunda birinciye 50 ÇP, çevrimdışıyken de bir kez eklenir. Eşitlikte mevcut oyuncu kimliği sırası geçerlidir. GM karakterleri dahil edilmez.':'65. seviyeden sonra rütbe ve rütbe TP’si belirleyicidir.'),h('small',null,'Açıkken 15 saniyede bir yenilenir.'))));
 }
 return {StatusControls,BagItems,Ranking};
}

function createArenaUI(React,{fetcher=fetch,post}={}){
 const h=React.createElement,coin='/game/arena-coin-v424.webp';
 const images460=Object.freeze({"material:strong_branch":"/dungeon/strong-branch-v410.webp","material:strong_crystal":"/dungeon/strong-crystal-v410.webp","material:desert_plant":"/dungeon/desert-plant-v410.webp","material:master_scroll":"/dungeon/master-scroll-v410.webp","resource:fifth_enchant_scrolls":"/game/enchant-fifth-v260.webp"});
 function ItemIcon460({item}){
  if(item.itemId==='resource:pearls')return h('svg',{className:'pearl-icon',viewBox:'0 0 24 24',fill:'none','aria-hidden':'true'},h('circle',{cx:'12',cy:'12',r:'8.2',fill:'#dff8ff',stroke:'currentColor',strokeWidth:'1.4'}),h('circle',{cx:'9.2',cy:'8.8',r:'2.2',fill:'#fff',fillOpacity:'.92'}),h('path',{d:'M7.2 15.8c2.8 2.4 6.9 2.7 9.7-.5',stroke:'#8ebdcc',strokeWidth:'1.1',strokeLinecap:'round',opacity:'.7'}));
  const src=images460[item.itemId]??item.image;
  return src?h('img',{src,alt:'',loading:'lazy'}):h('span',null,item.type==='gear'?'⚔':'✦');
 }
 const rewards={'1v1':5,'2v2':6,'3v3':7,'5v5':10},limits={'1v1':5,'2v2':3,'3v3':2,'5v5':1};
 const send=post??(async(url,body)=>{const r=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error??'İşlem başarısız.');return d;});
 function Reward({mode}){return h('small',{className:'arena424-reward'},h('img',{src:coin,alt:'',width:20,height:20}),`+${rewards[mode]} Arena Coin · Günde ${limits[mode]} giriş`);}
 function Market({onChanged,own}){
 const [state,setState]=React.useState(null),[open,setOpen]=React.useState(false),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[error,setError]=React.useState('');
 const mounted=React.useRef(true),request=React.useRef(null);
 const refresh=async()=>{try{const r=await fetcher('/api/ranks?view=arena-market',{cache:'no-store'});const s=await r.json();if(!r.ok)throw Error(s.error??'Market yüklenemedi.');if(mounted.current){setState(s);setError('');}}catch(e){if(mounted.current)setError(e.message);}};
 React.useEffect(()=>{mounted.current=true;void refresh();return()=>{mounted.current=false;};},[]);
 const act=async(body)=>{if(busy)return;setBusy(true);setError('');const fingerprint=JSON.stringify(body);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};try{const r=await send('/api/ranks',{...body,requestId:request.current.id});request.current=null;if(mounted.current){setState(r.state);setMessage(r.message);}await onChanged?.();}catch(e){if(mounted.current)setError(e.message);}finally{if(mounted.current)setBusy(false);}};
 return h('section',{className:'arena424-market','data-open':open},
 h('button',{type:'button',className:'arena424-entry',onClick:()=>{setOpen(!open);if(!open)void refresh();},'aria-expanded':open},h('img',{src:coin,alt:'',width:32,height:32}),h('span',null,h('strong',null,'Arena Market'),h('small',null,`${state?.coins??own?.arena_coins??'—'} Arena Coin`)),h('b',null,open?'Kapat':'Marketi aç')),
 state&&h('div',{className:'arena424-limits'},...Object.entries(state.limits).map(([m,l])=>h('span',{key:m},`${m}: ${Math.max(0,l.limit-l.used)}/${l.limit} hak`))),
 h('small',{className:'arena424-reset'},'Haklar Türkiye saatiyle 00.00’da yenilenir. Kuyruktan ayrılmak hak tüketmez.'),
 open&&h('div',{className:'arena424-content'},
 state?.wingsOwned?h('button',{disabled:busy,onClick:()=>act({action:'arena_market_wings',enabled:!state.wingsEquipped})},state.wingsEquipped?'Arena Kanatlarını çıkar':'Arena Kanatlarını kuşan'):null,
 state?.rings>0?h('button',{disabled:busy,onClick:()=>act({action:'arena_market_exp'})},`EXP yüzüğünü kullan (${state.rings}) · 1 saat +%20`):null,
 state?.expUntil>state?.serverTime?h('p',null,'+%20 EXP etkin · Bitiş: ',new Date(state.expUntil).toLocaleString('tr-TR')):null,
 h('div',{className:'arena424-items'},...(state?.items??[]).map(item=>h('article',{key:item.itemId},h('div',{className:'arena424-icon'},h(ItemIcon460,{item})),h('div',null,h('strong',null,item.name),h('small',null,item.description??`${item.amount} adet${item.power?' · Güç / Seviye '+item.power:''}`)),h('button',{disabled:busy||state.coins<item.price||(item.itemId==='arena:wings'&&!!state.wingsOwned),onClick:()=>act({action:'arena_market_buy',itemId:item.itemId,revision:state.revision})},h('img',{src:coin,alt:'Arena Coin',width:22,height:22}),item.price,' · Al')))),
 !state?h('button',{disabled:busy,onClick:refresh},'Yenile'):null),
 error&&h('p',{role:'alert',className:'arena424-error'},error),message&&h('p',{role:'status'},message));
 }
 function Admin({value,busy,act}){
 const [rows,setRows]=React.useState(value.config),[chosen,setChosen]=React.useState(''),[query,setQuery]=React.useState('');React.useEffect(()=>setRows(value.config),[value.revision]);
 const catalog=value.catalog,byId=new Map(catalog.map(i=>[i.id,i]));const update=(i,k,v)=>setRows(rows.map((r,n)=>n===i?{...r,[k]:Number(v)}:r));
 return h('section',{className:'arena424-admin'},h('h2',null,'Arena Market'),h('p',null,'Oyundaki eşyalardan seç; coin bedelini ve adedini belirle. Kaldırılan eşya oyuncuların çantasından silinmez.'),
 h('input',{placeholder:'Eşya ara…',value:query,onChange:e=>setQuery(e.target.value),'aria-label':'Eşya ara'}),
 h('select',{value:chosen,onChange:e=>setChosen(e.target.value),'aria-label':'Satılacak eşya'},h('option',{value:''},'Eşya seç'),...catalog.filter(i=>!rows.some(r=>r.itemId===i.id)&&i.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))).map(i=>h('option',{key:i.id,value:i.id},`${i.group} · ${i.name}`))),
 h('button',{disabled:busy||!chosen,onClick:()=>{setRows([...rows,{itemId:chosen,price:1,amount:1,...(['gear','rune'].includes(byId.get(chosen)?.type)?{power:byId.get(chosen).type==='rune'?1:10}:{})}]);setChosen('');}},'Listeye ekle'),
 ...rows.map((r,i)=>{const item=byId.get(r.itemId);return h('article',{key:r.itemId},h('strong',null,item?.name),h('label',null,'Arena Coin',h('input',{type:'number',min:1,max:100000000,value:r.price,onChange:e=>update(i,'price',e.target.value)})),h('label',null,'Adet',h('input',{type:'number',min:1,max:['material','stone','resource'].includes(item?.type)?10000:1,value:r.amount,onChange:e=>update(i,'amount',e.target.value)})),['gear','rune'].includes(item?.type)?h('label',null,'Güç / Seviye',h('input',{type:'number',min:item.type==='rune'?1:0,max:100000,value:r.power??(item.type==='rune'?1:10),onChange:e=>update(i,'power',e.target.value)})):null,h('button',{disabled:busy,onClick:()=>setRows(rows.filter((_,n)=>n!==i))},'Kaldır'));}),
 h('button',{disabled:busy,onClick:()=>act({action:'save_arena_market',config:rows,revision:value.revision})},busy?'Kaydediliyor…':'Arena Marketi kaydet'));
 }
 function BagEntry(props){const [open,setOpen]=React.useState(false);return h('div',{className:'arena424-bag'},h('button',{onClick:()=>setOpen(!open),'aria-expanded':open},'Arena eşyaları'),open&&h(Market,props));}
 return {Market,Reward,Admin,BagEntry};
}

const colRuneModel=(()=>{const RUNE_TYPES=Object.freeze({
 rune_defense:{label:'Safir Siper Rünü',short:'Savunma',stat:'defense',color:'#55aeff',image:'rune-defense-v422',shard:'Safir Siper Parçası'},
 rune_attack:{label:'Kızıl Kudret Rünü',short:'Saldırı',stat:'attack',color:'#ff6478',image:'rune-attack-v422',shard:'Kızıl Kudret Parçası'},
 rune_hp:{label:'Zümrüt Yaşam Rünü',short:'Can',stat:'hp',color:'#4fde9b',image:'rune-hp-v422',shard:'Zümrüt Yaşam Parçası'}
});
const RUNE_MOBS=Object.freeze([
 {key:'tide',name:'Gelgit Pençesi',count:5,hp:4800,damage:62,xp:180},
 {key:'warden',name:'Mercan Muhafızı',count:5,hp:6200,damage:75,xp:220},
 {key:'sentinel',name:'Şato Nöbetçisi',count:5,hp:7400,damage:88,xp:260},
 {key:'wraith',name:'Derinlik Ruhu',count:5,hp:5500,damage:96,xp:240}
]);
const RUNE_WORLD={width:4320,height:2880};
const RUNE_SPAWN={x:2121,y:2579};
const RUNE_GATE_MESSAGE='Giriş için 65. seviye ve Öz Avcısı rütbesi gerekiyor.';
const runeEligible=p=>!!p&&Number(p.level)>=65&&Number(p.rank_tier??p.rank?.tier)>=1;
const isRuneKind=k=>typeof k==='string'&&Object.hasOwn(RUNE_TYPES,k);
function runeUpgradeCost(level){if(!Number.isSafeInteger(level)||level<1||!Number.isSafeInteger(level+2))throw Error('Rün seviyesi geçersiz.');return level+2;}
const runeBonusPercent=(level,step=.2)=>Math.round(level*step*1000000)/1000000;
function runeMonsterKey(monster){return monster?.area==='rune'?String(monster.id).match(/^rune-(tide|warden|sentinel|wraith)-c[1-3]-\d+$/)?.[1]??null:null;}
const RUNE_WALKABLE_POLYGON=[[1195,967],[2162,844],[2232,615],[3164,615],[3234,809],[4096,686],[4219,914],[4078,1125],[4781,1195],[4816,1494],[4500,1916],[4430,2514],[3938,2812],[3076,3076],[2900,3463],[2426,3463],[2250,3094],[1652,2760],[1301,2461],[1195,2004],[1125,1600],[1055,1248]].map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]);
const RUNE_OBSTACLES=[[[2039,1121],[2278,1058],[2584,1146],[2739,1287],[2591,1498],[2275,1568],[2039,1434]],[[3347,1870],[3561,1870],[3730,1986],[3544,2148],[3305,2116],[3206,2000]]].map(poly=>poly.map(([x,y])=>[Math.round(x*.8),Math.round(y*.8)]));
const inside=(x,y,poly)=>{let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
const edgeDistance=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);};
const runeEdges=[RUNE_WALKABLE_POLYGON,...RUNE_OBSTACLES].flatMap(poly=>poly.map((p,i)=>[p,poly[(i+1)%poly.length]]));
function runeWalkable(x,y,margin=0){if(!Number.isFinite(x)||!Number.isFinite(y)||!inside(x,y,RUNE_WALKABLE_POLYGON)||RUNE_OBSTACLES.some(p=>inside(x,y,p)))return false;return !(margin>0)||runeEdges.every(([a,b])=>edgeDistance(x,y,a,b)>=margin);}
function runeWalkableSegment(x1,y1,x2,y2,margin=0){if(!runeWalkable(x1,y1,margin)||!runeWalkable(x2,y2,margin))return false;const cross=(ax,ay,bx,by,cx,cy)=>(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);for(const[a,b]of runeEdges){const c1=cross(x1,y1,x2,y2,...a),c2=cross(x1,y1,x2,y2,...b),c3=cross(...a,...b,x1,y1),c4=cross(...a,...b,x2,y2);if(c1*c2<=0&&c3*c4<=0&&Math.max(x1,x2)>=Math.min(a[0],b[0])&&Math.min(x1,x2)<=Math.max(a[0],b[0])&&Math.max(y1,y2)>=Math.min(a[1],b[1])&&Math.min(y1,y2)<=Math.max(a[1],b[1]))return false;if(margin>0&&(edgeDistance(...a,[x1,y1],[x2,y2])<margin||edgeDistance(...b,[x1,y1],[x2,y2])<margin))return false;}return true;}
const runePoints={"tide":[[3750,1140],[1230,1980],[3190,720],[2770,1840],[2350,1140]],"warden":[[950,1000],[3330,1980],[1510,860],[3330,1420],[2350,1560]],"sentinel":[[2350,2120],[1930,1420],[1790,2260],[1650,1840],[2770,720]],"wraith":[[2350,580],[2770,1280],[1370,1420],[1930,720],[2770,2260]]};
const RUNE_SPAWNS=Object.freeze(Object.entries(runePoints).flatMap(([key,points])=>points.map(([x,y],i)=>({key,slot:i+1,x,y}))));
function defaultRuneConfig(){return {enabled:true,bonusPerLevel:.2,monsters:Object.fromEntries(RUNE_MOBS.map(m=>[m.key,{name:m.name,hp:m.hp,damage:m.damage,xp:m.xp,respawnSeconds:30,loot:{...Object.fromEntries(Object.keys(RUNE_TYPES).map(k=>[k,{chance:3,min:1,max:1}])),essence:{chance:100,min:5,max:10},gems:{chance:10,min:1,max:3},potions:{chance:5,min:1,max:1},red:{chance:1,min:1,max:1},orange:{chance:2,min:1,max:1},blue:{chance:3,min:1,max:1},white:{chance:0,min:1,max:1},purple:{chance:0,min:1,max:1},stone_dust:{chance:2,min:1,max:2},stone_book:{chance:1,min:1,max:1},evolution_scroll:{chance:.2,min:1,max:1},pearl:{chance:0,min:1,max:1},weathered_iron:{chance:0,min:1,max:1},wing:{chance:0,min:1,max:1},infinite:{chance:0,min:1,max:1},pet:{chance:0,min:1,max:1},emerald:{chance:0.05,min:1,max:1}}}]))};}
const RUNE_LOOT_LABELS={...Object.fromEntries(Object.entries(RUNE_TYPES).map(([k,v])=>[k,v.shard])),essence:'Yaşam Özü',gems:'Mücevher',potions:'Kırmızı İksir',red:'Kırmızı ekipman',orange:'Turuncu ekipman',blue:'Mavi ekipman',white:'Beyaz ekipman',purple:'Mor ekipman',stone_dust:'Taş Tozu',stone_book:'Taş Sanatı Kitabı',evolution_scroll:'Evrim Parşömeni',pearl:'İnci',weathered_iron:'Eskitilmiş Demir Parçası',wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası',emerald:"Kadim Zümrüt ekipman (5 parça)"};
function validateRuneConfig(input){
 const def=defaultRuneConfig(),out={enabled:input?.enabled===true,bonusPerLevel:Number(input?.bonusPerLevel),monsters:{}};
 if(typeof input?.enabled!=='boolean'||!Number.isFinite(out.bonusPerLevel)||out.bonusPerLevel<0||out.bonusPerLevel>100)throw Error('Rün seviye bonusu %0–100 arasında olmalı.');
 for(const m of RUNE_MOBS){const v=input?.monsters?.[m.key];if(!v)throw Error('Dört canavarın ayarları gerekli.');
  const row={name:m.name,hp:Number(v.hp),damage:Number(v.damage),xp:Number(v.xp),respawnSeconds:Number(v.respawnSeconds),loot:{}};
  for(const [k,min,max]of [['hp',1,10000000],['damage',0,1000000],['xp',0,1000000],['respawnSeconds',1,86400]])if(!Number.isSafeInteger(row[k])||row[k]<min||row[k]>max)throw Error(m.name+': '+k+' ayarı geçersiz.');
  for(const k of Object.keys(def.monsters[m.key].loot)){const r=v.loot?.[k]??(k==='emerald'?def.monsters[m.key].loot.emerald:null);if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['white','blue','orange','red','purple','emerald'].includes(k)?3:100))throw Error(m.name+': '+RUNE_LOOT_LABELS[k]+' oranı veya miktarı geçersiz.');row.loot[k]={chance:r.chance,min:r.min,max:r.max};}
  out.monsters[m.key]=row;
 }return out;
}

return {RUNE_TYPES,RUNE_MOBS,RUNE_LOOT_LABELS,RUNE_WORLD,RUNE_SPAWN,runeEligible,isRuneKind,runeUpgradeCost,runeBonusPercent,runeWalkable,runeWalkableSegment,runeMonsterKey,RUNE_GATE_MESSAGE};})();

function createRuneUI(React,{model,fetcher,post,Button='button',onImage='/game/'}){
 const h=React.createElement,types=model.RUNE_TYPES;
 let step=.2;
 const pct=(level)=>model.runeBonusPercent(Number(level)||1,step).toLocaleString('tr-TR',{maximumFractionDigits:6});
 function Icon({kind,className=''}){const t=types[kind];return t?h('img',{src:'/game/'+t.image+'.webp',alt:t.label,className:'rune-icon '+className,draggable:false}):null;}
 function Details({item}){const t=types[item.kind];return t?h('div',{className:'rune-details'},h('strong',null,t.label),h('b',{style:{color:t.color}},'Seviye '+item.power+' · +%'+pct(item.power)+' '+t.short),h('small',null,'Takıldığında etkin · Geliştirilebilir · Pazarda satılabilir')):null;}
 function BagEntry({own,bonusStep,onChanged}){
  if(Number.isFinite(bonusStep))step=bonusStep;
  const [open,setOpen]=React.useState(false),[state,setState]=React.useState(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),dialog=React.useRef(null),lock=React.useRef(false);
  const allowed=model.runeEligible(own);
  React.useEffect(()=>{if(!open)return;const d=dialog.current;if(d&&!d.open)d.showModal();const close=()=>setOpen(false);const rotate=()=>{if(window.matchMedia('(pointer:coarse)').matches&&window.innerHeight>window.innerWidth)close();};window.addEventListener('resize',rotate);window.addEventListener('orientationchange',rotate);window.addEventListener('coreoflife:bot-check',close);return()=>{window.removeEventListener('resize',rotate);window.removeEventListener('orientationchange',rotate);window.removeEventListener('coreoflife:bot-check',close);if(d?.open)d.close();};},[open]);
  React.useEffect(()=>{if(!open||!allowed)return;const abort=new AbortController();setError('');setState(null);fetcher('/api/ranks?view=runes',{cache:'no-store',signal:abort.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Rünler alınamadı.');step=data.config.bonusPerLevel;setState(data);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[open,own?.id,allowed]);
  const command=async(action,item)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await post('/api/ranks',{action,requestId:crypto.randomUUID(),...(item?.id?{itemId:item.id,expectedLevel:item.power}:{kind:item?.kind})});setState(result.state);step=result.state.config.bonusPerLevel;await onChanged?.();}catch(e){setError(e.message||'İşlem tamamlanamadı.');}finally{lock.current=false;setBusy(false);}};
  return h(React.Fragment,null,h(Button,{type:'button',className:'rune-entry-button',onPointerDown:e=>e.stopPropagation(),onClick:e=>{e.stopPropagation();setOpen(true);}},h(Icon,{kind:'rune_defense'}),' Rün'),open&&h('dialog',{ref:dialog,className:'rune-dialog',onCancel:()=>setOpen(false),onClose:()=>setOpen(false),onPointerDown:e=>e.stopPropagation(),onClick:e=>e.stopPropagation(),'aria-labelledby':'rune-heading'},h('header',{className:'rune-header'},h('div',null,h('small',null,'KADİM RÜN SANATI'),h('h2',{id:'rune-heading'},'Rünler')),h('button',{type:'button',onClick:()=>setOpen(false),'aria-label':'Rün penceresini kapat'},'×')),!allowed?h('p',{role:'status',className:'rune-locked'},model.RUNE_GATE_MESSAGE):h(React.Fragment,null,h('p',{className:'rune-intro'},'Her türden bir rün takabilirsin. Seviye sınırı yoktur. Takılı rünler satılamaz.'),error&&h('p',{role:'alert',className:'rune-error'},error),!state&&!error&&h('p',{role:'status'},'Rünlerin yükleniyor…'),state&&!state.claimed&&h('button',{className:'rune-primary',disabled:busy,onClick:()=>command('rune_claim')},'Üç başlangıç rününü al'),state&&h('div',{className:'rune-columns'},...Object.entries(types).map(([kind,t])=>{const items=state.items.filter(i=>i.kind===kind),fragments=state.materials[kind]??0;return h('section',{key:kind,className:'rune-type',style:{'--rune-color':t.color}},h('div',{className:'rune-type-title'},h(Icon,{kind}),h('div',null,h('h3',null,t.label),h('span',null,'Seviye başına +%'+step.toLocaleString('tr-TR')+' '+t.short))),h('div',{className:'rune-shards'},h('img',{src:'/dungeon/'+t.image+'-shard.webp',alt:''}),h('span',null,t.shard),h('b',null,fragments.toLocaleString('tr-TR'))),h('div',{className:'rune-item-list'},...items.map(item=>{const cost=model.runeUpgradeCost(item.power);return h('article',{key:item.id,className:'rune-item '+(item.equipped?'is-equipped':'')},h('div',{className:'rune-level-line'},h('strong',null,'Seviye '+item.power),h('span',null,item.equipped?'Takılı':'Çantada')),h('b',{className:'rune-bonus'},'+%'+pct(item.power)+' '+t.short),h('small',null,'Sonraki seviye: '+cost.toLocaleString('tr-TR')+' parça'),h('div',{className:'rune-item-actions'},h('button',{disabled:busy,onClick:()=>command(item.equipped?'rune_unequip':'rune_equip',item)},item.equipped?'Çıkar':'Tak'),h('button',{disabled:busy||fragments<cost,onClick:()=>command('rune_upgrade',item)},'Geliştir')));})),h('button',{className:'rune-craft',disabled:busy||fragments<5,onClick:()=>command('rune_craft',{kind})},'Yeni rün üret · 5 parça'));})),h('p',{className:'rune-footnote'},'Parçalar Kadim Rün Sahili’nde düşer. Parçaları ve takılı olmayan rünlerini Pazar Tezgâhım’dan satabilirsin. Rün takmak canını doldurmaz.'))));
 }
 function Loot({profile,label}){return h('div',{className:'rune-loot-information'},h('strong',null,label??profile.label),h('p',null,'Her ödül bağımsız hesaplanır. Bu haritada Rün panelinin oranları geçerlidir.'),...Object.entries(profile.runeLoot).filter(([,r])=>r.chance>0).map(([kind,r])=>h('div',{key:kind,className:'rune-odds-row'},types[kind]&&h('img',{src:'/dungeon/'+types[kind].image+'-shard.webp',alt:''}),h('span',null,model.RUNE_LOOT_LABELS[kind]??kind),h('b',null,'%'+r.chance.toLocaleString('tr-TR')),h('small',null,r.min===r.max?r.min+' adet':r.min+'–'+r.max+' adet'))));}
 function Admin({value,busy,act}){
  const [draft,setDraft]=React.useState(()=>structuredClone(value.config)),[revision,setRevision]=React.useState(value.revision),[tab,setTab]=React.useState('tide'),[status,setStatus]=React.useState('');
  const dirty=React.useRef(false);
  React.useEffect(()=>{if(!dirty.current){setDraft(structuredClone(value.config));setRevision(value.revision);}},[value.revision]);
  const set=(fn)=>{dirty.current=true;setDraft(old=>{const next=structuredClone(old);fn(next);return next;});setStatus('Kaydedilmemiş değişiklikler');};
  const number=(label,value,change,min,max,step=1)=>h('label',{className:'rune-field'},h('span',null,label),h('input',{type:'number',min,max,step,value,onChange:e=>change(Number(e.target.value))}));
  const m=draft.monsters[tab];
  return h('section',{className:'rune-admin'},h('header',null,h('h2',null,'Rünler ve Kadim Rün Sahili'),h('p',null,'Bu haritanın canavarları ve ganimetleri yalnız buradan yönetilir. Can ve hasar oyuncu sayısıyla artmaz.')),h('div',{className:'rune-admin-general'},h('label',null,h('input',{type:'checkbox',checked:draft.enabled,onChange:e=>set(d=>{d.enabled=e.target.checked;})}),' Haritaya giriş açık'),number('Seviye başına rün bonusu (%)',draft.bonusPerLevel,v=>set(d=>{d.bonusPerLevel=v;}),0,100,.01)),h('nav',{className:'rune-admin-tabs'},...model.RUNE_MOBS.map(monster=>h('button',{key:monster.key,type:'button','aria-pressed':tab===monster.key,onClick:()=>setTab(monster.key)},monster.name+' · '+monster.count))),h('div',{className:'rune-admin-stats'},number('Can',m.hp,v=>set(d=>{d.monsters[tab].hp=v;}),1,10000000),number('Hasar',m.damage,v=>set(d=>{d.monsters[tab].damage=v;}),0,1000000),number('Tecrübe',m.xp,v=>set(d=>{d.monsters[tab].xp=v;}),0,1000000),number('Yeniden doğma (sn)',m.respawnSeconds,v=>set(d=>{d.monsters[tab].respawnSeconds=v;}),1,86400)),h('p',null,'Can değişikliği sonraki doğuşta uygulanır. Ganimet kesim anında kaydedilir; daha sonra yapılan ayar değişikliği kazanılmış ödülü değiştirmez.'),h('div',{className:'rune-loot-editor'},...Object.entries(model.RUNE_LOOT_LABELS).map(([kind,label])=>h('fieldset',{key:kind},h('legend',null,label),number(kind==='purple'?'Temel düşme (%)':'Düşme (%)',m.loot[kind].chance,v=>set(d=>{d.monsters[tab].loot[kind].chance=v;}),0,100,.01),kind==='purple'&&h('small',null,'Yeni kesimlerde mor şansı: %'+(m.loot[kind].chance*.5).toLocaleString('tr-TR',{maximumFractionDigits:10})+' (temel oranın yarısı; seviye dengesi ayrıca uygulanır).'),number('En az',m.loot[kind].min,v=>set(d=>{d.monsters[tab].loot[kind].min=v;}),1,['white','blue','orange','red','purple','emerald'].includes(kind)?3:100),number('En çok',m.loot[kind].max,v=>set(d=>{d.monsters[tab].loot[kind].max=v;}),1,['white','blue','orange','red','purple','emerald'].includes(kind)?3:100)))),h('div',{className:'rune-admin-save'},h('span',{role:'status'},status),h('button',{disabled:busy,onClick:async()=>{const result=await act({action:'save_runes',config:draft,revision});if(result?.runes){dirty.current=false;setDraft(structuredClone(result.runes.config));setRevision(result.runes.revision);setStatus('Rün ayarları kaydedildi.');}else setStatus('Kaydedilemedi. Hata mesajını kontrol et.');}},busy?'Kaydediliyor…':'Rün ayarlarını kaydet')));
 }
 return {BagEntry,Icon,Details,Loot,Admin,setStep:value=>{if(Number.isFinite(value)&&value>=0)step=value;}};
}

import{r as e}from"./rolldown-runtime-S-ySWqyJ-ga4172.js";import{i as t,r as n}from"./framework-CXnKph_e-ga4172.js";import r from"./link-C6WHyGA8-ga4172-v418ws-3c02836f-e510-8225403c2fcc-9c637f1178.js";import{$ as i,$t as a,A as o,B as s,Bt as c,C as l,F as u,G as d,Gt as f,H as p,Ht as m,I as h,J as g,Jt as _,K as v,L as y,Lt as b,M as x,N as S,O as C,P as w,Q as T,R as E,Rt as D,S as O,T as k,U as A,Ut as j,V as M,Vt as N,W as ee,Wt as te,Y as P,Z as ne,_ as F,a as re,at as ie,bt as ae,c as oe,ct as se,d as ce,dt as I,en as L,et as R,f as le,ft as z,h as ue,i as B,in as V,j as de,k as H,lt as U,m as fe,n as pe,nn as W,nt as me,o as he,ot as ge,p as _e,q as ve,qt as ye,r as be,rn as xe,rt as Se,s as Ce,sn as we,st as G,tn as K,tt as Te,ut as Ee,w as De,x as Oe,z as ke,zt as q}from"./monster-loot-a2QO0cPh-ga4172-92bdd7a4-bab8-e499-fab4fcb1e1b2-f4f682b8.js";import{t as J}from"./createLucideIcon-BiVFlVzr-ga4172.js";import{F as Ae,P as je,a as Me,i as Ne,j as Pe,l as Y,r as Fe,t as Ie}from"./launch-landing-qVKrjo7K-ga4172-prereg-1788-e486-48ff1d5b32ef-74b8821e.js";import{t as Le}from"./circle-check-CykMSVzB-ga4172.js";var Re=[["forest_power","Kuzey Ormanı gücü",[2,4,8,10],10],["frozen_power","Donmuş Çam gücü",[2,4,8,10],10],["fire","Ateş",[2,4,8,10],80],["ice","Buz",[2,4,8,10],80],["sword_defense","Kılıç savunması",[2,4,9,12],80],["arrow_defense","Ok savunması",[2,4,9,12],80],["magic_defense","Büyü savunması",[2,4,9,12],80],["strong_players","Oyunculara karşı güç",[2,4,8,10],80],["resistant_players","Oyunculara karşı savunma",[2,4,9,12],80],["critical","Kritik şansı",[1,2,4,6],80],["attack_speed","Saldırı hızı",[2,4,8,10],80],["cast_speed","Büyü Hızı",[4,8,16,20],50],["life_steal","Can çalma",[3,6,12,15],15],["attack_block","Saldırı bloklama",[3,6,12,15],15],["hp","Azami can",[60,120,240,300],1000000]],ze=["one","two","four","five"],Be=e=>ze.map(t=>`enchant_${e}_tier_${t}`);Object.fromEntries(Re.flatMap(([e,,t])=>Be(e).map((e,n)=>[e,t[n]])));function Ve(e,t){return colAffixValues454.enchantTierValues(e,t);}var X=e(t(),1),Z=n();function He({value:e,busy:t,act:n,mode:r}){let[i,a]=(0,X.useState)(()=>structuredClone(e[r])),[o,s]=(0,X.useState)(``),[c,l]=(0,X.useState)(`material:weathered_iron`);(0,X.useEffect)(()=>{a(structuredClone(e[r]))},[e.revision,r]);let u=(e,t)=>a(n=>({...n,[e]:t})),d=(e,t,n,r)=>(0,Z.jsxs)(`label`,{children:[t,(0,Z.jsx)(`input`,{type:`number`,min:n,max:r,step:`1`,value:i[e],onChange:t=>u(e,Number(t.target.value))})]},e),p=(e,t)=>(0,Z.jsx)(`div`,{className:`progression-rule-fields`,children:[[`chance`,`Düşme (%)`,0,100,.001],[`min`,`En az`,1,1e4,1],[`max`,`En çok`,1,1e4,1]].map(([n,r,i,a,o])=>(0,Z.jsxs)(`label`,{children:[r,(0,Z.jsx)(`input`,{type:`number`,min:i,max:a,step:o,value:e[n],onChange:r=>t({...e,[n]:Number(r.target.value)})})]},n))});return(0,Z.jsxs)(`section`,{className:`progression-editor`,children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsx)(`small`,{children:r===`solo`?`TEK OYUNCULU ZİNDAN`:`BÖLGE GANİMETLERİ`}),(0,Z.jsx)(`h2`,{children:r===`solo`?`Paslı Mahzen`:`Artı Basma Malzemeleri`}),(0,Z.jsx)(`p`,{children:r===`solo`?`Üç kademe ve üçüncü kademenin sonunda Demir Hükümdar. Değişiklikler yeni başlayan turlara uygulanır.`:`Dört malzemenin oranını ve adet aralığını düzenle. Canavar bilgi ekranı aynı oranları gösterir.`})]}),r===`solo`?(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`label`,{className:`progression-switch`,children:[(0,Z.jsx)(`input`,{type:`checkbox`,checked:i.enabled,onChange:e=>u(`enabled`,e.target.checked)}),`Solo zindanı oyunculara aç`]}),(0,Z.jsxs)(`div`,{className:`progression-fields`,children:[d(`daily_limit`,`Günlük giriş hakkı`,1,100),d(`minimum_level`,`Gerekli seviye`,1,65),d(`duration_seconds`,`Tur süresi (saniye)`,300,3600)]}),(0,Z.jsx)(`p`,{children:`Her giriş 1 Zindan Anahtarı tüketir. Haso dönüşümü: 3 İnci + 100 Mücevher. Günlük haklar Türkiye saatiyle 00.00’da yenilenir.`}),(0,Z.jsx)(`div`,{className:`progression-stages`,children:[1,2,3].map(e=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsx)(`img`,{src:j[e].image,alt:``}),(0,Z.jsxs)(`h3`,{children:[e,`. Kademe · `,j[e].name]}),d(`stage${e}_hp`,`Canavar canı`,1,1e8),d(`stage${e}_damage`,`Canavar hasarı`,1,1e6)]},e))}),(0,Z.jsx)(`h3`,{children:`Demir Hükümdar`}),(0,Z.jsxs)(`div`,{className:`progression-fields`,children:[d(`boss_hp`,`Boss canı`,1,1e8),d(`boss_damage`,`Boss hasarı`,1,1e6)]}),(0,Z.jsx)(`h3`,{children:`Bossun düşürebileceği eşyalar`}),(0,Z.jsx)(`p`,{children:`Her tamamlamada 3 ganimet seçilir. Oranlar seçim ağırlığıdır; %0 eşya seçimini kapatır. Aynı eşya birden fazla seçilebilir. Miktar aralığı her seçime uygulanır.`}),(0,Z.jsxs)(`div`,{className:`progression-add`,children:[(0,Z.jsx)(`input`,{"aria-label":`Ödül ara`,placeholder:`Eşya adıyla ara…`,value:o,onChange:e=>s(e.target.value)}),(0,Z.jsx)(`select`,{"aria-label":`Boss ödülü`,value:c,onChange:e=>l(e.target.value),children:N.filter(e=>!o||dungeonLootSearchText460(e).toLocaleLowerCase(`tr`).includes(o.toLocaleLowerCase(`tr`))||e.id===c).map(e=>(0,Z.jsxs)(`option`,{title:e.name,value:e.id,children:[dungeonLootLabel460(e,true)]},e.id))}),(0,Z.jsx)(`button`,{disabled:i.loot.length>=64||i.loot.some(e=>e.itemId===c),onClick:()=>u(`loot`,[...i.loot,{itemId:c,chance:1,min:1,max:1}]),children:`Eşya ekle`})]}),i.loot.map((e,t)=>{let n=m.get(e.itemId),r=te[n?.kind];return(0,Z.jsxs)(`article`,{className:`progression-drop`,children:[(0,Z.jsxs)(`div`,{children:[r&&(0,Z.jsx)(`img`,{src:`/dungeon/${r.image}.webp`,alt:``}),(0,Z.jsx)(`strong`,{children:dungeonLootLabel460(n)})]}),p(e,e=>u(`loot`,i.loot.map((n,r)=>r===t?e:n))),(0,Z.jsx)(`button`,{className:`progression-remove`,"aria-label":`${dungeonLootLabel460(n)} ödülünü kaldır`,onClick:()=>u(`loot`,i.loot.filter((e,n)=>n!==t)),children:`Kaldır`})]},e.itemId)})]}):(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`p`,{children:`Başlangıç oranı her bölgede %1, miktarı 1 adettir. Bu oran tılsım ve etkinlik bonuslarından etkilenmez.`}),f.map(e=>{let t=te[e];return(0,Z.jsxs)(`article`,{className:`progression-drop`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`img`,{src:`/dungeon/${t.image}.webp`,alt:``}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:t.label}),(0,Z.jsxs)(`small`,{children:[t.areaName,` canavarları`]})]})]}),p(i[e],t=>u(e,t))]},e)})]}),(0,Z.jsx)(`button`,{className:`progression-save`,disabled:t,onClick:()=>void n({action:r===`solo`?`save_solo`:`save_materials`,config:i,revision:e.revision}),children:t?`Kaydediliyor…`:`Ayarları kaydet`})]})}function Ue({value:e,busy:t,act:n}){let[r,i]=(0,X.useState)(e.config),[a,o]=(0,X.useState)(``),[s,c]=(0,X.useState)(``),[l,u]=(0,X.useState)(!1);(0,X.useEffect)(()=>{i(e.config),u(!1)},[e.revision]);let d=e=>{i(e),u(!0)},f=ye.filter(e=>!r.loot.some(t=>t.itemId===e.id)&&`${e.name} ${e.group}`.toLocaleLowerCase(`tr-TR`).includes(a.toLocaleLowerCase(`tr-TR`)));return(0,Z.jsxs)(`section`,{className:`admin-card dragon-boss-editor`,children:[(0,Z.jsx)(`h2`,{children:`Ejderha Dünya Bossu · Külkanat Krateri`}),(0,Z.jsx)(`p`,{children:`Hasar ve ateş topu gücü mevcut dünya bossuyla aynıdır. Can ayarı bir sonraki doğuşta uygulanır. Hasar veren her oyuncu en az 3, en fazla 5 ayrı kişisel ganimet alır. Önce her satırın yüzdesi ayrı denenir; üç ganimet çıkmazsa eksikler açık satırlardan bu yüzdeler ağırlık kabul edilerek tamamlanır. Bu yüzden toplam kazanma ihtimali ilk yüzdeden yüksek olabilir. Beşten fazla çekiliş başarılı olursa aralarından rastgele beşi seçilir; listedeki sıra öncelik sağlamaz. Aynı eşya tekrar çıkabilir. %0 kapalıdır, %100 ilk çekilişte kesindir; beşli sınırda son seçim garantisi yoktur. Açık boss için en az bir oran pozitif olmalıdır.`}),(0,Z.jsxs)(`div`,{className:`dragon-config-grid`,children:[(0,Z.jsxs)(`label`,{children:[`Harita ve boss`,(0,Z.jsxs)(`select`,{value:r.enabled?`1`:`0`,onChange:e=>d({...r,enabled:e.target.value===`1`}),children:[(0,Z.jsx)(`option`,{value:`1`,children:`Oyunculara açık`}),(0,Z.jsx)(`option`,{value:`0`,children:`Kapalı`})]})]}),(0,Z.jsxs)(`label`,{children:[`Can`,(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`100000000`,value:r.hp,onChange:e=>d({...r,hp:Number(e.target.value)})})]}),(0,Z.jsxs)(`label`,{children:[`Yeniden doğma (dakika)`,(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`10080`,value:r.interval/60,onChange:e=>d({...r,interval:Math.round(Number(e.target.value)*60)})})]})]}),(0,Z.jsx)(`h3`,{children:`Tüm eşyalardan ganimet seç`}),(0,Z.jsx)(`p`,{children:`Liste ekipmanların tüm renk ve sınıflarını, malzemeleri, taşları, petleri, görünümleri ve Nesne Market ürünlerini içerir. Süreli ürünlerde süre teslimde başlar. Nadir ve ücretli ürünler varsayılan olarak kapalıdır.`}),(0,Z.jsxs)(`div`,{className:`dragon-item-picker`,children:[(0,Z.jsx)(`input`,{"aria-label":`Eşya ara`,placeholder:`İsim veya kategori ara…`,value:a,onChange:e=>{o(e.target.value),c(``)}}),(0,Z.jsxs)(`select`,{"aria-label":`Ganimete eklenecek eşya`,value:s,onChange:e=>c(e.target.value),children:[(0,Z.jsxs)(`option`,{value:``,children:[`Eşya seç (`,f.length,`)`]}),f.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.group,` · `,e.name]},e.id))]}),(0,Z.jsx)(`button`,{disabled:t||!s,onClick:()=>{d({...r,loot:[...r.loot,{itemId:s,chance:0,min:1,max:1}]}),c(``)},children:`Listeye ekle`})]}),(0,Z.jsx)(`div`,{className:`dragon-loot-editor-list`,children:r.loot.map((e,n)=>(0,Z.jsxs)(`div`,{className:`dragon-loot-row`,children:[(0,Z.jsxs)(`strong`,{children:[_.get(e.itemId)?.name,(0,Z.jsx)(`small`,{children:_.get(e.itemId)?.group})]}),[`chance`,`min`,`max`].map(t=>(0,Z.jsxs)(`label`,{children:[t===`chance`?`İlk şans (%)`:t===`min`?`En az`:`En çok`,(0,Z.jsx)(`input`,{type:`number`,min:t===`chance`?0:1,max:t===`chance`?100:1e4,step:t===`chance`?1e-4:1,value:e[t],onChange:e=>d({...r,loot:r.loot.map((r,i)=>i===n?{...r,[t]:Number(e.target.value)}:r)})})]},t)),(0,Z.jsx)(`button`,{"aria-label":`${_.get(e.itemId)?.name} kaldır`,disabled:t,onClick:()=>d({...r,loot:r.loot.filter((e,t)=>t!==n)}),children:`×`})]},e.itemId))}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{className:`admin-primary`,disabled:t||!l,onClick:()=>void n({action:`save_dragon`,dragonConfig:r,dragonRevision:e.revision}),children:`Ejderha ayarlarını kaydet`}),(0,Z.jsx)(`button`,{disabled:t||l||!r.enabled,onClick:()=>void n({action:`dragon_command`,dragonCommand:`spawn`}),children:`Ejderhayı şimdi getir`}),(0,Z.jsx)(`button`,{disabled:t||l,onClick:()=>void n({action:`dragon_command`,dragonCommand:`remove`},`Ejderha kaldırılsın ve doğma sayacı yeniden başlasın mı?`),children:`Kaldır ve sayacı başlat`})]})]})}function We({value:e,busy:t,save:n}){let[r,i]=(0,X.useState)(()=>structuredClone(e.config)),[o,s]=(0,X.useState)(e.revision),[c,l]=(0,X.useState)(``),u=JSON.stringify(r)!==JSON.stringify(e.config),d=o!==e.revision;function f(e,t,n){i(r=>({...r,tiers:r.tiers.map((r,i)=>i===e?{...r,[t]:n}:r)}))}async function p(){try{l(``),await n(we(r),o)&&s(o+1)}catch(e){l(e instanceof Error?e.message:`Kaydedilemedi.`)}}return(0,Z.jsxs)(`section`,{className:`admin-card level-curve-card`,children:[(0,Z.jsx)(`div`,{className:`admin-card-title`,children:(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Rütbe · 65. Seviye Sonrası`}),(0,Z.jsx)(`p`,{children:`Savaşçının Yolu hedefleri, her kademenin TP bedeli, bonusları ve kalıcı ödülleri.`})]})}),(0,Z.jsx)(`h3`,{children:`Savaşçının Yolu · Giriş görevi`}),(0,Z.jsx)(`div`,{className:`level-band-grid`,children:a.map(([e,t])=>(0,Z.jsxs)(`label`,{children:[t,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e5,value:r.requirements[e],onChange:t=>i(n=>({...n,requirements:{...n.requirements,[e]:Number(t.target.value)}}))}),(0,Z.jsx)(`small`,{children:`Normal canavar öldürme hedefi`})]},e))}),(0,Z.jsx)(`p`,{children:`Hedefi 50’den 5’e indirebilirsin. Kaydedince mevcut sayımlar korunur; yeni hedefleri tamamlayan oyuncuların rütbesi açılır.`}),(0,Z.jsxs)(`p`,{children:[`Öz Avcısı 1 görevle açılır. Diğer TP değerleri önceki kademeden bu kademeye geçiş bedelidir. Bonuslar `,(0,Z.jsx)(`b`,{children:`bu kademede eklenecek`}),` miktardır; önceki bonuslarla toplanır. Tablo değişince mevcut rütbe ve kademe içi ilerleme oranı korunur.`]}),(0,Z.jsx)(`div`,{className:`level-band-grid`,children:L.map(([e],n)=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsx)(`h3`,{style:{color:xe(n*3+1)},children:e}),(0,Z.jsxs)(`div`,{className:`level-band-actions`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>i(e=>({...e,tiers:e.tiers.map((e,t)=>t>0&&Math.floor(t/3)===n?{...e,xp:Math.max(1,Math.round(e.xp*.9))}:e)})),children:`%10 Kolaylaştır`}),(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>i(e=>({...e,tiers:e.tiers.map((e,t)=>t>0&&Math.floor(t/3)===n?{...e,xp:Math.min(1e8,Math.round(e.xp*1.1))}:e)})),children:`%10 Zorlaştır`})]}),r.tiers.slice(n*3,n*3+3).map((e,t)=>{let r=n*3+t;return(0,Z.jsxs)(`details`,{children:[(0,Z.jsxs)(`summary`,{children:[V(r+1),` · `,r?e.xp.toLocaleString(`tr-TR`)+` TP`:`Giriş görevi`]}),r>0&&(0,Z.jsxs)(`label`,{children:[`Gereken TP`,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e8,value:e.xp,onChange:e=>f(r,`xp`,Number(e.target.value))})]}),[[`hp`,`Can`,1e4],[`defense`,`Savunma`,1e3],[`pve`,`Canavarlara hasar (%)`,10],[`pvp`,`Oyunculara hasar (%)`,10]].map(([t,n,i])=>(0,Z.jsxs)(`label`,{children:[n,(0,Z.jsx)(`input`,{type:`number`,min:0,max:i,value:e[t],onChange:e=>f(r,String(t),Number(e.target.value))})]},t)),(0,Z.jsxs)(`label`,{children:[`Kalıcı görünüm ödülü`,(0,Z.jsxs)(`select`,{value:e.reward,onChange:e=>f(r,`reward`,e.target.value),children:[(0,Z.jsx)(`option`,{value:``,children:`Özel görünüm yok`}),K.map(e=>(0,Z.jsx)(`option`,{value:e.id,children:e.name},e.id))]})]})]},r)})]},e))}),c&&(0,Z.jsx)(`p`,{role:`alert`,children:c}),d&&(0,Z.jsx)(`p`,{role:`status`,children:`Canlı ayarlar değişti. Düzenlemeye devam etmek için güncel tabloyu yükle.`}),(0,Z.jsxs)(`div`,{className:`level-curve-footer`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>{i(structuredClone(e.config)),s(e.revision),l(``)},children:`Canlı tabloyu yükle`}),(0,Z.jsx)(`button`,{type:`button`,disabled:t||!u||d,onClick:()=>void p(),children:t?`Kaydediliyor…`:`Rütbe ayarlarını kaydet`})]})]})}function Ge(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(``),[i,a]=(0,X.useState)(!1),[o,s]=(0,X.useState)(``);async function c(){try{let e=await fetch(`/api/admin/updates`,{cache:`no-store`}),n=await e.json();if(!e.ok)throw Error(n.error);t(n),r(n.update.previewPlayerId)}catch(e){s(e instanceof Error?e.message:`Yüklenemedi.`)}}(0,X.useEffect)(()=>{c()},[]);async function l(r){if(!(!e||i)){a(!0),s(``);try{let i=await fetch(`/api/admin/updates`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({enabled:r,previewPlayerId:n,revision:e.update.revision})}),a=await i.json();if(!i.ok)throw Error(a.error);t(a),s(r?`65 seviye ve Kadim Kök Vadisi tüm oyunculara açıldı.`:`Önizleme kaydedildi. Yalnız seçili GM erişebilir.`)}catch(e){s(e instanceof Error?e.message:`Kaydedilemedi.`)}finally{a(!1)}}}return(0,Z.jsxs)(`section`,{className:`admin-card`,style:{gridColumn:`1 / -1`},children:[(0,Z.jsx)(`div`,{className:`admin-card-title`,children:(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Güncellemeler · 65 Seviye ve Kadim Kök Vadisi`}),(0,Z.jsx)(`p`,{children:e?.update.enabled?`Oyunculara açık`:`GM önizlemesi · oyunculara kapalı`})]})}),(0,Z.jsx)(`p`,{children:`50. seviyeden girilen yeni av bölgesi ve 65 seviye sınırı birlikte açılır. Önizlemede diğer oyuncuların sınırı 50 olarak kalır.`}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Önizleme yapacak GM`}),(0,Z.jsxs)(`select`,{"aria-label":`Önizleme yapacak GM`,value:n,disabled:i,onChange:e=>r(e.target.value),children:[(0,Z.jsx)(`option`,{value:``,children:`Kimse`}),e?.gms.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.name,` · Sv. `,e.level]},e.id))]})]}),(0,Z.jsx)(`p`,{children:`Seçili GM, oyundaki Işınlanma menüsünden haritaya girer. Haritaya giriş için GM de en az 50 seviye olmalıdır.`}),(0,Z.jsxs)(`p`,{children:[`Can ve hasar: `,(0,Z.jsx)(`b`,{children:`Savaş → Kadim Kök Vadisi`}),`. Tecrübe ve yeniden doğma: `,(0,Z.jsx)(`b`,{children:`Savaş → Kadim Kök Vadisi`}),`. Düşüşler: `,(0,Z.jsx)(`b`,{children:`Ganimet → Kadim Kök Vadisi`}),`. Seviye bedelleri: `,(0,Z.jsx)(`b`,{children:`Savaş → Seviye Kasılma Dengesi`}),`.`]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:i||!e,onClick:()=>void l(!1),children:`Yalnız Seçili GM’ye Aç`}),(0,Z.jsx)(`button`,{className:`admin-primary`,disabled:i||!e||!!e.update.enabled,onClick:()=>void l(!0),children:`Güncellemeyi Tüm Oyunculara Aç`}),(0,Z.jsx)(`button`,{disabled:i,onClick:()=>void c(),children:`Durumu Yenile`})]}),(0,Z.jsx)(`p`,{children:`Tekrar önizlemeye alırsan erişimi olmayan oyuncular güvenle Pazar Köyü’ne döner. Kazanılan seviyeler ve eşyalar korunur.`}),o&&(0,Z.jsx)(`p`,{role:`status`,children:o})]})}function Ke(props){return X.createElement(colSeasonalEditor453.Preview,props);}function qe(props){return X.createElement(colSeasonalEditor453.Panel,props);}function Je({prices:e,busy:t,act:n}){let[r,i]=(0,X.useState)(()=>I(e)),[a,o]=(0,X.useState)(()=>I(e));return(0,X.useEffect)(()=>{i(I(e)),o(I(e))},[e]),(0,Z.jsxs)(`section`,{className:`admin-card market-prices-admin`,children:[(0,Z.jsx)(`h2`,{children:`Nesne Market · Fiyatlar ve İndirimler`}),X.createElement('p',null,'ÇP kuponlarının indirim sonrası fiyatı kupon değerinden düşük olamaz: 100, 200 ve 500 ÇP.'),(0,Z.jsx)(`p`,{children:`ÇP ürünlerinde satın alma fiyatı doğrudan uygulanır. TL paketleri oyun içi ilan fiyatını değiştirir; Sonteklif ve Itemci ilanlarını ayrıca aynı fiyata güncellemelisin. ÇP paketlerinde indirim kapalıdır; yalnız normal fiyat değişir. Diğer ürünlerde %0 indirimi kaldırır. E-PIN’in verdiği ÇP miktarı değişmez.`}),(0,Z.jsx)(`div`,{className:`market-price-rows`,children:Object.entries(U).map(([e,t])=>(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:t.name}),(0,Z.jsxs)(`label`,{children:[`Normal fiyat (`,t.currency,`)`,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e6,step:1,value:r[e].base,onChange:t=>i(n=>({...n,[e]:{...n[e],base:Number(t.target.value)}}))})]}),(0,Z.jsxs)(`label`,{children:[`İndirim (%)`,(0,Z.jsx)(`input`,{disabled:e.startsWith(`coins_`),type:`number`,min:0,max:90,step:1,value:r[e].discount,onChange:t=>i(n=>({...n,[e]:{...n[e],discount:Number(t.target.value)}}))})]}),(0,Z.jsxs)(`b`,{children:[Ee(r,e).amount,` `,t.currency]})]},e))}),(0,Z.jsx)(`button`,{className:`admin-primary`,disabled:t,onClick:()=>void n({action:`save_market_prices`,prices:r,expectedPrices:a}),children:`Fiyatları ve indirimleri kaydet`})]})}var Ye={forest_after_level:30,forest_reduction_percent:30};function Xe({policy:e,busy:t,act:n}){let[r,i]=(0,X.useState)(e??Ye);(0,X.useEffect)(()=>i(e??Ye),[e]);let a=Number.isInteger(r.forest_after_level)&&r.forest_after_level>=0&&r.forest_after_level<=50&&Number.isInteger(r.forest_reduction_percent)&&r.forest_reduction_percent>=0&&r.forest_reduction_percent<=100;return(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsx)(`h2`,{children:"Av haritaları · Seviyeye göre eşya düşüşü"}),(0,Z.jsx)(`p`,{children:"Azaltma oranı Kuzey Ormanı için aşağıdaki seviyenin üstünde, Donmuş Geçit için 40 ve üstünde, Kara Bölge için 50 ve üstünde uygulanır. TP, Yaşam Özü, bosslar ve sabit artı malzemesi oranları etkilenmez."}),(0,Z.jsxs)(`div`,{className:`admin-grid`,children:[(0,Z.jsxs)(`label`,{children:[`Bu seviyeden sonra`,(0,Z.jsx)(`input`,{type:`number`,min:0,max:50,step:1,value:r.forest_after_level,onChange:e=>i({...r,forest_after_level:Number(e.target.value)})})]}),(0,Z.jsxs)(`label`,{children:[`Düşüş azaltma (%)`,(0,Z.jsx)(`input`,{type:`number`,min:0,max:100,step:1,value:r.forest_reduction_percent,onChange:e=>i({...r,forest_reduction_percent:Number(e.target.value)})})]})]}),(0,Z.jsx)(`p`,{children:r.forest_reduction_percent===0?`Azaltma kapalı.`:`${r.forest_after_level+1}. seviyeden itibaren eşya şansı %${r.forest_reduction_percent} azalır. Örneğin %10 şans, %${(10*(1-r.forest_reduction_percent/100)).toLocaleString(`tr-TR`)} olur.`}),(0,Z.jsx)(`button`,{className:`admin-primary`,disabled:t||!a||!e,onClick:()=>void n({action:`save_forest_loot_policy`,forestLootPolicy:r,expectedForestLootPolicy:e}),children:`Orman düşüş ayarını kaydet`})]})}function Ze(e,t,n,r,i,a){if(n===`schedule`){if(!Number.isSafeInteger(t.start)||!Number.isSafeInteger(t.end)||t.start<=0||t.end<=t.start)throw Error(`Başlangıç ve bitiş tarihini seç. Bitiş, başlangıçtan sonra olmalı.`);return{action:`event_schedule`,eventKind:e,eventStart:t.start,eventEnd:t.end,percent:t.percent,expectedEvents:a}}let o=(r*60+i)*60;if(!Number.isSafeInteger(r)||!Number.isSafeInteger(i)||r<0||i<0||i>59||!Number.isSafeInteger(o)||o<60||o>365*86400)throw Error(`Süre 1 dakika ile 365 gün arasında olmalı. Dakika alanına 0–59 yaz.`);return{action:`event_start`,eventKind:e,percent:t.percent,durationSeconds:o,expectedEvents:a}}var Qe=e=>e?new Date(e*1e3-new Date(e*1e3).getTimezoneOffset()*6e4).toISOString().slice(0,16):``;function $e(props){colHalloweenAdmin456??=colHalloweenAdminFactory456(X,colEventsModel456);return X.createElement(colHalloweenAdmin456.Panel,props);}var et=e=>new Date((e+10800)*1e3).toISOString().slice(0,16);function tt(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(T),[i,a]=(0,X.useState)(null),[o,s]=(0,X.useState)(`now`),[c,l]=(0,X.useState)(``),[u,d]=(0,X.useState)(24),[f,p]=(0,X.useState)(0),[m,h]=(0,X.useState)(!1),[g,_]=(0,X.useState)(``),[v,y]=(0,X.useState)(``),[b,x]=(0,X.useState)(0),S=(0,X.useRef)({server:0,local:0}),C=e=>{t(e),S.current={server:e.serverTime,local:performance.now()},x(e.serverTime)},w=e=>{a(e),r(e?{title:e.title,minimum:e.minimum,stages:structuredClone(e.stages)}:T()),s(e&&e.start>S.current.server+(performance.now()-S.current.local)/1e3?`schedule`:`now`),l(et(e?.start??Math.floor(Date.now()/1e3)+3600)),d(e?(e.end-e.start)/3600:24),p(0),_(``),y(``)};(0,X.useEffect)(()=>{let e=!0,t=new AbortController;fetch(`/api/admin/community-event`,{cache:`no-store`,signal:t.signal}).then(async t=>{let n=await t.json();if(!t.ok)throw Error(n.error);e&&(C(n),w(n.runs.find(e=>e.end>n.serverTime)??n.runs[0]??null))}).catch(t=>{e&&_(t.message)});let n=setInterval(()=>{S.current.server&&x(S.current.server+(performance.now()-S.current.local)/1e3)},1e3);return()=>{e=!1,t.abort(),clearInterval(n)}},[]);let E=e?.runs.find(e=>e.id===i?.id)??i,D=!!(E?.published&&b>=E.start),O=!!(E?.published&&b<E.end);async function k(e){if(!m){h(!0),_(``),y(``);try{let t=e===`save`||e===`publish`?{action:e,id:E?.id,revision:E?.revision,config:n,start:o===`now`?`now`:Math.floor(new Date(c+`:00+03:00`).getTime()/1e3),duration:Math.round(u*3600)}:{action:e,id:E?.id,revision:E?.revision,seconds:3600},r=await fetch(`/api/admin/community-event`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}),i=await r.json();if(!r.ok)throw Error(i.error);C(i),w(i.runs.find(e=>e.id===E?.id)??i.runs[0]),y(e===`publish`?`Etkinlik planı yayınlandı.`:e===`stop`?`Etkinlik durduruldu; kazanılmış ödül hakları korundu.`:`Ayarlar kaydedildi.`)}catch(e){_(e instanceof Error?e.message:`İşlem tamamlanamadı.`)}finally{h(!1)}}}let A=e=>r(t=>{let n=structuredClone(t);return e(n.stages[f]),n});return(0,Z.jsxs)(`section`,{className:`admin-community`,children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`p`,{children:`TOPLULUK ETKİNLİĞİ`}),(0,Z.jsx)(`h2`,{children:`Kuzey Ormanı Uyanıyor`}),(0,Z.jsx)(`span`,{children:`Tüm kanallar aynı hedef için birlikte savaşır.`})]}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`button`,{disabled:m,onClick:async()=>{h(!0);try{let e=await fetch(`/api/admin/community-event`,{cache:`no-store`}),t=await e.json();if(!e.ok)throw Error(t.error);C(t),w(t.runs.find(e=>e.id===E?.id)??null)}catch(e){_(e instanceof Error?e.message:`Yenilenemedi.`)}finally{h(!1)}},children:`Yenile`}),` `,(0,Z.jsx)(`button`,{disabled:m||!e,onClick:()=>w(null),children:`Yeni etkinlik`})]})]}),g&&(0,Z.jsx)(`p`,{className:`community-admin-error`,role:`alert`,children:g}),v&&(0,Z.jsx)(`p`,{role:`status`,children:v}),!e&&!g&&(0,Z.jsx)(`p`,{children:`Yükleniyor…`}),e&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`label`,{children:[`Etkinlik geçmişi`,(0,Z.jsxs)(`select`,{disabled:m,value:E?.id??``,onChange:t=>w(e.runs.find(e=>e.id===t.target.value)??null),children:[(0,Z.jsx)(`option`,{value:``,children:`Yeni taslak`}),e.runs.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.title,` · `,new Date(e.start*1e3).toLocaleString(`tr-TR`,{timeZone:`Europe/Istanbul`}),` · `,e.published?b<e.start?`Planlandı`:b<e.end?`Aktif`:`Bitti`:`Taslak`]},e.id))]})]}),E&&(0,Z.jsxs)(`p`,{children:[`Ortak ilerleme: `,(0,Z.jsx)(`b`,{children:E.total.toLocaleString(`tr-TR`)}),` · Bitiş: `,new Date(E.end*1e3).toLocaleString(`tr-TR`,{timeZone:`Europe/Istanbul`})]}),(0,Z.jsxs)(`fieldset`,{disabled:m||D,children:[(0,Z.jsxs)(`div`,{className:`community-admin-fields`,children:[(0,Z.jsxs)(`label`,{children:[`Etkinlik adı`,(0,Z.jsx)(`input`,{value:n.title,maxLength:64,onChange:e=>r({...n,title:e.target.value})})]}),(0,Z.jsxs)(`label`,{children:[`Kişisel asgari katkı`,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e5,value:n.minimum,onChange:e=>r({...n,minimum:Number(e.target.value)})})]}),(0,Z.jsxs)(`label`,{children:[`Başlangıç`,(0,Z.jsxs)(`select`,{value:o,onChange:e=>s(e.target.value),children:[(0,Z.jsx)(`option`,{value:`now`,children:`Yayınlayınca hemen`}),(0,Z.jsx)(`option`,{value:`schedule`,children:`Tarih ve saat seç`})]})]}),o===`schedule`&&(0,Z.jsxs)(`label`,{children:[`Türkiye saati (UTC+3)`,(0,Z.jsx)(`input`,{type:`datetime-local`,value:c,onChange:e=>l(e.target.value)})]}),(0,Z.jsxs)(`label`,{children:[`Süre (saat)`,(0,Z.jsx)(`input`,{type:`number`,min:1/60,max:720,step:`any`,value:u,onChange:e=>d(Number(e.target.value))})]})]}),(0,Z.jsx)(`nav`,{"aria-label":`Ödül kademeleri`,children:n.stages.map((e,t)=>(0,Z.jsxs)(`button`,{type:`button`,"aria-pressed":f===t,onClick:()=>p(t),children:[`Kademe `,t+1]},t))}),(0,Z.jsxs)(`label`,{children:[`Toplam canavar hedefi · Kademe `,f+1,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e7,value:n.stages[f].target,onChange:e=>A(t=>{t.target=Number(e.target.value)})})]}),(0,Z.jsx)(`p`,{children:`Hedefler birikimlidir ve her kademede artmalıdır.`}),n.stages[f].rewards.map((e,t)=>(0,Z.jsxs)(`div`,{className:`community-admin-reward`,children:[(0,Z.jsxs)(`label`,{children:[`Ödül`,(0,Z.jsx)(`select`,{value:e.kind,onChange:e=>A(n=>{n.rewards[t].kind=e.target.value}),children:Object.entries(P).map(([e,r])=>(0,Z.jsx)(`option`,{value:e,disabled:n.stages[f].rewards.some((n,r)=>r!==t&&n.kind===e),children:r},e))})]}),(0,Z.jsxs)(`label`,{children:[`Adet`,(0,Z.jsx)(`input`,{type:`number`,min:1,max:1e6,value:e.amount,onChange:e=>A(n=>{n.rewards[t].amount=Number(e.target.value)})})]}),(0,Z.jsx)(`button`,{type:`button`,disabled:n.stages[f].rewards.length===1,onClick:()=>A(e=>{e.rewards.splice(t,1)}),children:`Kaldır`})]},t)),(0,Z.jsx)(`button`,{type:`button`,disabled:n.stages[f].rewards.length===7,onClick:()=>A(e=>{let t=Object.keys(P).find(t=>!e.rewards.some(e=>e.kind===t));t&&e.rewards.push({kind:t,amount:1})}),children:`+ Ödül ekle`})]}),(0,Z.jsxs)(`div`,{className:`community-admin-preview`,children:[(0,Z.jsx)(`h3`,{children:`Oyuncuların göreceği ödüller`}),n.stages.map((e,t)=>(0,Z.jsxs)(`p`,{children:[(0,Z.jsxs)(`b`,{children:[t+1,`. Kademe · `,e.target.toLocaleString(`tr-TR`),` canavar`]}),(0,Z.jsx)(`br`,{}),ne(e.rewards)]},t))]}),(0,Z.jsx)(`p`,{children:`Başlayınca hedefler, ödüller ve kişisel katkı kilitlenir. Gerçek saldırı katkısı gerekir. Son hedef erken tamamlansa da süre bitene kadar kişisel katkı devam eder. Kazanılan ödüller bitişten sonra 72 saat alınabilir.`}),(0,Z.jsxs)(`footer`,{children:[!D&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`button`,{disabled:m,onClick:()=>void k(`save`),children:`Taslağı kaydet`}),(0,Z.jsx)(`button`,{disabled:m,className:`primary`,onClick:()=>void k(`publish`),children:o===`now`?`Etkinliği başlat`:`Etkinliği planla`})]}),O&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`button`,{disabled:m,onClick:()=>void k(`extend`),children:`Süreyi 1 saat uzat`}),(0,Z.jsx)(`button`,{disabled:m,onClick:()=>{window.confirm(`Etkinlik durdurulsun mu? Kazanılmış ödül hakları korunacak.`)&&k(`stop`)},children:`Etkinliği bitir`})]})]})]})]})}var nt=J(`activity`,[[`path`,{d:`M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2`,key:`169zse`}]]),rt=J(`ban`,[[`circle`,{cx:`12`,cy:`12`,r:`10`,key:`1mglay`}],[`path`,{d:`M4.929 4.929 19.07 19.071`,key:`196cmz`}]]),it=J(`copy`,[[`rect`,{width:`14`,height:`14`,x:`8`,y:`8`,rx:`2`,ry:`2`,key:`17jyea`}],[`path`,{d:`M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2`,key:`zix9uf`}]]),at=J(`download`,[[`path`,{d:`M12 15V3`,key:`m9g1x1`}],[`path`,{d:`M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4`,key:`ih7n3h`}],[`path`,{d:`m7 10 5 5 5-5`,key:`brsn70`}]]),ot=J(`earth`,[[`path`,{d:`M21.54 15H17a2 2 0 0 0-2 2v4.54`,key:`1djwo0`}],[`path`,{d:`M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17`,key:`1tzkfa`}],[`path`,{d:`M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05`,key:`14pb5j`}],[`circle`,{cx:`12`,cy:`12`,r:`10`,key:`1mglay`}]]),st=J(`globe`,[[`circle`,{cx:`12`,cy:`12`,r:`10`,key:`1mglay`}],[`path`,{d:`M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20`,key:`13o1zl`}],[`path`,{d:`M2 12h20`,key:`9i4pu4`}]]),ct=J(`inbox`,[[`polyline`,{points:`22 12 16 12 14 15 10 15 8 12 2 12`,key:`o97t9d`}],[`path`,{d:`M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z`,key:`oot6mr`}]]),lt=J(`layout-dashboard`,[[`rect`,{width:`7`,height:`9`,x:`3`,y:`3`,rx:`1`,key:`10lvy0`}],[`rect`,{width:`7`,height:`5`,x:`14`,y:`3`,rx:`1`,key:`16une8`}],[`rect`,{width:`7`,height:`9`,x:`14`,y:`12`,rx:`1`,key:`1hutg5`}],[`rect`,{width:`7`,height:`5`,x:`3`,y:`16`,rx:`1`,key:`ldoo1y`}]]),ut=J(`rotate-ccw`,[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}]]),Q=J(`save`,[[`path`,{d:`M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z`,key:`1c8476`}],[`path`,{d:`M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7`,key:`1ydtos`}],[`path`,{d:`M7 3v4a1 1 0 0 0 1 1h7`,key:`t51u73`}]]),dt=J(`search`,[[`path`,{d:`m21 21-4.34-4.34`,key:`14j7rj`}],[`circle`,{cx:`11`,cy:`11`,r:`8`,key:`4ej97u`}]]),ft=J(`shield-alert`,[[`path`,{d:`M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z`,key:`oel41y`}],[`path`,{d:`M12 8v4`,key:`1got3b`}],[`path`,{d:`M12 16h.01`,key:`1drbdi`}]]),pt=J(`trash-2`,[[`path`,{d:`M10 11v6`,key:`nco0om`}],[`path`,{d:`M14 11v6`,key:`outv1u`}],[`path`,{d:`M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6`,key:`miytrc`}],[`path`,{d:`M3 6h18`,key:`d0wm0j`}],[`path`,{d:`M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`,key:`e791ji`}]]),mt=J(`user-round-check`,[[`path`,{d:`M2 21a8 8 0 0 1 13.292-6`,key:`bjp14o`}],[`circle`,{cx:`10`,cy:`8`,r:`5`,key:`o932ke`}],[`path`,{d:`m16 19 2 2 4-4`,key:`1b14m6`}]]),ht=J(`user-round-minus`,[[`path`,{d:`M2 21a8 8 0 0 1 13.292-6`,key:`bjp14o`}],[`circle`,{cx:`10`,cy:`8`,r:`5`,key:`o932ke`}],[`path`,{d:`M22 19h-6`,key:`vcuq98`}]]);function gt({settings:e}){let[t,n]=(0,X.useState)(`ended`),[r,i]=(0,X.useState)(`visitor`),[a,o]=(0,X.useState)(`desktop`),[s,c]=(0,X.useState)(``),l=[e.registration_at,e.opens_at,e.ends_at].every(e=>Number.isFinite(e)&&e>0)&&e.registration_at<e.opens_at&&e.opens_at<e.ends_at,u=()=>c(`Bu bir ön izlemedir. Hesap oluşturulmaz, oturum veya erişim izinleri değiştirilmez.`);return(0,Z.jsxs)(`div`,{className:`launch-preview-shell`,children:[(0,Z.jsxs)(`div`,{className:`launch-preview-controls`,children:[(0,Z.jsxs)(`label`,{children:[`Dönem`,(0,Z.jsxs)(`select`,{value:t,onChange:e=>n(e.target.value),children:[(0,Z.jsx)(`option`,{value:`ended`,children:`Beta sonrası · Çok yakında`}),(0,Z.jsx)(`option`,{value:`waiting`,children:`Beta öncesi · Geri sayım`})]})]}),(0,Z.jsxs)(`label`,{children:[`Hesap görünümü`,(0,Z.jsxs)(`select`,{value:r,onChange:e=>{i(e.target.value),c(``)},children:[(0,Z.jsx)(`option`,{value:`visitor`,children:`Ziyaretçi · yalnız kayıt`}),(0,Z.jsx)(`option`,{value:`registered`,children:`Kayıtlı · izinsiz`})]})]}),(0,Z.jsxs)(`label`,{children:[`Ekran`,(0,Z.jsxs)(`select`,{value:a,onChange:e=>o(e.target.value),children:[(0,Z.jsx)(`option`,{value:`desktop`,children:`Bilgisayar`}),(0,Z.jsx)(`option`,{value:`mobile`,children:`Mobil`})]})]}),(0,Z.jsx)(`p`,{children:`Seçtiğin dönemin ön kayıt görünümü. Kaydedilmemiş değişiklikler canlıya uygulanmaz. Video oynatılabilir.`}),s&&(0,Z.jsx)(`p`,{role:`status`,children:s})]}),l?(0,Z.jsx)(`div`,{className:`launch-preview-viewport ${a===`mobile`?`launch-preview-mobile`:``}`,children:(0,Z.jsx)(Ie,{preview:!0,account:r===`visitor`?void 0:r===`allowed`?`İzinli Oyuncu`:`Kayıtlı Oyuncu`,status:{phase:t,showLanding:!0,canPlay:r===`allowed`,earlyAccess:r===`allowed`,registrationOpen:!0,registrationAt:e.registration_at,opensAt:e.opens_at,endsAt:e.ends_at,serverTime:Math.max(e.registration_at,Math.min(Date.now(),e.opens_at-1e3))},onRegister:u,onLogin:u,onPlay:u,onLogout:u})}):(0,Z.jsx)(`p`,{role:`alert`,children:`Ön izleme için geçerli kayıt, açılış ve bitiş tarihlerini sırayla seç.`})]})}var _t={pending:`Bekliyor`,sending:`İşleniyor`,accepted:`Gönderildi`,failed:`Hata`,review:`Kontrol gerekli`,cancelled:`İptal edildi`};function vt(e){return e===`provider_429`?`Resend gönderim sınırına ulaşıldı. Sistem bekleyip yeniden deneyecek; Resend kotanı kontrol et.`:e===`provider_401`||e===`provider_403`?`Resend API anahtarını ve doğrulanmış gönderici alan adını kontrol et. Ayarlar düzeldiğinde gönderim devam eder.`:e===`delivery_uncertain`?`Önceki gönderimin sonucu doğrulanamadı. Tekrar e-posta göndermemek için durduruldu; Resend kayıtlarını kontrol et.`:e?`Sağlayıcıya ulaşılamadı veya e-posta kabul edilmedi. Geçici hatalar otomatik yeniden denenir.`:``}function yt({initial:e}){let[t,n]=(0,X.useState)(e),[r,i]=(0,X.useState)(!1),[a,o]=(0,X.useState)(``);(0,X.useEffect)(()=>{n(e)},[e]);async function s(e){i(!0),o(``);try{let t=await fetch(`/api/admin/launch`,e?{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}:{cache:`no-store`}),r=await t.json();if(!t.ok)throw Error(r.error||`İşlem tamamlanamadı.`);n(r.email),e?.action===`email_test`&&o(`Test e-postası yönetici hesabının e-posta adresine gönderilmek üzere kabul edildi. Gelen kutusu ve spam klasörünü kontrol et.`)}catch(e){o(e instanceof Error?e.message:`İşlem tamamlanamadı.`)}finally{i(!1)}}return t?(0,Z.jsxs)(`section`,{style:{margin:`24px 0`,padding:`16px`,border:`1px solid #48654d`,borderRadius:10},children:[(0,Z.jsx)(`h3`,{children:`Açılış E-postası`}),(0,Z.jsx)(`p`,{children:`Yalnızca e-posta izni verenlere bir kez gönderilir. Gönderim, kaydedilen açılış saatinden 15 dakika önce başlar. Açılış tarihi değişirse gönderim saati de değişir. Manuel kapalı modda gönderim bekler; manuel açık modda da planlanan saatten önce başlamaz.`}),(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:t.configured?`Resend ayarları mevcut`:`Resend ayarları eksik veya geçersiz`}),` · `,t.enabled?t.waiting?`Gönderim zamanını bekliyor`:`Gönderim açık`:`Gönderim duraklatıldı`]}),Number.isFinite(t.sendAt)&&(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:`Gönderim başlangıcı:`}),` `,new Intl.DateTimeFormat(`tr-TR`,{timeZone:`Europe/Istanbul`,day:`numeric`,month:`long`,year:`numeric`,hour:`2-digit`,minute:`2-digit`}).format(new Date(t.sendAt)),` · Türkiye saati`]}),!t.configured&&(0,Z.jsx)(`p`,{children:`Sunucudaki RESEND_API_KEY, AUTH_EMAIL_FROM ve AUTH_PUBLIC_ORIGIN ayarlarını kontrol et.`}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsxs)(`span`,{children:[`İzin veren: `,(0,Z.jsx)(`strong`,{children:t.subscribers})]}),Object.entries(_t).map(([e,n])=>(0,Z.jsxs)(`span`,{children:[n,`: `,(0,Z.jsx)(`strong`,{children:t.counts[e]||0})]},e))]}),(0,Z.jsx)(`p`,{style:{fontSize:14},children:`“Gönderildi”, Resend’in e-postayı kabul ettiğini gösterir; gelen kutusuna ulaşma garantisi değildir. E-postalar sırayla gönderilir; günlük kota dolarsa kuyruk bekler.`}),(t.lastError||t.counts.review>0)&&(0,Z.jsx)(`p`,{role:`status`,children:vt(t.lastError||`delivery_uncertain`)}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:r,onClick:()=>void s({action:`email_enabled`,enabled:!t.enabled}),children:t.enabled?`Gönderimi Duraklat`:`Otomatik Gönderimi Aç`}),(0,Z.jsx)(`button`,{disabled:r||!t.configured,onClick:()=>void s({action:`email_test`}),children:`Bana Test E-postası Gönder`}),(0,Z.jsx)(`button`,{disabled:r,onClick:()=>void s(),children:`Durumu Yenile`})]}),a&&(0,Z.jsx)(`p`,{role:`status`,children:a}),(0,Z.jsxs)(`details`,{style:{marginTop:12},children:[(0,Z.jsx)(`summary`,{children:`E-posta içeriği`}),(0,Z.jsx)(`p`,{children:(0,Z.jsx)(`strong`,{children:t.preview.subject})}),(0,Z.jsx)(`p`,{children:t.preview.text}),(0,Z.jsxs)(`p`,{children:[`Düğme: `,t.preview.button,` · Alt bölüm: e-posta iznini kaldırma bağlantısı`]})]}),t.recent.length>0&&(0,Z.jsxs)(`details`,{style:{marginTop:12},children:[(0,Z.jsx)(`summary`,{children:`Son gönderimler`}),t.recent.map((e,t)=>(0,Z.jsxs)(`p`,{children:[e.username,` · `,_t[e.status]||e.status,e.last_error?` · `+vt(e.last_error):``]},t))]})]}):(0,Z.jsxs)(`section`,{children:[(0,Z.jsx)(`h3`,{children:`Açılış E-postası`}),(0,Z.jsx)(`p`,{children:`Bu bölüm için güncel VDS paketini yükle.`})]})}var bt=e=>new Date(e+3*36e5).toISOString().slice(0,16),xt=e=>Date.parse(e+`:00+03:00`);function St(){return X.createElement(col438LaunchModeUI);}function Ct(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(``),[i,a]=(0,X.useState)(``),[o,s]=(0,X.useState)(1),[c,l]=(0,X.useState)(0),[u,d]=(0,X.useState)(!1),[f,p]=(0,X.useState)(!0),[m,h]=(0,X.useState)(``),g=(0,X.useRef)(!1);(0,X.useEffect)(()=>{let e=new AbortController;return p(!0),h(``),fetch(`/api/admin/launch?view=registrations&q=`+encodeURIComponent(i)+`&page=`+o,{cache:`no-store`,signal:e.signal}).then(async n=>{let r=await n.json();if(!n.ok)throw Error(r.error||`Kayıtlar alınamadı.`);e.signal.aborted||t(r)}).catch(t=>{e.signal.aborted||h(t.message)}).finally(()=>{e.signal.aborted||p(!1)}),()=>e.abort()},[i,o,c]);async function _(e){if(!g.current){g.current=!0,d(!0),h(``);try{let t=await fetch(`/api/admin/launch`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`grant`,accountId:e.id,allow:!e.allowed})}),n=await t.json();if(!t.ok)throw Error(n.error||`İzin değiştirilemedi.`);l(e=>e+1)}catch(e){h(e instanceof Error?e.message:`İşlem tamamlanamadı.`)}finally{g.current=!1,d(!1)}}}let v=e=>new Intl.DateTimeFormat(`tr-TR`,{timeZone:`Europe/Istanbul`,dateStyle:`medium`,timeStyle:`short`}).format(new Date(e*1e3));return(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsx)(`h2`,{children:`Kayıt Listesi`}),(0,Z.jsx)(`p`,{children:`Karakter oluşturmayanlar dahil bütün oyun hesapları. En yeni kayıt en üsttedir; tarihler Türkiye / KKTC saatidir.`}),(0,Z.jsxs)(`p`,{children:[(0,Z.jsxs)(`strong`,{children:[`Toplam kayıt: `,e?.totalRegistered??`…`]}),e&&i&&` · Aramayla eşleşen: ${e.total}`]}),(0,Z.jsxs)(`form`,{className:`admin-actions`,onSubmit:e=>{e.preventDefault(),s(1),a(n.trim()),l(e=>e+1)},children:[(0,Z.jsx)(`input`,{"aria-label":`Kayıt ara`,placeholder:`Kullanıcı adı, e-posta veya karakter`,value:n,onChange:e=>r(e.target.value),maxLength:80}),(0,Z.jsx)(`button`,{disabled:f||u,children:`Ara`}),(0,Z.jsx)(`button`,{type:`button`,disabled:f||u,onClick:()=>l(e=>e+1),children:`Yenile`})]}),(0,Z.jsxs)(`p`,{children:[`İzin verdiğin oyuncu farklı cihazdan bağlanacaksa bu bağlantıyı paylaş: `,(0,Z.jsx)(`a`,{href:`/early-access`,target:`_blank`,rel:`noreferrer`,children:`Test erişimini doğrula ↗`})]}),(0,Z.jsx)(`p`,{children:`Bağlantı tek başına oyun izni vermez. Oyuncu hesabını doğrular; yalnız izinliyse “Oyuna Gir” görünür.`}),m&&(0,Z.jsx)(`p`,{role:`alert`,children:m}),f&&(0,Z.jsx)(`p`,{role:`status`,children:`Kayıtlar yükleniyor…`}),e&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`div`,{style:{overflowX:`auto`},children:(0,Z.jsxs)(`table`,{style:{width:`100%`,textAlign:`left`},children:[(0,Z.jsx)(`thead`,{children:(0,Z.jsxs)(`tr`,{children:[(0,Z.jsx)(`th`,{children:`Kullanıcı`}),(0,Z.jsx)(`th`,{children:`E-posta`}),(0,Z.jsx)(`th`,{children:`Kayıt tarihi`}),(0,Z.jsx)(`th`,{children:`Karakter`}),(0,Z.jsx)(`th`,{children:`Erken erişim`})]})}),(0,Z.jsx)(`tbody`,{children:e.accounts.map(e=>(0,Z.jsxs)(`tr`,{children:[(0,Z.jsx)(`td`,{children:e.username}),(0,Z.jsx)(`td`,{style:{overflowWrap:`anywhere`},children:e.email}),(0,Z.jsx)(`td`,{children:v(e.created_at)}),(0,Z.jsx)(`td`,{children:e.player_name||`Henüz oluşturulmadı`}),(0,Z.jsxs)(`td`,{children:[(0,Z.jsx)(`span`,{children:e.allowed?`İzinli`:`Bekliyor`}),(0,Z.jsx)(`br`,{}),(0,Z.jsx)(`button`,{disabled:u||f,onClick:()=>void _(e),children:e.allowed?`İzni kaldır`:`İzin ver`})]})]},e.id))})]})}),!e.accounts.length&&!f&&(0,Z.jsx)(`p`,{children:`Kayıt bulunamadı.`}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:f||u||e.page<=1,onClick:()=>s(e.page-1),children:`Önceki`}),(0,Z.jsxs)(`span`,{children:[`Sayfa `,e.page,` / `,e.pageCount]}),(0,Z.jsx)(`button`,{disabled:f||u||e.page>=e.pageCount,onClick:()=>s(e.page+1),children:`Sonraki`})]})]})]})}var wt=`BETA İÇİN TÜM OYUNCULARI SİL`;function Tt(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(``),[i,a]=(0,X.useState)(!1),[o,s]=(0,X.useState)(``),[c,l]=(0,X.useState)(!1);async function u(o=!1){if(!(i||c)){a(!0),s(``);try{let i=await fetch(`/api/admin`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(o?{action:`beta_reset_execute`,token:e?.token,confirmation:n}:{action:`beta_reset_preview`})}),a=await i.json();if(!i.ok)throw Error(a.error||`İşlem tamamlanamadı.`);o?(l(!0),t(null),r(``),s(`Sıfırlama tamamlandı. Yedek alındı; sunucu yeniden başlıyor. Birkaç saniye sonra paneli yenileyebilirsin.`)):(t(a),r(``))}catch(e){s(e instanceof Error?e.message:`Bağlantı kesildi. Yeniden denemeden önce paneli yenileyip sonucu kontrol et.`),o&&t(null)}finally{a(!1)}}}return(0,Z.jsxs)(`section`,{className:`admin-card danger-card beta-reset-card`,children:[(0,Z.jsx)(`h2`,{children:`Açık Beta Öncesi Tam Sıfırlama`}),(0,Z.jsx)(`p`,{children:`Yönetici hesabı dışındaki tüm oyun hesapları silinir. Yönetici karakteri dahil bütün karakterler, seviye ve paralar, ekipmanlar, depolar, kanatlar, petler, taşlar, pazarlar, loncalar ve zindan ilerlemeleri temizlenir. Oyuncular yeniden kayıt olur.`}),(0,Z.jsx)(`p`,{children:`Yönetici erişimi, oyun dengesi ve düşme oranları korunur. Ödeme ve işlem kayıtları saklanır. Önceden oluşturulan E-Pinler silinmez veya iptal edilmez; kodlar, süreleri ve kullanım durumları aynen korunur. Önce doğrulanmış yedek alınır. İşlem sonunda tüm oyun oturumları kapanır ve sunucu kısa süreli yeniden başlar.`}),!e&&!c&&(0,Z.jsx)(`button`,{type:`button`,disabled:i,onClick:()=>void u(),children:`Sıfırlama Önizlemesini Aç`}),e&&(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`p`,{children:(0,Z.jsxs)(`strong`,{children:[e.accounts,` hesap · `,e.players,` karakter · `,e.items,` çanta/depo ekipmanı`]})}),(0,Z.jsxs)(`p`,{children:[`Bu sayılara ek olarak tüm petler, kanatlar, malzemeler ve pazar eşyaları da temizlenir. `,e.preservedAdminAccounts,` yönetici oyun hesabı korunur. Onay 5 dakika geçerlidir.`]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsxs)(`span`,{children:[`Onaylamak için aynen yaz: `,(0,Z.jsx)(`strong`,{children:wt})]}),(0,Z.jsx)(`input`,{autoComplete:`off`,value:n,onChange:e=>r(e.target.value),disabled:i})]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:i||n!==wt||Date.now()>e.expiresAt,onClick:()=>void u(!0),children:i?`Yedek alınıyor ve sıfırlanıyor…`:`Yedek Al ve Tüm Test Verilerini Sil`}),(0,Z.jsx)(`button`,{type:`button`,disabled:i,onClick:()=>{t(null),r(``)},children:`Vazgeç`})]})]}),o&&(0,Z.jsx)(`p`,{role:`status`,children:o})]})}function Et({players:e,selectedPlayerId:t,busy:n,act:r}){let[i,a]=(0,X.useState)(``),[o,s]=(0,X.useState)(100),[c,l]=(0,X.useState)(``),u=(0,X.useRef)(null),d=(0,X.useRef)(!1),f=e.find(e=>e.id===t)?.name??``;(0,X.useEffect)(()=>{a(f),l(``)},[f]);let p=e.find(e=>e.name===i.trim());async function m(){if(d.current||n)return;let e=i.trim();if(!(!e||!Number.isSafeInteger(o)||o<1||o>1e6)){d.current=!0,l(``),(!u.current||u.current.playerName!==e||u.current.amount!==o)&&(u.current={playerName:e,amount:o,requestId:crypto.randomUUID()});try{let e=await r({action:`grant_core_coins`,...u.current});if(e?.coreCoinGrant){let t=e.coreCoinGrant;u.current=null,l(`${t.playerName}: ${t.amount.toLocaleString(`tr-TR`)} ÇP ${t.replayed?`daha önce gönderilmişti; tekrar eklenmedi`:`gönderildi`}. İşlem sonrası bakiye: ${t.balance.toLocaleString(`tr-TR`)} ÇP.`)}}finally{d.current=!1}}}return(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(v,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncuya ÇP Gönder`}),(0,Z.jsx)(`p`,{children:`Oyuncunun mevcut Çekirdek Parası bakiyesine eklenir. Çevrim dışındaki oyunculara da gönderebilirsin.`})]})]}),(0,Z.jsxs)(`div`,{className:`stone-book-admin-grant`,children:[(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Oyuncunun tam adı`}),(0,Z.jsx)(`input`,{list:`core-coin-players`,maxLength:32,value:i,disabled:n,onChange:e=>{a(e.target.value),l(``)}}),(0,Z.jsx)(`datalist`,{id:`core-coin-players`,children:e.map(e=>(0,Z.jsx)(`option`,{value:e.name},e.id))})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Gönderilecek ÇP`}),(0,Z.jsx)(`input`,{type:`number`,inputMode:`numeric`,min:1,max:1e6,step:1,value:o,disabled:n,onChange:e=>{s(Number(e.target.value)),l(``)}})]})]}),p&&(0,Z.jsxs)(`p`,{children:[p.name,` · Mevcut bakiye: `,(0,Z.jsxs)(`strong`,{children:[Number(p.core_coins??0).toLocaleString(`tr-TR`),` ÇP`]})]}),(0,Z.jsxs)(`button`,{type:`button`,className:`admin-primary`,disabled:n||!i.trim()||!Number.isSafeInteger(o)||o<1||o>1e6,onClick:()=>void m(),children:[(0,Z.jsx)(v,{}),` `,n?`İşleniyor…`:`ÇP Gönder`]}),c&&(0,Z.jsx)(`p`,{role:`status`,children:c})]})}function Dt({player:e,settings:t,busy:n,act:r}){let i=e?.rank?.tier??0,[a,o]=(0,X.useState)(i||1),[s,c]=(0,X.useState)(``),l=(0,X.useRef)(!1);(0,X.useEffect)(()=>{o(i||1),c(``)},[e?.id,i]);let u=W(a,t.config),d=t.config.tiers.slice(0,a).map(e=>K.find(t=>t.id===e.reward)).filter(Boolean);async function f(){if(!(!e||e.level<65||n||l.current)){l.current=!0;try{await r({action:`grant_rank`,playerId:e.id,tier:a,expectedTier:i})&&c(`${e.name}: ${V(a)} uygulandı.`)}finally{l.current=!1}}}return(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(ve,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncuya Rütbe Ver`}),(0,Z.jsx)(`p`,{children:`Anlık Oyuncu Kontrolü’nden seçtiğin 65. seviye oyuncuya doğrudan rütbe ve kademe uygula.`})]})]}),(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:e?.name??`Önce oyuncu seç`}),e&&` · Sv. ${e.level} · Mevcut: ${i?V(i):`Rütbe açılmamış`}`]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Verilecek rütbe ve kademe`}),(0,Z.jsx)(`select`,{value:a,disabled:n||!e,onChange:e=>{o(Number(e.target.value)),c(``)},children:t.config.tiers.map((e,t)=>(0,Z.jsx)(`option`,{value:t+1,children:V(t+1)},t))})]}),(0,Z.jsxs)(`p`,{style:{color:xe(a)},children:[(0,Z.jsx)(`strong`,{children:V(a)}),` · Toplam +`,u.hp,` can, +`,u.defense,` savunma, +%`,u.pve,` canavar hasarı, +%`,u.pvp,` oyuncu hasarı.`]}),(0,Z.jsx)(`p`,{children:d.length?`Açılan görünümler: ${d.map(e=>e.name).join(`, `)}.`:`Bu kademeye kadar özel görünüm ödülü yok.`}),(0,Z.jsx)(`p`,{children:`Görev şartı atlanır; seçilen kademenin başlangıç tecrübesi uygulanır. Aynı rütbe tekrar verilirse mevcut tecrübe korunur. Daha düşük rütbe seçilirse bonuslar azalır; kazanılmış görünümler korunur.`}),e&&e.level<65&&(0,Z.jsx)(`p`,{role:`status`,children:`Önce oyuncuyu Anlık Oyuncu Kontrolü’nden 65. seviyeye getir.`}),(0,Z.jsxs)(`button`,{type:`button`,className:`admin-primary`,disabled:n||!e||e.level<65,onClick:()=>void f(),children:[(0,Z.jsx)(ve,{}),`Rütbeyi Uygula`]}),s&&(0,Z.jsx)(`p`,{role:`status`,children:s})]})}var Ot={enabled:`Zindan açık (1) / kapalı (0)`,minimum_level:`Giriş seviyesi`,ready_seconds:`Hazırlık süresi (sn)`,duration_seconds:`Azami koşu süresi (sn)`,enemy_hp:`Canavar temel canı (3 kişi)`,boss_hp:`Boss temel canı (3 kişi)`,enemy_damage:`Canavar hasarı`,boss_damage:`Boss hasarı`,crystal_hp:`Korunacak kristalin canı`,wing_bonus_chance:`İkinci Kanat Parçası %`,infinite_bonus_chance:`İkinci Sonsuz Taşı Parçası %`,pet_bonus_chance:`İkinci Ejderha Parçası %`,red_chance:`Kırmızı eşya düşme %`,helmet_chance:`Zindan son boss · Kask düşme %`,wing_cost:`Kanat için parça`,infinite_cost:`Sonsuz için parça`,infinite_gems:`Sonsuz için mücevher`,infinite_pearls:`Sonsuz için beyaz inci`,pet_cost:`Ejderha için parça`,pet_gems:`Ejderha için mücevher`,winner_gems:`Hasar birincisi mücevher`,winner_red_chance:`Hasar birincisi ek kırmızı eşya %`,infinite_weapon_power:`Sonsuz standart silah gücü`,infinite_power_percent:`Sonsuz savunma ekipmanı / özel silah güç artışı %`};function kt({settings:e,busy:t,act:n}){let[r,i]=(0,X.useState)(e??{}),[a,o]=(0,X.useState)(``),[s,c]=(0,X.useState)(`wing`),[l,u]=(0,X.useState)(1);return(0,X.useEffect)(()=>i(e??{}),[e]),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsx)(`h2`,{children:`Çekirdeğin Kalbi · Zindan ve ödüller`}),(0,Z.jsx)(`p`,{children:`Yeni koşular güncel ayarlarla açılır. Başlamış koşuların zorluğu ve ödül olasılıkları değişmez. Her oyuncuya Kanat, Sonsuz Taşı ve Ejderha parçalarının her birinden 1 adet kesin düşer. İkinci adet aşağıdaki ayrı olasılıkla çıkar (varsayılan %10); toplam en fazla 2 adettir. Oranı 0 yapmak yalnız ikinci adedi kapatır. Kırmızı eşya ve kask ayrı zar atar. Hasar birincisinin ek kırmızı ödülü aşağıdaki ayrı oranla belirlenir (0 ile kapanır). Aktif Ganimet Bereketi, ikinci parça ve diğer düşüş olasılıklarını artırır; üst sınır %100’dür. Kristal Sandığı yalnız kendi etkinliği aktifken, etkinlik panelindeki oranla düşer. Kanat, Sonsuz ve Ejderha parçaları; silah, zırh, kask, çizme, kolye ve Kristal Sandığı pazarda satılabilir. Mücevher doğrudan para birimidir.`}),e?(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),n({action:`dungeon_settings`,settings:r})},children:[(0,Z.jsx)(`div`,{className:`dungeon-admin-grid`,children:Object.entries(Ot).map(([e,t])=>(0,Z.jsxs)(`label`,{children:[t,(0,Z.jsx)(`input`,{type:`number`,min:0,max:e.endsWith(`_chance`)?100:e===`enabled`?1:void 0,step:e.endsWith(`_chance`)?.1:1,value:r[e]??0,onChange:t=>i(n=>({...n,[e]:Number(t.target.value)}))})]},e))}),(0,Z.jsx)(`button`,{disabled:t,children:`Zindan ayarlarını kaydet`})]}),(0,Z.jsx)(`h3`,{children:`Oyuncuya zindan ödülü ver`}),(0,Z.jsxs)(`form`,{className:`dungeon-admin-grant`,onSubmit:e=>{e.preventDefault(),n({action:`dungeon_grant`,playerName:a,kind:s,amount:l})},children:[(0,Z.jsx)(`input`,{required:!0,"aria-label":`Oyuncu adı`,placeholder:`Tam oyuncu adı`,value:a,onChange:e=>o(e.target.value)}),(0,Z.jsx)(`select`,{"aria-label":`Ödül`,value:s,onChange:e=>c(e.target.value),children:[[`wing`,`Kanat Parçası`],[`infinite`,`Sonsuz Taşı Parçası`],[`pet`,`Ejderha Parçası`],[`wings`,`Kalbin Işığı Kanatları`],[`dragon`,`Çekirdek Ejderhası`]].map(([e,t])=>(0,Z.jsx)(`option`,{value:e,children:t},e))}),![`wings`,`dragon`].includes(s)&&(0,Z.jsx)(`input`,{"aria-label":`Miktar`,type:`number`,min:1,max:1e4,value:l,onChange:e=>u(Number(e.target.value))}),(0,Z.jsx)(`button`,{disabled:t,children:`Oyuncuya ver`})]})]}):(0,Z.jsx)(`p`,{children:`Zindan sunucu güncellemesi henüz kurulmamış.`})]})}function At({curve:e,busy:t,save:n}){let[r,i]=(0,X.useState)(e),[a,o]=(0,X.useState)(()=>e?JSON.parse(e):C()),[s,c]=(0,X.useState)(``),[u,d]=(0,X.useState)(300),f=JSON.stringify(a)!==r,p=(e,t)=>{c(``),o(n=>De(n,e+1,e+2,1,t))},m=(e,t,n)=>{c(``),o(r=>De(r,e,t,n))},h=async()=>{try{H(a),c(``),await n(a,r)&&i(JSON.stringify(a))}catch(e){c(e instanceof Error?e.message:`Tablo kaydedilemedi.`)}};return(0,Z.jsxs)(`section`,{className:`admin-card level-curve-card`,children:[(0,Z.jsx)(`div`,{className:`admin-card-title`,children:(0,Z.jsxs)(`div`,{children:[(0,Z.jsxs)(`h2`,{children:[`Seviye Kasılma Dengesi `,(0,Z.jsx)(`span`,{children:`En fazla 65 · açık sınır Güncellemeler’den yönetilir`})]}),(0,Z.jsx)(`p`,{children:`İlk 10 seviye hızlı, son 10 seviye zor. TP bedelini artırmak kasılmayı yavaşlatır.`})]})}),(0,Z.jsx)(`p`,{children:`Kaydettiğinde mevcut oyuncuların seviyesi ve seviye içindeki ilerleme oranı korunur. Süreler tahmindir; ekipman, grup ve EXP bonusları sonucu değiştirir.`}),e!==r&&(0,Z.jsx)(`p`,{role:`status`,children:`Canlı tablo değişti. Kaydetmeden önce güncel tabloyu yükle.`}),(0,Z.jsx)(`p`,{children:`Değerler tam sayıya ve izin verilen sınırlara otomatik uyarlanır. Sıra bozulursa yalnız gerekli komşu seviyeler düzeltilir; kaydetmeden önce güncel toplamları görebilirsin.`}),(0,Z.jsxs)(`div`,{className:`level-curve-toolbar`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>m(1,a.length+1,.9),children:`Tümünü %10 kolaylaştır`}),(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>m(1,a.length+1,1.1),children:`Tümünü %10 zorlaştır`}),(0,Z.jsxs)(`label`,{children:[`Tahmin için dakikada kazanılan TP`,(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`10000000`,value:u,onChange:e=>d(Math.max(1,Number(e.target.value)||1))})]}),(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>{o(JSON.parse(e)),i(e),c(``)},children:`Canlı tabloyu yükle`})]}),(0,Z.jsx)(`div`,{className:`level-band-grid`,children:[...l,...a.length===64?O:[]].map(({from:e,to:n})=>{let r=a.slice(e-1,n-1).reduce((e,t)=>e+t,0);return(0,Z.jsxs)(`article`,{children:[(0,Z.jsxs)(`h3`,{children:[e,` → `,n,` `,(0,Z.jsx)(`small`,{children:e===1?`Hızlı başlangıç`:e>=40?`Zorlu son seviyeler`:`Kademeli ilerleme`})]}),(0,Z.jsxs)(`strong`,{children:[r.toLocaleString(`tr-TR`),` TP`]}),(0,Z.jsxs)(`p`,{children:[`Girilen hıza göre ≈ `,Math.round(r/u),` dakika`]}),(0,Z.jsxs)(`div`,{className:`level-band-actions`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>m(e,n,.9),children:`%10 Kolaylaştır`}),(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>m(e,n,1.1),children:`%10 Zorlaştır`})]}),(0,Z.jsxs)(`details`,{children:[(0,Z.jsx)(`summary`,{children:`Seviyeleri tek tek düzenle`}),a.slice(e-1,n-1).map((t,n)=>(0,Z.jsxs)(`label`,{children:[(0,Z.jsxs)(`span`,{children:[e+n,` → `,e+n+1,` TP`]}),(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`100000000`,step:`1`,value:t,onChange:t=>p(e-1+n,Number(t.target.value))})]},n))]})]},e)})}),s&&(0,Z.jsx)(`p`,{role:`alert`,className:`level-curve-error`,children:s}),(0,Z.jsxs)(`div`,{className:`level-curve-footer`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:t,onClick:()=>o(a.length===64?k(C()):C()),children:`Geçici başlangıç tablosunu yükle`}),(0,Z.jsx)(`button`,{type:`button`,disabled:t||!f||e!==r,onClick:()=>void h(),children:t?`Kaydediliyor…`:f?`Seviye tablosunu kaydet`:`Tablo güncel`})]})]})}var jt=[`sokan`,`levrek`,`zargana`,`pearl`,`talisman`];function Mt(e){if(!e||typeof e!=`object`)throw Error(`Yakalama oranlarını gir.`);let t=jt.map(t=>e[t]??(t===`talisman`?0:NaN));if(t.some(e=>typeof e!=`number`||!Number.isFinite(e)||e<0||e>100||Math.abs(e*100-Math.round(e*100))>1e-6))throw Error(`Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.`);if(t.reduce((e,t)=>e+Math.round(t*100),0)!==1e4)throw Error(`Yakalama oranlarının toplamı %100 olmalı.`);return{fish_sokan_weight:Math.round(t[0]*100),fish_levrek_weight:Math.round(t[1]*100),fish_zargana_weight:Math.round(t[2]*100),fishing_pearl_chance:t[3]/100,...`talisman`in e?{fishing_talisman_chance:t[4]/100}:{}}}function Nt(e){let t=Math.max(0,Math.min(1e4,Math.round((e.fishing_pearl_chance??.03)*1e4))),n=Math.max(0,Math.min(1e4-t,Math.round((e.fishing_talisman_chance??0)*1e4))),r=[e.fish_sokan_weight??55,e.fish_levrek_weight??30,e.fish_zargana_weight??15].map(e=>Math.max(0,e)),i=r.reduce((e,t)=>e+t,0)||1,a=r.map(e=>e/i*(1e4-t-n)),o=a.map(Math.floor),s=1e4-t-n-o.reduce((e,t)=>e+t,0),c=[0,1,2].sort((e,t)=>a[t]-o[t]-(a[e]-o[e]));s>3&&(o[0]+=s,s=0);for(let e=0;e<s;e++)o[c[e]]++;return{sokan:o[0]/100,levrek:o[1]/100,zargana:o[2]/100,pearl:t/100,...e.fishing_talisman_chance===void 0?{}:{talisman:n/100}}}var Pt=new Intl.DateTimeFormat(`tr-TR`,{day:`2-digit`,month:`2-digit`,hour:`2-digit`,minute:`2-digit`,second:`2-digit`,timeZone:`Europe/Istanbul`});function Ft(){let[e,t]=(0,X.useState)([]),[n,r]=(0,X.useState)(!0),[i,a]=(0,X.useState)(``),[o,s]=(0,X.useState)(0),[c,l]=(0,X.useState)(0);return(0,X.useEffect)(()=>{let e=!1,n,i=null,o=!0,c=async()=>{if(e||!o||document.visibilityState===`hidden`||i)return;let l=new AbortController;i=l,r(!0);let u=setTimeout(()=>l.abort(),15e3);try{let n=await fetch(`/api/admin/gm?view=world-chat`,{cache:`no-store`,signal:l.signal});if(e||i!==l||l.signal.aborted)return;if(n.status===401||n.status===403){o=!1,t([]),a(`Dünya sohbetini görmek için ana yönetici oturumunu açmalısın.`);return}let r=await n.json();if(e||i!==l||l.signal.aborted)return;if(!n.ok||!Array.isArray(r.messages))throw Error(`Dünya sohbeti yenilenemedi. Tekrar denenecek.`);t(r.messages),s(Date.now()),a(``)}catch{!e&&i===l&&a(`Dünya sohbeti yenilenemedi. Tekrar denenecek.`)}finally{clearTimeout(u),i===l&&(i=null,e||(r(!1),o&&document.visibilityState!==`hidden`&&(n=setTimeout(()=>void c(),5e3))))}},l=()=>{clearTimeout(n),document.visibilityState===`hidden`?(i?.abort(),i=null,r(!1)):c()};return document.addEventListener(`visibilitychange`,l),c(),()=>{e=!0,clearTimeout(n),i?.abort(),i=null,document.removeEventListener(`visibilitychange`,l)}},[c]),(0,Z.jsxs)(`section`,{className:`admin-card gm-world-chat-card`,children:[(0,Z.jsxs)(`div`,{className:`gm-world-chat-heading`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(st,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Dünya Sohbeti`}),(0,Z.jsx)(`p`,{children:`Tüm kanallardaki son 100 mesaj. En yeni mesaj üstte; bu bölüm açıkken 5 saniyede bir yenilenir.`})]})]}),(0,Z.jsxs)(`button`,{type:`button`,className:`gm-world-chat-refresh`,disabled:n,onClick:()=>l(e=>e+1),children:[(0,Z.jsx)(je,{"aria-hidden":`true`}),n?`Yükleniyor…`:`Yenile`]})]}),(0,Z.jsx)(`p`,{className:`gm-world-chat-status`,children:o?`Son yenileme: ${Pt.format(o)} · Türkiye saati`:`Dünya sohbeti yükleniyor…`}),i&&(0,Z.jsx)(`p`,{className:`gm-error`,role:`status`,children:i}),(0,Z.jsxs)(`div`,{className:`gm-world-chat-list`,role:`region`,"aria-label":`Dünya sohbeti mesajları`,"aria-busy":n,tabIndex:0,children:[e.map(e=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsx)(`strong`,{children:e.player_name}),(0,Z.jsx)(`time`,{dateTime:new Date(e.created_at*1e3).toISOString(),children:Pt.format(e.created_at*1e3)})]}),(0,Z.jsx)(`p`,{children:e.body})]},e.id)),!n&&!i&&!e.length&&(0,Z.jsx)(`p`,{className:`gm-world-chat-empty`,children:`Henüz dünya sohbeti mesajı yok.`})]})]})}var It=e=>e===`avci`?`Avcı`:e===`arkanist`?`Arkanist`:`Muhafız`;async function Lt(e){let t=await fetch(`/api/admin/gm`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify(e)}),n=await t.json();if(!t.ok)throw Error(n.error??`İşlem tamamlanamadı.`);return n}function Rt(){let[e,t]=(0,X.useState)(null),[n,r]=(0,X.useState)(``),[i,a]=(0,X.useState)(null),[o,s]=(0,X.useState)(!1),[c,l]=(0,X.useState)(!0),[u,f]=(0,X.useState)(``),[p,m]=(0,X.useState)(``),h=(0,X.useRef)(0),g=(0,X.useRef)(n);g.current=n;let _=(0,X.useCallback)(async e=>{let n=++h.current;try{let r=await fetch(`/api/admin/gm?q=${encodeURIComponent(g.current)}`,{cache:`no-store`,signal:e}),i=await r.json();if(!r.ok)throw Error(i.error??`GM listesi yüklenemedi.`);n===h.current&&(t(i),f(``),a(e=>e?i.players.find(t=>t.id===e.id)??i.gms.find(t=>t.id===e.id)??e:null))}catch(t){!e?.aborted&&n===h.current&&f(t instanceof Error?t.message:`Bağlantı kurulamadı.`)}finally{n===h.current&&l(!1)}},[]);(0,X.useEffect)(()=>{let e=new AbortController;l(!0);let t=setTimeout(()=>void _(e.signal),200);return()=>{clearTimeout(t),e.abort(),h.current+=1}},[n,_]);let v=async(e,t)=>{if(!o){s(!0),f(``),m(``);try{await Lt({action:`set_gm`,playerId:e.id,enabled:t}),a(n=>n?.id===e.id?{...n,is_gm:+!!t}:n),m(t?`${e.name} GM olarak atandı.`:`${e.name} için GM yetkisi kaldırıldı.`),await _()}catch(e){f(e instanceof Error?e.message:`Yetki değiştirilemedi.`)}finally{s(!1)}}};return(0,Z.jsxs)(`div`,{className:`gm-admin-layout`,children:[(0,Z.jsxs)("section",{className:"admin-card gm-site-visitors457",style:{gridColumn:"1 / -1"},children:[(0,Z.jsx)("h2",{children:"Bugünkü site ziyaretçisi"}),(0,Z.jsx)("strong",{style:{fontSize:"32px",color:"#9be6bc"},children:e?.siteVisitorsToday?.available?Number(e.siteVisitorsToday.count).toLocaleString('tr-TR'):"—"}),(0,Z.jsx)("p",{children:"Türkiye saatiyle günlük tekil tarayıcı sayısı. Sayfa yenilemeleri ve oyun sunucusuna geçişler tekrar sayılmaz."})]}),(0,Z.jsxs)(`section`,{className:`admin-card gm-management-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(d,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`GM Yönetimi`}),(0,Z.jsx)(`p`,{children:`Atadığın oyuncu sarı GM unvanı taşır ve oyun içinden duyuru gönderebilir. GM atama, ekonomi ve hesap yaptırımları sende kalır.`})]})]}),(0,Z.jsxs)(`label`,{className:`gm-search`,children:[(0,Z.jsx)(dt,{}),(0,Z.jsx)(`input`,{type:`search`,value:n,onChange:e=>r(e.target.value),placeholder:`Oyuncu veya hesap adı ara`,"aria-label":`GM yapılacak oyuncuyu ara`,maxLength:40})]}),(0,Z.jsxs)(`div`,{className:`gm-player-results`,"aria-busy":c,children:[c?(0,Z.jsx)(`p`,{children:`Oyuncular yükleniyor…`}):e?.players.map(t=>(0,Z.jsxs)(`button`,{type:`button`,className:i?.id===t.id?`selected`:``,"aria-pressed":i?.id===t.id,onClick:()=>{a(t),m(``)},children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:t.name}),(0,Z.jsxs)(`small`,{children:[`Sv. `,t.level,` · `,It(t.role)]})]}),t.is_gm===1?(0,Z.jsx)(`b`,{className:`gm-mini-badge`,children:`GM`}):(0,Z.jsx)(`small`,{children:t.last_seen*1e3>=(e?.serverNowMs??0)-3e4?`Çevrimiçi`:`Çevrimdışı`})]},t.id)),!c&&!e?.players.length&&(0,Z.jsx)(`p`,{children:`Oyuncu bulunamadı.`})]}),i&&(0,Z.jsxs)(`div`,{className:`gm-selected-player`,children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:i.name}),(0,Z.jsx)(`small`,{children:i.is_gm===1?`GM yetkisi açık`:`Oyuncu`})]}),(0,Z.jsxs)(`button`,{type:`button`,disabled:o,onClick:()=>void v(i,i.is_gm!==1),children:[i.is_gm===1?(0,Z.jsx)(ht,{}):(0,Z.jsx)(mt,{}),o?`Kaydediliyor…`:i.is_gm===1?`GM Yetkisini Kaldır`:`GM Yap`]})]}),u&&(0,Z.jsx)(`p`,{className:`gm-error`,role:`alert`,children:u}),p&&(0,Z.jsx)(`p`,{className:`gm-success`,role:`status`,children:p}),(0,Z.jsxs)(`div`,{className:`gm-roster`,children:[(0,Z.jsxs)(`h3`,{children:[`Görevli GM’ler `,(0,Z.jsx)(`span`,{children:e?.gms.length??0})]}),e?.gms.map(e=>(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`b`,{className:`gm-mini-badge`,children:`GM`}),(0,Z.jsx)(`strong`,{children:e.name}),(0,Z.jsx)(`button`,{type:`button`,disabled:o,onClick:()=>void v(e,!1),"aria-label":`${e.name} için GM yetkisini kaldır`,children:`Yetkiyi Kaldır`})]},e.id)),e&&!e.gms.length&&(0,Z.jsx)(`p`,{children:`Henüz GM atamadın.`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card gm-announcement-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(ke,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyun Duyurusu`}),(0,Z.jsx)(`p`,{children:`Mesajın tüm haritalarda, ekranın üst bilgi alanlarının altında seçtiğin süre boyunca görünür.`})]})]}),(0,Z.jsx)(F,{send:async(e,t,n)=>Lt({action:`announce`,body:e,requestId:t,durationSeconds:n}),author:`Oyun Yönetimi`,onSent:()=>void _()}),(0,Z.jsxs)(`div`,{className:`gm-history`,children:[(0,Z.jsx)(`h3`,{children:`Son Duyurular`}),e?.announcements.map(e=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsx)(`strong`,{children:e.player_name}),(0,Z.jsx)(`time`,{dateTime:new Date(e.created_at*1e3).toISOString(),children:new Date(e.created_at*1e3).toLocaleTimeString(`tr-TR`,{hour:`2-digit`,minute:`2-digit`})})]}),(0,Z.jsx)(`p`,{children:e.body})]},e.id)),e&&!e.announcements.length&&(0,Z.jsx)(`p`,{children:`Henüz duyuru gönderilmedi.`})]})]}),(0,Z.jsx)(Ft,{})]})}var zt=[{title:`Dünya Dengesi`,fields:[[`health_decay_per_second`,`Saniyelik sağlık kaybı (%)`,.001],[`donation_health_per_essence`,`1 özün iyileştirmesi (%)`,.01]]},{title:`Oyuncu Canı`,fields:[[`player_max_hp`,`Genel oyuncu azami canı`,10]]},{title:`Donmuş Çam Geçidi · Normal Canavarların Yeniden Doğması`,fields:[[`frozen_monster_respawn_seconds`,`Öldükten sonra bekleme (saniye, 1–3600)`,1]]},{title:`Kara Bölge · Canavarların Yeniden Doğması`,fields:[[`black_monster_respawn_seconds`,`Öldükten sonra bekleme (saniye, 1–3600)`,1]]},{title:`Otomatik Av Adası · Ön İzleme ve Ödüller`,fields:[[`afk_island_enabled`,`Oyunculara aç (0: yalnız yönetici, 1: açık)`,1],[`afk_island_xp_reward`,`Canavar başına temel TP`,1],[`afk_island_respawn_seconds`,`Yeniden doğma (saniye)`,1]]},{title:`Kuzey Ormanı · Canavarların Yeniden Doğması`,fields:[[`forest_monster_respawn_seconds`,`Öldükten sonra bekleme (saniye, 1–3600)`,1]]},{title:`Dinlenirken Can Yenilenmesi`,fields:[[`rest_regen_percent`,`Saniyede azami canın yüzdesi (0: kapalı)`,.5],[`rest_regen_combat_delay_seconds`,`Son saldırıdan sonra bekleme (saniye)`,1],[`rest_regen_still_seconds`,`Hareketsiz bekleme (saniye)`,1]]},{title:`Canavar Dinlenme Yenilenmesi`,fields:[[`monster_rest_regen_percent`,`Saniyede azami canın yüzdesi (0: kapalı)`,.5],[`monster_rest_regen_combat_delay_seconds`,`Saldırı bittikten sonra bekleme (saniye)`,1]]},{title:`Mor Eşya · Kök Vadisi ve Bosslar`,fields:[[`ancient_normal_purple_chance`,`Kök Vadisi normal canavarları · kesim başına (%)`,.001],[`ancient_boss_purple_chance`,`Kadim Kökün Muhafızı · öldürme başına (%)`,.001],[`world_boss_purple_chance`,`Dünya Bossu · öldürme başına (%)`,.001]]},{title:`Dünya Bossu`,fields:[[`boss_fire_interval_seconds`,`Kor Patlaması aralığı (1–60 sn)`,1],[`boss_fire_damage_multiplier`,`Kor Patlaması / düz vuruş (1,2 = %20 fazla)`,.1],[`boss_hp`,`Boss canı`,1e3],[`boss_damage_scale`,`Vuruş hasarı çarpanı`,.05],[`boss_respawn_seconds`,`Gelme aralığı (sn)`,60],[`boss_duration_seconds`,`Haritada kalma (sn)`,30]]},{title:`Kadim Kök Vadisi · Tecrübe ve Yeniden Doğma`,fields:[[`ancient_golge_xp_reward`,`Kızıl Pençe TP`,1],[`ancient_curuk_xp_reward`,`Kök Muhafızı TP`,1],[`ancient_yutan_xp_reward`,`Kül Kâhini TP`,1],[`ancient_monster_respawn_seconds`,`Yeniden doğma (saniye)`,1]]},{title:`Kadim Kökün Muhafızı · Merkez Bossu`,fields:[[`ancient_boss_enabled`,`Boss açık (1) / kapalı (0)`,1],[`ancient_boss_hp`,`Boss canı`,100],[`ancient_boss_damage_scale`,`Hasar çarpanı`,.05],[`ancient_boss_respawn_seconds`,`Yeniden doğma (saniye; varsayılan 2400)`,60],[`ancient_boss_xp_reward`,`TP ödülü`,1],[`ancient_boss_reward_gems`,`Mücevher ödülü`,1]]},{title:`Canavar Deneyim Ödülleri`,fields:[[`shadow_wolf_xp_reward`,`Gölge Kurdu TP`,1],[`rotten_guardian_xp_reward`,`Çürük Muhafız TP`,1],[`essence_devourer_xp_reward`,`Öz Yutan TP`,1],[`aggressive_variant_xp_reward`,`Agresif orman varyantı TP`,1],[`killer_variant_xp_reward`,`Katil orman varyantı TP`,1],[`frozen_shadow_wolf_xp_reward`,`Donmuş Geçit · Kırağı Vaşağı TP`,1],[`frozen_rotten_guardian_xp_reward`,`Donmuş Geçit · Buzkök Golemi TP`,1],[`frozen_essence_devourer_xp_reward`,`Donmuş Geçit · Tipi Kâhini TP`,1],[`frozen_aggressive_variant_xp_reward`,`Donmuş Geçit · Agresif varyant TP`,1],[`frozen_killer_variant_xp_reward`,`Donmuş Geçit · Katil varyant TP`,1],[`black_monster_xp_reward`,`Kara Bölge · Her canavarın temel TP ödülü`,1],[`sinsi_shadow_wolf_xp_reward`,`Sinsi Gölge Kurdu TP`,1],[`sinsi_guardian_xp_reward`,`Sinsi Muhafız TP`,1],[`sinsi_devourer_xp_reward`,`Sinsi Öz Yutan TP`,1],[`sinsi_stone_xp_reward`,`Sinsi Taş TP`,1],[`boss_xp_reward`,`Dünya bossu TP`,1]]},{title:`Dünya Muhafızları`,fields:[[`guardian_reward_gems`,`Birinciye verilecek mücevher`,1],[`guardian_reward_seconds`,`Ödül aralığı (sn)`,60]]},{title:`Seviye, Temel Saldırı ve Yetenek Dengesi`,fields:[[`skill_two_unlock_level`,`2. yetenek açılma seviyesi`,1],[`skill_three_unlock_level`,`3. yetenek açılma seviyesi`,1],[`skill_two_cooldown_ms`,`2. yetenek bekleme (ms)`,100],[`skill_three_cooldown_ms`,`3. yetenek bekleme (ms)`,100],[`skill_damage_scale`,`Genel saldırı hasar ölçeği`,.01],[`skill_one_multiplier`,`Temel saldırı çarpanı`,.05],[`skill_two_multiplier`,`2. yetenek çarpanı`,.05],[`skill_three_multiplier`,`3. yetenek çarpanı`,.05],[`skill_upgrade_damage_per_level`,`Yükseltme başına hasar`,.01]]},{title:`Sınıf ve Başlangıç Gücü`,fields:[[`starter_weapon_power`,`Başlangıç silahı hasarı`,1],[`guardian_base_attack`,`Muhafız temel saldırısı`,1],[`hunter_base_attack`,`Avcı temel saldırısı`,1],[`arcanist_base_attack`,`Arkanist temel saldırısı`,1]]},{title:`Kritik ve Kanat`,fields:[[`base_critical_chance`,`Temel kritik şansı (%)`,.1],[`third_skill_critical_bonus`,`3. skill ek kritik (%)`,.1],[`critical_damage_multiplier`,`Kritik hasar çarpanı`,.05],[`wing_gem_cost`,`Kanat fiyatı (mücevher)`,100],[`wing_attack_bonus`,`Kanat saldırı bonusu`,1],[`wing_defense_bonus`,`Kanat savunma bonusu`,1],[`wing_critical_chance`,`Kanat kritik bonusu (%)`,.1]]},{title:`Ekonomi`,fields:[[`potion_essence_cost`,`Can iksiri öz maliyeti`,1],[`exchange_essence_cost`,`Takas için öz`,1],[`exchange_gem_reward`,`Takas ödülü mücevher`,1],[`skill_upgrade_gem_cost`,`Yetenek kademe başı Mücevher (önerilen 5)`,1]]},{title:`Silah Saldırı Aralıkları`,fields:[[`white_weapon_power_min`,`Beyaz minimum`,1],[`white_weapon_power_max`,`Beyaz maksimum`,1],[`blue_weapon_power_min`,`Mavi minimum`,1],[`blue_weapon_power_max`,`Mavi maksimum`,1],[`orange_weapon_power_min`,`Turuncu minimum`,1],[`orange_weapon_power_max`,`Turuncu maksimum`,1],[`red_weapon_power_min`,`Kırmızı minimum`,1],[`red_weapon_power_max`,`Kırmızı maksimum`,1]]},{title:`Savunma Ekipmanı Güç Aralıkları`,fields:[[`white_armor_power_min`,`Beyaz minimum`,1],[`white_armor_power_max`,`Beyaz maksimum`,1],[`blue_armor_power_min`,`Mavi minimum`,1],[`blue_armor_power_max`,`Mavi maksimum`,1],[`orange_armor_power_min`,`Turuncu minimum`,1],[`orange_armor_power_max`,`Turuncu maksimum`,1],[`red_armor_power_min`,`Kırmızı minimum`,1],[`red_armor_power_max`,`Kırmızı maksimum`,1]]},{title:`Eşya Satış Değeri`,fields:[[`item_sale_white`,`Beyaz eşya`,1],[`item_sale_blue`,`Mavi eşya`,1],[`item_sale_orange`,`Turuncu eşya`,1],[`item_sale_red`,`Kırmızı eşya`,1]]},{title:`Balıkçılık`,fields:[[`fishing_rod_cost`,`Olta fiyatı (mücevher)`,1],[`fish_sokan_value`,`Sokan satış değeri`,1],[`fish_levrek_value`,`Levrek satış değeri`,1],[`fish_zargana_value`,`Zargana satış değeri`,1]]},{title:`Demirci Haso · Eşsiz Dönüşüm`,fields:[[`blacksmith_dust_cost`,`Taş Tozu maliyeti`,1],[`blacksmith_pearl_cost`,`İnci maliyeti`,1],[`blacksmith_gem_cost`,`Mücevher maliyeti`,100],[`unique_weapon_power`,`Eşsiz silah gücü`,1],[`unique_armor_power`,`Eşsiz zırh gücü`,1]]},{title:`Lonca kuruluşu`,fields:[[`guild_create_level`,`Kuruluş seviyesi`,1],[`guild_create_gems`,`Kuruluş mücevher bedeli`,10]]},{title:`Demirci Haso · Taş Sanatı`,fields:[[`stone_art_dust_cost`,`Her taş için Taş Tozu`,1],[`stone_art_book_cost`,`Her taş için Taş Sanatı Kitabı`,1],[`stone_art_gem_cost`,`Her taş için Mücevher`,10]]},{title:`Silah Evrimi · 1. Aşama`,fields:[[`evolution_1_kills`,`Toplam canavar öldürme`,1],[`evolution_1_gems`,`Mücevher bedeli`,1],[`evolution_1_scrolls`,`Evrim Parşömeni bedeli`,1],[`evolution_1_attack`,`Ek saldırı`,1],[`evolution_1_critical`,`Ek kritik (%)`,1],[`evolution_1_players`,`Oyunculara karşı güçlü (%)`,1]]},{title:`Silah Evrimi · 2. Aşama`,fields:[[`evolution_2_kills`,`Toplam canavar öldürme`,1],[`evolution_2_gems`,`Mücevher bedeli`,1],[`evolution_2_scrolls`,`Evrim Parşömeni bedeli`,1],[`evolution_2_attack`,`Ek saldırı`,1],[`evolution_2_critical`,`Ek kritik (%)`,1],[`evolution_2_players`,`Oyunculara karşı güçlü (%)`,1]]},{title:`Silah Evrimi · 3. Aşama`,fields:[[`evolution_3_kills`,`Toplam canavar öldürme`,1],[`evolution_3_gems`,`Mücevher bedeli`,1],[`evolution_3_scrolls`,`Evrim Parşömeni bedeli`,1],[`evolution_3_attack`,`Ek saldırı`,1],[`evolution_3_critical`,`Ek kritik (%)`,1],[`evolution_3_players`,`Oyunculara karşı güçlü (%)`,1]]},{title:`Bosslar · Taş Sanatı Kitabı`,fields:[[`world_boss_stone_book_chance`,`Dünya Bossu düşme şansı (%)`,.1],[`world_boss_stone_book_min`,`Dünya Bossu en az kitap`,1],[`world_boss_stone_book_max`,`Dünya Bossu en çok kitap`,1],[`frozen_boss_stone_book_chance`,`Ayaz Tahtı düşme şansı (%)`,.1],[`frozen_boss_stone_book_min`,`Ayaz Tahtı en az kitap`,1],[`frozen_boss_stone_book_max`,`Ayaz Tahtı en çok kitap`,1],[`frozen_water_stone_book_chance`,`Buzgölü Semenderi düşme şansı (%)`,.1],[`frozen_water_stone_book_min`,`Semender en az kitap`,1],[`frozen_water_stone_book_max`,`Semender en çok kitap`,1]]},{title:`Bosslar · Evrim Parşömeni`,fields:[[`world_boss_evolution_scroll_chance`,`Dünya Bossu düşme şansı (%)`,.1],[`world_boss_evolution_scroll_min`,`Dünya Bossu en az parşömen`,1],[`world_boss_evolution_scroll_max`,`Dünya Bossu en çok parşömen`,1],[`frozen_boss_evolution_scroll_chance`,`Ayaz Tahtı düşme şansı (%)`,.1],[`frozen_boss_evolution_scroll_min`,`Ayaz Tahtı en az parşömen`,1],[`frozen_boss_evolution_scroll_max`,`Ayaz Tahtı en çok parşömen`,1],[`frozen_water_evolution_scroll_chance`,`Buzgölü Semenderi düşme şansı (%)`,.1],[`frozen_water_evolution_scroll_min`,`Semender en az parşömen`,1],[`frozen_water_evolution_scroll_max`,`Semender en çok parşömen`,1]]},{title:`Kanallar`,fields:[[`channel_capacity`,`Kanal başına oyuncu sınırı (en fazla 30)`,1]]},{title:`Sinsi Taş Vadisi`,fields:[[`sinsi_stone_unlock_level`,`Harita açılma seviyesi`,1],[`sinsi_stone_hp`,`Taş canı`,100],[`sinsi_stone_respawn_seconds`,`Taş yeniden doğma süresi (sn)`,10],[`sinsi_stone_wave_count`,`Her aşamada çıkan canavar`,1],[`sinsi_stone_summon_hp`,`Çıkan canavar canı`,10],[`sinsi_stone_summon_damage_scale`,`Çıkan canavar hasar çarpanı`,.05]]},{title:`Donmuş Çam Geçidi`,fields:[[`frozen_zone_enabled`,`Harita açık (1) / kapalı (0)`,1],[`frozen_boss_enabled`,`Merkez bossu açık (1) / kapalı (0)`,1],[`frozen_boss_hp`,`Merkez bossu canı`,100],[`frozen_boss_damage_scale`,`Merkez bossu hasar çarpanı`,.05],[`frozen_boss_respawn_seconds`,`Merkez bossu yeniden doğma süresi (sn)`,60],[`frozen_boss_xp_reward`,`Merkez bossu TP ödülü`,1],[`frozen_boss_reward_gems`,`Merkez bossu mücevher ödülü`,1],[`frozen_water_enabled`,`Buzgölü Semenderi açık (1) / kapalı (0)`,1],[`frozen_water_hp`,`Buzgölü Semenderi canı`,100],[`frozen_water_damage_scale`,`Buzgölü Semenderi hasar çarpanı`,.05],[`frozen_water_respawn_seconds`,`Buzgölü Semenderi yeniden doğma süresi (sn)`,60],[`frozen_water_xp_reward`,`Buzgölü Semenderi TP ödülü`,1],[`frozen_water_reward_gems`,`Buzgölü Semenderi mücevher ödülü`,1]]},{title:`Efsun Şansları`,fields:[[`enchant_item_chance`,`Eşyanın efsunlu gelme şansı (%)`,.1],[`enchant_one_chance`,`1 efsun ağırlığı (%)`,.1],[`enchant_two_chance`,`2 efsun ağırlığı (%)`,.1],[`enchant_three_chance`,`3 efsun ağırlığı (%)`,.1],[`enchant_four_chance`,`4 efsun ağırlığı (%)`,.1],[`enchant_forest_power_weight`,"Kuzey Ormanı gücü ağırlığı (silah, zırh, kolye)",.1],[`enchant_frozen_power_weight`,"Donmuş Çam gücü ağırlığı (silah, zırh, kolye)",.1],[`enchant_fire_weight`,`Ateş seçilme ağırlığı (yalnız silah)`,.1],[`enchant_ice_weight`,`Buz seçilme ağırlığı (yalnız silah)`,.1],[`enchant_attack_speed_weight`,`Saldırı hızı ağırlığı (yalnız silah)`,.1],["enchant_cast_speed_weight","Büyü Hızı ağırlığı (silah, zırh, kolye)",0.1],[`enchant_life_steal_weight`,`Can çalma ağırlığı (silah ve zırh)`,.1],[`enchant_attack_block_weight`,`Saldırı bloklama ağırlığı (savunma eşyaları)`,.1],[`enchant_sword_defense_weight`,`Kılıç savunması ağırlığı (savunma eşyaları)`,.1],[`enchant_arrow_defense_weight`,`Ok savunması ağırlığı (savunma eşyaları)`,.1],[`enchant_magic_defense_weight`,`Büyü savunması ağırlığı (savunma eşyaları)`,.1],[`enchant_strong_players_weight`,`Oyunculara karşı güç ağırlığı`,.1],[`enchant_resistant_players_weight`,`Oyunculara karşı savunma ağırlığı (savunma eşyaları)`,.1],[`enchant_critical_weight`,`Kritik şansı efsunu ağırlığı`,.1],[`enchant_hp_weight`,`Azami can efsunu ağırlığı`,.1]]},...Re.map(([e,t,,n])=>({title:`${t} · Dört Kademe · 4. değer azami${e===`hp`?` (+Can)`:` (%)`}`,fields:Be(e).map((e,t)=>[e,`${t+1}. kademe (1–${n})`,1])})),{title:`Element ve Savaş Meydanı`,fields:[[`elemental_tick_count`,`Ateş/buz efekt vuruş sayısı`,1],[`elemental_tick_interval_ms`,`Efekt vuruş aralığı (ms)`,20],[`pvp_kill_reward_gems`,`Oyuncu öldürme ödülü`,1],[`pvp_death_loss_gems`,`Ölümde kaybedilen mücevher`,1],[`pvp_respawn_seconds`,`PvP yeniden doğma süresi (sn)`,1]]},{title:`Arena Zafer Ödülleri`,fields:[[`arena_1v1_reward_gems`,`1'e 1 · kazanan oyuncuya`,1],[`arena_2v2_reward_gems`,`2’ye 2 · kazanan her oyuncuya`,1],[`arena_3v3_reward_gems`,`3'e 3 · kazanan her oyuncuya`,1],[`arena_5v5_reward_gems`,`5'e 5 · kazanan her oyuncuya`,1]]},{"title":"Kara Bölge · Kara Taş Muhafızı","fields":[["black_stone_boss_enabled","Boss açık (1) / kapalı (0)",1],["black_stone_boss_hp","Boss canı",100],["black_stone_boss_damage_scale","Saldırı hasarı (savunma öncesi)",1],["black_stone_boss_respawn_seconds","Yeniden doğma (saniye)",60],["black_stone_boss_xp_reward","TP ödülü",1],["black_stone_boss_reward_gems","Mücevher ödülü",1]]}],Bt=[{id:"loadlab477",label:"Bot Testi",note:"Ayrı VDS · 75 oyuncu",icon:X.createElement("span",{"aria-hidden":true},"◉")},{id:'status',label:'Statü',note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:'arenaMarket',label:'Arena Market',note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:'runes',label:'Rün',note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:`solo`,label:`Solo Zindan`,note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:`materials`,label:`Artı Basma Malzemeleri`,note:`Bölge, oran ve adetler`,icon:(0,Z.jsx)(y,{})},{id:`updates`,label:`Güncellemeler`,note:`GM önizlemesi ve yayına açma`,icon:(0,Z.jsx)(ot,{})},{id:`market`,label:`Nesne Market`,note:`Fiyatlar ve indirimler`,icon:(0,Z.jsx)(p,{})},{id:'wheel483',label:'Çark',note:'Ödül çıkma oranları',icon:(0,Z.jsx)(p,{})},{id:'runes_v2',label:'Karanlık Rün Sahili',note:'Karanlık sahil ve boss',icon:(0,Z.jsx)(p,{})},{id:'sis_mist',label:'Sis Yarığı',note:'Portallar, düşmanlar ve ödüller',icon:(0,Z.jsx)(p,{})},{id:'kadim_tower',label:'Kadim Kulesi',note:'10 kat, düşmanlar ve ganimetler',icon:(0,Z.jsx)(p,{})},{id:`overview`,label:`Genel Bakış`,note:`Canlı durum`,icon:(0,Z.jsx)(lt,{})},{id:`community`,label:`Ortak Etkinlik`,note:`Hedefler ve kademe ödülleri`,icon:(0,Z.jsx)(o,{})},{id:`events`,label:`Etkinlikler`,note:`Bonuslar ve kristal sandığı`,icon:(0,Z.jsx)(y,{})},{id:`world`,label:`Dünya`,note:`Döngü ve yaratıklar`,icon:(0,Z.jsx)(ot,{})},{id:'launch',label:'Oyun Durumu',note:'Ön kayıt, açık ve bakım',icon:(0,Z.jsx)(ot,{})},{id:`players`,label:`Oyuncular`,note:`Hesap ve eşya`,icon:(0,Z.jsx)(o,{})},{id:`registrations`,label:`Kayıt Listesi`,note:`Üyeler ve erken erişim`,icon:(0,Z.jsx)(Pe,{})},{id:`gm`,label:`GM ve Duyurular`,note:`Görevliler ve mesajlar`,icon:(0,Z.jsx)(E,{})},{id:"specialistSkills459",label:"Uzmanlık Becerileri",note:"Altı becerinin gücü ve süreleri",icon:(0,Z.jsx)(de,{})},{id:"brokenCore464",label:"Kırık Yaşam Çekirdeği",note:"Bulmaca, sıklık ve ödüller",icon:(0,Z.jsx)(de,{})},{id:`combat`,label:`Savaş`,note:`Hasar ve beceri`,icon:(0,Z.jsx)(de,{})},{id:`loot`,label:`Eşya ve Düşüş`,note:`Ganimet ve güç`,icon:(0,Z.jsx)(y,{})},{id:`economy`,label:`Ekonomi`,note:`Balıkçılık ve Haso`,icon:(0,Z.jsx)(v,{})},{id:`epins`,label:`E-PIN`,note:`Destek kodları`,icon:(0,Z.jsx)(Ae,{})},{id:`support`,label:`Destek`,note:`Oyuncu talepleri`,icon:(0,Z.jsx)(s,{})},{id:`security`,label:`Güvenlik`,note:`Hile olayları`,icon:(0,Z.jsx)(ft,{})},{id:'battle_pass',label:'Savaş Bileti',note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:'quests438',label:'Görevler',note:`Kademeler, giriş ve boss ganimeti`,icon:(0,Z.jsx)(de,{})},{id:'enhancement491',label:'Artı Basma',note:'Başarı oranları, malzemeler ve Kor Mührü',icon:X.createElement('span',{'aria-hidden':true,style:{fontWeight:800,color:'#cfad6b'}},'+5')},{id:'cauldron488',label:'Cadının Kazanı',note:'Cadılar Bayramı · tarifler ve ödüller',icon:X.createElement('img',{src:'/assets/cauldron488-icon.webp',alt:'',width:28,height:28})},{id:'eventIsland',label:'Etkinlik Adası',note:'Boss planı, ada ve GM duyurusu',icon:(0,Z.jsx)(de,{})},{id:"stone_boss",label:"Kara Taş Muhafızı",note:"Kara Bölge bossu, güç ve ganimet",icon:(0,Z.jsx)(ot,{})}];function Vt(e){if(e==="Kara Bölge · Kara Taş Muhafızı")return "stone_boss";return[`Dünya Dengesi`,`Oyuncu Canı`,`Dünya Bossu`,`Dünya Muhafızları`,`Kanallar`,`Sinsi Taş Vadisi`,`Donmuş Çam Geçidi`].includes(e)?`world`:[`Kadim Kök Vadisi · Tecrübe ve Yeniden Doğma`,`Canavar Deneyim Ödülleri`,`Seviye, Temel Saldırı ve Yetenek Dengesi`,`Sınıf ve Başlangıç Gücü`,`Kritik ve Kanat`,`Element ve Savaş Meydanı`,`Arena Zafer Ödülleri`].includes(e)?`combat`:[`Ekonomi`,`Balıkçılık`,`Demirci Haso · Eşsiz Dönüşüm`].includes(e)?`economy`:`loot`}var Ht=[[`hp`,`Can`,1],[`level`,`Seviye`,1],[`gems`,`Mücevher`,10],[`essence`,`Yaşam Özü`,10],[`contribution`,`Katkı`,10],[`potions`,`İksir`,1],[`pearls`,`İnci`,1],[`stoneDust`,`Metin Tozu`,1],[`fishSokan`,`Sokan`,1],[`fishLevrek`,`Levrek`,1],[`fishZargana`,`Zargana`,1],[`skillOne`,`Temel Saldırı`,1],[`skillTwo`,`2. Yetenek`,1],[`skillThree`,`3. Yetenek`,1]],Ut=[[``,`Efsun yok`],[`forest_power`,`Kuzey Ormanı Gücü`],[`frozen_power`,`Donmuş Çam Gücü`],[`fire`,`Ateş gücü`],[`ice`,`Buz gücü`],[`sword_defense`,`Kılıç savunması`],[`arrow_defense`,`Ok savunması`],[`magic_defense`,`Büyü savunması`],[`strong_players`,`Oyunculara karşı güç`],[`resistant_players`,`Oyunculara karşı savunma`],[`critical`,`Kritik şansı`],[`attack_speed`,`Saldırı hızı`],["cast_speed","Büyü Hızı"],[`life_steal`,`Can çalma`],[`attack_block`,`Saldırı bloklama`],[`hp`,`Azami can`]],Wt=new Set([`sword_defense`,`arrow_defense`,`magic_defense`,`resistant_players`,`attack_block`,`hp`]),Gt=(e,t)=>e?['forest_power','frozen_power','cast_speed'].includes(e)?['weapon','armor','necklace'].includes(t):e===`attack_block`?t===`armor`||t===`helmet`:t===`weapon`?!Wt.has(e):t===`armor`||t===`helmet`?e!==`fire`&&e!==`ice`&&e!==`attack_speed`:e!==`fire`&&e!==`ice`&&e!==`attack_speed`&&e!==`life_steal`:!0,Kt=new Set(`ancient_normal_purple_chance.ancient_boss_purple_chance.world_boss_purple_chance.regular_item_drop_chance.regular_armor_chance.regular_blue_chance.regular_orange_chance.regular_red_chance.boss_armor_chance.boss_blue_chance.boss_orange_chance.boss_red_chance.base_critical_chance.third_skill_critical_bonus.wing_critical_chance.sinsi_stone_armor_chance.sinsi_stone_blue_chance.sinsi_stone_orange_chance.sinsi_stone_red_chance.frozen_boss_item_drop_chance.frozen_water_item_drop_chance.world_boss_stone_book_chance.frozen_boss_stone_book_chance.frozen_water_stone_book_chance.world_boss_evolution_scroll_chance.frozen_boss_evolution_scroll_chance.frozen_water_evolution_scroll_chance.fishing_pearl_chance.fishing_talisman_chance.enchant_item_chance.enchant_one_chance.enchant_two_chance.enchant_three_chance.enchant_four_chance`.split(`.`)),qt=new Set([`frozen_zone_enabled`,`frozen_boss_enabled`,`frozen_water_enabled`,`ancient_boss_enabled`]);function Jt(e){return Object.fromEntries(Object.entries(e).map(([e,t])=>[e,Kt.has(e)?Number((t*100).toFixed(3)):t]))}function Yt(e){return Object.fromEntries(Object.entries(e).map(([e,t])=>[e,Kt.has(e)?t/100:t]))}var Xt={ancient:`Kadim Kök Vadisi`,black:`Kara Bölge`,forest:`Kuzey Ormanı`,frozen:`Donmuş Çam Geçidi`,sinsi:`Sinsi Taş Vadisi`,boss:`Bosslar`},Zt=e=>JSON.parse(JSON.stringify(e)),Qt=e=>e.split(`.`,1)[0]||`forest`,$=e=>Number((Math.max(0,e)/1e4).toFixed(4)),$t=e=>Math.round(Math.max(0,Number.isFinite(e)?e:0)*1e4),en=e=>String(e).replace(`.`,`,`);function tn({fieldId:e,value:t,disabled:n,invalid:r,onCommit:i,onValidityChange:a,amount:o=!1}){let s=(0,X.useRef)(null),c=e=>{let t=e.trim().replace(`,`,`.`),n=Number(t);return o?/^\d+$/.test(t)&&Number.isSafeInteger(n)&&n>=1&&n<=1e6?n:null:t&&Number.isFinite(n)&&n>=0&&n<=100?Number(n.toFixed(4)):null};(0,X.useEffect)(()=>{let e=s.current;e&&!r&&document.activeElement!==e&&(e.value=en(t))},[r,t]);let l=t=>{let n=c(t.value);if(n===null){a(e,!1);return}t.value=en(n),a(e,!0),i(n)};return(0,Z.jsx)(`input`,{ref:s,type:`text`,inputMode:o?`numeric`:`decimal`,disabled:n,"aria-invalid":r,defaultValue:en(t),onChange:t=>{if(/[.,]$/.test(t.currentTarget.value.trim())){a(e,!1);return}let n=c(t.currentTarget.value);a(e,n!==null),n!==null&&i(n)},onBlur:e=>l(e.currentTarget),onKeyDown:e=>{e.key===`Enter`&&e.currentTarget.blur()}})}var nn=[{rarity:`red`,label:`Kırmızı`,main:`red_all`},{rarity:`orange`,label:`Turuncu`,main:`orange_main`,accessory:`orange_accessory`},{rarity:`blue`,label:`Mavi`,main:`blue_main`,accessory:`blue_accessory`},{rarity:`white`,label:`Beyaz`,main:`white_main`,accessory:`white_accessory`}],rn=e=>{let t=e.filter(e=>e.outcomes.some(e=>e.item.type===`gear`));return t.length===1&&t[0].outcomes.every(e=>e.item.type===`gear`)};function an({email:e,signOutPath:t}){let[n,i]=(0,X.useState)(`overview`),[a,s]=(0,X.useState)(``),[c,l]=(0,X.useState)(``),[d,f]=(0,X.useState)(null),[m,h]=(0,X.useState)({}),[_,v]=(0,X.useState)(64),[b,C]=(0,X.useState)(`Canlı oyun verileri yükleniyor…`),[T,E]=(0,X.useState)(!0),[D,O]=(0,X.useState)(``),[k,j]=(0,X.useState)(100),[N,te]=(0,X.useState)(100),[P,ne]=(0,X.useState)(`Sonteklif Destek Paketi`),[F,re]=(0,X.useState)(`core-coins-500-v1`),[ie,ae]=(0,X.useState)(25),[oe,ce]=(0,X.useState)(0),[I,L]=(0,X.useState)([]),[R,le]=(0,X.useState)(``),[z,ue]=(0,X.useState)(5),[B,V]=(0,X.useState)({hp:100,level:1,gems:0,essence:0,contribution:0,potions:0,pearls:0,stoneDust:0,fishSokan:0,fishLevrek:0,fishZargana:0,skillOne:1,skillTwo:1,skillThree:1,hasRod:0,rodEquipped:0,hasWings:0,wingsEquipped:0}),[H,U]=(0,X.useState)({kind:`weapon`,itemName:`Yönetici Hediyesi`,rarity:`red`,power:100,role:`muhafiz`,enchantments:Array.from({length:4},()=>({kind:``,value:5}))}),[fe,pe]=(0,X.useState)(null),[W,me]=(0,X.useState)(0),[he,_e]=(0,X.useState)(null),[ve,ye]=(0,X.useState)(()=>Date.now());(0,X.useEffect)(()=>{let e=!1,t=!1,n=new AbortController,r=async()=>{if(!(e||t||n==="loadlab477"||document.visibilityState===`hidden`)){t=!0;try{let t=await fetch(`/api/admin?live=1`,{cache:`no-store`,signal:n.signal});if(!t.ok)return;let r=await t.json();if(e)return;_e(r.stats),pe(new Set((r.presence??[]).map(e=>e.id))),me(Date.now()),f(e=>e&&{...e,stats:r.stats,world:r.world??e.world,boss:r.boss??e.boss,channels:e.channels.map(e=>({...e,online:r.channels.find(t=>t.channel===e.id)?.online??0}))})}catch{}finally{t=!1}}};r();let i=window.setInterval(()=>void r(),3e3);return window.addEventListener(`focus`,r),document.addEventListener(`visibilitychange`,r),()=>{e=!0,n.abort(),window.clearInterval(i),window.removeEventListener(`focus`,r),document.removeEventListener(`visibilitychange`,r)}},[n]);let[be,xe]=(0,X.useState)(()=>Date.now()),[Se,Ce]=(0,X.useState)(null),we=(0,X.useRef)(null),G=(0,X.useRef)({}),K=(0,X.useRef)(!1),Te=(0,X.useCallback)((e,t)=>{let n=Jt(e),r=we.current,i=new Set(t.acknowledgedKeys);we.current=n,Ce(n),h(e=>{let a={...n};for(let[o,s]of Object.entries(e)){if(!Object.prototype.hasOwnProperty.call(n,o)){a[o]=s;continue}if((G.current[o]??0)!==(t.startedVersions[o]??0)){a[o]=s;continue}!i.has(o)&&r&&Object.prototype.hasOwnProperty.call(r,o)&&!Object.is(s,r[o])&&(a[o]=s)}return a})},[]),De=(0,X.useCallback)(async()=>{if(K.current)return;K.current=!0,E(!0);let e={...G.current};try{let t=await fetch(`/api/admin`,{cache:`no-store`}),n=await t.json();if(!t.ok)throw Error(n.error??`Veriler alınamadı.`);xe(()=>Date.now()),f(n),Te(n.settings,{startedVersions:e,acknowledgedKeys:[]}),v(n.world.health),O(e=>e||n.players[0]?.id||``),le(e=>e||n.players[0]?.id||``),C(`Canlı veriler güncel; kaydedilmemiş alanların korundu.`)}finally{K.current=!1,E(!1)}},[Te]);(0,X.useEffect)(()=>{let e=window.setTimeout(()=>void De().catch(e=>C(e instanceof Error?e.message:`Bağlantı hatası.`)),0);return()=>window.clearTimeout(e)},[De]),(0,X.useEffect)(()=>{let e=window.setInterval(()=>ye(Date.now()),1e3);return()=>window.clearInterval(e)},[]),(0,X.useEffect)(()=>{let e=d?.players.find(e=>e.id===R);if(!e)return;let t=window.setTimeout(()=>V({hp:e.hp,level:e.level,gems:e.gems,essence:e.essence,contribution:e.contribution,potions:e.potions,pearls:e.pearls,stoneDust:e.stone_dust,fishSokan:e.fish_sokan,fishLevrek:e.fish_levrek,fishZargana:e.fish_zargana,skillOne:e.skill_one,skillTwo:e.skill_two,skillThree:e.skill_three,hasRod:e.has_rod,rodEquipped:e.rod_equipped,hasWings:e.has_wings,wingsEquipped:e.wings_equipped}),0);return()=>window.clearTimeout(t)},[R,d?.serverTime,d?.players]);let ke=(0,X.useRef)(null),q=async(e,t)=>{const colSecurityBody508=e;if(t&&!window.confirm(t))return null;if(K.current)return C(`Devam eden yönetici işlemi tamamlanınca tekrar dene.`),null;K.current=!0;let n={...G.current},r=e.action===`save_settings`&&e.settings&&typeof e.settings==`object`&&!Array.isArray(e.settings)?Object.keys(e.settings):[];E(!0);try{let t=await fetch(e.action.startsWith('sis_mist_')?'/api/admin?core511=mist':e.action==='kadim_tower_get'||e.action==='kadim_tower_save'?'/api/admin?core511=tower':`/api/admin`,{method:`POST`,headers:{"content-type":`application/json`},body:JSON.stringify(e)}),i=await t.json();if(!t.ok){if(colSecurityBody508.action.startsWith('sis_mist_'))throw Object.assign(Error(i.errors?.length?i.errors.join(' '):i.error??'Sis Yarığı işlemi tamamlanamadı.'),{status:t.status,payload:i});let e=i.errors?.length?i.errors.join(` `):i.error;throw t.status===409?Error(`${e??`Bu kayıt başka bir yönetici ekranında değiştirildi.`} Taslağın korunuyor; canlı veriyi yenileyip farkları kontrol et.`):Error(e??`İşlem başarısız.`)}colSecurityNotice508(colSecurityBody508,i);if(i.adminRefreshRequired508)return i;return xe(()=>Date.now()),f(i),Te(i.settings,{startedVersions:n,acknowledgedKeys:r}),v(i.world.health),C(`Değişiklik canlı oyuna uygulandı; diğer kaydedilmemiş alanların korundu.`),i}catch(e){colSecurityNotice508(colSecurityBody508,null,e);if(colSecurityBody508.action.startsWith('sis_mist_')){C(e instanceof Error?e.message:'Sis Yarığı işlemi tamamlanamadı.');throw e;}return C(e instanceof Error?e.message:`İşlem başarısız.`),null}finally{K.current=!1,E(!1)}},J=async()=>{let e=await q({action:`generate_epins`,name:P,count:ie,validDays:oe,productCode:F});e?.generatedEpins&&(L(e.generatedEpins.codes),C(`${e.generatedEpins.codes.length} yeni E-PIN üretildi. Kodları şimdi kopyala veya indir; güvenlik için tekrar gösterilmez.`))},Me=async()=>{I.length&&(await navigator.clipboard.writeText(I.join(`
`)),C(`${I.length} E-PIN panoya kopyalandı.`))},Ne=()=>{if(!I.length)return;let e=new Blob([`${I.join(`
`)}\n`],{type:`text/plain;charset=utf-8`}),t=URL.createObjectURL(e),n=document.createElement(`a`);n.href=t,n.download=`yasam-cekirdegi-epin-${new Date().toISOString().slice(0,10)}.txt`,n.click(),URL.revokeObjectURL(t),C(`${I.length} E-PIN metin dosyası olarak indirildi.`)},Y=Number(d?.serverTime??0)+Math.max(0,Math.floor((ve-be)/1e3)),Fe=e=>!!(Se&&!Object.is(m[e],Se[e])),Ie=(e,t)=>{G.current[e]=(G.current[e]??0)+1,h(n=>({...n,[e]:t}))},Le=(e,t=!1)=>{let n=e.filter(Fe),r=n.length||!t?n:[...e];r.length&&q({action:`save_settings`,settingsSchemaVersion:2,settings:Yt(Object.fromEntries(r.map(e=>[e,m[e]])))})};return(0,Z.jsxs)(`main`,{className:`admin-shell`,children:[(0,Z.jsxs)(`header`,{className:`admin-header`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`span`,{className:`admin-kicker`,children:`YAŞAM ÇEKİRDEĞİ`}),(0,Z.jsx)(`h1`,{children:`Oyun Yönetimi`}),(0,Z.jsxs)(`p`,{children:[e,` · Canlı dünya kontrolü`]})]}),(0,Z.jsxs)(`nav`,{children:[(0,Z.jsxs)(`button`,{disabled:T,onClick:()=>void De().catch(e=>C(e instanceof Error?e.message:`Bağlantı hatası.`)),children:[(0,Z.jsx)(je,{}),` Canlı veriyi yenile`]}),(0,Z.jsxs)(r,{href:`/`,children:[(0,Z.jsx)(g,{}),` Oyuna dön`]}),(0,Z.jsx)(`a`,{href:t,children:`Çıkış`})]})]}),(0,Z.jsxs)(`div`,{className:`admin-notice`,children:[(0,Z.jsx)(nt,{}),b]}),(0,Z.jsxs)(`section`,{className:`admin-stats`,children:[(0,Z.jsx)(pn,{icon:(0,Z.jsx)(M,{}),label:`Dünya Sağlığı`,value:`%${d?.world.health.toFixed(2)??`—`}`}),(0,Z.jsx)(pn,{icon:(0,Z.jsx)(o,{}),label:`Çevrimiçi / Toplam`,value:`${he?.onlinePlayers??d?.stats.onlinePlayers??0} / ${he?.totalPlayers??d?.stats.totalPlayers??0}`}),(0,Z.jsx)(pn,{icon:(0,Z.jsx)(x,{}),label:`Açık Tezgâh`,value:String(d?.stats.shops??0)}),(0,Z.jsx)(pn,{icon:(0,Z.jsx)(p,{}),label:`Dünyadaki Eşya`,value:String(d?.stats.items??0)})]}),(0,Z.jsx)(`nav`,{className:`admin-page-nav`,"aria-label":`Yönetim bölümleri`,children:Bt.map(e=>(0,Z.jsxs)(`button`,{className:n===e.id?`active`:``,"aria-current":n===e.id?`page`:void 0,onClick:()=>i(e.id),children:[e.icon,(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:e.label}),(0,Z.jsx)(`small`,{children:e.note})]})]},e.id))}),(0,Z.jsxs)(`div`,{className:`admin-grid admin-page-${n}`,children:[n==="loadlab477"&&X.createElement(colLoadLabAdmin477),n===`market`&&d&&(0,Z.jsx)(Je,{prices:d.premiumPrices,busy:T,act:q}),n===`events`&&d&&(0,Z.jsx)($e,{raw:String(d.settings.events_json??``),serverTime:d.serverTime,busy:T,act:q}),n===`community`&&(0,Z.jsx)(tt,{}),n==='specialistSkills459'&&(d?.specialistSkills459?(0,Z.jsx)(colSpecialistAdmin459.Admin,{value:d.specialistSkills459,expectedEvents:String(d.settings.events_json??''),busy:T,act:q}):(0,Z.jsx)('p',{children:'Uzmanlık ayarları yüklenemedi. Canlı veriyi yenile.'})),(n==="brokenCore464")&&X.createElement(colBrokenCore464Admin.Settings,{value:d?.brokenCore464,busy:T,act:q}),n===`gm`&&(0,Z.jsx)(Rt,{}),(n==='gm'||n==='world')&&0,n!=="loadlab477"&&Z.jsx(colLoadUI430.Panel,{}),n==='enhancement491'&&X.createElement(colEnhanceAdmin491,{React:X,value:d?.enhancement491,busy:T,act:q}),n==="cauldron488"&&X.createElement(colCauldronAdmin488,{React:X,value:d?.cauldron488,expectedEvents:d?.settings?.events_json,busy:T,act:q}),n===`loot`&&(0,Z.jsx)(colBalanceAdmin487,{value:d?.highLevelBalance487,expectedEvents:d?.settings?.events_json,busy:T,act:q}),n===`loot`&&(0,Z.jsx)(Xe,{policy:d?.forestLootPolicy,busy:T,act:q}),n===`updates`&&d?.guildVillage&&(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsx)(`h2`,{children:`Lonca Köyü · Şatolar`}),(0,Z.jsxs)(`p`,{children:[d.guildVillage.enabled?`Oyunculara açık.`:`Yalnız GM ön izlemesine açık.`,` Oyunda Işınlan → Lonca Köyü veya Lonca → Şatom. Şato bedeli: 20 inci, 10.000 mücevher, 2.000 öz. Kapattığında oyuncular köyden güvenle çıkarılır; şatolar korunur.`]}),(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`save_guild_village`,guildVillageEnabled:!d.guildVillage.enabled,guildVillageRevision:d.guildVillage.revision}),children:d.guildVillage.enabled?`Oyunculara kapat`:`Oyunculara aç`})]}),(n===`loot`||n===`combat`)&&d?.dragon&&(0,Z.jsx)(Ue,{value:d.dragon,busy:T,act:q}),n==="stone_boss"&&(0,Z.jsx)(colStoneBossStatus476,{data:d,busy:T,act:q}),(n==="loot"||n==="stone_boss")&&(0,Z.jsx)(fn,{lootEventPercent:ge(se(d?.settings.events_json),`loot`,d?.serverTime),records:(d?.lootProfiles??[]).filter(colRow476=>n==="stone_boss"?colRow476.sourceKey==="boss.black_stone":colRow476.sourceKey!=="boss.black_stone"),templates:d?.lootTemplates??[],busy:T,act:q}),n===`arenaMarket`&&d?.arenaMarket&&(0,Z.jsx)(colArenaUI.Admin,{value:d.arenaMarket,busy:T,act:q}),n===`runes`&&d?.runes&&(0,Z.jsx)(colRuneUI.Admin,{value:d.runes,busy:T,act:q}),n==='runes_v2'&&d?.runeV2&&X.createElement(colAdminContent483.RuneV2,{value:d.runeV2,busy:T,act:q}),n==='wheel483'&&(d?.wheel483?X.createElement(colAdminContent483.Wheel,{value:d.wheel483,busy:T,act:q}):X.createElement('p',null,'Çark ayarları yüklenemedi. Canlı veriyi yenile.')),n==='eventIsland'&&d?.eventIsland&&(0,Z.jsx)(colEventAdmin444.Admin,{value:d.eventIsland,busy:T,act:q}),n==='quests438'&&d?.quests438&&(0,Z.jsx)(colQuests438Admin.Admin,{value:d.quests438,busy:T,act:q}),n==='battle_pass'&&d?.battlePass&&(0,Z.jsx)(colBattlePassAdmin434.Admin,{value:d.battlePass,busy:T,act:q}),n==='status'&&d?.status&&(0,Z.jsx)(colStatusUI429.Admin,{value:d.status,busy:T,act:q}),(n===`solo`||n===`materials`)&&(d?.progression?(0,Z.jsx)(He,{mode:n,value:d.progression,busy:T,act:q}):(0,Z.jsx)(`p`,{children:`Bu bölüm oyun sunucusu güncellemesiyle açılacak.`})),(n===`loot`||n===`players`)&&d&&(0,Z.jsx)(kt,{settings:d.dungeonSettings,busy:T,act:q}),n===`combat`&&d&&(0,Z.jsx)(At,{curve:String(d.settings.xp_curve_json??``),busy:T,save:async(e,t)=>!!await q({action:`save_level_curve`,costs:e,expectedCurve:t})}),n===`combat`&&d?.ranks&&(0,Z.jsx)(We,{value:d.ranks,busy:T,save:async(e,t)=>!!await q({action:`save_ranks`,config:e,revision:t})}),n===`updates`&&(0,Z.jsx)(Ge,{}),n===`combat`&&(0,Z.jsx)(dn,{snapshot:d?.monsterBalance??null,busy:T,act:q,blackXp:{value:m.black_monster_xp_reward??0,dirty:!!d&&!Object.is(m.black_monster_xp_reward,d.settings.black_monster_xp_reward),change:e=>Ie(`black_monster_xp_reward`,e),save:()=>Le([`black_monster_xp_reward`])}}),n===`support`&&(0,Z.jsx)(ln,{}),n===`economy`&&d&&(0,Z.jsx)(mn,{settings:d.settings,busy:T,act:q}),n==='launch'&&d&&(0,Z.jsx)(St,{}),n===`registrations`&&(0,Z.jsx)(Ct,{}),n===`security`&&(0,Z.jsx)(Tt,{}),n===`security`&&(0,Z.jsxs)(`section`,{className:`admin-card word-filter-card`,children:[(0,Z.jsx)(`h2`,{children:`Yasaklı Kelimeler`}),(0,Z.jsx)(`p`,{children:`Yerleşik küfür filtresi her zaman açık. Eklediğin kelimeler yeni dünya, bölge ve özel mesajlarda yıldızlanır. Bu işlem hesaplara ceza vermez.`}),(0,Z.jsxs)(`form`,{onSubmit:e=>{e.preventDefault(),q({action:`add_blocked_word`,word:a})},children:[(0,Z.jsxs)(`label`,{children:[`Yeni yasaklı kelime`,(0,Z.jsx)(`input`,{value:a,maxLength:40,onChange:e=>s(e.target.value),placeholder:`Kelime yaz`})]}),(0,Z.jsx)(`button`,{disabled:T||a.trim().length<2,children:`Ekle`})]}),(0,Z.jsx)(`div`,{className:`blocked-word-list`,children:d?.blockedWords?.map(e=>(0,Z.jsxs)(`span`,{children:[e,(0,Z.jsx)(`button`,{"aria-label":`${e} kelimesini kaldır`,disabled:T,onClick:()=>void q({action:`remove_blocked_word`,word:e}),children:`Kaldır`})]},e))}),(0,Z.jsx)(`small`,{className:`admin-live-age`,children:W?(ve-W>1e4?`Canlı veri bağlantısı bekleniyor · `:`Son güncelleme · `)+Math.max(0,Math.floor((ve-W)/1e3))+` sn önce`:`Canlı veriler yükleniyor…`}),!d?.blockedWords?.length&&(0,Z.jsx)(`p`,{children:`Henüz ek kelime yok. Yerleşik filtre çalışmaya devam eder.`})]}),[`world`,`combat`,`loot`,`economy`,"stone_boss"].includes(n)&&(0,Z.jsxs)(`section`,{className:`admin-card settings-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(u,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:n===`loot`?`Eşya Gücü ve Efsun Ayarları`:`${Bt.find(e=>e.id===n)?.label} Ayarları`}),(0,Z.jsx)(`p`,{children:n===`loot`?`Ganimet oranları yukarıdaki canlı profilden; güç, satış değeri ve efsunlar bu bölümden yönetilir.`:`Kaydettiğinde hazırladığın tüm ayarlar güvenli biçimde uygulanır.`})]})]}),(0,Z.jsx)(`div`,{className:`settings-groups`,children:zt.filter(e=>Vt(e.title)===n).map(e=>{let t=e.fields.map(([e])=>e),n=t.filter(Fe).length,r=e.title===`Bosslar · Taş Sanatı Kitabı`;return(0,Z.jsxs)(`fieldset`,{children:[(0,Z.jsx)(`legend`,{children:e.title}),r&&(0,Z.jsx)(`p`,{className:`settings-group-note`,children:`Kaydettiğinde kitap oranı ve adetleri ilgili bossun aktif ganimet tablosuna da uygulanır. %0 düşüşü kapatır. Kayıtlı değerleri yeniden uygulamak için aşağıdaki düğmeyi kullan.`}),e.title===`Mor Eşya · Kök Vadisi ve Bosslar`&&(0,Z.jsx)(`p`,{className:`settings-group-note`,children:`Kök Vadisi’nin üç normal canavarında ayrı mor şansı kesim başınadır; başarıda en fazla bir ekipman çıkar. Bosslarda başarı bir garanti ekipmanı mora çevirir. Her sonuç beş türden eşit olasılıkla seçilir. Varsayılan: normal %0,1, Kadim %0,1, Dünya %0,05. %0 mor düşüşü kapatır.`}),e.title===`Eşya Satış Değeri`&&(0,Z.jsx)(`p`,{className:`settings-group-note`,children:`Bu fiyatlar silah, zırh, ayakkabı ve kolyede nadirliğe göre aynıdır. Yalnız değiştirdiğin fiyatlar kaydedilir; başka bir kart veya eski ekran bunları geri yazamaz.`}),e.fields.map(([e,t,n])=>(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:t}),(0,Z.jsx)(`input`,{type:`number`,step:n,...e===`channel_capacity`?{min:1,max:30}:Kt.has(e)?{min:0,max:100}:qt.has(e)?{min:0,max:1}:{},value:(e==="black_stone_boss_damage_scale"?Math.round(Number(colAffixAdminFieldValue454(m,e)??0)*48):colAffixAdminFieldValue454(m,e)),onChange:t=>Ie(e,(e==="black_stone_boss_damage_scale"?Number(t.target.value)/48:Number(t.target.value))),...colBossBounds494(e)})]},e)),(0,Z.jsxs)(`button`,{type:`button`,className:`settings-group-save`,disabled:T||!d||n<1&&!r,onClick:()=>Le(t,r),children:[(0,Z.jsx)(Q,{}),` `,n>0?`${n} Değişikliği Kaydet`:r?`Kitap ayarlarını uygula`:`Değişiklik Yok`]})]},e.title)})})]}),(0,Z.jsxs)(`aside`,{className:`admin-side`,children:[n==='sis_mist'&&X.createElement(tower511Admin.MistAdmin,{act:q,busy:T}),n==='kadim_tower'&&X.createElement(tower511Admin.Admin,{act:q,busy:T}),n===`overview`&&(0,Z.jsxs)(`section`,{className:`admin-card admin-overview-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(lt,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Kontrol Merkezi`}),(0,Z.jsx)(`p`,{children:`Canlı durum yukarıda. Bir bölüme geçerek yalnız ilgili araçları gör.`})]})]}),(0,Z.jsx)(`div`,{className:`overview-links`,children:Bt.filter(e=>e.id!==`overview`).map(e=>(0,Z.jsxs)(`button`,{onClick:()=>i(e.id),children:[e.icon,(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:e.label}),(0,Z.jsx)(`small`,{children:e.note})]})]},e.id))})]}),n===`epins`&&(0,Z.jsx)(Z.Fragment,{children:(0,Z.jsxs)(`section`,{className:`admin-card epin-admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(Ae,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`E-PIN Yönetimi`}),(0,Z.jsx)(`p`,{children:`200 / 500 / 1000 ÇP veya destek paketi için tek kullanımlık kod üret.`})]})]}),(0,Z.jsxs)(`div`,{className:`epin-summary`,children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`small`,{children:`Aktif`}),(0,Z.jsx)(`strong`,{children:d?.epins.active??0})]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`small`,{children:`Kullanılmış`}),(0,Z.jsx)(`strong`,{children:d?.epins.redeemed??0})]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`small`,{children:`İptal`}),(0,Z.jsx)(`strong`,{children:d?.epins.revoked??0})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Kod ürünü`}),(0,Z.jsxs)(`select`,{value:F,onChange:e=>re(e.target.value),children:[(0,Z.jsxs)(`option`,{value:`core-coins-200-v1`,children:[`200 Çekirdek Parası · `,Ee(d?.premiumPrices,`coins_200`).amount,` TL`]}),(0,Z.jsxs)(`option`,{value:`core-coins-500-v1`,children:[`500 Çekirdek Parası · `,Ee(d?.premiumPrices,`coins_500`).amount,` TL`]}),(0,Z.jsxs)(`option`,{value:`core-coins-1000-v1`,children:[`1000 Çekirdek Parası · `,Ee(d?.premiumPrices,`coins_1000`).amount,` TL`]}),(0,Z.jsxs)(`option`,{value:`core-coins-3000-v1`,children:[`3000 Çekirdek Parası · `,Ee(d?.premiumPrices,`coins_3000`).amount,` TL`]}),(0,Z.jsxs)(`option`,{value:`destek-paketi-100-v1`,children:[`Destek Paketi · Yüzük/tılsım 5 gün, kanat 14 gün · `,Ee(d?.premiumPrices,`support`).amount,` TL`]})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Grup adı`}),(0,Z.jsx)(`input`,{value:P,maxLength:80,onChange:e=>ne(e.target.value)})]}),(0,Z.jsxs)(`div`,{className:`epin-generator-fields`,children:[(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Kod adedi`}),(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`100`,step:`1`,value:ie,onChange:e=>ae(Number(e.target.value))})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Geçerlilik günü · 0 süresiz`}),(0,Z.jsx)(`input`,{type:`number`,min:`0`,max:`3650`,step:`1`,value:oe,onChange:e=>ce(Number(e.target.value))})]})]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||ie<1||ie>100,onClick:()=>void J(),children:[(0,Z.jsx)(Ae,{}),` E-PIN Üret`]}),I.length>0&&(0,Z.jsxs)(`div`,{className:`generated-epins`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:`Yeni kodlar · yalnızca şimdi gösterilir`}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsxs)(`button`,{onClick:()=>void Me(),children:[(0,Z.jsx)(it,{}),` Kopyala`]}),(0,Z.jsxs)(`button`,{onClick:Ne,children:[(0,Z.jsx)(at,{}),` İndir`]})]})]}),(0,Z.jsx)(`textarea`,{readOnly:!0,value:I.join(`
`),"aria-label":`Yeni üretilen E-PIN kodları`})]}),(0,Z.jsxs)(`div`,{className:`epin-batches`,children:[(0,Z.jsx)(`h3`,{children:`Son kod grupları`}),d?.epins.batches.map(e=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:e.name}),(0,Z.jsxs)(`small`,{children:[e.active_count,` aktif · `,e.redeemed_count,` kullanılmış · `,e.expires_at?new Date(e.expires_at*1e3).toLocaleDateString(`tr-TR`)+` tarihine kadar`:`süresiz`]})]}),(0,Z.jsxs)(`button`,{disabled:T||e.active_count<1,title:`Kalan aktif kodları iptal et`,onClick:()=>void q({action:`revoke_epin_batch`,batchId:e.id},`${e.name} grubundaki ${e.active_count} aktif kod iptal edilsin mi?`),children:[(0,Z.jsx)(rt,{}),` İptal`]})]},e.id)),!d?.epins.batches.length&&(0,Z.jsx)(`p`,{children:`Henüz E-PIN grubu oluşturulmadı.`})]})]})}),n===`players`&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`section`,{className:`admin-card player-live-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(nt,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Anlık Oyuncu Kontrolü`}),(0,Z.jsx)(`p`,{children:`Oyuncunun gelişimini, kaynaklarını, yeteneklerini ve özel eşyalarını tek ekrandan yönet.`})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Oyuncu`}),(0,Z.jsx)(`select`,{value:R,onChange:e=>le(e.target.value),children:d?.players.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.name,` · Sv. `,e.level,` · `,(fe?fe.has(e.id):e.last_seen>=(d?.serverTime??0)-30)?`Çevrimiçi`:`Çevrim dışı`]},e.id))})]}),(0,Z.jsx)(`div`,{className:`player-control-grid`,children:Ht.map(([e,t,n])=>(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:t}),(0,Z.jsx)(`input`,{type:`number`,min:e.startsWith(`skill`)||e===`level`?1:0,...e===`hp`?{max:d?.players.find(e=>e.id===R)?.max_hp??d?.settings.player_max_hp??100}:e.startsWith(`skill`)?{max:10}:{},step:n,value:B[e],onChange:t=>V(n=>({...n,[e]:Number(t.target.value)}))})]},e))}),(0,Z.jsxs)(`div`,{className:`wing-admin-toggles`,children:[(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`input`,{type:`checkbox`,checked:B.hasRod===1,onChange:e=>V(t=>({...t,hasRod:+!!e.target.checked,rodEquipped:e.target.checked?t.rodEquipped:0}))}),(0,Z.jsx)(A,{}),` Olta sahibi`]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`input`,{type:`checkbox`,checked:B.rodEquipped===1,disabled:B.hasRod!==1,onChange:e=>V(t=>({...t,rodEquipped:+!!e.target.checked}))}),(0,Z.jsx)(A,{}),` Olta kuşanılı`]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`input`,{type:`checkbox`,checked:B.hasWings===1,onChange:e=>V(t=>({...t,hasWings:+!!e.target.checked,wingsEquipped:e.target.checked?t.wingsEquipped:0}))}),(0,Z.jsx)(ee,{}),` Kanat sahibi`]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`input`,{type:`checkbox`,checked:B.wingsEquipped===1,disabled:B.hasWings!==1,onChange:e=>V(t=>({...t,wingsEquipped:+!!e.target.checked}))}),(0,Z.jsx)(ee,{}),` Kanat kuşanılı`]})]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!R,onClick:()=>void q({action:`update_player`,playerId:R,playerState:B}),children:[(0,Z.jsx)(Q,{}),` Oyuncuya Anında Uygula`]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(y,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Başlangıç Sandığı Gönder`}),(0,Z.jsx)(`p`,{children:`Seçili oyuncunun normal çantasına 1 sandık gönderir. Ön kayıt şartı aranmaz; çevrimdışıyken de teslim edilir.`})]})]}),(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:d?.players.find(e=>e.id===R)?.name??`Önce oyuncu seç`}),` · 50 Mücevher, 10 Kırmızı İksir, +10 saldırı ve +350 can veren 3 günlük Başlangıç Tilkisi.`]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!R,onClick:async()=>{ke.current?.playerId!==R&&(ke.current={playerId:R,requestId:crypto.randomUUID()}),await q({action:`grant_starter_chest`,playerId:R,requestId:ke.current.requestId})&&(ke.current=null,C(`Başlangıç Sandığı oyuncunun normal çantasına gönderildi.`))},children:[(0,Z.jsx)(y,{}),`Başlangıç Sandığı Gönder`]})]}),(0,Z.jsxs)(`section`,{className:`admin-card player-evolution-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(de,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Silah Evrim Puanı`}),(0,Z.jsx)(`p`,{children:`Anlık Oyuncu Kontrolü’nden seçtiğin oyuncunun kuşanılmış silahındaki canavar sayısını düzenle.`})]})]}),(()=>{let e=d?.players.find(e=>e.id===R),t=e?.evolution_weapon;return(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:e?.name}),` · `,t?.name??`Kuşanılmış silah yok`]}),t&&(0,Z.jsxs)(`p`,{children:[`Mevcut puan: `,Oe(t.enchantments).kills,` · Evrim `,Oe(t.enchantments).level,`/3`]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Yeni toplam evrim puanı`}),(0,Z.jsx)(`input`,{type:`number`,min:`0`,max:`1000000000`,step:`1`,value:N,onChange:e=>te(Number(e.target.value))})]}),(0,Z.jsx)(`p`,{children:`Yalnız puan değişir; evrim seviyesi, efsunlar ve takılı taşlar korunur.`}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!t||!Number.isSafeInteger(N)||N<0||N>1e9,onClick:()=>void q({action:`set_weapon_evolution_points`,playerId:R,itemId:t?.id,amount:N}),children:[(0,Z.jsx)(Q,{}),`Puanı Uygula`]})]})})()]}),(0,Z.jsxs)(`section`,{className:`admin-card player-grant-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(Pe,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncuya Mücevher Ver`}),(0,Z.jsx)(`p`,{children:`Seçtiğin oyuncunun bakiyesine anında eklenir.`})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Oyuncu`}),(0,Z.jsx)(`select`,{value:D,onChange:e=>O(e.target.value),children:d?.players.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.name,` · Sv. `,e.level,` · `,e.gems,` 💎`]},e.id))})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Miktar`}),(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`1000000`,step:`1`,value:k,onChange:e=>j(Number(e.target.value))})]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!D||k<1,onClick:()=>void q({action:`grant_gems`,playerId:D,amount:k}),children:[(0,Z.jsx)(p,{}),` Mücevher Ekle`]})]}),d?.ranks&&(0,Z.jsx)(Dt,{player:d.players.find(e=>e.id===R),settings:d.ranks,busy:T,act:q}),X.createElement(colSpecializationReset463Admin,{player:d.players.find(e=>e.id===R),busy:T,act:q}),X.createElement(colBrokenCore464Admin.Player,{player:d.players.find(e=>e.id===R),busy:T,act:q}),(0,Z.jsx)(Et,{players:d?.players??[],selectedPlayerId:R,busy:T,act:q}),(0,Z.jsxs)(`section`,{className:`admin-card item-grant-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(y,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncuya Eşya Ver`}),(0,Z.jsx)(`p`,{children:`Eşsiz ve Sonsuz dahil ekipmanı veya Taş Sanatı Kitabını seçili oyuncuya gönder. Güç alanındaki değer aynen verilir.`})]})]}),(0,Z.jsxs)(`div`,{className:`item-grant-grid`,children:[(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Eşya adı`}),(0,Z.jsx)(`input`,{value:H.itemName,maxLength:64,onChange:e=>U(t=>({...t,itemName:e.target.value}))})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Tür`}),(0,Z.jsxs)(`select`,{value:H.kind,onChange:e=>U(t=>(emeraldGrantFields444(t,{...t,kind:e.target.value,enchantments:t.enchantments.map(e=>({...e,kind:``}))},d?.settings??{}))),children:[(0,Z.jsx)(`option`,{value:`weapon`,children:`Silah`}),(0,Z.jsx)(`option`,{value:`armor`,children:`Zırh`}),(0,Z.jsx)(`option`,{value:`helmet`,children:`Kask`}),(0,Z.jsx)(`option`,{value:`shoes`,children:`Ayakkabı`}),(0,Z.jsx)(`option`,{value:`necklace`,children:`Kolye`})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Nadirlik`}),(0,Z.jsxs)(`select`,{value:H.rarity,onChange:e=>U(t=>(emeraldGrantFields444(t,{...t,rarity:e.target.value},d?.settings??{}))),children:[(0,Z.jsx)(`option`,{value:`white`,children:`Beyaz`}),(0,Z.jsx)(`option`,{value:`blue`,children:`Mavi`}),(0,Z.jsx)(`option`,{value:`orange`,children:`Turuncu`}),(0,Z.jsx)(`option`,{value:`red`,children:`Kırmızı`}),(0,Z.jsx)(`option`,{value:`purple`,children:`Mor Kök`}),(0,Z.jsx)(`option`,{value:`unique`,children:`Eşsiz`}),(0,Z.jsx)(`option`,{value:`infinite`,children:`Sonsuz`}),0,Z.jsx("option",{value:"emerald",children:"Kadim Zümrüt (65)"})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Sınıf`}),(0,Z.jsxs)(`select`,{value:H.role,onChange:e=>U(t=>(emeraldGrantFields444(t,{...t,role:e.target.value},d?.settings??{}))),children:[(0,Z.jsx)(`option`,{value:`muhafiz`,children:`Muhafız`}),(0,Z.jsx)(`option`,{value:`avci`,children:`Avcı`}),(0,Z.jsx)(`option`,{value:`arkanist`,children:`Arkanist`})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Güç`}),(0,Z.jsx)(`input`,{type:`number`,min:`0`,max:`100000`,value:H.power,onChange:e=>U(t=>({...t,power:Number(e.target.value)}))})]})]}),(0,Z.jsx)(`div`,{className:`item-enchant-grid`,children:H.enchantments.map((e,t)=>(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`select`,{"aria-label":`${t+1}. efsun`,value:e.kind,onChange:e=>U(n=>({...n,enchantments:n.enchantments.map((n,r)=>r===t?{...n,kind:e.target.value,value:e.target.value?Ve(d?.settings,e.target.value)[0]:0}:n)})),children:Ut.filter(([e])=>Gt(e,H.kind)).map(([e,n])=>(0,Z.jsxs)(`option`,{value:e,children:[t+1,`. `,n]},e||`none`))}),(0,Z.jsxs)(`select`,{"aria-label":`${t+1}. efsun değeri`,value:e.kind&&Ve(d?.settings,e.kind).includes(e.value)?e.value:``,disabled:!e.kind,onChange:e=>U(n=>({...n,enchantments:n.enchantments.map((n,r)=>r===t?{...n,value:Number(e.target.value)}:n)})),children:[(0,Z.jsx)(`option`,{value:``,disabled:!0,children:`Kademe seç`}),e.kind&&Ve(d?.settings,e.kind).map((t,n)=>(0,Z.jsxs)(`option`,{value:t,children:[n+1,`. kademe · `,t,e.kind===`hp`?` can`:`%`]},n))]})]},t))}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!R||!H.itemName.trim(),onClick:()=>void q({action:`grant_item`,playerId:R,item:{...H,enchantments:H.enchantments.filter(e=>e.kind)}}),children:[(0,Z.jsx)(y,{}),` Ekipmanı Çantasına Gönder`]}),(0,Z.jsxs)(`div`,{className:`stone-book-admin-grant`,children:[(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Taş Sanatı Kitabı miktarı`}),(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`1000000`,step:`1`,value:z,onChange:e=>ue(Number(e.target.value))})]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!R||!Number.isSafeInteger(z)||z<1,onClick:()=>void q({action:`grant_stone_books`,playerId:R,amount:z}),children:[(0,Z.jsx)(y,{}),` Taş Sanatı Kitabı Ver`]})]}),(0,Z.jsxs)(`div`,{className:`stone-book-admin-grant`,children:[(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Evrim Parşömeni miktarı`}),(0,Z.jsx)(`input`,{type:`number`,min:`1`,max:`1000000`,step:`1`,value:z,onChange:e=>ue(Number(e.target.value))})]}),(0,Z.jsxs)(`button`,{className:`admin-primary`,disabled:T||!R||!Number.isSafeInteger(z)||z<1,onClick:()=>void q({action:`grant_evolution_scrolls`,playerId:R,amount:z}),children:[(0,Z.jsx)(y,{}),` Evrim Parşömeni Ver`]})]})]}),X.createElement(colGuildResetAdmin470,{busy:T,act:q}),X.createElement(colPlayerResetAdmin495,{busy:T,act:q,playerId:R,playerName:d?.players.find(p=>p.id===R)?.name??"Bu oyuncu"})]}),n===`security`&&(0,Z.jsxs)(`section`,{className:`admin-card security-accounts-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(rt,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncuyu Elle Engelle`}),(0,Z.jsx)(`p`,{children:`Oyuncu adını yaz. Sistem kendi başına kimseyi engellemez; işlem yalnız sen düğmeye bastığında uygulanır.`})]})]}),(0,Z.jsxs)(`label`,{className:`admin-select-label`,children:[(0,Z.jsx)(`span`,{children:`Oyuncu adı`}),(0,Z.jsx)(`input`,{value:c,maxLength:32,autoComplete:`off`,onChange:e=>l(e.target.value),placeholder:`Oyuncunun adını yaz`})]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:T||!c.trim(),onClick:()=>void q({action:`security_suspend`,playerName:c.trim(),durationMinutes:30},`${c.trim()} 30 dakika askıya alınsın mı?`),children:`30 dk Askı`}),(0,Z.jsx)(`button`,{disabled:T||!c.trim(),onClick:()=>void q({action:`security_suspend`,playerName:c.trim(),durationMinutes:1440},`${c.trim()} 24 saat askıya alınsın mı?`),children:`24 sa Askı`}),(0,Z.jsx)(`button`,{className:`permanent`,disabled:T||!c.trim(),onClick:()=>void q({action:`security_ban_permanent`,playerName:c.trim()},`${c.trim()} kalıcı olarak engellensin mi?`),children:`Kalıcı Ban`}),(0,Z.jsx)(`button`,{disabled:T||!c.trim(),onClick:()=>void q({action:`security_unban`,playerName:c.trim()},`${c.trim()} hesabının engeli kaldırılsın mı?`),children:`Banı Kaldır`})]}),(0,Z.jsxs)(`div`,{className:`security-account-list`,children:[(0,Z.jsx)(`h3`,{children:`Şu an engelli oyuncular`}),d?.security.accounts.map(e=>(0,Z.jsxs)(`article`,{children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:e.player_name||e.username}),(0,Z.jsx)(`small`,{children:e.permanently_banned?`Kalıcı engel`:`${new Date(e.suspended_until_ms).toLocaleString(`tr-TR`)} kadar askıda`}),e.ban_reason&&(0,Z.jsx)(`em`,{children:e.ban_reason})]}),(0,Z.jsx)(`div`,{children:(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`security_unban`,accountId:e.account_id},`${e.player_name||e.username} hesabının engeli kaldırılsın mı?`),children:`Engeli Kaldır`})})]},e.account_id)),!d?.security.accounts.length&&(0,Z.jsx)(`p`,{children:`Engelli oyuncu yok.`})]})]}),n===`economy`&&(0,Z.jsx)(`section`,{className:`admin-card fishing-admin-note`,children:(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(A,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Balıkçılık Ekonomisi`}),(0,Z.jsx)(`p`,{children:`Olta, balık, inci ve Demirci Haso maliyetleri bu sayfadaki gruplardan yönetilir.`})]})]})}),n===`overview`&&(0,Z.jsx)(Z.Fragment,{children:(0,Z.jsx)(qe,{settings:d?.settings,busy:T,act:q})}),n===`world`&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(M,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Dünya Sağlığı`}),(0,Z.jsx)(`p`,{children:`Boş geçen süre de otomatik hesaba katılır.`})]})]}),(0,Z.jsx)(`input`,{className:`health-range`,type:`range`,min:`0`,max:`100`,step:`.1`,value:_,onChange:e=>v(Number(e.target.value))}),(0,Z.jsxs)(`div`,{className:`health-control`,children:[(0,Z.jsxs)(`strong`,{children:[`%`,_.toFixed(1)]}),(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`set_health`,health:_}),children:`Uygula`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(w,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Dünya Bossu`}),(0,Z.jsx)(`p`,{children:d?.boss?.hp?`${d.boss.hp}/${d.boss.max_hp} can`:`Şu an haritada değil`})]})]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`spawn_boss`}),children:`Bossu Getir`}),(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`remove_boss`}),children:`Bossu Kaldır`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(S,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Ayaz Tahtının Bekçisi`}),(0,Z.jsx)(`p`,{children:d?.frozenBoss?.hp?`${d.frozenBoss.hp}/${d.frozenBoss.max_hp} can`:d?.frozenBoss?.respawn_at&&d.frozenBoss.respawn_at>Y?`${Math.max(0,d.frozenBoss.respawn_at-Y)} sn sonra doğacak`:`Şu an haritada değil`})]})]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:T||!d?.frozenBoss||d.frozenBoss.hp>0,onClick:()=>void q({action:`spawn_frozen_boss`}),children:`Merkez Bossunu Getir`}),(0,Z.jsx)(`button`,{disabled:T||!d?.frozenBoss||d.frozenBoss.hp<=0,onClick:()=>void q({action:`remove_frozen_boss`},`Ayaz Tahtının Bekçisi haritadan kaldırılıp yeniden doğma sayacı başlatılsın mı?`),children:`Merkez Bossunu Kaldır`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(w,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Kadim Kökün Muhafızı`}),(0,Z.jsx)(`p`,{children:d?.ancientBoss?.hp?`${d.ancientBoss.hp}/${d.ancientBoss.max_hp} can`:d?.ancientBoss?.respawn_at&&d.ancientBoss.respawn_at>Y?`${Math.max(0,d.ancientBoss.respawn_at-Y)} sn sonra doğacak`:`Şu an haritada değil`})]})]}),(0,Z.jsx)(`p`,{children:`Donmuş Çam Geçidi Ayaz Tahtı bossunun ganimet profilini kullanır. Eşya ve malzeme oranlarını Ganimetler sekmesindeki Ayaz Tahtı profilinden düzenle.`}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:T||!d?.ancientBoss||d.ancientBoss.hp>0,onClick:()=>void q({action:`spawn_ancient_boss`}),children:`Kadim Bossu Getir`}),(0,Z.jsx)(`button`,{disabled:T||!d?.ancientBoss||d.ancientBoss.hp<=0,onClick:()=>void q({action:`remove_ancient_boss`},`Kadim Kökün Muhafızı kaldırılıp 40 dakikalık yeniden doğma sayacı başlatılsın mı?`),children:`Kadim Bossu Kaldır`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(S,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Buzgölü Semenderi`}),(0,Z.jsx)(`p`,{children:(d?.frozenWater?.alive_count??0)>0?`${d?.frozenWater?.alive_count??0}/${d?.frozenWater?.total_count??3} kanalda gölde · toplam ${d?.frozenWater?.hp??0}/${d?.frozenWater?.max_hp??0} can`:d?.frozenWater?.next_respawn_at&&d.frozenWater.next_respawn_at>Y?`${Math.max(0,d.frozenWater.next_respawn_at-Y)} sn sonra ilk kanalda doğacak`:`Şu an hiçbir kanalda gölde değil`})]})]}),(0,Z.jsxs)(`div`,{className:`admin-actions`,children:[(0,Z.jsx)(`button`,{disabled:T||!d?.frozenWater||d.frozenWater.alive_count>=d.frozenWater.total_count,onClick:()=>void q({action:`spawn_frozen_water`}),children:`Eksik Semenderleri Getir`}),(0,Z.jsx)(`button`,{disabled:T||!d?.frozenWater||d.frozenWater.alive_count<1,onClick:()=>void q({action:`remove_frozen_water`},`Buzgölü Semenderi bütün kanallardaki göllerden kaldırılıp yeniden doğma sayaçları başlatılsın mı?`),children:`Semenderleri Kaldır`})]})]}),(0,Z.jsxs)(`section`,{className:`admin-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(p,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Sinsi Taş Kontrolü`}),(0,Z.jsxs)(`p`,{children:[`3 kanalda `,d?.stones.filter(e=>e.hp>0).length??0,`/`,d?.stones.length??9,` taş ayakta`]})]})]}),(0,Z.jsx)(`div`,{className:`stone-admin-list`,children:d?.channels.map(e=>{let t=d.stones.filter(t=>t.channel===e.id);return(0,Z.jsxs)(`div`,{children:[(0,Z.jsxs)(`strong`,{children:[`Kanal `,e.id]}),(0,Z.jsxs)(`span`,{children:[e.online,`/`,d.settings.channel_capacity??15,` oyuncu · `,t.filter(e=>e.hp>0).length,`/`,t.length,` taş`]})]},e.id)})}),(0,Z.jsx)(`div`,{className:`admin-actions`,children:(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`reset_sinsi_stones`}),children:`Tüm Taşları Yenile`})})]}),(0,Z.jsxs)(`section`,{className:`admin-card danger-card`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(ft,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Dünya Döngüsü`}),(0,Z.jsxs)(`p`,{children:[`Döngü `,d?.world.cycle??`—`]})]})]}),(0,Z.jsx)(`button`,{disabled:T,onClick:()=>void q({action:`reset_world`},`Dünya 8 saniye içinde patlayacak ve TÜM oyuncu ilerlemeleri sıfırlanacak. Emin misin?`),children:`Dünyayı Sıfırla`})]})]})]})]})]})}var on={game_bug:`Oyun hatası`,item_reward:`Eşya / ödül`,payment:`Ödeme`,player_report:`Oyuncu şikâyeti`,other:`Diğer`};function sn(e){return new Date(e).toLocaleString(`tr-TR`,{dateStyle:`short`,timeStyle:`short`})}async function cn(e){let t=await e.json().catch(()=>({}));if(!e.ok)throw Error(t.error||`Destek işlemi tamamlanamadı.`);return t}function ln(){let[e,t]=(0,X.useState)({tickets:[],messages:[],selectedTicketId:null}),[n,r]=(0,X.useState)(``),[i,a]=(0,X.useState)(`open`),[o,c]=(0,X.useState)(``),[l,u]=(0,X.useState)(``),[d,f]=(0,X.useState)(!0),[p,m]=(0,X.useState)(!1),[g,_]=(0,X.useState)(``),v=(0,X.useRef)(``),y=(0,X.useRef)(``),b=(0,X.useRef)(null);(0,X.useEffect)(()=>{let e=new AbortController,i=!1,a=!0,o=async(o=!1)=>{if(!(i||document.visibilityState===`hidden`)){i=!0,o&&f(!0);try{let i=n?`?ticketId=${encodeURIComponent(n)}`:``,o=await cn(await fetch(`/api/admin/support${i}`,{cache:`no-store`,signal:e.signal}));if(!a)return;t(o),_(``),!n&&o.selectedTicketId&&r(o.selectedTicketId)}catch(t){if(!a||e.signal.aborted)return;_(t instanceof Error?t.message:`Destek gelen kutusu yüklenemedi.`)}finally{i=!1,a&&f(!1)}}};o(!0);let s=window.setInterval(()=>void o(!1),5e3);return()=>{a=!1,e.abort(),window.clearInterval(s)}},[n]);let x=e.tickets.find(e=>e.id===n)??e.tickets.find(t=>t.id===e.selectedTicketId)??null;(0,X.useEffect)(()=>{(e.messages.at(-1)?.id??0)&&b.current?.scrollIntoView({block:`end`})},[n,e.messages]),(0,X.useEffect)(()=>{!x?.admin_unread_count||y.current===x.id||(y.current=x.id,fetch(`/api/admin/support`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({action:`mark_read`,ticketId:x.id})}).then(cn).then(e=>{t(e),_(``)}).catch(e=>{_(e instanceof Error?e.message:`Okundu bilgisi kaydedilemedi.`)}).finally(()=>{y.current=``}))},[x]);let S=(0,X.useMemo)(()=>{let t=o.trim().toLocaleLowerCase(`tr-TR`);return e.tickets.filter(e=>i===`open`&&e.status!==`open`||i===`resolved`&&e.status!==`resolved`||i===`unread`&&e.admin_unread_count<1?!1:t?`${e.player_name} ${e.username} ${e.subject}`.toLocaleLowerCase(`tr-TR`).includes(t):!0)},[i,o,e.tickets]),C=async e=>{m(!0),_(``);try{let n=await cn(await fetch(`/api/admin/support`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)}));return t(n),n.selectedTicketId&&r(n.selectedTicketId),!0}catch(e){return _(e instanceof Error?e.message:`Destek işlemi tamamlanamadı.`),!1}finally{m(!1)}},w=async e=>{e.preventDefault();let t=l.trim();if(!x||!t||Array.from(t).length>1e3)return;let n=v.current||crypto.randomUUID();v.current=n,await C({action:`reply`,ticketId:x.id,message:t,clientRequestId:n})&&(u(``),v.current=``)},T=e.tickets.filter(e=>e.status===`open`).length,D=e.tickets.reduce((e,t)=>e+ +(t.admin_unread_count>0),0);return(0,Z.jsxs)(`section`,{className:`admin-card admin-support-workspace`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title admin-support-title`,children:[(0,Z.jsx)(s,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Oyuncu Destek Merkezi`}),(0,Z.jsx)(`p`,{children:`Şikâyet ve yardım taleplerini gör, oyuncuyla özel olarak konuş ve çözülen kayıtları kapat.`})]})]}),(0,Z.jsxs)(`div`,{className:`admin-support-summary`,"aria-label":`Destek özeti`,children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(ct,{}),(0,Z.jsx)(`small`,{children:`Açık`}),(0,Z.jsx)(`strong`,{children:T})]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(E,{}),(0,Z.jsx)(`small`,{children:`Okunmamış`}),(0,Z.jsx)(`strong`,{children:D})]}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(Le,{}),(0,Z.jsx)(`small`,{children:`Çözülen`}),(0,Z.jsx)(`strong`,{children:e.tickets.length-T})]})]}),(0,Z.jsxs)(`div`,{className:`admin-support-toolbar`,children:[(0,Z.jsx)(`div`,{role:`group`,"aria-label":`Talep filtresi`,children:[`open`,`unread`,`resolved`,`all`].map(e=>(0,Z.jsx)(`button`,{className:i===e?`active`:``,onClick:()=>a(e),children:e===`open`?`Açık`:e===`unread`?`Okunmamış`:e===`resolved`?`Çözülen`:`Tümü`},e))}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(dt,{}),(0,Z.jsx)(`input`,{value:o,onChange:e=>c(e.target.value),placeholder:`Oyuncu veya başlık ara`,"aria-label":`Destek taleplerinde ara`})]})]}),g&&(0,Z.jsx)(`div`,{className:`admin-support-error`,role:`alert`,children:g}),(0,Z.jsxs)(`div`,{className:`admin-support-layout`,children:[(0,Z.jsxs)(`div`,{className:`admin-support-inbox`,"aria-label":`Destek talepleri`,children:[d&&e.tickets.length===0&&(0,Z.jsx)(`p`,{className:`admin-support-empty`,children:`Talepler yükleniyor…`}),!d&&S.length===0&&(0,Z.jsx)(`p`,{className:`admin-support-empty`,children:`Bu görünümde destek talebi yok.`}),S.map(e=>(0,Z.jsxs)(`button`,{className:`admin-support-ticket ${x?.id===e.id?`active`:``}`,onClick:()=>r(e.id),children:[(0,Z.jsxs)(`span`,{className:`admin-support-ticket-head`,children:[(0,Z.jsx)(`strong`,{children:e.player_name||e.username||`Oyuncu`}),e.admin_unread_count>0&&(0,Z.jsx)(`b`,{"aria-label":`${e.admin_unread_count} okunmamış mesaj`,children:e.admin_unread_count})]}),(0,Z.jsx)(`span`,{className:`admin-support-ticket-subject`,children:e.subject}),(0,Z.jsxs)(`small`,{children:[on[e.category]??`Diğer`,` · `,sn(e.updated_at_ms)]}),(0,Z.jsx)(`em`,{className:e.status,children:e.status===`open`?`Açık`:`Çözüldü`})]},e.id))]}),(0,Z.jsxs)(`section`,{className:`admin-support-thread`,"aria-label":`Destek konuşması`,children:[!x&&(0,Z.jsxs)(`div`,{className:`admin-support-thread-empty`,children:[(0,Z.jsx)(s,{}),(0,Z.jsx)(`strong`,{children:`Bir destek talebi seç`}),(0,Z.jsx)(`p`,{children:`Oyuncunun mesajları ve yanıt alanı burada görünecek.`})]}),x&&(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsxs)(`header`,{className:`admin-support-thread-head`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`span`,{children:on[x.category]??`Diğer`}),(0,Z.jsx)(`h3`,{children:x.subject}),(0,Z.jsxs)(`p`,{children:[x.player_name,` · `,x.username||`kullanıcı adı yok`,` · Seviye `,x.level||`—`]})]}),(0,Z.jsx)(`button`,{className:x.status===`resolved`?`reopen`:`resolve`,disabled:p,onClick:()=>void C({action:`set_status`,ticketId:x.id,status:x.status===`resolved`?`open`:`resolved`}),children:x.status===`resolved`?`Yeniden Aç`:(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(Le,{}),` Çözüldü`]})})]}),(0,Z.jsxs)(`div`,{className:`admin-support-messages`,role:`log`,"aria-live":`polite`,children:[e.messages.map(e=>(0,Z.jsxs)(`article`,{className:e.sender_type===`admin`?`from-admin`:`from-player`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:e.sender_type===`admin`?`Sen`:e.sender_name}),(0,Z.jsx)(`time`,{dateTime:new Date(e.created_at_ms).toISOString(),children:sn(e.created_at_ms)})]}),(0,Z.jsx)(`p`,{children:e.body})]},e.id)),!e.messages.length&&!d&&(0,Z.jsx)(`p`,{className:`admin-support-empty`,children:`Bu talepte henüz mesaj yok.`}),(0,Z.jsx)(`div`,{ref:b})]}),(0,Z.jsxs)(`form`,{className:`admin-support-compose`,onSubmit:w,children:[(0,Z.jsx)(`textarea`,{value:l,maxLength:1e3,rows:3,placeholder:`Oyuncuya yanıtını yaz…`,"aria-label":`Destek yanıtı`,onChange:e=>{u(e.target.value),v.current=``}}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsxs)(`small`,{children:[Array.from(l).length,`/1000`]}),(0,Z.jsxs)(`button`,{type:`submit`,disabled:p||!l.trim(),children:[(0,Z.jsx)(h,{}),` `,p?`Gönderiliyor…`:`Yanıtla`]})]})]})]})]})]})]})}var un=(e,t)=>{let n=Number(e);return Number.isSafeInteger(n)&&n===t};function dn({snapshot:e,busy:t,act:n,blackXp:r}){let[i,a]=(0,X.useState)(`forest`),[o,s]=(0,X.useState)({}),[c,l]=(0,X.useState)(`normal`),[u,d]=(0,X.useState)(``),[f,p]=(0,X.useState)(``),[m,h]=(0,X.useState)([]),g=e?.profiles.filter(e=>e.area===i)??[],_=(e,t)=>o[e.key]?.[t]?.value??String(e[t]),v=(n,r,i)=>{s(a=>{let o=a[n.key]??{};if(!t&&un(i,n[r])){if(!o[r])return a;let e={...a},t={...o};return delete t[r],Object.keys(t).length?e[n.key]=t:delete e[n.key],e}let s=o[r],c=!!(s&&s.baseValue===n[r]);return{...a,[n.key]:{...o,[r]:{value:i,version:(s?.version??0)+1,baseRevision:c?s.baseRevision:e?.revision??0,baseValue:c?s.baseValue:n[r]}}}}),h([])};(0,X.useEffect)(()=>{if(!e||t)return;let n=window.setTimeout(()=>s(t=>{let n=!1,r={...t};for(let t of e.profiles){let e=r[t.key];if(!e)continue;let i={...e};i.maxHp&&un(i.maxHp.value,t.maxHp)&&(delete i.maxHp,n=!0),i.hitDamage&&un(i.hitDamage.value,t.hitDamage)&&(delete i.hitDamage,n=!0),Object.keys(i).length?r[t.key]=i:delete r[t.key]}return n?r:t}),0);return()=>window.clearTimeout(n)},[t,e]);let y=g.map(e=>({profile:e,maxHpDraft:o[e.key]?.maxHp,hitDamageDraft:o[e.key]?.hitDamage,maxHp:Number(_(e,`maxHp`)),hitDamage:Number(_(e,`hitDamage`))})),b=y.map(e=>({...e,maxHpChanged:!!(e.maxHpDraft&&e.maxHp!==e.profile.maxHp),hitDamageChanged:!!(e.hitDamageDraft&&e.hitDamage!==e.profile.hitDamage)})).filter(e=>e.maxHpChanged||e.hitDamageChanged),x=b.reduce((e,t)=>e+Number(t.maxHpChanged)+Number(t.hitDamageChanged),0),C=y.flatMap(e=>[...e.maxHpDraft&&e.maxHp!==e.profile.maxHp&&e.maxHpDraft.baseValue!==e.profile.maxHp?[{profile:e.profile,field:`maxHp`,draft:e.maxHpDraft}]:[],...e.hitDamageDraft&&e.hitDamage!==e.profile.hitDamage&&e.hitDamageDraft.baseValue!==e.profile.hitDamage?[{profile:e.profile,field:`hitDamage`,draft:e.hitDamageDraft}]:[]]),w=y.flatMap(({profile:e,maxHpDraft:t,hitDamageDraft:n,maxHp:r,hitDamage:i})=>{let a=[];return t&&(!Number.isSafeInteger(r)||r<1||r>1e7)&&a.push(`${e.label}: Can 1–10.000.000 arasında tam sayı olmalı.`),n&&(!Number.isSafeInteger(i)||i<1||i>1e6)&&a.push(`${e.label}: Hasar 1–1.000.000 arasında tam sayı olmalı.`),a}),T=()=>{let n=u.trim()?Number(u):null,r=f.trim()?Number(f):null,a=[];if(n===null&&r===null&&a.push(`Toplu uygulama için can veya hasar değerlerinden en az birini yaz.`),n!==null&&(!Number.isSafeInteger(n)||n<1||n>1e7)&&a.push(`Toplu can 1–10.000.000 arasında tam sayı olmalı.`),r!==null&&(!Number.isSafeInteger(r)||r<1||r>1e6)&&a.push(`Toplu hasar 1–1.000.000 arasında tam sayı olmalı.`),a.length){h(a);return}s(a=>{let o={...a};for(let a of g.filter(e=>i===`black`||e.variant===c)){let i=o[a.key]??{},s=!!(i.maxHp&&i.maxHp.baseValue===a.maxHp),c=!!(i.hitDamage&&i.hitDamage.baseValue===a.hitDamage),l={...i,...n===null?{}:{maxHp:{value:String(n),version:(i.maxHp?.version??0)+1,baseRevision:s?i.maxHp.baseRevision:e?.revision??0,baseValue:s?i.maxHp.baseValue:a.maxHp}},...r===null?{}:{hitDamage:{value:String(r),version:(i.hitDamage?.version??0)+1,baseRevision:c?i.hitDamage.baseRevision:e?.revision??0,baseValue:c?i.hitDamage.baseValue:a.hitDamage}}};!t&&n!==null&&n===a.maxHp&&delete l.maxHp,!t&&r!==null&&r===a.hitDamage&&delete l.hitDamage,Object.keys(l).length?o[a.key]=l:delete o[a.key]}return o}),h([])},E=()=>{!e||!C.length||(s(e=>{let t={...e};for(let e of C){let n=t[e.profile.key];if(!n)continue;let r={...n};r[e.field]?.version===e.draft.version&&delete r[e.field],Object.keys(r).length?t[e.profile.key]=r:delete t[e.profile.key]}return t}),h([]))},D=async()=>{if(!e||w.length||b.length<1){h(w);return}if(C.length){h([`Canlı değerlerden biri bu taslak hazırlanırken değişti. Canlı değeri yükle veya alanı yeniden yazarak bilinçli şekilde yeni bir taslak oluştur.`]);return}let t=b.map(e=>({key:e.profile.key,maxHpVersion:e.maxHpChanged?e.maxHpDraft?.version:void 0,hitDamageVersion:e.hitDamageChanged?e.hitDamageDraft?.version:void 0})),r=await n({action:`save_monster_balance`,expectedRevision:e.revision,profiles:b.map(({profile:e,maxHp:t,hitDamage:n,maxHpChanged:r,hitDamageChanged:i})=>({key:e.key,...r?{maxHp:t}:{},...i?{hitDamage:n}:{}}))});r&&(s(e=>{let n={...e};for(let e of t){let t=n[e.key];if(!t)continue;let i={...t},a=r.monsterBalance.profiles.find(t=>t.key===e.key);e.maxHpVersion!==void 0&&(i.maxHp?.version===e.maxHpVersion?delete i.maxHp:i.maxHp&&a&&(i.maxHp={...i.maxHp,baseRevision:r.monsterBalance.revision,baseValue:a.maxHp})),e.hitDamageVersion!==void 0&&(i.hitDamage?.version===e.hitDamageVersion?delete i.hitDamage:i.hitDamage&&a&&(i.hitDamage={...i.hitDamage,baseRevision:r.monsterBalance.revision,baseValue:a.hitDamage})),Object.keys(i).length?n[e.key]=i:delete n[e.key]}return n}),h([]))};return(0,Z.jsxs)(`section`,{className:`admin-card monster-balance-admin`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(de,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Canavar Canı ve Vuruş Hasarı`}),(0,Z.jsx)(`p`,{children:`Çarpan yok: oyunda kullanılacak kesin canı ve zırh öncesi tek vuruş hasarını doğrudan yaz.`})]})]}),(0,Z.jsxs)(`div`,{className:`monster-balance-tabs`,role:`tablist`,"aria-label":`Canavar bölgesi`,children:[(0,Z.jsxs)(`button`,{type:`button`,className:i===`forest`?`active`:``,onClick:()=>a(`forest`),children:[(0,Z.jsx)(ot,{}),` Kuzey Ormanı`]}),(0,Z.jsxs)(`button`,{type:`button`,className:i===`frozen`?`active`:``,onClick:()=>a(`frozen`),children:[(0,Z.jsx)(S,{}),` Donmuş Çam`]}),(0,Z.jsxs)(`button`,{type:`button`,className:i===`black`?`active`:``,onClick:()=>a(`black`),children:[(0,Z.jsx)(de,{}),` Kara Bölge`]}),(0,Z.jsxs)(`button`,{type:`button`,className:i===`ancient`?`active`:``,onClick:()=>{a(`ancient`),l(`normal`)},children:[(0,Z.jsx)(ot,{}),` Kadim Kök Vadisi`]}),(0,Z.jsxs)(`button`,{type:`button`,className:i===`afk`?`active`:``,onClick:()=>{a(`afk`),l(`normal`)},children:[(0,Z.jsx)(ot,{}),` Otomatik Av Adası`]}),(0,Z.jsxs)(`span`,{children:[`Revizyon `,e?.revision??0]})]}),i===`black`&&(0,Z.jsxs)(`div`,{className:`monster-balance-bulk`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:`Kara Bölge · Tecrübe ödülü`}),(0,Z.jsx)(`small`,{children:`Bu temel EXP / TP değeri, bütün kanallardaki Kara Bölge canavarlarına uygulanır. Grup paylaşımı ve tecrübe bonusları ayrıca hesaplanır.`})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Canavar başına EXP / TP`}),(0,Z.jsx)(`input`,{type:`number`,min:0,max:1e6,step:1,value:r.value,onChange:e=>r.change(Number(e.target.value))})]}),(0,Z.jsxs)(`button`,{type:`button`,disabled:t||!r.dirty||!Number.isSafeInteger(r.value)||r.value<0||r.value>1e6,onClick:r.save,children:[(0,Z.jsx)(Q,{}),` EXP Kaydet`]})]}),(0,Z.jsxs)(`div`,{className:`monster-balance-bulk`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:i===`black`?`8 canavarı toplu ayarla`:`Bir kademeyi toplu ayarla`}),(0,Z.jsx)(`small`,{children:i===`black`?`Değerler tüm kanallardaki aynı numaralı canavarlara uygulanır.`:`Örnek: Normal seç, hasara 5 yaz; üç normal yaratığa birden uygula.`})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Kademe`}),(0,Z.jsxs)(`select`,{disabled:i===`black`||i===`ancient`||i===`afk`,value:i===`black`?`katil`:i===`ancient`?`normal`:c,onChange:e=>l(e.target.value),children:[(0,Z.jsx)(`option`,{value:`normal`,children:`Normal`}),(0,Z.jsx)(`option`,{value:`agresif`,children:`Agresif`}),(0,Z.jsx)(`option`,{value:`katil`,children:`Katil`})]})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Can · boş bırakılabilir`}),(0,Z.jsx)(`input`,{type:`number`,inputMode:`numeric`,min:1,max:1e7,step:1,value:u,onChange:e=>d(e.target.value),placeholder:`Değiştirme`})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Hasar · boş bırakılabilir`}),(0,Z.jsx)(`input`,{type:`number`,inputMode:`numeric`,min:1,max:1e6,step:1,value:f,onChange:e=>p(e.target.value),placeholder:`Örn. 5`})]}),(0,Z.jsx)(`button`,{type:`button`,onClick:T,children:`Satırlara Uygula`})]}),C.length>0&&(0,Z.jsxs)(`div`,{className:`monster-balance-conflict`,children:[(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:`Canlı değer değişti.`}),` `,C.slice(0,3).map(e=>`${e.profile.label} ${e.field===`maxHp`?`can`:`hasar`}: canlı ${e.profile[e.field]}, taslak ${e.draft.value}`).join(` · `),C.length>3?` · +${C.length-3} alan`:``]}),(0,Z.jsxs)(`button`,{type:`button`,disabled:t,onClick:E,children:[(0,Z.jsx)(je,{}),` Çakışan Canlı Değerleri Yükle`]})]}),(0,Z.jsxs)(`div`,{className:`monster-balance-table`,role:`table`,"aria-label":`${i===`black`?`Kara Bölge`:i===`forest`?`Kuzey Ormanı`:`Donmuş Çam`} canavar dengesi`,children:[(0,Z.jsxs)(`div`,{className:`monster-balance-row header`,role:`row`,children:[(0,Z.jsx)(`span`,{children:`Canavar`}),(0,Z.jsx)(`span`,{children:`Kademe`}),(0,Z.jsx)(`span`,{children:`Kesin can`}),(0,Z.jsx)(`span`,{children:`Zırh öncesi hasar`})]}),g.map(e=>(0,Z.jsxs)(`div`,{className:`monster-balance-row variant-${e.variant}`,role:`row`,children:[(0,Z.jsx)(`strong`,{children:e.label.split(` · `)[0]}),(0,Z.jsx)(`span`,{className:`monster-tier`,children:e.variant===`katil`?`Katil`:e.variant===`agresif`?`Agresif`:`Normal`}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Can`}),(0,Z.jsx)(`input`,{type:`number`,inputMode:`numeric`,min:1,max:1e7,step:1,value:_(e,`maxHp`),onChange:t=>v(e,`maxHp`,t.target.value)})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Hasar`}),(0,Z.jsx)(`input`,{type:`number`,inputMode:`numeric`,min:1,max:1e6,step:1,value:_(e,`hitDamage`),onChange:t=>v(e,`hitDamage`,t.target.value)})]})]},e.key))]}),(m.length>0||w.length>0)&&(0,Z.jsx)(`p`,{className:`monster-balance-errors`,children:Array.from(new Set([...m,...w])).join(` `)}),(0,Z.jsxs)(`div`,{className:`monster-balance-footer`,children:[(0,Z.jsx)(`p`,{children:`Yalnız değiştirdiğin alanlar kaydedilir; can yazmak hasarı, hasar yazmak canı değiştirmez. Yaşayan canavarların can yüzdesi korunur, ölü canavar dirilmez.`}),(0,Z.jsxs)(`button`,{type:`button`,className:`admin-primary`,disabled:t||!e||C.length>0||w.length>0||b.length<1,onClick:()=>void D(),children:[(0,Z.jsx)(Q,{}),` `,x>0?`${x} Alanı Kaydet`:`Değişiklik Yok`]})]})]})}function fn({lootEventPercent:e,records:t,templates:n,busy:r,act:i}){let[a,o]=(0,X.useState)(``),[s,c]=(0,X.useState)(null),[l,u]=(0,X.useState)(null),[d,f]=(0,X.useState)([]),[m,h]=(0,X.useState)([]),[g,_]=(0,X.useState)(``),[v,b]=(0,X.useState)(``),[x,C]=(0,X.useState)([]),T=t.find(e=>e.sourceKey===a),E=n.find(e=>e.id===v)??null,D=(0,X.useRef)(null),O=(0,X.useRef)(null),k=(0,X.useRef)(0),A=!!(T&&l?.sourceKey===T.sourceKey&&l.revision!==T.revision),j=s?he(s):null,M=!!s?.key.startsWith(`boss.`),N=s?re(s):0,ee=Math.min(1e6,Math.round(N*(1+e/100))),te=Math.min(1e6,Math.round(N*1.5*(1+e/100))),P=!!(s&&l?.sourceKey===a&&JSON.stringify(s.groups)!==JSON.stringify(l.profile.groups)),ne=[`forest`,`frozen`,`ancient`,`boss`,`sinsi`,`black`],F=Qt(a||t[0]?.sourceKey||`forest`),ie=t.filter(e=>Qt(e.sourceKey)===F),ae=(s?.groups.flatMap(e=>e.outcomes.filter(e=>e.item.type===`resource`).map(t=>({group:e,outcome:t})))??[]).find(({outcome:e})=>e.item.type===`resource`&&e.item.kind===`essence`),se=!!(s&&be(s.key)),I=(0,X.useCallback)(e=>{k.current+=1,c(t=>{let n=typeof e==`function`?e(t):e;return D.current=n,n})},[]),L=(0,X.useCallback)((e,t)=>{h(n=>{let r=n.includes(e);return t?r?n.filter(t=>t!==e):n:r?n:[...n,e]})},[]),R=(0,X.useCallback)(e=>{let t=B(Zt(e.profile)),n=he(t),r=fe(t,e.sourceKey.startsWith(`boss.`)?oe(n,1e6):n),i=Zt(r),a=Zt(r);k.current+=1;let o={sourceKey:e.sourceKey,revision:e.revision,profile:i};O.current=o,D.current=a,u(o),c(a),h([])},[]),z=(0,X.useCallback)((e,t)=>{if(t){let t={sourceKey:e.sourceKey,revision:e.revision,profile:Zt(e.profile)};O.current=t,u(t)}else R(e)},[R]);(0,X.useEffect)(()=>{if(t.length<1||a&&t.some(e=>e.sourceKey===a))return;let e=window.setTimeout(()=>{o(t[0].sourceKey),C([t[0].sourceKey])},0);return()=>window.clearTimeout(e)},[t,a]),(0,X.useEffect)(()=>{if(!T)return;let e=window.setTimeout(()=>{let e=O.current,t=D.current;t&&e?.sourceKey===T.sourceKey&&JSON.stringify(t.groups)!==JSON.stringify(e.profile.groups)||R(T)},0);return()=>window.clearTimeout(e)},[R,T]),(0,X.useEffect)(()=>{if(n.length<1){if(!v)return;let e=window.setTimeout(()=>b(``),0);return()=>window.clearTimeout(e)}if(n.some(e=>e.id===v))return;let e=window.setTimeout(()=>b(n[0].id),0);return()=>window.clearTimeout(e)},[n,v]);let V=e=>{if(r||e!==a&&P&&!window.confirm(`Bu profilde kaydedilmemiş değişiklikler var. Başka canavara geçilsin mi?`))return;let n=t.find(t=>t.sourceKey===e);o(e),C([e]),n&&R(n),f([])},de=(e,t)=>{if(!s||!j||!Number.isFinite(t))return;let n=$t(t),r=j[e.main],i=e.accessory?j[e.accessory]:0,a=e.accessory?Math.round(n*(r+i?r/(r+i):.75)):n,o={...j,[e.main]:a};if(e.accessory&&(o[e.accessory]=n-a),M){let e=ce(o)-o.white_main-o.white_accessory;if(e>1e6){f([`Renk oranları %100'ü aşamaz. Başka bir rengi azalt.`]);return}let t=1e6-e,n=o.white_main+o.white_accessory;o.white_main=Math.round(t*(n?o.white_main/n:.75)),o.white_accessory=t-o.white_main}I(fe(s,o)),f([])},H=(e,t)=>{if(!s||!Number.isFinite(t))return;let n=Math.max(1,Math.min(1e6,Math.round(t)));I({...s,groups:s.groups.map(t=>({...t,outcomes:t.outcomes.map(t=>t.item.type===`resource`&&t.item.kind===`essence`?{...t,[e]:n,...e===`minAmount`&&n>t.maxAmount?{maxAmount:n}:{},...e===`maxAmount`&&n<t.minAmount?{minAmount:n}:{}}:t)}))}),f([])},U=(()=>{if(!s)return[];if(m.length>0)return[`Oranları 0–100 arasında, miktarları 1–1.000.000 arasında tam sayı olarak yaz.`];if(N>1e6)return[`Kesim başı renk oranlarının toplamı %100'ü aşamaz.`];let e=_e(s.key,s);return e.ok?[]:e.errors})(),W=(e,t)=>{I(n=>n&&ue(n,e,{...Ce(n,e),...t})),f([])},me=async()=>{let e=O.current;if(!s||!T||!e||e.sourceKey!==T.sourceKey)return;if(e.revision!==T.revision){f([`Canlı profil r`+T.revision+`, bu taslak r`+e.revision+` temelinde. Önce canlı sürümü yükle veya taslağı şablon olarak sakla.`]);return}if(U.length){f(U);return}let t=k.current,n=e.sourceKey,r=await i({action:`save_loot_profile`,sourceKey:n,expectedRevision:e.revision,profile:s});if(r&&O.current?.sourceKey===n){let e=r.lootProfiles.find(e=>e.sourceKey===n);e&&z(e,k.current!==t),f([])}},ge=async()=>{let e=O.current;if(!T||!e||e.sourceKey!==T.sourceKey)return;if(e.revision!==T.revision){f([`Canlı profil r`+T.revision+`, bu taslak r`+e.revision+` temelinde. Sıfırlamadan önce canlı sürümü yükle.`]);return}let t=k.current,n=e.sourceKey,r=await i({action:`reset_loot_profile`,sourceKey:n,expectedRevision:e.revision},T.profile.label+` için özel düşüş ayarları silinip güvenli oyun varsayılanına dönülsün mü?`);if(r&&O.current?.sourceKey===n){let e=r.lootProfiles.find(e=>e.sourceKey===n);e&&z(e,k.current!==t),f([])}},ve=()=>{T&&(P&&!window.confirm(`Kaydedilmemiş taslak silinip canlı profil yüklensin mi? Taslağı korumak istiyorsan önce şablon olarak kaydet.`)||(R(T),f([])))},ye=async()=>{if(!s)return;let e=g.trim();if(!e){f([`Şablona anlaşılır bir ad ver.`]);return}if(U.length){f(U);return}await i({action:`save_loot_template`,templateName:e,sourceKey:s.key,groups:s.groups})&&(_(t=>t.trim()===e?``:t),f([]))},xe=()=>{if(!s||!E||r||P&&!window.confirm(`Kaydedilmemiş taslak değişikliklerinin yerine seçili şablon yüklensin mi?`))return;if(!rn(E.groups)){f([`Bu eski şablon tek ekipman tablosuna güvenle dönüştürülemiyor.`]);return}let e=fe(s,he(B(le({...s,groups:E.groups})))),t=_e(s.key,e);if(!t.ok){f([`Bu eski şablon seçili canavarın güvenli tek-ekipman düzeniyle uyumlu değil.`,...t.errors]);return}I(t.profile),h([]),f([])},Se=async()=>{if(!E||!x.length){f([`Şablon ve en az bir hedef canavar seç.`]);return}if(!rn(E.groups)){f([`Bu eski şablon tek ekipman tablosuna güvenle dönüştürülemiyor.`]);return}let e=he({version:1,key:t[0]?.sourceKey??`forest.golge.normal`,label:E.name,groups:E.groups}),n=x.flatMap(n=>{let r=t.find(e=>e.sourceKey===n);if(!r)return[n+`: Canlı profil bulunamadı.`];let i=_e(n,fe(r.profile,e));return i.ok?[]:[r.profile.label+`: `+i.errors[0]]});if(n.length){f([`Şablon seçili hedeflerin güvenli ganimet düzeniyle uyumlu değil.`,...n]);return}let r=x.map(e=>t.find(t=>t.sourceKey===e)?.profile.label??e),a=x.flatMap(e=>{let n=t.find(t=>t.sourceKey===e);return n?[{sourceKey:e,expectedRevision:n.revision}]:[]});if(a.length!==x.length){f([`Hedeflerden biri artık bulunamıyor. Canlı veriyi yenileyip tekrar seç.`]);return}await i({action:`apply_loot_template`,templateId:E.id,templateRevision:E.revision,targets:a},`“`+E.name+`” ekipman oranları `+r.length+` profile uygulanacak. Hedeflerin Yaşam Özü ve özel kaynak miktarları değişmeyecek. Devam edilsin mi?`)&&f([])},we=async()=>{E&&await i({action:`delete_loot_template`,templateId:E.id,templateRevision:E.revision},`“`+E.name+`” şablonu silinsin mi? Canlıya daha önce uygulanmış profiller değişmez.`)&&f([])};return(0,Z.jsxs)(`section`,{className:`admin-card loot-profile-admin`,children:[(0,Z.jsxs)(`div`,{className:`admin-card-title`,children:[(0,Z.jsx)(y,{}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`h2`,{children:`Canavar ve Boss Ganimetleri`}),(0,Z.jsx)(`p`,{children:`Normal canavarda her rengin kesim başı şansını doğrudan belirle; toplamı %100'ü aşamaz. Bossların her biri en az 3 ekipman verir, renk oranları her ödül için geçerlidir. Yaşam Özü ayrı ve garantidir.`})]})]}),t.length<1?(0,Z.jsx)(`div`,{className:`loot-profile-empty`,children:`Ganimet profilleri yükleniyor…`}):(0,Z.jsxs)(Z.Fragment,{children:[(0,Z.jsx)(`div`,{className:`loot-area-tabs`,role:`group`,"aria-label":`Ganimet bölgesi`,children:ne.map(e=>{let n=t.find(t=>Qt(t.sourceKey)===e);return n?(0,Z.jsxs)(`button`,{type:`button`,"aria-pressed":F===e,className:F===e?`active`:``,disabled:r,onClick:()=>V(n.sourceKey),children:[e===`frozen`&&(0,Z.jsx)(S,{}),Xt[e]]},e):null})}),(0,Z.jsxs)(`div`,{className:`loot-profile-toolbar simple`,children:[(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:F===`boss`?`Boss`:`Canavar ve kademe`}),(0,Z.jsx)(`select`,{value:a,disabled:r,onChange:e=>V(e.target.value),children:ie.map(e=>(0,Z.jsx)(`option`,{value:e.sourceKey,children:e.profile.label},e.sourceKey))})]}),(0,Z.jsxs)(`div`,{className:`loot-profile-state`,children:[(0,Z.jsx)(`span`,{className:T?.customized?`custom`:``,children:T?.customized?`ÖZEL PROFİL`:`OYUN VARSAYILANI`}),(0,Z.jsxs)(`span`,{children:[`Canlı r`,T?.revision??0]}),A&&(0,Z.jsxs)(`span`,{className:`stale`,children:[`Taslak r`,l?.revision??0]})]})]}),s?(0,Z.jsxs)(`div`,{className:`loot-profile-editor`,children:[A&&(0,Z.jsxs)(`div`,{className:`loot-profile-conflict`,children:[(0,Z.jsxs)(`p`,{children:[(0,Z.jsx)(`strong`,{children:`Canlı profil bu taslaktan sonra değişti.`}),` Eski taslak yeni revizyonun üzerine sessizce yazılamaz. Taslağı korumak istiyorsan önce şablon yap; ardından canlı sürümü yükle.`]}),(0,Z.jsxs)(`button`,{type:`button`,disabled:r,onClick:ve,children:[(0,Z.jsx)(je,{}),` Canlı Sürümü Yükle / Taslağı Sil`]})]}),(0,Z.jsxs)(`section`,{className:`loot-direct-overview`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`small`,{children:M?`BOSS ÖDÜLÜ`:`KESİM BAŞINA EKİPMAN`}),(0,Z.jsxs)(`strong`,{children:[`%`,$(M?1e6:N)]}),(0,Z.jsx)(`p`,{children:M?`Her katkı sağlayan oyuncuya en az 3 ekipman. Aşağıdaki yüzdeler her bir ödülün rengini belirler.`:`Aşağıdaki dört rengin toplamı. Kalan olasılıkta ekipman düşmez; Yaşam Özü yine gelir.`})]}),(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`small`,{children:M?`ETKİNLİK`:`EKİPMAN DÜŞMEME`}),(0,Z.jsx)(`strong`,{children:M?`+%${e}`:`%${$(1e6-N)}`}),(0,Z.jsx)(`p`,{children:M?`Etkinlik ek ödül çekilişleri sağlar.`:`Normal canavar kesim başına en fazla bir ekipman verir. Her kesim bağımsızdır.`})]})]}),(0,Z.jsxs)(`section`,{className:`loot-direct-rates`,"aria-label":`Gerçek ekipman düşme oranları`,children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsx)(`strong`,{children:M?`Her boss ödülünün rengi`:`Her kesimde renk şansı`}),(0,Z.jsx)(`p`,{children:M?`Kırmızı, turuncu ve maviyi ayarla. Beyaz kalan payı otomatik tamamlar; toplam %100'dür.`:`Yüzdeleri doğrudan yaz. Örneğin turuncu %2 ise ortalama 100 kesimin 2'sinde turuncu ekipman çıkar. Toplam en fazla %100 olabilir.`})]}),(0,Z.jsx)(`div`,{className:`loot-direct-rate-grid`,children:j&&nn.slice().reverse().map(e=>{let t=j[e.main]+(e.accessory?j[e.accessory]:0);return(0,Z.jsxs)(`label`,{className:`loot-direct-rate rarity-${e.rarity}`,children:[(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`strong`,{children:e.label}),(0,Z.jsx)(`small`,{children:M?`Ödül başına`:`Kesim başına`})]}),(0,Z.jsxs)(`span`,{className:`loot-direct-rate-input`,children:[(0,Z.jsx)(tn,{fieldId:e.main,value:$(t),disabled:r||M&&e.rarity===`white`,invalid:m.includes(e.main),onValidityChange:L,onCommit:t=>de(e,t)}),(0,Z.jsx)(`b`,{children:`%`})]})]},e.rarity)})}),!M&&(0,Z.jsxs)(`p`,{className:`loot-direct-feedback`,children:[`Temel toplam `,(0,Z.jsxs)(`b`,{children:[`%`,$(N)]}),` · Etkinlikle `,(0,Z.jsxs)(`b`,{children:[`%`,$(ee)]}),` · Tılsım ve etkinlikle `,(0,Z.jsxs)(`b`,{children:[`%`,$(te)]}),`. Tılsım ve etkinlik renklerin birbirine oranını değiştirmez. Kuzey Ormanı seviye azaltımı ayrıca uygulanır.`]}),(M||s.key.startsWith(`ancient.`))&&(0,Z.jsx)(`p`,{className:`loot-direct-feedback`,children:`Mor eşya şansı “Mor Eşya · Kök Vadisi ve Bosslar” kartından ayrıca ayarlanır. Kök Vadisi’nin üç normal canavarı, Kadim Kökün Muhafızı ve Dünya Bossu için ayrı oranlar vardır.`}),(0,Z.jsx)(`p`,{className:`loot-direct-feedback`,children:`Tür payları mevcut profilden korunur. Kask yalnız ilgili özel ganimetlerde bulunur. Bossun üç garanti ödülü, Yaşam Özü ve bağımsız malzemeler değişmez. Oyuncu bilgi kartında etkin bonuslarla güncel gerçek oranları görür.`}),m.some(e=>!e.startsWith(`material-`))&&(0,Z.jsx)(`p`,{className:`loot-budget-error`,role:`alert`,children:`0 ile 100 arasında geçerli bir yüzde yaz; virgül kullanabilirsin.`}),N>1e6&&(0,Z.jsxs)(`p`,{className:`loot-budget-error`,role:`alert`,children:[`Renklerin toplamı %`,$(N),`. Kaydetmeden önce toplamı %100'e indir.`]})]}),(0,Z.jsxs)(`section`,{className:`loot-guaranteed-strip loot-essence-editor`,children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(p,{}),(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`small`,{children:`HER KESİMDE`}),(0,Z.jsx)(`strong`,{children:`Yaşam Özü %100 garanti`}),(0,Z.jsx)(`p`,{children:`Bu canavar veya bosstan düşecek miktarı belirle.`})]})]}),ae&&(0,Z.jsxs)(`div`,{className:`loot-essence-fields`,children:[(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`En az Öz`}),(0,Z.jsx)(tn,{amount:!0,fieldId:`essence-min`,value:ae.outcome.minAmount,disabled:r,invalid:m.includes(`essence-min`),onValidityChange:L,onCommit:e=>H(`minAmount`,e)})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`En çok Öz`}),(0,Z.jsx)(tn,{amount:!0,fieldId:`essence-max`,value:ae.outcome.maxAmount,disabled:r,invalid:m.includes(`essence-max`),onValidityChange:L,onCommit:e=>H(`maxAmount`,e)})]})]})]}),se&&(0,Z.jsxs)(`section`,{className:`loot-chance-table loot-material-table`,"aria-label":`Boss ve Sinsi Taş özel malzemeleri`,children:[(0,Z.jsxs)(`header`,{children:[(0,Z.jsxs)(`div`,{children:[(0,Z.jsx)(`strong`,{children:`İnci ve Sinsi Taş Tozu`}),(0,Z.jsx)(`small`,{children:`Yalnız seçili boss veya Sinsi Taş için geçerlidir. Etkinlik bonusu bu temel oranları ayrıca artırır.`})]}),(0,Z.jsx)(`span`,{children:`Kesim başı`})]}),pe.map(e=>{let t=Ce(s,e);return(0,Z.jsxs)(`div`,{className:`loot-material-row`,children:[(0,Z.jsxs)(`strong`,{children:[e===`pearl`?(0,Z.jsx)(p,{}):(0,Z.jsx)(y,{}),` `,e===`pearl`?`İnci`:`Sinsi Taş Tozu`,(0,Z.jsx)(`small`,{children:t.chancePpm===0?`Kapalı · düşmez`:`%${$(t.chancePpm)} · ${t.minAmount}–${t.maxAmount} adet`})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Düşme şansı (%)`}),(0,Z.jsx)(tn,{fieldId:`material-${e}-chance`,value:$(t.chancePpm),disabled:r,invalid:m.includes(`material-${e}-chance`),onValidityChange:L,onCommit:t=>W(e,{chancePpm:$t(t)})})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`En az adet`}),(0,Z.jsx)(tn,{amount:!0,fieldId:`material-${e}-min`,value:t.minAmount,disabled:r,invalid:m.includes(`material-${e}-min`),onValidityChange:L,onCommit:t=>W(e,{minAmount:t})})]}),(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`En çok adet`}),(0,Z.jsx)(tn,{amount:!0,fieldId:`material-${e}-max`,value:t.maxAmount,disabled:r,invalid:m.includes(`material-${e}-max`),onValidityChange:L,onCommit:t=>W(e,{maxAmount:t})})]})]},`${s.key}-${e}`)}),(0,Z.jsx)(`p`,{className:`loot-chance-note`,children:`%0: hiç düşmez · %100: garanti. Sabit miktar için iki adet alanına aynı sayıyı yaz. İnci ve toz birbirinden ve ekipmandan bağımsızdır; tılsım oranlarını değiştirmez. Normal canavarlardan düşmez. Ekipman şablonları bu ayarları değiştirmez.`})]}),F===`frozen`&&(0,Z.jsxs)(`p`,{className:`loot-zone-note`,children:[(0,Z.jsx)(S,{}),` Donmuş Çam varsayılanları Kuzey Ormanı’ndan %10 daha yüksektir.`]}),F===`boss`&&(0,Z.jsxs)(`p`,{className:`loot-zone-note`,children:[(0,Z.jsx)(w,{}),` Her boss ayrı kaydedilir. Katkı sağlayan her oyuncuya öz dışında 3 ekipman verilir. Ekipman oranları her çekilişte toplam %100’e ölçeklenir; tümü sıfırsa beyaz ekipman düşer.`]}),(0,Z.jsxs)(`details`,{className:`loot-tools-details`,children:[(0,Z.jsxs)(`summary`,{children:[(0,Z.jsx)(it,{}),` Oranları kaydet veya başka canavarlara uygula `,(0,Z.jsx)(`b`,{children:n.length})]}),(0,Z.jsxs)(`div`,{className:`loot-tools-body`,children:[(0,Z.jsxs)(`div`,{className:`loot-template-create`,children:[(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Yeni oran şablonunun adı`}),(0,Z.jsx)(`input`,{disabled:r,value:g,maxLength:80,placeholder:`Örn. Kuzey Ormanı oranları`,onChange:e=>_(e.target.value)})]}),(0,Z.jsxs)(`button`,{type:`button`,disabled:!s||!g.trim()||r||U.length>0,onClick:()=>void ye(),children:[(0,Z.jsx)(Q,{}),` Ekipman Oranlarını Kaydet`]})]}),n.length?(0,Z.jsxs)(`div`,{className:`loot-template-use`,children:[(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`span`,{children:`Kayıtlı oran şablonu`}),(0,Z.jsx)(`select`,{disabled:r,value:v,onChange:e=>b(e.target.value),children:n.map(e=>(0,Z.jsxs)(`option`,{value:e.id,children:[e.name,` · v`,e.revision]},e.id))})]}),(0,Z.jsxs)(`div`,{className:`loot-template-draft-actions`,children:[(0,Z.jsxs)(`button`,{type:`button`,disabled:r||!E,onClick:xe,children:[(0,Z.jsx)(it,{}),` Seçili Taslağa Yükle`]}),(0,Z.jsxs)(`button`,{type:`button`,className:`danger`,disabled:r||!E,onClick:()=>void we(),children:[(0,Z.jsx)(pt,{}),` Sil`]})]}),(0,Z.jsxs)(`details`,{className:`loot-template-targets`,children:[(0,Z.jsxs)(`summary`,{children:[`Canlı uygulanacak hedefleri seç `,(0,Z.jsx)(`b`,{children:x.length})]}),(0,Z.jsxs)(`div`,{className:`loot-target-shortcuts`,children:[(0,Z.jsx)(`button`,{type:`button`,disabled:r,onClick:()=>C(a?[a]:[]),children:`Yalnız seçili`}),ne.map(e=>(0,Z.jsx)(`button`,{type:`button`,disabled:r,onClick:()=>C(t.filter(t=>Qt(t.sourceKey)===e).map(e=>e.sourceKey)),children:Xt[e]},e)),(0,Z.jsx)(`button`,{type:`button`,disabled:r,onClick:()=>C(t.map(e=>e.sourceKey)),children:`Tümü`}),(0,Z.jsx)(`button`,{type:`button`,disabled:r,onClick:()=>C([]),children:`Temizle`})]}),(0,Z.jsx)(`div`,{className:`loot-target-grid`,children:t.map(e=>(0,Z.jsxs)(`label`,{children:[(0,Z.jsx)(`input`,{disabled:r,type:`checkbox`,checked:x.includes(e.sourceKey),onChange:t=>C(n=>t.target.checked?[...new Set([...n,e.sourceKey])]:n.filter(t=>t!==e.sourceKey))}),(0,Z.jsx)(`span`,{children:e.profile.label})]},e.sourceKey))}),(0,Z.jsxs)(`button`,{type:`button`,className:`admin-primary`,disabled:r||!E||!x.length,onClick:()=>void Se(),children:[(0,Z.jsx)(Q,{}),` Seçili Hedeflere Uygula (`,x.length,`)`]})]})]}):(0,Z.jsx)(`p`,{className:`loot-template-empty`,children:`Henüz kayıtlı oran şablonu yok.`})]})]}),(0,Z.jsxs)(`div`,{className:`loot-profile-actions`,children:[(d.length>0||U.length>0)&&(0,Z.jsx)(`p`,{className:`loot-profile-errors`,role:`alert`,children:Array.from(new Set([...d,...U])).join(` `)}),(0,Z.jsxs)(`button`,{type:`button`,className:`admin-primary`,disabled:r||A||!P||U.length>0,onClick:()=>void me(),children:[(0,Z.jsx)(Q,{}),` `,P?`Bu Profili Canlı Oyuna Kaydet`:`Kaydedilecek Değişiklik Yok`]}),(0,Z.jsxs)(`button`,{type:`button`,className:`loot-profile-reset`,disabled:r||A||!T?.customized,onClick:()=>void ge(),children:[(0,Z.jsx)(ut,{}),` Varsayılana Dön`]})]})]}):(0,Z.jsx)(`div`,{className:`loot-profile-empty`,children:`Seçili profil hazırlanıyor…`})]})]})}function pn({icon:e,label:t,value:n}){return(0,Z.jsxs)(`div`,{children:[e,(0,Z.jsxs)(`span`,{children:[(0,Z.jsx)(`small`,{children:t}),(0,Z.jsx)(`strong`,{children:n})]})]})}function mn({settings:e,busy:t,act:n}){return (0,Z.jsx)(colRedPearlEditor460.Editor,{settings:e,busy:t,act:n});}export{an as default};
const colRuneUI=createRuneUI(X,{model:colRuneModel});
const colArenaUI=createArenaUI(X);

const col425UI=createUpdate425UI(X,{});

const colStatusUI429=createStatusUI429(X,{model:colRuneModel});
const colLoadUI430=createLoadUI430(X,{model:colRuneModel});
const colBattlePassAdmin434=createBattlePassAdmin434(X);
const colGuildResetAdmin470=createGuildResetAdmin470(X);
// This import-free factory is embedded verbatim in both active admin bundles.
function createPlayerResetAdmin495(React){
 const h=React.createElement;
 function PlayerResetAdmin495({busy,act,playerId,playerName}){
  const [pending,setPending]=React.useState(false),[notice,setNotice]=React.useState(null);
  const requests=React.useRef(new Map()),inFlight=React.useRef(false),mounted=React.useRef(true),latest=React.useRef(null);
  latest.current={busy,act,playerId,playerName};
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  async function resetPlayer495(){
   const selected=latest.current;
   if(inFlight.current||selected.busy||!selected.playerId)return;
   const warning=selected.playerName+' tamamen sıfırlanacak. Çanta ve depo, tüm malzemeler ve para bakiyeleri, rütbe ödülleri ve bonusları, beceriler ve gelişimler silinecek. Yalnız başlangıç silahı verilecek. Lonca başkanıysa loncası, kasası ve şatosu kapanır; üyeyse yalnız üyeliği silinir. Hesabı ve giriş bilgileri korunur. Bu işlem geri alınamaz. Onaylıyor musun?';
   if(!globalThis.confirm(warning))return;
   inFlight.current=true;setPending(true);setNotice(null);
   try{
    let token=requests.current.get(selected.playerId);
    if(!token){token={requestId:globalThis.crypto.randomUUID(),playerId:selected.playerId};requests.current.set(selected.playerId,token);}
    const response=await selected.act({action:'reset_player',...token,confirmation:'OYUNCUYU TAMAMEN SIFIRLA'});
    const receipt=response?.playerReset495;
    if(receipt?.ok===true&&receipt.requestId===token.requestId&&receipt.playerId===token.playerId){
     requests.current.delete(selected.playerId);
     if(mounted.current)setNotice({playerId:token.playerId,error:false,text:receipt.replayed?'Önceki sıfırlama işlemi doğrulandı.':selected.playerName+' tamamen sıfırlandı.'});
    }else if(mounted.current)setNotice({playerId:token.playerId,error:true,text:'Sonuç doğrulanamadı. Tekrar denediğinde aynı işlem kontrol edilir. Yönetim bildirimini de kontrol et.'});
   }catch(error){if(mounted.current)setNotice({playerId:selected.playerId,error:true,text:error?.message||'Sonuç doğrulanamadı; aynı işlemi tekrar deneyebilirsin.'});}
   finally{inFlight.current=false;if(mounted.current)setPending(false);}
  }
  return h('section',{className:'admin-card danger-card','data-player-reset495':''},
   h('div',{className:'admin-card-title'},h('div',null,h('h2',null,'Seçili Oyuncuyu Tamamen Sıfırla'),h('p',null,'Çanta, depo, malzemeler, bakiyeler, rütbe ve gelişimler temizlenir. Yalnız başlangıç silahı kalır. Lonca başkanıysa loncası ve şatosu da kapanır; üyeyse üyelikten çıkar.'))),
   h('button',{type:'button',disabled:!!busy||pending||!playerId,onClick:resetPlayer495},pending?'Sıfırlanıyor…':'Oyuncuyu tamamen sıfırla'),
   notice?.playerId===playerId&&h('p',{role:notice.error?'alert':'status'},notice.text));
 }
 return PlayerResetAdmin495;
}

const colPlayerResetAdmin495=createPlayerResetAdmin495(X);

function createStoneBossStatus476(React){const h=React.createElement;return function StoneBossStatus476({data,busy,act}){const rows=data?.blackStoneBosses??[];return h('section',{className:'admin-card'},h('h2',null,'Kara Taş Muhafızı · Kanal durumu'),h('p',null,'Kara Bölge’de her kanalda bir boss bulunur. Can, saldırı ve ödülleri bu bölümden; eşya ve malzeme düşüşlerini aşağıdaki bağımsız ganimet profilinden ayarla.'),...rows.map(row=>h('div',{className:'settings-group-note',key:row.channel},h('strong',null,'Kanal '+row.channel+' · '+(row.hp>0?row.hp+' / '+row.max_hp+' can':'Yeniden doğuş bekleniyor')),h('div',{className:'admin-actions'},h('button',{type:'button',disabled:busy||row.hp>0||!data?.settings?.black_stone_boss_enabled,onClick:()=>void act({action:'spawn_black_stone_boss',channel:row.channel})},'Bossu getir'),h('button',{type:'button',disabled:busy||row.hp<=0,onClick:()=>void act({action:'remove_black_stone_boss',channel:row.channel},'Kanal '+row.channel+' Kara Taş Muhafızı kaldırılsın mı?')},'Bossu kaldır')))));};}
const colStoneBossStatus476=createStoneBossStatus476(X);


const col438LaunchModeUI=createLaunchModeUI438(X);

const colQuests438Admin=createQuestsAdmin438(X);

const colEventAdmin444=createEventIslandAdmin444(X,{Composer:F,sendGm:Lt});

const colSeasonalEditor453=colSeasonalEditorModule453.createSeasonalEditor453(X,{seasonalTheme:c,FESTIVAL_MAPS:b,SEASONAL_AREAS:D,areaWorld:ae,SEASONAL_ART:q});

function createSpecialistAdmin459({useState,useEffect,useRef,jsx,jsxs}){
 const groups=[{id:'arkanist',name:'Arkanist',color:'#ba8bdf',skills:[{id:'arkanist_burst',branch:'Öz Yıkıcısı',name:'Öz Patlaması',effect:'burst',multiplier:2.1,cooldownMs:18000},{id:'arkanist_heal',branch:'Yaşam Dokuyucusu',name:'Yaşam Dalgası',effect:'heal',healPercent:20,cooldownMs:24000}]},{id:'avci',name:'Avcı',color:'#e3bd72',skills:[{id:'avci_sharp',branch:'Keskin Nişancı',name:'Şafak Oku',effect:'burst',multiplier:2.2,cooldownMs:18000},{id:'avci_trap',branch:'İz Sürücü',name:'Kök Oku',effect:'root',multiplier:1.5,rootMs:1800,cooldownMs:20000}]},{id:'muhafiz',name:'Muhafız',color:'#8bc7df',skills:[{id:'muhafiz_tank',branch:'Çelik Muhafız',name:'Çelik İrade',effect:'guard',healPercent:12,guardPercent:20,guardMs:6000,cooldownMs:24000},{id:'muhafiz_strike',branch:'Hüküm Savaşçısı',name:'Hüküm Darbesi',effect:'burst',multiplier:2.2,cooldownMs:18000}]}];
 const all=groups.flatMap(g=>g.skills);
 const defaults=()=>Object.fromEntries(all.map(s=>[s.id,Object.fromEntries(relevant(s).map(k=>[k,s[k]]))]));
 const clone=v=>structuredClone(v),equal=(a,b)=>!!a&&!!b&&all.every(s=>relevant(s).every(k=>Number(a[s.id]?.[k])===Number(b[s.id]?.[k])));
 const fields={multiplier:['Saldırı çarpanı',.1,10,.1,1],healPercent:['İyileştirme (%)',0,30,1,1],guardPercent:['Hasar azaltma (%)',0,75,1,1],guardMs:['Koruma süresi (sn)',0,30,.1,1000],rootMs:['Hareketsiz bırakma (sn)',0,2,.1,1000],cooldownMs:['Bekleme süresi (sn)',1,120,.1,1000]};
 const relevant=s=>s.effect==='heal'?['healPercent','cooldownMs']:s.effect==='guard'?['healPercent','guardPercent','guardMs','cooldownMs']:s.effect==='root'?['multiplier','rootMs','cooldownMs']:['multiplier','cooldownMs'];
 const valid=skills=>all.every(s=>relevant(s).every(k=>{const n=Number(skills?.[s.id]?.[k]),f=fields[k];return Number.isFinite(n)&&n>=f[1]*f[4]&&n<=f[2]*f[4]&&(f[4]===1||Number.isInteger(n));}));
 function Admin({value,expectedEvents='',busy=false,act}){
  const [tab,setTab]=useState('arkanist'),[baseline,setBaseline]=useState(()=>clone(value)),[draft,setDraft]=useState(()=>clone(value)),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const latest=useRef({value,expectedEvents}),baselineRef=useRef(baseline),dirtyRef=useRef(false),savingRef=useRef(false),pendingRef=useRef(null),eventsRef=useRef(expectedEvents);
  latest.current={value,expectedEvents};baselineRef.current=baseline;const dirty=!equal(draft?.skills,baseline?.skills);dirtyRef.current=dirty;
  const conflict=value?.revision!==baseline?.revision,invalid=!valid(draft?.skills),group=groups.find(g=>g.id===tab)??groups[0];
  const accept=(incoming,events)=>{const next=clone(incoming);pendingRef.current=null;eventsRef.current=events;setBaseline(next);baselineRef.current=next;setDraft(clone(next));setMessage('Beceri ayarları kaydedildi.');};
  useEffect(()=>{
   if(!value)return;
   const pending=pendingRef.current;
   if(pending&&value.revision>pending.revision&&equal(value.skills,pending.skills)){accept(value,expectedEvents);return;}
   if(savingRef.current)return;
   if(dirtyRef.current){if(value.revision===baselineRef.current.revision)eventsRef.current=expectedEvents;return;}
   eventsRef.current=expectedEvents;setBaseline(clone(value));baselineRef.current=clone(value);setDraft(clone(value));
  },[value?.revision,expectedEvents]);
  const change=(id,key,n)=>{setMessage('');setDraft(current=>({...current,skills:{...current.skills,[id]:{...current.skills[id],[key]:n}}}));};
  const takeServer=()=>{const incoming=latest.current;pendingRef.current=null;eventsRef.current=incoming.expectedEvents;setBaseline(clone(incoming.value));baselineRef.current=clone(incoming.value);setDraft(clone(incoming.value));setMessage('Güncel sunucu ayarları alındı.');};
  async function save(){
   if(busy||savingRef.current||!dirty||conflict||invalid)return;
   const captured=clone(draft),revision=baselineRef.current.revision;captured.revision=revision;
   pendingRef.current={revision,skills:clone(captured.skills)};savingRef.current=true;setSaving(true);setMessage('');
   try{
    const result=await act({action:'save_specialist_skills459',config:captured,expectedEvents:eventsRef.current});
    const acknowledged=result?.specialistSkills459;
    if(acknowledged?.revision>revision&&equal(acknowledged.skills,captured.skills))accept(acknowledged,String(result.settings?.events_json??latest.current.expectedEvents));
    else if(pendingRef.current){pendingRef.current=null;setMessage('Kayıt doğrulanamadı. Taslağın korundu; canlı veriyi yenileyip tekrar dene.');}
   }catch(error){pendingRef.current=null;setMessage(error instanceof Error?error.message:'Kayıt başarısız. Taslağın korundu.');}
   finally{savingRef.current=false;setSaving(false);}
  }
  const locked=busy||saving;
  return jsxs('section',{className:'admin-card specialist-admin459',children:[
   jsxs('header',{className:'spec459-heading',children:[jsx('span',{className:'admin-kicker',children:'30. SEVİYE UZMANLIK'}),jsx('h2',{children:'Uzmanlık Becerileri'}),jsx('p',{children:'Her sınıfın iki uzmanlık becerisinin gücünü ve bekleme süresini ayarla. Değişiklikler Kaydet ile uygulanır.'})]}),
   jsx('div',{className:'spec459-tabs',role:'tablist','aria-label':'Karakter sınıfı',children:groups.map(g=>jsx('button',{type:'button',role:'tab',id:'spec459-tab-'+g.id,'aria-selected':tab===g.id,'aria-controls':'spec459-panel-'+g.id,className:tab===g.id?'selected':'',onClick:()=>setTab(g.id),children:g.name},g.id))}),
   jsx('div',{className:'spec459-skill-grid',role:'tabpanel',id:'spec459-panel-'+group.id,'aria-labelledby':'spec459-tab-'+group.id,children:group.skills.map(s=>jsxs('article',{className:'spec459-skill-card',style:{'--spec459-color':group.color},children:[jsxs('div',{className:'spec459-skill-title',children:[jsx('small',{children:s.branch}),jsx('h3',{children:s.name}),jsx('span',{children:s.effect==='guard'?'Koruma ve iyileştirme':s.effect==='heal'?'Takım iyileştirmesi':s.effect==='root'?'Saldırı ve kontrol':'Güçlü saldırı'})]}),jsx('div',{className:'spec459-fields',children:relevant(s).map(key=>{const f=fields[key];return jsxs('label',{children:[jsx('span',{children:f[0]}),jsx('input',{type:'number',inputMode:'decimal',min:f[1],max:f[2],step:f[3],value:Number(draft.skills[s.id][key])/f[4],disabled:locked,'aria-label':s.name+' · '+f[0],onChange:e=>change(s.id,key,f[4]===1000?Math.round(Number(e.target.value)*1000):Number(e.target.value))}),jsx('small',{children:key==='multiplier'?'0,1–10 kat':f[1]+'–'+f[2]+(f[4]===1000?' saniye':'%')})]},key)})})]},s.id))}),
   conflict&&jsx('p',{className:'spec459-conflict',role:'alert',children:'Sunucu ayarları başka bir işlemde değişti. Taslağın korundu. Kaydetmeden önce güncel sunucu ayarlarını al.'}),
   invalid&&jsx('p',{className:'spec459-conflict',role:'alert',children:'Değerleri gösterilen aralıklar içinde gir.'}),
   message&&jsx('p',{className:'spec459-message',role:'status',children:message}),
   jsxs('footer',{className:'spec459-actions',children:[jsx('button',{type:'button',disabled:locked,onClick:takeServer,children:'Sunucu ayarlarını al'}),jsx('button',{type:'button',disabled:locked,onClick:()=>{setDraft(current=>({...current,skills:defaults()}));setMessage('Varsayılan değerler taslağa alındı. Uygulamak için Kaydet.');},children:'Varsayılanları taslağa al'}),jsx('button',{type:'button',className:'admin-primary',disabled:locked||!dirty||conflict||invalid,onClick:()=>void save(),children:saving?'Kaydediliyor…':'Beceri ayarlarını kaydet'})]}),jsx('p',{className:'spec459-footnote',children:'Bekleme ve etki süreleri saniyedir. Büyü hızı mevcut bekleme süresi formülünü kullanır.'})
  ]});
 }
 return {Admin,defaults,equal,valid,groups};
}

const colSpecialistAdmin459=createSpecialistAdmin459({useState:X.useState,useEffect:X.useEffect,useRef:X.useRef,jsx:Z.jsx,jsxs:Z.jsxs});

const colRedPearlEditor460=(function createFishingEditor482({useState,useEffect,jsx,jsxs}){
 function Editor({settings,busy=false,act}){
  const raw=String(settings?.events_json??''),[draft,setDraft]=useState(null),[baseline,setBaseline]=useState(raw),[message,setMessage]=useState('');
  useEffect(()=>{if(draft===null)setBaseline(raw);},[raw,draft]);
  const value=draft??readFishingCatch482(raw),keys=['pearl','red_pearl','talisman','sokan','levrek','zargana'],labels={pearl:'Beyaz İnci',red_pearl:'Kırmızı İnci',talisman:'Tılsım Taşı',sokan:'Sokan Balığı',levrek:'Levrek',zargana:'Zargana'},total=keys.reduce((sum,key)=>sum+Math.round(value[key]*100),0)/100,conflict=draft!==null&&baseline!==raw;
  let error='';try{validateFishingCatch482(value);}catch(e){error=e.message;}
  const save=async()=>{if(busy||draft===null||error||conflict)return;const result=await act({action:'save_fishing_chances482',chances:validateFishingCatch482(value),expectedEvents:baseline});if(result){setDraft(null);setMessage('Yakalama oranları kaydedildi.');}};
  return jsxs('section',{className:'admin-card settings-card',children:[jsxs('div',{className:'admin-card-title',children:[jsxs('div',{children:[jsx('h2',{children:'Balıkçılık · Yakalama Şansları'}),jsx('p',{children:'Her başarılı avda bu listeden tek ödül çıkar. Oranların toplamı %100 olmalı. Yeni atılan oltalarda geçerlidir.'})]})]}),jsx('div',{className:'settings-groups',children:jsxs('fieldset',{children:[jsx('legend',{children:'Ödül oranları'}),...keys.map(key=>jsxs('label',{children:[jsx('span',{children:labels[key]+' (%)'}),jsx('input',{type:'number',min:0,max:100,step:0.01,inputMode:'decimal',disabled:busy,value:value[key],onChange:e=>{if(draft===null)setBaseline(raw);setDraft({...value,[key]:Number(e.target.value)});setMessage('');}})]},key)),jsx('p',{'aria-live':'polite',children:'Toplam: %'+(Number.isFinite(total)?total.toFixed(2):'—')+' · Toplam %100 olmalı.'}),error&&jsx('p',{role:'alert',children:error}),conflict&&jsxs('div',{children:[jsx('p',{role:'alert',children:'Ayarlar değişti. Güncel oranları yükleyip tekrar düzenle.'}),jsx('button',{type:'button',disabled:busy,onClick:()=>{setDraft(null);setBaseline(raw);setMessage('');},children:'Güncel Oranları Yükle'})]}),jsx('button',{type:'button',className:'settings-group-save',disabled:busy||draft===null||!!error||conflict,onClick:()=>void save(),children:'Yakalama Oranlarını Kaydet'}),message&&jsx('p',{role:'status',children:message})]})})]});
 }
 return {Editor};
})({useState:X.useState,useEffect:X.useEffect,jsx:Z.jsx,jsxs:Z.jsxs});

// Admin-only presentation. Reward identifiers and drop rules stay unchanged.
function dungeonLootLabel460(item, option = false) {
 const color = {blue:'Mavi eşya',red:'Kırmızı eşya',orange:'Sarı eşya'}[item?.rarity];
 if (item?.type !== 'gear' || !color) return option ? [item?.group,item?.name].filter(Boolean).join(' · ') : item?.name;
 const role = {muhafiz:'Muhafız',avci:'Avcı',arkanist:'Arkanist'}[item.role] ?? '';
 const kind = {weapon:'silahı',armor:'zırhı',helmet:'kaskı',shoes:'çizmesi',necklace:'kolyesi'}[item.kind] ?? item.kind ?? '';
 const context = [role,kind].filter(Boolean).join(' ');
 return color + (context ? ' · ' + context : '') + (item.family === 'sinsi' ? ' · Sinsi' : '');
}
function dungeonLootSearchText460(item) {
 return String(item?.name ?? '') + ' ' + String(dungeonLootLabel460(item) ?? '');
}


const colSpecializationReset463Admin=(function resetAdminFactory463(React){
 const h=React.createElement;
 return function Reset({player,busy,act}){
  const[working,setWorking]=React.useState(false),[message,setMessage]=React.useState(''),gate=React.useRef(false),pending=React.useRef(null);
  const labels={arkanist_burst:'Öz Yıkıcısı',arkanist_heal:'Yaşam Dokuyucusu',avci_sharp:'Keskin Nişancı',avci_trap:'İz Sürücü',muhafiz_tank:'Çelik Muhafız',muhafiz_strike:'Hüküm Savaşçısı'};
  React.useEffect(()=>{setMessage('');pending.current=null;},[player?.id]);
  const reset=async()=>{if(gate.current||busy||!player?.specialization)return;gate.current=true;setWorking(true);setMessage('');if(pending.current?.playerId!==player.id)pending.current={playerId:player.id,requestId:crypto.randomUUID()};try{const result=await act({action:'reset_specialization463',...pending.current});if(result){pending.current=null;setMessage(player.name+': uzmanlık sıfırlandı. Beceri geliştirmeleri korundu.');}}catch(error){setMessage(error instanceof Error?error.message:'Uzmanlık sıfırlanamadı.');}finally{gate.current=false;setWorking(false);}};
  return h('section',{className:'admin-card specialization463-admin'},h('h2',null,'Oyuncunun Uzmanlığını Sıfırla'),h('p',null,'Seçili oyuncunun uzmanlığını parşömen tüketmeden sıfırlar. Beceri seviyesi ve bekleme süresi korunur; yeni yolunu seçebilir.'),h('p',null,h('strong',null,player?.name??'Önce oyuncu seç'),player?.specialization?' · '+(labels[player.specialization]??'Uzmanlık seçilmiş'):' · Uzmanlık seçilmemiş'),h('button',{type:'button',className:'admin-primary',disabled:busy||working||!player?.specialization,onClick:()=>void reset()},working?'İşleniyor…':'Uzmanlığı Sıfırla'),message?h('p',{role:'status'},message):null);
 };
})(X);

const colBrokenCore464Admin=(function createBrokenCore464Admin(React){
 const h=React.createElement,defaults={enabled:false,minMinutes:15,maxMinutes:25,durationSec:20,xp:150,essence:10};
 const same=(a,b)=>Object.keys(defaults).every(k=>a?.[k]===b?.[k]);
 function Settings({value,busy,act}){
  const[form,setForm]=React.useState(()=>({...defaults,...value?.config})),[dirty,setDirty]=React.useState(false),[working,setWorking]=React.useState(false),[message,setMessage]=React.useState('');
  const gate=React.useRef(false),revision=React.useRef(value?.revision??0),pending=React.useRef(null),latest=React.useRef(value);latest.current=value;
  React.useEffect(()=>{if(value&&!dirty&&!gate.current){setForm({...defaults,...value.config});revision.current=value.revision;}},[value?.revision,dirty]);
  const edit=(key,v)=>{setForm(old=>({...old,[key]:v}));setDirty(true);pending.current=null;setMessage('');};
  const save=async()=>{if(gate.current||busy||!value)return;gate.current=true;setWorking(true);setMessage('');pending.current??={action:'save_broken_core464',expectedRevision:revision.current,config:{...form},requestId:crypto.randomUUID()};try{const result=await act(pending.current),confirmed=result?.brokenCore464;if(confirmed&&confirmed.revision>revision.current&&same(confirmed.config,pending.current.config)){setForm({...confirmed.config});revision.current=confirmed.revision;setDirty(false);pending.current=null;setMessage('Ayarlar kaydedildi.');}else setMessage('Kayıt doğrulanamadı. Taslağın korundu; canlı veriyi yenile.');}catch(error){setMessage(error instanceof Error?error.message:'Kaydedilemedi. Taslağın korundu.');}finally{gate.current=false;setWorking(false);}};
  const field=(label,key,min,max,suffix)=>h('label',{className:'broken-core464-field'},h('span',null,label),h('span',{className:'broken-core464-number'},h('input',{type:'number',min,max,step:1,value:Number.isNaN(form[key])?'':form[key],disabled:working,onChange:e=>edit(key,e.target.value===''?NaN:Number(e.target.value))}),h('small',null,suffix)));
  const valid=Number.isInteger(form.minMinutes)&&form.minMinutes>=1&&form.minMinutes<=180&&Number.isInteger(form.maxMinutes)&&form.maxMinutes>=form.minMinutes&&form.maxMinutes<=180&&Number.isInteger(form.durationSec)&&form.durationSec>=10&&form.durationSec<=60&&Number.isInteger(form.xp)&&form.xp>=0&&form.xp<=1000000&&Number.isInteger(form.essence)&&form.essence>=0&&form.essence<=100000;
  return h('section',{className:'admin-card broken-core464-admin'},h('h2',null,'Kırık Yaşam Çekirdeği'),h('p',null,'Normal av sırasında beliren tek dokunuşluk parça bulmacası. Doğru seçimde tecrübe ve yaşam özü verir.'),h('label',{className:'broken-core464-enable'},h('input',{type:'checkbox',checked:form.enabled,disabled:working,onChange:e=>edit('enabled',e.target.checked)}),h('strong',null,form.enabled?'Oyunculara açık':'Kapalı')),h('p',{className:'broken-core464-note'},'Her oyuncuya son 60 dakika içinde en fazla 3 kez gösterilir. Görmezden gelinen bulmacalar da sınıra dahildir. Oto Av, güvenli alanlar, arena ve zindanlarda çıkmaz.'),h('div',{className:'broken-core464-fields'},field('En erken','minMinutes',1,180,'dakika'),field('En geç','maxMinutes',1,180,'dakika'),field('Yanıtlama süresi','durationSec',10,60,'saniye'),field('Tecrübe ödülü','xp',0,1000000,'TP'),field('Yaşam özü ödülü','essence',0,100000,'Öz')),h('p',{className:'broken-core464-note'},'Aralık, oyuncunun sunucuda doğrulanan aktif av süresine göre rastgele seçilir. Kapatmak açık normal bulmacaları da iptal eder. GM denemesi kapalıyken kullanılabilir.'),h('div',{className:'broken-core464-admin-actions'},h('button',{type:'button',className:'admin-primary',disabled:busy||working||!value||!valid,onClick:()=>void save()},working?'Kaydediliyor…':'Kaydet'),h('button',{type:'button',disabled:working||!dirty,onClick:()=>{setForm({...defaults,...latest.current?.config});revision.current=latest.current?.revision??0;pending.current=null;setDirty(false);setMessage('');}},'Değişiklikleri bırak')),message?h('p',{role:'status'},message):null);
 }
 function Player({player,busy,act}){
  const[working,setWorking]=React.useState(false),[message,setMessage]=React.useState('');const gate=React.useRef(false),pending=React.useRef(null),latestId=React.useRef(player?.id);latestId.current=player?.id;let openPuzzle=null;try{openPuzzle=JSON.parse(player?.broken_core464??'');}catch{}
  React.useEffect(()=>{pending.current=null;setMessage('');},[player?.id]);
  const run=async action=>{if(gate.current||busy||!player)return;const playerId=player.id;if(action==='revoke_broken_core464'&&!openPuzzle?.id)return;gate.current=true;setWorking(true);setMessage('');if(pending.current?.playerId!==playerId||pending.current.action!==action||action==='revoke_broken_core464'&&pending.current.puzzleId!==openPuzzle.id)pending.current={action,playerId,...(action==='revoke_broken_core464'?{puzzleId:openPuzzle.id}:{}),requestId:crypto.randomUUID()};try{const result=await act(pending.current);if(result&&latestId.current===playerId){pending.current=null;setMessage(result.message??(action==='send_broken_core464'?'Deneme gönderildi. Oyuncu bulmacayı oyunda görecek.':'Açık bulmaca geri alındı. Kazanılmış ödüller korunur.'));}}catch(error){if(latestId.current===playerId)setMessage(error instanceof Error?error.message:'İşlem tamamlanamadı.');}finally{gate.current=false;setWorking(false);}};
  return h('section',{className:'admin-card broken-core464-admin'},h('h2',null,'Oyuncuya Çekirdek Bulmacası Gönder'),h('p',null,h('strong',null,player?.name??'Önce oyuncu seç'), ' · Test gönderimi sistem kapalıyken de çalışır ve saatlik hakkı tüketmez.'),h('p',{className:'broken-core464-note'},'Doğru cevap ayarladığın gerçek TP ve özü bir kez verir. Geri Al yalnız açık bulmacayı kapatır; kazanılmış ödülü geri almaz.'),h('div',{className:'broken-core464-admin-actions'},h('button',{type:'button',className:'admin-primary',disabled:busy||working||!player,onClick:()=>void run('send_broken_core464')},working?'İşleniyor…':'Test Gönder'),h('button',{type:'button',disabled:busy||working||!player||!openPuzzle?.id,onClick:()=>void run('revoke_broken_core464')},'Geri Al')),message?h('p',{role:'status'},message):null);
 }
 return {Settings,Player};
})(X);

const colLoadLabAdmin477=createLoadLabAdmin477(X);

function validateWheelChances483(value,rewards){
 const keys=rewards.map(r=>r.id);
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))throw Error('Çarktaki tüm ödüllerin oranlarını gir.');
 const next={};let total=0;
 for(const key of keys){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>100||Math.abs(n*100-Math.round(n*100))>0.000001)throw Error('Çark oranları %0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=n;total+=Math.round(n*100);}
 if(total!==10000)throw Error('Çark oranlarının toplamı %100 olmalı.');
 return next;
}

function createAdminContent483(React,{validateWheel}){
 const h=React.createElement;
 function Wheel({value,busy,act}){
  const [draft,setDraft]=React.useState(null),[revision,setRevision]=React.useState(value.revision),[message,setMessage]=React.useState(''),[saving,setSaving]=React.useState(false),lock=React.useRef(false);
  React.useEffect(()=>{if(draft===null)setRevision(value.revision);},[value.revision,draft]);
  const chances=draft??value.chances,conflict=draft!==null&&revision!==value.revision,total=Object.values(chances).reduce((n,v)=>n+Math.round(v*100),0)/100;let error='';
  try{validateWheel(chances,value.rewards);}catch(e){error=e.message;}
  const reload=()=>{setDraft(null);setRevision(value.revision);setMessage('');};
  const save=async()=>{if(busy||lock.current||draft===null||conflict||error)return;lock.current=true;setSaving(true);setMessage('');try{const result=await act({action:'save_wheel_chances483',chances,revision});if(result?.wheel483){setDraft(null);setRevision(result.wheel483.revision);setMessage('Çark oranları kaydedildi.');}else setMessage('Kaydedilemedi. Yönetim bildirimini kontrol et.');}catch(e){setMessage(e.message||'Çark oranları kaydedilemedi.');}finally{lock.current=false;setSaving(false);}};
  return h('section',{className:'admin-card settings-card wheel-admin483'},h('h2',null,'Çark · Ödül Oranları'),h('p',null,'Her dönüşte tek ödül verilir. Toplam %100 olmalı; %0 olan ödül çıkmaz. Kaydettiğin oranlar sonraki dönüşlerde geçerlidir. Dönüş bedeli 15 ÇP olarak kalır.'),h('div',{className:'settings-groups'},h('fieldset',null,h('legend',null,'Çekirdek Çarkı'),...value.rewards.map(r=>h('label',{key:r.id},h('span',null,r.name+' (%)'),h('input',{type:'number',min:0,max:100,step:0.01,inputMode:'decimal',disabled:busy||saving,value:chances[r.id],onChange:e=>{if(draft===null)setRevision(value.revision);setDraft({...chances,[r.id]:Number(e.target.value)});setMessage('');}}))),h('p',{'aria-live':'polite'},'Toplam: %'+(Number.isFinite(total)?total.toFixed(2):'—')),error&&h('p',{role:'alert'},error),conflict&&h('p',{role:'alert'},'Oranlar başka oturumda değişti. Güncel oranları yükleyip tekrar düzenle.'),h('div',{className:'admin-actions'},h('button',{type:'button',disabled:busy||saving||draft===null||conflict||!!error,onClick:()=>void save()},saving?'Kaydediliyor…':'Çark oranlarını kaydet'),h('button',{type:'button',disabled:busy||saving||draft===null,onClick:reload},'Güncel oranları yükle')),message&&h('p',{role:'status'},message))));
 }
 function RuneV2({value,busy,act}){
  const [draft,setDraft]=React.useState(()=>structuredClone(value.config)),[revision,setRevision]=React.useState(value.revision),[tab,setTab]=React.useState('tide'),[message,setMessage]=React.useState(''),[saving,setSaving]=React.useState(false),dirty=React.useRef(false),lock=React.useRef(false);
  React.useEffect(()=>{if(!dirty.current){setDraft(structuredClone(value.config));setRevision(value.revision);}},[value.revision]);
  const conflict=revision!==value.revision,disabled=busy||saving,m=draft.monsters[tab],bossReward=Object.hasOwn(draft.monsters.boss??{},'topDamageGems')?draft.monsters.boss.topDamageGems:250,rewardError=!Number.isSafeInteger(bossReward)||bossReward<0||bossReward>1000000?'En çok hasar ödülü 0–1.000.000 arasında tam sayı olmalı.':'';
  const bossSkill484=draft.monsters.boss??{},waveDamage484=Object.hasOwn(bossSkill484,'waveDamage')?bossSkill484.waveDamage:20,waveCooldown484=Object.hasOwn(bossSkill484,'waveCooldownSeconds')?bossSkill484.waveCooldownSeconds:12,skillError484=!Number.isSafeInteger(waveDamage484)||waveDamage484<0||waveDamage484>1000000?'Karanlık Rün Dalgası hasarı 0–1.000.000 arasında tam sayı olmalı.':!Number.isSafeInteger(waveCooldown484)||waveCooldown484<3||waveCooldown484>86400?'Karanlık Rün Dalgası bekleme süresi 3–86.400 saniye arasında tam sayı olmalı.':'';
  const set=fn=>{dirty.current=true;setDraft(previous=>{const next=structuredClone(previous);fn(next);return next;});setMessage('Kaydedilmemiş değişiklikler');};
  const number=(label,n,change,min,max,step=1)=>h('label',{className:'rune-field'},h('span',null,label),h('input',{type:'number',min,max,step,value:n,disabled,onChange:e=>change(Number(e.target.value))}));
  const save=async()=>{if(disabled||lock.current||conflict||rewardError||skillError484||!dirty.current)return;lock.current=true;setSaving(true);try{const result=await act({action:'save_runes_v2',config:draft,revision});if(result?.runeV2){dirty.current=false;setDraft(structuredClone(result.runeV2.config));setRevision(result.runeV2.revision);setMessage('Karanlık Rün Sahili ayarları kaydedildi.');}else setMessage('Kaydedilemedi. Yönetim bildirimini kontrol et.');}catch(e){setMessage(e.message||'Ayarlar kaydedilemedi.');}finally{lock.current=false;setSaving(false);}};
  const labels=value.lootLabels??{};
  return h('section',{className:'rune-admin'},h('header',null,h('h2',null,'Karanlık Rün Sahili'),h('p',null,'Karanlık sahilin canavarları ve bossu bu bölümden bağımsız yönetilir. Asıl Rün Sahili ayarları değişmez. Bu haritada herkese karşı PvP ve alan saldırıları açıktır. Her ölümde mücevherlerin %5’i kaybedilir; yeniden doğuş Pazar Köyü’ndedir.')),h('div',{className:'rune-admin-general'},h('label',null,h('input',{type:'checkbox',checked:draft.enabled,disabled,onChange:e=>set(d=>{d.enabled=e.target.checked;})}),' Haritaya giriş açık')),h('nav',{className:'rune-admin-tabs'},...Object.entries(draft.monsters).map(([key,monster])=>h('button',{key,type:'button','aria-pressed':tab===key,onClick:()=>setTab(key)},(key==='boss'?'BOSS · ':'')+monster.name))),h('label',{className:'rune-field'},h('span',null,'Canavar adı'),h('input',{value:m.name,maxLength:60,disabled,onChange:e=>set(d=>{d.monsters[tab].name=e.target.value;})})),h('div',{className:'rune-admin-stats'},number('Can',m.hp,v=>set(d=>{d.monsters[tab].hp=v;}),1,10000000),number('Hasar',m.damage,v=>set(d=>{d.monsters[tab].damage=v;}),0,1000000),number('Tecrübe',m.xp,v=>set(d=>{d.monsters[tab].xp=v;}),0,1000000),number('Yeniden doğma (sn)',m.respawnSeconds,v=>set(d=>{d.monsters[tab].respawnSeconds=v;}),1,86400),tab==='boss'&&number('En çok hasar ödülü (mücevher)',bossReward,v=>set(d=>{d.monsters.boss.topDamageGems=v;}),0,1000000)),tab==='boss'&&h('p',null,'Boss öldürüldüğünde toplamda en çok hasarı veren oyuncuya bu ek ödül her doğuşta yalnız bir kez verilir. 0, bu ek ödülü kapatır.'),tab==='boss'&&h('fieldset',{className:'rune-boss-skill484',title:'Bekleme süresi, becerinin iki kullanımı arasındaki süredir. Hasarı 0 yaparsan bu beceri kapanır.'},h('legend',null,'Boss Becerisi · Karanlık Rün Dalgası'),h('p',null,'Bossun çevresinde beliren mor rün çemberi kısa bir uyarıdan sonra patlar. Çemberden çıkarak kaçınabilirsin.'),number('Beceri hasarı',waveDamage484,v=>set(d=>{d.monsters.boss.waveDamage=v;}),0,1000000),number('Beceri bekleme süresi (sn)',waveCooldown484,v=>set(d=>{d.monsters.boss.waveCooldownSeconds=v;}),3,86400),h('p',null,'Bekleme süresi, becerinin iki kullanımı arasındaki süredir. Varsayılan: 12 saniye ve 20 hasar. Kaydedilen ayarlar sonraki kullanımlarda geçerlidir. Hasarı 0 yaparsan bu beceri kapanır ve hazırlanmakta olan dalga da durur.')),skillError484&&h('p',{role:'alert'},skillError484),rewardError&&h('p',{role:'alert'},rewardError),h('p',null,'Can değişikliği sonraki doğuşta uygulanır. Her ganimetin şansı bağımsızdır; toplamın %100 olması gerekmez. Mor dışındaki ganimetlerde %0 kapalı, %100 kesin düşüştür. Mor ekipmanda temel oranın yarısı uygulanır. Öz şansı ve miktarı da aşağıdan ayarlanır. Kazanılmış ödüller sonraki ayar değişikliğinden etkilenmez.'),h('div',{className:'rune-loot-editor'},...Object.entries(m.loot).map(([kind,rule])=>h('fieldset',{key:kind},h('legend',null,labels[kind]??kind),number(kind==='purple'?'Temel düşme (%)':'Düşme (%)',rule.chance,v=>set(d=>{d.monsters[tab].loot[kind].chance=v;}),0,100,.01),kind==='purple'&&h('small',null,'Yeni kesimlerde mor şansı: %'+(rule.chance*.5).toLocaleString('tr-TR',{maximumFractionDigits:10})+' (temel oranın yarısı; seviye dengesi ayrıca uygulanır).'),number('En az',rule.min,v=>set(d=>{d.monsters[tab].loot[kind].min=v;}),1,['white','blue','orange','red','purple','emerald'].includes(kind)?3:100),number('En çok',rule.max,v=>set(d=>{d.monsters[tab].loot[kind].max=v;}),1,['white','blue','orange','red','purple','emerald'].includes(kind)?3:100)))),conflict&&h('p',{role:'alert'},'Ayarlar başka oturumda değişti. Güncel ayarları yükle.'),h('div',{className:'rune-admin-save'},h('span',{role:'status'},message),h('button',{type:'button',disabled:disabled||conflict||!!rewardError||!!skillError484||!dirty.current,onClick:()=>void save()},saving?'Kaydediliyor…':'Karanlık Rün Sahili ayarlarını kaydet'),h('button',{type:'button',disabled,onClick:()=>{dirty.current=false;setDraft(structuredClone(value.config));setRevision(value.revision);setMessage('');}},'Güncel ayarları yükle')));
 }
 return {Wheel,RuneV2};
}
const colAdminContent483=createAdminContent483(X,{validateWheel:validateWheelChances483});

function createBalanceAdmin487(React,maps){
 const h=React.createElement;
 return function BalanceAdmin487({value,expectedEvents,busy,act}){
  const [draft,setDraft]=React.useState(value),[expected,setExpected]=React.useState(expectedEvents),[message,setMessage]=React.useState(''),[saving,setSaving]=React.useState(false),dirty=React.useRef(false),lock=React.useRef(false);
  React.useEffect(()=>{if(!dirty.current){setDraft(value);setExpected(expectedEvents);}},[value,expectedEvents]);
  if(!draft)return null;
  const conflict=dirty.current&&expected!==expectedEvents;
  const valid=Object.values(draft.rules).every(r=>Number.isInteger(r.fromLevel)&&r.fromLevel>=1&&r.fromLevel<=65&&['xpPercent','itemPercent'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=100));
  const set=(area,key,value)=>{dirty.current=true;setDraft(old=>({...old,rules:{...old.rules,[area]:{...old.rules[area],[key]:value}}}));};
  const save=async()=>{if(lock.current||busy||!valid||conflict||!dirty.current)return;lock.current=true;setSaving(true);setMessage('');try{const result=await act({action:'save_level_balance487',config:draft,expectedEvents:expected});if(result?.highLevelBalance487){dirty.current=false;setDraft(result.highLevelBalance487);setExpected(result.settings.events_json);setMessage('Seviye dengesi kaydedildi.');}else setMessage('Kayıt doğrulanamadı. Taslak korundu.');}catch(e){setMessage(e instanceof Error?e.message:'Ayarlar kaydedilemedi.');}finally{lock.current=false;setSaving(false);}};
  const number=(area,key,label,min,max)=>h('label',{style:{display:'grid',gap:5,minWidth:0}},h('span',null,label),h('input',{type:'number',min,max,step:1,value:draft.rules[area][key],disabled:busy||saving,onChange:e=>set(area,key,e.target.value===''?'':Number(e.target.value)),style:{width:'100%',minWidth:0}}));
  return h('section',{className:'admin-card',style:{minWidth:0}},
   h('h2',null,'Haritalar · Yüksek seviye EXP ve eşya dengesi'),
   h('p',null,'Seçtiğin seviyeye ulaşan oyuncu için normal EXP ve rastgele eşya şansının ne kadarı kalsın? %100 değişmez, %50 yarısı, %0 kapalı. Grup üyeleri kendi seviyelerine göre hesaplanır.'),
   h('label',{style:{display:'flex',gap:10,alignItems:'center',fontWeight:700}},h('input',{type:'checkbox',checked:draft.enabled,disabled:busy||saving,onChange:e=>{dirty.current=true;setDraft(old=>({...old,enabled:e.target.checked}));}}),'Yeni seviye dengesi ',draft.enabled?'AÇIK':'KAPALI'),
   h('p',null,draft.enabled?'Aşağıdaki kurallar eski av haritası azaltmasının yerine geçer; üst üste uygulanmaz.':'Yeni kurallar uygulanmaz. Önceki av haritası eşya azaltması aşağıdaki eski ayarlarıyla çalışmaya devam eder.'),
   h('p',{style:{color:'#aee2be'}},'Artı basma malzemeleri ve Yaşam Özü kendi oranlarında kalır. Sabit/garanti boss ve zindan ödülleri, sıralama mücevherleri, altın, mücevher, görev, market ve Savaş Bileti teslimleri değişmez. Canavardan kazanılan EXP, 65. seviyede rütbe ve bilet ilerlemesini de etkiler.'),
   h('div',{style:{display:'grid',gap:12}},maps.map(([area,label])=>h('fieldset',{key:area,style:{margin:0,minWidth:0,border:'1px solid #3c5149',borderRadius:8,padding:12}},h('legend',null,label),h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}},number(area,'fromLevel','Bu seviye ve üstü',1,65),number(area,'xpPercent','Kalan EXP (%)',0,100),number(area,'itemPercent','Kalan eşya şansı (%)',0,100))))),
   conflict&&h('p',{role:'alert'},'Ayarlar başka bir oturumda değişti. Güncel ayarları yükle.'),
   h('p',{role:'status'},message),h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},h('button',{type:'button',className:'admin-primary',disabled:busy||saving||!valid||conflict||!dirty.current,onClick:()=>void save()},saving?'Kaydediliyor…':'Seviye dengesini kaydet'),h('button',{type:'button',disabled:busy||saving,onClick:()=>{dirty.current=false;setDraft(value);setExpected(expectedEvents);setMessage('');}},'Güncel ayarları yükle')));
 };
}

const colBalanceAdmin487=createBalanceAdmin487(X,[["forest","Kuzey Ormanı"],["frozen","Donmuş Çam Geçidi"],["black","Kara Bölge"],["ancient","Kadim Kök Vadisi"],["sinsi","Sinsi Taş Vadisi"],["sanctum","Dünya Bossu"],["dragon","Ejderha"],["afk","Oto Av Adası"],["rune","Kadim Rün Sahili"],["rune_v2","Karanlık Rün Sahili"],["event","Etkinlik Adası"],["dungeon","Çekirdeğin Kalbi"],["solo","Solo Zindan"]]);

function colBossBounds494(key){return key==='black_stone_boss_damage_scale'?{min:.48,max:2400,title:'Hasar sınırı: 50 kat (2400)'}:['boss_damage_scale','frozen_boss_damage_scale','ancient_boss_damage_scale','frozen_water_damage_scale'].includes(key)?{min:key==='boss_damage_scale'?.05:.01,max:50,title:'Hasar çarpanı: en fazla 50'}:{};}

const {normalizeEventQueue499:colEventNormalize499,eventOccurrence499:colEventCurrent499,eventDisplay499:colEventDisplay499}=(()=>{// Bounded, sorted schedules in the existing settings snapshot. Resolving time
// never writes settings, polls a database, or mutates frozen reward snapshots.
const KINDS=new Set(['loot','xp','essence','chest','moonlight','fishing','halloween']);
const CHANCE=new Set(['chest','moonlight','fishing','halloween']);
const EVENT_QUEUE_LIMIT499=32;
function validRow499(kind,row){
 if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.enabled!=='boolean'||!Number.isSafeInteger(row.start)||!Number.isSafeInteger(row.end)||row.start<=0||row.end<=row.start||row.end>4102444800||!Number.isFinite(row.percent)||row.percent<0||row.percent>(CHANCE.has(kind)?100:500)||typeof row.runId!=='string'||row.runId.length<1||row.runId.length>80)throw Error('Etkinlik takvimi: oranı ve başlangıç/bitiş saatini kontrol et.');
 return {enabled:row.enabled,start:row.start,end:row.end,percent:row.percent,runId:row.runId};
}
function normalizeEventQueue499(kind,value,primary){
 if(!KINDS.has(kind)||value!==undefined&&!Array.isArray(value))throw Error('Etkinlik takvimi geçersiz.');
 if((value?.length??0)>EVENT_QUEUE_LIMIT499)throw Error('Her etkinlik türü için en fazla 32 tarih planlanabilir.');
 const queue=(value??[]).map(row=>validRow499(kind,row)).filter(row=>row.enabled).sort((a,b)=>a.start-b.start||a.end-b.end||a.runId.localeCompare(b.runId));
 const ids=new Set();for(const row of queue){if(ids.has(row.runId)||row.runId===primary?.runId)throw Error('Aynı etkinlik kaydı iki kez eklenemez.');ids.add(row.runId);}
 const enabled=queue.filter(row=>row.enabled);if(primary?.enabled)enabled.push(primary);enabled.sort((a,b)=>a.start-b.start);
 for(let i=1;i<enabled.length;i++)if(enabled[i].start<enabled[i-1].end)throw Error('Aynı tür etkinliklerin saatleri çakışamaz. Başka bir saat seç.');
 return queue;
}
function eventOccurrence499(event,now=Date.now()/1000){
 if(event?.enabled&&now>=event.start&&now<event.end)return event;
 const queue=event?.schedule499;if(!Array.isArray(queue)||queue.length===0)return null;
 // Validated queues are sorted and nonoverlapping. Binary search avoids a scan
 // on every combat/loot operation, including queues with many future rows.
 let lo=0,hi=queue.length-1,at=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(queue[mid].start<=now){at=mid;lo=mid+1;}else hi=mid-1;}
 const row=queue[at];return row?.enabled&&now<row.end?row:null;
}
function eventDisplay499(event,now=Date.now()/1000){
 const current=eventOccurrence499(event,now);if(current)return current;
 let next=event?.enabled&&event.start>now?event:null;
 for(const row of event?.schedule499??[])if(row.enabled&&row.start>now&&(!next||row.start<next.start))next=row;
 return next??event;
}
function appendEvent499(config,kind,input,now,runId){
 if(!KINDS.has(kind)||!config?.events?.[kind])throw Error('Etkinlik türü geçersiz.');
 const row=validRow499(kind,{...input,enabled:true,runId});
 if(row.end<=now)throw Error('Bitiş tarihi geçmişte olamaz. Yeni bir bitiş seç.');
 const event=config.events[kind],kept=(event.schedule499??[]).filter(old=>old.enabled&&old.end>now);
 event.schedule499=normalizeEventQueue499(kind,[...kept,row],event);
 return row;
}
function stopEvent499(config,kind,runId,now){
 const event=config.events[kind];if(!event)throw Error('Etkinlik türü geçersiz.');
 if(runId!==undefined&&typeof runId!=='string')throw Error('Etkinlik kaydı geçersiz.');
 const row=runId===undefined?eventOccurrence499(event,now)??event:event.runId===runId?event:(event.schedule499??[]).find(item=>item.runId===runId);
 if(!row)throw Error('Etkinlik kaydı bulunamadı. Paneli yenile.');
 if(row===event)event.enabled=false;else event.schedule499=event.schedule499.filter(item=>item.runId!==row.runId);
}
function retainEventQueues499(input,old){
 return {...input,events:Object.fromEntries(Object.entries(input?.events??{}).map(([kind,event])=>[kind,{...event,schedule499:old.events[kind]?.schedule499??[]}]))};
}
;return {normalizeEventQueue499,eventOccurrence499,eventDisplay499};})();


function colEventsMerge499(parsed,raw){
 let incoming;try{incoming=typeof raw==='string'?JSON.parse(raw):raw;}catch{return parsed;}
 const events={...parsed.events};
 for(const kind of Object.keys(events)){
  try{events[kind]={...events[kind],schedule499:colEventNormalize499(kind,incoming?.events?.[kind]?.schedule499,events[kind])};}catch{events[kind]={...events[kind],schedule499:[]};}
 }
 return {...parsed,events};
}
function colEventRows499(config,now){
 const rows=[];
 for(const kind of ['loot','xp','essence','chest','moonlight','fishing','halloween']){
  const event=config?.events?.[kind];if(!event)continue;
  for(const row of [event,...(event.schedule499??[]).slice(0,32)])if(row.enabled&&row.end>now)rows.push({kind,event:row,key:kind+':'+row.runId+':'+row.start});
 }
 return rows.sort((a,b)=>a.event.start-b.event.start||a.kind.localeCompare(b.kind));
}
function colEventDateInput499(seconds){return Number.isSafeInteger(seconds)&&seconds>0&&seconds<=4102444800?new Date(seconds*1000+10800000).toISOString().slice(0,16):'';}
function colEventDateParse499(value){
 if(!value)return 0;if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return NaN;
 const seconds=Date.parse(value+':00+03:00')/1000;
 return Number.isSafeInteger(seconds)&&colEventDateInput499(seconds)===value?seconds:NaN;
}
const colEventDateFormatter499=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
function colEventDateLabel499(seconds){return colEventDateFormatter499.format(new Date(seconds*1000));}
function colEventCalendar499(React,config,now,labels,remaining){
 const h=React.createElement;
 return colEventRows499(config,now).map(({kind,event:e,key})=>{
  const running=now>=e.start,label=labels[kind]??(kind==='halloween'?'Cadılar Bayramı':kind);
  const description=kind==='fishing'?`Başarılı av başına %${e.percent} şansla ek ödül: Efsun Değiştirme, Efsun Artırma, +2 Saat Oto Av Bileti veya Oto Kırmızı İksir. Normal av ödülün korunur.`:kind==='halloween'?`Canavarlardan %${e.percent} şansla Bal Kabağı.`:kind==='chest'||kind==='moonlight'?`Canavarlardan %${e.percent} şansla sandık.`:`Canavar ödüllerinde +%${e.percent} ${kind==='xp'?'TP':kind==='essence'?'Öz':'eşya düşürme'}.`;
  return h('article',{key,className:'event-calendar499'},h('div',null,(kind==='chest'||kind==='moonlight')&&h('img',{src:kind==='moonlight'?'/game/moonlight-chest-v357.webp':'/game/crystal-chest.webp',alt:label}),h('strong',null,label),h('b',null,running?'AKTİF':'YAKINDA')),h('p',null,description),h('p',{className:'event-calendar-date499'},colEventDateLabel499(e.start)+' – '+colEventDateLabel499(e.end)+' · Türkiye saati'),h('time',{dateTime:new Date((running?e.end:e.start)*1000).toISOString()},(running?'Kalan: ':'Başlamasına: ')+remaining((running?e.end:e.start)-now)));
 });
}
function colEventAdminRows499(React,config,now,labels,busy,act,raw,report){
 const h=React.createElement,rows=colEventRows499(config,now);
 return h('section',{className:'event-schedule-list499','aria-label':'Etkinlik takvimi'},h('h3',null,'Aktif ve planlanan etkinlikler'),h('p',null,'Aynı anda farklı etkinlikler çalışabilir. Aynı türün saatleri çakışamaz. Tüm saatler Türkiye saati (UTC+3).'),rows.length?h('div',{className:'event-schedule-scroll499'},h('table',null,h('thead',null,h('tr',null,...['Etkinlik','Başlangıç','Bitiş','Oran','Durum','İşlem'].map(label=>h('th',{key:label,scope:'col'},label)))),h('tbody',null,...rows.map(({kind,event:e,key})=>h('tr',{key},h('td',null,labels[kind]??kind),h('td',null,colEventDateLabel499(e.start)),h('td',null,colEventDateLabel499(e.end)),h('td',null,'%'+e.percent),h('td',null,now>=e.start?'Aktif':'Planlandı'),h('td',null,h('button',{disabled:busy,onClick:async()=>{try{report?.('');await act({action:'event_stop',eventKind:kind,eventRunId499:e.runId,expectedEvents:raw});}catch(error){report?.(error?.message??'Etkinlik iptal edilemedi.');}}},now>=e.start?'Durdur':'Planı iptal et'))))))):h('p',null,'Aktif veya planlanan etkinlik yok.'));
}

function colSecurityNotice508(body,result,error){
 if(!['security_ban_permanent','security_suspend','security_unban'].includes(body?.action))return;
 const message=error?(error instanceof Error?error.message:'Hesap işlemi tamamlanamadı.'):(result?.securityResult508?.message||'Hesap işlemi tamamlandı.');
 window.alert(message);
}

const tower511Admin=createTower511(X);

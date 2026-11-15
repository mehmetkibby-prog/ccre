const clone=value=>JSON.parse(JSON.stringify(value));
export const ROYAL_UI_KINDS_R118=Object.freeze({weapon:'Silah',armor:'Zırh',helmet:'Miğfer',shoes:'Çizme',necklace:'Kolye'});
export function csrfR118(){
 const cookie=typeof document==='undefined'?'':document.cookie;
 const row=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-yasam-csrf=')||s.startsWith('yasam-csrf-local='));
 try{return row?decodeURIComponent(row.slice(row.indexOf('=')+1)):'';}catch{return '';}
}
export async function adminRequestR118(domain,body,{signal,timeoutMs=15000}={}){
 const controller=new AbortController(),cancel=()=>controller.abort();
 signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)controller.abort();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch('/api/admin?core511='+domain+'-r118',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json','x-csrf-token':csrfR118()},body:JSON.stringify(body)});
  let data;try{data=await response.json();}catch(error){if(error.name==='AbortError')throw error;throw Error('Yönetim yanıtı okunamadı. Yeniden yükle.');}
  if(!response.ok)throw Object.assign(Error(data?.error??'Ayar işlemi tamamlanamadı.'),{status:response.status});
  const value=data?.[domain];
  if(!value||!Number.isSafeInteger(value.revision)||value.revision<1||!value.config||typeof value.config!=='object')throw Error('Ayar yanıtı eksik. Yeniden yükle.');
  return value;
 }catch(error){
  if(error.name==='AbortError'&&!signal?.aborted)throw Error('İstek zaman aşımına uğradı. Kaydettiysen sonucu görmek için kayıtlı ayarları yükle.');
  throw error;
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}
export function validateRoyalAdminR118(config,catalog){
 if(!config||typeof config.enabled!=='boolean')return 'Kraliyet dönüşümünün açık veya kapalı olduğunu seç.';
 const byId=new Map((catalog??[]).map(row=>[row.id,row]));
 for(const kind of Object.keys(ROYAL_UI_KINDS_R118)){
  const rows=config.recipes?.[kind]?.costs;
  if(!Array.isArray(rows)||rows.length<1||rows.length>12)return ROYAL_UI_KINDS_R118[kind]+' için 1–12 malzeme bedeli belirle.';
  if(!rows.some(row=>row.itemId==='material:emerald_dust'&&row.amount>=1))return ROYAL_UI_KINDS_R118[kind]+' tarifinde en az 1 Zümrüt Tozu bulunmalı.';
  const seen=new Set();
  for(const row of rows){const item=byId.get(row?.itemId);if(!item||seen.has(row.itemId))return 'Her tarifte geçerli ve birbirinden farklı malzemeler seç.';seen.add(row.itemId);if(!Number.isSafeInteger(row.amount)||row.amount<1||row.amount>Math.min(1000000,item.maxAmount??1000000))return item.name+' için geçerli bir malzeme adedi yaz.';}
 }
 return '';
}
export const ADMIN_CSS_R118=`
.r118-admin{grid-column:1/-1;min-width:0;color:#eee9df}.r118-admin *{box-sizing:border-box}.r118-admin header{padding:23px;border:1px solid #827348;border-radius:13px;background:linear-gradient(125deg,#213b32,#12251e);margin-bottom:18px}.r118-admin header small{color:#d5bb7f;letter-spacing:.14em;font-size:10px;font-weight:700}.r118-admin h2{font:700 26px Georgia,serif;color:#f2e4be;margin:7px 0}.r118-admin h3{margin:0 0 14px;color:#ead9ac;font-size:17px}.r118-admin p{font-size:13px;color:#bdc9bd;line-height:1.65}.r118-admin .r118-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.r118-admin label{display:grid;gap:6px;min-width:0;font-size:13px}.r118-admin input,.r118-admin select,.r118-admin button{font:inherit;min-height:44px;border:1px solid #536650;border-radius:8px;background:#122a20;color:#f0eee1;padding:10px;min-width:0;max-width:100%;color-scheme:dark}.r118-admin input,.r118-admin select{width:100%}.r118-admin button{cursor:pointer}.r118-admin button:disabled{opacity:.45;cursor:default}.r118-admin :is(input,select,button):focus-visible{outline:2px solid #edd39a;outline-offset:3px}.r118-admin .r118-card{border:1px solid #435a46;border-radius:11px;padding:18px;margin-top:15px;background:#14271e}.r118-admin .r118-row{display:grid;grid-template-columns:minmax(145px,1fr) 105px auto;gap:9px;align-items:end;margin:10px 0}.r118-admin .r118-row.r118-loot{grid-template-columns:minmax(145px,1fr) repeat(3,85px) auto}.r118-admin .r118-error{color:#ffcfbd;border-left:3px solid #ca886b;padding:10px 13px;background:#432c2580;overflow-wrap:anywhere}.r118-admin .r118-notice{color:#dcebd3;border-left:3px solid #c7ad73;padding:12px 14px;background:#2b3e2d;overflow-wrap:anywhere}.r118-admin .r118-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.r118-admin .r118-primary{background:#d9be80;color:#18251d;border-color:#ecd69e;font-weight:700}.r118-admin .r118-empty{border:1px dashed #52654d;border-radius:8px;padding:12px}.r118-admin .r118-select{max-width:330px;margin:14px 0}.r118-admin .r118-subtle{font-size:12px;color:#a7b5a5}.r118-admin .r118-species{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.r118-admin .r118-species [aria-pressed=true]{background:#40543b;border-color:#d8bc7d;color:#ffe9b6}.r118-admin input[type=checkbox]{width:18px;min-height:18px}.r118-admin .r118-checkbox{display:flex;align-items:center;gap:8px}.r118-admin .r118-search{margin:16px 0}.r118-admin .r118-total{padding:8px 12px;border:1px solid #52664b;border-radius:8px;font-size:12px;color:#c8d4bf}@media(max-width:760px){.r118-admin .r118-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.r118-admin .r118-row,.r118-admin .r118-row.r118-loot{grid-template-columns:repeat(2,minmax(0,1fr))}.r118-admin .r118-row>label:first-child{grid-column:1/-1}.r118-admin .r118-row>button{align-self:end}.r118-admin header,.r118-admin .r118-card{padding:15px}.r118-admin .r118-actions>button{flex:1 1 170px}}@media(max-width:400px){.r118-admin .r118-fields{grid-template-columns:1fr}}
`;
export function createRoyalAdminR118(React){
 const h=React.createElement;
 return function RoyalAdmin(){
  const [data,setData]=React.useState(null),[draft,setDraft]=React.useState(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState(''),[error,setError]=React.useState(''),[mustReload,setMustReload]=React.useState(false),[kind,setKind]=React.useState('weapon');
  const alive=React.useRef(true),lock=React.useRef(false),controller=React.useRef(null);
  const act=async(save=false)=>{
   if(lock.current)return;
   const invalid=save?validateRoyalAdminR118(draft,data?.catalog):'';if(invalid){setError(invalid);return;}
   lock.current=true;setBusy(true);setError('');setNotice('');const abort=new AbortController();controller.current=abort;
   try{
    const next=await adminRequestR118('royal',{action:save?'royal_admin_save_r118':'royal_admin_read_r118',...(save?{revision:data.revision,config:draft}:{})},{signal:abort.signal});
    if(!save&&!Array.isArray(next.catalog))throw Error('Malzeme kataloğu alınamadı. Yeniden yükle.');
    if(alive.current&&controller.current===abort){setData(old=>({...old,...next}));setDraft(clone(next.config));setMustReload(false);setNotice(save?'Kraliyet tarifleri bu sunucuya kaydedildi.':'');}
   }catch(e){if(alive.current&&controller.current===abort&&e.name!=='AbortError'){setError(e.message??'İşlem tamamlanamadı.');if(save)setMustReload(true);}}
   finally{if(controller.current===abort){lock.current=false;controller.current=null;if(alive.current)setBusy(false);}}
  };
  React.useEffect(()=>{alive.current=true;void act();return()=>{alive.current=false;controller.current?.abort();controller.current=null;lock.current=false;};},[]);
  const catalog=data?.catalog??[],validation=draft?validateRoyalAdminR118(draft,catalog):'',rows=draft?.recipes?.[kind]?.costs??[];
  const updateRows=next=>setDraft(old=>({...old,recipes:{...old.recipes,[kind]:{...old.recipes[kind],costs:next}}}));
  const update=(index,patch)=>updateRows(rows.map((row,i)=>i===index?{...row,...patch}:row));
  return h('section',{className:'admin-card r118-admin','data-royal-admin':'r118'},h('style',null,ADMIN_CSS_R118),h('header',null,h('small',null,'EŞYA VE GELİŞİM'),h('h2',null,'Kraliyet Eşyaları'),h('p',null,'Hükümdar Kraliyet Seti için her parçanın dönüşüm bedelini belirle. Kuşanmak için Şampiyon seviyesi gerekir.')),
   draft?h(React.Fragment,null,
    h('label',{className:'r118-select'},'Kraliyet dönüşümü',h('select',{value:String(draft.enabled),disabled:busy,onChange:e=>setDraft({...draft,enabled:e.target.value==='true'})},h('option',{value:'true'},'Açık'),h('option',{value:'false'},'Kapalı'))),
    h('p',null,'Kadim Zümrüt eşyanın temel gücü %8 artar. Efsun, taş ve geliştirme değerleri korunur. Demirci Haso’da bir Kadim Zümrüt eşya eritmek 1 Zümrüt Tozu verir.'),
    h('nav',{className:'r118-species','aria-label':'Kraliyet tarifleri'},...Object.entries(ROYAL_UI_KINDS_R118).map(([key,label])=>h('button',{key,type:'button','aria-pressed':kind===key,onClick:()=>setKind(key)},label))),
    h('section',{className:'r118-card'},h('h3',null,ROYAL_UI_KINDS_R118[kind]+' dönüşüm malzemeleri'),h('p',{className:'r118-subtle'},'Dönüştürülecek Kadim Zümrüt parça bu malzemelere ek olarak seçilir; aynı eşya Kraliyet parçasına dönüşür.'),
     ...rows.map((row,index)=>h('div',{className:'r118-row',key:index},h('label',null,'Malzeme '+(index+1),h('select',{value:row.itemId,disabled:busy,'aria-label':'Malzeme '+(index+1),onChange:e=>update(index,{itemId:e.target.value})},...catalog.filter(item=>item.id===row.itemId||!rows.some(other=>other.itemId===item.id)).map(item=>h('option',{key:item.id,value:item.id},item.name)))),h('label',null,'Adet',h('input',{type:'number',min:1,max:Math.min(1000000,catalog.find(item=>item.id===row.itemId)?.maxAmount??1000000),step:1,value:row.amount,disabled:busy,'aria-label':'Malzeme adedi '+(index+1),onChange:e=>update(index,{amount:Number(e.target.value)})})),h('button',{type:'button',disabled:busy,'aria-label':'Malzemeyi kaldır '+(index+1),onClick:()=>updateRows(rows.filter((_,i)=>i!==index))},'Kaldır'))),
     !rows.length&&h('p',{className:'r118-empty'},'En az bir dönüşüm malzemesi ekle.'),h('button',{type:'button',disabled:busy||rows.length>=12,onClick:()=>{const first=catalog.find(item=>!rows.some(row=>row.itemId===item.id));if(first)updateRows([...rows,{itemId:first.id,amount:1}]);}},'+ Malzeme ekle')),
    validation&&h('p',{className:'r118-error',role:'status'},validation),mustReload&&h('p',{className:'r118-error'},'Son kaydın sonucunu doğrulamak ve güncel sürümle devam etmek için kayıtlı ayarları yükle.'),
    h('div',{className:'r118-actions'},h('button',{className:'r118-primary',type:'button',disabled:busy||mustReload||!!validation,onClick:()=>void act(true)},busy?'İşleniyor…':'Kraliyet tariflerini kaydet'),h('button',{type:'button',disabled:busy,onClick:()=>void act()},'Kayıtlı ayarları yükle')))
   :h('div',{className:'r118-card'},h('p',{role:'status'},busy?'Kraliyet ayarları yükleniyor…':'Kraliyet ayarları yüklenemedi.'),!busy&&h('button',{type:'button',onClick:()=>void act()},'Yeniden dene')),
   error&&h('p',{className:'r118-error',role:'alert'},error),notice&&h('p',{className:'r118-notice',role:'status'},notice));
 };
}

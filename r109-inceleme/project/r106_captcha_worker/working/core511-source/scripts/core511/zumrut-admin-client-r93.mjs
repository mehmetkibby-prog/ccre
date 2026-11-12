export function validateZumrutAdminDraftR93(config,catalog){
 if(!config||typeof config.enabled!=='boolean')return 'Haritanın açık veya kapalı olduğunu seç.';
 if(!['admin','public'].includes(config.access))return 'Haritaya kimlerin girebileceğini seç.';
 if(!Number.isSafeInteger(config.gatherMs)||config.gatherMs<1500||config.gatherMs>10000)return 'Toplama süresi 1.500–10.000 ms olmalı.';
 if(!Number.isSafeInteger(config.craftMs)||config.craftMs<2000||config.craftMs>15000)return 'Üretim süresi 2.000–15.000 ms olmalı.';
 const byId=new Map(catalog.map(x=>[x.id,x]));
 for(const rows of [config.toolCosts?.axe,config.toolCosts?.pickaxe,config.recipe?.costs]){
  if(!Array.isArray(rows)||rows.length>12)return 'Her bedelde en fazla 12 eşya seçebilirsin.';
  const seen=new Set(),balances=new Set();
  for(const row of rows){const item=byId.get(row.itemId);if(!item?.costAllowed)return 'Bedel için harcanabilir bir çanta eşyası veya kaynak seç.';if(seen.has(item.id))return 'Aynı eşyayı tek bedelde iki kez seçme.';seen.add(item.id);const p=item.payment,key=p&&!p.selection?p.table+':'+(p.column??p.kind):null;if(key&&balances.has(key))return 'Aynı bakiye farklı adlarla iki kez seçilemez.';if(key)balances.add(key);if(!Number.isSafeInteger(row.amount)||row.amount<1||row.amount>(item.payment?.selection?35:1000000))return 'Bedel miktarı geçersiz.';}
 }
 const rewards=config.recipe?.rewards;
 if(!Array.isArray(rewards)||rewards.length>32)return 'En fazla 32 farklı üretim sonucu seçebilirsin.';
 const seen=new Set();let chance=0;
 for(const row of rewards){const item=byId.get(row.itemId);if(!item?.rewardAllowed||seen.has(row.itemId))return 'Geçerli ve farklı üretim eşyaları seç.';seen.add(row.itemId);if(!Number.isSafeInteger(row.amount)||row.amount<1||row.amount>item.maxAmount)return item.name+' için adet 1–'+item.maxAmount+' olmalı.';if(!Number.isFinite(row.chance)||row.chance<=0||row.chance>100||Math.abs(row.chance*100-Math.round(row.chance*100))>1e-7)return 'Her şans %0’dan büyük, en fazla iki ondalık basamaklı olmalı.';chance+=Math.round(row.chance*100);}
 if(rewards.length&&chance!==10000)return 'Üretim şanslarının toplamı tam %100 olmalı.';
 if(rewards.length&&!config.recipe.costs.length)return 'Üretim için en az bir malzeme bedeli seç.';
 return '';
}

const css=`
.zumrut93-admin{grid-column:1/-1;min-width:0;color:#e9f1e7}.zumrut93-admin *{box-sizing:border-box}.zumrut93-admin .z93-hero{padding:24px;border:1px solid #528066;border-radius:14px;background:linear-gradient(120deg,#193d30,#10291f 68%,#244439);margin-bottom:18px}.zumrut93-admin .z93-hero small{letter-spacing:.13em;text-transform:uppercase;color:#acd8be}.zumrut93-admin h2{font-size:25px;color:#f2dfad;margin:6px 0}.zumrut93-admin p{line-height:1.6;margin:10px 0;color:#c0d3c5}.zumrut93-admin h3{margin:0 0 13px;color:#f0d8a0}.zumrut93-admin label{display:grid;gap:6px;min-width:0;font-size:13px}.zumrut93-admin input,.zumrut93-admin select{min-height:42px;min-width:0;width:100%;border:1px solid #56705f;border-radius:7px;background:#0e2119;color:#f4f1df;padding:9px;font:inherit;color-scheme:dark}.zumrut93-admin button{min-height:42px;padding:9px 14px;border:1px solid #60866c;border-radius:7px;background:#284c36;color:#f1e5c1;font:inherit;cursor:pointer}.zumrut93-admin button:hover:not(:disabled){background:#365f43;border-color:#ddc891}.zumrut93-admin button:disabled{opacity:.45;cursor:default}.zumrut93-admin :is(button,input,select):focus-visible{outline:2px solid #e8ce8c;outline-offset:3px}.zumrut93-admin .z93-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.zumrut93-admin .z93-card{padding:19px;border:1px solid #3e5b4b;border-radius:11px;background:#13281e;min-width:0}.zumrut93-admin .z93-row{display:grid;grid-template-columns:minmax(140px,1fr) 90px auto;gap:9px;align-items:end;margin:12px 0}.zumrut93-admin .z93-row.z93-reward{grid-template-columns:minmax(160px,1fr) 90px 90px auto}.zumrut93-admin .z93-wide{grid-column:1/-1}.zumrut93-admin .z93-fields{display:flex;align-items:end;gap:18px;flex-wrap:wrap;margin:16px 0}.zumrut93-admin .z93-fields>label{flex:1;min-width:170px}.zumrut93-admin .z93-subtle{font-size:12px;color:#9fbcaa}.zumrut93-admin .z93-total{display:inline-block;padding:8px 12px;border:1px solid #6d9171;border-radius:7px;color:#ceedd0}.zumrut93-admin .z93-total[data-valid=false]{border-color:#b97c57;color:#f4c99d}.zumrut93-admin .z93-status{margin:18px 0;padding:13px 15px;border-left:3px solid #c8b475;background:#273b2a;overflow-wrap:anywhere}.zumrut93-admin footer{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}.zumrut93-admin footer .z93-primary{background:#387249;border-color:#9acb8d;font-weight:700}.zumrut93-admin .z93-empty{padding:12px;border:1px dashed #55735d;border-radius:7px}.zumrut93-admin .z93-search{margin:12px 0 18px}.zumrut93-admin .z93-loading{padding:20px}.zumrut93-admin .z93-inline-error{color:#f2c49f}
@media(max-width:720px){.zumrut93-admin .z93-grid{grid-template-columns:1fr}.zumrut93-admin .z93-hero,.zumrut93-admin .z93-card{padding:15px}.zumrut93-admin .z93-row,.zumrut93-admin .z93-row.z93-reward{grid-template-columns:1fr 1fr}.zumrut93-admin .z93-row>label:first-child{grid-column:1/-1}.zumrut93-admin .z93-row>button{justify-self:end}.zumrut93-admin footer>button{flex:1 1 170px}}
`;
const fold=text=>String(text??'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replaceAll('ı','i');
export function createZumrutAdminR93(React){
 const h=React.createElement;
 return function ZumrutAdmin(){
  const [data,setData]=React.useState(null),[draft,setDraft]=React.useState(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState(''),[search,setSearch]=React.useState('');
  const alive=React.useRef(true),lock=React.useRef(false),controller=React.useRef(null);
  const act=async(action='zumrut_admin_get')=>{
   if(lock.current)return;
   const error=action==='zumrut_admin_save'?validateZumrutAdminDraftR93(draft,data?.catalog??[]):'';
   if(error){setNotice(error);return;}
   lock.current=true;setBusy(true);setNotice('');
   const abort=new AbortController();controller.current=abort;
   try{
    const response=await fetch('/api/admin?core511=zumrut-r93',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action,...(action==='zumrut_admin_save'?{config:draft,revision:data.revision??data.config.revision}:{})}),signal:abort.signal});
    const body=await response.json();if(!response.ok)throw Error(body.error??'Vadi ayarları alınamadı.');
    const next=body.zumrut;if(!next?.config||!Array.isArray(next.catalog))throw Error('Vadi ayarları doğrulanamadı.');
    if(alive.current&&controller.current===abort){setData(next);setDraft(structuredClone(next.config));setNotice(action==='zumrut_admin_save'?'Zümrüt Vadisi ayarları kaydedildi.':'');}
   }catch(e){if(alive.current&&controller.current===abort&&e.name!=='AbortError')setNotice(e.message??'Bağlantı kurulamadı. Taslağın korunuyor.');}
   finally{if(controller.current===abort){lock.current=false;if(alive.current)setBusy(false);}}
  };
  React.useEffect(()=>{alive.current=true;void act();return()=>{alive.current=false;controller.current?.abort();controller.current=null;lock.current=false;};},[]);
  const catalog=data?.catalog??[],lookup=new Map(catalog.map(x=>[x.id,x])),needle=fold(search.trim());
  const filtered=(reward,current)=>catalog.filter(i=>(reward?i.rewardAllowed:i.costAllowed)&&(i.id===current||!needle||fold(i.name+' '+i.group+' '+(i.label??'')).includes(needle)));
  const itemLabel=item=>item.label??item.name;
  const selector=(row,reward,change,label)=>h('label',null,label,h('select',{'aria-label':label,value:row.itemId,disabled:busy,onChange:e=>change({itemId:e.target.value,...(reward?{amount:Math.min(row.amount,lookup.get(e.target.value)?.maxAmount??1)}:{})})},...filtered(reward,row.itemId).map(i=>h('option',{key:i.id,value:i.id},itemLabel(i)+' · '+i.group))));
  const updateCosts=(key,rows)=>setDraft(d=>key==='recipe'?{...d,recipe:{...d.recipe,costs:rows}}:{...d,toolCosts:{...d.toolCosts,[key]:rows}});
  const costEditor=(key,title)=>{
   const rows=key==='recipe'?draft.recipe.costs:draft.toolCosts[key];
   const change=(index,value)=>updateCosts(key,rows.map((r,i)=>i===index?{...r,...value}:r));
   const add=()=>{const item=filtered(false).find(i=>!rows.some(r=>r.itemId===i.id));if(item)updateCosts(key,[...rows,{itemId:item.id,amount:1}]);};
   return h('section',{className:'z93-card',key},h('h3',null,title),rows.length?rows.map((row,index)=>h('div',{className:'z93-row',key:index},selector(row,false,value=>change(index,value),title+' · eşya '+(index+1)),h('label',null,'Adet',h('input',{'aria-label':title+' · adet '+(index+1),type:'number',min:1,max:lookup.get(row.itemId)?.payment?.selection?35:1000000,step:1,value:row.amount,disabled:busy,onChange:e=>change(index,{amount:Number(e.target.value)})})),h('button',{type:'button',disabled:busy,'aria-label':title+' · satırı kaldır '+(index+1),onClick:()=>updateCosts(key,rows.filter((_,i)=>i!==index))},'Kaldır'))):h('p',{className:'z93-empty'},key==='recipe'?'Üretim bedelini ekle.':'Bedel yok: bu alet ücretsiz verilir.'),h('button',{type:'button',disabled:busy||rows.length>=12,onClick:add},'Bedel ekle'));
  };
  const updateReward=(index,value)=>setDraft(d=>({...d,recipe:{...d.recipe,rewards:d.recipe.rewards.map((r,i)=>i===index?{...r,...value}:r)}}));
  const total=draft?.recipe.rewards.reduce((sum,r)=>sum+Math.round((Number(r.chance)||0)*100),0)??0;
  const validation=draft?validateZumrutAdminDraftR93(draft,catalog):'';
  return h('section',{className:'admin-card zumrut93-admin','data-zumrut-admin':'r93'},h('style',null,css),h('header',{className:'z93-hero'},h('small',null,'Haritalar ve savaş'),h('h2',null,'Zümrüt Vadisi'),h('p',null,'Alet satıcısının bedellerini ve üretim tezgâhının ödüllerini belirle. Tamamlanan her ağaç kesimi 1 odun, her taş kırma 1 taş verir.')),
   draft?h(React.Fragment,null,
    h('div',{className:'z93-fields'},h('label',null,'Harita',h('select',{'aria-label':'Zümrüt Vadisi açık mı',value:String(draft.enabled),disabled:busy,onChange:e=>setDraft({...draft,enabled:e.target.value==='true'})},h('option',{value:'true'},'Açık'),h('option',{value:'false'},'Kapalı'))),h('label',null,'Haritaya giriş',h('select',{'aria-label':'Haritaya giriş',value:draft.access,disabled:busy,onChange:e=>setDraft({...draft,access:e.target.value})},h('option',{value:'admin'},'Yalnız yönetici'),h('option',{value:'public'},'Herkese açık'))),h('label',null,'Toplama süresi (ms)',h('input',{'aria-label':'Toplama süresi',type:'number',min:1500,max:10000,step:100,value:draft.gatherMs,disabled:busy,onChange:e=>setDraft({...draft,gatherMs:Number(e.target.value)})})),h('label',null,'Üretim süresi (ms)',h('input',{'aria-label':'Üretim süresi',type:'number',min:2000,max:15000,step:100,value:draft.craftMs,disabled:busy,onChange:e=>setDraft({...draft,craftMs:Number(e.target.value)})}))),
    h('label',{className:'z93-search'},'Eşya kataloğunda ara',h('input',{type:'search','aria-label':'Eşya kataloğunda ara',placeholder:'Odun, taş, mücevher, silah, inci…',value:search,onChange:e=>setSearch(e.target.value)})),
    h('p',{className:'z93-subtle'},'Bedel olarak para, malzeme, taş ve harcanabilir eşyaları seçebilirsin. Ekipman bedelinde oyuncu çantasından hangi eşyayı vereceğini seçer. Kuşanılmış ve kilitli eşyalar korunur.'),
    h('div',{className:'z93-grid'},costEditor('axe','Balta bedeli'),costEditor('pickaxe','Kazma bedeli'),h('div',{className:'z93-wide'},costEditor('recipe','Üretim malzemeleri')),
     h('section',{className:'z93-card z93-wide'},h('h3',null,'Üretimde çıkabilecek eşya'),h('p',null,'Her üretimde aşağıdaki sonuçlardan yalnızca biri seçilir. Şansları toplam %100 olacak şekilde yaz. Ödül eklenene kadar tezgâhta üretim açılmaz.'),
      ...draft.recipe.rewards.map((row,index)=>h('div',{className:'z93-row z93-reward',key:index},selector(row,true,value=>updateReward(index,value),'Üretim sonucu '+(index+1)),h('label',null,'Adet',h('input',{'aria-label':'Ödül adedi '+(index+1),type:'number',min:1,max:lookup.get(row.itemId)?.maxAmount??1,step:1,value:row.amount,disabled:busy,onChange:e=>updateReward(index,{amount:Number(e.target.value)})})),h('label',null,'Şans %',h('input',{'aria-label':'Üretim şansı '+(index+1),type:'number',min:.01,max:100,step:.01,value:row.chance,disabled:busy,onChange:e=>updateReward(index,{chance:Number(e.target.value)})})),h('button',{type:'button',disabled:busy,'aria-label':'Üretim sonucunu kaldır '+(index+1),onClick:()=>setDraft(d=>({...d,recipe:{...d.recipe,rewards:d.recipe.rewards.filter((_,i)=>i!==index)}}))},'Kaldır'))),
      !draft.recipe.rewards.length&&h('p',{className:'z93-empty'},'Henüz üretim ödülü seçilmedi.'),h('div',{className:'z93-fields'},h('button',{type:'button',disabled:busy||draft.recipe.rewards.length>=32,onClick:()=>{const item=filtered(true).find(i=>!draft.recipe.rewards.some(r=>r.itemId===i.id));if(item)setDraft(d=>({...d,recipe:{...d.recipe,rewards:[...d.recipe.rewards,{itemId:item.id,amount:1,chance:d.recipe.rewards.length?1:100}]}}));}},'Üretim sonucu ekle'),h('strong',{className:'z93-total','data-valid':!draft.recipe.rewards.length||total===10000},'Toplam: %'+(total/100).toLocaleString('tr-TR',{maximumFractionDigits:2}))))),
    validation&&h('p',{className:'z93-inline-error',role:'status'},validation),h('footer',null,h('button',{type:'button',className:'z93-primary',disabled:busy||!!validation,onClick:()=>void act('zumrut_admin_save')},busy?'İşleniyor…':'Vadi ayarlarını kaydet'),h('button',{type:'button',disabled:busy,onClick:()=>void act()},'Kaydedilmiş ayarları yükle')))
   :h('div',{className:'z93-loading'},h('p',null,busy?'Vadi ayarları yükleniyor…':'Vadi ayarları henüz yüklenemedi.'),!busy&&h('button',{type:'button',onClick:()=>void act()},'Yeniden dene')),
   notice&&h('p',{className:'z93-status',role:'status'},notice));
 };
}

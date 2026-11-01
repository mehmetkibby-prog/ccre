const MIST_ADMIN_CSS=`.mist24-admin{isolation:isolate}.mist24-admin p{line-height:1.55}.mist24-admin .mist24-check{display:flex;align-items:center;gap:8px;min-height:36px}.mist24-admin .mist24-check input{width:18px;height:18px;flex:none}.mist24-admin .mist24-schedule{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid #49634b;border-radius:7px}.mist24-admin .mist24-schedule span{overflow-wrap:anywhere}.mist24-admin .tower18-save{flex-wrap:wrap}.mist24-admin .tower18-status{margin:0}.mist24-admin input:invalid{border-color:#db9771}@media(max-width:600px){.mist24-admin .tower18-save{position:static}.mist24-admin .mist24-schedule{align-items:flex-start;flex-direction:column}}`;
export const mistScheduleTimestamp=value=>{
 // Planning always uses Turkey time, regardless of the administrator's device.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return NaN;
 return Date.parse(value+':00+03:00');
};
export function createMistAdmin(React,css){
 const h=React.createElement;
 return function MistAdmin({act,busy:outerBusy}){
  const [draft,setDraft]=React.useState(null),[meta,setMeta]=React.useState({}),[revision,setRevision]=React.useState(null),[busy,setBusy]=React.useState(false),[message,setMessage]=React.useState(''),[tab,setTab]=React.useState('general'),[kind,setKind]=React.useState('claw'),[dirty,setDirty]=React.useState(false),[retry,setRetry]=React.useState(null);
  const [spawn,setSpawn]=React.useState({area:'forest',channel:1,x:1800,y:1100,gold:false,when:''});
  const lock=React.useRef(false),mounted=React.useRef(true),pending=React.useRef(null),container=React.useRef(null);
  const call=async(action,extra={})=>{
   if(lock.current||outerBusy)return;
   const portal=action==='sis_mist_spawn'||action==='sis_mist_schedule',key=JSON.stringify([action,extra]);
   if(portal&&pending.current&&pending.current.key!==key){setMessage('Önce bekleyen portal işlemini yeniden sorgula; aynı portal iki kez gönderilmesin.');return;}
   lock.current=true;setBusy(true);setMessage('');
   if(portal)pending.current??={key,action,extra,id:crypto.randomUUID()};
   try{
    const r=await act({action,...extra,...(portal?{requestId:pending.current.id}:{})});
    if(!r?.mist?.config)throw Error(r?.error??'Yanıt alınamadı. İşlemi yeniden sorgulayabilirsin.');
    if(portal){pending.current=null;setRetry(null);}
    if(mounted.current){
     // Sending or cancelling a portal must never erase an unsaved settings draft.
     if(action==='sis_mist_get'||action==='sis_mist_save'){
      setDraft(structuredClone(r.mist.config));setRevision(r.mist.revision);setDirty(false);
     }
     setMeta(r.mist);
     setMessage(action==='sis_mist_get'?'Canlı ayarlar yüklendi.':action==='sis_mist_save'?'Kaydedildi. Yeni ayarlar yeni yarıklara uygulanır.':action==='sis_mist_cancel'?'Portal planı iptal edildi.':r.mist.operation?.status==='completed'?'Bu portal işlemi daha önce işlendi; tekrar oluşturulmadı.':action==='sis_mist_spawn'?'Portal isteği kaydedildi. Kanal kapasitesi doluysa sırada bekler.':'Portal planı kaydedildi.');
    }
   }catch(error){
    if(portal&&Number.isInteger(error?.status)&&error.status>=400&&error.status<500){pending.current=null;setRetry(null);}
    if(mounted.current){setMessage(error.message??'İşlem tamamlanamadı.');if(portal&&pending.current)setRetry(pending.current);}
   }finally{lock.current=false;if(mounted.current)setBusy(false);}
  };
  React.useEffect(()=>{mounted.current=true;void call('sis_mist_get');return()=>{mounted.current=false;};},[]);
  React.useEffect(()=>{if(!outerBusy&&!draft&&!lock.current)void call('sis_mist_get');},[outerBusy]);
  const edit=fn=>{setDraft(old=>{const next=structuredClone(old);fn(next);return next;});setDirty(true);};
  const disabled=busy||outerBusy;
  const valid=()=>{const field=container.current?.querySelector('input:invalid');if(field){field.reportValidity();return false;}return true;};
  const num=(label,value,change,min=0,max=100000000,step=1)=>h('label',null,label,h('input',{type:'number',min,max,step,value,required:true,disabled,onChange:e=>change(e.target.value===''?'':Number(e.target.value))}));
  const check=(label,value,change)=>h('label',{className:'mist24-check'},h('input',{type:'checkbox',checked:value,disabled,onChange:e=>change(e.target.checked)}),label);
  const button=(text,onClick,props={})=>h('button',{type:'button',disabled,onClick,...props},text);
  const drops=(rows,change)=>h('div',null,...rows.map((r,i)=>{
   const item=meta.catalog?.find(c=>c.id===r.itemId),stack=['resource','material','stone'].includes(item?.type);
   return h('div',{className:'tower18-drop',key:i},h('label',null,'Eşya',h('select',{disabled,value:r.itemId,onChange:e=>change(a=>{a[i].itemId=e.target.value;const selected=meta.catalog.find(c=>c.id===e.target.value);if(!['resource','material','stone'].includes(selected?.type)){a[i].min=1;a[i].max=1;}})},...(meta.catalog??[]).map(c=>h('option',{key:c.id,value:c.id,disabled:c.id!==r.itemId&&rows.some(row=>row.itemId===c.id)},c.name)))),num('Şans %',r.chance,v=>change(a=>{a[i].chance=v;}),0,100,.01),num('En az',r.min,v=>change(a=>{a[i].min=v;}),1,stack?1000:1),num('En çok',r.max,v=>change(a=>{a[i].max=v;}),1,stack?1000:1),button('Kaldır',()=>change(a=>a.splice(i,1))));
  }),button('Ödül ekle',()=>{const item=meta.catalog?.find(c=>!rows.some(r=>r.itemId===c.id));if(item)change(a=>a.push({itemId:item.id,chance:10,min:1,max:1}));},{disabled:disabled||rows.length>=16||!(meta.catalog??[]).some(c=>!rows.some(r=>r.itemId===c.id))}));
  if(!draft)return h('section',{className:'admin-card tower18-admin mist24-admin'},h('style',null,css+MIST_ADMIN_CSS),h('h2',null,'Sis Yarığı'),h('p',{role:'status'},message||'Yükleniyor…'),button('Yeniden yükle',()=>call('sis_mist_get')));
  const e=draft.enemies[kind],spawnFields={area:spawn.area,channel:spawn.channel,x:spawn.x,y:spawn.y,gold:spawn.gold};
  const sections={general:'Genel',enemies:'Düşmanlar ve ganimet',chest:'Sis Sandıkları',spawn:'Portal gönder / planla'};
  const reload=()=>{if(!dirty||confirm('Kaydedilmemiş Sis Yarığı değişiklikleri silinsin mi?'))void call('sis_mist_get');};
  return h('section',{className:'admin-card tower18-admin mist24-admin',ref:container},h('style',null,css+MIST_ADMIN_CSS),h('h2',null,'Sis Yarığı'),h('p',{className:'tower18-muted'},'En fazla 4 oyuncu · PvP açık · Ölümde Pazar Köyü · İstendiğinde çıkış'),message&&h('p',{role:'status',className:'tower18-status'},message),retry&&button('Bekleyen portal işlemini yeniden sorgula',()=>call(retry.action,retry.extra)),h('nav',{className:'tower18-nav','aria-label':'Sis Yarığı ayarları'},...Object.entries(sections).map(([k,label])=>button(label,()=>setTab(k),{key:k,'aria-pressed':tab===k}))),
   tab==='general'?h(React.Fragment,null,
    check('Portal üretimi açık',draft.enabled,v=>edit(d=>d.enabled=v)),
    h('div',{className:'tower18-fields'},...Object.entries({minLevel:['Asgari seviye',1,100,1],chancePercent:['Kesim başına portal %',0,100,.01],goldChancePercent:['Açılan portalın altın olma %',0,100,.01],portalSeconds:['Portal açık kalma (sn)',5,300,1],durationSeconds:['İçeride süre (sn)',60,3600,1],maxPlayers:['Oyuncu sınırı',1,4,1],maxActivePerChannel:['Kanal başına yarık sınırı',1,25,1],killCooldownSeconds:['Kanal başına portal aralığı (sn)',0,3600,1],xpMultiplier:['XP çarpanı',0,10,.1],essenceMultiplier:['Öz çarpanı',0,10,.1]}).map(([key,[label,min,max,step]])=>h(React.Fragment,{key},num(label,draft[key],v=>edit(d=>d[key]=v),min,max,step)))),
    h('fieldset',null,h('legend',null,'Portal çıkabilecek haritalar'),h('p',{className:'tower18-muted'},'Oto Av Adası ve test botları portal üretemez.'),...Object.entries(meta.maps??{}).map(([k,label])=>h(React.Fragment,{key:k},check(label,draft.maps.includes(k),v=>edit(d=>{d.maps=v?[...d.maps,k]:d.maps.filter(x=>x!==k);}))))),
    h('fieldset',null,h('legend',null,'Rastgele görev havuzu'),h('p',null,'Her yarık için açık görevlerden biri otomatik seçilir. Oyuncuya görev seçtirilmez. En az bir görev açık kalmalı.'),...Object.entries({clear:'Canavarları temizle ve mühürlü sandığı aç',seals:'Üç mührü kır ve gizli bossu yen',hunt:'Gezgin nadir yaratığı bul ve yen'}).map(([k,label])=>h(React.Fragment,{key:k},check(label,draft.objectives[k],v=>edit(d=>d.objectives[k]=v))))),
    h('fieldset',null,h('legend',null,'Oyuncuya göre düşman ölçeği'),h('p',null,'İlk girenin seviyesi, azami canı ve saldırısı üzerinden; tur boyunca sabit.'),h('div',{className:'tower18-fields'},...Object.entries({level:'Seviye katsayısı',hp:'Can katsayısı',attack:'Saldırı katsayısı',maximum:'Azami çarpan'}).map(([key,label])=>h(React.Fragment,{key},num(label,draft.scale[key],v=>edit(d=>d.scale[key]=v),key==='maximum'?1:0,key==='maximum'?100:key==='hp'?.1:1,key==='maximum'?1:.00001)))))):
   tab==='enemies'?h(React.Fragment,null,h('nav',{className:'tower18-nav','aria-label':'Düşman türü'},...Object.entries(meta.kinds??{}).map(([k,label])=>button(label,()=>setKind(k),{key:k,'aria-pressed':kind===k}))),h('p',{className:'tower18-muted'},'Her düşmanın temel gücü, sayısı ve ödülü ayrıdır. Can ve saldırıya oyuncu ölçeği uygulanır; XP ve öz ayrıca genel çarpanları kullanır.'),h('div',{className:'tower18-fields'},...Object.entries({count:['Sayı',1,30],hp:['Can',1,100000000],damage:['Hasar',0,1000000],speed:['Hız',0,240],attackMs:['Saldırı aralığı (ms)',600,60000],xp:['XP',0,1000000],essence:['Öz',0,100000],gems:['Mücevher',0,100000]}).map(([key,[label,min,max]])=>h(React.Fragment,{key},kind==='seal'&&key==='count'?h('p',null,'Mühür sayısı: 3'):num(label,e[key],v=>edit(d=>d.enemies[kind][key]=v),min,max)))),h('h3',null,'Düşen eşyalar'),drops(e.drops,fn=>edit(d=>fn(d.enemies[kind].drops)))):
   tab==='chest'?h(React.Fragment,null,h('h3',null,'Sis Sandığı'),drops(draft.chest,fn=>edit(d=>fn(d.chest))),h('h3',null,'Altın Sis Sandığı'),drops(draft.goldChest,fn=>edit(d=>fn(d.goldChest))),h('p',null,'Oranlar her eşya için ayrı düşme olasılığıdır. Kuleye özel malzemeler bu listede bulunmaz. Bitirme ödülü mücadeleye katılan oyuncuya bir kez verilir.')):
   h(React.Fragment,null,h('p',null,'Manuel portal seçtiğin kanalda açılır. Zamanlar Türkiye saatidir (UTC+3). Kanal kapasitesi doluysa plan bekler; ikinci portal oluşturulmaz.'),!meta.config?.enabled&&h('p',{className:'tower18-status'},'Portal üretimi kapalı. Önce Genel bölümünden açıp kaydet.'),h('div',{className:'tower18-fields'},h('label',null,'Harita',h('select',{value:spawn.area,disabled,onChange:e=>{const area=e.target.value;setSpawn(s=>({...s,area,...(meta.spawnPoints?.[area]??{})}));}},...Object.entries(meta.maps??{}).map(([k,label])=>h('option',{key:k,value:k},label)))),num('Kanal',spawn.channel,v=>setSpawn(s=>({...s,channel:v})),1,4),num('X',spawn.x,v=>setSpawn(s=>({...s,x:v}))),num('Y',spawn.y,v=>setSpawn(s=>({...s,y:v}))),check('Altın portal',spawn.gold,v=>setSpawn(s=>({...s,gold:v}))),h('label',null,'Tarih ve saat (Türkiye · UTC+3)',h('input',{type:'datetime-local',value:spawn.when,disabled,onChange:e=>setSpawn(s=>({...s,when:e.target.value}))}))),h('p',{className:'tower18-muted'},'Harita değişince yürünebilir örnek konum gelir. İstersen X ve Y konumunu değiştirebilirsin.'),h('div',{className:'tower18-nav'},button('Şimdi gönder',()=>{if(valid())void call('sis_mist_spawn',spawnFields);},{disabled:disabled||!meta.config?.enabled}),button('Planla',()=>{if(valid())void call('sis_mist_schedule',{...spawnFields,at_ms:mistScheduleTimestamp(spawn.when)});},{disabled:disabled||!meta.config?.enabled||!Number.isFinite(mistScheduleTimestamp(spawn.when))})),h('h3',null,'Bekleyen portal planları'),!(meta.schedules??[]).length&&h('p',null,'Bekleyen plan yok.'),...(meta.schedules??[]).map(s=>h('div',{className:'mist24-schedule',key:s.id},h('span',null,(meta.maps?.[s.area]??s.area)+' · Kanal '+s.channel+' · '+new Date(s.at_ms).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})+' · '+(s.gold?'Altın Sis Yarığı':'Sis Yarığı')+' · X '+s.x+' / Y '+s.y),button('İptal',()=>call('sis_mist_cancel',{id:s.id}))))),
   h('div',{className:'tower18-save'},button('Sis Yarığı ayarlarını kaydet',()=>{if(valid())void call('sis_mist_save',{revision,config:draft});},{disabled:disabled||!dirty}),button('Canlı ayarları yükle',reload),h('small',null,dirty?'Kaydedilmemiş ayarların var. Portal gönderme bu taslağı değiştirmez.':'Yeni ayarlar yalnız yeni yarıklara uygulanır.')));
 };
}

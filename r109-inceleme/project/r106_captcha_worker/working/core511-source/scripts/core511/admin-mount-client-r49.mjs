// The patcher injects MOUNT_ITEMS from mounts-model.mjs as the second argument.
// Keep this factory self-contained so the admin bundle gains no runtime import.
export function createMountGrantAdminR49(React,catalog){
 const h=React.createElement,storageKey='core511.r49.mountGrant.pending',find=kind=>catalog.find(item=>item.kind===kind);
 const css='.mount49-admin{min-width:0}.mount49-admin p{line-height:1.5;overflow-wrap:anywhere}.mount49-admin-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.mount49-admin-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.mount49-admin-controls select,.mount49-admin-controls input{width:100%;min-width:0;box-sizing:border-box;min-height:42px}.mount49-admin button{min-height:42px;white-space:normal}.mount49-admin-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}.mount49-admin small{color:#c6bca8}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&find(job.kind)&&Number.isSafeInteger(job.amount)&&job.amount>0&&job.amount<=find(job.kind).cap&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 return function MountGrantAdminR49({player,busy,act}){
  const [kind,setKind]=React.useState(catalog[0].kind),[amount,setAmount]=React.useState(catalog[0].cap),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState(''),[enabled,setEnabled]=React.useState(null),[optionError,setOptionError]=React.useState(false);
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);fetch('/api/core511-r49-options',{cache:'no-store',credentials:'same-origin',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('options');const flags=await response.json();if(mounted.current)setEnabled(flags.mounts===true);}).catch(()=>{if(mounted.current)setOptionError(true);}).finally(()=>clearTimeout(timer));return()=>{mounted.current=false;controller.abort();clearTimeout(timer);};},[]);
  const save=job=>{held.current=job;if(mounted.current)setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy||enabled!==true)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   const item=find(kind);
   if(!retry&&(!player?.id||!item||!Number.isSafeInteger(amount)||amount<1||amount>item.cap)){setMessage('Oyuncu ve malzeme seç; geçerli bir adet yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,kind,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_mount_material_r49',playerId:job.playerId,kind:job.kind,amount:job.amount,requestId:job.requestId}),result=data?.mountGrant;
    if(!result||result.ok!==true||result.requestId!==job.requestId||result.playerId!==job.playerId||result.kind!==job.kind||result.amount!==job.amount||!Number.isSafeInteger(result.balance))throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(job.playerName+': '+result.amount+' '+find(job.kind).label+' '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' Toplam: '+result.balance+'.');
   }catch(error){
    // A lost reply can follow COMMIT. Retain the exact request across retries
    // and reloads until a receipt confirms it or a definite rejection arrives.
    if([400,404,413,415,422].includes(error?.status)||error?.payload?.code==='mount_material_cap')save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  if(enabled===false)return null;
  if(enabled!==true)return optionError?h('section',{className:'admin-card'},h('h2',null,'Binek Görevi Malzemeleri'),h('p',{role:'status'},'Binek durumu alınamadı. Paneli yenileyip tekrar dene.')):null;
  const item=find(kind),disabled=!!busy||sending;
  return h('section',{className:'admin-card mount49-admin'},h('style',null,css),h('h2',null,'Binek Görevi Malzemeleri'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'),h('p',null,'Av mühürleri, boss belgeleri ve bütün eyer malzemeleri oyuncuya bağlı görev çantasına gider. Çevrimdışı oyuncuya da gönderebilirsin.'),h('div',{className:'mount49-admin-controls'},h('label',null,'Malzeme / görev belgesi',h('select',{value:kind,disabled:disabled||!!pending,onChange:event=>{const next=find(event.target.value);if(next){setKind(next.kind);setAmount(next.cap);}}},catalog.map(entry=>h('option',{key:entry.kind,value:entry.kind},entry.label+' · En çok '+entry.cap)))),h('label',null,'Adet',h('input',{type:'number',inputMode:'numeric',min:1,max:item.cap,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1||amount>item.cap,onClick:()=>void send()},sending?'Gönderiliyor…':'Oyuncuya gönder')),h('p',null,h('small',null,'Hızlı test: 30. seviyedeki oyuncuyla Seyis’ten görev al. Üç av mührünü, iki farklı boss belgesini ve üç eyer malzemesini gönder; oyuncu eyeri üretsin ve bineği evcilleştirsin. Sadece evcilleştirmeyi denemek için Evcilleştirme Eyeri gönderebilirsin.')),pending&&h('div',{className:'mount49-admin-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount+' '+find(pending.kind).label),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'mount49-admin-status',role:'status'},message));
 };
}

export function createAzrailGrantAdminR31(React){
 const h=React.createElement,storageKey='core511.r31.azrailGrant.pending';
 const css='.azrail31-card{min-width:0}.azrail31-heading{display:flex;align-items:center;gap:12px}.azrail31-icon{width:58px;height:58px;flex:none}.azrail31-card p{overflow-wrap:anywhere;line-height:1.5}.azrail31-controls{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.azrail31-controls label{display:grid;gap:6px;min-width:0;flex:1 1 160px}.azrail31-controls input{width:100%;min-width:0;box-sizing:border-box}.azrail31-controls button{min-height:42px;white-space:normal}.azrail31-status{padding:10px;border:1px solid #76633b;border-radius:6px;background:#201e16}';
 const valid=job=>job&&typeof job.playerId==='string'&&job.playerId.length>0&&typeof job.playerName==='string'&&Number.isSafeInteger(job.amount)&&job.amount>0&&typeof job.requestId==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(job.requestId);
 const restore=()=>{try{const value=JSON.parse(sessionStorage.getItem(storageKey));return valid(value)?value:null;}catch{return null;}};
 const chest=()=>h('svg',{className:'azrail31-icon',viewBox:'0 0 64 64',role:'img','aria-label':'Azrail Sandığı'},h('path',{d:'M9 29Q9 12 25 12H39Q55 12 55 29V51H9Z',fill:'#282b32',stroke:'#c9a36a',strokeWidth:3}),h('path',{d:'M9 29H55M21 14V50M43 14V50',stroke:'#937140',strokeWidth:3}),h('path',{d:'M27 26H37V40H27Z',fill:'#d1ad68',stroke:'#f4daa4',strokeWidth:2}),h('path',{d:'M32 29L35 33L32 37L29 33Z',fill:'#8b343d'}));
 return function AzrailGrantAdmin({player,busy,act}){
  const [amount,setAmount]=React.useState(1),[pending,setPending]=React.useState(restore),[sending,setSending]=React.useState(false),[message,setMessage]=React.useState('');
  const held=React.useRef(pending),lock=React.useRef(false),mounted=React.useRef(true);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const save=job=>{held.current=job;setPending(job);try{if(job)sessionStorage.setItem(storageKey,JSON.stringify(job));else sessionStorage.removeItem(storageKey);}catch{}};
  const send=async(retry=false)=>{
   if(lock.current||busy)return;
   if(!retry&&held.current){setMessage('Önce bekleyen gönderimi yeniden sorgula.');return;}
   if(!retry&&(!player?.id||!Number.isSafeInteger(amount)||amount<1)){setMessage('Oyuncu seç ve pozitif bir tam sayı yaz.');return;}
   const job=held.current??{playerId:player.id,playerName:player.name,amount,requestId:crypto.randomUUID()};
   if(!valid(job)){setMessage('Bekleyen gönderim okunamadı. Paneli yenile.');return;}
   lock.current=true;setSending(true);setMessage('');save(job);
   try{
    const data=await act({action:'grant_azrail_chests',playerId:job.playerId,amount:job.amount,requestId:job.requestId}),result=data?.azrailGrant;
    if(!result||result.requestId!==job.requestId||result.playerId!==job.playerId||result.amount!==job.amount)throw Error('Gönderim sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.');
    save(null);if(mounted.current)setMessage(result.playerName+': '+result.amount.toLocaleString('tr-TR')+' Azrail Sandığı '+(result.replayed?'daha önce gönderilmişti; tekrar eklenmedi.':'gönderildi.')+' İşlem sonrası toplam: '+result.balance.toLocaleString('tr-TR')+'.');
   }catch(error){
    // A queue/transport failure may follow COMMIT. Keep the exact request until
    // the durable receipt confirms it; never silently replace a pending gift.
    if([400,404,413,422].includes(error?.status))save(null);
    if(mounted.current)setMessage(error?.message??'Yanıt alınamadı. Aynı işlemi yeniden sorgula.');
   }finally{lock.current=false;if(mounted.current)setSending(false);}
  };
  const disabled=!!busy||sending;
  return h('section',{className:'admin-card azrail31-card'},h('style',null,css),h('div',{className:'azrail31-heading'},chest(),h('div',null,h('h2',null,'Azrail Sandığı Gönder'),h('p',null,player?player.name+' · Seçili oyuncu':'Oyuncular listesinden bir oyuncu seç.'))),h('p',null,'Sandıklar oyuncunun çantasına eklenir. Çevrimdışı oyunculara da gönderebilirsin.'),h('div',{className:'azrail31-controls'},h('label',null,'Sandık adedi',h('input',{type:'number',inputMode:'numeric',min:1,max:Number.MAX_SAFE_INTEGER,step:1,required:true,value:amount,disabled:disabled||!!pending,onChange:event=>setAmount(event.target.value===''?'':Number(event.target.value))})),h('button',{type:'button',className:'admin-primary',disabled:disabled||!!pending||!player?.id||!Number.isSafeInteger(amount)||amount<1,onClick:()=>void send()},sending?'Gönderiliyor…':'Sandıkları gönder')),pending&&h('div',{className:'azrail31-status'},h('p',null,'Bekleyen gönderim: '+pending.playerName+' · '+pending.amount.toLocaleString('tr-TR')+' sandık'),h('button',{type:'button',disabled,onClick:()=>void send(true)},'Aynı gönderimi yeniden sorgula')),message&&h('p',{className:'azrail31-status',role:'status'},message));
 };
}

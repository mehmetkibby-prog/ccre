// R32 AFK verification presentation. The server owns answer selection, deadlines
// and locks. No answer metadata or item-name-to-image mapping belongs here.
const noncePattern=/^[A-Za-z0-9_-]{24,128}$/;
export function afkPublicState(value){
 const enabled=value?.enabled===true,settingsRevision=value?.settingsRevision??value?.settings?.revision;
 const out={enabled,locked:enabled&&value?.locked===true,blocked:enabled&&value?.blocked===true,blockedUntil:enabled&&Number.isSafeInteger(value?.blockedUntil)&&value.blockedUntil>0?value.blockedUntil:0,revision:Number.isSafeInteger(value?.revision)?value.revision:null,settingsRevision:Number.isSafeInteger(settingsRevision)?settingsRevision:null,serverTime:Number.isFinite(value?.serverTime)?value.serverTime:null,challenge:null};
 if(!enabled)return out;
 const q=value.challenge;
 if(q&&typeof q.nonce==='string'&&noncePattern.test(q.nonce)&&typeof q.prompt==='string'&&q.prompt.length<=240&&Number.isFinite(q.deadline)&&Array.isArray(q.images)&&q.images.length===4&&q.images.every((url,i)=>url===`/afk/${q.nonce}/${i+1}`)){
  out.challenge={nonce:q.nonce,prompt:q.prompt,deadline:q.deadline,images:[...q.images],attempt:Number.isInteger(q.attempt)?Math.max(0,q.attempt):0,maxAttempts:Number.isInteger(q.maxAttempts)?Math.max(1,q.maxAttempts):3};
  out.blocked=true;
 }
 return out;
}
export function afkClock(seconds){const n=Math.max(0,Math.ceil(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export function createAfkController({post,now=()=>performance.now(),wallNow=()=>Date.now(),onState=()=>{}}){
 let state={...afkPublicState(null),busy:false,message:'',seconds:0},clock=null,flight=null,disposed=false,generation=0;
 const emit=patch=>{state={...state,...patch};if(!disposed)onState({...state});};
 function update(value){
  // Optional projection omissions cannot release an active server-owned lock.
  if(value==null)return false;
  const next=afkPublicState(value);
  // Global settings come first: an old answer cannot resurrect the UI after
  // an administrative disable. Within one settings version, player revisions
  // prevent an older projection from reviving a settled question or lock.
  const knownConfig=Number.isSafeInteger(state.settingsRevision),nextConfig=Number.isSafeInteger(next.settingsRevision);
  if(knownConfig&&(nextConfig?next.settingsRevision<state.settingsRevision:next.enabled))return false;
  const sameConfig=next.settingsRevision===state.settingsRevision;
  if(sameConfig&&Number.isSafeInteger(next.revision)&&Number.isSafeInteger(state.revision)&&next.revision<state.revision)return false;
  // An absent optional frame field can hide the card during a reconnect;
  // retain the ordering watermarks rather than forgetting a prior disable.
  if(!nextConfig&&knownConfig)next.settingsRevision=state.settingsRevision;
  if(!Number.isSafeInteger(next.revision)&&Number.isSafeInteger(state.revision))next.revision=state.revision;
  const previous=state.challenge?.nonce,changed=previous!==next.challenge?.nonce||state.enabled!==next.enabled||state.locked!==next.locked||state.blockedUntil!==next.blockedUntil;
  const deadline=next.blockedUntil||next.challenge?.deadline,key=next.blockedUntil?'lock:'+next.blockedUntil:next.challenge?.nonce;
  if(deadline&&clock?.key!==key){clock={key,at:now(),remaining:Math.max(0,deadline-(next.serverTime??wallNow()))};}
  else if(!deadline)clock=null;
  // Preserve the original monotonic countdown when repeated frames carry the
  // same challenge; wall-clock changes cannot extend the displayed deadline.
  emit({...next,...changed?{message:''}:{}});tick();return true;
 }
 function tick(){const seconds=clock?Math.max(0,Math.ceil((clock.remaining-(now()-clock.at))/1000)):0;if(seconds!==state.seconds)emit({seconds});}
 async function submit(input){
  if(disposed||flight)return;
  const mine=++generation;flight=mine;emit({busy:true,message:'Yanıt sunucuya iletiliyor…'});
  try{
   const result=await post('/api/action',input);if(disposed||mine!==generation)return;
   if(result?.afkCheck&&update(result.afkCheck)===false)return;
   if(result?.ok===false||result?.error)throw Object.assign(Error(result.error??result.message??'Doğrulama tamamlanamadı.'),{payload:result});
   emit({message:typeof result?.message==='string'?result.message:state.challenge?'Yeni sorudaki resmi seç.':'Doğrulama tamamlandı.'});
  }catch(error){
   if(disposed||mine!==generation)return;
   const body=error?.payload??error?.body;if(body?.afkCheck&&update(body.afkCheck)===false)return;
   emit({message:String(body?.error??body?.message??error?.message??'Bağlantı yenileniyor. Güncel soruyu bekle.').slice(0,300)});
  }finally{if(mine===generation){flight=null;emit({busy:false});}}
 }
 function answer(choice){if(!state.enabled||!state.challenge||!Number.isInteger(choice)||choice<1||choice>4)return;return submit({action:'afk_answer',nonce:state.challenge.nonce,choice});}
 function recover(){if(!state.enabled||!state.locked||state.challenge||state.blockedUntil)return;return submit({action:'afk_recover'});}
 return {update,tick,answer,recover,dispose(){disposed=true;generation++;flight=null;clock=null;},get state(){return {...state};}};
}
export const AFK_CSS_R32=`
.afk32-card{position:fixed;right:20px;top:calc(82px + env(safe-area-inset-top,0px));z-index:48;box-sizing:border-box;width:344px;max-width:calc(100vw - 24px);padding:17px;border:1px solid #b3985c;border-radius:14px;background:linear-gradient(145deg,#172b24f5,#091713fa);color:#eee5cc;box-shadow:0 12px 36px #0008;pointer-events:auto;font:14px/1.4 system-ui;text-align:left;isolation:isolate}
.afk32-card *{box-sizing:border-box}.afk32-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0;margin:0 0 11px;text-align:left}.afk32-card header strong{color:#ebce88;font:700 11px/1.2 system-ui;letter-spacing:1.2px}.afk32-clock{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;padding:4px 8px;border:1px solid #6c7958;border-radius:6px;background:#273b2e;color:#e8d8a5;font:700 14px/1.2 ui-monospace,monospace;font-variant-numeric:tabular-nums}.afk32-clock.afk32-urgent{color:#ffbc9e;border-color:#a96a54;background:#482c26}.afk32-card h2{padding:0;margin:0 0 12px;color:#f5ead0;font:600 17px/1.35 system-ui;overflow-wrap:anywhere}.afk32-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.afk32-card button{font:600 12px/1.25 system-ui;touch-action:manipulation;cursor:pointer}.afk32-choice{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;min-height:78px;padding:7px 3px;border:1px solid #657256;border-radius:9px;background:linear-gradient(150deg,#314737,#17291f);color:#b6c6ac;box-shadow:inset 0 1px #b1c28c12}.afk32-choice img{display:block;width:50px;height:50px;max-width:100%;object-fit:contain;pointer-events:none;user-select:none}.afk32-choice span{font:600 10px/1 system-ui;margin-top:4px}.afk32-choice:hover{border-color:#e8c987;background:#3b5038}.afk32-choice:focus-visible,.afk32-recover:focus-visible{outline:3px solid #edcf85;outline-offset:3px}.afk32-choice:disabled{opacity:.55;cursor:wait}.afk32-help{margin:11px 0 0;color:#b8c4b4;font-size:11px;line-height:1.45;overflow-wrap:anywhere}.afk32-state{margin:9px 0 0;color:#f3c78b;font-size:12px;overflow-wrap:anywhere}.afk32-recover{display:block;width:100%;min-height:44px;margin-top:12px;padding:10px 12px;border:1px solid #bb9c5b;border-radius:8px;background:linear-gradient(135deg,#6e5931,#3e3925);color:#fff0c6}.afk32-recover:disabled{opacity:.55}.afk32-card.afk32-locked{border-color:#c38463}.afk32-lock-note{margin:0;color:#d0d5c4;font-size:13px;overflow-wrap:anywhere}
@media(max-width:600px){.afk32-card{top:calc(74px + env(safe-area-inset-top,0px));right:12px;width:320px;padding:13px}.afk32-card h2{font-size:16px}.afk32-choices{gap:7px}.afk32-choice{min-height:76px}.afk32-choice img{width:48px;height:48px}}
@media(max-height:500px){.afk32-card{top:calc(12px + env(safe-area-inset-top,0px));right:12px;width:310px;padding:10px 12px}.afk32-card h2{font-size:14px;margin-bottom:8px}.afk32-card header{margin-bottom:7px}.afk32-choice{min-height:62px;padding:3px}.afk32-choice img{width:42px;height:42px}.afk32-help{margin-top:7px;font-size:10px}}
`;
export function createAfkUI(React,{Portal}={}){
 const h=React.createElement;
 function Panel({state,onAnswer,onRecover}){
  if(!state.enabled||!state.locked&&!state.challenge)return null;
  const q=state.challenge,cooldown=state.blockedUntil>0;
  return h('aside',{className:'afk32-card'+(state.locked?' afk32-locked':''),'aria-label':'Oyuncu doğrulaması',onPointerDown:e=>e.stopPropagation(),onKeyDown:e=>e.stopPropagation()},
   h('header',null,h('strong',null,'OYUNCU DOĞRULAMASI'),(q||cooldown)&&h('span',{className:'afk32-clock'+(state.seconds<=30?' afk32-urgent':''),role:'timer','aria-label':cooldown?'Kilit süresi':'Kalan süre'},afkClock(state.seconds))),
   h('h2',null,cooldown?'2 dakikalık bekleme':q?q.prompt:'Doğrulama gerekli'),
   q?h('div',{className:'afk32-choices','aria-label':'Bir resim seç'},...q.images.map((src,i)=>h('button',{key:q.nonce+':'+i,type:'button',className:'afk32-choice',disabled:state.busy,onClick:()=>onAnswer(i+1),'aria-label':`${i+1}. resmi seç`},h('img',{src,alt:'',width:50,height:50,draggable:false,referrerPolicy:'same-origin'}),h('span',{'aria-hidden':true},String(i+1))))):h('p',{className:'afk32-lock-note'},cooldown?'Yanlış deneme sınırına ulaştın. Süre bitene kadar hareket ve saldırı kapalı.':'Canavarlara saldırmaya devam etmek için kısa doğrulamayı tamamla.'),
   q&&h('p',{className:'afk32-help'},'Doğrulama bitene kadar hareket ve saldırı kapalı. ',q.attempt>0?`Deneme: ${q.attempt} / ${q.maxAttempts}.`:''),
   !q&&!cooldown&&h('button',{type:'button',className:'afk32-recover',disabled:state.busy,onClick:onRecover},state.busy?'Hazırlanıyor…':'Doğrulamayı yap'),
   state.message&&h('p',{className:'afk32-state',role:'status','aria-live':'polite'},state.message),
   (q||cooldown)&&state.seconds===0&&h('p',{className:'afk32-state',role:'status'},cooldown?'Süre doldu. Kilit kaldırılıyor…':'Süre doldu. Sunucu sonucu bekleniyor.'));
 }
 function Entry({world,post,own,onBlocked}){
  const [state,setState]=React.useState({...afkPublicState(null),busy:false,seconds:0,message:''}),control=React.useRef(null),callbacks=React.useRef({post}),latest=React.useRef(world?.afkCheck);
  callbacks.current={post,onBlocked};latest.current=world?.afkCheck;
  React.useEffect(()=>{const c=createAfkController({post:(...args)=>callbacks.current.post(...args),onState:next=>{callbacks.current.onBlocked?.(next.enabled&&next.blocked);setState(next);}});control.current=c;c.update(latest.current);return()=>{c.dispose();callbacks.current.onBlocked?.(false);if(control.current===c)control.current=null;};},[own?.id]);
  React.useEffect(()=>{control.current?.update(world?.afkCheck);},[world?.afkCheck]);
  React.useEffect(()=>{if(!state.challenge&&!state.blockedUntil)return;const timer=setInterval(()=>control.current?.tick(),250);return()=>clearInterval(timer);},[state.challenge?.nonce,state.blockedUntil]);
  if(!state.enabled||!state.locked&&!state.challenge)return null;
  const panel=h(Panel,{state,onAnswer:choice=>control.current?.answer(choice),onRecover:()=>control.current?.recover()});
  return h(React.Fragment,null,h('style',null,AFK_CSS_R32),Portal?Portal(panel,document.body):panel);
 }
 return {Entry,Panel};
}

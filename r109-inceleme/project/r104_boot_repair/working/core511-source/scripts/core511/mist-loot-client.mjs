// R31: presentation and receipt-safe interaction for server-owned Sis loot.
// Never changes economy, removes a projected chest, or predicts a reward.
export const MIST_LOOT_MS=3000;
export const MIST_LOOT_REACH=120;
export const MIST_LOOT_OPEN='core511:mist-loot-open';
export const MIST_LOOT_CANCEL='core511:mist-loot-cancel';
const activeCollectors=new Set();
const finite=Number.isFinite;
const terminal=error=>Number(error?.status)>=400&&Number(error?.status)<500&&error?.payload?.code!=='command_outcome_unknown'&&error?.body?.code!=='command_outcome_unknown';
const label=value=>Array.from(String(value??'Oyuncu').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'')).slice(0,32).join('')||'Oyuncu';
export function mistLootName(row){return label(row?.ownerName)+' · Sandık';}
export function mistLootRows(world){
 const run=world?.adventure511?.run;if(run?.kind!=='mist'||run.area!==world?.area)return [];
 return (world.adventure511.loot??[]).filter(row=>row&&typeof row.id==='string'&&row.runId===run.id&&row.area===world.area&&row.channel===world.channel&&finite(row.x)&&finite(row.y));
}
export function mistLootHit(world,x,y){
 if(!finite(x)||!finite(y))return null;
 let chosen=null,distance=Infinity;
 for(const row of mistLootRows(world)){if(Math.abs(x-row.x)>42||y<row.y-65||y>row.y+12)continue;const d=Math.hypot(x-row.x,y-(row.y-25));if(d<distance){chosen=row;distance=d;}}
 return chosen;
}
export function activateMistLoot(row,target=globalThis.window){if(row?.id&&target?.dispatchEvent)target.dispatchEvent(new CustomEvent(MIST_LOOT_OPEN,{detail:{id:row.id}}));}
// Called only for real movement/attack/disconnect signals, not every render.
export function cancelMistLoot(reason='interrupted'){for(const cancel of activeCollectors)cancel(reason);}
export function drawMistLoot(ctx,world,_now,visible){
 for(const row of mistLootRows(world)){
  if(visible&&!visible(row.x,row.y,140))continue;
  ctx.save();ctx.translate(row.x,row.y);ctx.fillStyle='#b6decb28';ctx.beginPath();ctx.ellipse(0,3,39,12,0,0,Math.PI*2);ctx.fill();
  // A clear, compact world-space chest; no external image fetch on hot frames.
  ctx.lineJoin='round';ctx.lineWidth=2;ctx.fillStyle='#32271b';ctx.strokeStyle='#c7a36c';ctx.beginPath();ctx.moveTo(-31,-26);ctx.lineTo(-31,-42);ctx.quadraticCurveTo(0,-65,31,-42);ctx.lineTo(31,-26);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#664427';ctx.fillRect(-31,-27,62,29);ctx.strokeRect(-31,-27,62,29);ctx.fillStyle='#b68c4e';ctx.fillRect(-24,-44,6,46);ctx.fillRect(18,-44,6,46);ctx.fillStyle='#ead191';ctx.fillRect(-7,-30,14,17);ctx.fillStyle='#213d35';ctx.fillRect(-3,-25,6,7);
  ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#08110f';ctx.fillStyle='#f1ddad';const name=mistLootName(row);ctx.strokeText(name,0,-70,200);ctx.fillText(name,0,-70,200);ctx.restore();
 }
}
function contextOf(input){
 const world=input?.world,own=input?.own,run=world?.adventure511?.run;
 return {world,own,run,key:JSON.stringify([own?.id,world?.area,world?.channel,run?.id]),valid:!!own?.id&&own.hp>0&&run?.kind==='mist'&&run.area===world.area&&!input?.uiSuspended,x:own?.x,y:own?.y,hp:own?.hp,hpRevision:own?.hp_revision??own?.hpRevision,positionRevision:own?.position_revision??own?.positionRevision};
}
function unchanged(before,after){
 return after.valid&&before.key===after.key&&before.hp===after.hp&&before.hpRevision===after.hpRevision&&before.positionRevision===after.positionRevision&&before.x===after.x&&before.y===after.y;
}
export function createMistLootController({post,getContext,now=()=>performance.now(),uuid=()=>crypto.randomUUID(),onState=()=>{},onChange=()=>{}}){
 let state={phase:'idle',progress:0,message:''},operation=null,generation=0,disposed=false;
 const publish=patch=>{state={...state,...patch};if(operation&&!operation.finishSent&&!disposed)activeCollectors.add(cancel);else activeCollectors.delete(cancel);if(!disposed)onState({...state});};
 const cancelRemote=token=>{if(!token)return;Promise.resolve().then(()=>post('/api/action',{action:'adventure_loot_cancel',requestId:uuid(),token})).catch(()=>{});};
 const normalError=error=>String(error?.payload?.error??error?.body?.error??error?.message??'İşlem tamamlanamadı.');
 const postResult=async body=>{const result=await post('/api/action',body);if(result?.error||result?.ok===false)throw Object.assign(Error(result.error??result.message??'İşlem tamamlanamadı.'),{status:result.status??409,payload:result});return result;};
 function cancel(reason='interrupted'){
  const op=operation;if(!op)return;
  // Once finish was sent, only its receipt can decide the outcome. Interrupt
  // the bar, retain the same receipt for retry, and never submit a new reward.
  if(op.finishSent){op.interrupted=true;publish({progress:0,message:'Sandık sonucu sunucudan doğrulanıyor.'});return;}
  generation++;operation=null;cancelRemote(op.token);publish({phase:'idle',progress:0,chest:null,message:reason==='taken'?'Sandık artık burada değil.':'Sandık toplama kesildi.'});
 }
 async function beginRequest(op){
  if(op.inFlight||operation!==op)return;op.inFlight=true;publish({phase:'starting',progress:0,message:'Sandık hazırlanıyor…'});
  try{
   const result=await postResult({action:'adventure_loot_begin',requestId:op.beginId,chestId:op.chest.id});
   if(operation!==op||op.generation!==generation||disposed){cancelRemote(result?.token);return;}
   if(typeof result?.token!=='string'||!result.token||result.chestId!==op.chest.id||!finite(result.startedAt)||!finite(result.readyAt)||result.readyAt-result.startedAt!==MIST_LOOT_MS)throw Error('Sandık süresi sunucudan doğrulanamadı.');
   op.token=result.token;
   if(!unchanged(op.context,contextOf(getContext()))){cancel('interrupted');return;}
   // Begin is stamped when the server processes it. Waiting a full monotonic
   // 3 seconds AFTER receipt is conservative under latency and clock skew.
   // The server separately enforces readyAt; wall-clock edits cannot grant loot.
   op.receivedAt=now();op.finishId=uuid();publish({phase:'channeling',progress:0,message:'Sandık açılıyor · Hareket etme'});
  }catch(error){
   if(operation!==op||disposed)return;
   if(terminal(error)){operation=null;publish({phase:'error',progress:0,message:normalError(error)});}
   else publish({phase:'retry_begin',progress:0,message:'Bağlantı sonucu belirsiz. Aynı işlemi yeniden sorgula.'});
  }finally{op.inFlight=false;}
 }
 async function finishRequest(op){
  if(op.inFlight||operation!==op||!op.token)return;op.inFlight=true;op.finishSent=true;publish({phase:'confirming',progress:op.interrupted?0:1,message:'Sunucu onayı bekleniyor…'});
  try{
   const result=await postResult({action:'adventure_loot_finish',requestId:op.finishId,chestId:op.chest.id,token:op.token});
   if(operation!==op||disposed)return;
   if(result?.collected!==true||result.chestId!==op.chest.id)throw Error('Sandık sonucu doğrulanamadı.');
   operation=null;onChange();publish({phase:'complete',progress:1,message:result.message??'Sandık toplandı.'});
  }catch(error){
   if(operation!==op||disposed)return;
   if(terminal(error)){operation=null;onChange();publish({phase:'error',progress:0,message:normalError(error)});}
   else publish({phase:'retry_finish',progress:op.interrupted?0:1,message:'Sonuç henüz doğrulanamadı. Aynı işlemi yeniden sorgula.'});
  }finally{op.inFlight=false;}
 }
 async function select(id){
  if(disposed)return;
  if(operation){if(operation.chest.id===id)return retry();publish({message:'Önce mevcut sandık işlemini tamamla veya iptal et.'});return;}
  const context=contextOf(getContext()),chest=mistLootRows(context.world).find(row=>row.id===id);
  if(!context.valid||!chest)return;
  if(!finite(context.x)||!finite(context.y)||Math.hypot(context.x-chest.x,context.y-chest.y)>MIST_LOOT_REACH){publish({phase:'error',chest,message:'Sandığı almak için yaklaş.',progress:0});return;}
  const op={chest,context,generation:++generation,beginId:uuid(),inFlight:false,finishSent:false};operation=op;publish({chest});return beginRequest(op);
 }
 function update(){
  const op=operation;if(!op||op.finishSent)return;
  const context=contextOf(getContext());if(!unchanged(op.context,context)){cancel('interrupted');return;}
  if(!mistLootRows(context.world).some(row=>row.id===op.chest.id)){cancel('taken');return;}
 }
 function tick(){
  update();const op=operation;if(!op||state.phase!=='channeling')return;
  const progress=Math.max(0,Math.min(1,(now()-op.receivedAt)/MIST_LOOT_MS));publish({progress});if(progress>=1)return finishRequest(op);
 }
 function retry(){const op=operation;if(!op||op.inFlight)return;if(state.phase==='retry_begin')return beginRequest(op);if(state.phase==='retry_finish')return finishRequest(op);}
 function dismiss(){if(operation)return cancel();publish({phase:'idle',chest:null,progress:0,message:''});}
 function dispose(){cancel('disconnected');disposed=true;generation++;operation=null;activeCollectors.delete(cancel);}
 return {select,retry,cancel,update,tick,dismiss,dispose,get state(){return {...state};}};
}
export const MIST_LOOT_CSS=`.mist31-loot{position:fixed;left:50%;bottom:calc(126px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:42;box-sizing:border-box;width:min(360px,calc(100vw - 28px));padding:13px 15px;border:1px solid #a38b51;border-radius:12px;background:linear-gradient(145deg,#14271ff5,#101713f5);color:#eadfbd;box-shadow:0 8px 28px #0009;pointer-events:auto;font:13px/1.4 system-ui}.mist31-loot strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f2d79b;font-size:14px}.mist31-loot p{margin:6px 0;overflow-wrap:anywhere}.mist31-loot small{display:block;color:#b0c8b8}.mist31-loot-track{height:12px;margin:10px 0 7px;overflow:hidden;border:1px solid #5b6950;border-radius:99px;background:#050e0c}.mist31-loot-fill{height:100%;background:linear-gradient(90deg,#548873,#b9d4a1,#e5cd88);border-radius:inherit;box-shadow:0 0 12px #c9e7a260;transition:width .06s linear}.mist31-loot-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}.mist31-loot button{min-height:40px;padding:5px 12px;border:1px solid #8d805b;border-radius:7px;background:#263a2d;color:#eee2bd;touch-action:manipulation;font:600 12px system-ui}.mist31-loot button:disabled{opacity:.5}@media(max-height:500px){.mist31-loot{bottom:12px;left:12px;transform:none;width:min(310px,calc(100vw - 24px));padding:9px 12px}.mist31-loot small{display:none}}`;
export function createMistLootUI(React,{Portal}={}){
 const h=React.createElement;
 function Panel({state,onRetry,onDismiss}){
  const active=['starting','channeling','confirming'].includes(state.phase),retry=state.phase==='retry_begin'||state.phase==='retry_finish',progress=Math.round(Math.min(1,Math.max(0,state.progress))*100);
  return h('aside',{className:'mist31-loot','aria-label':'Sis Yarığı ganimet sandığı'},h('strong',null,mistLootName(state.chest)),h('p',{role:'status','aria-live':'polite'},state.message),(state.phase==='channeling'||state.phase==='confirming')&&h('div',{className:'mist31-loot-track',role:'progressbar','aria-label':'Sandık toplama','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':progress},h('div',{className:'mist31-loot-fill',style:{width:progress+'%'}})),state.phase==='channeling'&&h('small',null,'3 saniye · Hareket, saldırı veya hasar toplama işlemini keser.'),h('div',{className:'mist31-loot-actions'},retry&&h('button',{type:'button',onClick:onRetry},'Sonucu yeniden sorgula'),h('button',{type:'button',disabled:state.phase==='confirming'||state.phase==='retry_finish',onClick:onDismiss},active||state.phase==='retry_begin'?'Vazgeç':'Kapat')));
 }
 function Entry({world,own,post,onChange,uiSuspended}){
  const [state,setState]=React.useState({phase:'idle',progress:0,message:''}),context=React.useRef(null),callbacks=React.useRef(null),control=React.useRef(null);
  context.current={world,own,uiSuspended};callbacks.current={post,onChange};
  // A mounted UI owns one receipt state machine. StrictMode cleanup replaces it
  // safely; no requests/timers are started during render.
  React.useEffect(()=>{
   const controller=createMistLootController({post:(...args)=>callbacks.current.post(...args),getContext:()=>context.current,onState:setState,onChange:()=>callbacks.current.onChange?.()});control.current=controller;
   const open=event=>controller.select(event?.detail?.id),cancel=event=>controller.cancel(event?.detail?.reason??'disconnected'),hidden=()=>{if(document.hidden)cancel();};
   window.addEventListener(MIST_LOOT_OPEN,open);window.addEventListener(MIST_LOOT_CANCEL,cancel);
   const endings=['coreoflife:game-session-ended','coreoflife:instance-ended','coreoflife:maintenance-exit491','offline','blur'];for(const name of endings)window.addEventListener(name,cancel);document.addEventListener('visibilitychange',hidden);
   return()=>{controller.dispose();if(control.current===controller)control.current=null;window.removeEventListener(MIST_LOOT_OPEN,open);window.removeEventListener(MIST_LOOT_CANCEL,cancel);for(const name of endings)window.removeEventListener(name,cancel);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  React.useEffect(()=>{control.current?.update();},[world,own,uiSuspended]);
  React.useEffect(()=>{if(state.phase!=='channeling')return;const timer=setInterval(()=>control.current?.tick(),50);return()=>clearInterval(timer);},[state.phase]);
  const run=world?.adventure511?.run;if(uiSuspended||run?.kind!=='mist'||state.phase==='idle')return null;
  const body=h(Panel,{state,onRetry:()=>control.current?.retry(),onDismiss:()=>control.current?.dismiss()});
  return h(React.Fragment,null,h('style',null,MIST_LOOT_CSS),Portal?Portal(body,document.body):body);
 }
 return {Entry,Panel};
}

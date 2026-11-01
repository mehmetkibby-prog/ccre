// Delivery adapter for the existing authenticated reset_world button.
// The native route owns authentication/Origin checks and countdown SQL. The
// native world job owns the reset, fsync, owner freeze, refresh and rewards.
export function attachManualReset({host,core,world,runOnce,isBusy=()=>false}){
 const binding=host.nativeHttp,route=binding.route,sql=host.database.sqlite;
 let active=null,closed=false;
 const read=()=>sql.prepare('SELECT health,updated_at,cycle,reset_at,guardian_reward_at FROM world_state WHERE id=1').get();
 const same=(a,b)=>a?.cycle===b?.cycle&&a?.reset_at===b?.reset_at&&a?.updated_at===b?.updated_at&&a?.health===0;
 const error=message=>Response.json({error:message,code:'panel_world_reset'},{status:409,headers:{'cache-control':'no-store'}});
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 binding.route=async function(request,native){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/admin')return route.call(this,request,native);
  // Match only the small native button payload; other admin requests use the
  // unchanged route and its original bounded JSON reader.
  let action;try{
   const copy=request.clone(),reader=copy.body?.getReader();let size=0,text='';
   if(reader)try{for(;;){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>4096){void reader.cancel().catch(()=>{});break;}text+=new TextDecoder().decode(r.value);}}finally{reader.releaseLock();}
   if(size<=4096)action=JSON.parse(text).action;
  }catch{}
  if(!['reset_world','set_health'].includes(action))return route.call(this,request,native);
  if(active)return error('Dünya sıfırlaması sürüyor. Bitmesini bekleyin; düğmeye tekrar basmayın.');
  const slot={phase:'authorizing'};if(action==='reset_world')active=slot;
  try{
   const response=await route.call(this,request,native);
   // An unsuccessful native authorization or write can never start jobs.
   if(!response.ok||action!=='reset_world')return response;
   slot.expected=read();
   if(slot.expected.health!==0||!Number.isSafeInteger(slot.expected.reset_at)||slot.expected.reset_at<=0)throw Error('reset_countdown_missing');
   slot.phase='countdown';
   await core.nativeConfiguration.run([],()=>null);
   while(Date.now()<slot.expected.reset_at*1000){
    if(closed||core.stopping||core.closed)throw Error('reset_interrupted');
    const current=read();if(current.cycle===slot.expected.cycle+1)break;
    if(!same(current,slot.expected))throw Error('reset_request_changed');
    await pause(Math.min(200,Math.max(1,slot.expected.reset_at*1000-Date.now())));
   }
   slot.phase='committing';
   if(read().cycle===slot.expected.cycle)await runOnce(slot.expected);
   // runOnce waits for the existing native job's completion, not just an SQL
   // counter. Thus no success response precedes durable all-owner refresh.
   const end=Date.now()+10000;
   while(isBusy()&&Date.now()<end)await pause(50);
   const current=read();if(current.cycle!==slot.expected.cycle+1||current.reset_at!==0||isBusy())throw Error('reset_completion_unconfirmed');
   const data=await response.json();
   return Response.json({...data,world:current,serverTime:Math.floor(Date.now()/1000),worldReset:{completed:true,cycle:current.cycle}},
    {status:200,headers:{'cache-control':'no-store'}});
  }catch(e){
   console.error('panel_world_reset_failed',String(e.code??e.message));
   return error('Dünya sıfırlamasının tamamlandığı doğrulanamadı. Tekrar sıfırlamayın; sunucu kaydını kontrol edin.');
  }finally{if(active===slot)active=null;}
 };
 return {get pending(){return active!==null;},status:()=>active?{phase:active.phase,cycle:active.expected?.cycle??null}:null,
  close(){closed=true;binding.route=route;}};
}

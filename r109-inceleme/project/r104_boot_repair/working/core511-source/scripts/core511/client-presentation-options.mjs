// Presentation flags may arrive while an update or connection is recovering.
// Cache successful replies, not a failed first attempt. Explicit false values
// remain authoritative; retrying never enables a flag on the client's behalf.
export function createPresentationOptions({url,defaults,timeoutMs=5000,retryBaseMs=1000,retryMaxMs=60000,now=Date.now}){
 let value=Object.freeze({...defaults}),loaded=false,pending=null,retryTimer=null,failures=0,nextAt=0,requester,disposed=false;
 const hidden=()=>typeof document!=='undefined'&&document.hidden;
 const clearRetry=()=>{clearTimeout(retryTimer);retryTimer=null;};
 function schedule(){
  if(disposed||loaded||retryTimer!==null||hidden())return;
  retryTimer=setTimeout(()=>{retryTimer=null;void load();},Math.max(0,nextAt-now()));retryTimer.unref?.();
 }
 function load(request){
  if(disposed||loaded)return Promise.resolve(value);
  if(pending)return pending;
  if(typeof request==='function')requester=request;
  requester??=globalThis.fetch;
  if(nextAt>now()){schedule();return Promise.resolve(value);}
  clearRetry();
  const controller=new AbortController();let timeout;
  const attempt=Promise.resolve().then(async()=>{
   if(typeof requester!=='function')throw Error('presentation_options_offline');
   const response=await requester(url,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!response.ok){
    const error=Error('presentation_options_unavailable'),raw=response.headers?.get('retry-after');
    if(raw){const seconds=Number(raw);error.retryMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(raw)-now());}
    throw error;
   }
   const body=await response.json();
   if(!body||typeof body!=='object'||Object.keys(defaults).some(key=>typeof body[key]!=='boolean'))throw Error('presentation_options_invalid');
   return Object.freeze(Object.fromEntries(Object.keys(defaults).map(key=>[key,body[key]])));
  });
  const deadline=new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('presentation_options_timeout'));},timeoutMs);});
  pending=Promise.race([attempt,deadline]).then(result=>{
   if(!disposed){value=result;loaded=true;failures=0;nextAt=0;}return value;
  },error=>{
   failures++;nextAt=now()+Math.max(Math.min(retryMaxMs,retryBaseMs*2**Math.min(16,failures-1)),Number.isFinite(error.retryMs)?Math.min(300000,error.retryMs):0);
   return value;
  }).finally(()=>{clearTimeout(timeout);pending=null;schedule();});
  return pending;
 }
 const wake=()=>{if(hidden())clearRetry();else if(!loaded&&!disposed)void load();};
 if(typeof window!=='undefined')window.addEventListener('online',wake);
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',wake);
 return {read:()=>value,load,dispose(){disposed=true;clearRetry();if(typeof window!=='undefined')window.removeEventListener('online',wake);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',wake);}};
}

// Only immutable display assets. Game commands/ACKs never wait on this cache.
// Decode before publishing an image to the render loop. Failed requests have
// bounded retries; a permanently missing asset cannot create a request storm.
export const ADVENTURE_ASSET_EVENT='coreoflife:adventure-assets';
export function createAdventureImageCache({makeImage=()=>new Image(),schedule=setTimeout,cancel=clearTimeout,notify=()=>{},timeoutMs=12000,retryDelays=[750,2000,5000]}={}){
 const entries=new Map(),listeners=new Set();
 function changed(){notify();for(const listener of [...listeners])listener();}
 function start(entry){
  entry.attempt++;entry.status='loading';const image=makeImage();entry.image=image;image.decoding='async';let finished=false;
  const finish=ok=>{
   if(finished||entry.image!==image)return;finished=true;cancel(entry.timer);entry.timer=null;image.onload=image.onerror=null;
   if(ok){entry.status='ready';changed();return;}
   entry.status=entry.attempt<=retryDelays.length?'retrying':'failed';changed();
   if(entry.status==='retrying')entry.timer=schedule(()=>{entry.timer=null;start(entry);},retryDelays[entry.attempt-1]);
  };
  image.onerror=()=>finish(false);
  image.onload=()=>{if(!image.naturalWidth||!image.naturalHeight){finish(false);return;}
   // decode() rejects damaged assets too; a complete-but-broken Image is never
   // cached as a drawable. The promise is not part of any animation frame.
   try{Promise.resolve(typeof image.decode==='function'?image.decode():undefined).then(()=>finish(true),()=>finish(false));}catch{finish(false);}
  };
  entry.timer=schedule(()=>finish(false),timeoutMs);
  try{image.src=entry.url;}catch{finish(false);}
 }
 const api={
  get(url){let entry=entries.get(url);if(!entry){entry={url,attempt:0,status:'loading',image:null,timer:null};entries.set(url,entry);start(entry);}return entry.status==='ready'?entry.image:null;},
  status(url){return entries.get(url)?.status??'idle';},
  retry(url){const entry=entries.get(url);if(!entry)return this.get(url);if(entry.status==='failed'){entry.attempt=0;start(entry);changed();}return entry.status==='ready'?entry.image:null;},
  // Admission preflight only. No movement, combat or received ACK waits here.
  wait(urls,{signal,waitMs=15000}={}){
   return new Promise((resolve,reject)=>{
    let done=false,timer;
    const finish=error=>{if(done)return;done=true;cancel(timer);listeners.delete(check);signal?.removeEventListener('abort',abort);error?reject(error):resolve(urls.map(url=>entries.get(url)?.image));};
    const abort=()=>finish(Object.assign(Error('Sefer görsellerinin yüklenmesi iptal edildi.'),{name:'AbortError'}));
    const check=()=>{if(urls.every(url=>api.status(url)==='ready'))finish();else if(urls.some(url=>api.status(url)==='failed'))finish(Object.assign(Error('Sefer görselleri indirilemedi. Tekrar dene; henüz harita değiştirilmedi.'),{code:'adventure_assets_unavailable'}));};
    if(signal?.aborted){abort();return;}
    signal?.addEventListener('abort',abort,{once:true});
    timer=schedule(()=>finish(Object.assign(Error('Sefer görselleri hâlâ yükleniyor. Hazır olduğunda tekrar gir; henüz harita değiştirilmedi.'),{code:'adventure_assets_timeout'})),waitMs);
    for(const url of urls)api.retry(url);
    listeners.add(check);check();
   });
  }
 };
 return api;
}
const cache=createAdventureImageCache({notify:()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event(ADVENTURE_ASSET_EVENT));}});
export function adventureImage(url){return typeof Image==='undefined'?null:cache.get(url);}
export function adventureImageStatus(url){return cache.status(url);}
export function retryAdventureImage(url){return typeof Image==='undefined'?null:cache.retry(url);}
export function waitAdventureImages(urls,options){return cache.wait(urls,options);}

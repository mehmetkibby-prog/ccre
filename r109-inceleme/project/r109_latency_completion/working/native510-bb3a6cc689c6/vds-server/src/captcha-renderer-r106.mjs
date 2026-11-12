import {Worker} from 'node:worker_threads';

const failure=code=>Object.assign(new Error(code),{code});
const signature=Buffer.from([137,80,78,71,13,10,26,10]);

// One reusable worker per service process. Queue and total request lifetime are
// bounded; a failed worker never falls back to synchronous main-thread drawing.
export class CaptchaRendererR106 {
 constructor({limit=128,timeoutMs=10000,retryMs=1000,workerFactory=()=>new Worker(new URL('./captcha-worker-r106.mjs',import.meta.url),{execArgv:[],resourceLimits:{maxOldGenerationSizeMb:64,maxYoungGenerationSizeMb:16}})}={}){
  if(!Number.isSafeInteger(limit)||limit<1||limit>128||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw failure('captcha_renderer_config');
  Object.assign(this,{limit,timeoutMs,retryMs,workerFactory});this.queue=[];this.current=null;this.worker=null;this.serial=0;this.retryAt=0;this.closed=false;
  this.stats={submitted:0,completed:0,rejected:0,workers:0,maxRenderMs:0};
 }
 render(answer){
  if(typeof answer!=='string'||!/^\d{6}$/.test(answer))return Promise.reject(failure('captcha_render_input'));
  if(this.closed||Date.now()<this.retryAt)return Promise.reject(failure('captcha_renderer_unavailable'));
  if(this.queue.length+Number(!!this.current)>=this.limit){this.stats.rejected++;return Promise.reject(failure('captcha_renderer_busy'));}
  this.stats.submitted++;
  return new Promise((resolve,reject)=>{
   const job={id:++this.serial,answer,resolve,reject};
   job.timer=setTimeout(()=>this.fail(failure('captcha_renderer_timeout')),this.timeoutMs);
   this.queue.push(job);this.pump();
  });
 }
 pump(){
  if(this.closed||this.current||!this.queue.length)return;
  try{
   if(!this.worker){
    const worker=this.workerFactory();this.worker=worker;this.stats.workers++;
    worker.on('message',message=>{if(this.worker===worker)this.receive(message);});
    worker.on('error',()=>{if(this.worker===worker)this.fail(failure('captcha_renderer_failed'));});
    worker.on('exit',()=>{if(this.worker===worker)this.fail(failure('captcha_renderer_exited'));});
   }
   this.current=this.queue.shift();this.worker.ref();
   this.worker.postMessage({id:this.current.id,answer:this.current.answer});
   this.current.answer=null;
  }catch{this.fail(failure('captcha_renderer_failed'));}
 }
 receive(message){
  const job=this.current,png=message?.png;
  if(!job||message.id!==job.id||message.error||!(png instanceof Uint8Array)||png.byteLength<64||png.byteLength>150000||!Buffer.from(png.subarray(0,8)).equals(signature)){
   this.fail(failure('captcha_renderer_reply'));return;
  }
  clearTimeout(job.timer);this.current=null;this.stats.completed++;
  if(Number.isFinite(message.renderMs)&&message.renderMs>=0)this.stats.maxRenderMs=Math.max(this.stats.maxRenderMs,message.renderMs);
  job.resolve(Buffer.from(png.buffer,png.byteOffset,png.byteLength));
  if(this.queue.length)this.pump();else this.worker?.unref();
 }
 fail(error){
  const worker=this.worker;this.worker=null;this.retryAt=Date.now()+this.retryMs;
  const jobs=[...(this.current?[this.current]:[]),...this.queue];this.current=null;this.queue=[];
  for(const job of jobs){clearTimeout(job.timer);job.answer=null;job.reject(error);}
  if(worker)void worker.terminate().catch(()=>{});
 }
 close(){if(this.closed)return;this.closed=true;this.fail(failure('captcha_renderer_closed'));}
 snapshot(){return {...this.stats,queued:this.queue.length,active:!!this.current,closed:this.closed};}
}

let shared;
export function renderCaptchaR106(answer){shared??=new CaptchaRendererR106();return shared.render(answer);}

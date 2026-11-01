// Cold lifecycle only: one coalesced, unref'ed timer, capped backoff. A retry
// never expires an ownership lease or replays an unknown native operation.
export class RecoveryRetry {
 constructor(work,{scope='recovery',onError=()=>{},set=setTimeout,clear=clearTimeout}={}){Object.assign(this,{work,scope,onError,set,clear});this.attempt=0;this.timer=null;this.closed=false;}
 schedule(){
  if(this.closed||this.timer!==null)return;
  const delay=[2000,5000,10000,30000][Math.min(this.attempt++,3)];this.delay=delay;
  console.warn('core511_recovery',JSON.stringify({code:'recovery_retry_scheduled',scope:this.scope,attempt:this.attempt,delayMs:delay}));
  this.timer=this.set(()=>{this.timer=null;if(!this.closed)void Promise.resolve().then(this.work).catch(this.onError);},delay);this.timer?.unref?.();
 }
 reset(){if(this.timer!==null)this.clear(this.timer);this.timer=null;this.attempt=0;}
 stop(){this.closed=true;this.reset();}
}

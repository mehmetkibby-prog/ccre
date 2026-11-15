// Test-only inherited preload: expose hidden child boot stderr without changing
// any byte of the installed runtime under examination.
const cp=require('node:child_process');
const {syncBuiltinESMExports}=require('node:module');
const fs=require('node:fs');
const {Duplex}=require('node:stream');
const originalDestroy=Duplex.prototype.destroy;
Duplex.prototype.destroy=function(...args){
 if(this.constructor?.name==='ProcessStream'&&this.peer?.pid&&!this.r118DestroyLogged){
  this.r118DestroyLogged=true;
  fs.writeSync(2,'R118_PARENT_DESTROY '+JSON.stringify({at:Date.now(),pid:this.peer.pid,stream:this.name,error:args[0]?.message,stack:new Error().stack})+'\n');
 }
 return Reflect.apply(originalDestroy,this,args);
};
for(const name of ['fork','spawn']){
 const original=cp[name];
 cp[name]=function(...args){
  const index=args.length-1,options=args[index];
  if(options&&typeof options==='object'&&!Array.isArray(options)){
   const env={...(options.env??process.env)};
   env.NODE_OPTIONS=(env.NODE_OPTIONS??'').replace(' --require='+__filename,'');
   args[index]={...options,env};
  }
  const child=Reflect.apply(original,this,args);
  const started=Date.now();
  fs.writeSync(2,'R118_CHILD_START '+JSON.stringify({at:started,pid:child.pid,entry:String(args[0])})+'\n');
  const firstKinds=new Set();child.on('message',message=>{if(!firstKinds.has(message?.type)){firstKinds.add(message?.type);fs.writeSync(2,'R118_CHILD_FIRST_MESSAGE '+JSON.stringify({at:Date.now(),elapsedMs:Date.now()-started,pid:child.pid,type:message?.type})+'\n');}});
  child.stderr?.on('data',data=>fs.writeSync(2,'R118_CHILD_STDERR['+child.pid+'] '+data));
  child.once('exit',(code,signal)=>fs.writeSync(2,'R118_CHILD_EXIT '+JSON.stringify({pid:child.pid,code,signal,entry:String(args[0])})+'\n'));
  return child;
 };
}
syncBuiltinESMExports();

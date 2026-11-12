// Observe the short-lived tutorial's HUD, not the moving game world. A target
// can move without changing its own dimensions (late fonts, HUD rows, menus).
export function watchFirstStepTargetR67(selector,onRect){
 const doc=document,win=window;let stopped=false,frame=0,target=null,scope=null,last;
 const resize=new ResizeObserver(()=>schedule()),mutation=new MutationObserver(()=>schedule());
 const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n));
 const styleId='first-step-anchor-r67';
 if(!doc.getElementById(styleId)){
  const style=doc.createElement('style');style.id=styleId;
  style.textContent='.first-steps-hint[data-targeted="true"]:before{left:var(--first-step-arrow-left);pointer-events:none}.first-steps-hint[data-targeted="true"][data-below="false"]:before{content:"";position:absolute;width:12px;height:12px;bottom:-7px;background:#102019;border-right:1px solid #c2af73;border-bottom:1px solid #c2af73;transform:rotate(45deg)}';
  doc.head.append(style);
 }
 function publish(next){
  if(JSON.stringify(next)===JSON.stringify(last))return;last=next;onRect(next);
 }
 function visible(node){
  const r=node.getBoundingClientRect(),s=win.getComputedStyle(node);
  return node.isConnected&&r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&r.bottom>0&&r.top<win.innerHeight&&r.right>0&&r.left<win.innerWidth;
 }
 function bind(next){
  if(target===next&&scope?.isConnected)return;
  target?.classList.remove('first-step-target');scope?.removeEventListener('load',schedule,true);
  scope?.removeEventListener('transitionend',schedule,true);
  resize.disconnect();mutation.disconnect();target=next;scope=null;
  if(!target){if(selector)mutation.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});return;}
  target.classList.add('first-step-target');
  scope=target.closest('.left-hud-rail,.teleport-dialog')??target.parentElement;
  mutation.observe(scope,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','hidden']});
  for(let node=target;node&&node!==doc.documentElement;node=node.parentElement){
   resize.observe(node);
   if(node!==scope)mutation.observe(node,{childList:true,attributes:true,attributeFilter:['class','style','hidden']});
  }
  scope.addEventListener('load',schedule,true);scope.addEventListener('transitionend',schedule,true);
 }
 function place(){
  frame=0;if(stopped)return;
  if(!selector){publish({left:Math.max(12,win.innerWidth/2-150),top:Math.max(110,win.innerHeight*.25),below:false,targeted:false});return;}
  const next=[...doc.querySelectorAll(selector)].find(visible)??null;
  bind(next);
  if(!target){publish(null);return;}
  const r=target.getBoundingClientRect(),hint=doc.querySelector('.first-steps-hint'),width=hint?.offsetWidth||Math.min(300,win.innerWidth-24),height=hint?.offsetHeight||70;
  if(hint)resize.observe(hint);
  const below=r.bottom+10+height<=win.innerHeight-8;
  const left=clamp(r.left+r.width/2-width/2,12,win.innerWidth-width-12);
  const top=below?r.bottom+10:Math.max(8,r.top-height-10);
  publish({left,top,below,targeted:true,arrowLeft:clamp(r.left+r.width/2-left-6,12,width-24)});
 }
 function schedule(){if(!stopped&&!frame)frame=win.requestAnimationFrame(place);}
 win.addEventListener('resize',schedule);win.addEventListener('scroll',schedule,true);
 doc.fonts?.addEventListener('loadingdone',schedule);void doc.fonts?.ready.then(schedule);
 // Initial lookup plus the first portal mount both use a frame-coalesced pass.
 if(selector)mutation.observe(doc.body,{childList:true,subtree:true});schedule();
 return ()=>{
  stopped=true;if(frame)win.cancelAnimationFrame(frame);target?.classList.remove('first-step-target');
  resize.disconnect();mutation.disconnect();scope?.removeEventListener('load',schedule,true);scope?.removeEventListener('transitionend',schedule,true);
  win.removeEventListener('resize',schedule);win.removeEventListener('scroll',schedule,true);doc.fonts?.removeEventListener('loadingdone',schedule);
 };
}

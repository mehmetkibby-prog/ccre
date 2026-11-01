import {createHeldAttack} from './held-attack.ts';

const interactive=(target:EventTarget|null)=>!!(target as Element|null)?.closest?.('input,textarea,select,button,a,[role="button"],[role="textbox"],[contenteditable]:not([contenteditable="false"])');
function attackKey(event:KeyboardEvent){
 if(event.code==='Space'||event.key===' ')return 'Space';
 if(event.code==='Digit1'||event.code==='Numpad1')return event.code;
 return event.key==='1'?'Digit1':null;
}

// Uses the game's existing RAF and cooldowns. OS repeat never queues attacks.
export function installKeyboardHeldAttack(win:Window,doc:Document,input:{
 target?:()=>string|null;allowed:()=>boolean;blocked:()=>boolean;scope:()=>string;readyAt:()=>number;
 prepare?:()=>boolean|void;
 attack:(bufferedTap?:boolean)=>void|Promise<void>;started:()=>void;released:()=>void;now:()=>number;
}){
 const keys=new Set<string>();let scope='';
 const held=createHeldAttack({
  allowed:()=>!doc.hidden&&input.allowed()&&input.scope()===scope&&!interactive(doc.activeElement),
  target:input.target,blocked:input.blocked,readyAt:input.readyAt,attack:input.attack,
  prepare:input.prepare,
  scope:input.scope,bufferTaps:true,
  released:()=>{keys.clear();input.released();},
 });
 const stop=()=>{keys.clear();held.stop();};
 const down=(event:KeyboardEvent)=>{
  if(event.key==='Escape'||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing){stop();return;}
  const key=attackKey(event);if(!key)return;
  if(event.defaultPrevented||interactive(event.target)||interactive(doc.activeElement)||doc.hidden||!input.allowed()||input.blocked()){stop();return;}
  event.preventDefault();
  // After blur/death/scope changes an OS repeat cannot restart a released hold.
  if(event.repeat||keys.has(key))return;
  keys.add(key);
  if(keys.size===1){scope=input.scope();input.started();held.start(0,input.now());}
 };
 const up=(event:KeyboardEvent)=>{const key=attackKey(event);if(key){keys.delete(key);if(!keys.size)held.release(input.now());}};
 const hidden=()=>{if(doc.hidden)stop();};
 const focus=(event:FocusEvent)=>{if(interactive(event.target))stop();};
 win.addEventListener('keydown',down);
 // A dialog/input may swallow keyup during the hold. Capture still releases it.
 win.addEventListener('keyup',up,true);
 for(const name of ['blur','pagehide','offline','resize','orientationchange'])win.addEventListener(name,stop);
 doc.addEventListener('visibilitychange',hidden);
 doc.addEventListener('focusin',focus,true);
 doc.addEventListener('fullscreenchange',stop);
 return {active:()=>held.pointer()!==null,tick:held.tick,stop,dispose(){
  win.removeEventListener('keydown',down);win.removeEventListener('keyup',up,true);
  for(const name of ['blur','pagehide','offline','resize','orientationchange'])win.removeEventListener(name,stop);
  doc.removeEventListener('visibilitychange',hidden);doc.removeEventListener('focusin',focus,true);doc.removeEventListener('fullscreenchange',stop);stop();
 }};
}

const transient=new Set(['freezing','frozen','refreshing','releasing']);
export const CHAT_DEFERRED_R113=Symbol('chat-before-native-operation');

// Waiting never releases a fence. Only the original permanent operation can
// settle it; its final state and fresh authorization are checked on retry.
export function temporaryChatWaitR113(core,actor,error){
 // A world terminal can start while the native session is being rechecked,
 // after Coordinator.serial's initial idle check. Wait for its actual release
 // outside that queue, exactly as for an actor's permanent operation. Never
 // remove a barrier or retry a native callback that already started.
 const shared=core.permanent.sharedCombat;
 if(error?.code==='permanent_actor_fenced'&&error.sharedTerminal===true&&!core.permanent.closed&&shared?.terminal&&typeof shared.terminalIdle==='function')return shared.terminalIdle();
 const entry=core.permanent.entries.get(actor);
 return error?.code==='permanent_actor_fenced'&&!core.permanent.closed&&entry&&transient.has(entry.phase)&&typeof entry.settled?.then==='function'?entry.settled:null;
}
export const unavailableChatR113=()=>Response.json({error:'Karakterin işlemi tamamlanıyor. Biraz sonra tekrar dene.',code:'chat_temporarily_unavailable',retryAfterMs:1000},{status:503,headers:{'retry-after':'1','cache-control':'no-store'}});
export async function waitChatFenceR113(settled,remaining){
 if(remaining<=0)return false;
 let timer;
 try{return await Promise.race([settled.then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),remaining);})]);}
 finally{clearTimeout(timer);}
}

const names=new Set(['native_checkpoint_timing','native_fsync_timing','native_commit_timing']);
const slots=new Map();
export function workDiagnostic477(name,event){
 if(!names.has(name)||!globalThis.__colLoadLab?.hasKnownEntities())return;
 let slot=slots.get(name);if(!slot){slot={minute:-1,count:0,dropped:0};slots.set(name,slot);}
 const minute=Math.floor(Date.now()/60000);if(slot.minute!==minute){slot.minute=minute;slot.count=0;}
 if(slot.count>=20){slot.dropped++;return;}slot.count++;
 try{console.info(name,JSON.stringify({version:1,pid:process.pid,...event,droppedEvents:slot.dropped,droppedScope:'process-lifetime'}));}catch{}
}

// Unlock during the real login gesture, before async authentication mounts the game.
let entry:AudioContext|null=null;
let expiry:ReturnType<typeof setTimeout>|undefined;
export function unlockEntryAudio(){
 if(typeof window==='undefined')return;
 const Ctor=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
 if(!Ctor)return;
 try{if(!entry||entry.state==='closed')entry=new Ctor();
 const context=entry;void context.resume().catch(()=>{});
 const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(context.destination);source.start();source.onended=()=>source.disconnect();
 clearTimeout(expiry);expiry=setTimeout(()=>{if(entry===context){entry=null;void context.close().catch(()=>{});}},60000);
 }catch{/* Audio remains optional; the game's next gesture can retry. */}
}
export function takeEntryAudio(){const context=entry;entry=null;clearTimeout(expiry);return context?.state==='closed'?null:context;}

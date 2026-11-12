// Presentation only. Native Y2 supplies its already unlocked context/effects
// bus; damage, other combat sounds and all Zümrüt sounds remain independent.
export const INCOMING_HIT_AUDIO_R96=Object.freeze({
 attackSeconds:.006,durationSeconds:.09,cooldownSeconds:.15,
 peakGain:.033,frequencyStart:150,frequencyEnd:85,leadSeconds:.004
});
const contexts=new WeakMap();

function disposeVoice(state,voice){
 if(!voice||voice.disposed)return;
 voice.disposed=true;voice.source.onended=null;
 try{voice.source.disconnect();}catch{}
 try{voice.level.disconnect();}catch{}
 if(state.voice===voice)state.voice=null;
}
function stopState(state){
 if(!state)return;
 const voice=state.voice;
 if(voice){try{voice.source.stop();}catch{}disposeVoice(state,voice);}
 state.lastAt=-Infinity;
}
export function stopIncomingHitR96(audio){stopState(contexts.get(audio));}

function stateFor(audio){
 let state=contexts.get(audio);if(state)return state;
 state={voice:null,lastAt:-Infinity};contexts.set(audio,state);
 const changed=()=>{
  // A suspended source must not resume an old impact after returning to game.
  if(audio.state!=='running')stopState(state);
  if(audio.state==='closed'){
   audio.removeEventListener?.('statechange',changed);contexts.delete(audio);
  }
 };
 audio.addEventListener?.('statechange',changed);
 return state;
}

// true means this one sound was handled, including intentionally silent hits.
// Simultaneous/repeated impacts are dropped, never queued or played later.
export function playIncomingHitR96(audio,effectsBus,sound,gain=1){
 if(sound!=='incomingHit')return false;
 gain=Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):0;
 const now=audio?.currentTime;
 if(!audio||audio.state!=='running'||!Number.isFinite(now)||!effectsBus||gain<=0||effectsBus.gain?.value===0){
  stopIncomingHitR96(audio);return true;
 }
 const state=stateFor(audio),rule=INCOMING_HIT_AUDIO_R96;
 if(now<state.lastAt)stopState(state);
 if(now-state.lastAt+1e-9<rule.cooldownSeconds)return true;
 // onended can be delayed while the main thread is occupied. Release an old
 // finished voice before replacing it, so there is never more than one here.
 if(state.voice){try{state.voice.source.stop();}catch{}disposeVoice(state,state.voice);}
 let source=null,level=null,voice=null;
 try{
  const start=now+rule.leadSeconds,end=start+rule.durationSeconds,peak=rule.peakGain*gain;
  source=audio.createOscillator();level=audio.createGain();
  source.type='sine';
  source.frequency.setValueAtTime(rule.frequencyStart,start);
  source.frequency.exponentialRampToValueAtTime(rule.frequencyEnd,end);
  level.gain.setValueAtTime(0,start);
  level.gain.linearRampToValueAtTime(peak,start+rule.attackSeconds);
  level.gain.exponentialRampToValueAtTime(Math.max(1e-12,peak*.002),end-rule.attackSeconds);
  level.gain.linearRampToValueAtTime(0,end);
  source.connect(level);level.connect(effectsBus);
  voice={source,level,end,disposed:false};state.voice=voice;state.lastAt=now;
  source.onended=()=>disposeVoice(state,voice);
  source.start(start);source.stop(end);
 }catch{
  if(voice){try{source.stop();}catch{}disposeVoice(state,voice);}
  else {try{source?.disconnect();}catch{}try{level?.disconnect();}catch{}}
  state.lastAt=now;
 }
 return true;
}

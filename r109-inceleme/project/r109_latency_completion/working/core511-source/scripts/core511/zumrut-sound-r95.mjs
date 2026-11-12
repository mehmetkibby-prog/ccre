import {ZUMRUT_SWING_MS_R95,ZUMRUT_CONTACT_PHASE_R95} from './zumrut-gather-timing-r95.mjs';

const CONTACT_MS=ZUMRUT_SWING_MS_R95*ZUMRUT_CONTACT_PHASE_R95;
const MAX_LATE_MS=120;
const SAMPLE_RATE=22050;
const SOUND_NAMES={wood:'zumrutWoodHitR95',stone:'zumrutStoneHitR95'};

// Called by the game's existing frame. Missed/blocked contacts are consumed,
// never queued: changing tab, unmuting or a slow frame cannot replay old hits.
export function createZumrutImpactClockR95(){
 let prior=null,lastImpact=-1,lastNow=null;
 return {
  reset(){prior=null;lastImpact=-1;lastNow=null;},
  frame(active,now,{playerId,area,blocked=false}={}){
   if(!active||active.phase!=='channeling'||!SOUND_NAMES[active.kind]||active.playerId!==playerId||area!=='zumrut'||!Number.isFinite(now)||!Number.isFinite(active.visualStartedAt)||now<active.visualStartedAt||(Number.isFinite(active.visualEndsAt)&&now>=active.visualEndsAt)){
    this.reset();return null;
   }
   if(!prior||active.operationId!==prior.operationId||active.playerId!==prior.playerId||active.nodeId!==prior.nodeId||active.kind!==prior.kind||active.visualStartedAt!==prior.visualStartedAt){prior=active;lastImpact=-1;lastNow=null;}
   const elapsed=now-active.visualStartedAt,impact=Math.floor((elapsed-CONTACT_MS)/ZUMRUT_SWING_MS_R95);
   const gap=lastNow===null?0:now-lastNow;lastNow=now;
   if(impact<0||impact<=lastImpact)return null;
   lastImpact=impact;
   if(blocked||gap<0||gap>250||elapsed-(impact*ZUMRUT_SWING_MS_R95+CONTACT_MS)>MAX_LATE_MS)return null;
   return SOUND_NAMES[active.kind];
  }
 };
}

const buffers=new WeakMap(),voices=new Map();
let variant=0;

// Small, cached mono buffers: a dry wooden thock/crack and a bright metal/stone
// strike with grit. No downloads, AudioContext, scheduler or media element here.
export function fillZumrutImpactBufferR95(data,sampleRate,kind){
 let seed=kind==='wood'?0x73a1469:0x2bc8711,low=0;
 const stone=kind==='stone',duration=data.length/sampleRate;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;low=low*.72+noise*.28;
  const attack=Math.min(1,t/.001),release=Math.min(1,(duration-t)/.012);
  const value=stone
   ? .26*noise*Math.exp(-170*t)+.16*(noise-low)*Math.exp(-28*t)
     +.22*Math.sin(2*Math.PI*1463*t)*Math.exp(-29*t)
     +.10*Math.sin(2*Math.PI*2417*t)*Math.exp(-41*t)
     +.06*Math.sin(2*Math.PI*3371*t)*Math.exp(-48*t)
   : .48*noise*Math.exp(-210*t)+.38*low*Math.exp(-31*t)
     +.36*Math.sin(2*Math.PI*173*t)*Math.exp(-34*t)
     +.17*Math.sin(2*Math.PI*389*t)*Math.exp(-46*t)
     +.07*Math.sin(2*Math.PI*617*t)*Math.exp(-65*t);
  data[i]=Math.max(-.95,Math.min(.95,value*attack*release));
 }
 return data;
}

export function stopZumrutImpactR95(actorId){
 for(const [id,voice]of voices){if(actorId!==undefined&&id!==actorId)continue;try{voice.source.stop();}catch{}voice.dispose();}
}

// Native Y2 sound callback calls this AFTER its existing mute/background/unlock
// gates and passes its effects bus, so the game's effects slider also applies.
export function playZumrutImpactR95(audio,effectsBus,sound,gain=1,actorId='local'){
 const kind=sound===SOUND_NAMES.wood?'wood':sound===SOUND_NAMES.stone?'stone':null;
 if(!kind)return false;
 gain=Number.isFinite(gain)?Math.max(0,Math.min(1,gain)):0;
 if(!audio||audio.state!=='running'||!effectsBus||gain<=0)return true;
 let source=null,level=null,voice=null;
 try{
  let cache=buffers.get(audio);if(!cache){cache={};buffers.set(audio,cache);}
  if(!cache[kind]){
   const buffer=audio.createBuffer(1,Math.ceil(SAMPLE_RATE*.21),SAMPLE_RATE);
   fillZumrutImpactBufferR95(buffer.getChannelData(0),SAMPLE_RATE,kind);cache[kind]=buffer;
  }
  // One short source per actor; a local cancellation never silences another
  // player's strike. Four mono voices maximum, including the local player.
  stopZumrutImpactR95(actorId);
  if(voices.size>=4){const oldest=voices.keys().next().value;stopZumrutImpactR95(oldest);}
  source=audio.createBufferSource();level=audio.createGain();source.buffer=cache[kind];
  source.playbackRate.value=[1,.975,1.025,1.01][variant++%4];
  level.gain.value=.38*gain;source.connect(level);level.connect(effectsBus);
  let disposed=false;
  voice={source,dispose(){if(disposed)return;disposed=true;if(voices.get(actorId)===voice)voices.delete(actorId);try{source.disconnect();}catch{}try{level.disconnect();}catch{}}};
  voices.set(actorId,voice);source.onended=voice.dispose;source.start(audio.currentTime+.004);
 }catch{
  if(voice)voice.dispose();else {try{source?.disconnect();}catch{}try{level?.disconnect();}catch{}}
 }
 return true;
}

export function createZumrutSoundSceneR96({stop=stopZumrutImpactR95}={}){
 const actors=new Map();let scope=null,windowAt=0,remoteCount=0;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 function reset(){for(const id of actors.keys())stop(id);actors.clear();scope=null;windowAt=remoteCount=0;}
 return {
  reset,
  stopActor(id){if(id===undefined)return;stop(id);actors.delete(id);},
  frame(local,peers,now,options={},play){
   const {playerId,area,world,listener,positions,visible,blocked=false}=options;
   const nextScope=area==='zumrut'&&playerId?String(playerId)+':'+String(world?.channel??''):null;
   if(!nextScope||!Number.isFinite(now)){reset();return;}
   if(scope!==nextScope){reset();scope=nextScope;}
   if(now-windowAt>=120||now<windowAt){windowAt=now;remoteCount=0;}
   const seen=new Set(),sounds=[];
   function actor(animation,isLocal){
    if(!animation||!['wood','stone'].includes(animation.kind)||animation.phase!=='channeling'||!Number.isFinite(animation.visualEndsAt)||now>=animation.visualEndsAt)return;
    const id=animation.playerId;if(!id||seen.has(id)||seen.size>=128)return;seen.add(id);
    let record=actors.get(id);if(!record){record={clock:createZumrutImpactClockR95(),primed:isLocal};actors.set(id,record);}
    const point=positions?.get?.(id)??animation;
    const shown=isLocal||(!visible||visible(id));
    const gain=isLocal?.9:shown&&finite(point)&&finite(listener)?Math.max(0,.8*(1-Math.hypot(point.x-listener.x,point.y-listener.y)/650)):0;
    const sound=record.clock.frame(animation,now,{playerId:id,area,blocked:blocked||!record.primed||!shown||gain<=0});
    record.primed=true;
    if(blocked||!shown||gain<=0)stop(id);
    if(sound)sounds.push({sound,gain,id,isLocal});
   }
   actor(local,true);for(const peer of peers??[])if(peer.playerId!==playerId)actor(peer,false);
   for(const id of actors.keys())if(!seen.has(id)){stop(id);actors.delete(id);}
   // Native remote-audio distance/visibility gates; nearest impacts first.
   // At most three remote contacts in 120ms, plus the local strike.
   sounds.sort((a,b)=>Number(b.isLocal)-Number(a.isLocal)||b.gain-a.gain);
   for(const sound of sounds){if(!sound.isLocal&&remoteCount>=3)continue;if(!sound.isLocal)remoteCount++;play?.(sound.sound,sound.gain,sound.id);}
  },
  inspect(){return {actors:actors.size,scope,remoteCount};}
 };
}

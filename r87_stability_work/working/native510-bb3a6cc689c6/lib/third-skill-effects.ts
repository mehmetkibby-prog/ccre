import type { PlayerEffectAnchor } from "./pvp-effect-tracking";
export type ThirdSkillEffect = PlayerEffectAnchor & { role: string; x: number; y: number; started: number };
export function drawThirdSkills(ctx: CanvasRenderingContext2D, effects: ThirdSkillEffect[], now: number, low: boolean) {
  for (const effect of effects) {
    const t = (now-effect.started)/1000;
    if(t<0 || t>1.05) continue;
    ctx.save();ctx.translate(effect.x,effect.y-12);
    ctx.globalAlpha=Math.min(1,t*12)*Math.min(1,(1.05-t)*4);
    ctx.lineCap="round";
    if(effect.role==="muhafiz") {
      ctx.strokeStyle="#ffe3a0";
      for(let i=0;i<3;i++) {
        ctx.save();ctx.scale(1,.48);ctx.rotate(t*11+i*Math.PI*2/3);
        ctx.lineWidth=6-i;ctx.beginPath();ctx.arc(0,0,48+t*38,0,Math.PI*.95);ctx.stroke();
        ctx.strokeStyle="#dd8952";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,58+t*40,.2,2.7);ctx.stroke();ctx.restore();
      }
    } else if(effect.role==="avci") {
      const count=low?7:12;
      for(let i=0;i<count;i++) {
        const p=Math.max(0,Math.min(1,(t-i*.035)*2.7));if(p<=0)continue;
        const x=Math.sin(i*2.4)*67,y=Math.cos(i*2.4)*29;
        ctx.globalAlpha=Math.max(0,1-(t-i*.035-.45)*3);
        if(p<1) {
          const h=(1-p)*150;ctx.strokeStyle="#f9e8b5";ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(x-18,y-h-35);ctx.lineTo(x,y-h);ctx.stroke();
          ctx.fillStyle="#e4ba67";ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x-9,y-h-6);ctx.lineTo(x-1,y-h-12);ctx.fill();
        }else{ctx.strokeStyle="#d9bf7d";ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,9,4,0,0,Math.PI*2);ctx.stroke();}
      }
    } else {
      ctx.strokeStyle="#b29bff";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,78,33,0,0,Math.PI*2);ctx.stroke();
      const phase=Math.floor(t*12);
      for(let i=0;i<(low?3:5);i++) {
        const x=Math.sin(i*2.4)*64,y=Math.cos(i*2.4)*25;
        ctx.beginPath();ctx.moveTo(x-15,y-155);
        for(let j=1;j<=6;j++)ctx.lineTo(x+Math.sin(j*17+i*5+phase)*12*(1-j/7),y-155+j*155/6);
        ctx.strokeStyle="#9479ff";ctx.lineWidth=low?4:6;ctx.stroke();ctx.strokeStyle="#edf4ff";ctx.lineWidth=1.8;ctx.stroke();
      }
    }
    ctx.restore();
  }
}
const noiseCache=new WeakMap<AudioContext,AudioBuffer>();
export function playThirdSkillSound(audio: AudioContext, output: AudioNode, kind: string) {
  if(!["guardianWhirlwind","hunterArrowRain","lightningCircle"].includes(kind))return false;
  let buffer=noiseCache.get(audio);
  if(!buffer){buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*.8),audio.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;noiseCache.set(audio,buffer);}
  const start=audio.currentTime+.004;
  const layer=(delay:number,duration:number,frequency:number,gain:number,type:BiquadFilterType)=>{
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),volume=audio.createGain();
    source.buffer=buffer!;filter.type=type;filter.frequency.setValueAtTime(frequency,start+delay);filter.frequency.exponentialRampToValueAtTime(Math.max(60,frequency*.35),start+delay+duration);
    volume.gain.setValueAtTime(.0001,start+delay);volume.gain.exponentialRampToValueAtTime(gain,start+delay+.015);volume.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
    source.connect(filter);filter.connect(volume);volume.connect(output);source.start(start+delay);source.stop(start+delay+duration);
    source.onended=()=>{source.disconnect();filter.disconnect();volume.disconnect();};
  };
  if(kind==="guardianWhirlwind") {for(let i=0;i<3;i++)layer(i*.13,.23,1000+i*220,.12,"bandpass");layer(.25,.35,160,.13,"lowpass");}
  else if(kind==="hunterArrowRain") {for(let i=0;i<7;i++)layer(i*.055,.15,2200+i*100,.06,"bandpass");layer(.38,.18,450,.075,"lowpass");}
  else {layer(0,.12,3500,.13,"highpass");layer(.1,.2,1800,.08,"bandpass");layer(.12,.65,180,.19,"lowpass");}
  return true;
}

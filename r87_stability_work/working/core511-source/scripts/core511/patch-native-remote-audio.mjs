import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function patchRemoteAudio(source){
 const original=source,changes=[];
 function one(before,after){const i=source.indexOf(before);if(i<0||source.indexOf(before,i+1)>=0)throw Error('remote_audio_anchor_changed:'+before.slice(0,90));source=source.slice(0,i)+after+source.slice(i+before.length);changes.push(before.slice(0,90));}
 // Optional gain defaults to1: all existing local audio and settings remain unchanged.
 one('Y=(0,R.useCallback)(e=>{if(typeof window>', 'Y=(0,R.useCallback)((e,colGainR18=1)=>{colGainR18=Number.isFinite(colGainR18)?Math.max(0,Math.min(1,colGainR18)):0;if(colGainR18<=0)return;if(typeof window>');
 one('if(!n||Eh(t,n,e))return;let r=e===`slash`?Fr.current:1;', 'if(!n||Eh(t,n,e,colGainR18))return;let r=(e===`slash`?Fr.current:1)*colGainR18;');
 one('a.gain.setValueAtTime(.027,i+.018)','a.gain.setValueAtTime(.027*r,i+.018)');
 one('function Eh(e,t,n){','function Eh(e,t,n,colGainR18=1){');
 one('d.gain.exponentialRampToValueAtTime(s,i+n+.015)','d.gain.exponentialRampToValueAtTime(s*colGainR18,i+n+.015)');
 // Existing legacy intent renderer may still run. Snapshot-based remote cast is
 // authoritative and deduped; suppress its old unattenuated duplicate skill voice.
 one('Math.hypot(m-b.current.x,h-b.current.y)<650&&Y(G_(i.role,2))','void 0');
 const helper=readFileSync(new URL('./remote-audio.mjs',import.meta.url),'utf8').replace('export function createRemoteAudio511','function createRemoteAudio511');
 source=helper+'\n'+source;
 one('im=(0,R.useRef)(new Map),am=', 'colRemoteAudioR18=(0,R.useRef)(null),im=(0,R.useRef)(new Map),am=');
 one('let Se=t&&(ki.current||document.documentElement.hasAttribute(`data-col-typing`))',`if(!colRemoteAudioR18.current)colRemoteAudioR18.current=createRemoteAudio511({play:(sound,gain)=>Y(sound,gain),soundFor:(role,ability)=>G_(role,ability)});colRemoteAudioR18.current.frame(F.current,g.current,b.current,hi.current,a,{blocked:!v.current||!!le.run||document.hidden||qp.current.suppressed||!Wr.current,visible:id=>!wa.current.hidden(id)});let Se=t&&(ki.current||document.documentElement.hasAttribute(\`data-col-typing\`))`);
 parse(source,{ecmaVersion:'latest',sourceType:'module'});
 return{source,proof:{version:'remote-audio-r18',sourceSha256:sha(original),patchedSha256:sha(source),helperSha256:sha(helper),changes,scope:'Client presentation only. Remote footsteps from interpolated travel; committed combatEvents cast sounds with650px attenuation, stale/scope/self/hidden rejection, once-per-cast dedup, bounded crowd voices. Native local audio, mute, user unlock and server commands preserved.'}};
}

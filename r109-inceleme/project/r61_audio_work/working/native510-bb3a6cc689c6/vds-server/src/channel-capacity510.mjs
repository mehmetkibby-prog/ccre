import {constants,openSync,closeSync,lstatSync,fstatSync,readFileSync} from 'node:fs';
import {feature510} from './features510.mjs';
export const CAPACITY_FILE510='/etc/coreoflife-channel-capacity510.json';
export function parseCapacities510(body){
 const value=JSON.parse(body);
 if(value?.schemaVersion!==1||Object.keys(value).sort().join()!=='capacities,schemaVersion'||!value.capacities||Object.keys(value.capacities).sort().join()!=='1,2,3'||Object.values(value.capacities).some(n=>!Number.isInteger(n)||n<1||n>25))throw Error('invalid_channel_capacity510');
 return Object.freeze({...value.capacities});
}
function read(){
 let st;try{st=lstatSync(CAPACITY_FILE510);}catch(e){if(e.code==='ENOENT')return Object.freeze({1:20,2:25,3:25});throw e;}
 const parent=lstatSync('/etc');
 if(!parent.isDirectory()||parent.isSymbolicLink()||parent.uid!==0||(parent.mode&0o022)||!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.uid!==0||(st.mode&0o7777)!==0o644||st.size>1024)throw Error('untrusted_channel_capacity510');
 const fd=openSync(CAPACITY_FILE510,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const cur=fstatSync(fd);if(cur.ino!==st.ino||cur.dev!==st.dev||cur.size!==st.size||cur.mode!==st.mode||cur.uid!==0||cur.nlink!==1)throw Error('channel_capacity510_raced');return parseCapacities510(readFileSync(fd,'utf8'));}finally{closeSync(fd);}
}
export const capacities510=read();
globalThis[Symbol.for('coreoflife.capacity.v510')]=capacities510;
export function channelCapacity510(channel,legacy=25){return feature510('channelBalance')?capacities510[channel]??25:Math.max(1,Math.min(25,Math.round(Number(legacy)||25)));}
export function channelCapacitySql510(channel,legacy){return feature510('channelBalance')?`(CASE ${channel} WHEN 1 THEN ${capacities510[1]} WHEN 2 THEN ${capacities510[2]} ELSE ${capacities510[3]} END)`:legacy;}

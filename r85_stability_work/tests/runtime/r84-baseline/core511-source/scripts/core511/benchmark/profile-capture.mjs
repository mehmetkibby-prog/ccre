// Benchmark-only: no listening inspector port and no production admin-limit change.
import {Session} from 'node:inspector/promises';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const mono=()=>Number(process.hrtime.bigint())/1e6;
export class ProfileCapture {
 async start(){
  this.session=new Session();this.session.connect();await this.session.post('Profiler.enable');await this.session.post('Profiler.setSamplingInterval',{interval:2000});
  this.beforeStart=mono();this.epochOffsetMs=performance.timeOrigin+performance.now()-this.beforeStart;await this.session.post('Profiler.start');this.afterStart=mono();
 }
 async stop(file){
  this.beforeStop=mono();let profile;
  try{({profile}=await this.session.post('Profiler.stop'));this.afterStop=mono();await this.session.post('Profiler.disable');}finally{this.session.disconnect();}
  if(!profile||profile.nodes.length>100000||profile.samples.length>100000||profile.samples.length!==profile.timeDeltas.length)throw Error('benchmark_profile_size');
  // Verify the clock-domain relation against BOTH command brackets. A failed
  // calibration is reported, never silently used to assign samples to ticks.
  const clockAligned=profile.startTime/1000>=this.beforeStart-2&&profile.startTime/1000<=this.afterStart+2&&profile.endTime/1000>=this.beforeStop-2&&profile.endTime/1000<=this.afterStop+2;
  const bytes=JSON.stringify(profile);if(Buffer.byteLength(bytes)>16*1024*1024)throw Error('benchmark_profile_bytes');fs.writeFileSync(file,bytes+'\n',{flag:'wx',mode:0o600});
  return {file,sha256:createHash('sha256').update(bytes+'\n').digest('hex'),bytes:Buffer.byteLength(bytes)+1,samples:profile.samples.length,nodes:profile.nodes.length,samplingIntervalUs:2000,clockAligned,epochOffsetMs:this.epochOffsetMs,startBracketMs:[this.beforeStart,this.afterStart],stopBracketMs:[this.beforeStop,this.afterStop],profileStartedAtMs:profile.startTime/1000+this.epochOffsetMs,profileEndedAtMs:profile.endTime/1000+this.epochOffsetMs};
 }
}

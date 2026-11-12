import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export function summarizeProfile(profile,metadata,intervals){
 if(!metadata.clockAligned)throw Error('profile_clock_not_calibrated');
 const nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();for(const n of nodes.values())for(const child of n.children??[])parents.set(child,n.id);
 const key=n=>`${n.callFrame.functionName||'(anonymous)'} @ ${n.callFrame.url}:${n.callFrame.lineNumber+1}`,stacks=new Map();
 for(const n of nodes.values()){const a=[];let p=n;while(p){a.push(key(p));p=nodes.get(parents.get(p.id));}stacks.set(n.id,[...new Set(a)]);}
 const reports=intervals.map(i=>({...i,sampledWallMs:0,self:new Map(),inclusive:new Map()}));let time=profile.startTime/1000+metadata.epochOffsetMs;
 for(let i=0;i<profile.samples.length;i++){const end=time+profile.timeDeltas[i]/1000,stack=stacks.get(profile.samples[i])??[];for(const r of reports){const ms=Math.max(0,Math.min(end,r.endedAtMs)-Math.max(time,r.startedAtMs));if(!ms)continue;r.sampledWallMs+=ms;if(stack.length)r.self.set(stack[0],(r.self.get(stack[0])??0)+ms);for(const k of stack)r.inclusive.set(k,(r.inclusive.get(k)??0)+ms);}time=end;}
 const top=m=>[...m].sort((a,b)=>b[1]-a[1]).slice(0,30).map(([functionName,sampledMs])=>({functionName,sampledMs}));
 return reports.map(({self,inclusive,...r})=>({...r,self:top(self),inclusive:top(inclusive)}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=process.argv[2],out=process.argv[3],r=JSON.parse(fs.readFileSync(input)),targets=[...r.profiles.channels.map(p=>({...p,target:'channel-'+p.channel})),{...r.profiles.main,target:'main'}];
 const result={runId:r.runId,attempt:r.attempt,sourceSha256:r.sourceIdentity.sha256,notes:'CPU samples estimate sampled wall attribution, including scheduling; not exact function CPU time. Tick work.totalMs/selfMs are measured synchronous wall times. GC overlaps those times. Both startup and normal remain in raw acceptance.',targets:targets.map(p=>{const row=r.measurement.eventLoops.find(x=>x.target===p.target),cutoff=row.startedAtMs+10000,intervals=[{name:'whole',startedAtMs:row.startedAtMs,endedAtMs:row.endedAtMs},{name:'startup',startedAtMs:row.startedAtMs,endedAtMs:cutoff},{name:'normal',startedAtMs:cutoff,endedAtMs:row.endedAtMs},...(row.game?.slowest??[]).map((t,i)=>({name:'slow-tick-'+(i+1),...t}))];return {target:p.target,profile:p,intervals:summarizeProfile(JSON.parse(fs.readFileSync(p.file)),p,intervals)};})};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
}

// O(1) input recording: 200 intervals, 60 minute counters and 30 minute spatial
// boxes. No database, timers, IPC, or reward calculations live in this module.
export const AFK_DEFAULT_SETTINGS=Object.freeze({enabled:true,continuousMinutes:120,scoreThreshold:70,responseMinutes:3,wrongLimit:3,retentionDays:7,minFarmMinutes:20,cvThreshold:.08,radiusThreshold:80,killsPerHourThreshold:120,inputRateThreshold:60});
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const number=(v,fallback)=>Number.isFinite(Number(v))&&Number(v)>0?Number(v):fallback;
export class AfkMetrics {
 constructor(now,{jitterMs=0}={}){
  this.intervals=new Float64Array(200);this.intervalCount=0;this.intervalIndex=0;this.sum=0;this.sumSquares=0;this.lastInput=null;
  this.startedAt=now;this.lastAttack=now;this.jitterMs=jitterMs;this.lastSummaryAt=now;this.totalKills=0;this.totalXp=0;this.totalInputs=0;this.reportedKills=0;this.reportedXp=0;this.reportedInputs=0;
  this.minutes=Array.from({length:60},()=>({minute:-1,kills:0,inputs:0}));this.positions=Array.from({length:30},()=>({minute:-1,minX:0,maxX:0,minY:0,maxY:0}));this.lastPositionAt=-Infinity;
 }
 reset(now,jitterMs=this.jitterMs){const fresh=new AfkMetrics(now,{jitterMs});Object.assign(this,fresh);}
 active(now){return now-this.lastAttack<=300000;}
 continuous(now){return this.active(now)?Math.max(0,now-this.startedAt):0;}
 bucket(now){const minute=Math.floor(now/60000),b=this.minutes[minute%60];if(b.minute!==minute){b.minute=minute;b.kills=0;b.inputs=0;}return b;}
 input(action,now,player,{pve=false,jitterMs=this.jitterMs}={}){
  if(pve){if(now-this.lastAttack>300000)this.reset(now,jitterMs);this.lastAttack=now;}
  if(!this.active(now)||!['attack','move','pvp_attack'].includes(action))return;
  if(this.lastInput!==null&&now>=this.lastInput){const dt=now-this.lastInput,old=this.intervals[this.intervalIndex];if(this.intervalCount===200){this.sum-=old;this.sumSquares-=old*old;}else this.intervalCount++;this.intervals[this.intervalIndex]=dt;this.intervalIndex=(this.intervalIndex+1)%200;this.sum+=dt;this.sumSquares+=dt*dt;}
  this.lastInput=now;this.totalInputs++;this.bucket(now).inputs++;this.position(player,now);
 }
 position(player,now){
  if(now-this.lastPositionAt<1000||!Number.isFinite(player?.x)||!Number.isFinite(player?.y))return;this.lastPositionAt=now;
  const minute=Math.floor(now/60000),b=this.positions[minute%30],x=player.x,y=player.y;
  if(b.minute!==minute){b.minute=minute;b.minX=b.maxX=x;b.minY=b.maxY=y;}else{b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);}
 }
 committed({kills=0,xp=0},now){if(Number.isSafeInteger(kills)&&kills>0){this.totalKills+=kills;this.bucket(now).kills+=kills;this.lastAttack=now;}if(Number.isFinite(xp)&&xp>0)this.totalXp+=xp;}
 snapshot(now,settings=AFK_DEFAULT_SETTINGS){
  const count=this.intervalCount,meanMs=count?Math.max(0,this.sum/count):0,stddevMs=count?Math.sqrt(Math.max(0,this.sumSquares/count-meanMs*meanMs)):0,cv=meanMs>0?stddevMs/meanMs:null,minute=Math.floor(now/60000);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,killsPerHour=0,recentInputs=0;
  for(const b of this.positions)if(b.minute>minute-30&&b.minute<=minute){minX=Math.min(minX,b.minX);maxX=Math.max(maxX,b.maxX);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY);}
  for(const b of this.minutes)if(b.minute>minute-60&&b.minute<=minute){killsPerHour+=b.kills;if(b.minute>=minute-4)recentInputs+=b.inputs;}
  const radius=Number.isFinite(minX)?Math.hypot(maxX-minX,maxY-minY)/2:0,continuousMs=this.continuous(now),inputsPerMinute=recentInputs/Math.max(1,Math.min(5,(now-this.startedAt)/60000));
  const cvThreshold=number(settings.cvThreshold,.08),radiusThreshold=number(settings.radiusThreshold,80),parts={regularity:count>=30&&cv!==null?45*clamp(1-cv/(2*cvThreshold)):0,position:20*clamp(1-radius/radiusThreshold),duration:20*clamp(continuousMs/(number(settings.continuousMinutes,120)*60000)),kills:10*clamp(killsPerHour/number(settings.killsPerHourThreshold,120)),inputs:5*clamp(inputsPerMinute/number(settings.inputRateThreshold,60))};
  const score=this.active(now)?Math.round(Object.values(parts).reduce((n,v)=>n+v,0)):0,reasons=[];
  if(parts.regularity>0)reasons.push(`Girdi aralığı CV ${cv.toFixed(3)}; düzenlilik +${parts.regularity.toFixed(1)}`);
  if(parts.position>0)reasons.push(`Son 30 dakika konum yarıçapı ${Math.round(radius)} px; alan +${parts.position.toFixed(1)}`);
  reasons.push(`${Math.floor(continuousMs/60000)} dakika kesintisiz; süre +${parts.duration.toFixed(1)}`,`Son 60 dakika ${killsPerHour} öldürme; +${parts.kills.toFixed(1)}`,`Dakikada ${inputsPerMinute.toFixed(1)} girdi; +${parts.inputs.toFixed(1)}`);
  return {score,reasons,continuousMs,meanMs,stddevMs,cv,radius,killsPerHour,hourlyKills:killsPerHour,inputsPerMinute,kills:this.totalKills-this.reportedKills,xp:this.totalXp-this.reportedXp,inputs:this.totalInputs-this.reportedInputs,fromMs:this.lastSummaryAt,toMs:now,intervalCount:count};
 }
 due(now){return this.active(now)&&now-this.lastSummaryAt>=300000;}
 summary(now,settings){const row=this.snapshot(now,settings);this.lastSummaryAt=now;this.reportedKills=this.totalKills;this.reportedXp=this.totalXp;this.reportedInputs=this.totalInputs;return row;}
}

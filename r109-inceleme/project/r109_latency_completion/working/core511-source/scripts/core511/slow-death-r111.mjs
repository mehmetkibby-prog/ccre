// Fixed-field, bounded journal evidence for intermittent live waits. No player,
// target, request, inventory or authentication data is included. Reporting is
// observational: a failed log sink must never reject or retry a committed kill.
export function createSlowDeathReporterR111({write=line=>console.error(line),now=()=>performance.now()}={}){
 let until=0,count=0,suppressed=0;
 return observation=>{
  try{
   const keys=['totalMs','checkpointMs','writerMs','refreshMs','inputWaitMs'];
   if(!observation||!keys.every(key=>Number.isFinite(observation[key])&&observation[key]>=0))return;
   if(observation.totalMs+observation.inputWaitMs<500)return;
   const at=now();if(!Number.isFinite(at)||at<0)return;
   if(at>=until){until=at+60000;count=0;}
   if(count>=8){suppressed=Math.min(1000000,suppressed+1);return;}
   count++;
   const row={event:'core511_slow_death',schema:1,atMs:observation.atMs,pid:process.pid,
    channel:Number.isInteger(observation.channel)&&observation.channel>=1&&observation.channel<=4?observation.channel:null,
    outcome:['completed','rejected','failed'].includes(observation.outcome)?observation.outcome:'unknown',
    thresholdMs:500,suppressed};
   for(const key of keys)row[key]=Math.round(observation[key]*10)/10;
   row.serverWaitMs=Math.round((observation.totalMs+observation.inputWaitMs)*10)/10;
   write(JSON.stringify(row));suppressed=0;
  }catch{/* Observability has no authority over gameplay. */}
 };
}
export const reportSlowDeathR111=createSlowDeathReporterR111();

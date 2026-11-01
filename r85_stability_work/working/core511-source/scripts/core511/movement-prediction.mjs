// Presentation-only prediction. Authority and durable command results stay on
// the server. Pending input functions contain only the pinned V510 motion math.
const point = p => ({x:p.x,y:p.y});
const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const revision = p => p?.positionRevision ?? p?.position_revision;

export class OwnPrediction {
 constructor(){this.clear();this.serial=0;this.motionSerial=0;}
 clear(){this.authority=null;this.predicted=null;this.pending=[];this.flight=null;this.scope=null;this.offset={x:0,y:0};this.correctedAt=0;this.lastAt=null;}
 bind(row,scope,at){
  if(!finitePoint(row)||!Number.isSafeInteger(revision(row)))return false;
  if(this.scope!==scope||!this.authority){this.clear();this.scope=scope;this.authority={...point(row),area:row.area,revision:revision(row)};this.predicted=point(row);this.lastAt=at;return true;}
  if(revision(row)>this.authority.revision){
   // A newer position without our committed movement result is a server-side
   // relocation (teleport/death/control/etc), never another predicted step.
   this.snap(row,at);
  }
  return true;
 }
 snap(row=this.authority,at=0){
  if(!finitePoint(row))return this.clear();
  this.authority={...point(row),area:row.area,revision:revision(row)??row.revision};
  this.predicted=point(row);this.pending=[];this.flight=null;this.offset={x:0,y:0};this.correctedAt=at;
 }
 position(at){
  if(!this.predicted)return null;
  const blend=Math.max(0,1-(at-this.correctedAt)/100);
  return {x:this.predicted.x+this.offset.x*blend,y:this.predicted.y+this.offset.y*blend};
 }
 advance(seconds,integrate,at){
  if(!this.predicted||typeof integrate!=='function')return this.position(at);
  // A suspended tab/network cannot accrue an unbounded speculative journey.
  const pendingSeconds=this.pending.reduce((n,row)=>n+row.seconds,0);
  let remaining=Math.min(.25,Math.max(0,seconds),Math.max(0,.6-pendingSeconds));
  while(remaining>1e-7&&this.pending.length<128){
   const dt=Math.min(.05,remaining),from=point(this.predicted),to=integrate(from,dt);
   if(!finitePoint(to))throw Error('invalid_prediction_point');
   remaining-=dt;
   if(distance(from,to)<1e-7)continue;
   const entry={id:++this.serial,motionSequence:++this.motionSerial,seconds:dt,integrate,from,to:point(to)};
   this.pending.push(entry);this.predicted=point(to);
  }
  this.lastAt=at;return this.position(at);
 }
 batch(){
  if(this.flight||!this.authority||!this.pending.length)return null;
  const path=[[this.authority.x,this.authority.y]];let seconds=0,through=0,motionSequence=0;
  for(const row of this.pending){
   if(seconds+row.seconds>.350001||path.length>=64)break;
   path.push([row.to.x,row.to.y]);seconds+=row.seconds;through=row.id;motionSequence=row.motionSequence;
  }
  if(!through)return null;
  const [x,y]=path.at(-1);
  return {through,motionSequence,seconds,target:{x,y},payload:{action:'move',x,y,area:this.authority.area,path,basePositionRevision:this.authority.revision}};
 }
 sent(sequence,batch){
  if(this.flight||!Number.isSafeInteger(sequence)||!batch)throw Error('prediction_flight');
  this.flight={sequence,...batch};
 }
 notQueued(sequence){if(this.flight?.sequence===sequence)this.flight=null;}
 acknowledge(sequence,status,data,at){
  const flight=this.flight;if(!flight||flight.sequence!==sequence)return false;
  this.flight=null;
  if(status>=400||data?.ok===false||!finitePoint(data)||!Number.isSafeInteger(revision(data))){this.snap(finitePoint(data)&&Number.isSafeInteger(revision(data))?data:this.authority,at);return true;}
  const shown=this.position(at);
  this.pending=this.pending.filter(row=>row.id>flight.through);
  this.authority={...point(data),area:data.area??this.authority.area,revision:revision(data)};
  let p=point(data);
  for(const row of this.pending){row.from=point(p);p=row.integrate(p,row.seconds);if(!finitePoint(p))throw Error('invalid_replayed_point');row.to=point(p);row.motionSequence=++this.motionSerial;}
  this.predicted=point(p);
  const error=distance(shown,p),relocated=data.area&&data.area!==flight.payload.area;
  if(relocated||error>12){this.offset={x:0,y:0};if(relocated)this.snap(data,at);}
  else this.offset={x:shown.x-p.x,y:shown.y-p.y};
  this.correctedAt=at;return true;
 }
 cancel(at){this.snap(this.authority,at);}
}

// Arrival-time snapshot interpolation, no extrapolation or monster AI. Start
// with 100ms; sparse (e.g. 200ms movement checkpoints) need one whole observed
// interval in the buffer, otherwise a fixed 100ms buffer repeatedly runs dry.
// Scope/spawn changes and large jumps are discontinuities, not animations.
export class BufferedInterpolation {
 constructor({delay=100}={}){this.delay=delay;this.rows=new Map();this.scope=null;this.ownId=null;}
 accept(world,at){
  const scope=JSON.stringify([world.world?.cycle,world.channel,world.area,world.arenaMatch?.id]);
  if(scope!==this.scope){this.clear();this.scope=scope;}
  const keep=new Set();
  for(const type of ['players','monsters'])for(const row of world[type]??[]){
   if(type==='players'&&row.id===this.ownId)continue;
   if(!finitePoint(row))continue;
   const key=type+':'+row.id,epoch=JSON.stringify([row.area,row.spawn_round??0,row.respawn_at_ms??0]),old=this.rows.get(key);keep.add(key);
   if(!old||old.epoch!==epoch||distance(old.samples.at(-1),row)>420){this.rows.set(key,{epoch,samples:[{...point(row),at}],intervals:[],cursor:at,displayedAt:at});continue;}
   const samples=old.samples;
   if(at<=samples.at(-1).at)continue;
   // Full world packets include unchanged positions. They are not new
   // movement checkpoints and must not turn a 200ms segment into a 20ms jump.
   if(distance(samples.at(-1),row)<1e-7)continue;
   const interval=at-samples.at(-1).at;
   if(interval>500){
    old.intervals=[];old.cursor=at-this.delay;old.displayedAt=at;
    old.samples=[{...point(samples.at(-1)),at:old.cursor},{...point(row),at}];continue;
   }
   old.intervals.push(interval);if(old.intervals.length>6)old.intervals.shift();
   samples.push({...point(row),at});
   while(samples.length>2&&samples[1].at<Math.min(old.cursor,at-this.delay-300))samples.shift();
   if(samples.length>128)samples.splice(0,samples.length-128);
  }
  for(const key of this.rows.keys())if(!keep.has(key))this.rows.delete(key);
 }
 position(type,row,at){
  const state=this.rows.get(type+':'+row.id),samples=state?.samples;if(!samples?.length)return point(row);
  const delay=Math.max(this.delay,Math.min(300,Math.max(0,...state.intervals)));
  const desired=Math.min(at-delay,samples.at(-1).at),elapsed=Math.max(0,at-state.displayedAt);
  // Never rewind the presentation clock when jitter grows the buffer; when
  // it shrinks, catch up gently instead of skipping a remote movement segment.
  const target=state.cursor=Math.max(state.cursor,Math.min(desired,state.cursor+elapsed*1.1));state.displayedAt=at;
  if(target<=samples[0].at)return point(samples[0]);
  for(let i=1;i<samples.length;i++)if(samples[i].at>=target){const a=samples[i-1],b=samples[i],t=(target-a.at)/(b.at-a.at);return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
  return point(samples.at(-1));
 }
 clear(){this.rows.clear();this.scope=null;}
}

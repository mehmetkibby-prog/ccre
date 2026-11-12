// Shared data and pure rules. No timers, SQL, browser state or client authority.
export const CASTLE_AREA='guild_castle';
export const CASTLE_CHANNEL=4;
export const CASTLE_CAPACITY=100;
export const castleEnabled=()=>typeof process==='undefined'||process.env.CORE511_R59_CASTLE==='1';
export const CASTLE_BOUNDS=Object.freeze({width:2400,height:1600});
export const CASTLE_ENTRY=Object.freeze({x:1200,y:1430});
export const CASTLE_OBJECTIVES=Object.freeze([
 Object.freeze({id:'west',name:'Batı Mührü',x:535,y:910,radius:115,captureMs:10000}),
 Object.freeze({id:'east',name:'Doğu Mührü',x:1870,y:910,radius:115,captureMs:10000}),
 Object.freeze({id:'throne',name:'Kale Tahtı',x:1200,y:535,radius:145,captureMs:30000})
]);
const DAY=86400000,OFFSET=10800000;
export function castleSchedule(now){
 if(!Number.isSafeInteger(now)||now<0)throw Error('castle_clock');
 const local=Math.floor((now+OFFSET)/DAY)*DAY-OFFSET,start=local+20*3600000,end=start+1800000;
 return {day:new Date(local+OFFSET).toISOString().slice(0,10),opensAt:start-1800000,startsAt:start,endsAt:end,phase:now<start-1800000?'peace':now<start?'preparation':now<end?'battle':'peace'};
}
// Admin test sessions have no reward ledger and never replace the daily battle.
export function castleTestScheduleR59(config,now){const t=config?.test;if(!t||typeof t.id!=='string'||!/^[a-f0-9]{32}$/.test(t.id)||!Number.isSafeInteger(t.startsAt)||!Number.isSafeInteger(t.endsAt)||t.endsAt<=t.startsAt||t.endsAt-t.startsAt>1800000||now<t.startsAt||now>=t.endsAt||castleSchedule(now).phase==='battle')return null;return {day:'test:'+t.id,opensAt:t.startsAt,startsAt:t.startsAt,endsAt:t.endsAt,phase:'battle',test:true};}
export const castleBattle=now=>castleSchedule(now).phase==='battle';
export const castleFriendly=(a,b)=>Boolean(a&&b&&a===b);
export function castleMayDamage(a,b,now,guildOf,schedule=castleSchedule(now)){return a?.area!==CASTLE_AREA&&b?.area!==CASTLE_AREA?true:Boolean(a&&b&&a.id!==b.id&&a.area===CASTLE_AREA&&b.area===CASTLE_AREA&&a.channel===CASTLE_CHANNEL&&b.channel===CASTLE_CHANNEL&&schedule.phase==='battle'&&guildOf(a.id)&&guildOf(b.id)&&!castleFriendly(guildOf(a.id),guildOf(b.id)));}
export const castleInside=(p,o)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&(p.x-o.x)**2+(p.y-o.y)**2<=o.radius**2;
export function emptyCastle(day,now){return {version:1,day,revision:0,status:'active',lastAt:now,owner:null,winner:null,holdSince:0,seals:{west:null,east:null},scores:{},guildNames:{},captures:{},rosterReady:false};}
function credit(s,at){if(s.owner&&at>s.lastAt){const row=s.scores[s.owner]??={ms:0,longestMs:0,firstAt:s.holdSince};row.ms+=at-s.lastAt;row.longestMs=Math.max(row.longestMs,at-s.holdSince);}s.lastAt=Math.max(s.lastAt,at);}
export function castleRanking(s,at=s.lastAt){const copy=structuredClone(s);if(copy.status==='active')credit(copy,Math.min(Math.max(copy.lastAt,at),(copy.endsAt??castleSchedule(copy.lastAt).endsAt)));return Object.entries(copy.scores).map(([guild,r])=>({guild,name:copy.guildNames[guild]??'Lonca',...r})).sort((a,b)=>b.ms-a.ms||b.longestMs-a.longestMs||a.firstAt-b.firstAt||a.guild.localeCompare(b.guild));}
// Invoked by the existing channel tick, at most ten times a second. Exactly one
// scan of the local actors serves all objectives and all HUD subscribers.
export function stepCastle(input,players,now,{resume=false,enabled=true,schedule=castleSchedule(now)}={}){
let s=structuredClone(input),changed=false;
 if(s?.status==='active'&&s.day!==schedule.day){const end=s.endsAt??Date.parse(s.day+'T20:30:00+03:00');if(!resume)credit(s,end);const first=castleRanking(s)[0];s.status='finished';s.winner=first&&first.ms>0?first.guild:null;s.owner=s.winner;s.captures={};return {state:s,changed:true,finished:true};}
 if(!s||s.day!==schedule.day){if(!enabled||now<schedule.startsAt)return {state:s,changed:false};s={...emptyCastle(schedule.day,Math.min(now,schedule.endsAt)),endsAt:schedule.endsAt};changed=true;}
 if(s.status==='finished'||now<schedule.startsAt)return {state:s,changed};
 const at=Math.min(now,schedule.endsAt);if(at<s.lastAt)return {state:s,changed};
 if(resume){s.lastAt=at;s.holdSince=at;s.captures={};}else credit(s,at);
 if(!enabled||now>=schedule.endsAt){const first=castleRanking(s)[0];s.status='finished';s.winner=first&&first.ms>0?first.guild:null;s.owner=s.winner;s.captures={};return {state:s,changed:true,finished:true};}
 const occupants=new Map(CASTLE_OBJECTIVES.map(o=>[o.id,new Map()]));
 for(const p of players){if(p.area!==CASTLE_AREA||p.channel!==CASTLE_CHANNEL||p.hp<=0||!p.guild||p.active===false)continue;s.guildNames[p.guild]=p.guildName??s.guildNames[p.guild]??'Lonca';for(const o of CASTLE_OBJECTIVES)if(castleInside(p,o))occupants.get(o.id).set(p.guild,true);}
 for(const o of CASTLE_OBJECTIVES){const groups=occupants.get(o.id),guild=groups.size===1?groups.keys().next().value:null,current=o.id==='throne'?s.owner:s.seals[o.id];
  if(!guild||current===guild||o.id==='throne'&&(s.seals.west!==guild||s.seals.east!==guild)){if(s.captures[o.id]){delete s.captures[o.id];changed=true;}continue;}
  let c=s.captures[o.id];if(c?.guild!==guild){c=s.captures[o.id]={guild,since:now};changed=true;}
  if(now-c.since<o.captureMs)continue;
  if(o.id==='throne'){s.owner=guild;s.holdSince=now;s.scores[guild]??={ms:0,longestMs:0,firstAt:now};}else s.seals[o.id]=guild;
  delete s.captures[o.id];changed=true;
 }
 return {state:s,changed};
}
export function publicCastle(s,now,schedule=castleSchedule(now)){const t=schedule;return {...t,serverTime:now,area:CASTLE_AREA,channel:CASTLE_CHANNEL,owner:s?.owner?{id:s.owner,name:s.guildNames[s.owner]??'Lonca'}:null,eventDay:s?.day??null,status:s?.status??'waiting',seals:s?.seals??{west:null,east:null},captures:s?.captures??{},guildNames:s?.guildNames??{},scores:s?castleRanking(s,now).slice(0,8):[],winner:s?.winner??null,objectives:CASTLE_OBJECTIVES};}
// The art has broad paths and low islands. Ground collision is expressed in
// ordinary world units, used by both native prediction and authoritative moves.
const islands=[[610,490,115,115],[1780,490,125,115],[720,1030,110,145],[1680,1030,110,145]];
export function castleWalkable(x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||x<150||x>2250||y<235||y>1505)return false;return !islands.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<1);}
export function castleSegment(x,y,tx,ty){if(!castleWalkable(x,y)||!castleWalkable(tx,ty))return false;const steps=Math.ceil(Math.hypot(tx-x,ty-y)/35);for(let i=1;i<steps;i++)if(!castleWalkable(x+(tx-x)*i/steps,y+(ty-y)*i/steps))return false;return true;}

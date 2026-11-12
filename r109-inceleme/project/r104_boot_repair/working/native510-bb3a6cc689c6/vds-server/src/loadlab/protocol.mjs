import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
export const BASE_MANIFEST='0d352caa12e40846a3864eb9645c8de3a593b53b38b1666e2eb213fb7b8b12fc';
export const GENERATOR_IP='45.84.191.73', LIVE_IP='45.84.191.223';
export const VERSION='col-loadlab-v1';
export const LIMITS=Object.freeze({channels:3,channelCapacity:25,maxBots:75,maxDurationSeconds:900,maxWindowMs:3600000,heartbeatMs:6000});
export const SCENARIOS=new Set(['distributed-pve','pvp-10v10','boss','mixed']);
export const digest=v=>createHash('sha256').update(v).digest('hex');
export const sessionDigest=v=>createHash('sha256').update(v).digest('base64url');
export const opaque=()=>randomBytes(32).toString('base64url');
export const fail=(code,status=400)=>Object.assign(new Error(code),{code,status});
export function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length>4096||b.length>4096)return false;return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());}
export function validId(id){return typeof id==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(id);}
export function validateConfig(input,occupancy=[0,0,0]){
 if(!input||typeof input!=='object'||Array.isArray(input))throw fail('invalid_config');
 const allocations=input.allocations;
 if(!Array.isArray(allocations)||allocations.length!==3||allocations.some(n=>!Number.isInteger(n)||n<0||n>25))throw fail('channel_limit_25');
 const count=allocations.reduce((a,b)=>a+b,0);
 if(count<1||count>75)throw fail('live_capacity_75');
 if(input.botCount!==undefined&&input.botCount!==count)throw fail('allocation_total_mismatch');
 if(!Number.isInteger(input.durationSeconds)||input.durationSeconds<60||input.durationSeconds>900)throw fail('duration_1_to_15_minutes');
 if(!SCENARIOS.has(input.scenario))throw fail('invalid_scenario');
 const reserve={enabled:input.reserve?.enabled===true,channel:input.reserve?.channel??1};
 if(!Number.isInteger(reserve.channel)||reserve.channel<1||reserve.channel>3)throw fail('invalid_reserve_channel');
 if(!Array.isArray(occupancy)||occupancy.length!==3||occupancy.some(n=>!Number.isInteger(n)||n<0||n>25))throw fail('occupancy_unavailable',503);
 allocations.forEach((n,i)=>{if(n+occupancy[i]+Number(reserve.enabled&&reserve.channel===i+1)>25)throw fail('channel_'+(i+1)+'_capacity_or_reserved_seat',409);});
 const ramp={stepBots:input.ramp?.stepBots??10,everySeconds:input.ramp?.everySeconds??30};
 if(!Number.isInteger(ramp.stepBots)||ramp.stepBots<1||ramp.stepBots>75||!Number.isInteger(ramp.everySeconds)||ramp.everySeconds<10||ramp.everySeconds>60)throw fail('invalid_ramp');
 const pvpChannel=allocations.findIndex(n=>n>=20)+1;
 if(input.scenario==='pvp-10v10'&&(count!==20||allocations.filter(Boolean).length!==1))throw fail('pvp_requires_exactly_20_in_one_channel');
 if(input.scenario==='mixed'&&(!pvpChannel||count<21))throw fail('mixed_requires_20_in_one_channel_and_pve');
 return {botCount:count,allocations:[...allocations],durationSeconds:input.durationSeconds,scenario:input.scenario,reserve,ramp,pvpChannel:input.scenario==='mixed'||input.scenario==='pvp-10v10'?pvpChannel:null};
}
export async function bodyJson(req,limit=262144){let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw fail('body_too_large',413);chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('invalid_json');}}
export function reply(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-length':Buffer.byteLength(body)});res.end(body);}

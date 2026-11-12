// Pure rules shared by UI previews and the authoritative writer. All clocks
// supplied to mutations are server clocks; client durations are never accepted.
export const AUTO_DAILY_MS_R102=10800000;
export const AUTO_TICKET_MS_R102=10800000;
export const AUTO_TICKET_CP_R102=150;
export const AUTO_TICKET_DAILY_LIMIT_R102=3;
export const AUTO_LEASE_MS_R102=12000;
export const ISLAND_DAILY_MS_R102=21600000;
export const CHAMPION_MAX_R102=1000000;
export const CONTENT_KINDS_R102=Object.freeze({sock:'newyear_sock_r102',newyear:'newyear_chest_r102',victory:'victory_chest_r102',ticket:'auto_attack_ticket_r102'});
export const CONTENT_ACTIONS_R102=Object.freeze(['content_status_r102','auto_start_r102','auto_buy_r102','auto_tick_r102','auto_stop_r102','auto_ticket_r102','newyear_convert_r102','content_chest_r102','champion_enter_r102','champion_reward_r102','emerald_infinite_r102']);
export const contentErrorR102=(message,code='content_invalid_r102',status=422)=>Object.assign(Error(message),{gameCode:code,status,contentRuleR102:true});
export function intR102(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw contentErrorR102(label+' geçersiz.');return value;}
export function dayR102(ms){return Math.floor((ms+10800000)/86400000);}
export function resetAtR102(ms){return (dayR102(ms)+1)*86400000-10800000;}
export function championThresholdR102(level,{baseXp,stepXp}){const n=level-1;return n*baseXp+n*(n-1)/2*stepXp;}
export function championProgressR102(xp,config){
 let lo=1,hi=CHAMPION_MAX_R102;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(championThresholdR102(mid,config)<=xp)lo=mid;else hi=mid-1;}
 const floor=championThresholdR102(lo,config),ceiling=lo===CHAMPION_MAX_R102?floor:championThresholdR102(lo+1,config);
 return {level:lo,xp,levelXp:xp-floor,requiredXp:ceiling-floor,remainingXp:Math.max(0,ceiling-xp),bonus:lo/5};
}
// Settle only the last server lease, including a midnight boundary. A closed
// browser cannot silently consume hours. Saved purchased time never expires.
export function settleAutoR102(saved,now){
 const row={day:dayR102(now),used_ms:0,paid_ms:0,active_player:'',tick_at_ms:now,lease_until_ms:0,...saved};
 if(!Number.isSafeInteger(now)||now<0)throw contentErrorR102('Sunucu saati geçersiz.');
 if(now<row.tick_at_ms){row.active_player='';row.lease_until_ms=0;return {...row,active:false,remainingMs:Math.max(0,AUTO_DAILY_MS_R102-row.used_ms)+row.paid_ms,resetAtMs:resetAtR102(now)};}
 let cursor=row.tick_at_ms,end=row.active_player?Math.min(now,row.lease_until_ms):cursor;
 // Leases are at most 12 seconds, so this loop has at most two segments.
 while(cursor<end){
  const day=dayR102(cursor);if(row.day!==day){row.day=day;row.used_ms=0;}
  const until=Math.min(end,resetAtR102(cursor)),elapsed=until-cursor;
  const free=Math.min(elapsed,Math.max(0,AUTO_DAILY_MS_R102-row.used_ms));
  row.used_ms+=free;row.paid_ms=Math.max(0,row.paid_ms-(elapsed-free));cursor=until;
 }
 if(row.day!==dayR102(now)){row.day=dayR102(now);row.used_ms=0;}
 const remainingMs=Math.max(0,AUTO_DAILY_MS_R102-row.used_ms)+row.paid_ms;
 const active=!!row.active_player&&now<row.lease_until_ms&&remainingMs>0;
 if(!active){row.active_player='';row.lease_until_ms=0;}
 return {...row,tick_at_ms:now,active,remainingMs,resetAtMs:resetAtR102(now)};
}
export function battlefieldWindowR102(config,now){
 const local=new Date(now+10800000),day=local.getUTCDay(),minute=local.getUTCHours()*60+local.getUTCMinutes();
 if(!config.enabled)return null;
 for(const slot of config.slots){
  const overnight=slot.end<slot.start;
  const date=minute<slot.end&&overnight?dayR102(now)-1:dayR102(now);
  const weekday=minute<slot.end&&overnight?(day+6)%7:day;
  if(slot.days.includes(weekday)&&(overnight?minute>=slot.start||minute<slot.end:minute>=slot.start&&minute<slot.end))return {key:date+':'+slot.start,startAt:date*86400000-10800000+slot.start*60000,endAt:(date+(overnight?1:0))*86400000-10800000+slot.end*60000};
 }
 return null;
}

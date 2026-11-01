import {castleSchedule,castleEnabled} from './castle-model-r59.mjs';
import {gameplayR60} from './r60-options.mjs';
export const CASTLE_NOTICE_DURATION_R60=10000;
// Calendar-derived identity makes restarts and all four channels agree without
// a new job, database write, per-player receipt or announcement queue scan.
export class CastleNoticesR60{
 constructor(){this.until=-Infinity;this.since=Infinity;this.enabled=false;this.value=null;}
 read(config,now){
  const enabled=gameplayR60.castleNotices&&castleEnabled()&&config?.enabled===true;
  if(enabled===this.enabled&&now>=this.since&&now<this.until)return this.value;
  this.enabled=enabled;this.since=now;this.value=null;
  if(!enabled){this.until=Infinity;return null;}
  const schedule=castleSchedule(now),events=[
   {at:schedule.opensAt,kind:'preparation',message:'Kale savaşı hazırlıkları başladı! Loncanla kalede yerini al. Savaş saat 20:00’de başlayacak.'},
   {at:schedule.startsAt,kind:'battle',message:'Kale savaşı başladı! Mühürleri ve tahtı ele geçir, loncanın adını kaleye yazdır!'}
  ];
  this.until=schedule.opensAt+86400000;
  for(const event of events){
   if(now<event.at){this.until=event.at;break;}
   if(now<event.at+CASTLE_NOTICE_DURATION_R60){this.until=event.at+CASTLE_NOTICE_DURATION_R60;this.value=Object.freeze({match_id:'castle:'+schedule.day+':'+event.kind,mode:'castle',team_name:'Lonca Kalesi',message:event.message,created_at_ms:event.at,expires_at_ms:this.until});break;}
  }
  return this.value;
 }
}

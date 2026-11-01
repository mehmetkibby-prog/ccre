import {MOTION_SCREEN_MULTIPLIER,validMotionMultiplier} from './motion-proximity.mjs';
const reply=(status,message,extra={})=>({status,body:{ok:status<400,message,...extra}});
// Separate cold admin setting; independent of AFK enable/disable and economy.
export class MotionSettings {
 constructor(core){
  this.core=core;this.closed=false;this.value={screenMultiplier:MOTION_SCREEN_MULTIPLIER,revision:0};this.tail=Promise.resolve();this.pending=new Map();
  this.ready=core.database.atomic(sql=>{
   sql.exec('CREATE TABLE IF NOT EXISTS core511_motion_settings(id INTEGER PRIMARY KEY CHECK(id=1),screen_multiplier REAL NOT NULL CHECK(screen_multiplier>=1.5 AND screen_multiplier<=6),revision INTEGER NOT NULL,updated_ms INTEGER NOT NULL,admin_id TEXT NOT NULL)');
   const row=sql.prepare('SELECT screen_multiplier,revision FROM core511_motion_settings WHERE id=1').get();
   if(row&&validMotionMultiplier(row.screen_multiplier))this.value={screenMultiplier:row.screen_multiplier,revision:row.revision};
  });
  void this.ready.catch(()=>{});
  this.admin={read:async(_query,auth)=>{await this.ready;await this.tail;return auth?.adminId?{ok:true,settings:this.snapshot()}:reply(403,'Yönetici yetkisi gerekli.').body;},mutate:(input,auth)=>this.update(input,auth)};
 }
 snapshot(){return {...this.value,enabled:process.env.CORE511_MOTION_STREAM!=='0'};}
 async boot(){await this.ready;await this.tail;return this.snapshot();}
 update(input,{adminId,reauthorize}={}){
  const next=this.tail.then(async()=>{
   await this.ready;if(this.closed||this.core.stopping)return reply(503,'Sunucu kapanıyor.');
   if(!adminId||typeof reauthorize!=='function'||await reauthorize()!==adminId)return reply(403,'Yönetici oturumu doğrulanamadı.');
   if(!validMotionMultiplier(input?.screenMultiplier))return reply(400,'Ekran katsayısı 1,5 ile 6 arasında olmalı.');
   const value={screenMultiplier:input.screenMultiplier,revision:this.value.revision+1};
   await this.core.database.atomic(sql=>sql.prepare('INSERT INTO core511_motion_settings VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET screen_multiplier=excluded.screen_multiplier,revision=excluded.revision,updated_ms=excluded.updated_ms,admin_id=excluded.admin_id').run(value.screenMultiplier,value.revision,this.core.clock(),adminId));
   this.value=value;for(const row of this.core.processes.values())if(row.online)this.pending.set(row.peer.channel,row);this.flush();
   return reply(200,'Yakınlık ayarı kaydedildi.',{settings:this.snapshot()});
  }).catch(()=>reply(503,'Ayar kaydedilemedi. Yeniden dene.'));
  this.tail=next;return next;
 }
 flush(){
  if(this.closed)return;
  for(const [channel,row]of this.pending){
   if(!row.online||this.core.processes.get(channel)!==row){this.pending.delete(channel);continue;}
   if(row===this.busy?.get(channel))continue;
   this.busy??=new Map();this.busy.set(channel,row);const settings=this.snapshot();
   void row.control.request('motion_settings',settings).then(()=>{if(this.value.revision===settings.revision&&this.pending.get(channel)===row)this.pending.delete(channel);},()=>{}).finally(()=>{this.busy.delete(channel);this.retry();});
  }
  this.retry();
 }
 retry(){if(!this.closed&&this.pending.size&&!this.timer){this.timer=setTimeout(()=>{this.timer=null;this.flush();},1000);this.timer.unref?.();}}
 close(){this.closed=true;clearTimeout(this.timer);this.pending.clear();}
}

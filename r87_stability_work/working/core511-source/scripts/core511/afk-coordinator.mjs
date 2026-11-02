import {AfkService} from './afk-service.mjs';
import {createAfkSchema} from './afk-schema.mjs';
import {verificationRoomReaderR90} from './verification-room-r90.mjs';

const failure=(status,code,error)=>({status,body:{ok:false,code,error}});
const unavailable=()=>failure(503,'afk_check_unavailable','Doğrulama şu anda kullanılamıyor. Biraz sonra yeniden dene.');
const denied=()=>failure(401,'afk_check_session','Doğrulama oturumu değişti. Yeniden bağlan.');

// Yalnız yeni AFK tabloları aynı dayanıklı SQLite yazı kuyruğuna girer.
// Bu kuyruk hiçbir oyuncuyu/kanalı dondurmaz ve oyun ödüllerine dokunmaz.
// Değişen kilit/soru bilgisi ancak COMMIT ve fsync tamamlandıktan sonra yayınlanır.
export class AfkCoordinator {
 constructor(core){
  this.core=core;this.closed=false;this.tail=Promise.resolve();this.delivery=new Map();this.pendingChanges=[];this.nextPurge=core.clock()+60000;
  this.ready=core.database.atomic(sql=>{
   createAfkSchema(sql);
   this.verificationRoomR90=verificationRoomReaderR90(sql);
   this.service=new AfkService({sql,now:core.clock,deferCommit:true,onChange:change=>this.pendingChanges.push(change)});
  }).then(()=>{this.service.commit();this.pendingChanges.length=0;});
  // Başlangıç hatası boot() tarafından gözlenir; sahipsiz Promise oluşmaz.
  void this.ready.catch(()=>{});
  this.admin={read:(query,auth)=>this.readAdmin(query,auth),mutate:(input,auth)=>this.mutateAdmin(input,auth)};
 }
 async boot(){await this.ready;this.start();return {settings:this.service.settings()};}
 enqueue(work){
  const next=this.tail.then(async()=>{await this.ready;if(this.closed||this.closing||this.core.closed||this.core.stopping)return unavailable();return work();});
  this.tail=next.catch(()=>{});return next;
 }
 async durable(work){
  let result;
  try{result=await this.core.database.atomic(work);this.service.commit();}
  catch(error){this.service.discard();this.pendingChanges.length=0;throw error;}
  this.publishChanges();return result;
 }
 identity(s){
  return {...s.identity,playerName:s.session.player?.name??s.identity.actor,accountName:s.session.account?.username??s.identity.account};
 }
 accountAdmin(s){
  const id=String(process.env.ADMIN_USER_ID??'').trim(),email=String(process.env.ADMIN_EMAIL??'').trim().toLowerCase();
  return Boolean(id&&s.identity.account===id||!this.core.realm&&email&&String(s.session.account?.email??'').trim().toLowerCase()===email);
 }
 async attach(s){
  return this.enqueue(()=>this.durable(()=>{
   const sql=this.core.database.sqlite,p=sql.prepare('SELECT id,name,area,channel,is_gm FROM players WHERE id=? AND account_id=?').get(s.identity.actor,s.identity.account);
   if(!p)return denied();
   const afk=sql.prepare('SELECT active FROM afk_hunt_state WHERE player_id=?').get(p.id);
   return this.service.attach({...this.identity(s),playerName:p.name,channel:p.channel,map:p.area},{exempt:this.accountAdmin(s)||Boolean(p.is_gm)||Boolean(afk?.active),eligible:false});
  }));
 }
 bundle(bundle){
  const s=this.core.sessions.get(bundle.player?.id);if(!s||!this.service)return bundle;
  const identity=this.identity(s),context={exempt:this.accountAdmin(s)||Boolean(bundle.player.is_gm)||Boolean(bundle.combat?.afk?.active)};
  bundle.afkCheck=this.service.defer(identity,context);return bundle;
 }
 current(peer,payload){
  const c=this.core,s=c.sessions.get(payload?.actor),identity=s?.identity,row=c.processes.get(peer.channel),owner=c.writer.owners.get(payload?.actor);
  if(!identity||!row?.online||row.peer.incarnation!==peer.incarnation||identity.boot!==peer.incarnation||identity.channel!==peer.channel||identity.epoch!==payload.epoch||identity.session!==payload.session||identity.account!==payload.account||owner?.epoch!==identity.epoch||owner.channel!==peer.channel||owner.incarnation!==peer.incarnation||!c.securityCurrent(identity.actor,identity.epoch))return null;
  return s;
 }
 request(peer,payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return Promise.resolve(denied());
  return this.enqueue(async()=>{
   const s=this.current(peer,payload);if(!s)return denied();
   const identity=this.identity(s),op=payload.op;
   if(op==='state')return {status:200,body:{ok:true,afkCheck:this.service.state(identity)}};
   if(op==='context')return {status:200,body:{ok:true,afkCheck:this.service.defer(identity,{eligible:payload.eligible===true,exempt:this.accountAdmin(s)||payload.exempt===true})}};
   if(!['summary','issue','answer','recover','session','context'].includes(op))return failure(400,'afk_check_action','Geçersiz doğrulama işlemi.');
   return this.durable(()=>{
    if(!this.current(peer,payload))return denied();
    // Bu bağlam sadece kimliği doğrulanmış kanal IPC'sinden gelir. WebSocket
    // oyuncusu account/epoch/exempt/eligible veya özet metriklerini seçemez.
    // A room entry can commit after the channel sent eligible=true. Recheck
    // current durable membership at question creation, not its old IPC flag.
    const context={eligible:payload.eligible===true&&!this.verificationRoomR90(identity.actor),exempt:this.accountAdmin(s)||payload.exempt===true};
    if(op==='summary')return {status:200,body:{ok:true,recorded:Boolean(this.service.recordSummary(identity,payload.summary))}};
    if(op==='issue')return this.service.issue(identity,{...context,reason:payload.reason});
    if(op==='answer')return this.service.answer(identity,{nonce:payload.nonce,choice:payload.choice});
    if(op==='recover')return this.service.recover(identity,context);
    if(op==='context')return this.service.defer(identity,context);
    if(payload.connected===false)return this.service.detach(identity);
    return this.service.attach(identity,context);
   });
  }).catch(()=>unavailable());
 }
 detach(s){if(!s)return Promise.resolve();return this.enqueue(()=>this.durable(()=>this.service.detach(this.identity(s)))).catch(()=>unavailable());}
 publishChanges(){
  const changes=this.pendingChanges.splice(0);if(!changes.length)return;
  const actors=new Set(changes.map(change=>change.actor).filter(Boolean)),settings=changes.some(change=>change.settings)?this.service.settings():null;
  if(settings){for(const actor of this.core.sessions.keys())actors.add(actor);for(const row of this.core.processes.values())if(row.online)this.send(row,{settings});}
  for(const actor of actors){const s=this.core.sessions.get(actor),row=s&&this.core.processes.get(s.identity.channel);if(row?.online&&row.peer.incarnation===s.identity.boot)this.send(row,{actor,state:this.service.state(this.identity(s))});}
 }
 send(row,payload){
  const key=row.peer.incarnation+':'+(payload.actor??'settings');
  this.delivery.set(key,{row,payload});this.flushDelivery(key);
 }
 flushDelivery(key){
  const entry=this.delivery.get(key);if(!entry||entry.busy||this.closed)return;
  const {row,payload}=entry;if(!row.online||this.core.processes.get(row.peer.channel)!==row){this.delivery.delete(key);return;}
  entry.busy=true;
  void row.control.request('afk_check',payload).then(()=>{if(this.delivery.get(key)===entry)this.delivery.delete(key);else this.flushDelivery(key);},()=>{entry.busy=false;});
 }
 async readAdmin(query,auth){
  await this.ready;await this.tail;if(this.closed)return {ok:false,error:'Doğrulama sistemi kapalı.'};
  if(query?.action!=='online'){
   const liveRows=query?.action==='settings'?[]:await this.inspect(query?.action==='detail'?[query.playerId??query.actor]:null);
   await this.tail;return this.service.read(query,auth,{liveRows});
  }
  if(typeof auth?.adminId!=='string'||!auth.adminId)return {ok:false,error:'Yönetici yetkisi gerekli.'};
  const search=String(query.search??'').slice(0,160).normalize('NFKC').toLocaleLowerCase('tr-TR').trim(),players=[],c=this.core;
  // Çevrimiçi araması şüpheli profillerinden bağımsızdır; yalnız mevcut,
  // doğrulanmış oyun bağlantıları kullanılır. Kullanıcı IP'si okunmaz.
  for(const [actor,s]of c.sessions){
   const presence=c.presence.entries.get(actor);
   if(!presence?.connected||c.clock()-presence.lastAt>=40000||!c.securityCurrent(actor,s.identity.epoch))continue;
   const p=c.database.sqlite.prepare('SELECT id,name,area,channel FROM players WHERE id=? AND account_id=?').get(actor,s.identity.account);if(!p)continue;
   if(search&&!p.name.normalize('NFKC').toLocaleLowerCase('tr-TR').includes(search))continue;
   const state=this.service.state(this.identity(s));
   players.push({playerId:actor,playerName:p.name,accountId:s.identity.account,accountName:s.session.account?.username??s.identity.account,channel:p.channel,map:p.area,online:true,exempt:state.exempt,locked:state.locked,pending:state.pending});
  }
  players.sort((a,b)=>a.playerName.localeCompare(b.playerName,'tr'));
  const limit=Math.max(1,Math.min(200,Math.floor(Number(query.limit)||100))),offset=Math.max(0,Math.min(1000000,Math.floor(Number(query.offset)||0)));
  return {ok:true,players:players.slice(offset,offset+limit),total:players.length,hasMore:players.length>offset+limit};
 }
 async inspect(actors){
  const snapshots=[],c=this.core;
  await Promise.allSettled([...c.processes.values()].filter(row=>row.online).map(async row=>{
   const answer=await row.control.request('afk_inspect',actors?{actors}:{});
   for(const value of Array.isArray(answer)?answer:answer?.players??[]){
    const s=c.sessions.get(value.actor);
    if(s&&s.identity.epoch===value.epoch&&s.identity.boot===row.peer.incarnation&&value.online)snapshots.push(value);
   }
  }));return snapshots;
 }

 mutateAdmin(input,{adminId,adminName,reauthorize}={}){
  return this.enqueue(async()=>{
   if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function'||await reauthorize()!==adminId)return failure(403,'afk_admin_session','Yönetici oturumu doğrulanamadı.');
   return this.durable(()=>input?.action==='settings'?this.service.updateSettings({id:adminId,name:adminName??adminId},input.settings):this.service.adminAction({id:adminId,name:adminName??adminId},input));
  }).catch(error=>failure([400,403,404,409,422,429].includes(error?.status)?error.status:503,error?.code??'afk_admin_unavailable',error?.status?error.message:'İşlem tamamlanamadı. Yeniden dene.'));
 }
 async image(request){
  const headers={'cache-control':'no-store, private','x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'};
  if(request.method!=='GET')return new Response(null,{status:405,headers:{...headers,allow:'GET'}});
  const match=/^\/afk\/([A-Za-z0-9_-]{20,128})\/([1-4])$/.exec(new URL(request.url).pathname);if(!match)return new Response(null,{status:404,headers});
  if(request.headers.get('sec-fetch-site')==='cross-site')return new Response(null,{status:403,headers});
  try{
   await this.ready;const auth=await this.core.authenticate(request,{csrf:false}),s=auth?.player&&this.core.sessions.get(auth.player.id);
   if(!s||auth.account?.id!==s.identity.account||auth.tokenHash!==s.identity.session||!this.core.securityCurrent(s.identity.actor,s.identity.epoch))return new Response(null,{status:401,headers});
   const value=this.service.image(this.identity(s),match[1],Number(match[2]));
   return new Response(value.body,{status:value.status,headers:{...value.headers,...headers}});
  }catch{return new Response(null,{status:401,headers});}
 }
 start(){
  if(this.timer||this.closed)return;
  this.timer=setInterval(()=>{
   for(const key of this.delivery.keys())this.flushDelivery(key);
   if(this.housekeeping)return;this.housekeeping=true;
   void this.enqueue(async()=>{
    const now=this.core.clock();
    if(this.service.hasExpired(now))await this.durable(()=>this.service.expire(50));
    if(now>=this.nextPurge){this.nextPurge=now+60000;if(this.service.settings().enabled)await this.durable(()=>this.service.purge(100));}
   }).catch(()=>{}).finally(()=>this.housekeeping=false);
  },1000);this.timer.unref();
 }
 async stop(){this.closing=true;clearInterval(this.timer);await this.tail;}
 close(){this.closed=true;clearInterval(this.timer);this.delivery.clear();}
}

import {CastleServiceR59,CASTLE_CATALOG,castleError} from './castle-service-r59.mjs';
import {castleEnabled,CASTLE_CHANNEL} from './castle-model-r59.mjs';
async function readCastleJson(request){const reader=request.body?.getReader();if(!reader)throw castleError('İstek geçersiz.','castle_json_invalid',422);const chunks=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw castleError('İstek çok büyük.','castle_body_limit',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw castleError('İstek geçersiz.','castle_json_invalid',422);}}finally{reader.releaseLock();}}
export class CastleHttpR59{
 constructor(database,getCore){this.database=database;this.getCore=getCore;this.service=new CastleServiceR59(database.sqlite);}
 core(){const c=this.getCore();if(!castleEnabled())throw castleError('Kale kapalı.','castle_disabled',404);if(c.closed||c.stopping||c.recoveringWorld)throw castleError('Kale bağlantısı hazırlanıyor.','castle_unavailable',503);this.service.services=c.writer.services;this.service.clock=c.clock;return c;}
 async fresh(c,request,session){const next=await c.authenticate(request);if(!next?.player?.id||next.player.id!==session.player?.id||next.account?.id!==session.account?.id||next.tokenHash!==session.tokenHash)throw castleError('Oturumun değişti; yeniden giriş yap.','game_instance_expired',401);return next;}
 async route(request){const path=new URL(request.url).pathname;if(!['/api/castle-r59','/api/realtime/core511-castle'].includes(path))return null;
  try{const c=this.core();if(!['GET','POST'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, POST'}});const session=await c.authenticate(request,{csrf:request.method==='POST'});if(!session?.player?.id)throw castleError('Önce oyuna gir.','authentication_required',401);
   let input={action:'status'};if(request.method==='POST'){if(!request.headers.get('content-type')?.includes('application/json'))throw castleError('JSON isteği gerekli.','castle_json_required',415);input=await readCastleJson(request);}
   if(!input||!['status','enter','leave','claim'].includes(input.action))throw castleError('Geçersiz kale işlemi.');
   const id=session.player.id,reauthorize=()=>this.fresh(c,request,session);
   if(input.action==='status')return Response.json(await c.serial(async()=>{await reauthorize();return this.service.status(id);}),{headers:{'cache-control':'no-store'}});
   if(input.action==='enter'){
    this.service.checkEnter(id);const owner=c.authority.owner(id);if(!owner||!c.authority.admission(id))throw castleError('Oyun bağlantını yeniden aç.','castle_owner_required');
    let ticket;if(owner.channel!==CASTLE_CHANNEL)ticket=await c.serial(()=>c.transferUnlocked(request,CASTLE_CHANNEL,{castleR59:true}));
    else{await c.nativeHttpAction.player(session,reauthorize,()=>this.atomic(()=>this.service.enter(id)));ticket=await c.serial(async()=>{await reauthorize();return c.ticketFor(c.sessions.get(id));});}
    return Response.json(ticket.body??ticket,{status:ticket.status??200,headers:{'cache-control':'no-store'}});
   }
   const result=await c.nativeHttpAction.player(session,reauthorize,()=>this.atomic(()=>input.action==='leave'?this.service.leave(id):this.service.claim(id,input.day)));return Response.json(result,{headers:{'cache-control':'no-store'}});
  }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error.status)?error.status:503;return Response.json({error:status===503?'Kale işlemi doğrulanamadı. Aynı işlemi yeniden sorgula.':error.message,code:error.gameCode??'castle_unavailable'},{status,headers:{'cache-control':'no-store'}});}
 }
 atomic(fn){const sql=this.database.sqlite;if(sql.isTransaction)throw castleError('Yazıcı meşgul.','castle_writer_busy',503);sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('COMMIT');return result;}catch(e){if(sql.isTransaction)sql.exec('ROLLBACK');throw e;}}
 async admin(input,{adminId,reauthorize}){const c=this.core();if(typeof adminId!=='string'||!adminId||typeof reauthorize!=='function')throw castleError('Yönetici kimliği doğrulanamadı.','castle_admin_required',403);if(!['castle_read_r59','castle_save_r59','castle_test_start_r59','castle_test_stop_r59'].includes(input?.action))throw castleError('Geçersiz yönetici işlemi.','castle_admin_invalid',422);
  return c.serial(async()=>{if(await reauthorize()!==adminId)throw castleError('Yönetici oturumu değişti.','castle_admin_required',403);if(input.action==='castle_read_r59')return {ok:true,...this.service.boot(),catalog:CASTLE_CATALOG};const result=await this.database.atomic(()=>input.action==='castle_save_r59'?this.service.saveConfig(input.config,input.revision,adminId):this.service.testBattle(input,input.revision,adminId));
   const channels=[...c.processes.values()].filter(p=>p.online),results=await Promise.allSettled(channels.map(p=>p.control.request('castle_config_r59',result.config)));for(let i=0;i<results.length;i++)if(results[i].status==='rejected')c.onFault({channel:channels[i].peer.channel,incarnation:channels[i].peer.incarnation,error:results[i].reason});if(results.some(r=>r.status==='rejected'))return {...result,notice:'Ayar kaydedildi. Ayarı alamayan kanal güvenli biçimde yeniden başlatılıyor.'};return result;
  });
 }
}

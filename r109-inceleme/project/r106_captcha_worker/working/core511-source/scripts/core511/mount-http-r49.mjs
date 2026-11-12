import {MountService,mountRule} from './mounts-service.mjs';
import {MOUNT_ACTIONS,mountDefinition} from './mounts-model.mjs';
import {prepareServerStatement} from './server-statements.mjs';
const reject=(message,code='mount_request_invalid',status=409)=>{throw mountRule(message,code,status);};
const requestId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(value);

// The native helper supplies the authenticated session and fresh auth closure.
// Request bodies never select the actor, account, owner epoch or channel.
export class MountHttpR49 {
 constructor(database,getCore,{service=new MountService(database.sqlite)}={}){Object.assign(this,{database,getCore,service});}
 core({allowDisabled=false}={}){const core=this.getCore?.();if(!core||core.database!==this.database||core.closed||core.stopping||!core.nativeHttpAction||typeof core.serial!=='function')reject('Binek hizmeti henüz hazır değil.','mount_unavailable',503);if(!allowDisabled)this.service.requireEnabled();return core;}
 async fresh(core,session,reauthorize){
  const current=await reauthorize();
  if(!current?.account?.id||!current.player?.id||current.account.id!==session.account.id||current.player.id!==session.player.id||current.tokenHash!==session.tokenHash)reject('Oyun oturumunu yeniden aç.','game_instance_expired');
  if(core.closed||core.stopping||core.recoveringWorld)reject('Sunucu şu anda meşgul.','mount_unavailable',503);
  const id=current.player.id;
  if(prepareServerStatement(this.database.sqlite,'SELECT account_id FROM players WHERE id=?').get(id)?.account_id!==current.account.id)reject('Karakter oturumu değişti.','game_instance_expired');
  if(core.transitions?.has(id)||core.permanent.entries?.has(id))reject('Karakter başka bir işlemi tamamlıyor. Biraz sonra tekrar dene.','mount_player_busy');
  return current;
 }
 async execute(session,input,reauthorize){
  if(!session?.account?.id||!session.player?.id||!session.tokenHash||typeof reauthorize!=='function')reject('Oyun oturumu gerekli.','authentication_required',401);
  if(!input||typeof input!=='object'||Array.isArray(input)||!['status','toggle',...MOUNT_ACTIONS].includes(input.action))reject('Geçersiz binek işlemi.','mount_request_invalid',422);
  // Copy only fixed fields before an asynchronous auth/owner wait.
  const body=Object.freeze({action:input.action,kind:input.kind,step:input.step,challengeId:input.challengeId,requestId:input.requestId,requestAt:input.requestAt,mounted:input.mounted}),core=this.core({allowDisabled:body.action==='status'});
  if(body.action==='status')return core.serial(async()=>{const current=await this.fresh(core,session,reauthorize);return {ok:true,mounts:this.service.read(current.player.id)};});
  if(body.action==='toggle'){
   if(typeof body.mounted!=='boolean'||!requestId(body.requestId)||(body.kind!==undefined&&!mountDefinition(body.kind)))reject('Geçersiz bin / in isteği.','mount_request_invalid',422);
   return core.serial(async()=>{
    const current=await this.fresh(core,session,reauthorize),id=current.player.id,owner=core.authority.owner(id),admission=core.authority.admission(id),resident=core.sessions.get(id);
    if(owner?.state!=='active'||admission?.session_id!==current.tokenHash||admission.epoch!==owner.epoch||admission.channel!==owner.channel||resident?.session?.tokenHash!==current.tokenHash||resident.session.account.id!==current.account.id||resident.identity?.actor!==id||resident.identity.account!==current.account.id||resident.identity.session!==current.tokenHash||resident.identity.realm!==core.realmId||resident.identity.epoch!==owner.epoch||resident.identity.boot!==owner.incarnation||resident.identity.channel!==owner.channel)reject('Oyun bağlantın değişti; yeniden bağlan.','mount_owner_fenced');
    const process=core.processes.get(owner.channel);
    if(!process?.online||process.peer?.incarnation!==owner.incarnation||process.peer.realm!==core.realmId||process.peer.channel!==owner.channel||typeof process.control?.request!=='function')reject('Kanal bağlantısı hazırlanıyor; biraz sonra tekrar dene.','mount_channel_unavailable',503);
    try{return await process.control.request('mount_state',{actor:id,epoch:owner.epoch,mounted:body.mounted,...(body.kind?{kind:body.kind}:{}),requestId:body.requestId});}
    catch{reject('Binek durumunun yanıtı alınamadı; güncel durum için tekrar dene.','command_outcome_unknown',503);}
   });
  }
  if(!requestId(body.requestId))reject('Geçerli bir işlem kimliği gerekiyor.','mount_request_invalid',422);
  // Existing single-player writer gate supplies freeze, durable ACK and fresh
  // owner hydration. The service remains synchronous inside this transaction.
  const result=await core.nativeHttpAction.player(session,()=>this.fresh(core,session,reauthorize),()=>{
   const sql=this.database.sqlite;if(sql.isTransaction)reject('Yazıcı şu anda meşgul.','mount_writer_busy',503);
   sql.exec('BEGIN IMMEDIATE');try{const result=this.service.command(session.player.id,body);sql.exec('COMMIT');return result;}catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
  });
  // The timing bar uses response-time clock synchronization. Disk/refresh time
  // must not make the client believe the older transaction clock is current.
  return result?.mounts?{...result,mounts:{...result.mounts,serverTime:this.service.now()}}:result;
 }
}

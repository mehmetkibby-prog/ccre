import {AccessToken,RoomServiceClient,TokenVerifier} from 'livekit-server-sdk';
import {TrackSource} from '@livekit/protocol';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
export function readVoiceConfig(){try{const v=JSON.parse(readFileSync(process.env.CORE_VOICE_CONFIG_FILE||'/etc/coreoflife-voice.json','utf8'));return typeof v.key==='string'&&v.secret?.length>=32?{...v,...(process.env.CORE_VOICE_PUBLIC_URL?{publicUrl:process.env.CORE_VOICE_PUBLIC_URL}:{})}:null;}catch{return null;}}
export function createGuildVoice(db,{config=readVoiceConfig(),now=Date.now,client}={}){
 const sessions=new Map();let busy=false;
 const roomPrefix=process.env.CORE_REALM_ID?`col-realm-${process.env.CORE_REALM_ID}-guild-`:'col-guild-';
 const service=client??(config?new RoomServiceClient('http://127.0.0.1:7880',config.key,config.secret,{requestTimeout:5}):null);
 function access(auth){const p=db.prepare(`SELECT p.id,p.name,p.area,p.channel,m.guild_id FROM players p JOIN guild_members m ON m.player_id=p.id JOIN guild_castles c ON c.guild_id=m.guild_id WHERE p.id=? AND p.area='guild_hall_'||m.guild_id`).get(auth.player?.id??'');if(!p)return null;
 const s=db.prepare('SELECT s.expires_at,s.security_version,a.security_version AS current_version,a.permanently_banned,a.suspended_until_ms,g.instance_id,g.token_hash AS presence_token,g.expires_at_ms AS presence_expiry FROM auth_sessions s JOIN accounts a ON a.id=s.account_id JOIN game_presence g ON g.account_id=a.id WHERE s.token_hash=? AND a.id=?').get(auth.tokenHash,auth.account?.id);
 return s&&s.instance_id===auth.gamePresence?.instanceId&&s.presence_token===auth.tokenHash&&s.presence_expiry>now()&&s.expires_at>now()/1000&&s.security_version===s.current_version&&!s.permanently_banned&&s.suspended_until_ms<=now()?{...p,room:`${roomPrefix}${p.guild_id}-ch${p.channel}`}:null;
 }
 async function sweep(){if(!service||busy)return;busy=true;try{
  // Rooms are enumerated too: a process restart or replayed short-lived join token
  // cannot leave an untracked listener behind.
  const rooms=await service.listRooms();for(const room of rooms){if(!room.name.startsWith(roomPrefix))continue;const people=await service.listParticipants(room.name);for(const p of people){const s=sessions.get(p.identity),a=s&&s.until>now()?access(s.auth):null;if(!a||a.room!==room.name){await service.removeParticipant(room.name,p.identity);sessions.delete(p.identity);}}}
  for(const [id,s] of sessions)if(s.until<=now())sessions.delete(id);
 }finally{busy=false;}}
 return {available:!!config,access,sweep,
 async authorize(token){if(!config||typeof token!=='string'||token.length>8192)return false;try{const claims=await new TokenVerifier(config.key,config.secret).verify(token),s=sessions.get(claims.sub),a=s&&s.until>now()?access(s.auth):null;return !!a&&a.room===s.room&&claims.video?.room===a.room&&claims.video?.roomJoin===true;}catch{return false;}},
 async join(auth){if(!service||!config)throw Error('Sesli salon hizmeti henüz kurulmamış.');const p=access(auth);if(!p)throw Error('Sesli sohbet için kendi loncanın salonunda olmalısın.');
  await service.createRoom({name:p.room,emptyTimeout:60,departureTimeout:20,maxParticipants:40});
  const identity=`${p.id}:${randomUUID()}`;const token=new AccessToken(config.key,config.secret,{identity,name:p.name,ttl:30});token.addGrant({room:p.room,roomJoin:true,canPublish:true,canPublishSources:[TrackSource.MICROPHONE],canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false});
  sessions.set(identity,{auth,room:p.room,until:now()+30000});return {identity,token:await token.toJwt(),url:config.publicUrl??'wss://realtime.coreoflife.net/voice',room:p.room};
 },
 async renew(auth,identity){const s=sessions.get(identity),a=access(auth);if(!s||s.auth.tokenHash!==auth.tokenHash||s.auth.gamePresence?.instanceId!==auth.gamePresence?.instanceId||!a||a.room!==s.room){if(s&&s.auth.tokenHash===auth.tokenHash){sessions.delete(identity);await service?.removeParticipant(s.room,identity).catch(()=>{});}throw Error('Sesli salon bağlantısı sona erdi.');}s.until=now()+30000;return {ok:true};},
 async leave(auth,identity){const s=sessions.get(identity);if(s&&s.auth.tokenHash===auth.tokenHash){sessions.delete(identity);await service?.removeParticipant(s.room,identity).catch(()=>{});}return {ok:true};}
 };
}

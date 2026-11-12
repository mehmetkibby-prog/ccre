import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import http from 'node:http';

const paths=new Set(['/api/action','/api/world','/api/realtime/ticket','/api/dungeon']);
// Runs in the ingress supervisor, NOT the durable writer. The browser cannot
// pick a process with a header/query parameter. This lookup is a routing hint;
// the destination always repeats canonical session/presence/CSRF validation.
export class ChannelIngress {
 constructor(file){
  this.sqlite=new DatabaseSync(file,{readOnly:true});
  this.sqlite.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=1000');
  this.route=this.sqlite.prepare(`SELECT p.channel,o.state FROM auth_sessions s
   JOIN players p ON p.account_id=s.account_id
   LEFT JOIN channel_owners o ON o.player_id=p.id
   WHERE s.token_hash=? AND s.expires_at>? LIMIT 1`);
  this.directory=new Map();this.generation=null;
  this.agent=new http.Agent({keepAlive:true,maxSockets:128,maxFreeSockets:32});
 }
 update({startupId,channels},expectedStartupId){
  if(startupId!==expectedStartupId||!Array.isArray(channels)||channels.length!==3)throw Error('invalid_channel_directory');
  const next=new Map();
  for(const row of channels){
   if(![1,2,3].includes(row.channel)||next.has(row.channel)||typeof row.ready!=='boolean'||row.ready&&(!Number.isInteger(row.port)||row.port<1||row.port>65535))throw Error('invalid_channel_directory');
   if(row.dungeonPort!=null&&(!Number.isInteger(row.dungeonPort)||row.dungeonPort<1||row.dungeonPort>65535))throw Error('invalid_channel_directory');
   next.set(row.channel,{ready:row.ready,port:row.port,dungeonPort:row.dungeonPort});
  }
  this.directory=next;this.generation=startupId;
 }
 target(pathname,headers){
  if(!paths.has(pathname))return null;
  const secure=headers['x-forwarded-proto']==='https';
  const name=secure?'__Host-yasam-session':'yasam-session-local';
  const matches=String(headers.cookie??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
  if(matches.length>1)throw Object.assign(Error('ambiguous_session_cookie'),{status:400});
  if(!matches.length)return null;
  const token=matches[0].slice(name.length+1);
  if(!/^[A-Za-z0-9_-]{32,128}$/.test(token))return null;
  const row=this.route.get(createHash('sha256').update(token).digest('base64url'),Math.floor(Date.now()/1000));
  // Character creation and unauthenticated errors stay on the normal API.
  if(!row)return null;
  if(![1,2,3].includes(row.channel)||row.state&&row.state!=='active')throw Object.assign(Error('channel_transition'),{status:409});
  const endpoint=this.directory.get(row.channel);
  if(!endpoint?.ready)throw Object.assign(Error('channel_unavailable'),{status:503});
  return {port:endpoint.port,agent:this.agent,channel:row.channel};
 }
 close(){if(this.closed)return;this.closed=true;this.agent.destroy();this.sqlite.close();}
}

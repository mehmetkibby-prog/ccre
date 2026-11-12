import {randomUUID} from 'node:crypto';
import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL,castleSchedule,castleTestScheduleR59,castleMayDamage,stepCastle,publicCastle} from './castle-model-r59.mjs';
import {demand} from './contract.mjs';
import {CastleNoticesR60} from './castle-notices-r60.mjs';
export class CastleChannelR59{
 constructor(runtime,initial){this.notices=new CastleNoticesR60();this.runtime=runtime;this.channel=runtime.channel;this.config=initial?.config??{enabled:false,revision:0};this.state=initial?.state??null;this.committed=this.state;this.members=new Map();this.sent=new Map();this.pending=null;this.nextTick=0;this.nextSave=0;this.revision=0;this.resume=true;this.dirty=false;
  Object.assign(runtime.services.globals.__colCastle??={}, {guild:id=>this.members.get(id)?.id??null,mayDamage:(a,b,now)=>{const test=castleTestScheduleR59(this.config,now);return castleEnabled()&&(Boolean(test)||this.config.enabled&&this.committed?.status==='active'&&this.committed.day===castleSchedule(now).day)&&castleMayDamage(a,b,now,id=>this.members.get(id)?.id,test??castleSchedule(now));}});
 }
 hydrate(bundle){const id=bundle.player.id,prior=this.members.get(id),row=bundle.castleGuild??null;if(JSON.stringify(prior??null)!==JSON.stringify(row)){row?this.members.set(id,row):this.members.delete(id);this.revision++;}this.sent.delete(id);}
 forget(id){if(this.members.delete(id))this.revision++;this.sent.delete(id);}
 configure(config){demand(config&&Number.isSafeInteger(config.revision)&&config.revision>=this.config.revision&&typeof config.enabled==='boolean','castle_config_revision');if(config.test?.id!==this.config.test?.id){this.testState=null;this.testRevision=0;}this.config=config;this.sent.clear();this.cache=null;return {revision:config.revision};}
 tick(now){if(!castleEnabled()||this.runtime.peer.channel!==CASTLE_CHANNEL||now<this.nextTick||this.channel.backgroundPaused)return;this.nextTick=now+100;
  const players=[];for(const p of this.channel.view.players.values()){if(p.area!==CASTLE_AREA)continue;const guild=this.members.get(p.id),resident=this.channel.kernel.players.get(p.id),identity=this.runtime.connections?.identity(p.id);players.push({...p,guild:guild?.id,guildName:guild?.name,active:!!identity&&resident?.accepting&&!resident.suspended&&!resident.quiescer});}
  const test=castleTestScheduleR59(this.config,now);if(test){const next=stepCastle(this.testState,players,now,{schedule:test});this.testState=next.state;if(next.changed)this.testRevision=(this.testRevision??0)+1;}else if(this.testState){this.testState=null;this.testRevision=0;this.sent.clear();this.cache=null;}
  const next=stepCastle(this.state,players,now,{resume:this.resume,enabled:this.config.enabled});this.resume=false;this.state=next.state;this.dirty||=next.changed;if(!this.state||this.pending||!this.dirty&&now<this.nextSave||this.state.status==='finished'&&!this.dirty)return;
  const state=structuredClone(this.state),expected=this.committed?.day===state.day?this.committed.revision:0;state.revision=expected;this.dirty=false;this.nextSave=now+5000;
  const key='castle:'+randomUUID(),task=this.channel.systemWriter.submit({key,kind:'castle_step',payload:{state,expected}}).then(ack=>{demand(ack.key===key&&ack.result?.state,'castle_ack_mismatch');const result=ack.result;this.committed=result.state;if(this.state.day===result.state.day){this.state.revision=result.state.revision;this.state.rosterReady=true;}if(result.config.revision>=this.config.revision)this.configure(result.config);this.sent.clear();},error=>{this.runtime.fail(error);throw error;});this.pending=task;task.catch(()=>{}).finally(()=>{if(this.pending===task)this.pending=null;});
 }
 project(id,now){if(!castleEnabled())return null;const p=this.channel.view.player(id);if(p?.area!==CASTLE_AREA){if(this.sent.has(id)){this.sent.delete(id);return {area:null};}return null;}
  const test=castleTestScheduleR59(this.config,now),state=test?this.testState:this.committed,progress=test?this.testState:this.state;
  const key=[test?.day??'daily',this.testRevision??0,this.committed?.revision??0,this.revision,Math.floor(now/1000),this.config.revision,JSON.stringify(progress?.captures??{})].join(':');if(this.sent.get(id)===key)return null;this.sent.set(id,key);
  if(this.cache?.key!==key){const data=publicCastle(state,now,test??castleSchedule(now)),guilds={};for(const [actor,guild]of this.members)if(this.channel.view.player(actor)?.area===CASTLE_AREA)guilds[actor]=guild.id;
   this.cache={key,value:{...data,captures:progress?.day===state?.day?(progress?.captures??{}):{},enabled:Boolean(test)||this.config.enabled,guilds}};
  }return {...this.cache.value,guild:this.members.get(id)??null};
 }
 async drain(){if(this.pending)await this.pending;}
}
export function createCastleStepR59(services){return (sql,payload,context)=>{demand(castleEnabled()&&context.peer.channel===CASTLE_CHANNEL&&sql.isTransaction,'castle_writer_scope');return services.castle.persist(payload?.state,payload?.expected);};}

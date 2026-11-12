import {fixture} from './reward/fixture.mjs';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=process.env.COL_NATIVE_TEST_ROOT,manifest=JSON.parse(await readFile(join(root,'realm-package-manifest.json')));
export async function shippedSource(name){const body=await readFile(join(root,name)),row=manifest.files.find(r=>r.path===name);assert.equal(createHash('sha256').update(body).digest('hex'),row.sha256);assert.equal(body.length,row.bytes);return body.toString();}
export async function commerce(mode){
 const previous=process.env.CORE_CHANNEL_WRITER_PIPELINE;process.env.CORE_CHANNEL_WRITER_PIPELINE=mode;let h;try{h=await fixture();}finally{if(previous===undefined)delete process.env.CORE_CHANNEL_WRITER_PIPELINE;else process.env.CORE_CHANNEL_WRITER_PIPELINE=previous;}
 const db=h.database.sqlite,ch=h.channels.get(1),now=Math.floor(Date.now()/1000),ids=['real-1','real-2','real-3'];
 for(const id of ids){
  if(id!=='real-1'){
   const aid='account-'+id;db.prepare('INSERT INTO accounts(id,username,username_normalized,email,email_normalized,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(aid,id,id,id+'@fixture.invalid',id+'@fixture.invalid','fixture-not-login','fixture',now,now);
   db.prepare("INSERT INTO players(id,account_id,name,role,last_seen,created_at,channel,area,x,y,hp,max_hp,gems,loadlab_run_id) VALUES(?,?,?,'avci',?,?,1,'bazaar',100,100,100,100,100,'')").run(id,aid,id,now,now);
   db.prepare('INSERT INTO auth_sessions(token_hash,csrf_hash,account_id,created_at,last_seen_at,expires_at,security_version) VALUES(?,?,?,?,?,?,1)').run('token-'+id,'csrf-'+id,aid,now,now,now+3600);
  }
  db.prepare("UPDATE players SET area='bazaar',level=65,xp=6400,x=100,y=100,gems=100,pearls=10,potions=5,stone_dust=5,last_seen=? WHERE id=?").run(now,id);
  db.prepare('INSERT INTO game_presence(account_id,token_hash,instance_id,expires_at_ms) VALUES(?,?,?,?)').run('account-'+id,'token-'+id,'fixture-'+id,now*1000+3600000);
  await ch.ensureOwner(id);ch.combat.syncEntity('players',id);
 }
 const item=(id,owner='real-1',overrides={})=>{const r={id,player_id:owner,kind:'weapon',item_name:'Commerce fixture',rarity:'blue',power:1,role:'avci',enchantments:'[]',equipped:0,created_at:now,premium_origin:1,...overrides};db.prepare('INSERT INTO player_items('+Object.keys(r).join(',')+') VALUES('+Object.keys(r).map(()=>'?').join(',')+')').run(...Object.values(r));};
 const economic=()=>({players:db.prepare("SELECT id,gems,pearls,potions,stone_dust FROM players WHERE id LIKE 'real-%' ORDER BY id").all().map(r=>({...r})),items:db.prepare('SELECT id,player_id,kind,rarity,premium_origin FROM player_items ORDER BY id').all().map(r=>({...r})),stones:db.prepare('SELECT player_id,kind,amount FROM player_stones ORDER BY player_id,kind').all().map(r=>({...r}))});
 return{h,db,ch,ids,now,item,economic};
}
export async function tradeCommerce(mode){
 const f=await commerce(mode),{h,ch,db}=f;
 const [{PlayerTrade},{ChannelSupervisor},{installChannelPermanentControl}]=await Promise.all(['player-trade.mjs','channel-supervisor.mjs','channel-permanent-control.mjs'].map(n=>h.importModule('vds-server/src/'+n)));
 // Production PlayerTrade uses its own SQLite connection (dungeonDatabase),
 // whose default synchronous=FULL commits finish before act returns.
 const tradeDb=new DatabaseSync(h.file);tradeDb.exec('PRAGMA busy_timeout=1000; PRAGMA foreign_keys=ON;');assert.equal(tradeDb.prepare('PRAGMA synchronous').get().synchronous,2);
 const service=new PlayerTrade(tradeDb),rpc={handlers:h.controls.get(1).handlers};installChannelPermanentControl(rpc,ch);h.supervisor.database=h.database;h.supervisor.notificationFailed=(_state,error)=>h.fatals.push(error);
 const permanent=(ids,fn)=>ChannelSupervisor.prototype.permanentPlayers.call(h.supervisor,ids,fn);
 const act=async(who,action,extra={})=>{const t=service.snapshot(who).trade,input={requestId:randomUUID(),id:t?.id,revision:t?.revision,action,...extra},peer=action==='invite'?input.target:t?.a===who?t.b:t?.a;return permanent([who,...peer?[peer]:[]],()=>service.act(who,input));};
 const open=async()=>{await act('real-1','invite',{target:'real-2'});await act('real-2','accept');};
 const offer=async(who,overrides={})=>act(who,'offer',{offer:{gems:10,items:['trade-item-'+who],materials:[{key:'pearls',amount:2},{key:'stone:crystal_chest',amount:1}],...overrides}});
 const ready=async()=>{await act('real-1','ready');await act('real-2','ready');await act('real-1','confirm');};
 for(const id of ['real-1','real-2']){f.item('trade-item-'+id,id);db.prepare("INSERT INTO player_stones(player_id,kind,amount) VALUES(?,'crystal_chest',4)").run(id);}
 const close=async()=>{tradeDb.close();await h.close();};
 return{...f,tradeDb,service,permanent,act,open,offer,ready,close};
}

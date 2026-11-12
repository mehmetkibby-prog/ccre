import {isAdventureArea,adventureArea} from './adventure-maps.mjs';

// Only authoritative player areas and resident/SQL dungeon memberships enter
// this policy. A client-supplied map, command or claimed membership never does.
export function verificationRoomR90(player,dungeon=false){
 return Boolean(player&&(dungeon||isAdventureArea(player.area)));
}

// Cold HTTP/verification path only. Channel ticks use the resident Map below,
// not this query. Membership lookup is indexed by the existing player PK.
export function verificationRoomReaderR90(sql,{account=false}={}){
 const read=sql.prepare(`SELECT p.area,EXISTS(SELECT 1 FROM dungeon_members m WHERE m.player_id=p.id) AS dungeon
  FROM players p WHERE ${account?'p.account_id':'p.id'}=?`);
 return id=>{const p=read.get(id);return verificationRoomR90(p,p?.dungeon===1);};
}

export function deferRoomBotCheckR90(sql,bot,{now=Date.now}={}){
 const deferred=verificationRoomReaderR90(sql,{account:true});
 const wrapped={...bot,
  deadline(id,forRealtime=false){
   // Keep the native preparation and AFK-island exemption. Never write or
   // extend bot_due for a tower/dungeon: its original deadline survives exit.
   const due=bot.deadline(id,forRealtime);
   return deferred(id)?forRealtime?0:Math.max(due,now()+60000):due;
  },
  required(id){return bot.required(id)&&!deferred(id);}
 };
 if(typeof bot.requiredPrepared==='function')wrapped.requiredPrepared=id=>{
  const result=bot.requiredPrepared(id);
  // Recheck after an async native preparation; entry/exit may have committed.
  return result?.then?result.then(required=>required&&!deferred(id)):result&&!deferred(id);
 };
 return wrapped;
}

// Cold, indexed writer-side check used only when a pending AFK question could
// expire/rebind. The persisted entry must precede its deadline: entering after
// already failing a check cannot erase that failure. No client context is used.
export function verificationQuestionRoomReaderR98(sql){
 const player=sql.prepare('SELECT id,account_id,area,channel FROM players WHERE id=?');
 const adventure=sql.prepare(`SELECT m.joined_ms,r.id,r.channel,r.status FROM adventure_members m
  JOIN adventure_runs r ON r.id=m.run_id WHERE m.player_id=? AND m.departed=0`);
 const dungeon=sql.prepare(`SELECT json_extract(r.state,'$.created') AS entered,r.status
  FROM dungeon_members m JOIN dungeon_runs r ON r.id=m.run_id WHERE m.player_id=?`);
 return question=>{
  const p=player.get(question.player_id);if(!p||p.account_id!==question.account_id)return false;
  const a=adventureArea(p.area);
  if(a?.kind==='tower'||a?.kind==='mist'){
   const r=adventure.get(p.id);
   return Boolean(r&&r.id.replaceAll('-','')===a.run&&r.channel===p.channel&&r.status==='active'&&Number.isSafeInteger(r.joined_ms)&&r.joined_ms<=question.deadline_ms);
  }
  const r=dungeon.get(p.id);
  return Boolean(r&&['ready','active','portal','wipe','complete'].includes(r.status)&&Number.isSafeInteger(r.entered)&&r.entered<=question.deadline_ms);
 };
}

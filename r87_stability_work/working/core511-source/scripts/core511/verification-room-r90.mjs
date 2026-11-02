import {isAdventureArea} from './adventure-maps.mjs';

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

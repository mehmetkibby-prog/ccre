import {appendFileSync} from 'node:fs';
const path=process.env.R85_FIRSTKILL_PROBE_FILE;
let count=0;
function changed(before,after){return Object.fromEntries(Object.keys(after).filter(key=>!Object.is(before?.[key],after[key])).map(key=>[key,{before:before?.[key],after:after[key]}]));}
export function observeR85(memory,guard,plans){
 if(!path||count++>=100)return;
 const t=memory.t,id=guard.playerId,row=memory.view.player(id),raw=memory.view.engagements.get(id)??null;
 const changes={players:[...t.players.values()].map(p=>({id:p.id,fields:changed(memory.view.player(p.id),p)})),engagements:t.engagements.snapshot(),monsters:[...t.monsters.values()].map(m=>({id:m.id,fields:changed(memory.view.monster(m.id),m)}))};
 const targets=plans.map(p=>({id:p.target.id,spawnRound:p.target.spawn_round,hp:memory.monster(p.target.id)?.hp,rolled:p.rolled,area:p.target.area,channel:p.target.channel,isBoss:p.target.is_boss,isStone:p.target.is_stone}));
 const basic=(t.contextR54?.payload?.ability??0)===0;
 appendFileSync(path,JSON.stringify({event:'r85_observational_attack_boundary',pid:process.pid,at:guard.nowMs,actor:id,input:t.contextR54?.payload,player:{hp:row?.hp,maxHp:row?.max_hp,role:row?.role,area:row?.area,channel:row?.channel,revision:row?.hp_revision},rawEngagement:raw,changes,targets,boundary:t.boundary,hasNative202:t.boundary?.replyR54?.status===202,narrowPureGuard:basic&&!raw&&!changes.players.length&&!changes.engagements.length&&!changes.monsters.length&&plans.length===1})+'\n');
}

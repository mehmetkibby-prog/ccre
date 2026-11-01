import {fixture} from './fixture.mjs';
const q=s=>'"'+s.replaceAll('"','""')+'"';
export async function setup({bot=false,count=3,reorderPlayerColumns=false}={}){
 const h=await fixture({reorderPlayerColumns});h.registry.playerTeam=()=>1;h.registry.monsterSource=()=> 'golge-1';const db=h.database.sqlite,now=Math.floor(Date.now()/1000),actor=bot?'bot-1':'real-1';
 db.prepare('INSERT OR IGNORE INTO game_settings(id) VALUES(1)').run();db.prepare('INSERT OR IGNORE INTO combat_settings(id) VALUES(1)').run();
 db.prepare('UPDATE game_settings SET expansion65_enabled=1,xp_curve_json=? WHERE id=1').run(JSON.stringify(Array(65).fill(100)));
 db.prepare("UPDATE players SET level=1,xp=0,rank_xp=0,rank_tier=0 WHERE id=?").run(actor);
 const targets=Array.from({length:count},(_,i)=>({id:'golge-r7-'+i,name:'Gölge Kurdu',area:'forest',channel:1,x:100+i*10,y:100,hp:50,max_hp:50,spawn_round:1,variant:'normal',is_boss:0,is_stone:0,summoned:0}));
 for(const target of targets){const row={...target,loadlab_run_id:bot?h.runId:''};db.prepare('INSERT INTO monsters('+Object.keys(row).map(q).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));if(bot)db.prepare("INSERT INTO loadlab_entities_v1(kind,id,run_id,account_id,descriptor_json) VALUES('monster',?,?,'',?)").run(target.id,h.runId,JSON.stringify(target));}
 if(bot){h.registry.monsterRun=id=>targets.some(t=>t.id===id)?h.runId:'';h.setRunStatus('active');}
 await h.channels.get(1).ensureOwner(actor);return {h,db,now,actor,targets};
}

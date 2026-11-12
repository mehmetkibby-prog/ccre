import assert from 'node:assert/strict';
import {extraPlayer} from './process-fixture.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {until} from './helpers.mjs';

export async function party(t,{together=false}={}){
 const s=await nativeHttpHost(t),{f,core,world,connect}=s;await world.stopJobs();const actors=[64,65,66].map(n=>extraPlayer(s,n,'dungeon-member-'+n)),sharedFailures=[],fail=world.combat.fail.bind(world.combat);world.combat.fail=error=>{sharedFailures.push(error);return fail(error);};
 s.core.start();await s.host.database.atomic(()=>{for(const actor of actors){const a=f.sql.prepare('SELECT account_id FROM players WHERE id=?').get(actor.id);globalThis.__colLaunch.grant(a.account_id,true);}});
 for(const actor of actors){actor.ticket=await actor.http('character',{channel:1});assert.equal(actor.ticket.status,200);if(together&&actor.ticket.channel!==actors[0].ticket.channel){actor.ticket=await actor.http('transfer',{channel:actors[0].ticket.channel});assert.equal(actor.ticket.status,200);}actor.live=await connect(actor.ticket);actor.sequence=0;}
 await core.permanentPlayers(actors.map(p=>p.id),()=>{f.sql.prepare('INSERT INTO parties(id,leader_id,created_at) VALUES(?,?,1)').run('dungeon-native-party511',actors[0].id);for(const [i,actor]of actors.entries()){f.sql.prepare("UPDATE players SET area='bazaar',level=50,x=1910,y=660,hp=100,max_hp=100,arena_match_id='',combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),actor.id);f.sql.prepare('INSERT INTO party_members(player_id,party_id,joined_at) VALUES(?,?,?)').run(actor.id,'dungeon-native-party511',i+1);}});
 const action=async(actor,command)=>{const sequence=++actor.sequence,prior=sharedFailures.length,faults=s.faults.length;actor.live.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'dungeon',command}}));await until(()=>actor.live.packets.some(p=>p.results?.some(r=>r.sequence===sequence))||s.faults.length>faults||sharedFailures.length>prior,8000);assert.equal(s.faults.length,faults,s.faults.slice(faults).map(f=>f.error?.stack).join('\n'));assert.equal(sharedFailures.length,prior,sharedFailures.slice(prior).map(e=>e.stack).join('\n'));return actor.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);};
 return {...s,actors,action,sharedFailures,old:[world.row,...s.supervisor.rows.values()]};
}

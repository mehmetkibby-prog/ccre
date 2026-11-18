import {setup} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
for(const channel of [4])test('GM can finish the damaged Rune boss through the resident socket on channel '+channel,{timeout:35000},async t=>{
 const {f,core,supervisor,http,connect,faults}=await setup(t,{rune:true,runeHp:324,runeMaxHp:350000,runeChannel:channel,content:true,shared:true,sharedCombat:{hp:0},prepare:f=>f.sql.exec('UPDATE game_settings SET guardian_base_attack=15000,hunter_base_attack=15000,arcanist_base_attack=15000')});const ticket=await http('character',{channel});assert.equal(ticket.status,200,JSON.stringify(ticket));
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='rune_v2',x=2240,y=700,level=500,is_gm=1,hp=1000000,max_hp=1000000,attack_one_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id));
 const live=await connect(ticket),rows=[...supervisor.rows.values()];
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'rune-v2-boss-c'+channel+'-1',spawnRound:17,ability:0,intentId:'ranked-lethal'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));const reply=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply.status,200,JSON.stringify(reply));assert.equal(reply.body.hits[0].hp,0);
 assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('rune-v2-boss-c'+channel+'-1').hp,0);
 assert.deepEqual([...supervisor.rows.values()],rows);
});

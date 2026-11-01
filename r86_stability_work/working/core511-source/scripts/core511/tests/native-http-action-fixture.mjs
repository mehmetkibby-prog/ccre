import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {combatState} from './process-fixture.mjs';

export async function httpActionFixture(t){
 const s=await nativeHttpHost(t);await s.world.stopJobs();
 await s.host.database.atomic(()=>{globalThis.__colLaunch.grant(s.f.account.id,true);s.f.sql.prepare('UPDATE players SET essence=1000,gems=1000,potions=2,hp=100 WHERE id=?').run(s.f.id);});
 // R15 requires an explicit channel choice even for an existing character.
 // Model the real entry screen; a bare reconnect ticket cannot select it.
 const module=await stageNativeHttp(t).load(),ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket);
 const request=(body,headers={})=>s.f.request({path:'/api/action',body,headers}),call=(body,headers)=>module.default(request(body,headers));
 const view=async(id=s.f.id,channel=s.writer.authority.owner(id).channel)=>(await combatState(s.supervisor.rows.get(channel))).players.find(p=>p.id===id);
 const resources=async id=>{const row=s.supervisor.rows.get(s.writer.authority.owner(id).channel),request=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{row.child.off('message',listener);reject(Error('native_http_resource_snapshot_timeout'));},5000),listener=m=>{if(m.type==='test-heartbeat-snapshot'&&m.request===request){clearTimeout(timer);row.child.off('message',listener);resolve(m.snapshot);}};row.child.on('message',listener);row.child.send({type:'test-heartbeat-snapshot',request,actor:id});});};
 return {...s,module,ticket,live,request,call,view,resources};
}

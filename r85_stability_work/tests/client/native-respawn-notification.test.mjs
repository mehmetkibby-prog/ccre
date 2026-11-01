import test from 'node:test';
import assert from 'node:assert/strict';
import {respawnActorNotificationR85} from '../../working/core511-source/scripts/core511/respawn-notification-r85.mjs';
import {nativeNotification} from '../../working/core511-source/scripts/core511/notification-outbox.mjs';
import {notificationViews} from '../../working/core511-source/scripts/core511/notification-audience.mjs';

test('private respawn copy requires matching native actor, successful revision and destination, and is idempotent',()=>{
 const before={id:'actor',world_cycle:1,channel:4,area:'rune_v2',hp:0,hp_revision:7},after={id:'actor',channel:4,area:'bazaar',hp:100,max_hp:100,hp_revision:8,respawn_at_ms:0,x:1200,y:920};
 const body={ok:true,hp:100,maxHp:100,hpRevision:8,area:'bazaar',x:1200,y:920},event={type:'player_respawn',eventId:'respawn:1000:actor',playerId:'actor',...body},events=[[1,4,'rune_v2',event]],context={actor:'actor',before,after,result:{status:200,body}};
 const added=respawnActorNotificationR85(events,context);assert.equal(added.length,2);assert.equal(added[0],events[0]);assert.deepEqual(nativeNotification(added[1]),{cycle:1,channels:[4],area:'bazaar',actors:['actor'],event,arena:null});assert.equal(respawnActorNotificationR85(added,context),added);
 for(const patch of [{actor:'foreign'},{after:{...after,id:'foreign'}},{after:{...after,channel:3}},{after:{...after,area:'forest'}},{after:{...after,hp_revision:7}},{after:{...after,hp:0}},{after:{...after,respawn_at_ms:1000}},{before:{...before,hp:1}},{result:{status:409,body}},{result:{status:200,body:{...body,hpRevision:9}}}])assert.equal(respawnActorNotificationR85(events,{...context,...patch}),events,JSON.stringify(patch));
 assert.equal(respawnActorNotificationR85([[1,4,'other',event]],context).length,1);
 const sameArea={...context,before:{...before,area:'bazaar'}};assert.equal(respawnActorNotificationR85([[1,4,'bazaar',event]],sameArea).length,1);
 const route=nativeNotification(added[1]),actor={...after,world_cycle:1},other={...actor,id:'observer'};
 assert.deepEqual([...notificationViews(route,[actor,other]).keys()],['actor']);
 assert.deepEqual([...notificationViews(route,[{...actor,is_gm:1,gm_invisible:1},other]).keys()],['actor'],'concealed actor sees own private event without revealing it');
 for(const patch of [{world_cycle:2},{channel:3},{area:'forest'}])assert.equal(notificationViews(route,[{...actor,...patch},other]).size,0,'stale destination scope is dropped');
 for(const patch of [{actors:['observer']},{actors:['actor','observer']},{area:'arena',event:{...event,area:'arena'}},{event:{...event,hp:0}},{event:{...event,hpRevision:0}},{event:{...event,area:'forest'}},{event:{...event,eventId:'unbound'}},{event:{...event,eventId:42}}])assert.throws(()=>notificationViews({...route,...patch},[actor,other]),/notification_scope/);
});

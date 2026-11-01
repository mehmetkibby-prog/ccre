import {DungeonChannel} from '../../working/core511-source/scripts/core511/dungeon-channel.mjs';
export const plain=value=>JSON.parse(JSON.stringify(value));
export const diff=(a,b,path='')=>Object.is(a,b)?[]:a&&b&&typeof a==='object'&&typeof b==='object'?[...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path+'.'+k)):[{path,before:b,after:a}];
export function resident(bundle){
 bundle=plain(bundle);const {player}=bundle,id=player.id,sub={ownerRow:bundle.projection.data.players.find(p=>p.id===id),data:bundle.projection.data,revision:1,cache:{old:true},privateOwnerCache:{old:true}};
 const rows=new Map([[id,player]]),dungeon={resident:{players:new Map(bundle.dungeon.players.map(p=>[p.id,p])),memberships:new Map(bundle.dungeon.memberships),materials:new Map(bundle.dungeon.materials)},locked:()=>false,refreshActor:DungeonChannel.prototype.refreshActor};
 const runtime={channel:{owners:new Map([[id,{epoch:1}]]),kernel:{players:new Map([[id,{barrier:{},epoch:1}]])},lanes:{busy:()=>true},state:{assertOwner(){}},view:{player:key=>rows.get(key),setPlayer:row=>rows.set(row.id,row)},presence:{merge:row=>row}},world:{subscribers:new Map([[id,sub]])},dungeon,adventure:{bundles:new Map([[id,bundle.adventure]]),sent:new Map([[id,'old']]),projectionCache:{old:true}},slimReload:{forgotten:[],forget(key){this.forgotten.push(key);}}};
 return {runtime,bundle,sub,id};
}
export function image(f){
 const {runtime:r,bundle,id,sub}=f,player=r.channel.view.player(id),out=plain(bundle);
 out.player=player;out.projection.data=sub.data;out.adventure=r.adventure.bundles.get(id);
 out.dungeon.players=out.dungeon.players.map(p=>p.id===id?r.dungeon.resident.players.get(id):p);
 out.dungeon.materials=[...r.dungeon.resident.materials];
 for(const key of ['actorFrame','targetFrame','retaliationPlayer'])for(const field of Object.keys(player))if(Object.hasOwn(out.combat[key],field))out.combat[key][field]=player[field];
 delete out.slim;return plain(out);
}

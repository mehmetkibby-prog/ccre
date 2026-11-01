// R49 mounts are travel-only. Every persistent value lives in a new table.
import {mountMaterialR60,MOUNT_MATERIAL_CAP_R60} from './mount-materials-r60.mjs';
export const mountEnabled=(env=process.env)=>env.CORE511_MOUNTS!=='0';
export const MOUNTS=Object.freeze([
 Object.freeze({kind:'wolf',label:'Kuzey Kurdu',speedMultiplier:1.25}),
 Object.freeze({kind:'boar',label:'Zırhlı Yaban Domuzu',speedMultiplier:1.25}),
 Object.freeze({kind:'stag',label:'Kadim Geyik',speedMultiplier:1.25})
]);
export const MOUNT_NPC=Object.freeze({name:'Seyis Arda',area:'bazaar',x:650,y:1060,reach:245});
export const MOUNT_QUEST=Object.freeze({minLevel:30,bossRequired:2,hunts:Object.freeze([
 Object.freeze({area:'forest',label:'Kuzey Ormanı',minLevel:1,kind:'hunt_forest',required:50}),
 Object.freeze({area:'frozen',label:'Donmuş Çam Geçidi',minLevel:20,kind:'hunt_frozen',required:50}),
 Object.freeze({area:'black',label:'Kara Bölge',minLevel:40,kind:'hunt_black',required:50})
]),bosses:Object.freeze([
 Object.freeze({kind:'boss_world',label:'Dünya Bossu'}),
 Object.freeze({kind:'boss_frozen',label:'Buz Tahtı Muhafızı'}),
 Object.freeze({kind:'boss_ancient',label:'Kadim Muhafız'})
])});
export const MOUNT_RECIPE=Object.freeze([
 Object.freeze({kind:'saddle_leather',label:'Sağlam Deri',required:30}),
 Object.freeze({kind:'saddle_buckle',label:'Eyer Tokası',required:8}),
 Object.freeze({kind:'saddle_rein',label:'Dizgin Parçası',required:5})
]);
export const MOUNT_ITEMS=Object.freeze([
 ...MOUNT_QUEST.hunts.map(h=>Object.freeze({kind:h.kind,label:h.label+' Av Mührü',cap:h.required,required:h.required,bound:true})),
 ...MOUNT_QUEST.bosses.map(b=>Object.freeze({...b,label:b.label+' Katkı Belgesi',cap:1,bound:true})),
 ...MOUNT_RECIPE.map(r=>Object.freeze({...r,cap:mountMaterialR60(r.kind)?MOUNT_MATERIAL_CAP_R60:r.required,bound:!mountMaterialR60(r.kind)})),
 Object.freeze({kind:'mount_saddle',label:'Evcilleştirme Eyeri',cap:1,required:1,bound:true})
]);
export const MOUNT_ACTIONS=Object.freeze(['start','craft','tame_start','tame_step','select']);
export const MOUNT_TAME=Object.freeze({steps:3,delayMs:1600,windowMs:900,lifetimeMs:30000});
export const mountDefinition=kind=>MOUNTS.find(m=>m.kind===kind)??null;
export const mountItem=kind=>MOUNT_ITEMS.find(m=>m.kind===kind)??null;
const TRAVEL_AREAS=new Set(['bazaar','forest','frozen','black','ancient','sanctum','fishing','sinsi','dragon','event','rune','rune_v2']);
export function mountAllowed(player,now=Date.now(),{locked=false,riding=false}={}){
 return Boolean(player&&player.hp>0&&!player.arena_match_id&&!locked&&TRAVEL_AREAS.has(player.area)&&(riding||Number(player.combat_lock_until_ms??0)<=now&&Number(player.root_until_ms??0)<=now&&Number(player.stun_until_ms??0)<=now));
}

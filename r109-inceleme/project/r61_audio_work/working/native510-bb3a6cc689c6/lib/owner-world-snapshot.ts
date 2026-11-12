// Reward refreshes carry the owner's full inventory/progression. They may not
// replace the room roster or reuse players from another world or scope.
type Scope={area:string;channel:number;world:{cycle:number};arenaMatch?:{id:string}|null};
export const ownerSnapshotScope=(value:Scope)=>JSON.stringify([value.world.cycle,value.channel,value.area,value.area==='arena'?value.arenaMatch?.id??'':'']);
export type OwnerSnapshotOrder={scope:string;snapshotAtMs:number;requestedAt:number};
export function ownerReadTimestamp(value:{ownerSnapshotAtMs?:number;snapshotAtMs?:number}){
 return Math.max(0,Number(value.ownerSnapshotAtMs??value.snapshotAtMs)||0);
}
export function predatesOwnerMutation(value:{ownerSnapshotAtMs?:number;snapshotAtMs?:number},durableAtMs:number){
 return durableAtMs>0&&ownerReadTimestamp(value)<=durableAtMs;
}
export function olderOwnerSnapshot(incoming:OwnerSnapshotOrder,applied:OwnerSnapshotOrder|null){
 if(!applied||incoming.scope!==applied.scope)return false;
 return incoming.snapshotAtMs>0&&applied.snapshotAtMs>0?incoming.snapshotAtMs<applied.snapshotAtMs:incoming.requestedAt<applied.requestedAt;
}
export function mergeOwnerWorld<T extends {id:string}, W extends Scope&{players:T[]}>(previous:W|null,incoming:W,ownerId:string):W|null {
 if(!previous||ownerSnapshotScope(previous)!==ownerSnapshotScope(incoming))return null;
 if(incoming.players.length!==1||incoming.players[0].id!==ownerId)return null;
 const owner=incoming.players[0],players=previous.players.map(p=>p.id===ownerId?owner:p);
 if(!players.some(p=>p.id===ownerId))players.push(owner);
 // ownerOnly describes this packet, not persistent room state. Keeping it in
 // the world would misclassify later combat packets spread from that world.
 return {...previous,...incoming,players,ownerOnly:false,partial:false};
}

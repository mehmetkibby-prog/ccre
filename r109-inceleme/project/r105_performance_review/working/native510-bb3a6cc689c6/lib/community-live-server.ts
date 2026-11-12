import {publishRealtimeRoomEvent} from '@/lib/realtime-room';
import type {CommunityProgress} from '@/lib/community-live.mjs';

type CommunityService = {
  progress(accountId?:string):CommunityProgress|null;
  occupiedRooms():{cycle:number;rooms:Array<{channel:number;area:string;arenaMatchId:string}>};
};
const service = () => (globalThis as unknown as {__colCommunityEvent?:CommunityService}).__colCommunityEvent;
export function readCommunityProgress(accountId?:string) {
  try { return service()?.progress(accountId) ?? null; }
  catch (error) { console.warn('Community progress read failed; calendar reconciliation remains active.', error); return null; }
}

// One small public packet per occupied room, coalesced across simultaneous
// kills. No personal progress, account IDs or reward receipts leave HTTP.
let pending:Promise<void>|null = null;
let dirty = false;
export function publishCommunityProgress() {
  dirty = true;
  if (pending) return pending;
  pending = new Promise<void>(resolve => {
    setTimeout(() => {
      dirty = false;
      void (async () => {
        const current = service();
        if (!current) return;
        const progress = current.progress();
        if (!progress) return;
        const {cycle,rooms} = current.occupiedRooms();
        const event = {type:'community_progress',eventId:crypto.randomUUID(),progress,serverAt:Date.now()};
        await Promise.all(rooms.map(room => publishRealtimeRoomEvent(cycle,room.channel,room.area,event,room.arenaMatchId)));
      })().catch(error => console.warn('Community broadcast failed; calendar reconciliation remains active.',error)).finally(() => {
        pending = null;
        // A slow transport holds at most one group in flight. Kills during it
        // collapse into one subsequent delivery of the latest absolute value.
        if (dirty) void publishCommunityProgress();
        resolve();
      });
    }, 75);
  });
  return pending;
}

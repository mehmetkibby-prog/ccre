import { isAreaWalkableSegment } from "@/lib/world-layout";
import type { db } from "@/lib/game-world";

// Uzakçı sınıflara erişim sağlanır; gerçek hareket yine sunucu çarpışma
// doğrulamasından geçer ve duvarların içinden atlanamaz.
import { GUARDIAN_PULL_RANGE, GUARDIAN_DASH_RANGE } from './class-combat.mjs';
export { GUARDIAN_PULL_RANGE, GUARDIAN_DASH_RANGE };
export const GUARDIAN_ROOT_MS = 600;
export const GUARDIAN_STUN_MS = 450;
type Point = { x: number; y: number };
export function guardianEndpoint(area: string, from: Point, toward: Point, travel: number) {
  const length = Math.hypot(toward.x - from.x, toward.y - from.y);
  if (!length || !Number.isFinite(length)) return { ...from };
  const distance = Math.min(length, Math.max(0, travel));
  const endpoint = { x: from.x + (toward.x - from.x) / length * distance, y: from.y + (toward.y - from.y) / length * distance };
  // Most fights are on open ground. A single segment check is sufficient
  // there; only paths meeting an obstacle need the bounded 8-unit walk.
  if (isAreaWalkableSegment(area, from.x, from.y, endpoint.x, endpoint.y)) return endpoint;
  let result = { ...from };
  for (let moved = Math.min(8, distance); moved <= distance; moved = Math.min(distance, moved + 8)) {
    const next = { x: from.x + (toward.x - from.x) / length * moved, y: from.y + (toward.y - from.y) / length * moved };
    if (!isAreaWalkableSegment(area, result.x, result.y, next.x, next.y)) break;
    result = next;
    if (moved === distance) break;
  }
  return result;
}

type GuardianImpact = {
 type: string; eventId: string; attackerId: string; targetId: string;
 targetKind: "player" | "monster"; ability: number; casterPoint: Point; from: Point; to: Point;
 actorId: string; moved: Record<string,number> | null; controlled: Record<string,number> | null;
 targetPoint: Point; serverAt: number; area: string; channel: number;
 spawnRound?: number; intentId?: string;
};

// The caller has already committed a confirmed hit and reserved its cooldown.
// Scope and position CAS prevent a simultaneous respawn/teleport being pulled back.
export async function applyGuardianImpact(database: ReturnType<typeof db>, attacker: { id: string; role: string; area: string; channel: number; arena_match_id: string; realtime_scope_version: number }, ability: number,
  target: { id: string; x: number; y: number; spawn_round?: number; realtime_scope_version?: number }, kind: "player" | "monster", now: number, retry = 0): Promise<GuardianImpact | null> {
  if (attacker.role !== "muhafiz" || ability === 0) return null;
  const own = await database.prepare("SELECT x,y,hp,position_revision,root_until_ms,stun_until_ms FROM players WHERE id=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?")
    .bind(attacker.id,attacker.area,attacker.channel,attacker.arena_match_id,attacker.realtime_scope_version)
    .first<Point & {hp:number;position_revision:number;root_until_ms:number;stun_until_ms:number}>();
  if (!own || own.hp <= 0 || own.stun_until_ms > now || (ability === 2 && own.root_until_ms > now)) return null;
  const hitTarget = target;
  // A moving target may have checkpointed since the hit was validated. Refresh
  // its position, but never follow it across a respawn, teleport or scope change.
  if (kind === "player") {
    const live = await database.prepare(`SELECT x,y,realtime_scope_version FROM players
      WHERE id=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=?${ability === 1 ? " AND hp>0" : ""}`)
      .bind(target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.realtime_scope_version ?? -1)
      .first<Point & {realtime_scope_version:number}>();
    if (!live) return null;
    target = {...target,...live};
  }
  const length = Math.hypot(target.x-own.x,target.y-own.y);
  if (length > (ability === 1 ? GUARDIAN_PULL_RANGE : GUARDIAN_DASH_RANGE) + 125) return null;
  const actorId = ability === 1 ? target.id : attacker.id;
  const from = ability === 1 ? target : own;
  const toward = ability === 1 ? own : target;
  const to = guardianEndpoint(attacker.area, from, toward, Math.min(ability === 1 ? GUARDIAN_PULL_RANGE : GUARDIAN_DASH_RANGE, Math.max(0,length-(ability === 1 ? 65 : 38))));
  const until = now + (ability === 1 ? GUARDIAN_ROOT_MS : GUARDIAN_STUN_MS);
  let moved: Record<string,number> | null = null;
  if (ability === 2 || kind === "player") {
    const id = actorId;
    moved = await database.prepare(`UPDATE players SET x=?,y=?,position_revision=position_revision+1,
      movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
      hp_revision=hp_revision+1,root_until_ms=MAX(root_until_ms,?)
      WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=?
        AND x=? AND y=? AND realtime_scope_version=? RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`)
      .bind(to.x,to.y,now,ability===1?until:now,id,attacker.area,attacker.channel,attacker.arena_match_id,from.x,from.y,ability===2?attacker.realtime_scope_version:target.realtime_scope_version)
      .first<Record<string,number>>();
    if (!moved) {
      if (retry < 4)
        return applyGuardianImpact(database,attacker,ability,hitTarget,kind,now,retry+1);
      return null;
    }
  }
  let controlled: Record<string,number> | null = null;
  if (kind === "player" && ability === 2 && Math.hypot(to.x-target.x,to.y-target.y)<=100) {
    controlled = await database.prepare(`UPDATE players SET root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?),hp_revision=hp_revision+1
      WHERE id=? AND hp>0 AND area=? AND channel=? AND arena_match_id=? AND x=? AND y=?
      RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`)
      .bind(until,until,target.id,attacker.area,attacker.channel,attacker.arena_match_id,target.x,target.y).first<Record<string,number>>();
  } else if (kind === "monster") {
    const endpoint = ability === 1 ? to : target;
    controlled = await database.prepare(`UPDATE monsters SET control_x=?,control_y=?,root_until_ms=MAX(root_until_ms,?),stun_until_ms=MAX(stun_until_ms,?)
      WHERE id=? AND hp>0 AND spawn_round=? AND area=? AND (channel=0 OR channel=?) AND is_stone=0
      RETURNING root_until_ms,stun_until_ms`)
      .bind(endpoint.x,endpoint.y,until,ability===2?until:0,target.id,target.spawn_round!,attacker.area,attacker.channel).first<Record<string,number>>();
  }
  return { type:"guardian_control", eventId:crypto.randomUUID(), attackerId:attacker.id,targetId:target.id,targetKind:kind,ability,
    casterPoint:{x:own.x,y:own.y},from:{x:from.x,y:from.y},to, actorId, moved,controlled, targetPoint:{x:target.x,y:target.y},serverAt:now,area:attacker.area,channel:attacker.channel,
    ...(kind === "monster" ? {spawnRound:target.spawn_round} : {}) };
}

export function lifeStealAmount(damage:number, percent:number) {
  return Math.floor(Math.max(0,damage) * Math.max(0,Math.min(15,percent)) / 100);
}

export async function dashGuardian(database:ReturnType<typeof db>, player:{id:string;area:string;channel:number;arena_match_id:string;realtime_scope_version:number}, direction:Point, now:number,cooldown:number,retry=0):Promise<GuardianImpact|null> {
  const own = await database.prepare("SELECT x,y FROM players WHERE id=?").bind(player.id).first<Point>();
  const length=Math.hypot(direction.x,direction.y);
  if(!own || !Number.isFinite(length) || length<.01) return null;
  const to=guardianEndpoint(player.area,own,{x:own.x+direction.x/length*GUARDIAN_DASH_RANGE,y:own.y+direction.y/length*GUARDIAN_DASH_RANGE},GUARDIAN_DASH_RANGE);
  const moved=await database.prepare(`UPDATE players SET x=?,y=?,attack_three_at=?+?,position_revision=position_revision+1,
    hp_revision=hp_revision+1,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0
    WHERE id=? AND role='muhafiz' AND hp>0 AND rod_equipped=0 AND root_until_ms<=? AND stun_until_ms<=?
      AND attack_three_at<=? AND area=? AND channel=? AND arena_match_id=? AND realtime_scope_version=? AND x=? AND y=?
    RETURNING x,y,position_revision,hp,hp_revision,root_until_ms,stun_until_ms`)
    .bind(to.x,to.y,now,cooldown,now,player.id,now,now,now,player.area,player.channel,player.arena_match_id,player.realtime_scope_version,own.x,own.y).first<Record<string,number>>();
  if(!moved&&retry<2)return dashGuardian(database,player,direction,now,cooldown,retry+1);
  return moved?{type:"guardian_control",eventId:crypto.randomUUID(),attackerId:player.id,actorId:player.id,targetId:"",targetKind:"player",ability:2,casterPoint:own,from:own,to,targetPoint:to,moved,controlled:null,serverAt:now,area:player.area,channel:player.channel}:null;
}

// A confirmed attack still has a visual when blocked, lethal, or its displacement CAS lost.
// This event has no authoritative row and cannot move/revive a player or monster.
export function guardianCastVisual(attacker:{id:string;role:string;x:number;y:number;area:string;channel:number},ability:number,target:Point & {id:string;spawn_round?:number},kind:"player"|"monster",now:number) {
  if(attacker.role!=="muhafiz"||ability<1||ability>2)return null;
  const casterPoint={x:attacker.x,y:attacker.y};
  return {type:"guardian_control",eventId:crypto.randomUUID(),attackerId:attacker.id,actorId:attacker.id,targetId:target.id,targetKind:kind,ability,
    casterPoint,from:ability===1?{x:target.x,y:target.y}:casterPoint,to:casterPoint,targetPoint:{x:target.x,y:target.y},moved:null,controlled:null,visualOnly:true,serverAt:now,area:attacker.area,channel:attacker.channel,
    ...(kind === "monster" ? {spawnRound:target.spawn_round} : {})};
}

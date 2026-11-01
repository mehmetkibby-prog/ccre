import {REST_REGEN_SQL} from './rest-regeneration-rules.mjs';
export const HEARTBEAT_GEAR_SQL="UPDATE player_items SET equipped = 0 WHERE player_id = ? AND equipped = 1\n          AND kind IN ('weapon','armor','helmet','shoes','necklace') AND\n          (SELECT level FROM players WHERE id = player_items.player_id) < CASE rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END";
export const HEARTBEAT_GEAR_DUE_SQL="SELECT 1 FROM player_items WHERE player_id = ? AND equipped = 1\n          AND kind IN ('weapon','armor','helmet','shoes','necklace') AND\n          (SELECT level FROM players WHERE id = player_items.player_id) < CASE rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END LIMIT 1";
export const HEARTBEAT_QUEUE_SQL="UPDATE arena_queue SET last_seen_ms = ?, channel = COALESCE((SELECT channel FROM players WHERE id = ?), 1) WHERE player_id = ?";
export function nativeHeartbeatBatch(database,playerId,regenSettings,heartbeatNowMs){const heartbeat=database.batch([database.prepare(`UPDATE player_items SET equipped = 0 WHERE player_id = ? AND equipped = 1
          AND kind IN ('weapon','armor','helmet','shoes','necklace') AND
          (SELECT level FROM players WHERE id = player_items.player_id) < CASE rarity WHEN 'blue' THEN 7 WHEN 'orange' THEN 20 WHEN 'red' THEN 30 WHEN 'purple' THEN 60 WHEN 'unique' THEN 50 WHEN 'emerald' THEN 65 WHEN 'infinite' THEN 50 ELSE 1 END`).bind(playerId),database.prepare(REST_REGEN_SQL).bind(heartbeatNowMs, playerId, regenSettings.rest_regen_percent, regenSettings.rest_regen_combat_delay_seconds, regenSettings.rest_regen_still_seconds),database.prepare("UPDATE arena_queue SET last_seen_ms = ?, channel = COALESCE((SELECT channel FROM players WHERE id = ?), 1) WHERE player_id = ?").bind(heartbeatNowMs, playerId, playerId)])[1].results[0];return heartbeat;}
export function nativeHeartbeatPublication(heartbeat,heartbeatCycle,playerId,heartbeatNowMs,{publishRealtimeRoomEvent,deliverRealtime}){if (heartbeat) deliverRealtime(publishRealtimeRoomEvent(heartbeatCycle?.cycle ?? 1, heartbeat.channel, heartbeat.area, {
							type: "player_state",
							eventId: `heartbeat:${heartbeatNowMs}:${playerId}:${heartbeat.hp_revision}`,
							targetId: playerId,
							hp: heartbeat.hp,
							maxHp: heartbeat.max_hp,
							hpRevision: heartbeat.hp_revision,
							respawnAtMs: heartbeat.respawn_at_ms,
							serverAt: heartbeatNowMs
						}, heartbeat.arena_match_id || void 0));}
export function nativeHeartbeatResponse(heartbeat,pendingRetaliation,settledHeartbeat={current:null}){return {
						ok: true,
						pveHit: pendingRetaliation?.pveHit,
						hp: settledHeartbeat.current?.hp ?? heartbeat?.hp,
						maxHp: settledHeartbeat.current?.max_hp ?? heartbeat?.max_hp,
						hpRevision: settledHeartbeat.current?.hp_revision ?? heartbeat?.hp_revision
					};}
export function nativeHeartbeatMaintenance(database,{heartbeat,playerId,heartbeatNowMs,now,cycle,settings},ports){const heartbeatCyclePromise={cycle},heartbeatSettingsPromise=settings,settledHeartbeat={current:null};const {colLabIsPlayer,tryFinishArenaForfeit,settleArenaMatch,isArenaMode,tryCreateArenaMatch,awardPendingBossRewards,tryAwardPendingSinsiStoneRewards,awardPendingNormalRewards,tryFinalizePendingDropEnchantments}=ports.rules;const {publishRealtimeRoomEvent,deliverRealtime,tickWorld,cleanupWorld,runRewardMaintenance}=ports;
						const heartbeatCycle = heartbeatCyclePromise;
						
						if(colLabIsPlayer(playerId))return;
                        let recoveredArena = false;
						if (heartbeat?.arena_match_id) {
							const unfinishedSettlement = tryFinishArenaForfeit(database, heartbeat.arena_match_id, heartbeatNowMs) ?? database.prepare("SELECT * FROM arena_matches WHERE id = ? AND status = 'finished' AND settlement_token = '' LIMIT 1").bind(heartbeat.arena_match_id).first();
							if (unfinishedSettlement) {
								recoveredArena = settleArenaMatch(database, unfinishedSettlement, heartbeatNowMs);
								if (recoveredArena) deliverRealtime(publishRealtimeRoomEvent(unfinishedSettlement.world_cycle, unfinishedSettlement.channel, "arena", {
									type: "arena_match_finished",
									eventId: `arena-finished:${unfinishedSettlement.id}`,
									matchId: unfinishedSettlement.id,
									mode: unfinishedSettlement.mode,
									winnerTeam: unfinishedSettlement.winner_team,
									teamAName: unfinishedSettlement.team_a_name,
									teamBName: unfinishedSettlement.team_b_name,
									teamAScore: unfinishedSettlement.team_a_score,
									teamBScore: unfinishedSettlement.team_b_score,
									rewardGems: unfinishedSettlement.reward_gems,
									serverAt: heartbeatNowMs
								}, unfinishedSettlement.id));
							}
						}
						tickWorld();
						const heartbeatSettings = heartbeatSettingsPromise;
						if (heartbeat && !heartbeat.arena_match_id && heartbeat.area !== "arena") {
							const queued = database.prepare("SELECT mode, channel, room_id FROM arena_queue WHERE player_id = ? LIMIT 1").bind(playerId).first();
							if (queued && isArenaMode(queued.mode)) {
								for (let group = 0; group < 3; group += 1) if (!tryCreateArenaMatch(database, queued.mode, queued.channel, heartbeatSettings, heartbeatCycle?.cycle ?? 1, heartbeatNowMs, queued.room_id)) break;
							}
						}
						runRewardMaintenance(database, () => {
							awardPendingBossRewards(database, heartbeatSettings, now);
							for (let reward = 0; reward < 4; reward += 1) if (!(tryAwardPendingSinsiStoneRewards(database, heartbeatSettings, now))?.awarded) break;
							for (let reward = 0; reward < 6; reward += 1) if (!awardPendingNormalRewards(database, heartbeatSettings, now)) break;
							tryFinalizePendingDropEnchantments(database, heartbeatSettings);
							cleanupWorld();
						});
						if (recoveredArena) settledHeartbeat.current = database.prepare("SELECT hp, max_hp, hp_revision FROM players WHERE id = ?").bind(playerId).first();
					;return settledHeartbeat;}

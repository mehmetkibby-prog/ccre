// Native guild revoke ejection publisher; synchronous dependency/clock adapter.
export function nativeGuildEjections(events, { db, publishRealtimeRoomEvent, now }) {
	if (!events.length) return;
	
	const cycle = db().prepare("SELECT cycle FROM world_state WHERE id=1").first();
	events.forEach(({ oldArea, channel, ...event }) => publishRealtimeRoomEvent(cycle?.cycle ?? 1, channel, oldArea, {
		...event,
		type: "player_respawn",
		respawnAtMs: 0,
		serverAt: now()
	}));
}

// Exact native lib/guild-village-runtime.ts, esbuild TypeScript erasure for source-only test fixture.
function guildVillageService() {
  return globalThis.__colGuildVillage ?? null;
}
async function publishGuildEjections(events) {
  if (!events.length) return;
  const [{ db }, { publishRealtimeRoomEvent }] = await Promise.all([import("./game-world"), import("./realtime-room")]);
  const cycle = await db().prepare("SELECT cycle FROM world_state WHERE id=1").first();
  await Promise.all(events.map(({ oldArea, channel, ...event }) => publishRealtimeRoomEvent(cycle?.cycle ?? 1, channel, oldArea, { ...event, type: "player_respawn", respawnAtMs: 0, serverAt: Date.now() })));
}
export {
  guildVillageService,
  publishGuildEjections
};

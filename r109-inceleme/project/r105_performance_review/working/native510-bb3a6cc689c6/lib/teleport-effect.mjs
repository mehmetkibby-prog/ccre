// Expiration uses the synchronized server clock; pausing/offline never renews it.
export function teleportEffectActive(player,now){return !!player?.teleport_skin_owned&&!!player?.teleport_skin_enabled&&Number(player.teleport_skin_expires_at_ms)>now;}
export const TELEPORT_ANIMATION_MS=1800;

// Rendering may pause independently of the authoritative room/socket. Never
// replay the missing wall time as fresh movement or slowly chase an old image.
// Wait for a recent room snapshot, then rebuild presentation only. Inputs,
// attack sequences, effects, rewards and the authoritative room are untouched.
export function resumeDungeonMotionR71(client, now, Motion) {
 const prior = client.motionFrameAtR71;
 client.motionFrameAtR71 = now;
 if (Number.isFinite(prior) && now - prior > 200) client.motionResumeR71 = true;
 if (!client.motionResumeR71 || !client.run || now - client.received < 0 || now - client.received > 250) return false;
 client.motionResumeR71 = false;
 for (const row of [...client.run.members, ...client.run.enemies]) {
  const motion = new Motion(row.x, row.y);
  motion.epoch = row.positionEpoch ?? 0;
  motion.accept(row.x, row.y, row.velocity ?? {x:0,y:0}, 0,
   row.id === client.playerId, client.run.mode === 'solo' && row.skin === 'solo', client.received);
  client.motion.set(row.id, motion);
  client.shown.set(row.id, motion);
  client.walking.set(row.id, false);
 }
 return true;
}

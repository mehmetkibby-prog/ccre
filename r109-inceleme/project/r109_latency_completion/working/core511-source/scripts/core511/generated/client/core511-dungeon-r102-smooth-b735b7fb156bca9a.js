// working/core511-source/scripts/core511/dungeon-presentation-r97.mjs
function acceptDungeonMotionR97(client, row, motion, run, at) {
  const clock = Math.max(Number(run.motionTime ?? run.serverTime), Number(row.inputAppliedAtR98 ?? 0));
  if (!Number.isFinite(clock) || !Number.isFinite(at)) return;
  const own = row.id === client.playerId;
  const scope = JSON.stringify([run.id, run.stage, run.attempt, row.positionEpoch ?? 0, row.hp <= 0]);
  const old = motion.acceptedPoseR97;
  const command = Number(row.inputSequence ?? 0);
  if (own && old?.scope === scope && (clock < old.clock || clock === old.clock && command <= (old.command ?? 0))) return;
  motion.acceptedPoseR97 = { scope, clock, command, at };
  const velocity = row.velocity ?? { x: 0, y: 0 };
  motion.accept(row.x, row.y, velocity, Math.min(300, client.latency + Math.max(0, run.serverTime - clock)), own, run.mode === "solo" && row.skin === "solo", at);
  if (own || run.members.some((member) => member.id === row.id)) return;
  let buffer = motion.peerBufferR72, last = buffer?.samples.at(-1);
  if (last && buffer.scope === scope && clock <= last.serverAt) return;
  const sample = {
    x: row.x,
    y: row.y,
    serverAt: clock,
    receivedAt: at,
    stopped: row.hp <= 0 || row.moving === false || !last || Math.hypot(row.x - last.x, row.y - last.y) < 0.01
  };
  if (!buffer || buffer.scope !== scope || clock - last.serverAt > 250 || Math.hypot(row.x - last.x, row.y - last.y) > 360) {
    buffer = { scope, samples: [sample], offset: at - clock };
    motion.peerBufferR72 = buffer;
    motion.peerFirstR72 = void 0;
    motion.peerFrameAtR72 = void 0;
  } else {
    buffer.offset = Math.min(buffer.offset, at - clock);
    buffer.samples.push(sample);
    if (buffer.samples.length > 24) buffer.samples.splice(0, buffer.samples.length - 24);
  }
  buffer.dead = row.hp <= 0;
}
function dungeonPredictionFreshR97(client, now) {
  const pose = client.motion.get(client.playerId)?.acceptedPoseR97;
  return Boolean(pose && now - pose.at < 350 + Math.min(300, Math.max(0, client.latency)));
}
function roomVerificationSuspendedR97(world, run) {
  if (run && ["active", "portal", "complete", "wipe"].includes(run.status)) return true;
  const area = world?.area;
  return typeof area === "string" && (/^(?:kadim_[a-f0-9]{32}_(?:0[1-9]|10)|sis_[a-f0-9]{32})$/.test(area) || area === "guild_castle");
}
function AutoPotionCardR97({ React, prices, price, coins, autoOwned, own, onAction, busy, image }) {
  const h = React.createElement;
  const amount = price(prices, "auto_potion_10m").amount;
  const occupied = autoOwned && (own?.auto_potion_remaining ?? 1) > 0;
  return h(
    "article",
    { className: "premium-product", "data-r97-auto-potion": "10m" },
    h("img", { src: image, alt: "B\xFCy\xFCk Oto K\u0131rm\u0131z\u0131 \u0130ksir", width: 72, height: 72, loading: "lazy", style: { objectFit: "contain" } }),
    h(
      "div",
      null,
      h("h3", null, "B\xFCy\xFCk Oto K\u0131rm\u0131z\u0131 \u0130ksir"),
      h("p", null, "10.000.000 can kapasitesi. Can\u0131n yar\u0131ya d\xFC\u015Ft\xFC\u011F\xFCnde mevcut oto iksir gibi \xE7al\u0131\u015F\u0131r."),
      occupied && h("small", null, "Mevcut oto iksirini bitir veya pazarda sat."),
      h(
        "button",
        {
          className: "premium-buy",
          type: "button",
          disabled: busy || occupied || coins < amount,
          onClick: () => onAction({ action: "buy", product: "auto_potion_10m", expectedPrice: amount })
        },
        busy ? "\u0130\u015Fleniyor\u2026" : amount.toLocaleString("tr-TR") + " \xC7P \xB7 Sat\u0131n al"
      )
    )
  );
}
export {
  AutoPotionCardR97,
  acceptDungeonMotionR97,
  dungeonPredictionFreshR97,
  roomVerificationSuspendedR97
};

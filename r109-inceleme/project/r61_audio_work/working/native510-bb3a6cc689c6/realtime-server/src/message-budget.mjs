export const MESSAGE_BUDGET_REVISION = 4171;

// Receipt time only: client clocks cannot replenish any admission budget.
// A bounded delayed batch is not evidence of a flood. Expensive presentation
// work has its own smaller budget; discarded previews never grant movement.
function consume(player, key, now, capacity, perSecond) {
  const budget = player[key] ??= { at: now, tokens: capacity };
  budget.tokens = Math.min(capacity, budget.tokens + Math.max(0, now - budget.at) * perSecond / 1000);
  budget.at = Math.max(budget.at, now);
  if (budget.tokens < 1) return false;
  budget.tokens -= 1;
  return true;
}

export function admitRealtimeMessage(player, now, type) {
  player.admissionReason = null;
  if (!consume(player, "rawMessageBudget", now, 192, 96)) { player.admissionReason = "rawFlood"; return "close"; }
  if (now - player.messageWindowAt >= 1000) {
    player.messageWindowAt = now;
    player.messageCount = player.moveCount = player.attackCount = player.pingCount = 0;
  }
  player.messageCount += 1;
  if (type === "movement_checkpoint") {
    if (consume(player, "checkpointMessageBudget", now, 8, 6)) return "allow";
    player.admissionReason = "movementBudget"; return "throttle";
  }
  if (type === "combat_attack") {
    if (consume(player, "attackMessageBudget", now, 8, 6)) return "allow";
    player.admissionReason = "combatBudget"; return "throttle";
  }
  if (type === "move" || type === "motion") {
    player.moveCount += 1;
    return consume(player, "motionMessageBudget", now, 72, 60) ? "allow" : "drop";
  }
  if (type === "attack_intent") {
    player.attackCount += 1;
    if (player.attackCount <= 10) return "allow";
    player.admissionReason = "attackPreviewBudget"; return "drop";
  }
  if (type === "ping") {
    player.pingCount += 1;
    // Preserve the reply cap. Focus/resume probes compressed by the network
    // must not disconnect a valid session or generate an invented RTT sample.
    return player.pingCount <= 2 ? "allow" : "drop";
  }
  return "allow";
}

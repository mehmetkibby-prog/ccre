// Presentation only: never discard authoritative monster deaths/rewards or
// another visible player's health/control when concealing a GM caster.
export function eventForViewer(event, hidden, viewerId) {
  const concealed = id => Boolean(id && id !== viewerId && hidden(id));
  if (['presence_join','presence_leave','move','motion_preview','player_respawn'].includes(event.type)
    && concealed(event.playerId)) return null;
  if (['player_state','player_hit'].includes(event.type) && concealed(event.targetId)) return null;
  const attacker = concealed(event.attackerId), actor = concealed(event.actorId);
  const target = (event.targetKind === 'player' || ['pvp_result','pvp_reject'].includes(event.type)) && concealed(event.targetId);
  if ((event.type === 'attack_intent' && (attacker || target)) || (event.type === 'monster_preview' && attacker)) return null;
  if (event.type === 'guardian_control' && (attacker || actor || target)) {
    if (event.visualOnly) return null;
    const next = { ...event, silent: true };
    if (attacker) { next.attackerId = ''; delete next.casterPoint; }
    if (actor) { next.actorId = ''; next.moved = null; delete next.from; delete next.to; }
    if (target) { next.targetId = ''; next.controlled = null; delete next.targetPoint; }
    // from is presentation geometry, while to/targetPoint may be the visible
    // monster's authoritative pulled position and must survive that case.
    if (attacker) delete next.from;
    if (!next.moved && !next.controlled) return null;
    if (!event.targetId) delete next.targetPoint;
    return next;
  }
  if (target && ['pvp_result','pvp_reject'].includes(event.type)) {
    // A previously visible selected target may disappear during an in-flight
    // hit. The requester needs settlement, but other viewers need no target data.
    if (event.attackerId !== viewerId) return null;
    return { type: 'pvp_reject', eventId: event.eventId, intentId: event.intentId,
      targetId: event.targetId, attackerId: viewerId, silent: true, serverAt: event.serverAt };
  }
  if (attacker && ['monster_result','monster_reject','pvp_result','pvp_reject'].includes(event.type)) {
    const next = { ...event, attackerId: '', silent: true };
    delete next.attackerGems;
    return next;
  }
  return event;
}

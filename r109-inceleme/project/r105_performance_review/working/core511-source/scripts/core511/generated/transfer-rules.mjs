import {CAPACITY} from '../contract.mjs';
import {isAdventureArea} from '../adventure-maps.mjs';
import {runeEligible,RUNE_GATE_MESSAGE} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
const ambient=globalThis;
export function createTransferRules({globals=ambient,capacity=()=>CAPACITY,response=ambient.Response}={}){
const globalThis=globals,channelCapacity510=capacity,Response=response;
function expansion65Available(settings, player) {
	return Number(settings?.expansion65_enabled) === 1 || !!(player?.id && Number(player.is_gm) === 1 && player.id === settings?.expansion65_preview_player_id);
}
function canEnterAncient(settings, player) {
	return expansion65Available(settings, player) && Number(player?.level) >= 50;
}
function clamp$1(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
function dungeonLocked(id) {
	return globalThis.__colDungeon?.locked(id) ?? false;
}
async function selectChannel(context){
const {player,settings,payload,playerId,now,requestReceivedAtMs,database,settlePveEngagement}=context;const auth={player};
if (auth.player && dungeonLocked(auth.player.id) && !["join", "heartbeat", "friend_add", "friend_remove", "friend_accept", "friend_reject", "friend_cancel"].includes(payload.action ?? "")) return Response.json({ error: "Önce zindan koşundan ayrıl." }, { status: 409 });
if(player.area==='rune_v2'&&!(payload.action==='respawn'&&player.hp<=0)&&(!runeEligible(player)||!globalThis.__colRuneV2?.settings().config.enabled))return Response.json({error:'Karanlık Rün Sahili şu anda kapalı veya 65. seviye ve rütbe gerekiyor.'},{status:403});
if(player.area==='rune'&&(!runeEligible(player)||!globalThis.__colRunes?.settings().config.enabled))return Response.json({error:RUNE_GATE_MESSAGE},{status:403});
if (player.area === "ancient" && !canEnterAncient(settings, player)) return Response.json({ error: "Bu bölgeye erişimin değişti; dünya bilgilerini yenile." }, { status: 403 });
if (player.reset_at > now) return Response.json({ error: "Yaşam Çekirdeği parçalanıyor. Dünya yeniden doğmayı bekliyor." }, { status: 423 });
if (payload.action === "select_channel") {
 if(isAdventureArea(player.area))return Response.json({error:"Kanal değiştirmek için önce seferden çık."},{status:409});
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
					if (player.hp <= 0) return Response.json({ error: "Karakterin yeniden doğmayı bekliyor." }, { status: 409 });
					if ((await settlePveEngagement(database, playerId, settings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
					if (player.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
					const targetChannel = clamp$1(Math.floor(Number(payload.channel) || 0), 1, 4);
					if (targetChannel === player.channel) return Response.json({
						ok: true,
						channel: player.channel,
						message: `Zaten Kanal ${player.channel}'desin.`
					});
					if (typeof database.transferPlayer === "function") {
  // The ownership handoff commits the capacity guard and scope cleanup together.
  // No old-owner writes are permitted after transferPlayer returns.
  const membership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
  const cleanupStatements = [
    database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
    database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
    database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
    database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId),
  ];
  if (membership) {
    cleanupStatements.push(
      database.prepare("UPDATE parties SET leader_id = (SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1) WHERE id = ? AND EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id, membership.party_id),
      database.prepare("DELETE FROM parties WHERE id = ? AND NOT EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id),
    );
  }
  const switchStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
    AND combat_lock_until_ms <= ?
    AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
    RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity));
  const transferred = await database.transferPlayer(playerId, targetChannel, switchStatement, cleanupStatements);
  if (!transferred) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
  return Response.json({ ok: true, channel: transferred.channel, message: `Kanal ${transferred.channel}'e geçtin.` });
}
const switched = await database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
         AND combat_lock_until_ms <= ?
         AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
         RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity)).first();
					if (!switched) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
					const membership = await database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
					await database.batch([
						database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
						database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
						database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
						database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId)
					]);
					if (membership) {
						const remaining = await database.prepare("SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1").bind(membership.party_id).first();
						if (remaining) await database.prepare("UPDATE parties SET leader_id = ? WHERE id = ?").bind(remaining.player_id, membership.party_id).run();
						else await database.prepare("DELETE FROM parties WHERE id = ?").bind(membership.party_id).run();
					}
					return Response.json({
						ok: true,
						channel: switched.channel,
						message: `Kanal ${switched.channel}'e geçtin.`
					});
				}
throw Error("invalid_transfer_action");
}
function writerPlan({database,playerId,targetChannel,now,requestReceivedAtMs,settings}){
const membership = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
  const cleanupStatements = [
    database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
    database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
    database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
    database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId),
  ];
  if (membership) {
    cleanupStatements.push(
      database.prepare("UPDATE parties SET leader_id = (SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1) WHERE id = ? AND EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id, membership.party_id),
      database.prepare("DELETE FROM parties WHERE id = ? AND NOT EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id),
    );
  }
  const switchStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
    AND combat_lock_until_ms <= ?
    AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
    RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity));
  
return {switchStatement,cleanupStatements};
}
function selectChannelSync(context){
const {player,settings,payload,playerId,now,requestReceivedAtMs,database,settlePveEngagement}=context;const auth={player};
if (auth.player && dungeonLocked(auth.player.id) && !["join", "heartbeat", "friend_add", "friend_remove", "friend_accept", "friend_reject", "friend_cancel"].includes(payload.action ?? "")) return Response.json({ error: "Önce zindan koşundan ayrıl." }, { status: 409 });
if(player.area==='rune_v2'&&!(payload.action==='respawn'&&player.hp<=0)&&(!runeEligible(player)||!globalThis.__colRuneV2?.settings().config.enabled))return Response.json({error:'Karanlık Rün Sahili şu anda kapalı veya 65. seviye ve rütbe gerekiyor.'},{status:403});
if(player.area==='rune'&&(!runeEligible(player)||!globalThis.__colRunes?.settings().config.enabled))return Response.json({error:RUNE_GATE_MESSAGE},{status:403});
if (player.area === "ancient" && !canEnterAncient(settings, player)) return Response.json({ error: "Bu bölgeye erişimin değişti; dünya bilgilerini yenile." }, { status: 403 });
if (player.reset_at > now) return Response.json({ error: "Yaşam Çekirdeği parçalanıyor. Dünya yeniden doğmayı bekliyor." }, { status: 423 });
if (payload.action === "select_channel") {
 if(isAdventureArea(player.area))return Response.json({error:"Kanal değiştirmek için önce seferden çık."},{status:409});
					if (player.area === "arena" || player.arena_match_id) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
					if (player.hp <= 0) return Response.json({ error: "Karakterin yeniden doğmayı bekliyor." }, { status: 409 });
					if ((settlePveEngagement(database, playerId, settings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
					if (player.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
					const targetChannel = clamp$1(Math.floor(Number(payload.channel) || 0), 1, 4);
					if (targetChannel === player.channel) return Response.json({
						ok: true,
						channel: player.channel,
						message: `Zaten Kanal ${player.channel}'desin.`
					});
					if (typeof database.transferPlayer === "function") {
  // The ownership handoff commits the capacity guard and scope cleanup together.
  // No old-owner writes are permitted after transferPlayer returns.
  const membership = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
  const cleanupStatements = [
    database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
    database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
    database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
    database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId),
  ];
  if (membership) {
    cleanupStatements.push(
      database.prepare("UPDATE parties SET leader_id = (SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1) WHERE id = ? AND EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id, membership.party_id),
      database.prepare("DELETE FROM parties WHERE id = ? AND NOT EXISTS (SELECT 1 FROM party_members WHERE party_id = ?)").bind(membership.party_id, membership.party_id),
    );
  }
  const switchStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
    AND combat_lock_until_ms <= ?
    AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
    RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity));
  const transferred = database.transferPlayer(playerId, targetChannel, switchStatement, cleanupStatements);
  if (!transferred) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
  return Response.json({ ok: true, channel: transferred.channel, message: `Kanal ${transferred.channel}'e geçtin.` });
}
const switched = database.prepare(`UPDATE players SET channel = ?, last_seen = ?, realtime_scope_version = realtime_scope_version + 1 WHERE id = ?
         AND combat_lock_until_ms <= ?
         AND (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?
         RETURNING channel`).bind(targetChannel, now, playerId, requestReceivedAtMs, targetChannel, playerId, now - 30, channelCapacity510(targetChannel,settings.channel_capacity)).first();
					if (!switched) return Response.json({ error: `Kanal ${targetChannel} dolu. En fazla ${channelCapacity510(targetChannel,settings.channel_capacity)} oyuncu girebilir.` }, { status: 409 });
					const membership = database.prepare("SELECT party_id FROM party_members WHERE player_id = ?").bind(playerId).first();
					database.batch([
						database.prepare("DELETE FROM party_invites WHERE sender_id = ? OR recipient_id = ?").bind(playerId, playerId),
						database.prepare("DELETE FROM party_members WHERE player_id = ?").bind(playerId),
						database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(playerId),
						database.prepare("UPDATE market_shops SET channel = ? WHERE owner_id = ? AND EXISTS (SELECT 1 FROM players WHERE id = ? AND area = 'bazaar')").bind(targetChannel, playerId, playerId)
					]);
					if (membership) {
						const remaining = database.prepare("SELECT player_id FROM party_members WHERE party_id = ? ORDER BY joined_at LIMIT 1").bind(membership.party_id).first();
						if (remaining) database.prepare("UPDATE parties SET leader_id = ? WHERE id = ?").bind(remaining.player_id, membership.party_id).run();
						else database.prepare("DELETE FROM parties WHERE id = ?").bind(membership.party_id).run();
					}
					return Response.json({
						ok: true,
						channel: switched.channel,
						message: `Kanal ${switched.channel}'e geçtin.`
					});
				}
throw Error("invalid_transfer_action");
}
return {selectChannel,selectChannelSync,writerPlan};
}

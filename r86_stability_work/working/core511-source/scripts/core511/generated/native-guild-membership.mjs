// Exact V510 guild cases and war entry helpers and guild_changed recipient queries.
// Native private audience is captured synchronously inside the sole-writer transaction.
import {castleEnabled} from '../castle-model-r59.mjs';
export function createNativeGuildMembership({clock=globalThis.Date.now,uuid=()=>globalThis.crypto.randomUUID()}={}){
const Date={now:clock},crypto={randomUUID:uuid},channelCapacitySql510=()=>25;
var NORMAL_GROUP_RULES = Object.freeze({
	dungeonMin: 3,
	dungeonMax: 5,
	guildMin: 3,
	guildTeamSize: 10,
	guildLeadersOnly: false
});
var GROUP_RULES = Object.freeze({
	...NORMAL_GROUP_RULES,
	dungeonMin: 2
});
var authorized = `EXISTS(SELECT 1 FROM guilds g WHERE g.id=guild_members.guild_id AND g.leader_id=?)`;
var baseReadyPlayer = `p.last_seen>=? AND p.hp>0 AND p.area!='arena' AND p.arena_match_id='' AND p.combat_lock_until_ms<=? AND NOT EXISTS(SELECT 1 FROM pve_engagements e WHERE e.player_id=p.id) AND NOT EXISTS(SELECT 1 FROM dungeon_members d WHERE d.player_id=p.id)`;
 function guildAction(database, playerId, input, rules = GROUP_RULES) {
	const now = Math.floor(Date.now() / 1e3), nowMs = Date.now();
	const target = typeof input.target === "string" ? input.target.slice(0, 100) : "";
	const id = typeof input.id === "string" ? input.id.slice(0, 100) : "";
	const requestId = typeof input.requestId === "string" && /^[a-zA-Z0-9-]{16,80}$/.test(input.requestId) ? input.requestId : "";
	const success = (row, message) => {
		if (!row) throw new Error("İşlem uygulanamadı. Yetkini, daveti ve güncel durumu kontrol et.");
		return {
			ok: true,
			message
		};
	};
	switch (input.action) {
case "create": {
			const name = typeof input.name === "string" ? input.name.normalize("NFKC").trim().replace(/\s+/g, " ") : "";
			if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,23}$/u.test(name)) throw new Error("Lonca adı 3–24 harf veya rakam olmalı.");
			return success(database.prepare("INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,?) RETURNING id").bind(crypto.randomUUID(), name, name.toLocaleLowerCase("tr-TR"), playerId, now).first(), "Loncan kuruldu. Birlikte bir efsane yazın!");
		}
case "invite": return success(database.prepare(`INSERT INTO guild_invites(id,guild_id,sender_id,recipient_id,expires_at)
  SELECT ?,m.guild_id,?,?,? FROM guild_members m JOIN guilds g ON g.id=m.guild_id JOIN players p ON p.id=?
  WHERE m.player_id=? AND (m.can_invite=1 OR g.leader_id=?) AND p.last_seen>=? AND p.id!=?
  AND NOT EXISTS(SELECT 1 FROM guild_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=g.id)
  ${castleEnabled()?'':'AND (SELECT COUNT(*) FROM guild_members WHERE guild_id=g.id)<40'}
  ON CONFLICT(guild_id,recipient_id) DO UPDATE SET sender_id=excluded.sender_id,expires_at=excluded.expires_at RETURNING id`).bind(crypto.randomUUID(), playerId, target, now + 120, target, playerId, playerId, now - 30, playerId).first(), "Lonca daveti gönderildi. Davet 2 dakika geçerli.");
case "accept": return success((database.batch([database.prepare(`INSERT INTO guild_members(player_id,guild_id,can_invite,joined_at)
    SELECT ?,i.guild_id,0,? FROM guild_invites i JOIN guild_members sender ON sender.player_id=i.sender_id AND sender.guild_id=i.guild_id JOIN guilds g ON g.id=i.guild_id
    WHERE i.id=? AND i.recipient_id=? AND i.expires_at>? AND (sender.can_invite=1 OR g.leader_id=i.sender_id) RETURNING player_id`).bind(playerId, now, id, playerId, now), database.prepare("DELETE FROM guild_invites WHERE recipient_id=? AND EXISTS(SELECT 1 FROM guild_members WHERE player_id=?)").bind(playerId, playerId)]))[0].results[0], "Loncaya katıldın.");
case "decline":
			database.prepare("DELETE FROM guild_invites WHERE id=? AND recipient_id=?").bind(id, playerId).run();
			return {
				ok: true,
				message: "Davet reddedildi."
			};
case "leave": return success(database.prepare("DELETE FROM guild_members WHERE player_id=? RETURNING player_id").bind(playerId).first(), "Loncadan ayrıldın.");
case "disband": {
			if (!id || typeof input.name !== "string") throw new Error("Kapatmak için lonca adını doğrula.");
			const result = database.batch([database.prepare(`SELECT player_id FROM guild_members WHERE guild_id IN(SELECT id FROM guilds WHERE id=? AND leader_id=? AND name=?)`).bind(id, playerId, input.name), database.prepare("DELETE FROM guilds WHERE id=? AND leader_id=? AND name=? RETURNING id").bind(id, playerId, input.name)]);
			return {
				...success(result[1].results[0], "Lonca kapatıldı. Üyelerin karakterleri ve eşyaları korundu."),
				notifyPlayerIds: result[0].results.map((r) => r.player_id)
			};
		}
case "kick": return success(database.prepare(`DELETE FROM guild_members WHERE player_id=? AND ${authorized} RETURNING player_id`).bind(target, playerId).first(), "Oyuncu loncadan çıkarıldı.");
case "permission": return success(database.prepare(`UPDATE guild_members SET can_invite=? WHERE player_id=? AND ${authorized} RETURNING player_id`).bind(input.enabled === true ? 1 : 0, target, playerId).first(), "Davet yetkisi güncellendi.");
case "transfer": return success(database.prepare(`UPDATE guilds SET leader_id=? WHERE leader_id=? AND EXISTS(SELECT 1 FROM guild_members WHERE player_id=? AND guild_id=guilds.id) AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=guilds.id) RETURNING id`).bind(target, playerId, target).first(), "Başkanlık devredildi.");
case "tax": {
			const rate = Number(input.rate);
			if (!Number.isInteger(rate) || rate < 0 || rate > 50) throw new Error("Vergi %0–50 arası tam sayı olmalı.");
			return success(database.prepare("UPDATE guilds SET tax_rate=? WHERE leader_id=? RETURNING id").bind(rate, playerId).first(), "Lonca öz vergisi güncellendi.");
		}
case "withdraw": {
			const amount = Number(input.amount);
			if (!requestId || !Number.isSafeInteger(amount) || amount < 1 || amount > 9e12) throw new Error("Geçerli bir öz miktarı gir.");
			if (database.prepare("SELECT id FROM closed_guild_ledger WHERE id=?").bind("withdraw:" + playerId + ":" + requestId).first()) return {
				ok: true,
				message: "Bu çekim isteği daha önce işlendi; tekrar ödeme yapılmadı."
			};
			const row = database.prepare(`INSERT INTO guild_ledger(id,guild_id,player_id,kind,amount,created_at) SELECT ?,id,?,'withdraw',?,? FROM guilds WHERE leader_id=? AND NOT EXISTS(SELECT 1 FROM guild_ledger WHERE id=?) AND NOT EXISTS(SELECT 1 FROM closed_guild_ledger WHERE id=?) ON CONFLICT(id) DO NOTHING RETURNING id`).bind("withdraw:" + playerId + ":" + requestId, playerId, amount, now, playerId, "withdraw:" + playerId + ":" + requestId, "withdraw:" + playerId + ":" + requestId).first();
			if (!row && !database.prepare("SELECT id FROM guild_ledger WHERE id=? AND player_id=?").bind("withdraw:" + playerId + ":" + requestId, playerId).first()) throw new Error("Kasa çekimi için başkan yetkisi gerekiyor.");
			return {
				ok: true,
				message: row ? "Öz güvenle karakterine aktarıldı." : "Bu çekim isteği daha önce işlendi; tekrar ödeme yapılmadı."
			};
		}
case "challenge": return success(database.prepare(`INSERT INTO guild_wars(id,challenger,defender,expires_at,created_at)
  SELECT ?,a.id,b.id,?,? FROM guilds a,guilds b WHERE a.leader_id=? AND b.id=? AND a.id!=b.id
  AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=a.id AND ${baseReadyPlayer})>=${rules.guildMin}
  AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=b.id AND ${baseReadyPlayer})>=${rules.guildMin}
  AND EXISTS(SELECT 1 FROM players p WHERE p.id=a.leader_id AND ${baseReadyPlayer})
  AND EXISTS(SELECT 1 FROM players p WHERE p.id=b.leader_id AND ${baseReadyPlayer})
  AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id IN(a.id,b.id))
  AND NOT EXISTS(SELECT 1 FROM guild_wars WHERE ((challenger=a.id AND defender=b.id) OR (challenger=b.id AND defender=a.id)) AND created_at>?) RETURNING id`).bind("guild-" + crypto.randomUUID(), now + 120, now, playerId, target, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs, now - 1200).first(), "Savaş isteği karşı başkana gönderildi. Her loncadan en az üç oyuncu katılımını onayladığında savaş başlayacak. Her takım en fazla 10 oyuncu alır.");
case "war_decline": return success(database.prepare(`UPDATE guild_wars SET status='declined' WHERE id=? AND status='pending' AND defender IN(SELECT id FROM guilds WHERE leader_id=?) RETURNING id`).bind(id, playerId).first(), "Savaş isteği reddedildi.");
case "war_accept": return startGuildWar(database, playerId, id, nowMs, rules);
case "war_join": return joinGuildWar(database, playerId, id, nowMs, rules);
default: throw new Error("Geçersiz lonca işlemi.");
}
}
function guildKickoffStatements(database, playerId, id, nowMs, rules = GROUP_RULES) {
	const now = Math.floor(nowMs / 1e3), token = crypto.randomUUID();
	const gate = `EXISTS(SELECT 1 FROM guild_wars WHERE id=? AND start_token=? AND status='active')`;
	const readyApproval = (team) => `SELECT COUNT(*) FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
  JOIN guild_members m ON m.player_id=p.id WHERE ap.match_id=guild_wars.id AND ap.team=${team}
  AND m.guild_id=guild_wars.${team === 1 ? "challenger" : "defender"} AND ${baseReadyPlayer}`;
	return [
		database.prepare(`UPDATE guild_wars SET start_token=? WHERE id=? AND status='active'
   AND EXISTS(SELECT 1 FROM arena_matches a JOIN world_state s ON s.id=1 WHERE a.id=guild_wars.id
    AND a.status='waiting' AND a.starts_at_ms>? AND a.world_cycle=s.cycle AND s.reset_at=0)
   AND EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
    WHERE ap.match_id=guild_wars.id AND p.id=? AND ${baseReadyPlayer})
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=guild_wars.id)<=${rules.guildTeamSize * 2}
   AND NOT EXISTS(SELECT 1 FROM arena_match_players WHERE match_id=guild_wars.id
    GROUP BY team HAVING COUNT(*)>${rules.guildTeamSize})
   AND (${readyApproval(1)})>=${rules.guildMin} AND (${readyApproval(2)})>=${rules.guildMin}
   AND (SELECT COUNT(*) FROM players occupied WHERE occupied.last_seen>=unixepoch()-30
    AND (occupied.channel=(SELECT channel FROM arena_matches WHERE id=guild_wars.id)
     OR occupied.id IN(SELECT ap.player_id FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
      WHERE ap.match_id=guild_wars.id AND ${baseReadyPlayer})))
      <=${channelCapacitySql510("(SELECT channel FROM arena_matches WHERE id=guild_wars.id)","(SELECT MAX(1,MIN(25,channel_capacity)) FROM game_settings WHERE id=1)")}
   AND NOT EXISTS(SELECT 1 FROM guilds g WHERE g.id IN(guild_wars.challenger,guild_wars.defender)
    AND NOT EXISTS(SELECT 1 FROM arena_match_players ap JOIN players p ON p.id=ap.player_id
     WHERE ap.match_id=guild_wars.id AND p.id=g.leader_id AND ${baseReadyPlayer})) RETURNING id`).bind(token, id, nowMs, playerId, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs),
		database.prepare(`DELETE FROM arena_match_players WHERE match_id=? AND ${gate}
   AND NOT EXISTS(SELECT 1 FROM players p WHERE p.id=arena_match_players.player_id AND ${baseReadyPlayer})`).bind(id, id, token, now - 30, nowMs),
		database.prepare(`UPDATE arena_match_players SET slot=(SELECT COUNT(*) FROM arena_match_players other
   WHERE other.match_id=arena_match_players.match_id AND other.team=arena_match_players.team
    AND (other.joined_at_ms<arena_match_players.joined_at_ms OR
     (other.joined_at_ms=arena_match_players.joined_at_ms AND other.player_id<arena_match_players.player_id)))
   WHERE match_id=? AND ${gate}`).bind(id, id, token),
		database.prepare(`UPDATE arena_matches SET status='countdown',team_size=${rules.guildTeamSize},starts_at_ms=?,updated_at_ms=?
   WHERE id=? AND status='waiting' AND ${gate}`).bind(nowMs + 1e4, nowMs, id, id, token),
		database.prepare(`INSERT INTO guild_war_returns SELECT ?,p.id,p.channel FROM players p
   JOIN arena_match_players ap ON ap.player_id=p.id AND ap.match_id=? WHERE ${gate}`).bind(id, id, id, token),
		database.prepare(`DELETE FROM arena_queue WHERE player_id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id, id, token),
		database.prepare(`DELETE FROM fishing_sessions WHERE player_id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id, id, token),
		database.prepare(`UPDATE players SET area='arena',arena_match_id=?,channel=(SELECT channel FROM arena_matches WHERE id=?),
   x=(SELECT CASE team WHEN 1 THEN 450+(slot/8)*60 ELSE 1950-(slot/8)*60 END FROM arena_match_players WHERE match_id=? AND player_id=players.id),
   y=(SELECT 400+(slot%8)*100 FROM arena_match_players WHERE match_id=? AND player_id=players.id),
   hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0, attack_four_at=0, special_guard_until_ms=0,
   movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,
   realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0
   WHERE id IN(SELECT player_id FROM arena_match_players WHERE match_id=?) AND ${gate}`).bind(id, id, id, id, nowMs, id, id, token)
	];
}
 function joinGuildWar(database, playerId, id, nowMs = Date.now(), rules = GROUP_RULES) {
	const entry = crypto.randomUUID(), now = Math.floor(nowMs / 1e3);
	const inserted = `EXISTS(SELECT 1 FROM arena_match_players WHERE id=? AND match_id IN(
  SELECT id FROM arena_matches WHERE status IN ('countdown','active')))`;
	const statements = [
		database.prepare(`INSERT INTO arena_match_players(id,match_id,player_id,team,slot,joined_at_ms)
   SELECT ?,w.id,p.id,CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END,
   CASE WHEN NOT EXISTS(SELECT 1 FROM arena_match_players slot_owner
    WHERE slot_owner.match_id=w.id AND slot_owner.team=CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END AND slot_owner.slot=0) THEN 0
    ELSE (SELECT MIN(slot_owner.slot+1) FROM arena_match_players slot_owner
     WHERE slot_owner.match_id=w.id AND slot_owner.team=CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END
      AND slot_owner.slot>=0 AND slot_owner.slot+1<${rules.guildTeamSize}
      AND NOT EXISTS(SELECT 1 FROM arena_match_players occupied_slot
       WHERE occupied_slot.match_id=slot_owner.match_id AND occupied_slot.team=slot_owner.team AND occupied_slot.slot=slot_owner.slot+1)) END,?
   FROM guild_members m JOIN players p ON p.id=m.player_id JOIN guild_war_locks l ON l.guild_id=m.guild_id
   JOIN guild_wars w ON w.id=l.war_id JOIN arena_matches a ON a.id=w.id JOIN world_state s ON s.id=1
   WHERE p.id=? AND w.id=? AND m.guild_id IN(w.challenger,w.defender) AND w.status='active'
   AND a.status IN ('waiting','countdown','active')
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=w.id)<${rules.guildTeamSize * 2}
   AND NOT EXISTS(SELECT 1 FROM arena_match_players WHERE match_id=w.id
    GROUP BY team HAVING COUNT(*)>${rules.guildTeamSize})
   AND (SELECT COUNT(*) FROM arena_match_players WHERE match_id=w.id
     AND team=CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END)<${rules.guildTeamSize}
   AND (a.status='waiting' OR p.channel=a.channel OR
     (SELECT COUNT(*) FROM players occupied WHERE occupied.channel=a.channel AND occupied.last_seen>=unixepoch()-30)
       <${channelCapacitySql510("a.channel","(SELECT MAX(1,MIN(25,channel_capacity)) FROM game_settings WHERE id=1)")})
   AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?
   AND a.world_cycle=s.cycle AND s.reset_at=0 AND ${baseReadyPlayer}
   ON CONFLICT(match_id,player_id) DO NOTHING RETURNING player_id`).bind(entry, nowMs, playerId, id, nowMs, now - 30, nowMs),
		database.prepare(`INSERT INTO guild_war_returns SELECT ?,id,channel FROM players WHERE id=? AND ${inserted}`).bind(id, playerId, entry),
		database.prepare(`DELETE FROM arena_queue WHERE player_id=? AND ${inserted}`).bind(playerId, entry),
		database.prepare(`DELETE FROM fishing_sessions WHERE player_id=? AND ${inserted}`).bind(playerId, entry),
		database.prepare(`UPDATE arena_matches SET team_size=MAX(team_size,${rules.guildTeamSize}),mode='5v5' WHERE id=? AND ${inserted}`).bind(id, entry),
		database.prepare(`UPDATE players SET area='arena',arena_match_id=?,channel=(SELECT channel FROM arena_matches WHERE id=?),
   x=(SELECT CASE team WHEN 1 THEN 450+(slot/8)*60 ELSE 1950-(slot/8)*60 END FROM arena_match_players WHERE id=?),
   y=(SELECT 400+(slot%8)*100 FROM arena_match_players WHERE id=?),
   hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,attack_one_at=0,attack_two_at=0,attack_three_at=0, attack_four_at=0, special_guard_until_ms=0,
   movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,
   realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0
   WHERE id=? AND ${inserted}`).bind(id, id, entry, entry, nowMs, playerId, entry)
	];
	const results = database.batch([...statements, ...guildKickoffStatements(database, playerId, id, nowMs, rules)]);
	const started = results[statements.length].results.length > 0;
	const existing = database.prepare(`SELECT a.status FROM players p JOIN arena_match_players ap ON ap.player_id=p.id
  JOIN arena_matches a ON a.id=ap.match_id JOIN guild_wars w ON w.id=a.id JOIN guild_members m ON m.player_id=p.id
  WHERE p.id=? AND a.id=? AND w.status='active' AND m.guild_id IN(w.challenger,w.defender)
   AND a.status IN ('waiting','countdown','active')
   AND a.starts_at_ms+CASE WHEN a.status='waiting' THEN 0 ELSE 600000 END>?
   AND ((a.status='waiting' AND ${baseReadyPlayer}) OR p.arena_match_id=a.id)`).bind(playerId, id, nowMs, now - 30, nowMs).first();
	if (existing) return {
		ok: true,
		started,
		message: started ? "Her loncadan en az üç oyuncu hazır! Savaş 10 saniye sonra başlıyor." : existing.status === "waiting" ? "Katılımın onaylandı. Her loncadan en az üç hazır oyuncu ve savaş kanalında yeterli yer bekleniyor. Her takım en fazla 10 oyuncu alır." : results[0].results.length ? "Lonca savaşına katıldın." : "Zaten bu lonca savaşındasın."
	};
	throw new Error("Katılamadın. Takımında ve savaş kanalında yer olmalı; takım sınırı 10, toplam savaş sınırı 20 oyuncudur. Savaş devam etmeli ve bu iki loncadan birinin üyesi olmalısın. Canlı, çevrimiçi, çatışma ve zindan dışında tekrar dene.");
}
 function startGuildWar(database, playerId, id, nowMs, rules = GROUP_RULES) {
	const now = Math.floor(nowMs / 1e3), token = crypto.randomUUID();
	const leaderReady = baseReadyPlayer + " AND p.id=(SELECT leader_id FROM guilds WHERE id=m.guild_id)";
	if (!(database.batch([
		database.prepare(`UPDATE guild_wars SET status='active',start_token=? WHERE id=? AND status='pending' AND expires_at>?
   AND defender IN(SELECT id FROM guilds WHERE leader_id=?)
   AND NOT EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id IN(guild_wars.challenger,guild_wars.defender))
   AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND reset_at=0)
   AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.challenger AND ${baseReadyPlayer})>=${rules.guildMin}
   AND (SELECT COUNT(*) FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.defender AND ${baseReadyPlayer})>=${rules.guildMin}
   AND EXISTS(SELECT 1 FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.challenger AND ${leaderReady})
   AND EXISTS(SELECT 1 FROM guild_members m JOIN players p ON p.id=m.player_id WHERE m.guild_id=guild_wars.defender AND ${leaderReady}) RETURNING id`).bind(token, id, now, playerId, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs, now - 30, nowMs),
		database.prepare(`INSERT INTO guild_war_locks SELECT challenger,id FROM guild_wars WHERE id=? AND start_token=?
   UNION ALL SELECT defender,id FROM guild_wars WHERE id=? AND start_token=?`).bind(id, token, id, token),
		database.prepare(`INSERT INTO arena_matches(id,world_cycle,channel,mode,status,team_size,kill_target,team_a_name,team_b_name,reward_gems,starts_at_ms,created_at_ms,updated_at_ms)
   SELECT w.id,s.cycle,p.channel,'5v5','waiting',${rules.guildTeamSize},50,a.name,b.name,0,?,?,?
   FROM guild_wars w JOIN guilds a ON a.id=w.challenger JOIN guilds b ON b.id=w.defender
   JOIN players p ON p.id=? JOIN world_state s ON s.id=1 WHERE w.id=? AND w.start_token=?`).bind(nowMs + 12e4, nowMs, nowMs, playerId, id, token),
		database.prepare(`INSERT INTO arena_match_players(id,match_id,player_id,team,slot,joined_at_ms)
   SELECT ?||':'||p.id,?,p.id,CASE m.guild_id WHEN w.challenger THEN 1 ELSE 2 END,0,?
   FROM guild_members m JOIN players p ON p.id=m.player_id JOIN guild_wars w ON m.guild_id IN(w.challenger,w.defender)
   WHERE w.id=? AND w.start_token=? AND ${leaderReady}`).bind(id, id, nowMs, id, token, now - 30, nowMs)
	]))[0].results[0]) throw new Error("Her loncada başkan dahil en az üç çevrimiçi, canlı, çatışma ve zindan dışında oyuncu olmalı. Davet süresini de kontrol et.");
	return {
		ok: true,
		started: false,
		message: "Katılım onayları bekleniyor. Her loncadan başkan dahil en az üç hazır oyuncu onayladığında savaş 10 saniye sonra başlayacak. Her takım en fazla 10 oyuncu alır. Onay süresi 2 dakika."
	};
}
 function guildChanged(database,playerId,body,result,publishRealtimeGuildEvent){
const cycle = database.prepare("SELECT cycle FROM world_state WHERE id=1").first();
const onlyJoiner = body.action === "war_join" && !("started" in result && result.started);
const recipients = onlyJoiner ? { results: [] } : database.prepare(`SELECT player_id FROM guild_members WHERE guild_id IN(SELECT guild_id FROM guild_members WHERE player_id=? UNION SELECT id FROM guilds WHERE id=? UNION SELECT challenger FROM guild_wars WHERE id=? UNION SELECT defender FROM guild_wars WHERE id=?)`).bind(playerId, typeof body.target === "string" ? body.target : "", typeof body.id === "string" ? body.id : "", typeof body.id === "string" ? body.id : "").all();
const ids = [...new Set([
				playerId,
				..."notifyPlayerIds" in result ? result.notifyPlayerIds : [],
				...onlyJoiner ? [] : [body.target, ...recipients.results.map((r) => r.player_id)]
			].filter((id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(id)))];
const players = database.prepare(`SELECT id,channel,area,arena_match_id FROM players WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
return publishRealtimeGuildEvent(cycle?.cycle ?? 1, players.results, {
				type: "guild_changed",
				eventId: crypto.randomUUID(),
				serverAt: Date.now()
			});
}
function captureGuildEvent(cycle,players,event,publishRealtimePlayerEvent){
const audience = [...new Set(players.map((player) => player.id))];
if (!audience.length || audience.length > 80 || event.type !== "guild_changed") return false;
const first=players[0];return publishRealtimePlayerEvent(cycle,first.channel,first.area,audience,event,first.arena_match_id);
}
return {guildAction,guildChanged,captureGuildEvent};
}

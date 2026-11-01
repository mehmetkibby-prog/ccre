export function createIngressRules(clock){const Date={now:clock},localWindows=new Map(),rates=new Map();let nextLocalCleanupAtMs=0;
function enforceLocalActionRate(accountId, action) {
	const nowMs = Date.now();
	const category = (action === "upgrade_unique" || action === "evolve_weapon") ? "crafting485" : action === "move" ? "move" : action === "heartbeat" ? "heartbeat" : action === "attack" || action === "pvp_attack" || action === "hurt" ? "combat" : action === "collect" ? "loot" : action === "claim_rewards" ? "rewards" : action === "fishing_input" ? "fishing" : /listing|shop|fish|buy_|sell_|exchange|upgrade|epin/.test(action) ? "economy" : "other";
	const limits = {
		global: {
			intervalMs: 6e4,
			limit: 720
		},
		move: {
			intervalMs: 6e4,
			limit: 360
		},
		heartbeat: {
			intervalMs: 6e4,
			limit: 30
		},
		combat: {
			intervalMs: 6e4,
			limit: 240
		},
		loot: {
			intervalMs: 6e4,
			limit: 360
		},
		rewards: {
			intervalMs: 6e4,
			limit: 180
		},
		fishing: {
			intervalMs: 6e4,
			limit: 480
		},
		crafting485: { intervalMs: 6e4, limit: 240 },
		economy: {
			intervalMs: 6e4,
			limit: 45
		},
		other: {
			intervalMs: 6e4,
			limit: 120
		}
	};
	for (const scope of ["global", category]) {
		const limit = limits[scope];
		const key = `${accountId}:${scope}`;
		const previous = localWindows.get(key);
		const next = !previous || nowMs - previous.startedAtMs >= limit.intervalMs ? {
			startedAtMs: nowMs,
			count: 1
		} : {
			startedAtMs: previous.startedAtMs,
			count: previous.count + 1
		};
		localWindows.set(key, next);
		if (next.count > limit.limit) return Math.max(1, Math.ceil((next.startedAtMs + limit.intervalMs - nowMs) / 1e3));
	}
	if (nowMs >= nextLocalCleanupAtMs) {
		nextLocalCleanupAtMs = nowMs + 6e4;
		for (const [key, window] of localWindows) if (nowMs - window.startedAtMs > 12e4) localWindows.delete(key);
	}
	return 0;
}
function rate(id) {
	const now = Date.now(), r = rates.get(id);
	if (!r || now - r.at >= 1e3) {
		rates.set(id, {
			at: now,
			count: 1
		});
		if (rates.size > 1e4) {
			for (const [k, v] of rates) if (now - v.at > 6e4) rates.delete(k);
		}
		return false;
	}
	return ++r.count > 25;
}
return {action:enforceLocalActionRate,dungeon:rate,localWindows,rates};}

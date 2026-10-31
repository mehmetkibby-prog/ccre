#!/usr/bin/env python3
"""Read-only, anonymized snapshot of player death timers. No game changes."""
import hashlib
import json
import sqlite3
import time
from pathlib import Path


def inspect_deaths(database, now_ms):
    database = Path(database).resolve(strict=True)
    connection = sqlite3.connect(database.as_uri() + "?mode=ro", uri=True, timeout=2)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA query_only=ON")
        deadline = time.monotonic() + 3
        connection.set_progress_handler(lambda: int(time.monotonic() > deadline), 10000)
        connection.execute("BEGIN")
        required = {"id", "area", "channel", "hp", "max_hp", "hp_revision", "respawn_at_ms", "last_seen", "arena_match_id"}
        columns = {row[1] for row in connection.execute("PRAGMA table_info(players)")}
        if not required.issubset(columns):
            return {"error": "Oyuncu semasi beklenen alanlari icermiyor; hicbir degisiklik yapilmadi."}
        cutoff = now_ms // 1000 - 900
        counts = dict(connection.execute("""
            SELECT COUNT(*) AS dead_total,
              COALESCE(SUM(CASE WHEN respawn_at_ms IS NULL OR respawn_at_ms<=0 THEN 1 ELSE 0 END),0) AS dead_without_timer,
              COALESCE(SUM(CASE WHEN respawn_at_ms>0 AND respawn_at_ms<=? THEN 1 ELSE 0 END),0) AS dead_due,
              COALESCE(SUM(CASE WHEN respawn_at_ms>? THEN 1 ELSE 0 END),0) AS dead_future,
              COALESCE(SUM(CASE WHEN last_seen>=? THEN 1 ELSE 0 END),0) AS dead_seen_last_15min
            FROM players WHERE hp<=0
        """, (now_ms, now_ms, cutoff)).fetchone())
        rows = []
        for row in connection.execute("""
            SELECT id,area,channel,hp,max_hp,hp_revision,respawn_at_ms,last_seen,arena_match_id
            FROM players WHERE hp<=0 AND last_seen>=?
            ORDER BY last_seen DESC,id LIMIT 20
        """, (cutoff,)):
            timer = row["respawn_at_ms"]
            value = {key: row[key] for key in ("area", "channel", "hp", "max_hp", "hp_revision", "respawn_at_ms", "last_seen")}
            value.update(player_ref=hashlib.sha256(str(row["id"]).encode()).hexdigest()[:12],
                         due_in_seconds=None if timer is None else round((timer-now_ms)/1000, 3),
                         last_seen_age_seconds=round(now_ms/1000-row["last_seen"], 3),
                         has_arena_match=bool(row["arena_match_id"]))
            rows.append(value)
        return {"server_epoch_ms": now_ms, "recent_window_seconds": 900, "counts": counts, "recent_dead": rows}
    finally:
        connection.close()


def main():
    state = json.loads(Path("/var/lib/core511/state.json").read_text(encoding="utf-8"))
    result = inspect_deaths(state["prior"]["database"], int(time.time()*1000))
    result["installed_version"] = state.get("r64Deployment", {}).get("version", "unknown")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, KeyError, ValueError, sqlite3.Error) as error:
        raise SystemExit("Salt okunur teshis tamamlanamadi (" + type(error).__name__ + "); oyun veya veritabani degistirilmedi.")

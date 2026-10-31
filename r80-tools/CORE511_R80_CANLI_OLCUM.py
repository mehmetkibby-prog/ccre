#!/usr/bin/env python3
"""Core of Life R80/R79: kısa, salt okunur canlı ölçüm. Yalnız Python standart kitaplığı.

Veritabanını açmaz; servis/ayar/dosya değiştirmez; oyuncu/bot üretmez.
Çıktı: stdout üzerinde tek JSON; başlangıç/bitiş bilgisi stderr üzerinde.
"""

import argparse
import datetime
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass


STATE_FILE = Path("/var/lib/core511/state.json")
MAX_CONFIG_BYTES = 1024 * 1024
MAX_HEALTH_BYTES = 128 * 1024
HEALTH_TIMEOUT = 2.0
SERVICE_TIMEOUT = 1.5
CHECKPOINT_REASONS = frozenset({
    "disabled", "sqlite-version", "worker-start", "worker-error",
    "worker-message", "worker-exit", "worker-sqlite-version",
    "connection-configuration", "checkpoint-error", "checkpoint-result",
    "checkpoint-backlog", "worker-start-timeout", "checkpoint-timeout",
    "not-ready", "closed", "worker-close", "unknown",
})
CHECKPOINT_RETRY_STATES = frozenset({
    "starting", "ready", "fallback", "retry-wait", "probing",
    "retry-exhausted", "closed", "unknown",
})


class TargetUnavailable(Exception):
    """Hata ayrıntıları yapılandırma veya dosya yolu içermemelidir."""


@dataclass(frozen=True)
class Target:
    unit: str
    port: int
    version: str


@dataclass(frozen=True)
class ProcessCounters:
    pid: int
    start_ticks: int
    cpu_ticks: int
    threads: int


@dataclass
class Snapshot:
    at: float
    unit: str | None
    version: str | None
    host: tuple | None
    logical_cpus: int | None
    process: ProcessCounters | None
    main_thread: ProcessCounters | None
    io: dict | None
    health: dict
    errors: list


def strict_json(data):
    def reject_constant(_value):
        raise ValueError("nonfinite_json")
    return json.loads(data, parse_constant=reject_constant)


def read_json_file(file):
    with Path(file).open("rb") as handle:
        data = handle.read(MAX_CONFIG_BYTES + 1)
    if len(data) > MAX_CONFIG_BYTES:
        raise TargetUnavailable()
    value = strict_json(data)
    if not isinstance(value, dict):
        raise TargetUnavailable()
    return value


def load_target(state_file=STATE_FILE):
    try:
        state = read_json_file(state_file)
        prior = state["prior"]
        unit = prior["gameUnit"]
        if state.get("installed") is not True or not isinstance(unit, str):
            raise TargetUnavailable()
        if not re.fullmatch(r"coreoflife-r[0-9]{1,4}\.service", unit):
            raise TargetUnavailable()
        config_file = prior["newGameConfigFile"]
        if not isinstance(config_file, str) or not Path(config_file).is_absolute():
            raise TargetUnavailable()
        config = read_json_file(config_file)
        port = config["delivery511"]["appPort"]
        if isinstance(port, str) and re.fullmatch(r"[0-9]{1,5}", port):
            port = int(port)
        if type(port) is not int or not 1 <= port <= 65535:
            raise TargetUnavailable()
        version = state.get("r64Deployment", {}).get("version")
        if not isinstance(version, str) or not re.fullmatch(r"R[0-9]{1,4}_GAMEPLAY", version):
            version = "unknown"
        return Target(unit=unit, port=port, version=version)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, RecursionError):
        raise TargetUnavailable() from None


def integer(value, maximum=10**15):
    return type(value) is int and 0 <= value <= maximum


def number(value, maximum=10**15):
    return type(value) in (int, float) and 0 <= value <= maximum and math.isfinite(value)


def safe_fields(source, *, booleans=(), counts=(), numbers=(), enums=None):
    """Yalnız tanımlı alanları alır; bilinmeyen null ölçümünü sıfıra çevirmez."""
    out = {}
    for key in booleans:
        if type(source.get(key)) is bool:
            out[key] = source[key]
    for keys, valid in ((counts, integer), (numbers, number)):
        for key in keys:
            if key not in source:
                continue
            value = source[key]
            if value is None:
                out[key] = None
            elif valid(value):
                out[key] = round(value, 3) if valid is number else value
    for key, allowed in (enums or {}).items():
        value = source.get(key)
        if isinstance(value, str) and value in allowed:
            out[key] = value
    return out


def safe_runtime_r80(source):
    """R80 public ölçümleri: ham metin, hata, kimlik veya job içeriği alınmaz."""
    out = safe_fields(source, booleans=("available",), counts=("measuredAtMs",), enums={
        "protocol": {"runtime-diagnostics-r80-v1"},
        "scope": {"server-process-and-durable-write-wait-not-player-ping"},
    })
    main = source.get("main")
    if isinstance(main, dict):
        item = safe_fields(main, counts=("sampleSeconds", "sampledAtMs"),
                           numbers=("eventLoopDelayMs",),
                           enums={"status": {"unavailable", "live", "stale"}})
        if "eventLoopBusyPercent" in main:
            value = main["eventLoopBusyPercent"]
            if value is None or number(value, maximum=100):
                item["eventLoopBusyPercent"] = round(value, 3) if value is not None else None
        cpu = main.get("cpu")
        if isinstance(cpu, dict):
            item["cpu"] = safe_fields(cpu,
                counts=("windowSeconds", "sampleCount"),
                numbers=("resolutionPercentPoints", "meanPercent", "maxPercent"),
                enums={"scope": {"process-all-threads-one-core-is-100-percent"}})
        out["main"] = item
    blocks = {
        "writerLane": {
            "booleans": ("externalBusy",),
            "counts": ("queuedWrites", "queuedExternal", "nativeWrites", "completedExternal"),
            "numbers": ("externalAgeMs", "oldestQueuedAgeMs", "maxExternalMs"),
            "enums": {"protocol": {"single-writer-lane-v1"}},
        },
        "walSync": {
            "booleans": ("ready", "fallback", "running"),
            "counts": ("queuedForNextFlush", "pumpedCallsTotal", "syncs", "errors", "reopened"),
            "numbers": ("meanMs", "maxMs", "totalMs"),
            "enums": {"scope": {"async-WAL-flush-service-wall-time-including-libuv-and-callback-scheduling-excluding-preflush-queue"}},
        },
        "mainCommits": {
            "counts": ("slowCommits",),
            "numbers": ("lastCommitMs", "maxCommitMs", "lastSlowAtMs"),
            "enums": {"scope": {"main-connection-SQLite-COMMIT-wall-time"}},
        },
        "rewardWorker": {
            "booleans": ("pending",),
            "counts": ("jobs", "fallbacks", "replays", "rollbacks", "restarts"),
            "numbers": ("maxWorkerMs", "maxPreflightMs", "maxReadyWaitMs"),
            "enums": {"scope": {"completed-worker-jobs-not-current-job-latency"}},
        },
    }
    for key, rules in blocks.items():
        value = source.get(key)
        if isinstance(value, dict):
            out[key] = safe_fields(value, **rules)
        elif key in source and value is None:
            out[key] = None
    return out


def safe_health(payload):
    """Serbest metin, kimlik, yol, oyuncu kaydı ve bilinmeyen alanları atar."""
    if not isinstance(payload, dict):
        raise ValueError("health_not_object")
    out = {}
    for key in ("ok", "durable"):
        if type(payload.get(key)) is bool:
            out[key] = payload[key]
    kernel = payload.get("kernel511")
    if isinstance(kernel, dict):
        out["kernel"] = {
            key: kernel[key] for key in ("ready", "worldReady", "readerReady", "realmReady")
            if type(kernel.get(key)) is bool
        }
    checkpoint = payload.get("checkpointR79")
    if isinstance(checkpoint, dict):
        item = {}
        for key in ("ready", "running"):
            if type(checkpoint.get(key)) is bool:
                item[key] = checkpoint[key]
        for key in ("pendingPages", "logPages", "checkpointedPages", "completed", "busy"):
            if integer(checkpoint.get(key)):
                item[key] = checkpoint[key]
        for key in ("durationMs", "maxDurationMs"):
            if number(checkpoint.get(key)):
                item[key] = round(checkpoint[key], 3)
        reason = checkpoint.get("fallback")
        if reason is None:
            item["fallback"] = None
        elif isinstance(reason, str):
            item["fallback"] = reason if reason in CHECKPOINT_REASONS else "other"
        for key, pattern in (("nodeVersion", r"v[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"),
                             ("sqliteVersion", r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}")):
            value = checkpoint.get(key)
            if isinstance(value, str) and re.fullmatch(pattern, value):
                item[key] = value
        retry = checkpoint.get("retryR80")
        if isinstance(retry, dict):
            item["retryR80"] = safe_fields(retry, booleans=("retryAllowed",),
                counts=("attempts", "consecutiveAttempts", "maxAttempts", "nextRetryAtMs",
                        "recoveries", "lastRecoveredAtMs"),
                enums={"state": CHECKPOINT_RETRY_STATES})
            reason = retry.get("lastFallback")
            if reason is None:
                item["retryR80"]["lastFallback"] = None
            elif isinstance(reason, str):
                item["retryR80"]["lastFallback"] = reason if reason in CHECKPOINT_REASONS else "other"
        elif "retryR80" in checkpoint and retry is None:
            item["retryR80"] = None
        probe = checkpoint.get("recoveryProbe")
        if isinstance(probe, dict):
            item["recoveryProbe"] = safe_fields(probe, booleans=("active",),
                counts=("attempts", "healthyPasses", "requiredHealthyPasses", "nextProbeAtMs"))
        elif "recoveryProbe" in checkpoint and probe is None:
            item["recoveryProbe"] = None
        out["checkpoint"] = item
    runtime = payload.get("runtimeDiagnosticsR80")
    if isinstance(runtime, dict):
        out["runtimeDiagnosticsR80"] = safe_runtime_r80(runtime)
    source = payload.get("channelProcesses")
    rows = source.get("channels") if isinstance(source, dict) else None
    channels, seen, malformed = [], set(), False
    if isinstance(rows, list) and len(rows) <= 32:
        for row in rows:
            if not isinstance(row, dict):
                malformed = True
                continue
            channel = row.get("channel")
            if type(channel) is not int or channel not in (1, 2, 3, 4) or channel in seen:
                malformed = True
                continue
            seen.add(channel)
            item = {"channel": channel}
            if type(row.get("ready")) is bool:
                item["ready"] = row["ready"]
            for key in ("online", "capacity"):
                if integer(row.get(key), maximum=1000):
                    item[key] = row[key]
            channels.append(item)
    else:
        malformed = True
    out["channels"] = sorted(channels, key=lambda row: row["channel"])
    complete = not malformed and seen == {1, 2, 3, 4} and all("online" in row for row in channels)
    out["channels_complete"] = complete
    out["online_total"] = sum(row["online"] for row in channels) if complete else None
    return out


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_health(target, *, opener=None, clock=time.monotonic):
    started = clock()
    result = {"http_status": None, "loopback_http_ms": None}
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        "http://127.0.0.1:" + str(target.port) + "/api/vds-health",
        headers={"Accept": "application/json"}, method="GET",
    )
    try:
        try:
            response = opener.open(request, timeout=HEALTH_TIMEOUT)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status = getattr(response, "status", getattr(response, "code", None))
            if type(status) is int and 100 <= status <= 599:
                result["http_status"] = status
            data = response.read(MAX_HEALTH_BYTES + 1)
        if len(data) > MAX_HEALTH_BYTES:
            result["error"] = "health_response_too_large"
        else:
            try:
                result.update(safe_health(strict_json(data)))
            except (ValueError, TypeError, UnicodeError, RecursionError):
                result["error"] = "health_invalid_json"
    except (TimeoutError, urllib.error.URLError, OSError):
        result["error"] = "health_unreachable_or_timeout"
    finally:
        result["loopback_http_ms"] = round(max(0.0, clock() - started) * 1000, 3)
    return result


def parse_host_stat(text):
    values = None
    cpus = 0
    for line in text.splitlines():
        parts = line.split()
        if parts and parts[0] == "cpu":
            if len(parts) < 9:
                raise ValueError("host_cpu_fields")
            # guest/guest_nice are already included in user/nice: do not add twice.
            values = tuple(int(value) for value in parts[1:9])
            if any(value < 0 for value in values):
                raise ValueError("host_cpu_counter")
        elif parts and re.fullmatch(r"cpu[0-9]+", parts[0]):
            cpus += 1
    if values is None or cpus < 1:
        raise ValueError("host_cpu_missing")
    return values, cpus


def parse_process_stat(text):
    end = text.rfind(")")
    start = text.find("(")
    if start < 1 or end <= start:
        raise ValueError("process_stat_shape")
    pid = int(text[:start].strip())
    fields = text[end + 1:].split()  # field 3 (state) is index zero.
    if len(fields) < 20:
        raise ValueError("process_stat_fields")
    values = [int(fields[index]) for index in (11, 12, 17, 19)]
    if pid < 1 or any(value < 0 for value in values):
        raise ValueError("process_stat_counter")
    return ProcessCounters(pid, values[3], values[0] + values[1], values[2])


def parse_process_io(text):
    out = {}
    for line in text.splitlines():
        key, separator, value = line.partition(":")
        if separator and key in ("read_bytes", "write_bytes"):
            count = int(value.strip())
            if count < 0:
                raise ValueError("process_io_counter")
            out[key] = count
    if set(out) != {"read_bytes", "write_bytes"}:
        raise ValueError("process_io_missing")
    return out


def service_pid(unit):
    try:
        result = subprocess.run(
            ["systemctl", "show", unit, "--property=MainPID", "--value"],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=SERVICE_TIMEOUT,
            check=False,
        )
        raw = result.stdout.strip()
        if result.returncode == 0 and re.fullmatch(rb"[0-9]{1,10}", raw):
            pid = int(raw)
            return pid if pid > 1 else None
    except (OSError, subprocess.TimeoutExpired):
        pass
    return None


def capture_snapshot(*, target_loader=load_target, pid_reader=service_pid,
                     proc_root=Path("/proc"), health_reader=fetch_health,
                     clock=time.monotonic):
    errors = []
    target = None
    try:
        target = target_loader()
    except TargetUnavailable:
        errors.append("target_unavailable")
    host = logical_cpus = process = main_thread = io = None
    pid = pid_reader(target.unit) if target else None
    try:
        host, logical_cpus = parse_host_stat((proc_root / "stat").read_text())
    except (OSError, ValueError, UnicodeError):
        errors.append("host_cpu_unavailable")
    if pid:
        folder = proc_root / str(pid)
        try:
            process = parse_process_stat((folder / "stat").read_text())
            main_thread = parse_process_stat((folder / "task" / str(pid) / "stat").read_text())
            if process.pid != pid or main_thread.pid != pid or process.start_ticks != main_thread.start_ticks:
                raise ValueError("process_changed_during_sample")
            try:
                io = parse_process_io((folder / "io").read_text())
            except (OSError, ValueError, UnicodeError):
                errors.append("process_io_unavailable")
            confirmed = parse_process_stat((folder / "stat").read_text())
            if (confirmed.pid, confirmed.start_ticks) != (process.pid, process.start_ticks):
                raise ValueError("process_changed_during_sample")
        except (OSError, ValueError, UnicodeError):
            process = main_thread = io = None
            errors.append("process_counters_unavailable_or_changed")
    elif target:
        errors.append("game_service_not_running_or_unavailable")
    at = clock()
    health = health_reader(target) if target else {"error": "target_unavailable"}
    return Snapshot(at, target.unit if target else None, target.version if target else None,
                    host, logical_cpus, process, main_thread, io, health, errors)


def host_delta(before, after):
    if before is None or after is None or len(before) != 8 or len(after) != 8:
        return None
    delta = [new - old for old, new in zip(before, after)]
    total = sum(delta)
    if total <= 0 or any(value < 0 for value in delta):
        return None
    active = sum(delta[index] for index in (0, 1, 2, 5, 6))
    return {
        "busy_percent_excluding_iowait_steal": round(active / total * 100, 3),
        "iowait_percent": round(delta[4] / total * 100, 3),
        "steal_percent": round(delta[7] / total * 100, 3),
        "idle_percent": round(delta[3] / total * 100, 3),
    }


def cpu_delta(before, after, elapsed, ticks_per_second):
    if not before or not after or elapsed <= 0 or not ticks_per_second:
        return None
    if (before.pid, before.start_ticks) != (after.pid, after.start_ticks):
        return None
    ticks = after.cpu_ticks - before.cpu_ticks
    return round(ticks / ticks_per_second / elapsed * 100, 3) if ticks >= 0 else None


def derive_sample(before, after, *, started, ticks_per_second):
    out = {
        "at_s": round(max(0.0, after.at - started), 3),
        "installed_version": after.version,
        "logical_cpus": after.logical_cpus,
        "health": after.health,
        "errors": list(after.errors),
        "interval_s": None,
        "host_cpu": None,
        "node_cpu_percent_one_core": None,
        "main_thread_cpu_percent_one_core": None,
        "node_threads": after.process.threads if after.process else None,
        "node_io_delta_bytes": None,
        "process_identity_changed": False,
    }
    if before is None:
        return out
    elapsed = after.at - before.at
    out["interval_s"] = round(elapsed, 3)
    if elapsed <= 0:
        out["errors"].append("nonpositive_sample_interval")
        return out
    if before.logical_cpus == after.logical_cpus:
        out["host_cpu"] = host_delta(before.host, after.host)
    if before.unit != after.unit:
        out["process_identity_changed"] = True
        return out
    if not before.process or not after.process:
        return out
    same = (before.process.pid, before.process.start_ticks) == (after.process.pid, after.process.start_ticks)
    out["process_identity_changed"] = not same
    if not same:
        return out
    out["node_cpu_percent_one_core"] = cpu_delta(before.process, after.process, elapsed, ticks_per_second)
    out["main_thread_cpu_percent_one_core"] = cpu_delta(before.main_thread, after.main_thread, elapsed, ticks_per_second)
    if before.io is not None and after.io is not None:
        delta = {key: after.io[key] - before.io[key] for key in ("read_bytes", "write_bytes")}
        if all(value >= 0 for value in delta.values()):
            out["node_io_delta_bytes"] = delta
        else:
            out["errors"].append("process_io_counter_reset")
    return out


def summarize(samples):
    online = [row["health"].get("online_total") for row in samples]
    online = [value for value in online if type(value) is int]
    fallbacks = sorted({row["health"].get("checkpoint", {}).get("fallback") for row in samples
                        if row["health"].get("checkpoint", {}).get("fallback") is not None})
    result = {
        "samples": len(samples),
        "online_min": min(online) if online else None,
        "online_max": max(online) if online else None,
        "checkpoint_fallbacks": fallbacks,
        "process_identity_changes": sum(row["process_identity_changed"] for row in samples),
        "health_request_failed_samples": sum("error" in row["health"] or
                                             (type(row["health"].get("http_status")) is int and row["health"]["http_status"] >= 400)
                                             for row in samples),
        "kernel_not_ready_samples": sum(row["health"].get("kernel", {}).get("ready") is False for row in samples),
    }
    fields = {
        "host_busy": lambda row: (row.get("host_cpu") or {}).get("busy_percent_excluding_iowait_steal"),
        "host_iowait": lambda row: (row.get("host_cpu") or {}).get("iowait_percent"),
        "host_steal": lambda row: (row.get("host_cpu") or {}).get("steal_percent"),
        "node_cpu_one_core": lambda row: row.get("node_cpu_percent_one_core"),
        "main_thread_cpu_one_core": lambda row: row.get("main_thread_cpu_percent_one_core"),
    }
    for name, getter in fields.items():
        pairs = [(getter(row), row.get("interval_s")) for row in samples]
        pairs = [(value, interval) for value, interval in pairs
                 if type(value) in (int, float) and type(interval) in (int, float) and interval > 0]
        result[name + "_mean_percent"] = round(sum(value * interval for value, interval in pairs) /
                                                 sum(interval for _, interval in pairs), 3) if pairs else None
        result[name + "_max_interval_percent"] = max(value for value, _ in pairs) if pairs else None
    latencies = [row["health"].get("loopback_http_ms") for row in samples]
    latencies = [value for value in latencies if number(value)]
    result["loopback_http_max_ms"] = max(latencies) if latencies else None
    return result


def collect(duration, interval, *, sampler=capture_snapshot, clock=time.monotonic,
            sleep=time.sleep, ticks_per_second=None):
    if ticks_per_second is None:
        try:
            ticks_per_second = int(os.sysconf("SC_CLK_TCK"))
        except (OSError, ValueError):
            ticks_per_second = None
    started = clock()
    started_utc = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    samples, previous = [], None
    deadline, next_at = started + duration, started
    stopped = "completed"
    try:
        while True:
            wait = next_at - clock()
            if wait > 0:
                sleep(wait)
            current = sampler()
            samples.append(derive_sample(previous, current, started=started, ticks_per_second=ticks_per_second))
            previous = current
            if next_at >= deadline:
                break
            next_at = min(deadline, next_at + interval)
            # A slow response must not cause a burst of catch-up requests.
            now = clock()
            while next_at < now and next_at < deadline:
                next_at = min(deadline, next_at + interval)
            if now >= deadline:
                break
    except KeyboardInterrupt:
        stopped = "interrupted"
    return {
        "schema_version": 1,
        "collector": "CORE511_R80_CANLI_OLCUM",
        "read_only": True,
        "started_utc": started_utc,
        "requested_duration_s": duration,
        "actual_duration_s": round(max(0.0, clock() - started), 3),
        "requested_interval_s": interval,
        "stop_reason": stopped,
        "definitions": {
            "host_cpu": "Tüm görünen mantıksal CPU'ların toplamı yüzde 100; iowait ve steal ayrı.",
            "node_cpu": "Node işleminin bütün thread'leri; bir CPU yüzde 100, toplam değer 100'ü aşabilir.",
            "main_thread_cpu": "Yalnız ana thread'in gerçek CPU zamanı; paneldeki olay döngüsü doluluk yüzdesi değildir.",
            "loopback_http": "Aynı VDS içinden sağlık isteğinin süresi; oyuncu pingi veya internet RTT'si değildir.",
            "io": "Node işleminin /proc IO sayaç farkı; disk gecikmesi veya SQL işlem süresi değildir.",
            "runtime_r80": "Varsa public health içindeki R80 ölçümleri alınır; R79'da bu blok yoktur. Null değer bilinmeyen ölçümdür, sıfır değildir.",
            "event_loop_utilization_r80": "R80 main.eventLoopBusyPercent: sunucunun son yaklaşık 2 saniyelik olay döngüsü doluluğu; gerçek CPU veya oyuncu pingi değildir. status stale/unavailable ise canlı değer yoktur.",
            "event_loop_delay_r80": "R80 main.eventLoopDelayMs: son yaklaşık 2 saniyelik örnekteki maksimum olay döngüsü gecikme fazlası; ortalama gecikme değildir.",
            "runtime_cpu_r80": "R80 main.cpu: bütün Node thread'lerinin en fazla 300 saniyelik örnek ortalaması/maksimumu; bir CPU yüzde 100, çözünürlük 10 yüzde puanı. /proc aralık ölçümünden ayrıdır.",
            "wal_sync_r80": "R80 walSync: flush hizmet süresi libuv/callback beklemesini içerir, önceki flush arkasındaki kuyruğu içermez. queuedForNextFlush sonraki kuyruğu, pumpedCallsTotal kümülatif çağrı sayısını gösterir.",
        },
        "not_collected": ["database_contents", "player_identifiers", "credentials", "raw_logs",
                          "authenticated_diagnostics", "player_network_ping"],
        "summary": summarize(samples),
        "samples": samples,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Core of Life için kısa ve salt okunur VDS ölçümü.")
    parser.add_argument("--duration", type=int, default=30, help="Süre: 10–120 saniye; varsayılan 30.")
    parser.add_argument("--interval", type=float, default=5, help="Örnek aralığı: 2–10 saniye; varsayılan 5.")
    args = parser.parse_args(argv)
    if not 10 <= args.duration <= 120:
        parser.error("--duration 10 ile 120 arasında olmalı.")
    if not math.isfinite(args.interval) or not 2 <= args.interval <= 10:
        parser.error("--interval 2 ile 10 arasında olmalı.")
    print(f"Salt okunur ölçüm başladı: {args.duration} saniye, {args.interval:g} saniyede bir örnek.", file=sys.stderr, flush=True)
    result = collect(args.duration, args.interval)
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":"), allow_nan=False), flush=True)
    print("Ölçüm tamamlandı. JSON çıktısını paylaşabilirsiniz.", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()

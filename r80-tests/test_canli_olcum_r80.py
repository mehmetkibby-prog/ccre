import contextlib
import dataclasses
import http.server
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "r80-tools" / "CORE511_R80_CANLI_OLCUM.py"
spec = importlib.util.spec_from_file_location("collector", SCRIPT)
c = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = c
spec.loader.exec_module(c)


def stat_line(pid=42, start=1000, user=100, system=20, threads=4):
    fields = ["0"] * 50
    fields[0] = "R"
    fields[11], fields[12], fields[17], fields[19] = map(str, (user, system, threads, start))
    return str(pid) + " (node ) odd (command)) " + " ".join(fields)


def valid_health():
    return {
        "ok": True, "durable": True,
        "kernel511": {"ready": True, "worldReady": True, "readerReady": True, "realmReady": True},
        "checkpointR79": {"ready": True, "running": False, "pendingPages": 0, "fallback": None,
                          "nodeVersion": "v22.23.4", "sqliteVersion": "3.53.4"},
        "channelProcesses": {"channels": [
            {"channel": i, "ready": True, "online": online, "capacity": 25}
            for i, online in enumerate((6, 4, 0, 0), 1)
        ]},
    }


def snapshot(at=0, pid=42, start=1000, cpu=100, main_cpu=50, read=100, write=200):
    return c.Snapshot(at, "coreoflife-r1.service", "R79_GAMEPLAY", (100, 0, 100, 500, 20, 10, 10, 5), 4,
                      c.ProcessCounters(pid, start, cpu, 8), c.ProcessCounters(pid, start, main_cpu, 1),
                      {"read_bytes": read, "write_bytes": write}, c.safe_health(valid_health()), [])


class FakeResponse:
    def __init__(self, data, status=200):
        self.data, self.status = data, status
    def read(self, size):
        return self.data[:size]
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass


class FakeOpener:
    def __init__(self, data):
        self.data = data
        self.request = None
    def open(self, request, timeout):
        self.request = request
        self.timeout = timeout
        return FakeResponse(self.data)


class CollectorTests(unittest.TestCase):
    def test_host_cpu_guest_not_counted_twice_and_steal_separate(self):
        before, cpus = c.parse_host_stat("cpu 1000 50 300 2000 100 30 20 10 200 20\ncpu0 0\ncpu1 0\ncpu2 0\ncpu3 0\n")
        after, _ = c.parse_host_stat("cpu 1020 52 310 2040 110 33 25 20 1199 1019\ncpu0 0\ncpu1 0\ncpu2 0\ncpu3 0\n")
        self.assertEqual(cpus, 4)
        self.assertEqual(c.host_delta(before, after), {
            "busy_percent_excluding_iowait_steal": 40.0,
            "iowait_percent": 10.0, "steal_percent": 10.0, "idle_percent": 40.0,
        })

    def test_stat_parser_handles_parentheses_in_command(self):
        value = c.parse_process_stat(stat_line(user=250, system=50, threads=9))
        self.assertEqual(value, c.ProcessCounters(42, 1000, 300, 9))

    def test_process_cpu_uses_one_core_and_real_elapsed(self):
        before = snapshot()
        after = snapshot(at=5, cpu=1100, main_cpu=250, read=1124, write=4296)
        out = c.derive_sample(before, after, started=0, ticks_per_second=100)
        self.assertEqual(out["node_cpu_percent_one_core"], 200.0)
        self.assertEqual(out["main_thread_cpu_percent_one_core"], 40.0)
        self.assertEqual(out["node_io_delta_bytes"], {"read_bytes": 1024, "write_bytes": 4096})

    def test_pid_reuse_fences_cpu_and_io_even_when_pid_same(self):
        out = c.derive_sample(snapshot(), snapshot(at=5, start=9000, cpu=10000, read=9999), started=0, ticks_per_second=100)
        self.assertTrue(out["process_identity_changed"])
        self.assertIsNone(out["node_cpu_percent_one_core"])
        self.assertIsNone(out["main_thread_cpu_percent_one_core"])
        self.assertIsNone(out["node_io_delta_bytes"])

    def test_io_reset_does_not_create_negative_throughput(self):
        out = c.derive_sample(snapshot(read=1000), snapshot(at=5, read=0), started=0, ticks_per_second=100)
        self.assertIsNone(out["node_io_delta_bytes"])
        self.assertIn("process_io_counter_reset", out["errors"])

    def test_health_privacy_whitelist_and_unknown_reason(self):
        secret = "SENSITIVE_PLAYER_TOKEN_AND_PATH"
        payload = valid_health()
        payload["realm"] = {"dbIdentity": secret, "players": [secret]}
        payload["credentials"] = secret
        payload["kernel511"]["error"] = secret
        payload["checkpointR79"].update({"fallback": secret, "path": secret, "nodeVersion": "v22.23.4-" + secret})
        for row in payload["channelProcesses"]["channels"]:
            row["playerIds"] = [secret]
        result = c.safe_health(payload)
        self.assertNotIn(secret, json.dumps(result))
        self.assertEqual(result["online_total"], 10)
        self.assertEqual(result["checkpoint"]["fallback"], "other")
        self.assertNotIn("nodeVersion", result["checkpoint"])

    def test_invalid_or_duplicate_channels_do_not_invent_total(self):
        payload = valid_health()
        payload["channelProcesses"]["channels"].append({"channel": 1, "online": 99})
        result = c.safe_health(payload)
        self.assertFalse(result["channels_complete"])
        self.assertIsNone(result["online_total"])
        payload = valid_health()
        payload["channelProcesses"]["channels"][0]["online"] = True
        self.assertIsNone(c.safe_health(payload)["online_total"])

    def test_bad_json_and_nonfinite_values_are_safe(self):
        for data in (b"not json PRIVATE_SECRET", b'{"ok": NaN}', b'["PRIVATE_SECRET"]', b"[" * 2000 + b"]" * 2000):
            result = c.fetch_health(c.Target("coreoflife-r1.service", 1234, "R79_GAMEPLAY"), opener=FakeOpener(data))
            self.assertEqual(result["error"], "health_invalid_json")
            self.assertNotIn("PRIVATE_SECRET", json.dumps(result))

    def test_health_response_size_is_bounded(self):
        result = c.fetch_health(c.Target("coreoflife-r1.service", 1234, "R79_GAMEPLAY"), opener=FakeOpener(b"x" * (c.MAX_HEALTH_BYTES + 1)))
        self.assertEqual(result["error"], "health_response_too_large")

    def test_target_only_retains_service_port_version(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder)
            config = path / "config.json"
            config.write_text(json.dumps({"database": "/SECRET/database.sqlite", "environment": {"PASSWORD": "SECRET"}, "delivery511": {"appPort": 3100}}))
            state = path / "state.json"
            state.write_text(json.dumps({"installed": True, "prior": {"gameUnit": "coreoflife-r1.service", "newGameConfigFile": str(config)}, "r64Deployment": {"version": "R79_GAMEPLAY"}}))
            target = c.load_target(state)
            self.assertEqual(dataclasses.asdict(target), {"unit": "coreoflife-r1.service", "port": 3100, "version": "R79_GAMEPLAY"})
            config.write_text('{"PASSWORD": "SECRET", "delivery511": {"appPort":"3100/path"}}')
            with self.assertRaises(c.TargetUnavailable) as caught:
                c.load_target(state)
            self.assertEqual(str(caught.exception), "")

    def test_default_schedule_has_seven_samples_without_burst(self):
        now = [0.0]
        def clock(): return now[0]
        def sleep(delay): now[0] += delay
        def sample():
            value = snapshot(at=now[0], cpu=int(100 + now[0] * 100), main_cpu=int(50 + now[0] * 40))
            now[0] += 0.02
            return value
        report = c.collect(30, 5, sampler=sample, clock=clock, sleep=sleep, ticks_per_second=100)
        self.assertEqual([row["at_s"] for row in report["samples"]], [0, 5, 10, 15, 20, 25, 30])
        self.assertEqual(report["summary"]["main_thread_cpu_one_core_mean_percent"], 40.0)
        self.assertEqual(report["summary"]["online_min"], 10)

    def test_real_loopback_http_uses_no_auth_and_does_not_follow_redirect(self):
        requests = []
        class Handler(http.server.BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def do_GET(self):
                requests.append((self.path, dict(self.headers)))
                if len(requests) == 1:
                    self.send_response(302)
                    self.send_header("Location", "/must-not-follow")
                    self.end_headers()
                    self.wfile.write(b"PRIVATE_SERVER_ERROR")
                else:
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(json.dumps(valid_health()).encode())
        server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            target = c.Target("coreoflife-r1.service", server.server_port, "R79_GAMEPLAY")
            first = c.fetch_health(target)
            self.assertEqual(first["http_status"], 302)
            self.assertEqual(len(requests), 1)
            self.assertNotIn("PRIVATE_SERVER_ERROR", json.dumps(first))
            second = c.fetch_health(target)
            self.assertEqual(second["online_total"], 10)
            self.assertTrue(all(path == "/api/vds-health" for path, _ in requests))
            self.assertTrue(all("Authorization" not in headers and "Cookie" not in headers for _, headers in requests))
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=2)

    def test_cli_rejects_unbounded_or_nonfinite_arguments(self):
        for args in (["--duration", "121"], ["--duration", "9"], ["--interval", "nan"], ["--interval", "1"]):
            with contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as caught:
                    c.main(args)
            self.assertEqual(caught.exception.code, 2)


def r80_health():
    payload = valid_health()
    payload["checkpointR79"].update({
        "retryR80": {"state": "retry-wait", "attempts": 2, "consecutiveAttempts": 2,
                     "maxAttempts": 5, "nextRetryAtMs": 42000, "recoveries": 1,
                     "lastFallback": "checkpoint-backlog", "lastRecoveredAtMs": 10000,
                     "retryAllowed": True},
        "recoveryProbe": {"active": True, "attempts": 3, "healthyPasses": 1,
                          "requiredHealthyPasses": 2, "nextProbeAtMs": 44000},
    })
    payload["runtimeDiagnosticsR80"] = {
        "protocol": "runtime-diagnostics-r80-v1", "available": True, "measuredAtMs": 12000,
        "scope": "server-process-and-durable-write-wait-not-player-ping",
        "main": {"status": "live", "sampleSeconds": 2, "sampledAtMs": 10000,
                 "eventLoopBusyPercent": 40, "eventLoopDelayMs": 8.5,
                 "cpu": {"scope": "process-all-threads-one-core-is-100-percent",
                         "windowSeconds": 300, "resolutionPercentPoints": 10,
                         "sampleCount": 150, "meanPercent": 20, "maxPercent": 140}},
        "writerLane": {"protocol": "single-writer-lane-v1", "externalBusy": True,
                       "externalAgeMs": 32, "queuedWrites": 257, "queuedExternal": None,
                       "oldestQueuedAgeMs": 12, "nativeWrites": 0, "completedExternal": 3,
                       "maxExternalMs": 54},
        "walSync": {"scope": "async-WAL-flush-service-wall-time-including-libuv-and-callback-scheduling-excluding-preflush-queue",
                    "ready": True, "fallback": False, "running": True,
                    "queuedForNextFlush": 0, "pumpedCallsTotal": 4, "syncs": 2,
                    "meanMs": 15, "maxMs": 25, "totalMs": 30, "errors": 0, "reopened": 1},
        "mainCommits": {"scope": "main-connection-SQLite-COMMIT-wall-time", "slowCommits": 1,
                        "lastCommitMs": 3.5, "maxCommitMs": 45, "lastSlowAtMs": 9000},
        "rewardWorker": {"scope": "completed-worker-jobs-not-current-job-latency",
                         "pending": True, "jobs": 5, "fallbacks": 1, "replays": 2,
                         "rollbacks": 0, "restarts": 0, "maxWorkerMs": 10,
                         "maxPreflightMs": 2, "maxReadyWaitMs": 4},
    }
    return payload


class R80WhitelistTests(unittest.TestCase):
    def test_latest_runtime_fields_and_retry_probe_survive_without_renaming_or_zero_filling(self):
        payload = r80_health()
        result = c.safe_health(payload)
        self.assertEqual(result["runtimeDiagnosticsR80"], payload["runtimeDiagnosticsR80"])
        self.assertEqual(result["checkpoint"]["retryR80"], payload["checkpointR79"]["retryR80"])
        self.assertEqual(result["checkpoint"]["recoveryProbe"], payload["checkpointR79"]["recoveryProbe"])
        self.assertIsNone(result["runtimeDiagnosticsR80"]["writerLane"]["queuedExternal"])
        self.assertEqual(result["runtimeDiagnosticsR80"]["main"]["cpu"]["maxPercent"], 140)
        self.assertEqual(result["online_total"], 10)

    def test_runtime_nested_strings_invalid_numbers_and_unknown_fields_cannot_leak(self):
        payload, secret = r80_health(), "PRIVATE_PLAYER_CREDENTIAL_PATH_SQL"
        runtime = payload["runtimeDiagnosticsR80"]
        for block in [runtime, runtime["main"], runtime["main"]["cpu"], runtime["writerLane"],
                      runtime["walSync"], runtime["mainCommits"], runtime["rewardWorker"],
                      payload["checkpointR79"]["retryR80"], payload["checkpointR79"]["recoveryProbe"]]:
            block["raw"] = {"secret": secret}
            block["path"] = secret
            if "scope" in block:
                block["scope"] = secret
        runtime.update({"protocol": secret, "available": "true", "measuredAtMs": -1})
        runtime["main"].update({"status": secret, "eventLoopBusyPercent": 101,
                                "eventLoopDelayMs": float("nan"), "sampledAtMs": True})
        runtime["main"]["cpu"].update({"meanPercent": True, "maxPercent": float("inf"), "sampleCount": 1.5})
        runtime["writerLane"].update({"externalBusy": 1, "externalAgeMs": secret, "queuedWrites": -1})
        runtime["walSync"].update({"fallback": secret, "pumpedCallsTotal": False, "meanMs": -1})
        runtime["rewardWorker"].update({"pending": secret, "jobs": 1.5})
        runtime["mainCommits"]["maxCommitMs"] = 10**4000
        payload["checkpointR79"]["retryR80"].update({"state": secret, "lastFallback": secret, "attempts": True})
        payload["checkpointR79"]["recoveryProbe"].update({"active": 1, "healthyPasses": -1})
        result = c.safe_health(payload)
        self.assertNotIn(secret, json.dumps(result, allow_nan=False))
        clean = result["runtimeDiagnosticsR80"]
        for key in ("protocol", "scope", "available", "measuredAtMs", "raw", "path"):
            self.assertNotIn(key, clean)
        for key in ("status", "eventLoopBusyPercent", "eventLoopDelayMs", "sampledAtMs"):
            self.assertNotIn(key, clean["main"])
        self.assertNotIn("sampleCount", clean["main"]["cpu"])
        self.assertNotIn("jobs", clean["rewardWorker"])
        self.assertNotIn("maxCommitMs", clean["mainCommits"])
        self.assertNotIn("fallback", clean["walSync"])
        self.assertEqual(result["checkpoint"]["retryR80"]["lastFallback"], "other")
        self.assertNotIn("attempts", result["checkpoint"]["retryR80"])
        self.assertNotIn("healthyPasses", result["checkpoint"]["recoveryProbe"])

    def test_r79_remains_compatible_and_missing_or_stale_runtime_does_not_invent_elu(self):
        self.assertNotIn("runtimeDiagnosticsR80", c.safe_health(valid_health()))
        self.assertNotIn("retryR80", c.safe_health(valid_health())["checkpoint"])
        payload = r80_health()
        payload["runtimeDiagnosticsR80"]["main"].update({"status": "stale", "eventLoopBusyPercent": None})
        payload["runtimeDiagnosticsR80"]["writerLane"] = None
        payload["checkpointR79"]["retryR80"] = None
        result = c.safe_health(payload)
        self.assertIsNone(result["runtimeDiagnosticsR80"]["main"]["eventLoopBusyPercent"])
        self.assertIsNone(result["runtimeDiagnosticsR80"]["writerLane"])
        self.assertIsNone(result["checkpoint"]["retryR80"])
        payload["runtimeDiagnosticsR80"] = {"protocol": "runtime-diagnostics-r80-v1", "available": False}
        self.assertEqual(c.safe_health(payload)["runtimeDiagnosticsR80"], payload["runtimeDiagnosticsR80"])
        report = c.collect(0, 5, sampler=lambda: snapshot(), clock=lambda: 0, sleep=lambda _: None, ticks_per_second=100)
        self.assertEqual(report["collector"], "CORE511_R80_CANLI_OLCUM")
        self.assertNotIn("panel_event_loop_utilization", report["not_collected"])
        self.assertIn("R79", report["definitions"]["runtime_r80"])
        self.assertIn("gerçek CPU", report["definitions"]["event_loop_utilization_r80"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

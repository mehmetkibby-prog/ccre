#!/usr/bin/env python3
"""Read bounded native mixed-load evidence; no runtime or production changes."""
import hashlib
import json
import math
import sys
from pathlib import Path


def quantiles(values):
    values = sorted(values)
    return {"count": len(values), **{
        name: values[max(0, math.ceil(len(values) * fraction) - 1)] if values else None
        for name, fraction in [("p50", .5), ("p95", .95), ("p99", .99), ("max", 1)]
    }}


def summarize(path):
    data = path.read_bytes()
    r = json.loads(data)
    actors = r.get("clientTransport", {}).get("actors", [])
    queue = r.get("queueObservation", {})
    loops = r.get("measurement", {}).get("measurement", {}).get("eventLoops", [])
    samples = r.get("samples", [])
    queries = next((x.get("readWork", {}).get("queries", {}) for x in loops if x["target"] == "reader"), {})
    main_before = r.get("diagnosticsBefore", {}).get("main", {}).get("work", {})
    main_after = r.get("diagnosticsAfter", {}).get("main", {}).get("work", {})
    return {
        "evidence": str(path), "sha256": hashlib.sha256(data).hexdigest(),
        "players": r["players"], "seconds": r["seconds"], "passed": r["passed"],
        "passScope": r.get("passScope", "Transport/economy/core identity checks; latency is a separate performance gate."),
        "coreSHA256": r["coreSHA256"], "sourceUnchanged": r.get("sourceUnchanged"),
        "deliverySHA256": r.get("deliverySHA256"), "deliveryUnchanged": r.get("deliveryUnchanged"),
        "errors": r.get("errors"), "faults": r.get("faults"), "error": r.get("error"),
        "ackMs": r.get("commandLatencyMs"), "byAction": r.get("byAction"),
        "ackSemantics": "Wire input-to-result time. Attack 202 is provisional; native writer await and final durable kill/potion/material checks are reported separately. Movement ACK gaps are not rendered stalls.",
        "resultStatusCounts": {str(status): sum(s["status"] == status for s in samples) for status in sorted({s["status"] for s in samples})},
        "normalAfter10sAckMs": quantiles([s["ms"] for s in samples if (s.get("offset") or 0) >= 10000]),
        "maxMovementAckGapMs": max((a["maxMoveAckGapMs"] for a in actors), default=0),
        "maxPredictionCapEpisodeMs": max((a["maxPredictionCapEpisodeMs"] for a in actors), default=0),
        "predictionCapActors": sum(a.get("predictionCapEpisodes", 0) > 0 for a in actors),
        "predictionCapEpisodes": sum(a.get("predictionCapEpisodes", 0) for a in actors),
        "predictionLimitedInputMs": sum(a.get("predictionLimitedInputMs", 0) for a in actors),
        "predictionLimitedFrames": sum(a.get("predictionLimitedFrames", 0) for a in actors),
        "ackOver300ms": sum(s["ms"] > 300 for s in samples),
        "ackOver600ms": sum(s["ms"] > 600 for s in samples),
        "totalPredictionCapMs": sum(a["totalPredictionCapMs"] for a in actors),
        "cancelledInputCount": sum(len(a["cancelledInputs"]) for a in actors),
        "unacknowledged": r.get("unacknowledged"),
        "motionPreviews": sum(a["motionFrames"] for a in actors),
        "serverMotion": [{"channel": x["target"], **x.get("metrics", {}).get("motion", {})}
                         for x in r.get("diagnosticsAfter", {}).get("targets", []) if x["target"].startswith("channel-")],
        "previewHzPerActor": quantiles([a["motionFrames"] / r["seconds"] for a in actors]),
        "maxGeneratorFrameGapMs": max((a["maxGeneratorFrameGapMs"] for a in actors), default=0),
        "recordedBasicCadenceRetries": sum(len(a.get("cadenceRetries", [])) for a in actors),
        "automaticPotionPolls": sum(a.get("automaticPotionPolls", 0) for a in actors),
        "automaticPotionLedger": {
            "commands": len(r.get("automaticPotionLedger", [])),
            "mutatingCommands": sum(x["chargeDebit"] > 0 for x in r.get("automaticPotionLedger", [])),
            "positiveNoOpCommands": sum(x["chargeDebit"] == 0 and not x.get("error") for x in r.get("automaticPotionLedger", [])),
            "nativeChargeDebit": sum(x["chargeDebit"] for x in r.get("automaticPotionLedger", [])),
            "meaning": "Automatic HP charge is independent of manual potion stock; healing is derived from native charge debit. Full before/after rows and ACKs remain in raw evidence."
        },
        "maxWriterDepth": queue.get("maxWriterDepth"),
        "maxOldestWriterAgeMs": queue.get("maxOldestWriterAgeMs"),
        "maxMainRssBytes": queue.get("maxMainRssBytes"),
        "maxPendingCommandAgeMs": queue.get("maxPendingCommandAgeMs"),
        "commandsHeldOver600Ms": len({(x["actor"], x["sequence"]) for x in queue.get("commandHoldsOver600Ms", [])}),
        "maxClientQueue": max((x.get("maxClientQueue", 0) for x in queue.get("clientSamples", queue.get("samples", []))), default=0),
        "maxClientPending": max((x.get("maxClientPending", 0) for x in queue.get("clientSamples", queue.get("samples", []))), default=0),
        "separateGenerator": r.get("separateGenerator", False),
        "generatorResources": r.get("generatorResources"),
        "processLoops": [{k: x.get(k) for k in ["target", "maxPauseMs", "elu", "processCpuMs", "maxRssBytes", "segments"]} for x in loops],
        "resources": r.get("measurement", {}).get("resources"),
        "nativeMainWorkDelta": {name: {"count": value["count"] - main_before.get(name, {}).get("count", 0), "overallMaxMs": value["maxMs"]}
                                for name, value in main_after.items()},
        "readerQueries": queries,
        "economicActorsChecked": len(r.get("economics", [])),
        "nativeKillClaims": sum(x.get("allOwnTargetKillClaims", 0) for x in r.get("economics", [])),
        "limitations": r.get("limitations"),
    }


if __name__ == "__main__":
    print(json.dumps([summarize(Path(arg)) for arg in sys.argv[1:]], indent=2))

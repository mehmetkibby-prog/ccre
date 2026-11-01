import { LocalDatabase, withCombatDatabasePriority, deferDatabaseBackgroundTask } from "./database.mjs";
import { createHash } from "node:crypto";
import {nativePerformance} from "./performance-metrics.mjs";
import {runtimePerformance} from "./runtime-performance.mjs";
import {cleanupWorldHistory} from './world-cleanup.mjs';
import {realtimeCrypto, postLoopback, realtimeBatcher} from './realtime-transport.mjs';
const nativeSha256 = bytes => createHash("sha256").update(bytes).digest("base64url");
const databaseKey = Symbol.for("coreoflife.localDatabase");

// Build-time alias for cloudflare:workers, used only by the Node target.
// The default Cloudflare build and its bindings are unchanged.
export const env = new Proxy({}, {
  get(_target, key) {
    if (key === "DB") return globalThis[databaseKey] ??= new LocalDatabase(process.env.CORE_DATABASE_PATH, {groupWrites: process.env.CORE_GROUP_WRITES !== "0", asyncDurable: process.env.CORE_GROUP_WRITES !== "0" && process.env.CORE_ASYNC_WAL_SYNC !== "0"});
    if (key === "CORE_COMBAT_TASK") return withCombatDatabasePriority;
    if (key === "CORE_DEFER_TASK") return deferDatabaseBackgroundTask;
    if (key === "CORE_WORLD_CLEANUP") return nowMs => cleanupWorldHistory(env.DB,nowMs);
    if (key === "CORE_ATTACK_REQUESTS") return globalThis[Symbol.for("coreoflife.combatRequests")];
    if (key === "CORE_ATTACK_BRIDGE") return globalThis[Symbol.for("coreoflife.combatBridge")];
    if (key === "CORE_MOVEMENT") return globalThis[Symbol.for("coreoflife.movementBridge")];
    if (key === "CORE_RUNTIME") return "vds";
    if (key === "CORE_SHA256") return nativeSha256;
    // Same signed protocol, cheaper CPU on the HTTP thread (realtime-transport.mjs).
    if (key === "CORE_REALTIME_CRYPTO") return process.env.CORE_NATIVE_REALTIME === "0" ? undefined : realtimeCrypto;
    if (key === "CORE_REALTIME_POST") return process.env.CORE_NATIVE_REALTIME === "0" ? undefined : postLoopback;
    if (key === "CORE_REALTIME_BATCH") return process.env.CORE_NATIVE_REALTIME === "0" || process.env.CORE_REALTIME_BATCH === "0" ? undefined : realtimeBatcher;
    if (key === "CORE_PERFORMANCE_SNAPSHOT") return () => nativePerformance().snapshot();
    if (key === "CORE_RUNTIME_SNAPSHOT") return () => runtimePerformance().snapshot();
    if (key === "GAME_ROOMS" || key === "ASSETS" || key === "IMAGES") return undefined;
    return typeof key === "string" ? process.env[key] : undefined;
  },
});

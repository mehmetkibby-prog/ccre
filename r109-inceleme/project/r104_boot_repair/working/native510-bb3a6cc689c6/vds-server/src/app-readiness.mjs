import { setTimeout as delay } from "node:timers/promises";

// Startup includes verified database backups and one-time upgrades. Keep this
// deadline shorter than the installer's readiness window, without accepting a
// running process as proof that those upgrades have finished.
export const APP_STARTUP_TIMEOUT_MS = 120_000;

export const isApplicationHealthReady = (value, startupId) => typeof startupId === "string" && startupId.length > 0
  && value?.ok === true && value.runtime === "vds-node-sqlite" && value.startupId === startupId;

const hasExited = child => child.exitCode !== null || child.signalCode !== null;

export async function waitForApplicationReady(child, probe, {
  timeoutMs = APP_STARTUP_TIMEOUT_MS,
  pollIntervalMs = 200,
  probeTimeoutMs = 2000,
} = {}) {
  const deadline = performance.now() + timeoutMs;
  const controller = new AbortController();
  let rejectFailure;
  const failed = new Promise((_, reject) => { rejectFailure = reject; });
  const onExit = (code, signal) => rejectFailure(new Error(`Application exited before readiness (${signal || code})`));
  const onError = error => rejectFailure(new Error("Application failed to start", { cause: error }));
  const timeout = setTimeout(() => rejectFailure(new Error(`Application readiness timed out after ${timeoutMs} ms`)), timeoutMs);
  child.once("exit", onExit);
  child.once("error", onError);
  try {
    if (hasExited(child)) throw new Error("Application exited before readiness");
    for (;;) {
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw new Error(`Application readiness timed out after ${timeoutMs} ms`);
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(probeTimeoutMs, remaining))))]);
      const ready = await Promise.race([probe(signal), failed]);
      if (hasExited(child)) throw new Error("Application exited before readiness");
      if (performance.now() >= deadline) throw new Error(`Application readiness timed out after ${timeoutMs} ms`);
      if (ready) return;
      await Promise.race([delay(Math.min(pollIntervalMs, Math.max(1, deadline - performance.now())), undefined, { signal: controller.signal }), failed]);
    }
  } finally {
    clearTimeout(timeout);
    controller.abort();
    child.off("exit", onExit);
    child.off("error", onError);
  }
}

export async function stopApplicationChild(child, { graceMs = 2000, killGraceMs = 2000 } = {}) {
  if (!child.pid || hasExited(child)) return;
  let exited = false;
  let onExit;
  const stopped = new Promise(resolve => { onExit = () => { exited = true; resolve(); }; });
  child.once("exit", onExit);
  const controller = new AbortController();
  const wait = ms => Promise.race([stopped, delay(ms, undefined, { signal: controller.signal })]);
  try {
    child.kill("SIGTERM");
    await wait(graceMs);
    if (!exited) {
      child.kill("SIGKILL");
      await wait(killGraceMs);
    }
    if (!exited) throw new Error("Application process did not stop after startup failure");
  } finally {
    controller.abort();
    child.off("exit", onExit);
  }
}

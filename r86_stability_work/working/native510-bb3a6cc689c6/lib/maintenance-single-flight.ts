// Global recoverable work is shared by concurrent player heartbeats. Player
// health, arena settlement and direct reward claims stay outside this gate.
export function createMaintenanceSingleFlight(intervalMs = 1000, clock = Date.now) {
  const states = new WeakMap<object, { running: Promise<void> | null; nextAt: number }>();
  return function run(owner: object, task: () => Promise<void>): Promise<void> {
    let state = states.get(owner);
    if (!state) { state = { running: null, nextAt: 0 }; states.set(owner, state); }
    if (state.running) return state.running;
    if (clock() < state.nextAt) return Promise.resolve();
    const entry = state;
    entry.nextAt = clock() + intervalMs;
    entry.running = Promise.resolve().then(task).catch(error => {
      entry.nextAt = 0;
      throw error;
    }).finally(() => { entry.running = null; });
    return entry.running;
  };
}

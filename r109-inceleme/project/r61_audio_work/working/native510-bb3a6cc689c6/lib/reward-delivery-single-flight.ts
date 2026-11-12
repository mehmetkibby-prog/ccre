// Only in-flight work is shared. Durable SQL receipts remain the authority
// across processes/restarts; failures clear the slot so recovery can retry.
export function createRewardDeliverySingleFlight() {
  const owners = new WeakMap<object, Map<string, Promise<unknown>>>();
  return function run<T>(owner: object, death: string, task: () => Promise<T>): Promise<T> {
    let pending = owners.get(owner);
    if (!pending) { pending = new Map(); owners.set(owner, pending); }
    const previous = pending.get(death);
    if (previous) return previous as Promise<T>;
    const entries = pending;
    const result = Promise.resolve().then(task).finally(() => {
      if (entries.get(death) === result) entries.delete(death);
    });
    entries.set(death, result);
    return result;
  };
}

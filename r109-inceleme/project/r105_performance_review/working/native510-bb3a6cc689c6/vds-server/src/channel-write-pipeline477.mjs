// A bounded FIFO cohort uses ordinary authenticated write RPCs. It does not
// combine their protocol frames or guess that different actors touch disjoint
// rows. Only one cohort may own the resident memory snapshot at a time.
export const CHANNEL_WRITE_COHORT477 = 4;
export function channelWriterPipelineEnabled477(value = process.env.CORE_CHANNEL_WRITER_PIPELINE ?? '1') {
  if (value !== '0' && value !== '1') throw new Error('CORE_CHANNEL_WRITER_PIPELINE must be 0 or 1');
  return value === '1';
}

export class ChannelWritePipeline477 {
  constructor(database, perform) {
    this.database = database;
    this.perform = perform;
    this.queue = [];
    this.active = false;
    this.scheduled = false;
  }
  enqueue(job) {
    const pending = new Promise((resolve, reject) => {job.resolve = resolve;job.reject = reject;});
    job.priorTail = this.database.writeTail;
    this.queue.push(job);
    // Keep the established public durability/drain barrier: every accepted
    // job belongs to writeTail even though cohort dispatch no longer awaits
    // the preceding individual RPC's durable ACK.
    this.database.writeTail = job.priorTail.then(() => pending).catch(error => {this.database.failure = error;});
    job.completionTail = this.database.writeTail;
    // Attach a rejection observer immediately, before its FIFO predecessor
    // settles. Callers still receive the original rejecting promise.
    void pending.catch(() => {});
    this.schedule();
    return pending;
  }
  schedule() {
    if (this.active || this.scheduled || !this.queue.length) return;
    this.scheduled = true;
    // Preserve public writeTail observers, including cleanup lease retirement.
    // An observer that captured this predecessor before the new job must run
    // before we build that job's owner claims. Await only the FIRST member's
    // predecessor; later members' tails include their own cohort and would
    // deadlock it. A resolved predecessor adds one microtask, never a sleep.
    void this.queue[0].priorTail.then(() => {
      this.scheduled = false;return this.drain();
    }, error => {
      this.database.failure = error;this.scheduled = false;return this.drain();
    });
  }
  async drain() {
    if (this.active || !this.queue.length) return;
    const first = this.queue.shift(), cohort = [first];
    if (!first.barrier) while (cohort.length < CHANNEL_WRITE_COHORT477 && this.queue.length && !this.queue[0].barrier &&
      this.queue[0].priorTail === cohort.at(-1).completionTail) cohort.push(this.queue.shift());
    this.active = true;
    try {
      // A subsequent cohort can be scheduled from its predecessor's finally
      // context. Its aggregate preparation/reconciliation belongs to its own
      // first job, while each member's request work restores that member's ALS.
      const results = await first.run(() => this.perform(cohort));
      for (let i = 0; i < cohort.length; i++) cohort[i].resolve(results[i]);
    } catch (error) {
      // Unexpected SQL, lease fencing and unknown transport outcomes retain
      // the existing fail-closed semantics. A durable success earlier in this
      // cohort is recovered from its receipt; it is never blindly retried.
      this.database.failure = error;
      for (const job of cohort) job.reject(error);
    } finally {
      this.active = false;
      if (this.database.failure) {
        for (const job of this.queue.splice(0)) {
          this.database.writeMetrics.queued--;
          job.reject(this.database.failure);
        }
      }
      this.schedule();
    }
  }
}

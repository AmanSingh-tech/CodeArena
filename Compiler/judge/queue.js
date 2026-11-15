// Bounded in-process job queue.
//
// At most `concurrency` jobs run at once; up to `maxQueued` more wait in FIFO
// order. Anything beyond that is rejected immediately so a burst of
// submissions degrades into fast 503s instead of exhausting the host.

export class QueueFullError extends Error {
  constructor() {
    super("Judge queue is full, try again shortly");
    this.code = "QUEUE_FULL";
  }
}

export class JobQueue {
  constructor({ concurrency, maxQueued }) {
    this.concurrency = Math.max(1, concurrency);
    this.maxQueued = Math.max(0, maxQueued);
    this.running = 0;
    this.waiting = [];
    this.completed = 0;
    this.rejected = 0;
  }

  run(job) {
    return new Promise((resolve, reject) => {
      const entry = { job, resolve, reject };
      if (this.running < this.concurrency) {
        this.#start(entry);
      } else if (this.waiting.length < this.maxQueued) {
        this.waiting.push(entry);
      } else {
        this.rejected++;
        reject(new QueueFullError());
      }
    });
  }

  #start({ job, resolve, reject }) {
    this.running++;
    Promise.resolve()
      .then(job)
      .then(resolve, reject)
      .finally(() => {
        this.running--;
        this.completed++;
        const next = this.waiting.shift();
        if (next) this.#start(next);
      });
  }

  stats() {
    return {
      concurrency: this.concurrency,
      running: this.running,
      queued: this.waiting.length,
      maxQueued: this.maxQueued,
      completed: this.completed,
      rejected: this.rejected,
    };
  }
}

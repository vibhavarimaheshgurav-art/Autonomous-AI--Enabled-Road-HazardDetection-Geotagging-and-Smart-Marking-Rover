/**
 * config/queue.js
 * Lightweight single-worker async job queue (no external deps needed).
 * Processes one AI job at a time — adequate for a student rover that
 * fires ~1 report every few seconds.
 */

class SimpleQueue {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    this._running    = 0;
    this._queue      = [];
  }

  /**
   * Add a function to the queue.
   * @param {() => Promise<any>} fn  Async job function
   * @returns {Promise<any>}         Resolves when the job completes
   */
  add(fn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      this._tick();
    });
  }

  _tick() {
    if (this._running >= this.concurrency || this._queue.length === 0) return;
    this._running++;
    const { fn, resolve, reject } = this._queue.shift();
    Promise.resolve()
      .then(() => fn())
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this._running--;
        this._tick();
      });
  }

  get size()    { return this._queue.length; }
  get pending() { return this._running; }
}

const queue = new SimpleQueue(1);

/**
 * Enqueue an AI processing job.
 * Returns immediately — the job runs in the background.
 * @param {() => Promise<void>} fn
 */
function enqueue(fn) {
  queue.add(fn).catch(err =>
    console.error('[Queue] Job failed:', err.message)
  );
}

module.exports = { enqueue, queue };

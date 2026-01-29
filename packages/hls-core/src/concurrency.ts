/**
 * Concurrency control utilities
 * Manages parallel execution with limits
 */

/**
 * Semaphore for controlling concurrent operations
 */
export class Semaphore {
  private current = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  /**
   * Acquire a permit
   * Waits if max concurrent operations are already running
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.current < this.max) {
        this.current++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * Release a permit
   * Allows the next waiting operation to proceed
   */
  release(): void {
    if (this.current > 0) {
      this.current--;
    }
    if (this.queue.length > 0 && this.current < this.max) {
      const next = this.queue.shift();
      if (next) {
        this.current++;
        next();
      }
    }
  }

  /**
   * Execute a function with concurrency control
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}


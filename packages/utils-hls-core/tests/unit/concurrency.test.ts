/**
 * Unit tests for Semaphore concurrency control
 */

import { describe, it, expect, vi } from 'vitest';
import { Semaphore } from '../../src/concurrency.js';

describe('Semaphore', () => {
  describe('acquire and release', () => {
    it('should allow immediate acquisition when under limit', async () => {
      const semaphore = new Semaphore(2);
      await semaphore.acquire();
      await semaphore.acquire();
      // Both should acquire immediately
      expect(semaphore['current']).toBe(2);
    });

    it('should queue when at limit', async () => {
      const semaphore = new Semaphore(1);
      const acquire1 = semaphore.acquire();
      const acquire2 = semaphore.acquire();

      // First should resolve immediately
      await acquire1;
      expect(semaphore['current']).toBe(1);

      // Second should be queued
      expect(semaphore['queue'].length).toBe(1);

      // Release should allow next to proceed
      semaphore.release();
      await acquire2;
      expect(semaphore['current']).toBe(1);
    });

    it('should process queue in order', async () => {
      const semaphore = new Semaphore(1);
      const order: number[] = [];

      const task1 = semaphore.acquire().then(() => {
        order.push(1);
        setTimeout(() => semaphore.release(), 10);
      });

      const task2 = semaphore.acquire().then(() => {
        order.push(2);
        setTimeout(() => semaphore.release(), 10);
      });

      const task3 = semaphore.acquire().then(() => {
        order.push(3);
        semaphore.release();
      });

      await Promise.all([task1, task2, task3]);
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('execute', () => {
    it('should execute function with concurrency control', async () => {
      const semaphore = new Semaphore(2);
      const results: number[] = [];

      const tasks = [
        semaphore.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(1);
          return 1;
        }),
        semaphore.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(2);
          return 2;
        }),
        semaphore.execute(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          results.push(3);
          return 3;
        }),
      ];

      const values = await Promise.all(tasks);
      expect(values).toEqual([1, 2, 3]);
      expect(results.length).toBe(3);
    });

    it('should release permit even if function throws', async () => {
      const semaphore = new Semaphore(1);
      let released = false;

      const releaseSpy = vi.spyOn(semaphore, 'release');

      try {
        await semaphore.execute(async () => {
          throw new Error('Test error');
        });
      } catch {
        // Expected
      }

      expect(releaseSpy).toHaveBeenCalled();
      expect(semaphore['current']).toBe(0);
    });

    it('should limit concurrent executions', async () => {
      const semaphore = new Semaphore(2);
      const concurrent: number[] = [];
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 5 }, (_, i) =>
        semaphore.execute(async () => {
          concurrent.push(i);
          maxConcurrent = Math.max(maxConcurrent, concurrent.length);
          await new Promise((resolve) => setTimeout(resolve, 10));
          concurrent.pop();
          return i;
        }),
      );

      await Promise.all(tasks);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero max concurrency', async () => {
      const semaphore = new Semaphore(0);
      const acquire = semaphore.acquire();

      // Should be queued immediately
      expect(semaphore['queue'].length).toBe(1);
      expect(semaphore['current']).toBe(0);

      // Release should not allow it to proceed when max is 0
      semaphore.release();
      expect(semaphore['current']).toBe(0);
      expect(semaphore['queue'].length).toBe(1); // Still queued

      // Acquire should never resolve with max=0
      // This test verifies the semaphore correctly prevents execution when max is 0
      await Promise.race([
        acquire,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 100)),
      ]);
      expect(semaphore['current']).toBe(0);
    });

    it('should handle multiple releases', () => {
      const semaphore = new Semaphore(2);
      semaphore.acquire();
      semaphore.acquire();
      expect(semaphore['current']).toBe(2);

      semaphore.release();
      expect(semaphore['current']).toBe(1);

      semaphore.release();
      expect(semaphore['current']).toBe(0);

      // Should not go negative
      semaphore.release();
      expect(semaphore['current']).toBe(0);
    });
  });
});

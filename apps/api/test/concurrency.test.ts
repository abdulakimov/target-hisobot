import { describe, it, expect } from 'vitest';
import { mapWithConcurrency } from '../src/modules/common/async/concurrency';

describe('mapWithConcurrency', () => {
  it('preserves input order in results', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 2);
    expect(result).toEqual([2, 4, 6, 8]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 12 }, (_, i) => i);
    await mapWithConcurrency(items, 3, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n;
    });
    expect(maxActive).toBe(3);
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 5, async (x) => x)).toEqual([]);
  });
});

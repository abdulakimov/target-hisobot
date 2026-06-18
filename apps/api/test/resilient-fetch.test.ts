import { describe, it, expect, vi } from 'vitest';
import { resilientFetch } from '../src/modules/common/http/resilient-fetch';

const noSleep = async (): Promise<void> => {};
const ok = (): Response => new Response('{}', { status: 200 });
const fail = (status: number, headers: Record<string, string> = {}): Response =>
  new Response('err', { status, headers });

describe('resilientFetch', () => {
  it('returns immediately on 2xx without retrying', async () => {
    const fetchImpl = vi.fn(async () => ok()) as unknown as typeof fetch;
    const res = await resilientFetch('http://x', { fetchImpl, sleep: noSleep });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries 5xx then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail(503))
      .mockResolvedValueOnce(ok()) as unknown as typeof fetch;
    const res = await resilientFetch('http://x', { fetchImpl, sleep: noSleep, retries: 2 });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after retries and returns the last 5xx', async () => {
    const fetchImpl = vi.fn(async () => fail(500)) as unknown as typeof fetch;
    const res = await resilientFetch('http://x', { fetchImpl, sleep: noSleep, retries: 2 });
    expect(res.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry 4xx', async () => {
    const fetchImpl = vi.fn(async () => fail(404)) as unknown as typeof fetch;
    const res = await resilientFetch('http://x', { fetchImpl, sleep: noSleep, retries: 2 });
    expect(res.status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries on a network error then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(ok()) as unknown as typeof fetch;
    const res = await resilientFetch('http://x', { fetchImpl, sleep: noSleep, retries: 2 });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after exhausting retries', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('down');
    }) as unknown as typeof fetch;
    await expect(
      resilientFetch('http://x', { fetchImpl, sleep: noSleep, retries: 1 }),
    ).rejects.toThrow('down');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('honors a Retry-After header for the backoff delay', async () => {
    const delays: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fail(429, { 'retry-after': '2' }))
      .mockResolvedValueOnce(ok()) as unknown as typeof fetch;
    await resilientFetch('http://x', {
      fetchImpl,
      retries: 2,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    expect(delays).toEqual([2000]);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const fetchImpl = ((_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      })) as unknown as typeof fetch;
    await expect(
      resilientFetch('http://x', { fetchImpl, timeoutMs: 10, retries: 0, sleep: noSleep }),
    ).rejects.toThrow();
  });
});

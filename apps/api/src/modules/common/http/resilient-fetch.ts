export interface ResilientFetchOptions {
  /** Per-attempt timeout in ms (AbortController). */
  timeoutMs?: number;
  /** Number of retries after the first attempt (total attempts = retries + 1). */
  retries?: number;
  /** Backoff base in ms; grows exponentially with jitter. */
  baseDelayMs?: number;
  /** Upper bound on any single backoff delay. */
  maxDelayMs?: number;
  /** Decide whether a response status should trigger a retry. Default: 429 or >= 500. */
  retryOnStatus?: (status: number) => boolean;
  /** Injectable for tests (defaults to global fetch). */
  fetchImpl?: typeof fetch;
  /** Injectable for tests (defaults to setTimeout). */
  sleep?: (ms: number) => Promise<void>;
  /** Called before each retry (logging / metrics). */
  onRetry?: (info: { attempt: number; status?: number; error?: unknown; delayMs: number }) => void;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const defaultRetryOnStatus = (status: number): boolean => status === 429 || status >= 500;

/**
 * fetch() with a per-attempt timeout and exponential backoff retry (honoring Retry-After).
 * Only safe for idempotent requests — every Meta Graph call here is a GET. Throws the last
 * error (or returns the last response) once retries are exhausted.
 */
export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 15_000,
    retries = 2,
    baseDelayMs = 500,
    maxDelayMs = 8_000,
    retryOnStatus = defaultRetryOnStatus,
    fetchImpl = fetch,
    sleep = defaultSleep,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: controller.signal });
      clearTimeout(timer);
      if (attempt < retries && retryOnStatus(res.status)) {
        const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs, res);
        try {
          await res.body?.cancel();
        } catch {
          // discarding this response — ignore cancel errors
        }
        onRetry?.({ attempt, status: res.status, delayMs });
        await sleep(delayMs);
        continue;
      }
      return res;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt >= retries) break;
      const delayMs = backoffDelay(attempt, baseDelayMs, maxDelayMs);
      onRetry?.({ attempt, error, delayMs });
      await sleep(delayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function backoffDelay(attempt: number, base: number, max: number, res?: Response): number {
  // Honor a Retry-After header (delta-seconds) when the server provides one.
  const retryAfter = res?.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds * 1000, max);
  }
  const exponential = Math.min(max, base * 2 ** attempt);
  const jitter = Math.random() * base;
  return Math.min(max, exponential + jitter);
}

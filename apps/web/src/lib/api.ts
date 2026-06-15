/**
 * Minimal API client. Same-origin in prod (Caddy), proxied to :3000 in dev (vite).
 * Sends cookies (opaque session) on every request.
 */
const BASE_URL = '';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

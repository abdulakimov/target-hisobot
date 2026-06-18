/**
 * Subscription access state, derived purely from an expiry timestamp (manual-activation paywall).
 * `accessExpiresAt` is the single source of truth for "can this user use the product?".
 * The superadmin bypass is applied separately on the server (env-based), not here.
 */

export type AccessStatus = 'none' | 'active' | 'expired';

function toTime(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 'none' = never granted (null) · 'active' = not yet expired · 'expired' = past the expiry. */
export function deriveAccessStatus(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): AccessStatus {
  const t = toTime(expiresAt);
  if (t === null) return 'none';
  return t > now.getTime() ? 'active' : 'expired';
}

/** True only while access is unexpired (the exact expiry instant counts as expired). */
export function isAccessActive(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  return deriveAccessStatus(expiresAt, now) === 'active';
}

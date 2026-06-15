import { describe, expect, it } from 'vitest';
import { parseSnapshot, toReportRunResponse } from '../src/modules/report-runs/report-run.mapper';

function makeRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run1',
    reportId: 'rep1',
    userId: 'u1',
    status: 'success',
    scheduledFor: new Date('2026-06-15T04:00:00Z'),
    ranAt: new Date('2026-06-15T04:00:01Z'),
    windowStart: null,
    windowEnd: null,
    metricsSnapshot: { test: true, currency: 'UZS', values: { ad_spend: 1250000 } },
    errorCode: null,
    errorMessage: null,
    telegramMessageId: 999n,
    createdAt: new Date('2026-06-15T04:00:01Z'),
    report: { name: null, adAccount: { name: 'Acc X' }, telegramGroup: { title: 'Group Y' } },
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('parseSnapshot', () => {
  it('accepts object snapshots', () => {
    expect(parseSnapshot({ test: true })).toEqual({ test: true });
  });
  it('rejects arrays, primitives and null', () => {
    expect(parseSnapshot([1, 2])).toBeNull();
    expect(parseSnapshot('x')).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
  });
});

describe('toReportRunResponse', () => {
  it('maps fields, snapshot spend, isTest and bigint message id', () => {
    const r = toReportRunResponse(makeRun());
    expect(r.reportLabel).toBe('Acc X'); // name null → account name
    expect(r.telegramGroupTitle).toBe('Group Y');
    expect(r.spend).toBe(1250000);
    expect(r.currency).toBe('UZS');
    expect(r.isTest).toBe(true);
    expect(r.telegramMessageId).toBe('999');
    expect(r.status).toBe('success');
  });
  it('prefers report.name as the label when present', () => {
    const r = toReportRunResponse(
      makeRun({ report: { name: 'Custom', adAccount: { name: 'Acc' }, telegramGroup: { title: 'G' } } }),
    );
    expect(r.reportLabel).toBe('Custom');
  });
  it('handles a missing snapshot', () => {
    const r = toReportRunResponse(makeRun({ metricsSnapshot: null }));
    expect(r.spend).toBeNull();
    expect(r.currency).toBeNull();
    expect(r.isTest).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { escapeHtml, renderReportMessage } from './report-message';

describe('renderReportMessage', () => {
  it('renders the full §8 template with all metrics', () => {
    const msg = renderReportMessage({
      accountName: 'Mijoz: Ortiqov Shop',
      windowPreset: 'yesterday',
      dateRange: '12-iyun 2026',
      sentAt: '13-iyun 09:00',
      currency: 'UZS',
      metrics: ['ad_spend', 'cost_per_lead', 'impressions', 'reach', 'lead_count', 'unique_ctr'],
      values: {
        ad_spend: 1250000,
        cost_per_lead: 36764,
        impressions: 84210,
        reach: 61540,
        lead_count: 34,
        unique_ctr: 2.4,
      },
    });
    expect(msg).toContain('📊 Hisobot — Mijoz: Ortiqov Shop');
    expect(msg).toContain('🗓 Kecha · 12-iyun 2026');
    expect(msg).toContain("💰 Sarf: 1 250 000 so'm");
    expect(msg).toContain('🎯 Lidlar: 34');
    expect(msg).toContain("📉 CPL: 36 764 so'm");
    expect(msg).toContain("👁 Ko'rsatildi: 84 210");
    expect(msg).toContain('📣 Qamrov: 61 540');
    expect(msg).toContain('🔗 Unique CTR: 2.4%');
    expect(msg).toContain('⏱ 13-iyun 09:00');
  });

  it('keeps the §8 line order: spend, leads, CPL, impressions, reach, CTR', () => {
    const msg = renderReportMessage({
      accountName: 'Acc',
      windowPreset: 'today',
      dateRange: '15-iyun 2026',
      sentAt: '15-iyun 18:00',
      currency: 'UZS',
      metrics: ['ad_spend', 'cost_per_lead', 'impressions', 'reach', 'lead_count', 'unique_ctr'],
      values: { ad_spend: 1, cost_per_lead: 2, impressions: 3, reach: 4, lead_count: 5, unique_ctr: 6 },
    });
    const positions = ['Sarf', 'Lidlar', 'CPL', "Ko'rsatildi", 'Qamrov', 'Unique CTR'].map((l) =>
      msg.indexOf(l),
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('hides enabled-but-null lead metrics, renders the rest', () => {
    const msg = renderReportMessage({
      accountName: 'Acc',
      windowPreset: 'last_7d',
      dateRange: '8–14 iyun',
      sentAt: '15-iyun 09:00',
      currency: 'USD',
      metrics: ['ad_spend', 'lead_count', 'cost_per_lead', 'impressions'],
      values: { ad_spend: 1250.5, lead_count: null, cost_per_lead: null, impressions: 1000 },
    });
    expect(msg).toContain('💰 Sarf: $1 250.50');
    expect(msg).toContain("👁 Ko'rsatildi: 1 000");
    expect(msg).not.toContain('Lidlar');
    expect(msg).not.toContain('CPL');
  });

  it('renders only enabled metrics', () => {
    const msg = renderReportMessage({
      accountName: 'Acc',
      windowPreset: 'this_month',
      dateRange: 'iyun 2026',
      sentAt: '15-iyun 09:00',
      currency: 'UZS',
      metrics: ['ad_spend'],
      values: { ad_spend: 500000, impressions: 999 },
    });
    expect(msg).toContain("💰 Sarf: 500 000 so'm");
    expect(msg).not.toContain("Ko'rsatildi");
  });
});

describe('escapeHtml', () => {
  it('escapes &, <, >', () => {
    expect(escapeHtml('A & B <tag>')).toBe('A &amp; B &lt;tag&gt;');
  });
});

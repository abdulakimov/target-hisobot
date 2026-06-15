import { describe, expect, it } from 'vitest';
import { leadActionTypesFor, parseInsights } from '../src/modules/meta/insights-parse';

describe('leadActionTypesFor', () => {
  it('resolves a known lead key', () => {
    expect(leadActionTypesFor('messaging')).toContain(
      'onsite_conversion.messaging_conversation_started_7d',
    );
  });
  it('is empty for null or unknown keys', () => {
    expect(leadActionTypesFor(null)).toEqual([]);
    expect(leadActionTypesFor('nope')).toEqual([]);
  });
});

describe('parseInsights', () => {
  it('parses base metrics; lead metrics null without a lead key', () => {
    const v = parseInsights(
      { spend: '1250000', impressions: '84210', reach: '61540', unique_link_clicks_ctr: '2.4' },
      null,
    );
    expect(v.ad_spend).toBe(1250000);
    expect(v.impressions).toBe(84210);
    expect(v.reach).toBe(61540);
    expect(v.unique_ctr).toBe(2.4);
    expect(v.lead_count).toBeNull();
    expect(v.cost_per_lead).toBeNull();
  });
  it('computes lead_count + cost_per_lead from matching actions', () => {
    const v = parseInsights(
      {
        spend: '1000',
        actions: [
          { action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '5' },
          { action_type: 'other', value: '99' },
        ],
      },
      'messaging',
    );
    expect(v.lead_count).toBe(5);
    expect(v.cost_per_lead).toBe(200);
  });
  it('cost_per_lead is null with zero leads', () => {
    const v = parseInsights({ spend: '1000', actions: [] }, 'messaging');
    expect(v.lead_count).toBe(0);
    expect(v.cost_per_lead).toBeNull();
  });
  it('null raw → zeroed base metrics', () => {
    const v = parseInsights(null, null);
    expect(v.ad_spend).toBe(0);
    expect(v.lead_count).toBeNull();
  });
});

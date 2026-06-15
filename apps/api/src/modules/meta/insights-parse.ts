import { LEAD_ACTION_OPTIONS, type ReportMetricValues } from '@hisobotchi/shared';

/** Raw account-level insights row from the Meta Graph API. */
export interface RawInsights {
  spend?: string;
  impressions?: string;
  reach?: string;
  unique_link_clicks_ctr?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start?: string;
  date_stop?: string;
}

function num(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sumActions(
  actions: Array<{ action_type: string; value: string }> | undefined,
  types: Set<string>,
): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) if (types.has(a.action_type)) total += num(a.value);
  return total;
}

/** Meta action_type(s) a lead-option key maps to (empty for null/unknown). */
export function leadActionTypesFor(leadKey: string | null): string[] {
  if (!leadKey) return [];
  return LEAD_ACTION_OPTIONS.find((o) => o.key === leadKey)?.actionTypes ?? [];
}

/**
 * Turn a raw insights row into report metric values. lead_count/cost_per_lead are null
 * unless a lead type is configured; cost_per_lead is null when there are no leads.
 */
export function parseInsights(raw: RawInsights | null, leadKey: string | null): ReportMetricValues {
  const leadTypes = leadActionTypesFor(leadKey);
  const hasLead = leadTypes.length > 0;
  if (!raw) {
    return {
      ad_spend: 0,
      impressions: 0,
      reach: 0,
      unique_ctr: 0,
      lead_count: hasLead ? 0 : null,
      cost_per_lead: null,
    };
  }
  const spend = num(raw.spend);
  const leadCount = hasLead ? sumActions(raw.actions, new Set(leadTypes)) : null;
  return {
    ad_spend: spend,
    impressions: num(raw.impressions),
    reach: num(raw.reach),
    unique_ctr: num(raw.unique_link_clicks_ctr),
    lead_count: leadCount,
    cost_per_lead: leadCount && leadCount > 0 ? spend / leadCount : null,
  };
}

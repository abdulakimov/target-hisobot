/**
 * Curated lead `action_type` options for the per-account dropdown (PLAN.md §7).
 * Exact strings are verified against the live Graph API at implementation time;
 * these are the starting set.
 */
export interface LeadActionOption {
  /** Stable key used in the UI select. */
  key: string;
  /** Uzbek label. */
  label: string;
  /** Meta `action_type` value(s) this maps to. */
  actionTypes: string[];
}

export const LEAD_ACTION_OPTIONS: LeadActionOption[] = [
  { key: 'lead_form', label: 'Lead forma (Instant Form)', actionTypes: ['lead', 'leadgen_grouped'] },
  {
    key: 'messaging',
    label: 'Xabar boshlandi (Messaging)',
    actionTypes: ['onsite_conversion.messaging_conversation_started_7d'],
  },
  { key: 'pixel_lead', label: 'Sayt Lead (pixel)', actionTypes: ['offsite_conversion.fb_pixel_lead'] },
  { key: 'purchase', label: 'Purchase', actionTypes: ['offsite_conversion.fb_pixel_purchase'] },
  {
    key: 'registration',
    label: "Ro'yxatdan o'tish",
    actionTypes: ['offsite_conversion.fb_pixel_complete_registration'],
  },
];

const LEAD_KEYS = new Set(LEAD_ACTION_OPTIONS.map((o) => o.key));

/** True if the value is a curated lead-option key (vs. a raw Meta action_type). */
export function isCuratedLeadKey(value: string): boolean {
  return LEAD_KEYS.has(value);
}

/** Friendly Uzbek label for a raw Meta action_type, or null if uncurated. */
export function labelForActionType(actionType: string): string | null {
  return LEAD_ACTION_OPTIONS.find((o) => o.actionTypes.includes(actionType))?.label ?? null;
}

/**
 * A stored lead selection is either a curated key or a raw Meta action_type.
 * Accept curated keys, or raw action_type strings (safe charset).
 */
export function isValidLeadSelection(value: string): boolean {
  return isCuratedLeadKey(value) || /^[a-z0-9_.]+$/i.test(value);
}

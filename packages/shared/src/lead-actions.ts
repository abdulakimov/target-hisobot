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

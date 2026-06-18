/**
 * Supported UI / report locales. Full i18next wiring (frontend + API + bot/report renderer)
 * lands in M11 (PLAN_V2 §3.D); this shared scaffold lets new code reference locales now so
 * strings are born locale-aware.
 *  - uz: O'zbekcha (Latin) — default
 *  - ru: Русский
 *  - en: English
 */
export const LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

/** Human label for each locale (for language pickers). */
export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: 'Русский',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve a locale from a priority list with a guaranteed fallback. Use for the two-axis
 * model: report language first, then the targetolog's UI language, then the default —
 * e.g. resolveLocale(report.locale, user.locale).
 */
export function resolveLocale(...candidates: Array<string | null | undefined>): Locale {
  for (const candidate of candidates) {
    if (isLocale(candidate)) return candidate;
  }
  return DEFAULT_LOCALE;
}

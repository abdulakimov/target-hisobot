# i18n (UZ / RU / EN)

Scaffold for the multi-language rollout — full wiring is milestone **M11** ([PLAN_V2 §3.D](../../../../PLAN_V2.md)).

## Decisions (from research)

- **Single catalog format across all three surfaces**: i18next JSON, consumed by
  `react-i18next` (web), `nestjs-i18n` (API), and i18next core (bot + report renderer).
- **Two-axis locale model**: `User.locale` (targetolog's dashboard/DM language) and
  `Report.locale` (recipient/client language) — a Tashkent agency may use the UI in Russian
  but send a client an Uzbek report. Resolve with `resolveLocale(report.locale, user.locale)`.
- **Currency stays custom** (not `Intl` for UZS — inconsistent across Node ICU builds).
  Numbers/dates become locale-aware; UZS keeps the integer + space + suffix rule.
- **Russian needs ICU plurals** (`one/few/many/other`).

## Layout

- `locales.ts` — `Locale` type, `LOCALES`, `DEFAULT_LOCALE`, `isLocale`, `resolveLocale`.
- `catalogs/<locale>/<namespace>.json` — translation catalogs (seeded with `common`).

## M11 TODO

- Add i18next deps; wire `react-i18next` (web) + `nestjs-i18n` (API).
- Make `renderReportMessage()` locale-aware (pull metric labels + line templates from catalogs
  instead of the hard-coded Uzbek in `metrics.ts` / `report-message.ts`).
- Extract the remaining hard-coded UI + bot/DM/error strings into catalogs.
- Decide catalog loading (bundle import vs. copy to `dist`) — they currently live under `src`.

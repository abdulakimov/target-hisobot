# PLAN_V2 — Hisobotchi "World-Class" Transformatsiya rejasi

> Bu hujjat MVP'ni (M0–M7, jonli: hisobot.qariya.uz) **professional, moslashuvchan, "wow" effekt beradigan** mahsulotga aylantirish rejasi. Tarixiy M0–M7 uchun [PLAN.md](PLAN.md) ga qarang. Yuqori darajadagi yo'riqnoma — [CLAUDE.md](CLAUDE.md).
>
> Manba: 5 ta parallel research subagent (backend audit, frontend audit, premium UI/UX playbook, raqobat tahlili, arxitektura research) — 2026-06-18.

---

## 1. Maqsad va tasdiqlangan qarorlar

| Eksa | Qaror |
|------|-------|
| **Dizayn uslubi** | Zamonaviy **premium** (Vercel/Linear/Stripe darajasi) — tiniq, tez, light/dark, nafis tipografiya, o'lchovli "wow" animatsiyalar. |
| **Qamrov** | Chuqur **UI/UX overhaul + asosiy yangi funksiyalar** (mustahkam backend asosini saqlab). |
| **Moslashuvchanlik** | Hammasi: ① hisobot shabloni/mazmuni, ② mijoz uchun **white-label**, ③ dashboard theming, ④ murakkab jadval/qoidalar. |
| **Biznes imkoniyatlari** | **Ko'p tillilik (UZ/RU/EN)**, **jamoa/agentlik workspace'lari**, **dashboard ichida analitika**. *(Billing — hozircha opsional, §3.H.)* |

**Strategik pozitsiya (raqobat tahlilidan):** Yetakchi raqobatchilar (AgencyAnalytics, Whatagraph, DashThis, Databox…) hammasi web-dashboard + email/PDF tools — **hech biri Telegram guruhga nativ yetkazmaydi**. Bizning ustunligimiz aynan shu: O'zbekistonda mijoz allaqachon yashayotgan Telegram guruhiga formatlangan, brendlangan, rejalashtirilgan hisobot. AgencyAnalytics'ni 80+ integratsiyada urishga urinmaymiz — **"Telegram-native Meta hisoboti"da eng zo'r bo'lamiz** va agentliklar ishonadigan table-stakes'ni (white-label, seats, RU/UZ, ishonchlilik/alerts) yopamiz.

---

## 2. Hozirgi holat (audit xulosasi)

### Kuchli tomonlar (saqlanadi)
- **Backend funksional jihatdan to'liq (M0–M7).** Hamma REST/bot/scheduler oqimi ishlaydi, stub yo'q. Arxitektura toza, Nest modullari concern'larni yaxshi ajratgan.
- **Tenant izolyatsiyasi to'g'ri** — har query `user_id` bo'yicha filtrlanadi (tekshirildi). Token AES-256-GCM bilan shifrlangan, hech qayerda log/serialize qilinmaydi.
- **Dublikat himoyasi mustahkam** — `@@unique([reportId, scheduledFor])` + dispatcher pre-check + minute-truncation.
- **Frontend poydevori yaxshi** — Tailwind v4, OKLCH tokenlar (`:root`/`.dark`), `@theme inline`, next-themes, TanStack Query, `packages/shared` toza deterministik logika (renderer, `isDue`, formatlar). Vitest mavjud.

### Zaif tomonlar (tuzatiladi)
- **Ishonchlilik:** Meta client'da timeout/retry/backoff yo'q (`meta-graph.service.ts:53`); scheduler ketma-ket (parallellik yo'q, PLAN 5 deydi); global exception filter, throttler, helmet yo'q; eski yozuvlar uchun cleanup cron yo'q (cheksiz o'sish); API testlar yo'q.
- **Bitta `user_id` tenant chegarasi** — workspace/white-label/teams uchun asosiy to'siq.
- **Frontend MVP darajasida:** atigi **5 ta** shadcn primitiv (PLAN ~20 va'da qilgan), ko'p joyda native `<select>`/`window.confirm`, **mobil navigatsiya buzilgan** (sidebar `md` ostida yo'q, hamburger yo'q), motion ~yo'q, skeleton yo'q, ReportEditor — qo'lda yasalgan overlay (focus-trap/Esc/slide yo'q), query xatolari `?? []` bilan jimgina yutiladi, Settings — stub, onboarding — yo'q.
- **i18n yo'q** — barcha matn qotirilgan o'zbekcha (web + `packages/shared` label'lar + `report-message.ts`).
- **Hisobot — faqat matn**, qotirilgan tartib (`LINE_ORDER`), branding/rasm/davr-solishtirish yo'q.
- **Analitika yo'q** — `metricsSnapshot` faqat yuborilganda yoziladi; in-dashboard chart yo'q, charting lib yo'q.

---

## 3. To'liq o'zgartirishlar ro'yxati (kategoriyalar bo'yicha)

> Belgilar: **[P0]** kritik/poydevor · **[P1]** "world-class" uchun shart · **[P2]** differensiator/keyin. Effort: **S** ≤1 hafta · **M** 1–3 hafta · **L** 1–2 oy · **XL** chorak+.

### A. Infratuzilma va ishonchlilik [P0]
- **A1. CI build pipeline** — Docker image'larni **VPS'da emas, GitHub Actions'da** build qilib registry'ga (GHCR) push, VPS'da `docker pull`. **Satori/native binary qo'shishdan oldin majburiy** (RAM-tight box OOM bo'ladi). [M]
- **A2. Meta client hardening** — `AbortController` timeout + eksponensial retry/backoff + 429 `retry-after` hurmati; cheklangan parallellik (`p-limit`). `meta-graph.service.ts`, `report-dispatcher.service.ts`. [S/M]
- **A3. Scheduler mustahkamligi** — dispatch parallellik cheklovi (5), tick overlap guard, restart-catch-up (cap'langan grace window), `Report.nextRunAt` + index (O(due) scan). [S/M]
- **A4. Global error handling** — `APP_FILTER` exception filter + xato normalizatsiya (xom Meta/exception satrlarini redirect URL'ga chiqarmaslik), `@nestjs/throttler`, `helmet`. [S]
- **A5. Cleanup/retention cron'lar** — `report_runs`, expired `sessions`/`login_tokens`/`pairing_tokens` prune. [S]
- **A6. DTO semantik validatsiya** — IANA timezone tekshiruvi, `sendTimes`/`weekdays`/`metrics` dedup + uzunlik cheklovi; Meta token javobini shifrlashdan oldin runtime-validate; `LOG_LEVEL` ni loggerga ulash. [S]
- **A7. Test poydevori** — Vitest unit (shared logika) + `@testcontainers/postgresql` integration (tenant izolyatsiya, CRUD, dispatcher mock Meta/Telegram) + `supertest` e2e. [M, davomiy]

### B. UI/UX va dizayn tizimi [P1] — **foydalanuvchining #1 prioriteti**
- **B1. Dizayn tokenlari v2** — tipografik shkala (dashboard base 13–14px), `font-variant-numeric: tabular-nums` har raqamda (UZS/USD currency-aware), elevation tier'lari, dark mode "to'g'ri" (pure black emas, lighter-surface elevation), motion/shadow/radius tokenlari. [S]
- **B2. Komponent tizimini to'ldirish** — yetishmayotgan ~15 shadcn primitiv (`select, dropdown-menu, avatar, alert-dialog, tooltip, tabs, separator, scroll-area, label, command, dialog, popover, sheet, skeleton, toggle-group, data-table`); barcha native `<select>`/`window.confirm`'ni almashtirish; avatar dropdown menyu. [M]
- **B3. Motion qatlami** — `motion` (avvalgi framer-motion), `@formkit/auto-animate` (ro'yxat CRUD), `@number-flow/react` (KPI/delta), `tw-animate-css`; route/list/card o'tishlari; `prefers-reduced-motion` hurmati. [M]
- **B4. App shell** — **mobil nav drawer** (`vaul`/`Sheet` + hamburger — buzilgan oqimni tuzatadi), **command palette ⌘K** (`cmdk`), global error boundary, `*` 404 route, theme'da haqiqiy "system" tanlovi. [M]
- **B5. ReportEditor qayta qurish** — haqiqiy `Sheet` (slide/focus-trap/Esc/scroll-lock); RHF + zod (inline xatolar, unsaved-changes guard); **jonli Telegram preview** (`renderReportMessage` qayta ishlatiladi — yuqori "wow", past xarajat). [M]
- **B6. Skeleton + xato holatlari** — har "Yuklanmoqda…" o'rniga layout-shaped skeleton; `?? []` jim xatolarni aniq error+retry holatiga almashtirish. [S]
- **B7. History → data-table** — `@tanstack/react-table` (sort/paginate/column/CSV/drill-in), shadcn date-picker filtrlar, URL-sync. [M]
- **B8. Dashboard KPI header** — stat kartalar (`NumberFlow` + sparkline + ma'noli trend delta ▲▼). [S/M]
- **B9. Onboarding wizard/checklist** — Meta ulash → account yoqish → bot guruhga → DM Start → birinchi report (activation ko'taradi). [M]
- **B10. Settings sahifa (real)** — profil, timezone, theme, til, bildirishnoma sozlamalari, danger-zone. [M]
- **B11. Perf & polish** — route code-split + `Suspense`, prefetch-on-intent, TanStack Query `keepPreviousData`/optimistic mutations, **Onest self-host** (variable WOFF2 + metric-matched fallback), favicon/OG/theme-color, sana formatlarini `datetime.ts` orqali birlashtirish. [S/M]

### C. Workspaces va RBAC [P1] — poydevoriy (white-label/teams uchun shart)
- **C1. Schema** — `Organization`, `Membership`, `Invitation`, `OrgRole {owner,admin,member,viewer}`; barcha tenant jadvalga `organizationId` (`AdAccount, TelegramGroup, Report, ReportRun, MetaConnection`), `Session.currentOrganizationId`. [M]
- **C2. Migratsiya (expand→migrate→contract)** — nullable ustun qo'shish → idempotent backfill skripti (har user uchun personal org + owner membership, rows'ni to'ldirish) → NOT NULL + index. **Avval DB backup, copy'da repetitsiya.** [M] ⚠️ eng yuqori xavf.
- **C3. Authorization — CASL** (`@casl/ability` + `@casl/prisma`) — isomorphic (React'da UI yashirish + Nest'da guard), `accessibleBy()` Prisma `where` generatsiya qiladi. `OrgGuard` + `@CurrentOrg()`. [M]
- **C4. Bot/scheduler scoping** — HTTP context'dan tashqarida ishlagani uchun saqlangan `organizationId` bo'yicha aniq scope. DM routing — to'g'ri a'zo(lar)ga rol/sozlamaga ko'ra. [S]
- **C5. Frontend** — workspace switcher (sidebar header), Members/Roles/Invites sahifalari, rol-gated nav, invite deep-link (pairing token uslubida). [M]

### D. i18n — UZ/RU/EN [P1]
- **D1. Yagona katalog formati** — **i18next JSON** uch sirtda: `react-i18next` (web) + `nestjs-i18n` (API) + i18next core (bot/renderer); kataloglar `packages/shared` (yoki `packages/i18n`) da. [M]
- **D2. String extraction** — web (~150+ inline satr) + shared label'lar (`metrics.ts`, `enums.ts`, `lead-actions.ts`) + `report-message.ts` ni locale-aware qilish. [M]
- **D3. Ikki o'qli locale** — `User.locale` (targetolog UI/DM tili) **va** `Report.locale` (mijoz hisobot tili — UI o'zbek bo'lsa ham guruhga ruscha yuborish mumkin). Dispatcher: `Report.locale ?? User.locale`. [S]
- **D4. Lokalizatsiya formatlash** — `Intl.NumberFormat(locale)` grouping; **UZS uchun custom qoida saqlanadi** (`Intl` UZS'da Node ICU bo'yicha nomuvofiq); ruscha ICU plural (`one/few/many/other`); locale-driven oy nomlari. [S]

### E. White-label + Report template engine + Rasm hisobot [P1] — **eng katta "wow" richagi**
- **E1. Branding modeli** — `OrgBranding {logoUrl, primaryColor, accentColor, reportFooter}`; logo → **object storage** (R2/disk volume, DB bytes EMAS), DB'da faqat URL. [M]
- **E2. Runtime brand injection** — dashboard'da CSS-var override (`--primary`, `--ring`, `--radius`…); `culori` bilan hex→OKLCH + WCAG kontrast auto-foreground; FOUC oldini olish (inline script). [M]
- **E3. Report template engine** — `ReportTemplate {layout Json, outputs[], locale}` (tartibli typed section'lar: header/metrics/text/chart/footer); `Report.templateId`; `report-message.ts` ni **data-driven** qilish (qotirilgan `LINE_ORDER` o'rniga). [L]
- **E4. Rasm hisobot (satori)** — **`satori` → `@resvg/resvg-js`** (Vercel OG stack, <50ms, headless browser EMAS — RAM-tight box uchun yagona to'g'ri tanlov; **Puppeteer rad etiladi**). `bot.sendPhoto`. Onest **TTF/OTF** + local emoji font (Noto, satori WOFF2/CDN'ni qo'llamaydi). `p-limit` concurrency. [L]
- **E5. Davr-bilan-solishtirish** — oldingi davr `time_range` bilan fetch, delta hisoblash, ▲▼ render (har hisobotda kutiladigan table-stake). [M]
- **E6. "Hozir yuborish"** — dashboard "Run now" tugmasi + guruhda `/report` buyrug'i (mavjud dispatch path, mijoz qo'ng'irog'idan oldin juda qadrli). [S]
- **E7. (Defer) PDF/share-link** — PNG→PDF `pdf-lib` bilan; public tokenlangan read-only `ReportRun` ko'rinishi. [M]

### F. Dashboard ichida analitika [P2] (E bilan parallel)
- **F1. Facts jadval** — `MetricDaily {organizationId, adAccountId, date, spend, impressions, reach, leadCount, uniqueCtr, currency, @@unique([adAccountId,date])}`; `ReportRun` snapshot'idan emas (u sparse). [M]
- **F2. Daily ingestion cron** — `time_increment=1` bilan har yoqilgan account; **oxirgi ~7 kunni qayta tortish** (Meta retroaktiv o'zgaradi); rolling window (90–365 kun). [M]
- **F3. Analytics API** — `GET /api/analytics?accountId&from&to&granularity&compare&metrics[]` → `{series, totals, previous, deltas}`; hafta/oy bucket'lar uchun **raw SQL** (`date_trunc` + `generate_series` gap-fill); valyuta bo'yicha alohida (aralash valyutani jamlamaslik). [M]
- **F4. In-memory bounded LRU cache** (Redis yo'q); o'tgan kunlar — hard cache, bugun — qisqa TTL. [S]
- **F5. Recharts dashboards** — shadcn Chart (Recharts v3, tokenlar bilan theming + white-label rang); spend/leads/CPL trend, comparison, per-account breakdown. [M]
- **F6. Creative/ad-level reporting** — top-N reklama (spend/leads/ROAS, thumbnail, CTR), placement/age/gender/geo breakdown (raqobat kredibillik bo'shlig'i). [L]

### G. Murakkab jadval va alerts [P2] (F facts jadvaliga bog'liq)
- **G1. Alert modellari** — `AlertRule {metric, op(gt/lt/change_pct/zero_delivery), threshold, window, channel, cooldownMin}` + `AlertEvent {windowKey, @@unique([alertRuleId,windowKey])}`. [M]
- **G2. Alert evaluatsiya** — coarser cron (15–30 daq), MetricDaily o'qiydi; threshold + davr-solishtirish + zero-delivery; cooldown + dedupe (anti-storm); DM/guruh + dashboard flag. [M]
- **G3. Moslashuvchan jadval** — `cron-parser` bilan interval/oy-kuni/"oxirgi ish kuni"; pause-until/holiday skip (data-driven matcher'da, registered job EMAS). [M]
- **G4. AI-yozilgan xulosa** *(yuqori wow)* — metrika snapshot + comparison ustidan LLM, UZ/RU 2–4 jumla ("Sarf ▲12%, lidlar ▲30%, CPL 18 000 so'mga tushdi…"); `ReportRun` bo'yicha cache. **Claude Haiku 4.5** (`claude-haiku-4-5`) — arzon/tez, bu vazifaga yetarli; sifat kerak bo'lsa Sonnet. [M]

### H. Monetizatsiya va o'sish [opsional — keyin]
- **H1. Billing** — Payme/Click/Uzum (card-only ~70% local mijozni yo'qotadi); UZS past tariflar (freelancer ~50–150k so'm/oy), **per-client/per-group**, per-seat EMAS. `PayTechUZ`. [L]
- **H2. PWA** — mobil-first (89% smartfon-only). [M]
- **H3. Benchmarks** — UZ-bozor CPL/CPM niche bo'yicha (data network effect, volume kelganda). [L]
- **H4. Multi-account roll-up** — bir nechta account bitta hisobotda. [L]

---

## 4. Yangi bog'liqliklar (dependencies)

**Backend (`apps/api`):** `@casl/ability`, `@casl/prisma`, `nestjs-i18n` (+`intl-messageformat`), `satori`, `@resvg/resvg-js`, `p-limit`, `culori`, `cron-parser`; *opsional* `pdf-lib`, `@napi-rs/canvas`, `@anthropic-ai/sdk` (AI xulosa).

**Frontend (`apps/web`):** `motion`, `@formkit/auto-animate`, `@number-flow/react`, `tw-animate-css`, `cmdk`, `vaul`, `@tanstack/react-table`, `react-hook-form` + `@hookform/resolvers`, `i18next` + `react-i18next` + `i18next-browser-languagedetector` + `i18next-icu`, `recharts` (shadcn Chart), `culori`, va yetishmayotgan shadcn/Radix primitivlar. *(`sonner`, `zod` allaqachon bor.)*

**Test/CI:** `@testcontainers/postgresql`, `supertest`, `nock`/`msw`, `@testing-library/react`, `@playwright/test`.

---

## 5. Bosqichma-bosqich yo'l xaritasi

> Sequencing arxitektura research'ga asoslangan: poydevorni avval, har bosqich ko'rinarli qiymat beradi, xavfni boshqaradi. Effort — taxminiy.

| Bosqich | Nomi | Mazmun (§) | Effort | Bog'liqlik |
|---------|------|-----------|--------|-----------|
| **M8** | Foundation & Reliability | A (hammasi) + D1 i18n infra scaffold | ~1–2 hafta | — (avval) |
| **M9** | UI/UX Overhaul ("wow") | B (hammasi) | ~2–3 hafta | M8 (CI, komponentlar) |
| **M10** | Workspaces & RBAC | C (hammasi) | ~2–4 hafta | M8 |
| **M11** | i18n to'liq rollout | D (hammasi) | ~1–2 hafta | M9 (UI strings), M10 (org locale) |
| **M12** | White-label + Template + Rasm hisobot | E (hammasi) | ~3–4 hafta | M10 (branding org-scope), CI (satori) |
| **M13** | In-dashboard analytics | F (hammasi) | ~2–3 hafta | M10; **M12 bilan parallel** |
| **M14** | Advanced scheduling & alerts | G (hammasi) | ~1–2 hafta | M13 (facts), M11 (lokalizatsiya) |
| **M15** | *(opsional)* Monetizatsiya & o'sish | H | — | bozor tayyorligi |

**Parallellashtirish mumkin:** M9 (frontend) ⟂ M10 (backend workspaces) ko'p qismi mustaqil. M12 ⟂ M13 branding config + satori renderer'ni baham ko'radi, lekin analytics mustaqil.

**Tartib mantig'i:**
1. **M8 avval** — CI build (satori'dan oldin majburiy), ishonchlilik = agentlik ishonchi uchun table-stake.
2. **i18n infra erta (M8), to'liq tarjima M11** — shunda M9'dan keyingi barcha yangi UI **kalitlar bilan** tug'iladi (qayta string-extract qilmaslik uchun).
3. **Workspaces (M10) white-label/teams/analytics'dan oldin** — hammasi `organizationId`ga scope bo'ladi. Migratsiya = eng katta xavf → expand/migrate/contract + alohida idempotent backfill + backup.
4. **Rasm hisobot (M12) — eng katta wow**, lekin RAM xavfi → CI build (M8) shart, staging'da footprint tekshirish.

---

## 6. Xavflar va himoya choralari

- ⚠️ **VPS RAM** — satori/resvg/native binary'lar qo'shilgach **VPS'da build OOM**. **M8'da build'ni CI'ga ko'chirish** — eng muhim mitigatsiya. Runtime'da: render on-demand + buffer'ni ushlamaslik, `p-limit` concurrency, font'larni boot'da bir marta yuklash, `NODE_OPTIONS=--max-old-space-size`. **Puppeteer YO'Q.**
- ⚠️ **Workspace migratsiyasi** — mavjud jonli ma'lumotni buzmaslik: nullable→backfill→NOT NULL; backfill alohida re-runnable skript (migration ichida emas); avval DB backup + copy'da repetitsiya.
- ⚠️ **Yangi jadvalda `organizationId` unutish** = jim cross-tenant leak. Mitigatsiya: `accessibleBy()` / (opsional) Postgres RLS `SET LOCAL` tx bilan.
- ⚠️ **Meta retroaktiv ma'lumot** — bugun/oxirgi kunlar o'zgaradi; alert/analytics yopiq oynalarda yoki oxirgi 7 kunni qayta tortib.
- ⚠️ **satori egress** — emoji/font CDN'dan tortmaslik; local Noto + Onest TTF bundle.
- ⚠️ **Cheksiz o'sish** — `report_runs`/`metric_daily` retention day-one'dan.
- ⚠️ **Bitta bot token** — dev+prod polling konflikti (mavjud); workspace'lar buni o'zgartirmaydi.

---

## 7. Hoziroq boshlanadigan quick wins (yuqori ta'sir / past xarajat)

1. **Mobil nav drawer** — buzilgan core oqimni tuzatadi (`AppShell.tsx`). [B4]
2. **Jonli Telegram preview** ReportEditor'da (`renderReportMessage` qayta ishlatiladi). [B5]
3. **Skeleton'lar + jim query xatolarini tuzatish** (dashboard/history/groups). [B6]
4. **"Hozir yuborish"** tugmasi + `/report` (mavjud dispatch). [E6]
5. **Meta client hardening** (timeout/retry) — jonli ishonchlilik. [A2]
6. **CI build pipeline** — keyingi hamma narsani ochadi. [A1]

---

*Keyingi qadam: foydalanuvchi bosqichni tanlaydi (tavsiya: M8 Foundation yoki to'g'ridan-to'g'ri M9 UI/UX, agar visible "wow"ni tezroq xohlasa). Tanlangach task list yaratiladi.*

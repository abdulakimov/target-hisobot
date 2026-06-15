# PLAN.md

Hisobotchi — qurilish rejasi va texnik spetsifikatsiya. Yuqori darajadagi yo'riqnoma uchun [CLAUDE.md](CLAUDE.md) ga qarang.

---

## 1. Maqsad va qamrov

Targetologlar uchun: Meta reklama akkauntini ulab, belgilangan vaqtlarda Telegram guruhlariga avtomatik, formatlangan reklama hisobotlari yuboradigan multi-tenant SaaS.

**v1 ga kiradi:**
- Telegram Login orqali dashboardga kirish.
- Facebook OAuth orqali ad-account(lar)ni ulash.
- Telegram guruhni deep-link bilan ulash.
- Account-level hisobot: 6 ta metrika, sozlanadigan davr, lead action_type tanlash.
- Ko'p vaqtli + hafta-kunli jadval (timezone bilan).
- Avtomatik yuborish + to'liq tarix + xatolik DM ogohlantirishi.

**v1 dan tashqarida (kelajak):** jamoa/workspace, per-campaign breakdown, rasm-karta hisobot, davr-bilan-solishtirish (▲▼), ruscha til, billing/obuna, bir nechta Meta connection, webhook bot.

---

## 2. Yo'l xaritasi (milestones)

### M0 — Scaffolding ✅
- [x] pnpm monorepo (`apps/api`, `apps/web`, `packages/shared`).
- [x] NestJS skeleti + `PrismaService` + config module + zod env validatsiya.
- [x] React/Vite + Tailwind v4 + shadcn-uslubidagi UI (sidebar+topbar shell, blue accent, dark/light).
- [x] `docker-compose` (prod: caddy+api+web+postgres) + `docker-compose.dev.yml` (postgres) + Caddyfile.
- [x] Prisma schema (8 entity) + birinchi migratsiya (`init`).
- [x] `.env.example` + zod validatsiya.

> **Holat:** `api` build + runtime tekshirildi — barcha modullar yuklandi, Prisma driver-adapter
> orqali ulanди (`/health` → `db:up`), bot tokensiz skeleton rejimda. `web` build + Vite prod bundle
> muvaffaqiyatli. Eng so'nggi versiyalar: NestJS 11.1, Prisma 7.8, grammY 1.43, React 19.2, Vite 8,
> Tailwind 4.3, TypeScript 6, zod 4.

### M1 — Auth (Telegram bot deep-link login) ✅
**Yondashuv:** EduBaza uslubidagi **bot deep-link login** — Widget/HMAC/`setdomain` EMAS (localhost'da ham ishlaydi).
- [x] `POST /api/auth/telegram/start` → bir martalik `login_token` (~5 daqiqa) + `t.me/<bot>?start=login_<token>` deep-link.
- [x] Bot `/start login_<token>` (private) → `ctx.from`'dan user (ishonchli, hash yo'q) → `User` upsert + token bog'lash + `dm_enabled=true`.
- [x] `GET /api/auth/telegram/poll?token=` → `pending` / `expired` / `ok` (bog'langach session cookie + `MeResponse`).
- [x] `User` upsert + opaque session cookie (DB'da SHA-256 hash, imzolangan, `Secure` faqat prod).
- [x] Global `AuthGuard` + `@Public()` + `@CurrentUser()` (tenant izolyatsiya poydevori).
- [x] DM yoqish login bilan **avtomatik** (botni Start qilish orqali). Dashboardda zaxira DM banner.

> **Olib tashlandi:** Telegram Login Widget, `dev-login` bypass, HMAC `hash` verify, `LoginToken` jadvali qo'shildi.
> Endpoints: `POST /api/auth/telegram/start`, `GET /api/auth/telegram/poll`, `POST /api/auth/logout`, `GET /api/me`.

### M2 — Meta ulash
- [ ] OAuth boshlash (`ads_read,business_management`, `state`).
- [ ] Callback: code → short-lived → **long-lived** token → AES-256-GCM shifrlash → saqlash.
- [ ] `/me/adaccounts` sync → `AdAccount` upsert (default: disabled).
- [ ] Account yoqish/o'chirish UI; har account uchun default lead `action_type` tanlash.
- [ ] Token muddati/xatosini aniqlash → `expired` + reconnect.

### M3 — Guruh pairing
- [ ] "Guruhni ulash" → `startgroup=<pairing_token>` deep-link generatsiya.
- [ ] Bot `/start <token>` ni guruhda qabul qilib → token→user → `TelegramGroup` bog'lash.
- [ ] `my_chat_member` — qo'shilish/chiqarilish/admin holatini kuzatish.
- [ ] Guruhlar ro'yxati UI + holat (member/admin/removed).

### M4 — Report konfiguratsiya
- [ ] Report CRUD: account + guruh + metrikalar (6 ta toggle) + lead action_type + window preset + send_times[] + weekdays[] + timezone + enabled.
- [ ] Validatsiya (kamida 1 metrika, kamida 1 vaqt, account yoqilgan, guruh aktiv).
- [ ] Report ro'yxati + yoqish/o'chirish + tahrirlash UI.

### M5 — Scheduler + yuborish
- [ ] `@nestjs/schedule` har daqiqa tick.
- [ ] Due-report tanlash (timezone + send_times + weekdays), dublikat himoyasi (`ReportRun.scheduled_for` unikal).
- [ ] Meta Insights fetch (window → date_preset, fields).
- [ ] Metrikalarni hisoblash (lead_count/cost_per_lead action_type bo'yicha).
- [ ] O'zbekcha xabar render (§8 shablon) → guruhga yuborish (grammY).
- [ ] Cheklangan parallellik + retry/backoff.

### M6 — Tarix + xatolik ogohlantirishi
- [ ] Har yuborishda `ReportRun` (status, snapshot, window, error).
- [ ] Tarix sahifasi (filtr: report/guruh/sana, status).
- [ ] Xatoda bot DM ogohlantirish + dashboardda qizil belgi + reconnect tugma.

### M7 — Deploy ✅ (asosiy)
- [x] Prod stack VPS'da (`docker-compose.vps.yml`: postgres + api + web). **Caddy o'rniga host nginx** (shared box).
- [x] Domen `hisobot.qariya.uz` + Let's Encrypt TLS (certbot, avto-yangilanish).
- [x] Migratsiyalar prod'da qo'llandi (api konteyner `prisma migrate deploy` + start).
- [ ] Monitoring/log agregatsiya; postgres backup (keyin).

> **Deploy holati:** jonli — https://hisobot.qariya.uz. Host nginx (80/443+TLS) → `127.0.0.1:3014` →
> `web` (SPA + `/api` proxy) → `api` (bot+scheduler) → `postgres`. Kod `/opt/target-hisobotchi-bot`,
> prod `.env` (chmod 600). Build VPS'da nativ amd64 (9GB swap himoyasida).
>
> **Qayta deploy (lokaldan):**
> ```bash
> rsync -az --delete --exclude node_modules --exclude dist --exclude .git \
>   --exclude .env --exclude '*.tsbuildinfo' --exclude apps/api/src/generated \
>   ./ my-vps:/opt/target-hisobotchi-bot/
> ssh my-vps "cd /opt/target-hisobotchi-bot && docker compose -f docker-compose.vps.yml up -d --build"
> ```
>
> ⚠️ Login Widget ishlashi uchun: BotFather `/setdomain` → @target_hisobot → `hisobot.qariya.uz`.

### Parallel — Meta App Review
- [ ] App'ni to'ldirish (use-case, privacy policy, demo video).
- [ ] `ads_read` + `business_management` Advanced Access so'rovi.
- [ ] Review o'tguncha test foydalanuvchilar bilan ishlash.

---

## 3. Ma'lumotlar modeli (Prisma, batafsil)

> Pseudo-sxema; aniq tiplar Prisma'da yakunlanadi.

**User**
| ustun | tip | izoh |
|-------|-----|------|
| id | uuid PK | |
| telegram_user_id | bigint unique | |
| username, first_name, last_name, photo_url | text? | Telegram'dan |
| timezone | text | default `Asia/Tashkent` |
| dm_enabled | bool | botni private'da Start qilganmi |
| created_at, last_login_at | timestamptz | |

**Session**
| ustun | tip | izoh |
|-------|-----|------|
| id | uuid PK | |
| user_id | uuid FK | |
| token_hash | text unique | cookie'dagi opaque token (hash holda) |
| user_agent, ip | text? | audit |
| expires_at, created_at, last_seen_at | timestamptz | |

**MetaConnection**
| id | uuid PK |
| user_id | uuid FK |
| meta_user_id | text |
| access_token_enc | bytea/text | AES-256-GCM |
| token_expires_at | timestamptz |
| scopes | text[] |
| status | enum(active, expired, revoked) |
| created_at, updated_at | timestamptz |

**AdAccount**
| id | uuid PK |
| user_id | uuid FK |
| meta_connection_id | uuid FK |
| act_id | text | `act_<id>` |
| name, currency, account_timezone | text |
| status | text | Meta account status |
| default_lead_action_type | text? | foydalanuvchi tanlovi |
| enabled | bool | default false |
| created_at, updated_at | timestamptz |
| unique(user_id, act_id) |

**TelegramGroup**
| id | uuid PK |
| user_id | uuid FK |
| chat_id | bigint |
| title | text |
| chat_type | text | group/supergroup |
| bot_status | enum(member, admin, removed) |
| linked_at, created_at | timestamptz |
| unique(user_id, chat_id) |

**GroupPairingToken**
| id | uuid PK |
| user_id | uuid FK |
| token | text unique | imzolangan, bir martalik |
| used | bool |
| expires_at, created_at | timestamptz |

**LoginToken** (bot deep-link login uchun)
| id | uuid PK |
| token | text unique | tasodifiy, bir martalik |
| user_id | uuid FK? | bog'langach to'ladi (bot Start qilganda) |
| status | text | `pending` → `claimed` → `consumed` |
| expires_at | timestamptz | ~5 daqiqa |
| claimed_at, created_at | timestamptz |

**Report** (markaziy entity)
| id | uuid PK |
| user_id | uuid FK |
| ad_account_id | uuid FK |
| telegram_group_id | uuid FK |
| name | text? | ixtiyoriy yorliq |
| metrics | text[] / jsonb | yoqilgan MetricKey'lar |
| lead_action_type | text | account default'ini override qilishi mumkin |
| window_preset | enum(yesterday, today, last_7d, last_30d, this_month) |
| timezone | text | default user.timezone |
| send_times | jsonb | `["09:00","18:00"]` |
| weekdays | jsonb/int[] | 1=Du … 7=Ya |
| enabled | bool |
| last_run_at | timestamptz? |
| created_at, updated_at | timestamptz |

**ReportRun**
| id | uuid PK |
| report_id | uuid FK |
| user_id | uuid FK | denormalizatsiya (query uchun) |
| scheduled_for | timestamptz | dublikat himoyasi: unique(report_id, scheduled_for) |
| ran_at | timestamptz |
| status | enum(success, failed) |
| window_start, window_end | timestamptz |
| metrics_snapshot | jsonb | yuborilgan qiymatlar |
| error_code, error_message | text? |
| telegram_message_id | bigint? |
| created_at | timestamptz |

> **Prisma 7 ulanish modeli (muhim):** Prisma 7 da datasource `url` schema'dan olib tashlangan.
> Ulanish satri ikki joyda: (1) CLI/Migrate uchun `apps/api/prisma.config.ts` (root `.env` dan
> `DATABASE_URL` o'qiydi — Prisma 7 endi `.env` ni avtomatik yuklamaydi), (2) runtime uchun
> `PrismaService` `@prisma/adapter-pg` (node-postgres) driver-adapter bilan `PrismaClient` quradi.

---

## 4. API endpoint eskizi

> NestJS global prefix **`/api`** qo'llaydi — barcha route'lar real'da `/api/...` ostida
> (masalan `/api/auth/telegram`, `/api/meta/callback`). `/health` istisno (infra uchun top-level).
> Bu SPA'ga `/groups`, `/reports` kabi client-route'larni bir xil origin'da egallashga imkon beradi.

```
# Auth (bot deep-link login)
POST   /auth/telegram/start    # login_token yaratish → { token, deepLink }
GET    /auth/telegram/poll     # ?token= → pending | expired | ok(+session cookie, user)
POST   /auth/logout
GET    /me                     # joriy user

# Meta
GET    /meta/connect           # OAuth dialogga redirect
GET    /meta/callback          # code → token → sync
GET    /meta/ad-accounts       # sync qilingan accountlar
PATCH  /meta/ad-accounts/:id   # enable + default_lead_action_type
DELETE /meta/connection        # uzish

# Telegram guruhlar
POST   /groups/pairing-link    # startgroup deep-link generatsiya
GET    /groups                 # ro'yxat + holat
DELETE /groups/:id

# Reports
GET    /reports
POST   /reports
GET    /reports/:id
PATCH  /reports/:id
DELETE /reports/:id
POST   /reports/:id/test-send  # darhol sinov yuborish

# Tarix
GET    /report-runs            # filtr: report_id, group, status, sana
```

Barcha endpoint'lar (auth'dan tashqari) session + tenant guard ostida.

---

## 5. Bot buyruqlari va oqimlari (grammY)

- `/start login_<token>` (private) → **bot-login**: `login_token` ni `ctx.from` userga bog'laydi (`User` upsert + `dm_enabled=true`) → "✅ Tizimga kirdingiz" javobi. Sayt fonda poll qilib session oladi.
- `/start` (private, payloadsiz) → salom + dashboard havolasi; mavjud user uchun `user.dm_enabled=true`.
- `/start <token>` (guruhda) → pairing: token→user → `TelegramGroup` bog'lash → guruhга tasdiq xabari.
- `my_chat_member` update → bot qo'shildi/chiqarildi/admin bo'ldi → `bot_status` yangilash; chiqarilsa egasiga DM.
- **Sender** — Report yuborish: `sendMessage(chat_id, html)`; xatoni (403/chiqarilgan/chat topilmadi) ushlab `ReportRun.failed` + DM.

---

## 6. Scheduler dizayni

- `@Cron('* * * * *')` — har daqiqa.
- Tick'da: yoqilgan Report'lar uchun har birining `timezone` ida joriy `HH:MM` va hafta kunini hisobla; `send_times` va `weekdays` ga mos kelganlarini tanla.
- Har biri uchun `scheduled_for` (shu daqiqa, UTC) bilan `ReportRun` yozishni urin — `unique(report_id, scheduled_for)` dublikatni to'sadi (bir vaqtda ikki instance bo'lsa ham).
- Cheklangan parallellik (masalan 5) bilan dispatch; Meta rate-limit'da backoff.
- `last_run_at` ni yangila.

---

## 7. Meta integratsiya tafsilotlari

### OAuth
- Dialog: `https://www.facebook.com/<ver>/dialog/oauth?client_id=…&redirect_uri=…&scope=ads_read,business_management&state=…`
- Token almashinuvi → **long-lived** (`fb_exchange_token`).
- Shifrlab saqla; muddat/xatoda `expired`.

### Insights so'rovi
- Endpoint: `GET /<ver>/act_<id>/insights`
- `fields`: `spend,impressions,reach,unique_link_clicks_ctr,actions,cost_per_action_type`
- `date_preset`: window preset bo'yicha (`yesterday`,`today`,`last_7d`,`last_30d`,`this_month`).
- `level=account`.

### Lead action_type (UI dropdown → action_type kaliti)
> Aniq satrlar implementatsiyada jonli API'ga tekshiriladi (versiyaga qarab biroz farq qiladi). Boshlang'ich curated ro'yxat:

| UI yorlig'i | action_type (taxminiy) |
|-------------|------------------------|
| Lead forma (Instant Form) | `lead` / `leadgen_grouped` |
| Xabar boshlandi (Messaging) | `onsite_conversion.messaging_conversation_started_7d` |
| Sayt Lead (pixel) | `offsite_conversion.fb_pixel_lead` |
| Purchase | `offsite_conversion.fb_pixel_purchase` |
| Ro'yxatdan o'tish | `offsite_conversion.fb_pixel_complete_registration` |
| Meta standart natija (fallback) | optimizatsiya bo'yicha `cost_per_result` |

- `lead_count` = `actions` ichidan tanlangan `action_type` qiymati.
- `cost_per_lead` = `spend / lead_count` (yoki `cost_per_action_type` dan).

---

## 8. Telegram hisobot shabloni

Telegram HTML, o'zbekcha. Faqat **yoqilgan** metrikalar qatori chiqadi:

```
📊 Hisobot — {account_name}
🗓 {window_label} · {date_range}

💰 Sarf: {spend} {currency}
🎯 Lidlar: {lead_count}
📉 CPL: {cost_per_lead} {currency}
👁 Ko'rsatildi: {impressions}
📣 Qamrov: {reach}
🔗 Unique CTR: {unique_ctr}%

⏱ {sent_at}
```

Misol:
```
📊 Hisobot — Mijoz: Ortiqov Shop
🗓 Kecha · 12-iyun 2026

💰 Sarf: 1 250 000 so'm
🎯 Lidlar: 34
📉 CPL: 36 764 so'm
👁 Ko'rsatildi: 84 210
📣 Qamrov: 61 540
🔗 Unique CTR: 2.4%

⏱ 13-iyun 09:00
```

---

## 9. Metrikalar (MetricKey)

| Kalit | Yorliq | Manba |
|-------|--------|-------|
| `ad_spend` | Sarf | `spend` |
| `cost_per_lead` | CPL | hisoblanadi |
| `impressions` | Ko'rsatildi | `impressions` |
| `reach` | Qamrov | `reach` |
| `lead_count` | Lidlar | `actions[action_type]` |
| `unique_ctr` | Unique CTR | `unique_link_clicks_ctr` |

---

## 10. Env o'zgaruvchilari

```
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
TZ=Asia/Tashkent

DATABASE_URL=postgres://hisobotchi:change-me@postgres:5432/hisobotchi
POSTGRES_USER=hisobotchi
POSTGRES_PASSWORD=change-me
POSTGRES_DB=hisobotchi

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_BOT_POLLING_ENABLED=true

SESSION_SECRET=<≥32 belgi>

META_APP_ID=...
META_APP_SECRET=...
META_OAUTH_REDIRECT_URL=https://<domen>/meta/callback
META_TOKEN_ENCRYPTION_KEY=<≥32 belgi>
META_GRAPH_API_VERSION=v23.0
META_OAUTH_SCOPES=ads_read,business_management

APP_BASE_URL=https://<domen>
FRONTEND_URL=https://<domen>
```

---

## 11. Xavflar va ochiq savollar

**Xavflar:**
- Meta App Review cho'zilishi → public onboarding kechikadi (mitigatsiya: test users).
- Bot-login bot polling'ga bog'liq — bot o'lsa login ishlamaydi (bot mahsulotning yadrosi, baribir doim ishlashi kerak).
- Bitta bot token bir vaqtda faqat bitta joyda polling qiladi (dev + prod konflikti) — dev'da alohida token yoki polling=false.
- `action_type` satrlari versiya/optimizatsiyaga qarab farq qilishi.
- Meta Insights latency/rate-limit; "today" oynasi yangilanish kechikishi.

**Qarorlar (tasdiqlandi):**
- **Login** = Telegram **bot deep-link** (EduBaza uslubi): `login_token` + bot Start + poll. Widget/HMAC/`setdomain` EMAS — localhost'da ham ishlaydi, login DM yoqishni avtomatik hal qiladi. Google login v1'dan tashqarida.
- **Session** = Postgres'da saqlanadigan opaque session (HttpOnly/Secure cookie + `Session` jadvali), JWT emas — bekor qilish (logout / token compromise / Meta uzilishi) imkoni uchun. Redis yo'q.
- **6 metrika** standart hammasi yoniq, har Report'da toggle. `lead_count` va `cost_per_lead` faqat lead `action_type` tanlangan bo'lsa ko'rsatiladi (aks holda yashirin / "lead turini tanlang" ogohlantirish).
- **CTR** = `unique_link_clicks_ctr` (Unique Link CTR) — "all clicks" emas; like/komment/expand'ni hisoblamaydi, lead/traffic uchun haqiqiy qiziqishni aks ettiradi. UI yorlig'i "Unique CTR". (Aniq field nomi implementatsiyada jonli API'ga tekshiriladi.)
- **Onboarding** (birinchi martalik wizard): Telegram bot-login (DM avtomatik yoqiladi) → Facebook ulash → account tanlash → guruh ulash → Report yaratish. Keyin barcha bo'limlar mustaqil ochiladi (qat'iy gate emas).
- **Pul formati** currency-aware (account `currency` Meta'dan): UZS = butun son + bo'sh joy ("1 250 000 so'm"); USD/EUR kabi = 2 kasr ("$1 250.50"). CPL shu qoidada yaxlitlanadi.

---

## 12. UI / Dizayn primitivlari

**Karkas (app shell):** chap collapsible sidebar (mobil: sheet'ga aylanadi) + topbar (sahifa sarlavhasi · "Yangi hisobot" CTA · avatar menyu). Sidebar bo'limlari: Hisobotlar, Guruhlar, Ulanishlar, Tarix, Sozlamalar.

**Mavzu:** light + dark, system'ga moslashadi + qo'lda toggle.

**Accent:** blue (info ramp). Status ranglari: `success`=Aktiv, `danger`=Xato, `secondary`=O'chiq.

**Hisobotlar ro'yxati:** karta ko'rinishida. Har karta: account → guruh, status badge, metrika chiplari, jadval (vaqtlar · kunlar · davr), keyingi yuborish, on/off switch, tahrirlash. Xato holatida karta qizil banner + "Qayta ulash" tugmasi (parallel bot DM yuboradi).

**Report editor:** o'ngdan **side sheet**, bo'limli yagona forma — Manba (account/guruh select) → Metrikalar (6 switch + lead turi select; Lidlar/CPL faqat lead turi tanlangan bo'lsa faol) → Jadval (davr segmented · vaqt-chiplari · hafta-kuni toggle group · timezone select). Footer: Sinov yuborish · Bekor · Saqlash.

**Onboarding:** alohida stepper wizard (DM yoqish → FB → account tanlash → guruh ulash → birinchi Report).

**shadcn/ui komponent inventari:**
- Layout/nav: `sidebar`, `separator`, `scroll-area`, `button`, `dropdown-menu`, `avatar`
- Karta/ro'yxat: `card`, `badge`, `switch`
- Sheet/forma: `sheet`, `form` (react-hook-form + zod), `input`, `select`, `combobox`/`command`, `toggle-group` (kunlar, davr), `label`
- Fikr-bildirish: `sonner` (toast), `alert`, `alert-dialog` (o'chirish tasdig'i), `tooltip`, `skeleton`, `tabs`
- Tarix: `data-table` (tanstack-table) + `badge` (filtrlar `tabs`/`select`)

**Bespoke (qo'lda yig'iladi):** time-chips input, weekday toggle group, metric toggle list, report card, status banner.

---

## 13. Keyingi qadam → M2

M0 (Scaffolding) va M1 (Auth) yakunlandi va tekshirildi. Endi **M2 — Meta ulash**:
Facebook OAuth (`ads_read,business_management`, `state`) boshlash → callback'da code → short-lived →
**long-lived** token → AES-256-GCM shifrlab `MetaConnection` saqlash → `/me/adaccounts` sync →
`AdAccount` upsert (default: disabled) → account yoqish/o'chirish UI + per-account default lead
`action_type` → token muddati/xatosini aniqlash. Parallel: Meta App Review submission.

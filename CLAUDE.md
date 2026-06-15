# CLAUDE.md

Bu fayl Claude (va dasturchilar) uchun loyiha bo'yicha asosiy yo'riqnoma. Texnik tafsilotlar va yo'l xaritasi uchun [PLAN.md](PLAN.md) ga qarang.

---

## 1. Loyiha haqida

**Hisobotchi** — targetologlar (Facebook/Meta reklama mutaxassislari) uchun mo'ljallangan **multi-tenant SaaS**. Foydalanuvchi o'z Meta reklama akkauntini ulaydi, Telegram botni mijoz guruhiga qo'shadi va belgilangan vaqtlarda guruhga avtomatik reklama hisobotlari yuborilib turadi.

**Asosiy qiymat:** targetolog har kuni qo'lda screenshot tashlash o'rniga, bir marta sozlab qo'yadi — bot o'zi belgilangan soatda mijoz guruhiga toza, formatlangan hisobot tashlaydi.

**Maqsadli foydalanuvchi:** mustaqil targetolog (yakka tartibda). Jamoa/agentlik workspace'lari **v1 doirasidan tashqarida**.

---

## 2. Domen lug'ati (glossary)

Kod va muloqotda shu atamalardan foydalaning:

| Atama | Ma'no |
|-------|-------|
| **User** | Dashboardga Telegram orqali kirgan targetolog. Tizimdagi tenant chegarasi — barcha ma'lumot `user_id` bo'yicha izolyatsiya qilinadi. |
| **MetaConnection** | Foydalanuvchining Facebook OAuth ulanishi (uzoq muddatli token, shifrlangan). |
| **AdAccount** | Meta reklama akkaunti (`act_<id>`). Meta'dan sync qilinadi; foydalanuvchi qaysilarini ishlatishni yoqadi. |
| **TelegramGroup** | Bot qo'shilgan va foydalanuvchiga bog'langan Telegram guruhi. |
| **Report** | **Join entity / jadval.** Bitta `AdAccount` ni bitta `TelegramGroup` ga bog'laydi + tanlangan metrikalar, lead turi, davr, yuborish vaqtlari/kunlari. Mahsulotning markaziy birligi. |
| **ReportRun** | Bitta yuborilgan (yoki urinilgan) hisobot yozuvi: status, metrika snapshot, xato sababi. Tarix shu yerdan keladi. |
| **Lead action_type** | Meta'da "lead/natija" sifatida sanaladigan konversiya hodisasi (har account uchun foydalanuvchi tanlaydi). |
| **Window preset** | Hisobot qamrayotgan vaqt oralig'i (kecha / bugun / 7 kun / 30 kun / shu oy). |
| **Pairing token** | `startgroup` deep-link orqali guruhni foydalanuvchiga xavfsiz bog'lash uchun bir martalik imzolangan token. |

---

## 3. Arxitektura

**Eng muhim qoida:** bu mahsulot **doimiy ishlaydigan servis** — Telegram long-polling va cron scheduler uzluksiz Node jarayonini talab qiladi. Serverless EMAS.

```
┌─────────────────────────────────────────────────────────┐
│                    VPS (Docker Compose)                  │
│                                                          │
│  ┌────────────┐   ┌──────────────────────────────────┐  │
│  │   Caddy    │   │           api (NestJS)           │  │
│  │  (HTTPS,   │──▶│  ┌────────────────────────────┐  │  │
│  │  reverse   │   │  │ REST API (auth, reports…)  │  │  │
│  │  proxy)    │   │  ├────────────────────────────┤  │  │
│  └─────┬──────┘   │  │ grammY bot (long-polling)  │  │  │
│        │          │  ├────────────────────────────┤  │  │
│        │          │  │ @nestjs/schedule (cron)    │  │  │
│        │          │  └────────────────────────────┘  │  │
│        │          └───────────────┬──────────────────┘  │
│        │                          │                      │
│  ┌─────▼──────┐            ┌───────▼────────┐             │
│  │ web (React │            │   PostgreSQL    │            │
│  │ /Vite SPA) │            │   (Prisma)      │            │
│  └────────────┘            └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
        ▲                              ▲
        │ Telegram Login Widget        │ Meta Graph API v23.0
        │ + grammY ↔ Bot API           │ (OAuth + Insights)
```

- **api** — bitta NestJS jarayoni uchta vazifani bajaradi: HTTP REST API, Telegram bot (grammY long-polling), va cron scheduler (`@nestjs/schedule`). Nest modullari bu uch concern'ni toza ajratadi.
- **web** — React/Vite SPA, `api` bilan REST orqali gaplashadi, cookie session.
- **postgres** — yagona ma'lumotlar bazasi (Redis yo'q; scheduler in-process).
- **Caddy** — avtomatik HTTPS + reverse proxy.
- **Dev** — bot-login domenga bog'liq emas (localhost'da ishlaydi). Faqat **Meta OAuth** public HTTPS talab qilgani uchun lokalda **Cloudflare Tunnel / ngrok** kerak bo'ladi.

---

## 4. Tech stack

| Qatlam | Tanlov |
|--------|--------|
| Til | TypeScript (hamma joyda) |
| Backend | **NestJS** (Node) — API + bot + scheduler bitta jarayon |
| Telegram | **grammY** (long-polling) |
| Meta | Graph API **v23.0**, scopes: `ads_read`, `business_management` |
| Frontend | **React + Vite + Tailwind + shadcn/ui** |
| ORM | **Prisma** |
| DB | **PostgreSQL** |
| Scheduler | `@nestjs/schedule` (har daqiqa tick) |
| Auth | Telegram **bot deep-link login** (login_token + poll) + opaque cookie session |
| Deploy | **Docker Compose** + Caddy (avtomatik HTTPS) VPS'da |
| Monorepo | pnpm workspaces |

---

## 5. Repo tuzilishi

```
/
├── docker-compose.yml          # prod: caddy + api + web + postgres
├── docker-compose.dev.yml      # dev override
├── Caddyfile
├── .env.example
├── pnpm-workspace.yaml
├── apps/
│   ├── api/                    # NestJS: API + bot + scheduler
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/
│   │       ├── main.ts
│   │       └── modules/
│   │           ├── auth/       # Telegram login verify, sessions, guards
│   │           ├── users/
│   │           ├── meta/       # OAuth, Graph client, Insights, ad accounts sync
│   │           ├── telegram/   # grammY bot, /start, group pairing, sender, DM
│   │           ├── reports/    # Report CRUD + validation
│   │           ├── scheduler/  # cron tick → due reports → dispatch
│   │           ├── report-runs/# tarix, snapshot, status
│   │           └── common/     # encryption, config, PrismaService
│   └── web/                    # React + Vite + shadcn
│       └── src/
│           ├── routes/
│           ├── components/ui/  # shadcn primitivlar
│           └── lib/            # api client, auth helpers
└── packages/
    └── shared/                 # umumiy TS turlar: MetricKey, DTO, enum'lar
```

---

## 6. Ma'lumotlar modeli (qisqa)

To'liq sxema [PLAN.md](PLAN.md) da. Asosiy entity'lar va bog'lanishlar:

```
User 1──N Session
User 1──N MetaConnection 1──N AdAccount
User 1──N TelegramGroup
User 1──N Report ──┬─ N:1 AdAccount
                   └─ N:1 TelegramGroup
Report 1──N ReportRun
```

- Bitta **guruh** bir nechta **Report** olishi mumkin; bitta **account** bir nechta **Report** ga ulanishi mumkin. `Report` — join entity.
- Barcha entity'da `user_id` bor — tenant izolyatsiyasi har query'da majburiy.

---

## 7. Asosiy oqimlar

1. **Login (bot deep-link)** — saytda "Telegram" tugmasi → backend bir martalik `login_token` yaratadi → `t.me/<bot>?start=login_<token>` deep-link ochiladi → foydalanuvchi botda **Start** bosadi → bot `ctx.from`'dan uni taniydi (Telegram'dan kelgan, ishonchli), token'ni userga bog'laydi + `dm_enabled=true` → sayt fonda `poll` qiladi → token bog'langach session cookie o'rnatiladi va dashboardga kiradi. **Widget/HMAC/`setdomain` ishlatilmaydi** (localhost'da ham ishlaydi).
2. **Facebook ulash** — OAuth dialog (`ads_read,business_management`) → code → long-lived token (shifrlangan saqlanadi) → `/me/adaccounts` sync → foydalanuvchi kerakli accountlarni yoqadi.
3. **Guruh pairing** — dashboard "Guruhni ulash" → `t.me/<bot>?startgroup=<token>` → bot guruhga qo'shiladi va `/start <token>` oladi → token→user aniqlanadi → `TelegramGroup` bog'lanadi.
4. **Report yaratish** — account + guruh + metrikalar + lead action_type + window preset + vaqtlar/kunlar.
5. **Rejalashtirilgan yuborish** — har daqiqa cron tick → o'z timezone'ida vaqti kelgan, yoqilgan Report'larni topadi → Meta Insights'dan tortadi → xabar render qiladi → guruhga yuboradi → `ReportRun` yoziladi.
6. **Xatolik ogohlantirishi** — yuborish muvaffaqiyatsiz bo'lsa (token muddati, API xato, bot guruhdan chiqarilgan) → `ReportRun.status=failed` → bot foydalanuvchiga **DM** yuboradi + dashboardda qizil belgi + "qayta ulang".

---

## 8. Tashqi integratsiyalar

### Telegram (grammY)
- Yagona umumiy bot (barcha tenant'lar uchun bitta token).
- Long-polling (`TELEGRAM_BOT_POLLING_ENABLED=true`).
- `/start [payload]` — `login_<token>` (private) → bot-login: token'ni `ctx.from` userga bog'laydi + `dm_enabled=true` → "kirdingiz" javobi; guruhda payload (pairing token) → guruh pairing; private payloadsiz → salom + DM yoqish.
- `my_chat_member` update — guruhga qo'shilish/chiqarilishni kuzatadi.
- DM yuborish uchun foydalanuvchi botni **private'da Start** qilgan bo'lishi shart (onboarding qadami).

### Meta (Graph API v23.0)
- OAuth: `ads_read`, `business_management`.
- Insights fields: `spend`, `impressions`, `reach`, `unique_link_clicks_ctr`, `actions`, `cost_per_action_type`.
- `lead_count` / `cost_per_lead` — tanlangan `action_type` bo'yicha `actions` dan olinadi.
- Window → Meta `date_preset` (yesterday / today / last_7d / last_30d / this_month).
- **Dev mode**: faqat app'da roli bor FB akkauntlar ulanadi. Advanced Access App Review parallel olinadi.

---

## 9. Konventsiyalar

- **Til:** kod, identifikator, kommit — inglizcha. Foydalanuvchiga ko'rinadigan matn (bot xabarlari, UI) — **o'zbekcha (lotin)**. Ruscha lokalizatsiya — keyin.
- **Timezone:** har `User` va `Report` da timezone bor (standart `Asia/Tashkent`). Scheduler taqqoslashlarni har report'ning timezone'ida bajaradi. UTC'da saqla, ko'rsatishda konvert qil.
- **Maxfiy ma'lumot:** Meta tokenlari bazada **shifrlangan holda** (AES-256-GCM, `META_TOKEN_ENCRYPTION_KEY`). Tokenni hech qachon log qilma yoki frontendga yuborma.
- **Tenant izolyatsiyasi:** har bir DB so'rovi `user_id` bo'yicha filtrlanishi shart. Guard/interceptor orqali majburiy qil.
- **Pul birligi:** currency-aware — har account o'z `currency` sida (Meta'dan). UZS = butun son + bo'sh joy ajratilgan ("1 250 000 so'm"); USD/EUR kabi = 2 kasr ("$1 250.50"). So'mga qotirib qo'yma.
- **Metrika kalitlari:** `ad_spend`, `cost_per_lead`, `impressions`, `reach`, `lead_count`, `unique_ctr` (shared paketda enum).
- **UI:** chap sidebar + topbar shell, blue accent, light/dark toggle, hisobotlar karta ko'rinishida, Report editor o'ngdan side-sheet. Batafsil va shadcn inventari — [PLAN.md](PLAN.md) §12.

---

## 10. Buyruqlar

> Aniq script'lar M0 (scaffolding) da yakunlanadi. Mo'ljal:

```bash
pnpm install                      # barcha workspace bog'liqliklari
pnpm --filter api dev             # NestJS (api+bot+scheduler) dev rejimda
pnpm --filter web dev             # Vite dev server
pnpm --filter api prisma:migrate  # DB migratsiya
pnpm --filter api prisma:studio   # DB ni ko'rish
pnpm test                         # testlar

docker compose -f docker-compose.yml -f docker-compose.dev.yml up   # lokal to'liq stek
docker compose up -d              # prod (VPS)
```

Dev'da Telegram Login uchun: tunnel ko'tar (`cloudflared tunnel --url http://localhost:3000`) va domenni BotFather `/setdomain` ga, hamda Meta redirect URL'ga qo'sh.

---

## 11. Muhim cheklovlar va gotcha'lar

- ⚠️ **Meta App Review** — `ads_read`/`business_management` Advanced Access tasdiqlanmaguncha faqat app'ga rol berilgan FB akkauntlar ulanadi. Public onboarding shunga bog'liq. Review'ni erta boshla.
- ✅ **Login domenga bog'liq emas** — bot deep-link login ishlatilgani uchun BotFather `/setdomain` va public HTTPS shart emas; localhost dev'da ham bir xil ishlaydi. (Eski Widget yondashuvi tashlab yuborildi.)
- ⚠️ **DM uchun private start** — bot foydalanuvchiga faqat u botni private'da Start qilgan bo'lsa DM yubora oladi. Onboarding'da buni so'ra.
- ⚠️ **Ikki marta yuborish** — scheduler har daqiqa tick qiladi; `ReportRun` ning `scheduled_for` bo'yicha unikalligi bilan dublikat yuborishni to'sib qo'y.
- ⚠️ **Meta rate limits & latency** — Insights so'rovlarini cheklangan parallellik bilan yubor; xatoda retry/backoff.
- ⚠️ **Token muddati** — long-lived token ~60 kun. Muddati yaqinlashganda yoki xatoda → `expired` belgila + reconnect ogohlantirish.

---

## 12. Xavfsizlik

- Meta tokenlari AES-256-GCM bilan shifrlangan (`META_TOKEN_ENCRYPTION_KEY`, ≥32 belgi).
- Session: Postgres'da saqlanadigan opaque token (HttpOnly + Secure cookie), bekor qilinadigan; cookie imzosi uchun `SESSION_SECRET` ≥32 belgi. JWT emas.
- Bot-login: foydalanuvchi `ctx.from` orqali aniqlanadi (Telegram'dan bevosita kelgan, ishonchli — mijoz hash'i yo'q). `login_token` bir martalik, muddatli (~5 daqiqa), tasodifiy; session cookie faqat poll orqali bir marta beriladi.
- Pairing token: bir martalik, muddatli, imzolangan.
- Har so'rovda tenant izolyatsiyasi (`user_id`).
- Maxfiy qiymatlar faqat `.env` da; repoga commit qilinmaydi.

-- CreateEnum
CREATE TYPE "MetaConnectionStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('member', 'admin', 'removed');

-- CreateEnum
CREATE TYPE "ReportRunStatus" AS ENUM ('success', 'failed');

-- CreateEnum
CREATE TYPE "WindowPreset" AS ENUM ('yesterday', 'today', 'last_7d', 'last_30d', 'this_month');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "photo_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "dm_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "meta_user_id" TEXT NOT NULL,
    "access_token_enc" BYTEA NOT NULL,
    "token_expires_at" TIMESTAMPTZ(6),
    "scopes" TEXT[],
    "status" "MetaConnectionStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "meta_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "meta_connection_id" UUID NOT NULL,
    "act_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "account_timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "default_lead_action_type" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_groups" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "chat_type" TEXT NOT NULL,
    "bot_status" "BotStatus" NOT NULL DEFAULT 'member',
    "linked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_pairing_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_pairing_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "ad_account_id" UUID NOT NULL,
    "telegram_group_id" UUID NOT NULL,
    "name" TEXT,
    "metrics" TEXT[],
    "lead_action_type" TEXT,
    "window_preset" "WindowPreset" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tashkent',
    "send_times" JSONB NOT NULL,
    "weekdays" INTEGER[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_runs" (
    "id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scheduled_for" TIMESTAMPTZ(6) NOT NULL,
    "ran_at" TIMESTAMPTZ(6),
    "status" "ReportRunStatus" NOT NULL,
    "window_start" TIMESTAMPTZ(6),
    "window_end" TIMESTAMPTZ(6),
    "metrics_snapshot" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "telegram_message_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "meta_connections_user_id_idx" ON "meta_connections"("user_id");

-- CreateIndex
CREATE INDEX "ad_accounts_user_id_idx" ON "ad_accounts"("user_id");

-- CreateIndex
CREATE INDEX "ad_accounts_meta_connection_id_idx" ON "ad_accounts"("meta_connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_user_id_act_id_key" ON "ad_accounts"("user_id", "act_id");

-- CreateIndex
CREATE INDEX "telegram_groups_user_id_idx" ON "telegram_groups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_groups_user_id_chat_id_key" ON "telegram_groups"("user_id", "chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_pairing_tokens_token_key" ON "group_pairing_tokens"("token");

-- CreateIndex
CREATE INDEX "group_pairing_tokens_user_id_idx" ON "group_pairing_tokens"("user_id");

-- CreateIndex
CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");

-- CreateIndex
CREATE INDEX "reports_enabled_idx" ON "reports"("enabled");

-- CreateIndex
CREATE INDEX "report_runs_user_id_idx" ON "report_runs"("user_id");

-- CreateIndex
CREATE INDEX "report_runs_report_id_idx" ON "report_runs"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_runs_report_id_scheduled_for_key" ON "report_runs"("report_id", "scheduled_for");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_connections" ADD CONSTRAINT "meta_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_meta_connection_id_fkey" FOREIGN KEY ("meta_connection_id") REFERENCES "meta_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_groups" ADD CONSTRAINT "telegram_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_pairing_tokens" ADD CONSTRAINT "group_pairing_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_ad_account_id_fkey" FOREIGN KEY ("ad_account_id") REFERENCES "ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_telegram_group_id_fkey" FOREIGN KEY ("telegram_group_id") REFERENCES "telegram_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

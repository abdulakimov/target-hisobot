-- AlterTable: manual-activation paywall fields on users
ALTER TABLE "users" ADD COLUMN     "access_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "access_granted_at" TIMESTAMPTZ(6),
ADD COLUMN     "access_granted_by_tg_id" BIGINT,
ADD COLUMN     "access_note" TEXT;

-- CreateTable: append-only audit of access grants/revokes
CREATE TABLE "access_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "days" INTEGER,
    "previous_expires_at" TIMESTAMPTZ(6),
    "new_expires_at" TIMESTAMPTZ(6),
    "granted_by_tg_id" BIGINT,
    "note" TEXT,
    "external_ref" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_grants_user_id_idx" ON "access_grants"("user_id");

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grandfather existing users with a 14-day window so a just-deployed live user is not
-- abruptly locked out. New signups (created after deploy) start NULL = no access,
-- per the "no trial" decision.
UPDATE "users" SET "access_expires_at" = now() + interval '14 days' WHERE "access_expires_at" IS NULL;

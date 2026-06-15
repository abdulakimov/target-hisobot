-- CreateTable
CREATE TABLE "login_tokens" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "claimed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_tokens_token_key" ON "login_tokens"("token");

-- CreateIndex
CREATE INDEX "login_tokens_expires_at_idx" ON "login_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "login_tokens" ADD CONSTRAINT "login_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

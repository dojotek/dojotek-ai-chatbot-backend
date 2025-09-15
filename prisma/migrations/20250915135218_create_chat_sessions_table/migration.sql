-- CreateTable
CREATE TABLE "public"."chat_sessions" (
    "id" UUID NOT NULL,
    "chat_agent_id" UUID NOT NULL,
    "customer_staff_id" UUID NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "platform_thread_id" VARCHAR(255),
    "session_data" JSONB,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_sessions_customer_staff_id_chat_agent_id_platform_idx" ON "public"."chat_sessions"("customer_staff_id", "chat_agent_id", "platform");

-- AddForeignKey
ALTER TABLE "public"."chat_sessions" ADD CONSTRAINT "chat_sessions_chat_agent_id_fkey" FOREIGN KEY ("chat_agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_sessions" ADD CONSTRAINT "chat_sessions_customer_staff_id_fkey" FOREIGN KEY ("customer_staff_id") REFERENCES "public"."customer_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

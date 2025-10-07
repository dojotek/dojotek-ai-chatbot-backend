-- CreateTable
CREATE TABLE "public"."channels" (
    "id" UUID NOT NULL,
    "chat_agent_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "platform" VARCHAR(50) NOT NULL,
    "workspace_id" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channels_chat_agent_id_platform_workspace_id_key" ON "public"."channels"("chat_agent_id", "platform", "workspace_id");

-- AddForeignKey
ALTER TABLE "public"."channels" ADD CONSTRAINT "channels_chat_agent_id_fkey" FOREIGN KEY ("chat_agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

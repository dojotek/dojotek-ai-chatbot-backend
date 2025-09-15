-- CreateTable
CREATE TABLE "public"."chat_agent_knowledges" (
    "id" UUID NOT NULL,
    "chat_agent_id" UUID NOT NULL,
    "knowledge_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_agent_knowledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_agent_knowledges_chat_agent_id_knowledge_id_key" ON "public"."chat_agent_knowledges"("chat_agent_id", "knowledge_id");

-- AddForeignKey
ALTER TABLE "public"."chat_agent_knowledges" ADD CONSTRAINT "chat_agent_knowledges_chat_agent_id_fkey" FOREIGN KEY ("chat_agent_id") REFERENCES "public"."chat_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_agent_knowledges" ADD CONSTRAINT "chat_agent_knowledges_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

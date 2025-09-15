-- CreateTable
CREATE TABLE "public"."knowledge_files" (
    "id" UUID NOT NULL,
    "knowledge_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "knowledge_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."knowledge_files" ADD CONSTRAINT "knowledge_files_knowledge_id_fkey" FOREIGN KEY ("knowledge_id") REFERENCES "public"."knowledges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

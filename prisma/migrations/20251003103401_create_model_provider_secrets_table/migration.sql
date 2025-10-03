-- CreateTable
CREATE TABLE "public"."model_provider_secrets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "secret_storage_pointer" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "model_provider_secrets_pkey" PRIMARY KEY ("id")
);

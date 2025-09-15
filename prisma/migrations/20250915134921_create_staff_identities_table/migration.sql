-- CreateTable
CREATE TABLE "public"."customer_staff_identities" (
    "id" UUID NOT NULL,
    "customer_staff_id" UUID NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "platform_user_id" VARCHAR(255) NOT NULL,
    "platform_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "customer_staff_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_staff_identities_platform_platform_user_id_key" ON "public"."customer_staff_identities"("platform", "platform_user_id");

-- AddForeignKey
ALTER TABLE "public"."customer_staff_identities" ADD CONSTRAINT "customer_staff_identities_customer_staff_id_fkey" FOREIGN KEY ("customer_staff_id") REFERENCES "public"."customer_staffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum for lead status
CREATE TYPE "lead_status_enum" AS ENUM ('new', 'contacted', 'converted');

-- CreateTable for offer_leads
CREATE TABLE "offer_leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "user_id" UUID,
    "user_phone" VARCHAR(20) NOT NULL,
    "user_name" VARCHAR(255),
    "status" "lead_status_enum" NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contacted_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "offer_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_offer_leads_offer_id" ON "offer_leads"("offer_id");
CREATE INDEX "idx_offer_leads_user_id" ON "offer_leads"("user_id");
CREATE INDEX "idx_offer_leads_status" ON "offer_leads"("status");
CREATE INDEX "idx_offer_leads_created_at" ON "offer_leads"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "offer_leads" ADD CONSTRAINT "offer_leads_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "offer_leads" ADD CONSTRAINT "offer_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

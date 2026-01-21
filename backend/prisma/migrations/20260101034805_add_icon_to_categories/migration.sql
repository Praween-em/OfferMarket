-- CreateEnum
CREATE TYPE "brand_type_enum" AS ENUM ('local', 'chain', 'franchise');

-- CreateEnum
CREATE TYPE "business_type_enum" AS ENUM ('electronics', 'clothing', 'grocery', 'footwear', 'restaurant', 'other');

-- CreateEnum
CREATE TYPE "media_type_enum" AS ENUM ('image', 'video', 'other');

-- CreateEnum
CREATE TYPE "notification_type_enum" AS ENUM ('new_offer', 'offer_expiring', 'offer_approved', 'offer_rejected', 'generic');

-- CreateEnum
CREATE TYPE "offer_status_enum" AS ENUM ('draft', 'pending', 'active', 'paused', 'expired', 'rejected');

-- CreateEnum
CREATE TYPE "offer_type_enum" AS ENUM ('flat', 'percentage', 'buy_x_get_y', 'bogo', 'cashback', 'tiered_volume', 'tiered_spending', 'bundle_fixed_price', 'free_gift', 'loyalty_points', 'mystery_reward', 'referral', 'first_order', 'custom');

-- CreateEnum
CREATE TYPE "report_reason_enum" AS ENUM ('fake', 'misleading', 'expired', 'inaccurate', 'spam', 'other');

-- CreateEnum
CREATE TYPE "report_status_enum" AS ENUM ('pending', 'reviewed', 'action_taken');

-- CreateEnum
CREATE TYPE "role_enum" AS ENUM ('consumer', 'business_owner', 'admin');

-- CreateEnum
CREATE TYPE "user_status_enum" AS ENUM ('active', 'suspended', 'banned');

-- CreateTable
CREATE TABLE "api_rate_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "limit_type" VARCHAR(32),
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "performed_by" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "branch_name" VARCHAR(255),
    "address_line" TEXT,
    "city" VARCHAR(128) NOT NULL,
    "area" VARCHAR(128),
    "state" VARCHAR(128),
    "pincode" VARCHAR(16),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "location" geography,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_metrics" (
    "business_id" UUID NOT NULL,
    "followers" BIGINT NOT NULL DEFAULT 0,
    "offers_posted" BIGINT NOT NULL DEFAULT 0,
    "last_metric_updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "business_metrics_pkey" PRIMARY KEY ("business_id")
);

-- CreateTable
CREATE TABLE "business_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID,
    "reported_by" UUID,
    "reason" "report_reason_enum" NOT NULL,
    "notes" TEXT,
    "status" "report_status_enum" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "business_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "business_type" "business_type_enum" NOT NULL DEFAULT 'other',
    "brand_type" "brand_type_enum" NOT NULL DEFAULT 'local',
    "gst_number" VARCHAR(32),
    "description" TEXT,
    "logo_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(128) NOT NULL,
    "parent_id" UUID,
    "icon" VARCHAR(16),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID,
    "url" TEXT NOT NULL,
    "media_type" "media_type_enum" NOT NULL DEFAULT 'image',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "business_id" UUID,
    "offer_id" UUID,
    "notification_type" "notification_type_enum" NOT NULL DEFAULT 'generic',
    "title" VARCHAR(255),
    "body" TEXT,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_categories" (
    "offer_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "offer_categories_pkey" PRIMARY KEY ("offer_id","category_id")
);

-- CreateTable
CREATE TABLE "offer_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "offer_id" UUID,
    "claim_token" UUID DEFAULT gen_random_uuid(),
    "status" VARCHAR(32) DEFAULT 'created',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMPTZ(6),

    CONSTRAINT "offer_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_clicks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "offer_id" UUID,
    "action" VARCHAR(128),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "item_role" VARCHAR(16),
    "item_name" VARCHAR(255),
    "item_category" VARCHAR(128),
    "brand" VARCHAR(128),
    "model" VARCHAR(128),
    "min_price" DECIMAL(12,2),
    "max_price" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "media_asset_id" UUID,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_metrics" (
    "offer_id" UUID NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "claims" BIGINT NOT NULL DEFAULT 0,
    "saves" BIGINT NOT NULL DEFAULT 0,
    "last_metric_updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "offer_metrics_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "offer_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID,
    "reported_by" UUID,
    "reason" "report_reason_enum" NOT NULL,
    "notes" TEXT,
    "status" "report_status_enum" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "offer_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "rule_type" "offer_type_enum" NOT NULL,
    "discount_value" DECIMAL(12,4),
    "currency_code" CHAR(3) DEFAULT 'INR',
    "buy_quantity" INTEGER,
    "get_quantity" INTEGER,
    "min_purchase_amount" DECIMAL(12,2),
    "max_discount_amount" DECIMAL(12,2),
    "cashback_amount" DECIMAL(12,2),
    "conditions" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "day_of_week" SMALLINT,
    "start_time" TIME(6),
    "end_time" TIME(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "offer_id" UUID,
    "session_id" TEXT,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "branch_id" UUID NOT NULL,
    "campaign_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "short_description" VARCHAR(500),
    "description" TEXT,
    "offer_scope" VARCHAR(32),
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "offer_status_enum" NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_followed_businesses" (
    "user_id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "followed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_followed_businesses_pkey" PRIMARY KEY ("user_id","business_id")
);

-- CreateTable
CREATE TABLE "user_saved_offers" (
    "user_id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_offers_pkey" PRIMARY KEY ("user_id","offer_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(320),
    "role" "role_enum" NOT NULL DEFAULT 'consumer',
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "user_status_enum" NOT NULL DEFAULT 'active',
    "display_name" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_rate_limits_key_type" ON "api_rate_limits"("key", "limit_type");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_branches_businessid" ON "business_branches"("business_id");

-- CreateIndex
CREATE INDEX "idx_branches_city" ON "business_branches"("city");

-- CreateIndex
CREATE INDEX "idx_business_reports_businessid_status" ON "business_reports"("business_id", "status");

-- CreateIndex
CREATE INDEX "idx_businesses_owner" ON "businesses"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_owner_businessname" ON "businesses"("owner_id", "business_name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "idx_media_owner" ON "media_assets"("owner_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_offer_categories_cat" ON "offer_categories"("category_id");

-- CreateIndex
CREATE INDEX "idx_offer_claims_offerid" ON "offer_claims"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_claims_userid" ON "offer_claims"("user_id");

-- CreateIndex
CREATE INDEX "idx_offer_clicks_offerid" ON "offer_clicks"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_items_offerid" ON "offer_items"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_media_offerid" ON "offer_media"("offer_id", "sort_order");

-- CreateIndex
CREATE INDEX "idx_offer_reports_offerid_status" ON "offer_reports"("offer_id", "status");

-- CreateIndex
CREATE INDEX "idx_offer_rules_offerid" ON "offer_rules"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_rules_ruletype" ON "offer_rules"("rule_type");

-- CreateIndex
CREATE INDEX "idx_offer_schedules_offerid" ON "offer_schedules"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_views_offerid" ON "offer_views"("offer_id");

-- CreateIndex
CREATE INDEX "idx_offer_views_userid" ON "offer_views"("user_id");

-- CreateIndex
CREATE INDEX "idx_offers_branch_status_dates" ON "offers"("branch_id", "status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_offers_end_date" ON "offers"("end_date");

-- CreateIndex
CREATE INDEX "idx_offers_start_date" ON "offers"("start_date");

-- CreateIndex
CREATE INDEX "idx_offers_status_dates" ON "offers"("status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_followed_businesses_business" ON "user_followed_businesses"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_role_status" ON "users"("role", "status");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_branches" ADD CONSTRAINT "business_branches_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_metrics" ADD CONSTRAINT "business_metrics_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_reports" ADD CONSTRAINT "business_reports_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_reports" ADD CONSTRAINT "business_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_reports" ADD CONSTRAINT "business_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_categories" ADD CONSTRAINT "offer_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_categories" ADD CONSTRAINT "offer_categories_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_clicks" ADD CONSTRAINT "offer_clicks_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_clicks" ADD CONSTRAINT "offer_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_items" ADD CONSTRAINT "offer_items_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_metrics" ADD CONSTRAINT "offer_metrics_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_reports" ADD CONSTRAINT "offer_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_rules" ADD CONSTRAINT "offer_rules_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_schedules" ADD CONSTRAINT "offer_schedules_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "business_branches"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_followed_businesses" ADD CONSTRAINT "user_followed_businesses_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_followed_businesses" ADD CONSTRAINT "user_followed_businesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_saved_offers" ADD CONSTRAINT "user_saved_offers_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_saved_offers" ADD CONSTRAINT "user_saved_offers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

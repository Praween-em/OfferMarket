-- ===================================================================
-- Offer Market — Full Production-ready DDL + helpers + sample data
-- Paste into Postgres >= 13. Run in a single transaction if desired.
-- Read comments. Test in dev environment before production rollout.
-- ===================================================================

/*
  If you want geospatial queries (nearby offers), uncomment PostGIS section.
  Make sure the DB server has postgis extension installed.
*/

/* Extensions */
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- alternative uuid functions
-- CREATE EXTENSION IF NOT EXISTS postgis;  -- optional: enable for geography/geo queries

-- =========================
-- ENUM / DOMAIN TYPES
-- =========================
DO $$
BEGIN
  -- safe creation: only create if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_enum') THEN
    CREATE TYPE role_enum AS ENUM ('consumer', 'business_owner', 'admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
    CREATE TYPE user_status_enum AS ENUM ('active','suspended','banned');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type_enum') THEN
    CREATE TYPE business_type_enum AS ENUM ('electronics','clothing','grocery','footwear','restaurant','other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'brand_type_enum') THEN
    CREATE TYPE brand_type_enum AS ENUM ('local','chain','franchise');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_type_enum') THEN
    CREATE TYPE offer_type_enum AS ENUM (
      'flat',                -- Flat amount off (e.g. $10 off)
      'percentage',          -- Percentage off (e.g. 20% off)
      'buy_x_get_y',         -- Buy X quantity, get Y quantity free/discounted
      'bogo',                -- Specific case of Buy 1 Get 1
      'cashback',            -- Wallet cashback
      'tiered_volume',       -- Buy more save more (e.g. Buy 2 get 10%, Buy 3 get 20%)
      'tiered_spending',     -- Spend more save more (e.g. Spend $50 get $5 off, Spend $100 get $15 off)
      'bundle_fixed_price',  -- Bundle of items for a fixed price
      'free_gift',           -- Free gift with purchase (often threshold based)
      'loyalty_points',      -- Earn 2x points
      'mystery_reward',      -- Scratch card / Gamified
      'referral',            -- Referral bonus
      'first_order',         -- First time user discount
      'custom'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status_enum') THEN
    CREATE TYPE offer_status_enum AS ENUM ('draft','pending','active','paused','expired','rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
    CREATE TYPE media_type_enum AS ENUM ('image','video','other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason_enum') THEN
    CREATE TYPE report_reason_enum AS ENUM ('fake','misleading','expired','inaccurate','spam','other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
    CREATE TYPE report_status_enum AS ENUM ('pending','reviewed','action_taken');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE notification_type_enum AS ENUM ('new_offer','offer_expiring','offer_approved','offer_rejected','generic');
  END IF;

END$$;


-- =========================
-- UTILITY: updated_at trigger function
-- =========================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- =========================
-- 1. users
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(320),
  role role_enum NOT NULL DEFAULT 'consumer',
  is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status user_status_enum NOT NULL DEFAULT 'active',
  display_name VARCHAR(255),
  metadata JSONB,                 -- optional KYC or profile metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);


-- Attach timestamp trigger to users
DROP TRIGGER IF EXISTS trg_users_set_timestamp ON users;
CREATE TRIGGER trg_users_set_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- =========================
-- 2. businesses
-- =========================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  business_name VARCHAR(255) NOT NULL,
  business_type business_type_enum NOT NULL DEFAULT 'other',
  brand_type brand_type_enum NOT NULL DEFAULT 'local',
  gst_number VARCHAR(32),
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uniq_owner_businessname UNIQUE(owner_id, business_name)
);

CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses (owner_id);
DROP TRIGGER IF EXISTS trg_businesses_set_timestamp ON businesses;
CREATE TRIGGER trg_businesses_set_timestamp
BEFORE UPDATE ON businesses
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- =========================
-- 3. business_branches
-- =========================
CREATE TABLE IF NOT EXISTS business_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_name VARCHAR(255),
  address_line TEXT,
  city VARCHAR(128) NOT NULL,
  area VARCHAR(128),
  state VARCHAR(128),
  pincode VARCHAR(16),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  location GEOGRAPHY(POINT,4326),   -- requires PostGIS; if not using PostGIS set this null
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_city ON business_branches (city);
CREATE INDEX IF NOT EXISTS idx_branches_businessid ON business_branches (business_id);
-- If PostGIS enabled, create a spatial index:
-- CREATE INDEX IF NOT EXISTS idx_branches_location_gist ON business_branches USING GIST(location);

DROP TRIGGER IF EXISTS trg_branches_set_timestamp ON business_branches;
CREATE TRIGGER trg_branches_set_timestamp
BEFORE UPDATE ON business_branches
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- Optional trigger: populate location from lat/lng when postgis is enabled
CREATE OR REPLACE FUNCTION trg_populate_location()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
    BEGIN
      NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
    EXCEPTION WHEN undefined_function THEN
      -- PostGIS not installed; ignore
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branches_populate_location ON business_branches;
CREATE TRIGGER trg_branches_populate_location
BEFORE INSERT OR UPDATE ON business_branches
FOR EACH ROW EXECUTE FUNCTION trg_populate_location();


-- =========================
-- 4. campaigns (optional grouping for owner UX)
-- =========================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_campaigns_set_timestamp ON campaigns;
CREATE TRIGGER trg_campaigns_set_timestamp
BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- =========================
-- 5. offers (core promise)
-- =========================
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES business_branches(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  short_description VARCHAR(500),
  description TEXT,
  offer_scope VARCHAR(32) CHECK (offer_scope IN ('store_wide','category_specific','item_specific')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status offer_status_enum NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_offer_dates CHECK (start_date < end_date)
);

-- Indexes for searching active offers quickly
CREATE INDEX IF NOT EXISTS idx_offers_branch_status_dates ON offers (branch_id, status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_status_dates ON offers (status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_start_date ON offers (start_date);
CREATE INDEX IF NOT EXISTS idx_offers_end_date ON offers (end_date);

DROP TRIGGER IF EXISTS trg_offers_set_timestamp ON offers;
CREATE TRIGGER trg_offers_set_timestamp
BEFORE UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- =========================
-- 6. offer_rules (flexible rule model)
-- =========================
CREATE TABLE IF NOT EXISTS offer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  rule_type offer_type_enum NOT NULL,
  discount_value NUMERIC(12,4),      -- percent (0-100) or absolute
  currency_code CHAR(3) DEFAULT 'INR',
  buy_quantity INT,                  -- for buy_x_get_y / bogo
  get_quantity INT,                  -- for buy_x_get_y / bogo
  min_purchase_amount NUMERIC(12,2),
  max_discount_amount NUMERIC(12,2),
  cashback_amount NUMERIC(12,2),
  conditions JSONB,                  -- flexible: store structured constraints (e.g., only weekdays, allowed brands)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_rules_offerid ON offer_rules (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_rules_ruletype ON offer_rules (rule_type);


-- =========================
-- 7. offer_items (optional descriptive product-level scoping)
-- =========================
CREATE TABLE IF NOT EXISTS offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  item_role VARCHAR(16) CHECK (item_role IN ('buy','get','apply_on')),
  item_name VARCHAR(255),
  item_category VARCHAR(128),
  brand VARCHAR(128),
  model VARCHAR(128),
  min_price NUMERIC(12,2),
  max_price NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_items_offerid ON offer_items (offer_id);


-- =========================
-- 8. offer_schedules (time-window / recurring)
-- =========================
CREATE TABLE IF NOT EXISTS offer_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_schedules_offerid ON offer_schedules (offer_id);


-- =========================
-- 9. media_assets & offer_media
-- =========================
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  url TEXT NOT NULL,
  media_type media_type_enum NOT NULL DEFAULT 'image',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets (owner_id);

CREATE TABLE IF NOT EXISTS offer_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES media_assets(id),
  image_url TEXT,          -- stored for direct link if not using media_assets (backwards compability)
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_media_offerid ON offer_media (offer_id, sort_order);


-- =========================
-- 10. categories & offer_categories
-- =========================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offer_categories (
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (offer_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_categories_cat ON offer_categories (category_id);


-- =========================
-- 11. user interaction events (raw)
-- =========================
-- Keep raw events for audit/fraud and later analytics pipelines (ETL -> materialized aggregates)

CREATE TABLE IF NOT EXISTS offer_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_views_offerid ON offer_views (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_views_userid ON offer_views (user_id);

CREATE TABLE IF NOT EXISTS offer_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  action VARCHAR(128), -- e.g., 'claim', 'contact_owner', 'open_details'
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_clicks_offerid ON offer_clicks (offer_id);

CREATE TABLE IF NOT EXISTS offer_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  claim_token UUID DEFAULT gen_random_uuid(), -- can be used to verify in-store
  status VARCHAR(32) CHECK (status IN ('created','redeemed','expired','cancelled')) DEFAULT 'created',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offer_claims_offerid ON offer_claims (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_claims_userid ON offer_claims (user_id);


-- =========================
-- 12. user_saved_offers & user_followed_businesses
-- =========================
CREATE TABLE IF NOT EXISTS user_saved_offers (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, offer_id)
);

CREATE TABLE IF NOT EXISTS user_followed_businesses (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_followed_businesses_business ON user_followed_businesses (business_id);


-- =========================
-- 13. reports (offer + business)
-- =========================
CREATE TABLE IF NOT EXISTS offer_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason report_reason_enum NOT NULL,
  notes TEXT,
  status report_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offer_reports_offerid_status ON offer_reports (offer_id, status);

CREATE TABLE IF NOT EXISTS business_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason report_reason_enum NOT NULL,
  notes TEXT,
  status report_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_business_reports_businessid_status ON business_reports (business_id, status);


-- =========================
-- 14. notifications
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  notification_type notification_type_enum NOT NULL DEFAULT 'generic',
  title VARCHAR(255),
  body TEXT,
  data JSONB,                  -- payload for client (deep links, etc)
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);


-- =========================
-- 15. audit_logs (immutable)
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(64) NOT NULL, -- 'offers','businesses','users'
  entity_id UUID,
  action VARCHAR(64) NOT NULL,
  performed_by UUID REFERENCES users(id),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs (entity_type, entity_id);


-- =========================
-- 16. aggregated metrics (lightweight snapshot)
-- =========================
CREATE TABLE IF NOT EXISTS offer_metrics (
  offer_id UUID PRIMARY KEY REFERENCES offers(id) ON DELETE CASCADE,
  views BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  claims BIGINT NOT NULL DEFAULT 0,
  saves BIGINT NOT NULL DEFAULT 0,
  last_metric_updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS business_metrics (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  followers BIGINT NOT NULL DEFAULT 0,
  offers_posted BIGINT NOT NULL DEFAULT 0,
  last_metric_updated_at TIMESTAMPTZ
);


-- =========================
-- 17. operational: rate limits, throttles (basic)
-- =========================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,           -- e.g., user:U123 or ip:1.2.3.4
  limit_type VARCHAR(32),      -- e.g., 'post_offer','claim_attempt'
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_type ON api_rate_limits (key, limit_type);


-- =========================
-- 18. helpers: expire offers function + scheduled job helper
-- =========================
-- This function can be called by a scheduler (cron, pg_cron, or external worker) to mark offers expired.
CREATE OR REPLACE FUNCTION expire_offers_job()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE offers
  SET status = 'expired', updated_at = now()
  WHERE status IN ('active','paused','pending')
    AND end_date < now();
END;
$$;

-- Optional: function to activate scheduled offers whose start_date arrived (if using manual approval, keep logic careful)
CREATE OR REPLACE FUNCTION activate_scheduled_offers()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE offers
  SET status = 'active', updated_at = now()
  WHERE status = 'pending' AND start_date <= now() AND approved_by IS NOT NULL;
END;
$$;


-- =========================
-- 19. optional trigger: increment aggregated counters for small scale setups
-- WARNING: For high-scale systems, use Redis/event pipeline and batch flush.
-- The trigger below is optional; if enabled, it increments offer_metrics on every view/click/claim insert.
-- =========================
CREATE OR REPLACE FUNCTION increment_metrics_on_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- On view
  IF (TG_TABLE_NAME = 'offer_views') THEN
    INSERT INTO offer_metrics (offer_id, views, last_metric_updated_at)
    VALUES (NEW.offer_id, 1, now())
    ON CONFLICT (offer_id) DO UPDATE
      SET views = offer_metrics.views + 1,
          last_metric_updated_at = now();
    RETURN NEW;
  ELSIF (TG_TABLE_NAME = 'offer_clicks') THEN
    INSERT INTO offer_metrics (offer_id, clicks, last_metric_updated_at)
    VALUES (NEW.offer_id, 1, now())
    ON CONFLICT (offer_id) DO UPDATE
      SET clicks = offer_metrics.clicks + 1,
          last_metric_updated_at = now();
    RETURN NEW;
  ELSIF (TG_TABLE_NAME = 'offer_claims') THEN
    INSERT INTO offer_metrics (offer_id, claims, last_metric_updated_at)
    VALUES (NEW.offer_id, 1, now())
    ON CONFLICT (offer_id) DO UPDATE
      SET claims = offer_metrics.claims + 1,
          last_metric_updated_at = now();
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger only in low-traffic or initial prototypes. Comment out in high traffic.
-- DROP TRIGGER IF EXISTS trg_inc_metrics_on_views ON offer_views;
-- CREATE TRIGGER trg_inc_metrics_on_views AFTER INSERT ON offer_views
-- FOR EACH ROW EXECUTE FUNCTION increment_metrics_on_event();
-- DROP TRIGGER IF EXISTS trg_inc_metrics_on_clicks ON offer_clicks;
-- CREATE TRIGGER trg_inc_metrics_on_clicks AFTER INSERT ON offer_clicks
-- FOR EACH ROW EXECUTE FUNCTION increment_metrics_on_event();
-- DROP TRIGGER IF EXISTS trg_inc_metrics_on_claims ON offer_claims;
-- CREATE TRIGGER trg_inc_metrics_on_claims AFTER INSERT ON offer_claims
-- FOR EACH ROW EXECUTE FUNCTION increment_metrics_on_event();


-- =========================
-- 20. security notes and recommended policies (not enforced here)
-- =========================
-- - Store sensitive documents in S3; only store references in DB.
-- - Use prepared statements / ORM to avoid injection.
-- - Use row-level-security (RLS) if you require per-row access control (not enabled by default).
-- - Keep API tokens/keys outside DB (secrets manager).
-- - Back up daily and enable point-in-time recovery in prod.

-- =========================
-- 21. SAMPLE DATA (demo inserts for the headphone + laptop example)
-- =========================
-- Use readable UUIDs here for clarity in the sample; in production let DB generate them.

-- Clear sample (be careful if running on real DB)
-- DELETE FROM offer_claims; DELETE FROM offer_clicks; DELETE FROM offer_views; DELETE FROM offer_items; DELETE FROM offer_rules; DELETE FROM offers; DELETE FROM business_branches; DELETE FROM businesses; DELETE FROM users;

-- Users
INSERT INTO users (id, phone, display_name, role, is_phone_verified)
VALUES
  ('00000000-0000-0000-0000-0000000000a1', '9876543210', 'Ramesh Kumar', 'business_owner', true),
  ('00000000-0000-0000-0000-0000000000a2', '9123456789', 'Anita Sharma', 'consumer', true)
ON CONFLICT DO NOTHING;

-- Business
INSERT INTO businesses (id, owner_id, business_name, business_type, brand_type)
VALUES ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Sri Lakshmi Electronics', 'electronics', 'local')
ON CONFLICT DO NOTHING;

-- Branch
INSERT INTO business_branches (id, business_id, branch_name, city, area, latitude, longitude)
VALUES ('00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000b1', 'Gandhi Road', 'Tirupati', 'Gandhi Road', 13.6288, 79.4192)
ON CONFLICT DO NOTHING;

-- Campaign (New Year Sale)
INSERT INTO campaigns (id, business_id, name, description, start_date, end_date, created_by)
VALUES ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', 'New Year Sale 2025', 'New Year discounts and freebies', '2025-01-01'::timestamptz, '2025-01-10'::timestamptz, '00000000-0000-0000-0000-0000000000a1')
ON CONFLICT DO NOTHING;

-- Offer A: Free Headphones with Phone (Buy 1 Get 1 on certain items)
INSERT INTO offers (id, branch_id, campaign_id, title, short_description, description, offer_scope, start_date, end_date, status, created_by)
VALUES ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000c1',
  'Free Headphones with Phone',
  'Buy any phone and get headphones free',
  'Buy any smartphone and receive one free pair of store promotional headphones. Limited to one free headphone per bill. Subject to stock availability.',
  'item_specific',
  '2025-01-01'::timestamptz,
  '2025-01-10'::timestamptz,
  'active',
  '00000000-0000-0000-0000-0000000000a1')
ON CONFLICT DO NOTHING;

-- Offer A Rule: buy_x_get_y
INSERT INTO offer_rules (id, offer_id, rule_type, buy_quantity, get_quantity, conditions)
VALUES ('00000000-0000-0000-0000-00000000001e', '00000000-0000-0000-0000-00000000000f', 'buy_x_get_y', 1, 1, '{"note":"limit one headphone per bill","apply_to":"item_category:phones"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Offer A Items
INSERT INTO offer_items (id, offer_id, item_role, item_name, item_category)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-00000000000f', 'buy', 'Any Smartphone', 'phones'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-00000000000f', 'get', 'Store Headphones (Model Promo-1)', 'accessories')
ON CONFLICT DO NOTHING;

-- Offer A Media
INSERT INTO media_assets (id, owner_id, url, media_type)
VALUES ('00000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-0000000000a1','https://cdn.example.com/headphone_promo.jpg','image')
ON CONFLICT DO NOTHING;

INSERT INTO offer_media (id, offer_id, media_asset_id, image_url, sort_order)
VALUES ('00000000-0000-0000-0000-000000000040','00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-000000000030','https://cdn.example.com/headphone_promo.jpg', 0)
ON CONFLICT DO NOTHING;

-- Offer B: 20% Off Laptops
INSERT INTO offers (id, branch_id, campaign_id, title, short_description, description, offer_scope, start_date, end_date, status, created_by)
VALUES ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000b0', '00000000-0000-0000-0000-0000000000c1',
  '20% Off on Laptops',
  'Flat 20% discount on all laptops',
  'Get 20% off on all branded laptops. Not combinable with other offers.',
  'category_specific',
  '2025-01-01'::timestamptz,
  '2025-01-10'::timestamptz,
  'active',
  '00000000-0000-0000-0000-0000000000a1')
ON CONFLICT DO NOTHING;

-- Offer B Rule: percentage 20
INSERT INTO offer_rules (id, offer_id, rule_type, discount_value, conditions)
VALUES ('00000000-0000-0000-0000-00000000002e', '00000000-0000-0000-0000-00000000000e', 'percentage', 20, '{"apply_to_category":"laptops"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Offer B Items (category-level descriptive)
INSERT INTO offer_items (id, offer_id, item_role, item_category)
VALUES ('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-00000000000e','apply_on','laptops')
ON CONFLICT DO NOTHING;

-- Offer B Media
INSERT INTO media_assets (id, owner_id, url, media_type)
VALUES ('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-0000000000a1','https://cdn.example.com/laptop_promo.jpg','image')
ON CONFLICT DO NOTHING;

INSERT INTO offer_media (id, offer_id, media_asset_id, image_url, sort_order)
VALUES ('00000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-000000000032','https://cdn.example.com/laptop_promo.jpg', 0)
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO categories (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000c1','Electronics'),
  ('00000000-0000-0000-0000-0000000000c2','Phones'),
  ('00000000-0000-0000-0000-0000000000c3','Laptops')
ON CONFLICT DO NOTHING;

-- Offer ↔ Categories mapping
INSERT INTO offer_categories (offer_id, category_id) VALUES
  ('00000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000c2'),
  ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000c3')
ON CONFLICT DO NOTHING;

-- Demonstration: user U2 views both offers
INSERT INTO offer_views (user_id, offer_id, session_id, ip_address, user_agent)
VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000000f','sess-1','203.0.113.5','Mozilla/5.0'),
       ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000000e','sess-1','203.0.113.5','Mozilla/5.0');

-- User saves OFFER1
INSERT INTO user_saved_offers (user_id, offer_id) VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-00000000000f') ON CONFLICT DO NOTHING;

-- User follows business
INSERT INTO user_followed_businesses (user_id, business_id) VALUES ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b1') ON CONFLICT DO NOTHING;

-- Create initial offer_metrics rows
INSERT INTO offer_metrics (offer_id, views, clicks, claims, saves, last_metric_updated_at)
VALUES
  ('00000000-0000-0000-0000-00000000000f', 1, 0, 0, 1, now()),
  ('00000000-0000-0000-0000-00000000000e', 1, 0, 0, 0, now())
ON CONFLICT (offer_id) DO NOTHING;


-- =========================
-- 22. sample queries (examples you asked for)
-- =========================

-- 1) Get all active offers in a city with business details
-- Note: join offers -> business_branches -> businesses
SELECT
  o.id AS offer_id,
  o.title,
  o.short_description,
  o.start_date,
  o.end_date,
  o.status,
  b.id AS business_id,
  b.business_name,
  br.city,
  br.area
FROM offers o
JOIN business_branches br ON br.id = o.branch_id
JOIN businesses b ON b.id = br.business_id
WHERE br.city = 'Tirupati'
  AND o.status = 'active'
  AND o.start_date <= now()
  AND o.end_date >= now()
ORDER BY o.start_date DESC;


-- 2) Get offer rules for a given offer (example OFFER1)
SELECT r.*
FROM offer_rules r
WHERE r.offer_id = '00000000-0000-0000-0000-00000000000f';

-- 3) Get offer items for a given offer
SELECT *
FROM offer_items
WHERE offer_id = '00000000-0000-0000-0000-00000000000f';

-- 4) Get aggregated metrics for offers for a business
SELECT o.id AS offer_id, o.title, COALESCE(m.views,0) AS views, COALESCE(m.saves,0) AS saves
FROM offers o
LEFT JOIN offer_metrics m ON m.offer_id = o.id
JOIN business_branches br ON br.id = o.branch_id
JOIN businesses b ON b.id = br.business_id
WHERE b.id = '00000000-0000-0000-0000-0000000000b1'
ORDER BY m.views DESC NULLS LAST;

-- 5) Find users who followed this business (for notifications)
SELECT u.id, u.display_name, u.phone
FROM user_followed_businesses f
JOIN users u ON u.id = f.user_id
WHERE f.business_id = '00000000-0000-0000-0000-0000000000b1';


-- =========================
-- END OF FILE
-- =========================

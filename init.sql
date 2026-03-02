-- ============================================================
-- Database initialization for KIBI Platform Common Schema (PostgreSQL)
-- Unified schema for OnBoarding, Events, and BrandCampaign microservices
-- ============================================================

-- Optional but recommended for idempotent init scripts:
-- BEGIN;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Super Admin
CREATE TABLE IF NOT EXISTS super_admin (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         VARCHAR(20)  NOT NULL DEFAULT 'SUPER_ADMIN',
  active       BOOLEAN      NOT NULL DEFAULT TRUE,
  deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sports Category
CREATE TABLE IF NOT EXISTS sports_category (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(100) NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  deleted      BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Sports Organizations
CREATE TABLE IF NOT EXISTS sports_organizations (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(255) NOT NULL,
  email                  VARCHAR(255) NOT NULL UNIQUE,
  phone                  VARCHAR(20)  NOT NULL,
  password               VARCHAR(255) NOT NULL,
  address                TEXT,
  "displayName"            VARCHAR(32),
  "organizationType"     VARCHAR(64),
  city                   VARCHAR(100),
  state                  VARCHAR(100),
  country                VARCHAR(100),
  district               VARCHAR(100),
  pincode                VARCHAR(10),
  logo                   TEXT,
  description            TEXT,
  website                VARCHAR(255),
  "registrationNumber"   VARCHAR(100),
  "establishedYear"      INTEGER,
  "sportsCategories"     TEXT, -- JSON array in string form as per your interface comment
  status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  "isVerified"           BOOLEAN NOT NULL DEFAULT FALSE,
  "onboardedBy"          INTEGER NOT NULL REFERENCES super_admin(id),
  deleted                BOOLEAN NOT NULL DEFAULT FALSE,
  "isFirstLogin"         BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isKycVerified"        BOOLEAN NOT NULL DEFAULT FALSE,
  account_id             VARCHAR(64),
  account_type           VARCHAR(20) CHECK (account_type IN ('SAVING', 'CURRENT')),
  setting                BOOLEAN
);

-- Invitation Codes
CREATE TABLE IF NOT EXISTS invitation_codes (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(50) NOT NULL UNIQUE,
  type              VARCHAR(20) NOT NULL CHECK (type IN ('AFFILIATE', 'NON_AFFILIATE')),
  "role"            VARCHAR(30) NOT NULL DEFAULT 'ATHLETE'
                    CHECK ("role" IN (
                      'ATHLETE',
                      'COACH',
                      'SPORTS STAFF',
                      'NUTRITIONIST',
                      'PHYSIOTHERAPIST',
                      'PSYCHOLOGIST',
                      'SPORTS JOURNALIST',
                      'SPORTS MANAGEMENT PROFESSIONAL'
                    )),
  "organizationId"  INTEGER REFERENCES sports_organizations(id),
  "generatedBy"     INTEGER NOT NULL,
  "recipientPhone"  VARCHAR(20),
  "recipientEmail"  VARCHAR(255),
  "recipientName"   VARCHAR(255),
  status            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
  "expiresAt"       TIMESTAMPTZ NOT NULL,
  "usedAt"          TIMESTAMPTZ,
  "usedBy"          INTEGER,
  metadata          TEXT,
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Affiliates (IMPORTANT: your SQL was missing organizationId but your TS + seed inserts use it)
CREATE TABLE IF NOT EXISTS affiliates (
  id                 SERIAL PRIMARY KEY,
  "organizationId"   INTEGER REFERENCES sports_organizations(id),
  name               VARCHAR(255) NOT NULL,
  "role"             VARCHAR(30) NOT NULL DEFAULT 'ATHLETE'
                     CHECK ("role" IN (
                       'ATHLETE',
                       'COACH',
                       'SPORTS STAFF',
                       'NUTRITIONIST',
                       'PHYSIOTHERAPIST',
                       'PSYCHOLOGIST',
                       'SPORTS JOURNALIST',
                       'SPORTS MANAGEMENT PROFESSIONAL'
                     )),
  email              VARCHAR(255),
  phone              VARCHAR(20) NOT NULL,
  password           VARCHAR(255),
  "dateOfBirth"      DATE,
  gender             VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  "sportsCategoryId" INTEGER REFERENCES sports_category(id),
  experience         VARCHAR(255),
  position           VARCHAR(100),
  "profilePicture"   TEXT,
  "coverPhoto"       TEXT,
  bio                TEXT,
  achievements        TEXT,
  "invitationCode"   VARCHAR(50),
  "invitationStatus" VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK ("invitationStatus" IN ('PENDING', 'SENT', 'ACCEPTED', 'EXPIRED')),
  status             VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'VERIFIED', 'BANNED', 'FLAGGED')),
  "addedBy"          INTEGER NOT NULL,
  deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geography          VARCHAR(255),
  "followersRange"   VARCHAR(50),
  height             VARCHAR(10),
  weight             VARCHAR(10),
  city               VARCHAR(20),
  latitude           DOUBLE PRECISION,
  longitude          DOUBLE PRECISION,
  profile_slug       VARCHAR(255) UNIQUE
);

-- Affiliate Organizations mapping
CREATE TABLE IF NOT EXISTS affiliate_organizations (
  id               SERIAL PRIMARY KEY,
  "affiliateId"    INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "organizationId" INTEGER NOT NULL REFERENCES sports_organizations(id) ON DELETE CASCADE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE ("affiliateId", "organizationId")
);

-- Non-Affiliate Requests
CREATE TABLE IF NOT EXISTS non_affiliate_requests (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  "role"            VARCHAR(30) NOT NULL DEFAULT 'ATHLETE'
                    CHECK ("role" IN (
                      'ATHLETE',
                      'COACH',
                      'SPORTS STAFF',
                      'NUTRITIONIST',
                      'PHYSIOTHERAPIST',
                      'PSYCHOLOGIST',
                      'SPORTS JOURNALIST',
                      'SPORTS MANAGEMENT PROFESSIONAL'
                    )),
  email             VARCHAR(255),
  phone             VARCHAR(20) NOT NULL,
  "sportsCategoryId" INTEGER REFERENCES sports_category(id),
  experience        TEXT,
  reason            TEXT,
  documents         TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  "reviewedBy"      INTEGER REFERENCES super_admin(id),
  "reviewedAt"      TIMESTAMPTZ,
  "reviewComments"  TEXT,
  "invitationCodeId" INTEGER REFERENCES invitation_codes(id),
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP Verification (your original had a missing comma + missing SUPER_ADMIN_LOGIN option)
CREATE TABLE IF NOT EXISTS otp_verification (
  id            SERIAL PRIMARY KEY,
  phone         VARCHAR(20) NOT NULL,
  otp           VARCHAR(6)  NOT NULL,
  type          VARCHAR(30) NOT NULL
                CHECK (type IN (
                  'AFFILIATE_SIGNUP',
                  'ORG_SIGNUP',
                  'PASSWORD_RESET',
                  'AFFILIATE_LOGIN',
                  'SUPER_ADMIN_LOGIN'
                )),
  "invitationCode" VARCHAR(50),
  attempts      INTEGER NOT NULL DEFAULT 0,
  verified      BOOLEAN NOT NULL DEFAULT FALSE,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id           SERIAL PRIMARY KEY,
  "userId"     INTEGER NOT NULL,
  "userType"   VARCHAR(20) NOT NULL CHECK ("userType" IN ('SUPER_ADMIN', 'ORGANIZATION', 'AFFILIATE')),
  action       VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(50)  NOT NULL,
  "entityId"   INTEGER,
  "oldValues"  TEXT,
  "newValues"  TEXT,
  "ipAddress"  INET,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- Create events table with geo support
CREATE TABLE IF NOT EXISTS events (
  id                     SERIAL PRIMARY KEY,
  "organizationId"       INTEGER NOT NULL REFERENCES sports_organizations(id),
  name                   VARCHAR(255) NOT NULL,
  description            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted                BOOLEAN NOT NULL DEFAULT FALSE,

  -- Date/Time fields
  "startDate"            TIMESTAMP WITH TIME ZONE NOT NULL,
  "endDate"              TIMESTAMP WITH TIME ZONE NOT NULL,
  "startTime"            VARCHAR(50) NOT NULL,
  "endTime"              VARCHAR(50) NOT NULL,

  -- Pricing
  "eventFee"             NUMERIC(10,2),
  "participationFee"     NUMERIC(10,2) NOT NULL,

  -- Location info
  address                TEXT NOT NULL,
  venue                  VARCHAR(255) NOT NULL,
  latitude               DOUBLE PRECISION,
  longitude              DOUBLE PRECISION,

  -- ✅ PostGIS geography column for efficient spatial queries
  -- Uses WGS84 (EPSG:4326) - standard GPS coordinates
  geo                    geography(POINT, 4326),

  -- Organizer info
  "organizerEmail"       VARCHAR(255) NOT NULL,
  "mapLink"              TEXT NOT NULL,
  "organizerPhoneNumber" VARCHAR(20) NOT NULL,
  "organizationName"     VARCHAR(255) NOT NULL,

  -- Media & metadata
  brochure               TEXT,
  age_limit              INTEGER,
  "imageUrl"             TEXT NOT NULL,
  "isApprovedByAdmin"    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Event classification
  "eventType"            VARCHAR(50) NOT NULL
                         CHECK ("eventType" IN ('International', 'National', 'State', 'League', 'District')),
  type                   VARCHAR(10) NOT NULL
                         CHECK (type IN ('individual', 'team')),

  -- Team event specific
  "teamSize"             INTEGER,
  CONSTRAINT chk_team_size_required
    CHECK ( (type <> 'team') OR ("teamSize" IS NOT NULL AND "teamSize" > 0) )
);

-- ✅ Create spatial index on geo column for fast distance queries
-- This dramatically speeds up ST_DWithin queries
CREATE INDEX IF NOT EXISTS idx_events_geo ON events USING GIST(geo);

-- ✅ Index for common filters
CREATE INDEX IF NOT EXISTS idx_events_deleted_approved
  ON events(deleted, "isApprovedByAdmin")
  WHERE deleted = false AND "isApprovedByAdmin" = true;

CREATE INDEX IF NOT EXISTS idx_events_endDate
  ON events("endDate")
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_events_organizationId
  ON events("organizationId")
  WHERE deleted = false;

CREATE INDEX IF NOT EXISTS idx_events_name
  ON events(name)
  WHERE deleted = false;

-- ✅ Trigger to automatically update geo column from lat/long
CREATE OR REPLACE FUNCTION update_events_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo := ST_SetSRID(
      ST_MakePoint(NEW.longitude, NEW.latitude),
      4326
    )::geography;
  ELSE
    NEW.geo := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_geo_update
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_events_geo();

-- ✅ Populate geo column for existing records
UPDATE events
SET geo = ST_SetSRID(
  ST_MakePoint(longitude, latitude),
  4326
)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND geo IS NULL;

CREATE TABLE IF NOT EXISTS event_teams (
  id          SERIAL PRIMARY KEY,
  "eventId"   INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "captainId" INTEGER NOT NULL REFERENCES affiliates(id),
  "teamName"  VARCHAR(255) NOT NULL,
  "teamCode"  VARCHAR(255) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
  "payment_mode" VARCHAR(10) CHECK ("payment_mode" IN ('all', 'split')),
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted     BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE rapid_ig (
    id SERIAL PRIMARY KEY,
    affiliate_id INTEGER NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    is_private_acc BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rapid_ig_affiliate
        FOREIGN KEY (affiliate_id)
        REFERENCES affiliates(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_rapid_ig_affiliate
        UNIQUE (affiliate_id)
);


CREATE TABLE IF NOT EXISTS event_team_members (
  id           SERIAL PRIMARY KEY,
  "teamId"     INTEGER NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  "affiliateId" INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "isCaptain"  BOOLEAN NOT NULL DEFAULT FALSE,
  "joinedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE ("teamId", "affiliateId")
);

-- Forms
CREATE TABLE IF NOT EXISTS forms (
  id               SERIAL PRIMARY KEY,
  "formName"       VARCHAR(255) NOT NULL,
  header           TEXT NOT NULL,
  "organizationId" INTEGER NOT NULL REFERENCES sports_organizations(id),
  form_values      JSONB NOT NULL,
  type             VARCHAR(50) NOT NULL CHECK (type IN ('Team Sports', 'Individual Play')),
  "minPlayers"     INTEGER,
  "maxPlayers"     INTEGER,
  deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Events-Forms mapping
CREATE TABLE IF NOT EXISTS events_forms (
  id        SERIAL PRIMARY KEY,
  "eventId" INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  "formId"  INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE ("eventId", "formId")
);

-- Event-SportsCategory junction (you had this twice; this is the single correct version)
CREATE TABLE IF NOT EXISTS events_sports_category (
  id                 SERIAL PRIMARY KEY,
  event_id           INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  sports_category_id INTEGER NOT NULL REFERENCES sports_category(id) ON DELETE CASCADE,
  deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, sports_category_id)
);

-- Affiliate Event Responses
-- NOTE: The composite PK (affiliate_id, event_id) prevents an affiliate from
-- submitting multiple forms for the same event. If multi-form submissions per
-- event are needed, the PK should be changed to (affiliate_id, event_id, form_id).
-- This change is deferred because existing code may depend on the current PK.
CREATE TABLE IF NOT EXISTS affiliate_event_responses (
  affiliate_id   INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  event_id       INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  form_id        INTEGER REFERENCES forms(id) ON DELETE SET NULL,
  response_data  JSONB NOT NULL,
  status         VARCHAR(50) NOT NULL DEFAULT 'submitted',
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted        BOOLEAN NOT NULL DEFAULT FALSE,

  payment_id     VARCHAR(255),
  order_id       VARCHAR(255),
  amount_paid    NUMERIC(10,2),
  payment_status VARCHAR(50),
  payment_time   TIMESTAMPTZ,

  PRIMARY KEY (affiliate_id, event_id)
);

-- ============================================================
-- BRANDS + CAMPAIGNS (aligned with your Kysely schema)
-- ============================================================

CREATE TABLE IF NOT EXISTS brands (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  logo_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted    BOOLEAN NOT NULL DEFAULT FALSE
);

-- Affiliates <-> Brands mapping (your TS expects affiliateId/brandId)
CREATE TABLE IF NOT EXISTS affiliates_brands (
  id           SERIAL PRIMARY KEY,
  "affiliateId" INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "brandId"     INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("affiliateId", "brandId")
);

-- Campaigns (FIXED: brandId instead of brandName; dealType/gender enums aligned)
CREATE TABLE IF NOT EXISTS campaigns (
  id               SERIAL PRIMARY KEY,
  description      TEXT NOT NULL,
  "brandId"        INTEGER NOT NULL REFERENCES brands(id),
  product          VARCHAR(255) NOT NULL,
  "sportsCategoryId" INTEGER REFERENCES sports_category(id),
  "ageRange"       VARCHAR(50) NOT NULL,
  gender           VARCHAR(10) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'ANY')),
  geography        VARCHAR(255) NOT NULL,
  "followersRange" VARCHAR(50) NOT NULL,
  "dealType"       VARCHAR(100) NOT NULL CHECK ("dealType" IN (
                    'brandAmbassador',
                    'monetary',
                    'barter',
                    'monetaryAndBarter',
                    'affiliateCommissionBased',
                    'eventAppearance',
                    'socialMediaTakeover',
                    'productPlacement',
                    'csrPartnership'
                  )),
  deliverables     TEXT NOT NULL,
  budget           VARCHAR(100) NOT NULL,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaign Sports Categories
CREATE TABLE IF NOT EXISTS campaign_sports_categories (
  id                SERIAL PRIMARY KEY,
  "campaignId"       INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  "sportsCategoryId" INTEGER NOT NULL REFERENCES sports_category(id) ON DELETE CASCADE,
  deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("campaignId", "sportsCategoryId")
);

-- Campaign Affiliate Registrations
CREATE TABLE IF NOT EXISTS campaign_affiliate_registrations (
  id                 SERIAL PRIMARY KEY,
  campaign_id         INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  affiliate_id        INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL DEFAULT 'REGISTERED'
                      CHECK (status IN ('REGISTERED','APPROVED','REJECTED','COMPLETED','CANCELLED')),
  "additionalData"    JSONB,
  "registrationDate"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, affiliate_id)
);

-- Campaign Collaborator (FK + year added as per your interface)
CREATE TABLE IF NOT EXISTS campaign_collaborator (
  id            SERIAL PRIMARY KEY,
  brand_name    VARCHAR(255) NOT NULL,
  position_name VARCHAR(255) NOT NULL,
  details       TEXT,
  affiliate_id  INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  year          INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AFFILIATE PROFILE EXTENSIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS education (
  id            SERIAL PRIMARY KEY,
  "affiliateId" INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "schoolName"  VARCHAR(255) NOT NULL,
  course        VARCHAR(255),
  "fromYear"    VARCHAR(10),
  "toYear"      VARCHAR(10),
  description   TEXT,
  certificate   VARCHAR(500),
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS experience (
  id                 SERIAL PRIMARY KEY,
  "affiliateId"       INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "organizationName"  VARCHAR(255) NOT NULL,
  role               VARCHAR(255) NOT NULL,
  "fromDate"          DATE NOT NULL,
  "toDate"            DATE,
  description         TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_certificates (
  id                   SERIAL PRIMARY KEY,
  "affiliateId"         INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "certificationName"   VARCHAR(255) NOT NULL,
  issuer               VARCHAR(255),
  year                 VARCHAR(10),
  url                  TEXT,
  attachment           VARCHAR(500),
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_publications (
  id                 SERIAL PRIMARY KEY,
  "affiliateId"       INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "publicationName"   VARCHAR(255) NOT NULL,
  publisher           VARCHAR(255),
  year                VARCHAR(10),
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_award_recognitions (
  id               SERIAL PRIMARY KEY,
  "affiliateId"     INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "awardName"       VARCHAR(255) NOT NULL,
  organization     VARCHAR(255),
  year             VARCHAR(10),
  url              TEXT,
  attachment       VARCHAR(500),
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instagram Accounts
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id               SERIAL PRIMARY KEY,
  "affiliateId"     INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  "igId"            VARCHAR(255) NOT NULL,
  username          VARCHAR(255) NOT NULL,
  "followersCount"  INTEGER NOT NULL DEFAULT 0,
  "pageId"          VARCHAR(255),
  "pageName"        VARCHAR(255),
  "connectedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted           BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sponsorship_team (
    id SERIAL PRIMARY KEY,              
    name VARCHAR(255) NOT NULL,         
    email VARCHAR(255) UNIQUE NOT NULL, 
    password VARCHAR(255) NOT NULL,     
    active BOOLEAN DEFAULT true,        
    deleted BOOLEAN DEFAULT false,      
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PAYMENTS / SUBSCRIPTIONS
-- ============================================================

-- Razorpay Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  SERIAL PRIMARY KEY,
  "razorpayPlanId"    VARCHAR(255) UNIQUE,
  "organizationId"    INTEGER NOT NULL REFERENCES sports_organizations(id) ON DELETE CASCADE,
  period              VARCHAR(20) NOT NULL
                        CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly','yearly')),
  interval            INTEGER NOT NULL
                        CHECK (interval >= 1),
  "itemName"          VARCHAR(255) NOT NULL,
  "itemAmount"        INTEGER NOT NULL
                        CHECK ("itemAmount" >= 1),
  "itemCurrency"      VARCHAR(3) NOT NULL,
  "itemDescription"   TEXT,
  notes               JSONB,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  deleted             BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    razorpay_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    razorpay_plan_id VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES sports_organizations(id),
    affiliate_id INTEGER REFERENCES affiliates(id),
    status VARCHAR(50) NOT NULL, -- created, authenticated, active, cancelled
    total_count INTEGER NOT NULL,
    paid_count INTEGER DEFAULT 0,
    remaining_count INTEGER,
    short_url TEXT,
    customer_notify BOOLEAN DEFAULT TRUE,
    start_at BIGINT,
    expire_by BIGINT,
    notes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- ============================================================
-- INDEXES (de-duplicated, focused on common lookups + FK joins)
-- ============================================================

-- Sports category
CREATE INDEX IF NOT EXISTS idx_sports_category_title   ON sports_category (title);
CREATE INDEX IF NOT EXISTS idx_sports_category_status  ON sports_category (status);
CREATE INDEX IF NOT EXISTS idx_sports_category_deleted ON sports_category (deleted);

-- Sports org
CREATE INDEX IF NOT EXISTS idx_sports_organizations_email  ON sports_organizations (email);
CREATE INDEX IF NOT EXISTS idx_sports_organizations_status ON sports_organizations (status);

-- Affiliates
CREATE INDEX IF NOT EXISTS idx_affiliates_email           ON affiliates (email);
CREATE INDEX IF NOT EXISTS idx_affiliates_phone          ON affiliates (phone);
CREATE INDEX IF NOT EXISTS idx_affiliates_invitationCode ON affiliates ("invitationCode");
CREATE INDEX IF NOT EXISTS idx_affiliates_sportsCategory  ON affiliates ("sportsCategoryId");
CREATE INDEX IF NOT EXISTS idx_affiliates_orgId           ON affiliates ("organizationId");

-- Invitation codes
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code   ON invitation_codes (code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes (status);

-- OTP
CREATE INDEX IF NOT EXISTS idx_otp_verification_phone ON otp_verification (phone);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs ("userId", "userType");

-- Events
CREATE INDEX IF NOT EXISTS idx_events_orgId      ON events ("organizationId");
CREATE INDEX IF NOT EXISTS idx_events_approved   ON events ("isApprovedByAdmin");
CREATE INDEX IF NOT EXISTS idx_events_deleted    ON events (deleted);
CREATE INDEX IF NOT EXISTS idx_events_eventType  ON events ("eventType");
CREATE INDEX IF NOT EXISTS idx_events_startDate  ON events ("startDate");
CREATE INDEX IF NOT EXISTS idx_events_type       ON events (type);

-- Junction tables
CREATE INDEX IF NOT EXISTS idx_events_forms_eventId  ON events_forms ("eventId");
CREATE INDEX IF NOT EXISTS idx_events_forms_formId   ON events_forms ("formId");
CREATE INDEX IF NOT EXISTS idx_events_sports_event   ON events_sports_category (event_id);
CREATE INDEX IF NOT EXISTS idx_events_sports_cat     ON events_sports_category (sports_category_id);

-- Responses
CREATE INDEX IF NOT EXISTS idx_aff_event_resp_event     ON affiliate_event_responses (event_id);
CREATE INDEX IF NOT EXISTS idx_aff_event_resp_affiliate ON affiliate_event_responses (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_aff_event_resp_status    ON affiliate_event_responses (status);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_brandId        ON campaigns ("brandId");
CREATE INDEX IF NOT EXISTS idx_campaigns_sportsCategory ON campaigns ("sportsCategoryId");
CREATE INDEX IF NOT EXISTS idx_campaigns_active         ON campaigns (active);
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted        ON campaigns (deleted);
CREATE INDEX IF NOT EXISTS idx_campaigns_dealType       ON campaigns ("dealType");
CREATE INDEX IF NOT EXISTS idx_campaigns_gender         ON campaigns (gender);
CREATE INDEX IF NOT EXISTS idx_campaigns_createdAt      ON campaigns ("createdAt");

-- Campaign registrations
CREATE INDEX IF NOT EXISTS idx_camp_reg_campaign ON campaign_affiliate_registrations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_reg_affiliate ON campaign_affiliate_registrations (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_camp_reg_status    ON campaign_affiliate_registrations (status);

-- Subscription plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_razorpay_id ON subscription_plans ("razorpayPlanId");
CREATE INDEX IF NOT EXISTS idx_subscription_plans_organizationId ON subscription_plans ("organizationId");
CREATE INDEX IF NOT EXISTS idx_subscription_plans_period      ON subscription_plans (period);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active      ON subscription_plans (active);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_deleted    ON subscription_plans (deleted);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_createdAt   ON subscription_plans ("createdAt");

-- Indexing for faster lookups
CREATE INDEX idx_sub_org_id ON subscriptions(organization_id);
CREATE INDEX idx_sub_rzp_id ON subscriptions(razorpay_subscription_id);

-- ============================================================
-- SEED DATA (fixed to satisfy constraints & enums)
-- ============================================================

-- Default super admin
INSERT INTO super_admin (name, email, password, role, active, deleted)
VALUES
  ('Super Admin','admin@kibisports.com',
   '$2b$12$CiGhavguP1Vurg4QeIsR6Oed8g8EKYpuIX/mNLZJnGg27yZllTTqO',
   'SUPER_ADMIN', TRUE, FALSE)
ON CONFLICT (email) DO NOTHING;

-- Sports categories
INSERT INTO sports_category (id, title, status)
VALUES
  (1, 'Cricket', 'ACTIVE'),
  (2, 'Football', 'ACTIVE'),
  (3, 'Badminton', 'ACTIVE'),
  (4, 'Swimming', 'ACTIVE'),
  (5, 'Running', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Sample sports organizations
INSERT INTO sports_organizations (
  name, email, phone, password, address, city, state, country,
  description, status, "isVerified", "onboardedBy"
)
VALUES
  ('Elite Sports Academy','admin@elitesports.com','+919876543210',
   '$2b$12$k5AIcr62fx.0XOTAFvcWxe2vOjhshmyERnZyn9vkATsGJ3DIWyQSK',
   '123 Sports Complex, Sector 1','Mumbai','Maharashtra','India',
   'Premier sports training academy focusing on cricket and football',
   'APPROVED', TRUE, 1),
  ('Champions Training Center','info@champions.com','+919876543211',
   '$2b$12$bao7iVAb8L6QkdjUS5YtLONuxGPQDQeE8C3Paq43ZVUr1nlAmXZqi',
   NULL,'Delhi','Delhi','India',
   'Elite training center for multiple sports',
   'APPROVED', TRUE, 1)
ON CONFLICT (email) DO NOTHING;

-- Sample affiliates (now valid because organizationId column exists)
INSERT INTO affiliates (
  "organizationId", name, "role", email, phone, gender, "sportsCategoryId",
  position, "invitationCode", "invitationStatus", status, "addedBy", geography, "followersRange"
)
VALUES
  (1, 'Rahul Sharma', 'ATHLETE', 'rahul@example.com', '+919876543220', 'MALE', 1,
   'Batsman', 'ELITE001', 'ACCEPTED', 'VERIFIED', 1, 'Mumbai', '1000-5000'),
  (1, 'Priya Patel', 'COACH', 'priya@example.com', '+919876543221', 'FEMALE', 4,
   'Head Coach', 'ELITE002', 'ACCEPTED', 'VERIFIED', 1, 'Mumbai', '5000-10000'),
  (2, 'Arjun Singh', 'ATHLETE', 'arjun@example.com', '+919876543222', 'MALE', 2,
   'Midfielder', 'CHAMP001', 'ACCEPTED', 'VERIFIED', 2, 'Delhi', '10000-50000')
ON CONFLICT DO NOTHING;

-- Sample invitation codes
INSERT INTO invitation_codes (
  code, type, "organizationId", "generatedBy", "recipientPhone", "recipientEmail",
  "recipientName", status, "expiresAt", metadata
)
VALUES
  ('ELITE004','AFFILIATE',1,1,'+919876543225','newplayer@example.com','New Player',
   'ACTIVE', NOW() + INTERVAL '7 days',
   '{"sportsCategoryId": 4, "position": "Singles Player", "role": "ATHLETE"}'),
  ('NAF-001','NON_AFFILIATE',NULL,1,'+919876543226','independent@example.com','Independent Professional',
   'ACTIVE', NOW() + INTERVAL '30 days',
   '{"sportsCategoryId": 4, "experience": "5 years", "role": "COACH"}')
ON CONFLICT (code) DO NOTHING;

-- Sample non-affiliate requests
INSERT INTO non_affiliate_requests (
  name, email, phone, "sportsCategoryId", experience, reason, status
)
VALUES
  ('Sneha Reddy','sneha@example.com','+919876543227',5,'3 years of competitive badminton coaching',
   'Want to join KIBI platform to offer coaching services and find opportunities','PENDING')
ON CONFLICT DO NOTHING;

-- Brands + Campaigns (fixed: brandId FK; dealType/gender values valid)
INSERT INTO brands (name, logo_url)
VALUES
  ('Nike','https://example.com/nike-logo.png'),
  ('Adidas','https://example.com/adidas-logo.png')
ON CONFLICT DO NOTHING;

-- Campaigns seed (brandId resolved by name lookup)
INSERT INTO campaigns (
  description, "brandId", product, "sportsCategoryId", "ageRange", gender,
  geography, "followersRange", "dealType", deliverables, budget, active, deleted
)
SELECT
  'Looking for talented athletes to promote running shoe line.',
  b.id,
  'Air Max Running Shoes',
  5,
  '18-35',
  'ANY',
  'India',
  '1K-10K',
  'monetary',
  '3 Instagram posts, 2 stories, 1 YouTube review',
  '50000 INR',
  TRUE,
  FALSE
FROM brands b
WHERE b.name = 'Nike'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEQUENCE RESETS (safe after seed)
-- ============================================================

SELECT setval('super_admin_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM super_admin));
SELECT setval('sports_category_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM sports_category));
SELECT setval('sports_organizations_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM sports_organizations));
SELECT setval('affiliates_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM affiliates));
SELECT setval('invitation_codes_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM invitation_codes));
SELECT setval('non_affiliate_requests_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM non_affiliate_requests));
SELECT setval('events_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM events));
SELECT setval('forms_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM forms));
SELECT setval('events_forms_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM events_forms));
SELECT setval('brands_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM brands));
SELECT setval('campaigns_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM campaigns));
SELECT setval('campaign_affiliate_registrations_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM campaign_affiliate_registrations));
SELECT setval('audit_logs_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM audit_logs));
SELECT setval('subscription_plans_id_seq', (SELECT GREATEST(COALESCE(MAX(id), 0), 1) FROM subscription_plans));

-- ============================================================
-- EVENT RESULTS & FIXTURES
-- ============================================================

CREATE TABLE IF NOT EXISTS event_results (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  position INTEGER,
  award VARCHAR(100),
  stats JSONB,
  certificate_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_fixtures (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  round VARCHAR(50),
  match_number INTEGER,
  participant_a VARCHAR(200),
  participant_b VARCHAR(200),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  venue_detail VARCHAR(200),
  score_a VARCHAR(50),
  score_b VARCHAR(50),
  winner VARCHAR(200),
  status VARCHAR(20) DEFAULT 'SCHEDULED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_results_event_id ON event_results(event_id);
CREATE INDEX IF NOT EXISTS idx_event_fixtures_event_id ON event_fixtures(event_id);

-- ============================================================
-- CAMPAIGN DELIVERABLES & TIMELINE
-- ============================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS application_deadline TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS campaign_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id INTEGER REFERENCES campaign_affiliate_registrations(id),
  campaign_id INTEGER,
  affiliate_id INTEGER,
  deliverable_type VARCHAR(100) NOT NULL,
  submission_url VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'SUBMITTED',
  admin_feedback TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_deliverables_campaign ON campaign_deliverables(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliverables_affiliate ON campaign_deliverables(affiliate_id);

-- ============================================================
-- KYC DOCUMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS kyc_documents (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  document_type VARCHAR(50) NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  document_number VARCHAR(50),
  ocr_data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED';
CREATE INDEX IF NOT EXISTS idx_kyc_documents_affiliate ON kyc_documents(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);

-- ============================================================
-- AFFILIATE FOLLOWS
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_follows (
  follower_id INTEGER REFERENCES affiliates(id),
  following_id INTEGER REFERENCES affiliates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON affiliate_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON affiliate_follows(following_id);

-- ============================================================
-- COMMUNITY MODULE
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  content TEXT,
  media_urls TEXT[], -- array of S3 URLs
  post_type VARCHAR(20) DEFAULT 'TEXT', -- TEXT, PHOTO, VIDEO, ACHIEVEMENT
  sport_category VARCHAR(50),
  visibility VARCHAR(20) DEFAULT 'PUBLIC', -- PUBLIC, FOLLOWERS_ONLY, PRIVATE
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER REFERENCES posts(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  content TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES post_comments(id), -- for threaded replies
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER,
  comment_id INTEGER,
  reported_by INTEGER REFERENCES affiliates(id),
  reason VARCHAR(50), -- SPAM, INAPPROPRIATE, HARASSMENT, FAKE, OTHER
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, REVIEWED, RESOLVED
  reviewed_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_affiliate ON posts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_sport ON posts(sport_category);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);

-- ============================================================
-- EVENT TICKETS & CHECK-IN
-- ============================================================

CREATE TABLE IF NOT EXISTS event_tickets (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER,
  ticket_code VARCHAR(20) UNIQUE NOT NULL,
  qr_data TEXT NOT NULL, -- JSON string with ticket info for QR
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_event ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_affiliate ON event_tickets(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_tickets_code ON event_tickets(ticket_code);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id),
  push_follows BOOLEAN DEFAULT true,
  push_likes BOOLEAN DEFAULT true,
  push_comments BOOLEAN DEFAULT true,
  push_events BOOLEAN DEFAULT true,
  push_campaigns BOOLEAN DEFAULT true,
  push_payments BOOLEAN DEFAULT true,
  email_events BOOLEAN DEFAULT true,
  email_campaigns BOOLEAN DEFAULT true,
  email_payments BOOLEAN DEFAULT true,
  dnd_start TIME,
  dnd_end TIME,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) DEFAULT 'affiliate',
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB,
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type, is_read);

-- ============================================================
-- AFFILIATE MEDIA GALLERY
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id INTEGER NOT NULL,
  media_type VARCHAR(20) NOT NULL,
  media_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption VARCHAR(300),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_media ON affiliate_media(affiliate_id, display_order);

-- ============================================================
-- AFFILIATE INVITATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER NOT NULL,
  affiliate_id INTEGER,
  invitation_code VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING',
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- EVENT APPROVAL WORKFLOW COLUMNS
-- ============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'DRAFT';
ALTER TABLE events ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================================
-- AFFILIATE ENDORSEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_endorsements (
  id SERIAL PRIMARY KEY,
  endorser_id INTEGER NOT NULL REFERENCES affiliates(id),
  endorsed_id INTEGER NOT NULL REFERENCES affiliates(id),
  skill VARCHAR(100) NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (endorser_id, endorsed_id, skill),
  CHECK (endorser_id != endorsed_id)
);

CREATE INDEX IF NOT EXISTS idx_endorsements_endorsed ON affiliate_endorsements(endorsed_id);
CREATE INDEX IF NOT EXISTS idx_endorsements_endorser ON affiliate_endorsements(endorser_id);

-- ============================================================
-- EVENT WAITLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id),
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id),
  position INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'WAITING',
  promoted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, affiliate_id)
);
CREATE INDEX IF NOT EXISTS idx_event_waitlist ON event_waitlist(event_id, position);

-- ============================================================
-- CAMPAIGN PAYOUTS
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER NOT NULL,
  affiliate_id INTEGER NOT NULL,
  registration_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  payment_method VARCHAR(50),
  payment_reference VARCHAR(200),
  status VARCHAR(20) DEFAULT 'PENDING',
  notes TEXT,
  processed_by INTEGER,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_payouts ON campaign_payouts(campaign_id, affiliate_id);

-- ============================================================
-- WEBHOOK LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  event_type VARCHAR(100),
  payload JSONB,
  signature VARCHAR(500),
  verified BOOLEAN DEFAULT false,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- AFFILIATE PROFILE VIEWS (Feature 1: Performance Stats)
-- ============================================================

CREATE TABLE IF NOT EXISTS affiliate_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  viewer_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  viewer_type VARCHAR(50) DEFAULT 'ANONYMOUS',
  viewed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_affiliate ON affiliate_profile_views(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON affiliate_profile_views(viewed_at);

-- ============================================================
-- EVENT CERTIFICATES (Feature 2: Event Certificates)
-- ============================================================

CREATE TABLE IF NOT EXISTS event_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  certificate_type VARCHAR(50) NOT NULL DEFAULT 'PARTICIPATION',
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  template_url TEXT,
  issued_by INTEGER,
  issued_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'ISSUED',
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_event_certs_event ON event_certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_event_certs_affiliate ON event_certificates(affiliate_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_certs_unique ON event_certificates(event_id, affiliate_id);

-- ============================================================
-- ORGANIZATION STAFF (Feature 3: Organization Staff)
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER NOT NULL REFERENCES sports_organizations(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
  permissions JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  invited_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_staff_org ON organization_staff(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_staff_email_org ON organization_staff(organization_id, email) WHERE status != 'REMOVED';

-- ============================================================
-- CAMPAIGN TEMPLATES (Feature 4: Campaign Templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  default_budget_min NUMERIC(12,2),
  default_budget_max NUMERIC(12,2),
  default_duration_days INTEGER,
  target_audience JSONB,
  deliverables JSONB,
  terms TEXT,
  created_by INTEGER,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_category ON campaign_templates(category);
CREATE INDEX IF NOT EXISTS idx_campaign_templates_status ON campaign_templates(status) WHERE is_deleted = false;

-- ============================================================
-- USER FEEDBACK (Feature 5: Feedback System)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  user_type VARCHAR(50) NOT NULL DEFAULT 'AFFILIATE',
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status VARCHAR(20) DEFAULT 'PENDING',
  admin_response TEXT,
  responded_by INTEGER,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON user_feedback(category);

-- ============================================================
-- ROUND 7 MIGRATIONS
-- ============================================================

-- Campaign Metrics (for ROI tracking)
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id INTEGER REFERENCES campaigns(id),
  metric_type VARCHAR(50) NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  recorded_date DATE DEFAULT CURRENT_DATE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_type ON campaign_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(recorded_date);

-- Recurring events support
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id INTEGER REFERENCES events(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id) WHERE parent_event_id IS NOT NULL;

-- ============================================================
-- ROUND 8 MIGRATIONS
-- ============================================================

-- Event Categories (hierarchical sport/event categories)
CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  parent_category_id INTEGER REFERENCES event_categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Event Tags (tag-based event discovery)
CREATE TABLE IF NOT EXISTS event_tags (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  tag_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_tags_tag_name ON event_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_event_tags_event_id ON event_tags(event_id);

-- Event Reviews & Ratings
CREATE TABLE IF NOT EXISTS event_reviews (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, affiliate_id)
);

-- Affiliate Availability Calendar
CREATE TABLE IF NOT EXISTS affiliate_availability (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  available_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_availability ON affiliate_availability(affiliate_id, available_date);

-- Event Templates (reusable event configurations)
CREATE TABLE IF NOT EXISTS event_templates (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  template_name VARCHAR(200) NOT NULL,
  event_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Splits (platform vs org revenue sharing)
CREATE TABLE IF NOT EXISTS payment_splits (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  platform_percentage NUMERIC(5,2) DEFAULT 5.00,
  organization_percentage NUMERIC(5,2) DEFAULT 95.00,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id)
);

-- Campaign Milestones (trackable campaign goals)
CREATE TABLE IF NOT EXISTS campaign_milestones (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  metric_type VARCHAR(50),
  deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== Round 9 migrations ====================

-- NOTE: event_teams and event_team_members are defined earlier (around line 341)
-- using camelCase column names (e.g. "eventId", "captainId", "teamName").
-- The duplicate snake_case definitions that were here have been removed.

-- Affiliate Messaging/Inbox
CREATE TABLE IF NOT EXISTS affiliate_messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES affiliates(id),
  recipient_id INTEGER REFERENCES affiliates(id),
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_affiliate_messages_sender ON affiliate_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_messages_recipient ON affiliate_messages(recipient_id);

-- Event Venue Management
CREATE TABLE IF NOT EXISTS venues (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  capacity INTEGER,
  facilities JSONB,
  map_coordinates VARCHAR(100),
  images JSONB,
  organization_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Organization Announcements
CREATE TABLE IF NOT EXISTS organization_announcements (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  title VARCHAR(300) NOT NULL,
  body TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  target_audience VARCHAR(20) DEFAULT 'all',
  expiry_date TIMESTAMP,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Coupon/Discount System
CREATE TABLE IF NOT EXISTS payment_coupons (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  applicable_event_ids JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Content Library
CREATE TABLE IF NOT EXISTS campaign_content (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  title VARCHAR(200),
  content_type VARCHAR(50),
  url VARCHAR(500),
  description TEXT,
  uploaded_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Round 10 migrations
CREATE TABLE IF NOT EXISTS event_brackets (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  participant_a_id INTEGER,
  participant_a_name VARCHAR(200),
  participant_b_id INTEGER,
  participant_b_name VARCHAR(200),
  score_a VARCHAR(50),
  score_b VARCHAR(50),
  winner_id INTEGER,
  next_match_id INTEGER,
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_brackets_event ON event_brackets(event_id);

CREATE TABLE IF NOT EXISTS affiliate_skills (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  skill_name VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(20) DEFAULT 'intermediate',
  endorsement_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_id, skill_name)
);

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER REFERENCES affiliate_skills(id),
  endorser_id INTEGER REFERENCES affiliates(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(skill_id, endorser_id)
);

CREATE TABLE IF NOT EXISTS event_sponsorship_tiers (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  tier_name VARCHAR(100) NOT NULL,
  price NUMERIC(10,2),
  benefits JSONB,
  max_sponsors INTEGER DEFAULT 0,
  current_sponsors INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_sponsors (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  tier_id INTEGER REFERENCES event_sponsorship_tiers(id),
  organization_id INTEGER,
  organization_name VARCHAR(200),
  logo_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  course_id INTEGER,
  status VARCHAR(20) DEFAULT 'ENROLLED',
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  score NUMERIC(5,2),
  enrolled_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  UNIQUE(affiliate_id, course_id)
);

CREATE TABLE IF NOT EXISTS payment_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_id VARCHAR(100),
  payer_id INTEGER,
  payer_name VARCHAR(200),
  payer_email VARCHAR(200),
  organization_id INTEGER,
  event_id INTEGER,
  event_name VARCHAR(200),
  subtotal NUMERIC(10,2),
  discount NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20),
  razorpay_payment_id VARCHAR(100),
  razorpay_order_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_influencer_tiers (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  tier_name VARCHAR(100) NOT NULL,
  min_followers INTEGER DEFAULT 0,
  max_followers INTEGER,
  payout_amount NUMERIC(10,2),
  perks JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE campaign_affiliate_registrations ADD COLUMN IF NOT EXISTS influencer_tier_id INTEGER;

-- Round 11 migrations
CREATE TABLE IF NOT EXISTS event_live_scores (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  match_label VARCHAR(200) NOT NULL,
  team_a_name VARCHAR(200),
  team_a_score VARCHAR(50) DEFAULT '0',
  team_b_name VARCHAR(200),
  team_b_score VARCHAR(50) DEFAULT '0',
  current_period VARCHAR(50),
  time_elapsed VARCHAR(50),
  commentary TEXT,
  status VARCHAR(20) DEFAULT 'LIVE',
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, match_label)
);

CREATE TABLE IF NOT EXISTS event_live_score_history (
  id SERIAL PRIMARY KEY,
  live_score_id INTEGER REFERENCES event_live_scores(id),
  team_a_score VARCHAR(50),
  team_b_score VARCHAR(50),
  current_period VARCHAR(50),
  time_elapsed VARCHAR(50),
  commentary TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_goals (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  metric_type VARCHAR(50),
  deadline TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_media_requests (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  media_type VARCHAR(50) DEFAULT 'image',
  deadline TIMESTAMP,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_media_responses (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES event_media_requests(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  media_url VARCHAR(500) NOT NULL,
  caption TEXT,
  status VARCHAR(20) DEFAULT 'SUBMITTED',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(request_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS organization_branding (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER UNIQUE,
  logo_url VARCHAR(500),
  banner_url VARCHAR(500),
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  tagline VARCHAR(300),
  social_links JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTE: subscription_plans is defined earlier (around line 626) with Razorpay-specific
-- columns (razorpayPlanId, organizationId, etc.). The duplicate simple definition
-- that was here has been removed.

CREATE TABLE IF NOT EXISTS affiliate_subscriptions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id),
  plan_id INTEGER REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  started_at TIMESTAMP DEFAULT NOW(),
  renewal_date TIMESTAMP,
  cancelled_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_reports (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  report_data JSONB NOT NULL,
  generated_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 12: Affiliate Profile Stats
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_profile_stats (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id),
  profile_views INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 12: Event Check-Ins
-- ============================================================
CREATE TABLE IF NOT EXISTS event_check_ins (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  code VARCHAR(100) UNIQUE NOT NULL,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_attendance_log (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  check_in_code VARCHAR(100),
  check_in_method VARCHAR(20) DEFAULT 'CODE',
  checked_in_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_log ON event_attendance_log(event_id, affiliate_id);

-- ============================================================
-- Round 12: Organization Staff Roles
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_staff_roles (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER,
  role_name VARCHAR(100) NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_staff_roles ON organization_staff_roles(organization_id);

ALTER TABLE organization_staff ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES organization_staff_roles(id);

-- ============================================================
-- Round 13: Event Surveys
-- ============================================================
CREATE TABLE IF NOT EXISTS event_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id),
  title VARCHAR(200),
  questions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES event_surveys(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  answers JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(survey_id, affiliate_id)
);

-- ============================================================
-- Round 13: Badge System
-- ============================================================
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  criteria_type VARCHAR(50) NOT NULL,
  criteria_value INTEGER NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id INTEGER REFERENCES affiliates(id),
  badge_id UUID REFERENCES badge_definitions(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_id, badge_id)
);

-- ============================================================
-- Round 13: Event Notification Preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS event_notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  remind_before_hours INTEGER DEFAULT 24,
  notify_updates BOOLEAN DEFAULT true,
  notify_results BOOLEAN DEFAULT true,
  notify_photos BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id),
  title VARCHAR(200),
  message TEXT,
  sent_by INTEGER,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 13: Campaign Application Reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_application_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id INTEGER,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  reviewer_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 13: Seed badge definitions
-- ============================================================
INSERT INTO badge_definitions (name, description, criteria_type, criteria_value, category) VALUES
  ('First Event', 'Attended your first event', 'events_attended', 1, 'events'),
  ('Event Veteran', 'Attended 10 events', 'events_attended', 10, 'events'),
  ('Event Champion', 'Attended 50 events', 'events_attended', 50, 'events'),
  ('Social Butterfly', 'Got 10 followers', 'followers', 10, 'social'),
  ('Influencer', 'Got 100 followers', 'followers', 100, 'social'),
  ('Skill Master', 'Added 5 skills', 'skills', 5, 'profile'),
  ('Campaign Pro', 'Applied to 5 campaigns', 'campaigns_applied', 5, 'campaigns'),
  ('Rising Star', 'Got 10 endorsements', 'endorsements', 10, 'social'),
  ('Goal Setter', 'Set 3 goals', 'goals_set', 3, 'profile'),
  ('Community Leader', 'Got 50 followers', 'followers', 50, 'social')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Round 14: Affiliate Referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id INTEGER REFERENCES affiliates(id),
  referred_email VARCHAR(255),
  referred_phone VARCHAR(20),
  referred_affiliate_id INTEGER REFERENCES affiliates(id),
  referral_code VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'PENDING',
  converted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 14: Org Calendar
-- ============================================================
CREATE TABLE IF NOT EXISTS org_calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER REFERENCES sports_organizations(id),
  entry_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  entry_type VARCHAR(50) DEFAULT 'custom',
  color VARCHAR(20) DEFAULT '#4976FD',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 14: Event Merchandise
-- ============================================================
CREATE TABLE IF NOT EXISTS event_merchandise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id INTEGER REFERENCES events(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER DEFAULT 0,
  image_url VARCHAR(500),
  sizes JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchandise_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchandise_id UUID REFERENCES event_merchandise(id),
  event_id INTEGER REFERENCES events(id),
  affiliate_id INTEGER REFERENCES affiliates(id),
  quantity INTEGER DEFAULT 1,
  size VARCHAR(20),
  total_amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Round 14: Notification History
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id INTEGER REFERENCES affiliates(id),
  title VARCHAR(200),
  message TEXT,
  type VARCHAR(50) DEFAULT 'general',
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_history_affiliate ON notification_history(affiliate_id, is_read);

-- COMMIT;

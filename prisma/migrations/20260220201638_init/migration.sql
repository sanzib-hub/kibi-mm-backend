-- CreateTable
CREATE TABLE "brand_account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "brand_user" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand_account_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "brand_user_brand_account_id_fkey" FOREIGN KEY ("brand_account_id") REFERENCES "brand_account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_brief" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brand_account_id" INTEGER NOT NULL,
    "brand_user_id" INTEGER NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "budget" REAL,
    "budget_currency" TEXT DEFAULT 'INR',
    "start_date" DATETIME,
    "end_date" DATETIME,
    "campaign_objective" TEXT,
    "sports" TEXT NOT NULL,
    "target_cities" TEXT,
    "target_states" TEXT,
    "target_regions" TEXT,
    "asset_categories" TEXT,
    "athlete_tiers" TEXT,
    "deliverables" TEXT,
    "notes" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "campaign_brief_brand_account_id_fkey" FOREIGN KEY ("brand_account_id") REFERENCES "brand_account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "campaign_brief_brand_user_id_fkey" FOREIGN KEY ("brand_user_id") REFERENCES "brand_user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brief_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "notes" TEXT,
    "demo_requested_at" DATETIME,
    "demo_scheduled_at" DATETIME,
    "closed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lead_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "demo_request" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lead_id" INTEGER NOT NULL,
    "brief_id" INTEGER NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "preferred_time" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "demo_request_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_run" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brief_id" INTEGER NOT NULL,
    "params_json" TEXT NOT NULL,
    "relaxations_json" TEXT,
    "total_candidates" INTEGER NOT NULL DEFAULT 0,
    "ran_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "match_run_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "match_result" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "match_run_id" INTEGER NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "score_breakdown_json" TEXT,
    CONSTRAINT "match_result_match_run_id_fkey" FOREIGN KEY ("match_run_id") REFERENCES "match_run" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "athlete" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'local',
    "bio" TEXT,
    "image_url" TEXT,
    "social_followers" INTEGER,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "league" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "season" TEXT,
    "level" TEXT,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "logo_url" TEXT,
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "venue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'venue',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "sports_supported" TEXT NOT NULL,
    "capacity" INTEGER,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "image_url" TEXT,
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_user_email_key" ON "brand_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_brief_id_key" ON "lead"("brief_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_name_city_state_sport_key" ON "athlete"("name", "city", "state", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "league_name_city_state_sport_key" ON "league"("name", "city", "state", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "venue_name_city_state_key" ON "venue"("name", "city", "state");

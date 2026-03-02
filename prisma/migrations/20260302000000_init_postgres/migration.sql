-- CreateTable
CREATE TABLE "brand_account" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "industry" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_user" (
    "id" SERIAL NOT NULL,
    "brand_account_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_brief" (
    "id" SERIAL NOT NULL,
    "brand_account_id" INTEGER NOT NULL,
    "brand_user_id" INTEGER NOT NULL,
    "campaign_name" TEXT NOT NULL,
    "industry_category" TEXT,
    "budget" DOUBLE PRECISION,
    "budget_range" TEXT,
    "budget_currency" TEXT DEFAULT 'INR',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "application_deadline" TIMESTAMP(3),
    "campaign_objective" TEXT,
    "sports" TEXT NOT NULL,
    "target_audience" TEXT,
    "target_cities" TEXT,
    "target_states" TEXT,
    "target_regions" TEXT,
    "asset_categories" TEXT,
    "athlete_tiers" TEXT,
    "deliverables" TEXT,
    "category_constraints" TEXT,
    "notes" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" SERIAL NOT NULL,
    "brief_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "notes" TEXT,
    "demo_requested_at" TIMESTAMP(3),
    "demo_scheduled_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_request" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "brief_id" INTEGER NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "preferred_time" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_run" (
    "id" SERIAL NOT NULL,
    "brief_id" INTEGER NOT NULL,
    "params_json" TEXT NOT NULL,
    "relaxations_json" TEXT,
    "total_candidates" INTEGER NOT NULL DEFAULT 0,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_result" (
    "id" SERIAL NOT NULL,
    "match_run_id" INTEGER NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "score_breakdown_json" TEXT,

    CONSTRAINT "match_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'local',
    "bio" TEXT,
    "image_url" TEXT,
    "social_followers" INTEGER,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "incompatible_categories" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "season" TEXT,
    "level" TEXT,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "incompatible_categories" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "logo_url" TEXT,
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'venue',
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "sports_supported" TEXT NOT NULL,
    "capacity" INTEGER,
    "featured_flag" BOOLEAN NOT NULL DEFAULT false,
    "incompatible_categories" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "image_url" TEXT,
    "source_sheet" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverable" (
    "id" SERIAL NOT NULL,
    "brief_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "submission_url" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_user_email_key" ON "brand_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_brief_id_key" ON "lead"("brief_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_name_city_state_sport_key" ON "athlete"("name", "city", "state", "sport");

-- CreateIndex
CREATE INDEX "athlete_sport_idx" ON "athlete"("sport");

-- CreateIndex
CREATE INDEX "athlete_city_idx" ON "athlete"("city");

-- CreateIndex
CREATE INDEX "athlete_state_idx" ON "athlete"("state");

-- CreateIndex
CREATE INDEX "athlete_status_idx" ON "athlete"("status");

-- CreateIndex
CREATE UNIQUE INDEX "league_name_city_state_sport_key" ON "league"("name", "city", "state", "sport");

-- CreateIndex
CREATE INDEX "league_sport_idx" ON "league"("sport");

-- CreateIndex
CREATE INDEX "league_city_idx" ON "league"("city");

-- CreateIndex
CREATE INDEX "league_state_idx" ON "league"("state");

-- CreateIndex
CREATE INDEX "league_status_idx" ON "league"("status");

-- CreateIndex
CREATE UNIQUE INDEX "venue_name_city_state_key" ON "venue"("name", "city", "state");

-- CreateIndex
CREATE INDEX "venue_city_idx" ON "venue"("city");

-- CreateIndex
CREATE INDEX "venue_state_idx" ON "venue"("state");

-- CreateIndex
CREATE INDEX "venue_status_idx" ON "venue"("status");

-- CreateIndex
CREATE INDEX "deliverable_brief_id_idx" ON "deliverable"("brief_id");

-- CreateIndex
CREATE INDEX "deliverable_status_idx" ON "deliverable"("status");

-- AddForeignKey
ALTER TABLE "brand_user" ADD CONSTRAINT "brand_user_brand_account_id_fkey" FOREIGN KEY ("brand_account_id") REFERENCES "brand_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_brief" ADD CONSTRAINT "campaign_brief_brand_account_id_fkey" FOREIGN KEY ("brand_account_id") REFERENCES "brand_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_brief" ADD CONSTRAINT "campaign_brief_brand_user_id_fkey" FOREIGN KEY ("brand_user_id") REFERENCES "brand_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_request" ADD CONSTRAINT "demo_request_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_run" ADD CONSTRAINT "match_run_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_result" ADD CONSTRAINT "match_result_match_run_id_fkey" FOREIGN KEY ("match_run_id") REFERENCES "match_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverable" ADD CONSTRAINT "deliverable_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

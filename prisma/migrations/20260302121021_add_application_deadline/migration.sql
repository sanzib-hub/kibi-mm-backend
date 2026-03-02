-- AlterTable
ALTER TABLE "campaign_brief" ADD COLUMN "application_deadline" DATETIME;

-- CreateTable
CREATE TABLE "deliverable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "brief_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "submission_url" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT,
    "reviewed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "deliverable_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "campaign_brief" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "deliverable_brief_id_idx" ON "deliverable"("brief_id");

-- CreateIndex
CREATE INDEX "deliverable_status_idx" ON "deliverable"("status");

-- CreateIndex
CREATE INDEX "athlete_sport_idx" ON "athlete"("sport");

-- CreateIndex
CREATE INDEX "athlete_city_idx" ON "athlete"("city");

-- CreateIndex
CREATE INDEX "athlete_state_idx" ON "athlete"("state");

-- CreateIndex
CREATE INDEX "athlete_status_idx" ON "athlete"("status");

-- CreateIndex
CREATE INDEX "league_sport_idx" ON "league"("sport");

-- CreateIndex
CREATE INDEX "league_city_idx" ON "league"("city");

-- CreateIndex
CREATE INDEX "league_state_idx" ON "league"("state");

-- CreateIndex
CREATE INDEX "league_status_idx" ON "league"("status");

-- CreateIndex
CREATE INDEX "venue_city_idx" ON "venue"("city");

-- CreateIndex
CREATE INDEX "venue_state_idx" ON "venue"("state");

-- CreateIndex
CREATE INDEX "venue_status_idx" ON "venue"("status");

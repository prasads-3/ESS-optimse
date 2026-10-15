-- Brings prod DB in sync with schema.prisma:
--   * Organization: add slug (unique), officeLat, officeLong
--   * Employee: replace single-column unique on email/employeeId with composites scoped to organizationId
--   * New tables: CustomPlanRequest, Notification

-- =========================
-- Organization
-- =========================
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "officeLat" DOUBLE PRECISION;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "officeLong" DOUBLE PRECISION;

-- Backfill slug for existing rows so the unique index can be created without collisions.
-- Uses lower(name) with non-alnum -> '-' collapsed. Appends id to disambiguate duplicates.
UPDATE "Organization"
SET "slug" = regexp_replace(
              regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g'),
              '(^-|-$)', '', 'g'
            ) || '-' || "id"::text
WHERE "slug" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");

-- =========================
-- Employee unique indexes
-- =========================
-- Drop old single-column unique indexes; replace with org-scoped composites.
DROP INDEX IF EXISTS "Employee_email_key";
DROP INDEX IF EXISTS "Employee_employeeId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Employee_organizationId_email_key"
  ON "Employee"("organizationId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_organizationId_employeeId_key"
  ON "Employee"("organizationId", "employeeId");

-- =========================
-- CustomPlanRequest
-- =========================
CREATE TABLE IF NOT EXISTS "CustomPlanRequest" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "users" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "features" TEXT NOT NULL,
    "specialReq" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPlanRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomPlanRequest_organizationId_fkey'
  ) THEN
    ALTER TABLE "CustomPlanRequest"
      ADD CONSTRAINT "CustomPlanRequest_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- =========================
-- Notification
-- =========================
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientId" INTEGER,
    "recipientRole" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customPlanRequestId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_customPlanRequestId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_customPlanRequestId_fkey"
      FOREIGN KEY ("customPlanRequestId") REFERENCES "CustomPlanRequest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

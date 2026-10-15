-- Normalize Employee.locationHistory and EmailBroadcast.recipients/failures
-- JSON arrays into relational tables.
--
-- ADDITIVE ONLY: creates two tables + indexes + FKs. No existing table or
-- column is touched, so this cannot lose data. The deprecated JSON columns
-- stay in place until the new write path has been stable for a release
-- (dropped by a later cleanup migration).
--
-- Backfill of existing JSON data is done separately by
-- scripts/migrate-json-to-tables.js (idempotent, re-runnable).

-- CreateTable
CREATE TABLE "EmployeeLocation" (
    "id"         SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "latitude"   DOUBLE PRECISION NOT NULL,
    "longitude"  DOUBLE PRECISION NOT NULL,
    "accuracy"   DOUBLE PRECISION,
    "city"       TEXT,
    "area"       TEXT,
    "address"    TEXT,
    "action"     TEXT,
    "ipAddress"  TEXT,
    "deviceType" TEXT,
    "deviceInfo" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id"           SERIAL NOT NULL,
    "broadcastId"  INTEGER NOT NULL,
    "email"        TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'pending',
    "sentAt"       TIMESTAMP(3),
    "failedAt"     TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount"   INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeLocation_employeeId_recordedAt_idx"
    ON "EmployeeLocation"("employeeId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "EmployeeLocation_recordedAt_idx"
    ON "EmployeeLocation"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailRecipient_broadcastId_email_key"
    ON "EmailRecipient"("broadcastId", "email");

-- CreateIndex
CREATE INDEX "EmailRecipient_broadcastId_status_idx"
    ON "EmailRecipient"("broadcastId", "status");

-- CreateIndex
CREATE INDEX "EmailRecipient_status_createdAt_idx"
    ON "EmailRecipient"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailRecipient_email_idx"
    ON "EmailRecipient"("email");

-- AddForeignKey
ALTER TABLE "EmployeeLocation"
    ADD CONSTRAINT "EmployeeLocation_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient"
    ADD CONSTRAINT "EmailRecipient_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "EmailBroadcast"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

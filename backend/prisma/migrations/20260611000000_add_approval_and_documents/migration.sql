-- Multi-level approval escalation state on Leave / Expense / MoneyRequest,
-- and an employee "other documents" JSON list. Additive + nullable only, so
-- this is non-destructive. IF NOT EXISTS keeps it idempotent for environments
-- where the columns were already applied via raw SQL (prisma db execute).

ALTER TABLE "Leave"        ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "Leave"        ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;

ALTER TABLE "Expense"      ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "Expense"      ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;

ALTER TABLE "MoneyRequest" ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "MoneyRequest" ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;

ALTER TABLE "Employee"     ADD COLUMN IF NOT EXISTS "documents"         JSONB;

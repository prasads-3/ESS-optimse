-- Multi-level approval escalation: add current-approver + audit-trail columns.
-- Nullable/additive only, so this is non-destructive and safe to run on Neon.
ALTER TABLE "Leave"        ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "Leave"        ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;
ALTER TABLE "Expense"      ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "Expense"      ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;
ALTER TABLE "MoneyRequest" ADD COLUMN IF NOT EXISTS "currentApproverId" INTEGER;
ALTER TABLE "MoneyRequest" ADD COLUMN IF NOT EXISTS "approvalHistory"   JSONB;

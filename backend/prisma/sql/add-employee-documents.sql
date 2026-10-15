-- Employee-submitted "other" documents list (JSON array of {name,url,uploadedAt}).
-- Nullable/additive — non-destructive, safe on Neon.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "documents" JSONB;

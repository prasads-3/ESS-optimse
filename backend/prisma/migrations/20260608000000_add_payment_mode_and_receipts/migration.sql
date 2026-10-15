-- Expense payment mode + receipts.
--
-- Adds:
--   ExpenseItem.paymentMode  -- "Cash" | "UPI" | "Card" | "Bank Transfer" | "Online" | null
--   ExpenseItem.receipt      -- per-item receipt (MinIO URL), optional, any payment mode
--   Expense.receipt          -- legacy claim-level receipt column (kept; nullable)
--
-- Uses IF NOT EXISTS so it applies cleanly via `prisma migrate deploy` even on
-- databases where these columns were already added out-of-band with
-- `prisma db execute` (this project manages drift via raw SQL, not migrate dev).

ALTER TABLE "ExpenseItem" ADD COLUMN IF NOT EXISTS "paymentMode" TEXT;
ALTER TABLE "ExpenseItem" ADD COLUMN IF NOT EXISTS "receipt" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "receipt" TEXT;

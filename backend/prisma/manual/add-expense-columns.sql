-- Manual, idempotent schema additions for the expense/payment-mode/receipt work.
-- Applied with `prisma db execute` (NOT `prisma migrate`, which fails on the
-- shadow DB due to existing drift — EmailBroadcast was created out-of-band).
-- Safe to run repeatedly and on any environment (local or production).
ALTER TABLE "ExpenseItem" ADD COLUMN IF NOT EXISTS "paymentMode" TEXT;
ALTER TABLE "ExpenseItem" ADD COLUMN IF NOT EXISTS "receipt"     TEXT;
ALTER TABLE "Expense"     ADD COLUMN IF NOT EXISTS "receipt"     TEXT;

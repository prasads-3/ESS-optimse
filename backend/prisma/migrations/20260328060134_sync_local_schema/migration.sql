-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "locationHistory" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "LoginLog" ADD COLUMN     "action" TEXT NOT NULL DEFAULT 'LOGIN';

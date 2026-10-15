-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "isTemporaryPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

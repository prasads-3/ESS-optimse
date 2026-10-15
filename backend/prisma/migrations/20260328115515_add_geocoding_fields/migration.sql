-- AlterTable
ALTER TABLE "LoginLog" ADD COLUMN     "loginArea" TEXT,
ADD COLUMN     "loginCity" TEXT,
ADD COLUMN     "logoutArea" TEXT,
ADD COLUMN     "logoutCity" TEXT;

-- AlterTable
ALTER TABLE "TrackingLog" ADD COLUMN     "area" TEXT,
ADD COLUMN     "city" TEXT;

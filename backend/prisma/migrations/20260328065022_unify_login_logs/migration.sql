/*
  Warnings:

  - You are about to drop the column `action` on the `LoginLog` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `LoginLog` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `LoginLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "LoginLog" DROP COLUMN "action",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
ADD COLUMN     "loginLat" DOUBLE PRECISION,
ADD COLUMN     "loginLong" DOUBLE PRECISION,
ADD COLUMN     "logoutLat" DOUBLE PRECISION,
ADD COLUMN     "logoutLong" DOUBLE PRECISION,
ADD COLUMN     "logoutTime" TIMESTAMP(3);

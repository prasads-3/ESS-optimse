-- AlterTable
ALTER TABLE "Employee" ALTER COLUMN "employeeId" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Leave" ADD COLUMN     "document" TEXT;

-- AlterTable
ALTER TABLE "SalarySlip" ADD COLUMN     "employeeStrId" TEXT;

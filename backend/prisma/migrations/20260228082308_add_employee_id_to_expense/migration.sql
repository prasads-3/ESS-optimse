-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "employeeId" INTEGER,
ALTER COLUMN "employeeName" DROP NOT NULL,
ALTER COLUMN "employeeName" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

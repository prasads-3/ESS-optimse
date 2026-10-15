-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "team" TEXT,
    "employmentType" TEXT,
    "status" TEXT,
    "joiningDate" TIMESTAMP(3),
    "location" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyPhone" TEXT,
    "reportsTo" TEXT,
    "password" TEXT,
    "photo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

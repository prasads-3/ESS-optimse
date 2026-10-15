import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/password.js';
const prisma = new PrismaClient();

async function main() {
  const ADMIN_EMAIL = "admin@mirakilabs.com";
  const DEFAULT_ADMIN_PASSWORD = "admin123";

  console.log('--- Database Seeding ---');

  const existingAdmin = await prisma.employee.findFirst({
    where: {
      email: ADMIN_EMAIL,
      organizationId: null,
    },
  });

  let admin;
  if (!existingAdmin) {
    admin = await prisma.employee.create({
      data: {
        name: "System Admin",
        email: ADMIN_EMAIL,
        password: await hashPassword(DEFAULT_ADMIN_PASSWORD),
        employeeId: "ADMIN001",
        role: "admin",
        title: "System Administrator",
        isTemporaryPassword: false,
      },
    });
    console.log('SUCCESS: Admin user created in database:', admin.email);
  } else {
    admin = existingAdmin;
    console.log('INFO: Admin user already exists:', admin.email);
  }

  console.log('SUCCESS: Admin user ensured in database:', admin.email);
  
  console.log('--- Seeding Subscription Plans ---');
  const planData = [
    { id: 1, name: 'Basic', price: 999, userLimit: 35, features: JSON.stringify(['payslip', 'attendance', 'announcement', 'documentation']), color: 'emerald' },
    { id: 2, name: 'Medium', price: 2999, userLimit: 100, features: JSON.stringify(['payslip', 'attendance', 'payroll', 'announcement', 'documentation', 'leave-list', 'expense']), color: 'blue' },
    { id: 3, name: 'Prime', price: 9999, userLimit: 500, features: JSON.stringify(['payslip', 'attendance', 'payroll', 'announcement', 'documentation', 'leave-list', 'expense', 'tracking', 'workforce', 'expenses-list']), color: 'purple' }
  ];

  for (const plan of planData) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan
    });
  }
  console.log('SUCCESS: Subscription plans seeded.');
}

main()
  .catch((e) => {
    console.error('SEED ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

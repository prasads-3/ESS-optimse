import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Updating plan features to include Attendance, Payroll Assets, and Announcements...');

  // Update Basic plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'Basic' },
    data: { 
      features: JSON.stringify(['35 Users', 'Basic Support', 'Email Notifications', 'Attendance Tracking']) 
    }
  });
  console.log('✓ Basic plan updated');

  // Update Medium plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'Medium' },
    data: { 
      features: JSON.stringify(['100 Users', 'Priority Support', 'Advanced Analytics', 'Attendance Tracking']) 
    }
  });
  console.log('✓ Medium plan updated');

  // Update Prime plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'Prime' },
    data: { 
      features: JSON.stringify(['500 Users', '24/7 Support', 'Custom Domains', 'SSO', 'Attendance Tracking', 'Payroll Assets', 'Announcements']) 
    }
  });
  console.log('✓ Prime plan updated');

  console.log('\nAll plans updated successfully!');
}

main()
  .catch((e) => {
    console.error('Update error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
